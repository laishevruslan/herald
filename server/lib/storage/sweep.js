'use strict';

const { redact } = require('./redact');
const { quotaDegraded, hydrateQuotaDegraded, onQuotaDegraded } = require('./observe');

/*
 * Orphan objects and the bucket-versus-library check.
 *
 * An object is removed only when its key is one of ours, its content id is not in
 * SQLite, and LastModified is at least a day old. Younger objects stay: a publish
 * puts the bytes before the row exists. Anything that is not our key shape is left
 * where it is. Listing and deleting use the organization key (the platform key for
 * herald-platform), never the RustFS root.
 *
 * Bucket original bytes against SUM(file_size) of rows that already have storage_key.
 * The bytes of still-open uploads are the slack. A larger gap, or a row whose object
 * is missing, is reported. It is not quieted.
 */

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const PAUSE_MS = 250;
const CYCLE_MS = 15 * 60 * 1000;
const BOOT_DELAY_MS = 60 * 1000;
const PAGE = 500;
const KEY_RE = /^(?:ws\/([A-Za-z0-9_-]+)\/c\/([A-Za-z0-9_-]+)|platform\/c\/([A-Za-z0-9_-]+))\/(original|thumb|subs)$/;

function parseObjectKey(key) {
  const match = KEY_RE.exec(String(key || ''));
  if (!match) return null;
  return { workspaceId: match[1] || null, contentId: match[2] || match[3], role: match[4] };
}

function oldEnough(lastModified, now) {
  const stamp = Date.parse(lastModified || '');
  if (!Number.isFinite(stamp)) return false;
  return now - stamp >= ORPHAN_AGE_MS;
}

function safeDetail(text) {
  return redact(text)
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g, '[path]')
    .replace(/\/(?:[\w.-]+\/)+[\w.-]+/g, '[path]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function createSweep(deps) {
  const pauseMs = Number.isFinite(deps.pauseMs) ? deps.pauseMs : PAUSE_MS;
  const cycleMs = Number.isFinite(deps.cycleMs) ? deps.cycleMs : CYCLE_MS;
  const queue = [];
  let cycleAt = 0;
  let running = false;
  let timer = null;
  let generation = 0;
  let lastError = null;
  let idSet = null;
  const published = { excess: 0, missing: 0, removed: 0, unrecognized: 0, drift: [] };

  function enabled() {
    return deps.backend() === 's3' && !deps.primaryUrl();
  }

  function contentIds() {
    if (!idSet) idSet = deps.contentIds();
    return idSet;
  }

  function record(err) {
    lastError = safeDetail(err && err.message) || 'The sweep could not read a bucket.';
    console.error(`[storage] sweep: ${lastError}`);
  }

  function classify(target, obj) {
    const parsed = parseObjectKey(obj.key);
    if (!parsed) {
      published.unrecognized += 1;
      return null;
    }
    if (parsed.role === 'original') {
      target.bucketBytes += Number(obj.size) || 0;
      if (contentIds().has(parsed.contentId)) target.seenIds.add(parsed.contentId);
    }
    if (contentIds().has(parsed.contentId)) return null;
    if (!oldEnough(obj.lastModified, deps.now())) return null;
    return { key: obj.key, size: Number(obj.size) || 0, role: parsed.role };
  }

  async function removeOne(target, obj) {
    try {
      await target.client.deleteObject({ bucket: target.bucket, key: obj.key });
    } catch (e) {
      record(e);
      return;
    }
    if (obj.role === 'original') target.bucketBytes -= obj.size;
    published.removed += 1;
  }

  function compare(target) {
    if (target.listFailed) return;
    let catalog;
    let pending;
    try {
      catalog = deps.catalog(target);
      pending = Number(deps.pending(target)) || 0;
    } catch (e) {
      record(e);
      return;
    }
    const ids = catalog.ids || [];
    let missing = 0;
    for (const id of ids) if (!target.seenIds.has(id)) missing += 1;
    const excess = target.bucketBytes - (Number(catalog.bytes) || 0);
    const unexplained = excess > pending ? excess - pending : 0;
    if (unexplained > 0 || missing > 0) {
      published.excess += unexplained;
      published.missing += missing;
      published.drift.push({
        organization_id: target.organizationId || null,
        excess_bytes: unexplained,
        missing_objects: missing,
      });
      if (unexplained > 0) {
        console.error(`[storage] bucket bytes exceed the library by ${unexplained} bytes`);
      }
      if (missing > 0) console.error(`[storage] ${missing} library rows have no object`);
    }
  }

  async function listPage(target, token) {
    let page;
    try {
      page = await target.client.listObjects({ bucket: target.bucket, token, maxKeys: PAGE });
    } catch (e) {
      target.listFailed = true;
      record(e);
      return;
    }
    for (const obj of page.objects || []) {
      const dead = classify(target, obj);
      if (dead) queue.push(() => removeOne(target, dead));
    }
    if (page.truncated && page.token) queue.unshift(() => listPage(target, page.token));
    else queue.push(() => compare(target));
  }

  function beginCycle() {
    published.excess = 0;
    published.missing = 0;
    published.removed = 0;
    published.unrecognized = 0;
    published.drift = [];
    lastError = null;
    idSet = null;
    let targets = [];
    try { targets = deps.targets() || []; } catch (e) { record(e); return; }
    for (const target of targets) {
      target.bucketBytes = 0;
      target.seenIds = new Set();
      target.listFailed = false;
      queue.push(() => listPage(target, null));
    }
  }

  async function tickOnce() {
    if (!enabled()) return { done: true };
    if (!queue.length) {
      const now = deps.now();
      if (cycleAt && now - cycleAt < cycleMs) return { done: true, idle: true };
      beginCycle();
      if (!queue.length) { cycleAt = now; return { done: true }; }
    }
    const job = queue.shift();
    await job();
    if (!queue.length) cycleAt = deps.now();
    return { done: !queue.length };
  }

  function snapshot() {
    const quota = quotaDegraded();
    return {
      quota_degraded: quota.quota_degraded,
      ...(quota.quota_degraded_at ? { quota_degraded_at: quota.quota_degraded_at } : {}),
      drift_excess_bytes: published.excess,
      missing_objects: published.missing,
      orphans_removed: published.removed,
      unrecognized_objects: published.unrecognized,
      ...(lastError ? { sweep_error: lastError } : {}),
    };
  }

  function publicStatus() {
    if (deps.backend() !== 's3') return null;
    const body = snapshot();
    delete body.sweep_error;
    return body;
  }

  function adminStatus() {
    if (deps.backend() !== 's3') return {};
    return { ...snapshot(), drift: published.drift.map((row) => ({ ...row })) };
  }

  function arm(gen, ms) {
    if (!running || gen !== generation) return;
    timer = setTimeout(async () => {
      try { await tickOnce(); } catch (e) { record(e); }
      arm(gen, queue.length ? pauseMs : cycleMs);
    }, ms);
    if (timer.unref) timer.unref();
  }

  function start() {
    if (running || !enabled()) return;
    running = true;
    const gen = ++generation;
    try {
      const stored = deps.storedQuotaDegraded && deps.storedQuotaDegraded();
      if (stored) hydrateQuotaDegraded(stored);
    } catch { /* a missing setting does not stop the sweep */ }
    arm(gen, Number.isFinite(deps.bootDelayMs) ? deps.bootDelayMs : BOOT_DELAY_MS);
  }

  function stop() {
    running = false;
    generation += 1;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { tickOnce, publicStatus, adminStatus, start, stop, parseObjectKey };
}

let singleton = null;
function shared() {
  if (!singleton) {
    singleton = createSweep({
      backend: () => require('./index').backend,
      primaryUrl: () => require('../../config').primaryUrl,
      now: () => Date.now(),
      storedQuotaDegraded: () => {
        try { return require('../app-settings').get('content_storage_quota_degraded', ''); }
        catch { return ''; }
      },
      targets() {
        const storage = require('./index');
        const provision = storage.objects && storage.objects.provision;
        if (!provision) return [];
        const db = require('../../db/database').db;
        let orgs = [];
        try {
          orgs = db.prepare(
            "SELECT organization_id, bucket FROM storage_principals WHERE scope = 'organization'",
          ).all();
        } catch { orgs = []; }
        const targets = orgs.map((row) => ({
          kind: 'organization',
          organizationId: row.organization_id,
          bucket: row.bucket,
        }));
        targets.push({ kind: 'platform', organizationId: null, bucket: 'herald-platform' });
        for (const target of targets) {
          target.client = {
            listObjects: (spec) => open(target).then((client) => client.listObjects(spec)),
            deleteObject: (spec) => open(target).then((client) => client.deleteObject(spec)),
          };
        }
        return targets;
      },
      contentIds() {
        try {
          return new Set(require('../../db/database').db.prepare('SELECT id FROM content').all().map((row) => row.id));
        } catch { return new Set(); }
      },
      catalog(target) {
        const db = require('../../db/database').db;
        const rows = target.organizationId
          ? db.prepare(
            `SELECT c.id AS id, COALESCE(c.file_size, 0) AS file_size
               FROM content c JOIN workspaces w ON w.id = c.workspace_id
              WHERE w.organization_id = ? AND c.storage_key IS NOT NULL AND c.storage_key != ''`,
          ).all(target.organizationId)
          : db.prepare(
            `SELECT id, COALESCE(file_size, 0) AS file_size FROM content
              WHERE (workspace_id IS NULL OR workspace_id = '')
                AND storage_key IS NOT NULL AND storage_key != ''`,
          ).all();
        return {
          bytes: rows.reduce((sum, row) => sum + (Number(row.file_size) || 0), 0),
          ids: rows.map((row) => row.id),
        };
      },
      pending(target) {
        if (!target.organizationId) return 0;
        try {
          const cutoff = Math.floor((Date.now() - ORPHAN_AGE_MS) / 1000);
          const row = require('../../db/database').db.prepare(
            `SELECT COALESCE(SUM(s.declared_size), 0) AS n
               FROM upload_sessions s JOIN workspaces w ON w.id = s.workspace_id
              WHERE w.organization_id = ? AND s.updated_at >= ?`,
          ).get(target.organizationId, cutoff);
          return Number(row && row.n) || 0;
        } catch { return 0; }
      },
    });
    onQuotaDegraded((at) => {
      try { require('../app-settings').set('content_storage_quota_degraded', at); }
      catch { /* the in-memory flag is already set */ }
    });
  }
  return singleton;
}

async function open(target) {
  if (target.opened) return target.opened;
  const provision = require('./index').objects.provision;
  const where = target.organizationId
    ? await provision.organization(target.organizationId)
    : await provision.platform();
  target.opened = where.client;
  return where.client;
}

module.exports = {
  ORPHAN_AGE_MS,
  createSweep,
  parseObjectKey,
  publicStatus: () => shared().publicStatus(),
  adminStatus: () => shared().adminStatus(),
  start: () => shared().start(),
  stop: () => shared().stop(),
  tickOnce: () => shared().tickOnce(),
};
