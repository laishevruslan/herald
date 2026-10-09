'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../../config');

/*
 * Player and dashboard reads when CONTENT_BACKEND=s3.
 *
 * The URL stays /uploads/content/<basename>. A row with storage_key is read from the bucket
 * and, if that object is missing, from the local file. A row without storage_key is read from
 * disk and does not open the bucket. A name with no content row is a JSON 404 with the
 * immutable cache stripped — the same miss the static mount already makes — and never the
 * dashboard HTML.
 */

function storage() { return require('./index'); }

function basename(name) {
  return path.basename(String(name || ''));
}

function roleFor(row, filename) {
  const base = basename(filename);
  const of = (p) => (p ? basename(p) : '');
  if (of(row.thumbnail_path) === base) return 'thumb';
  if (of(row.subtitle_url) === base && !/^https?:\/\//i.test(row.subtitle_url || '')) return 'subs';
  return 'original';
}

function lookupRow(db, name) {
  const base = basename(name);
  if (!base || base === '.' || base === '..') return null;
  try {
    return db.prepare(
      `SELECT * FROM content
        WHERE filepath = ? OR thumbnail_path = ? OR subtitle_url = ?
           OR filepath LIKE ? OR thumbnail_path LIKE ? OR subtitle_url LIKE ?
        LIMIT 1`,
    ).get(base, base, base, `%/${base}`, `%/${base}`, `%/${base}`) || null;
  } catch {
    return null;
  }
}

function jsonMiss(res) {
  res.removeHeader('Cache-Control');
  res.removeHeader('Content-Disposition');
  res.status(404).type('application/json').json({ error: 'Not found' });
}

function hitHeaders(res, filename, harden, extra) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.setHeader('Accept-Ranges', 'bytes');
  if (extra) extra(res);
  if (harden) harden(res, filename);
}

function rangeOf(req) {
  const raw = req && req.headers && req.headers.range;
  if (!raw) return null;
  const m = /^bytes=(\d+)-(\d*)$/i.exec(String(raw).trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] === '' ? undefined : Number(m[2]);
  if (!Number.isFinite(start)) return null;
  return { start, end };
}

/**
 * Stream the bucket object when this process is the s3 primary and the object exists.
 * Returns true when the response has been finished (or started, for a streamed body).
 */
async function streamObject(req, res, row, filename, harden, extra) {
  const objects = storage().objects;
  if (!objects || !row) return false;
  const role = roleFor(row, filename);
  const ref = { workspaceId: row.workspace_id, contentId: row.id, role };
  let obj;
  try {
    if (req.method === 'HEAD') {
      const info = await objects.head(ref);
      if (!info) return false;
      hitHeaders(res, filename, harden, extra);
      if (info.size != null) res.setHeader('Content-Length', String(info.size));
      res.status(200).end();
      return true;
    }
    obj = await objects.getStream(ref, rangeOf(req));
  } catch (e) {
    console.error(`[storage] read ${row.id} failed: ${require('./redact').redact(e && e.message)}`);
    return false;
  }
  if (!obj || !obj.stream) return false;
  if (role === 'thumb') res.setHeader('Content-Type', 'image/jpeg');
  else if (role === 'subs') res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
  else if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
  hitHeaders(res, filename, harden, extra);
  if (obj.contentRange) res.setHeader('Content-Range', obj.contentRange);
  if (obj.size != null) res.setHeader('Content-Length', String(obj.size));
  res.status(obj.status === 206 ? 206 : 200);
  obj.stream.on('error', () => { if (!res.headersSent) jsonMiss(res); else res.destroy(); });
  obj.stream.pipe(res);
  return true;
}

function sendLocal(res, filename, harden, extra) {
  const local = storage().file(filename);
  if (!local || !fs.existsSync(local)) return false;
  hitHeaders(res, filename, harden, extra);
  res.sendFile(local);
  return true;
}

/**
 * A filled storage_key on the primary is the bucket. An empty one is the local file.
 * A replica (PRIMARY_URL) keeps serving the file it cached on its own disk.
 */
async function sendPublishedOrLocal(req, res, { row, filename, harden, extra }) {
  if (storage().backend === 's3' && !config.primaryUrl && row && row.storage_key) {
    if (await streamObject(req, res, row, filename, harden, extra)) return true;
  }
  if (sendLocal(res, filename, harden, extra)) return true;
  if (storage().backend === 's3') {
    jsonMiss(res);
    return true;
  }
  return false;
}

module.exports = {
  lookupRow, jsonMiss, hitHeaders, roleFor, streamObject, sendPublishedOrLocal,
};
