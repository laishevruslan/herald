'use strict';

const fs = require('fs');
const path = require('path');

/*
 * Copy library rows that still live only on disk into the workspace (or platform) prefix.
 *
 * Enabling CONTENT_BACKEND=s3 does not start this. An operator starts it. One row, then a
 * pause, then the next. A row is skipped when storage_key is set and HeadObject still
 * matches the file. The local file is not removed here. That is dropLocalCopies, and it
 * requires its own confirmation.
 *
 * A basename shared by several rows is hashed once per run and put once per content id.
 * Each put still streams the file, because each object is signed on its own. The file is
 * not copied to a second name on disk.
 */

const RUN_KEY = 'content_storage_migrate';
const ERROR_KEY = 'content_storage_last_error';
const DROP_CONFIRM = 'drop-local-copies';
const PAUSE_MS = 250;

const MESSAGES = Object.freeze({
  file_missing: 'The local file is not on disk.',
  size_mismatch: 'The file size does not match the library row.',
  digest_mismatch: 'The file checksum does not match the library row.',
  head_mismatch: 'The stored object does not match the file.',
  storage_limit: "This upload would exceed this organization's storage allowance.",
  failed: 'The transfer stopped on a storage error.',
});

const COLS = 'id, workspace_id, filepath, thumbnail_path, subtitle_url, file_size, byte_digest, mime_type, storage_bucket, storage_key';

function createMigrator(deps) {
  const pauseMs = Number.isFinite(deps.pauseMs) ? deps.pauseMs : PAUSE_MS;
  const blocked = new Set();
  const verified = new Set();
  const digestCache = new Map();
  let running = false;
  let busy = false;
  let timer = null;
  let lastError = null;

  function objects() {
    const storage = deps.storage();
    return storage && storage.objects;
  }

  function localPath(name) {
    if (name == null || name === '') return null;
    if (/^https?:\/\//i.test(String(name))) return null;
    const abs = deps.storage().file(name);
    if (!abs || !fs.existsSync(abs)) return null;
    return abs;
  }

  async function digestOf(abs) {
    if (digestCache.has(abs)) return digestCache.get(abs);
    const value = await deps.digestFile(abs);
    digestCache.set(abs, value);
    return value;
  }

  function record(code, contentId, err) {
    let message = MESSAGES[code] || MESSAGES.failed;
    if (code === 'failed' && err && err.message) {
      const detail = safeDetail(err.message);
      if (detail) message = `${message} ${detail}`.slice(0, 240);
    }
    lastError = {
      code,
      content_id: contentId ? String(contentId) : null,
      message,
    };
    try { deps.settings.set(ERROR_KEY, JSON.stringify(lastError)); } catch { /* status still has the in-memory copy */ }
    console.error(`[storage] transfer ${lastError.code} for ${lastError.content_id || 'library'}: ${lastError.message}`);
  }

  function fail(row, code, err) {
    record(code, row && row.id, err);
    if (row && row.id) {
      blocked.add(row.id);
      verified.add(row.id);
    }
    return { done: false };
  }

  function halt(row, code, err) {
    record(code, row && row.id, err);
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    try { deps.settings.set(RUN_KEY, '0'); } catch { /* the in-memory flag already stopped the loop */ }
    return { done: true };
  }

  function currentError() {
    if (lastError) return lastError;
    let raw = '';
    try { raw = deps.settings.get(ERROR_KEY, '') || ''; } catch { return null; }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.code) return null;
      const code = String(parsed.code);
      return {
        code,
        content_id: parsed.content_id ? String(parsed.content_id) : null,
        message: safeDetail(parsed.message || '') || MESSAGES[code] || MESSAGES.failed,
      };
    } catch {
      return null;
    }
  }

  function countRows() {
    const row = deps.db().prepare(
      `SELECT
         SUM(CASE WHEN (storage_key IS NULL OR storage_key = '')
                   AND filepath IS NOT NULL AND filepath != ''
                   AND lower(filepath) NOT LIKE 'http://%'
                   AND lower(filepath) NOT LIKE 'https://%'
                  THEN 1 ELSE 0 END) AS on_disk,
         SUM(CASE WHEN storage_key IS NOT NULL AND storage_key != '' THEN 1 ELSE 0 END) AS in_bucket,
         SUM(CASE WHEN (storage_key IS NULL OR storage_key = '')
                   AND filepath IS NOT NULL AND filepath != ''
                   AND lower(filepath) NOT LIKE 'http://%'
                   AND lower(filepath) NOT LIKE 'https://%'
                  THEN COALESCE(file_size, 0) ELSE 0 END) AS bytes_on_disk
       FROM content`,
    ).get();
    return {
      onDisk: Number(row && row.on_disk) || 0,
      inBucket: Number(row && row.in_bucket) || 0,
      bytesOnDisk: Number(row && row.bytes_on_disk) || 0,
    };
  }

  function publicStatus() {
    if (!deps.storage() || deps.storage().backend !== 's3') return null;
    const counts = countRows();
    return {
      rows_on_disk: counts.onDisk,
      rows_in_bucket: counts.inBucket,
      running: !!running,
      last_error: currentError(),
    };
  }

  function adminStatus() {
    if (!deps.storage() || deps.storage().backend !== 's3') return { backend: 'fs' };
    const counts = countRows();
    return {
      backend: 's3',
      rows_on_disk: counts.onDisk,
      rows_in_bucket: counts.inBucket,
      bytes_on_disk: counts.bytesOnDisk,
      running: !!running,
      last_error: currentError(),
    };
  }

  function assertTransferable() {
    const storage = deps.storage();
    if (!storage || storage.backend !== 's3' || !storage.objects) {
      const err = new Error('Content storage is the local disk.');
      err.status = 400;
      err.code = 'not_s3';
      throw err;
    }
    if (deps.primaryUrl()) {
      const err = new Error('This server copies content from its primary.');
      err.status = 409;
      err.code = 'replica';
      throw err;
    }
  }

  function selectOne(whereSql, skip) {
    const ids = [...skip];
    if (!ids.length) {
      return deps.db().prepare(`SELECT ${COLS} FROM content WHERE ${whereSql} ORDER BY id LIMIT 1`).get();
    }
    const marks = ids.map(() => '?').join(',');
    return deps.db().prepare(
      `SELECT ${COLS} FROM content WHERE ${whereSql} AND id NOT IN (${marks}) ORDER BY id LIMIT 1`,
    ).get(...ids);
  }

  function nextUnmigrated() {
    return selectOne(
      `filepath IS NOT NULL AND filepath != ''
       AND lower(filepath) NOT LIKE 'http://%'
       AND lower(filepath) NOT LIKE 'https://%'
       AND (storage_key IS NULL OR storage_key = '')`,
      blocked,
    );
  }

  function nextUnverified() {
    return selectOne(
      `storage_key IS NOT NULL AND storage_key != ''`,
      verified,
    );
  }

  function thumbType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'image/jpeg';
  }

  async function partFor(role, filePath, contentType) {
    const size = fs.statSync(filePath).size;
    const digest = await digestOf(filePath);
    if (!digest) return null;
    return { role, path: filePath, contentType, digest, size };
  }

  async function migrateOne(row) {
    const original = localPath(row.filepath);
    if (!original) return fail(row, 'file_missing');
    const size = fs.statSync(original).size;
    if (row.file_size != null && row.file_size !== '' && Number(row.file_size) !== size) {
      return fail(row, 'size_mismatch');
    }
    const digest = await digestOf(original);
    if (!digest) return fail(row, 'file_missing');
    if (row.byte_digest && row.byte_digest !== digest) return fail(row, 'digest_mismatch');

    const parts = [{ role: 'original', path: original, contentType: row.mime_type || 'application/octet-stream', digest, size }];
    const thumb = localPath(row.thumbnail_path);
    if (thumb) {
      const part = await partFor('thumb', thumb, thumbType(thumb));
      if (part) parts.push(part);
    }
    const subs = localPath(row.subtitle_url);
    if (subs) {
      const part = await partFor('subs', subs, 'text/vtt');
      if (part) parts.push(part);
    }

    const remote = objects();
    let bucket = null;
    let storageKey = null;
    try {
      for (const part of parts) {
        const stored = await remote.putFile({
          workspaceId: row.workspace_id,
          contentId: row.id,
          role: part.role,
          sourcePath: part.path,
          contentType: part.contentType,
          sha256: part.digest,
        });
        if (part.role === 'original' && stored) {
          bucket = stored.bucket;
          storageKey = stored.key;
        }
      }
    } catch (e) {
      try { await remote.forgetContent({ id: row.id, workspace_id: row.workspace_id }); } catch { /* the row stays without a key */ }
      if (e && e.code === 'STORAGE_LIMIT') return halt(row, 'storage_limit', e);
      if (isOutage(e)) return halt(row, 'failed', e);
      return fail(row, 'failed', e);
    }

    for (const part of parts) {
      let info = null;
      try {
        info = await remote.head({ workspaceId: row.workspace_id, contentId: row.id, role: part.role });
      } catch (e) {
        try { await remote.forgetContent({ id: row.id, workspace_id: row.workspace_id }); } catch { /* retry will put again */ }
        if (isOutage(e)) return halt(row, 'failed', e);
        return fail(row, 'head_mismatch', e);
      }
      const got = info && info.metadata && info.metadata['herald-sha256'];
      if (!info || Number(info.size) !== part.size || got !== part.digest) {
        try { await remote.forgetContent({ id: row.id, workspace_id: row.workspace_id }); } catch { /* the key is not written */ }
        return fail(row, 'head_mismatch');
      }
    }

    if (!bucket || !storageKey) return fail(row, 'failed');
    deps.db().prepare('UPDATE content SET storage_bucket = ?, storage_key = ? WHERE id = ?').run(bucket, storageKey, row.id);
    verified.add(row.id);
    blocked.delete(row.id);
    return { done: false };
  }

  function liveEnough(row, info) {
    if (!info || info.size == null) return false;
    const got = info.metadata && info.metadata['herald-sha256'];
    if (!got) return false;
    const original = localPath(row.filepath);
    if (!original) return true;
    if (Number(info.size) !== fs.statSync(original).size) return false;
    if (row.byte_digest && got !== row.byte_digest) return false;
    return true;
  }

  async function verifyOne(row) {
    const remote = objects();
    let info = null;
    try {
      info = await remote.head({ workspaceId: row.workspace_id, contentId: row.id, role: 'original' });
    } catch (e) {
      if (isOutage(e)) return halt(row, 'failed', e);
      return fail(row, 'failed', e);
    }
    if (liveEnough(row, info)) {
      verified.add(row.id);
      return { done: false, skipped: true };
    }
    if (!localPath(row.filepath)) return fail(row, 'file_missing');
    return migrateOne(row);
  }

  async function tickOnce() {
    if (!deps.storage() || deps.storage().backend !== 's3' || !objects()) return { done: true };
    const row = nextUnmigrated();
    if (row) {
      const result = await migrateOne(row);
      return result && result.done ? result : { done: false };
    }
    const check = nextUnverified();
    if (!check) {
      finishQuiet();
      return { done: true };
    }
    const result = await verifyOne(check);
    return result && result.done ? result : { done: false };
  }

  function finishQuiet() {
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    try { deps.settings.set(RUN_KEY, '0'); } catch { /* stopping the loop does not depend on the setting write */ }
    digestCache.clear();
  }

  function schedule() {
    if (timer || !running) return;
    timer = setTimeout(() => {
      timer = null;
      tick();
    }, pauseMs);
    if (timer.unref) timer.unref();
  }

  async function tick() {
    if (!running || busy) return;
    busy = true;
    try {
      const outcome = await tickOnce();
      if (running && outcome && !outcome.done) schedule();
    } catch (e) {
      halt(null, 'failed', e);
    } finally {
      busy = false;
    }
  }

  function start() {
    assertTransferable();
    if (running) return adminStatus();
    blocked.clear();
    verified.clear();
    digestCache.clear();
    lastError = null;
    try { deps.settings.set(ERROR_KEY, ''); } catch { /* a fresh run still clears the in-memory error */ }
    try { deps.settings.set(RUN_KEY, '1'); } catch { /* resume will not see this run if the setting cannot be saved */ }
    running = true;
    schedule();
    return adminStatus();
  }

  function stop() {
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    try { deps.settings.set(RUN_KEY, '0'); } catch { /* the loop has already stopped */ }
    return adminStatus();
  }

  function resumeIfRequested() {
    try {
      if (deps.primaryUrl()) return;
      if (!deps.storage() || deps.storage().backend !== 's3' || !objects()) return;
      if (deps.settings.get(RUN_KEY, '0') !== '1') return;
      if (running) return;
      running = true;
      schedule();
    } catch (e) {
      console.error(`[storage] transfer resume failed: ${safeDetail(e && e.message)}`);
    }
  }

  async function dropLocalCopies({ confirm } = {}) {
    if (confirm !== DROP_CONFIRM) {
      const err = new Error('Type drop-local-copies to confirm. Transfer does not delete local files.');
      err.status = 400;
      err.code = 'confirm';
      throw err;
    }
    assertTransferable();
    if (running) {
      const err = new Error('The transfer is still running.');
      err.status = 409;
      err.code = 'running';
      throw err;
    }
    const rows = deps.db().prepare(
      'SELECT id, workspace_id, filepath, thumbnail_path, subtitle_url, storage_key FROM content',
    ).all();
    const groups = new Map();
    const add = (row, name, role) => {
      if (name == null || name === '' || /^https?:\/\//i.test(String(name))) return;
      const base = path.basename(String(name));
      if (!base || base === '.' || base === '..') return;
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base).push({
        id: row.id,
        workspace_id: row.workspace_id,
        role,
        storage_key: row.storage_key,
      });
    };
    for (const row of rows) {
      add(row, row.filepath, 'original');
      add(row, row.thumbnail_path, 'thumb');
      add(row, row.subtitle_url, 'subs');
    }

    const remote = objects();
    const storage = deps.storage();
    let removed = 0;
    let kept = 0;
    for (const [name, refs] of groups) {
      if (refs.some((ref) => !ref.storage_key)) { kept += 1; continue; }
      let ok = true;
      for (const ref of refs) {
        let info = null;
        try {
          info = await remote.head({ workspaceId: ref.workspace_id, contentId: ref.id, role: ref.role });
        } catch (e) {
          if (isOutage(e)) {
            const err = new Error('Storage could not be reached. Local copies were not deleted.');
            err.status = 503;
            err.code = 'unreachable';
            throw err;
          }
          ok = false;
          break;
        }
        if (!info || info.size == null) { ok = false; break; }
      }
      if (!ok) { kept += 1; continue; }
      const abs = storage.file(name);
      if (!abs || !fs.existsSync(abs)) continue;
      storage.remove(name);
      removed += 1;
    }
    return { removed, kept };
  }

  return {
    publicStatus,
    adminStatus,
    start,
    stop,
    resumeIfRequested,
    tickOnce,
    dropLocalCopies,
  };
}

function safeDetail(text) {
  const { redact } = require('./redact');
  return redact(text)
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g, '[path]')
    .replace(/\/(?:[\w.-]+\/)+[\w.-]+/g, '[path]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function isOutage(err) {
  const msg = `${err && err.code ? err.code : ''} ${err && err.message ? err.message : ''}`;
  return /ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(msg);
}

let singleton = null;
function shared() {
  if (!singleton) {
    singleton = createMigrator({
      storage: () => require('./index'),
      db: () => require('../../db/database').db,
      settings: require('../app-settings'),
      primaryUrl: () => require('../../config').primaryUrl,
      digestFile: (abs) => require('../content-digest').digestFile(abs),
      pauseMs: PAUSE_MS,
    });
  }
  return singleton;
}

module.exports = {
  DROP_CONFIRM,
  createMigrator,
  publicStatus: () => shared().publicStatus(),
  adminStatus: () => shared().adminStatus(),
  start: () => shared().start(),
  stop: () => shared().stop(),
  resumeIfRequested: () => shared().resumeIfRequested(),
  tickOnce: () => shared().tickOnce(),
  dropLocalCopies: (opts) => shared().dropLocalCopies(opts),
};
