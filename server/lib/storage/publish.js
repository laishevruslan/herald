'use strict';

const fs = require('fs');
const path = require('path');
const { objectKey } = require('./keys');
const { redact } = require('./redact');

/*
 * Put the bytes a row already has on the local disk into the bench bucket.
 *
 * No-op when CONTENT_BACKEND is not s3, so the filesystem path never waits on a network.
 * The local file stays. The operator's confirmed drop is what removes it. A player URL reads
 * the bucket when this row's storage_key is set, and the local file when it is not.
 */

function remote() {
  const storage = require('./index');
  if (storage.backend !== 's3' || !storage.objects) return null;
  return storage.objects;
}

async function publishContentBytes({ workspaceId, contentId, mime, digest, original, thumb, subs }) {
  const objects = remote();
  if (!objects) return { published: false };
  const parts = [];
  if (original && original.path && fs.existsSync(original.path)) {
    parts.push({ role: 'original', sourcePath: original.path, contentType: mime || 'application/octet-stream' });
  }
  if (thumb && thumb.path && fs.existsSync(thumb.path)) {
    parts.push({ role: 'thumb', sourcePath: thumb.path, contentType: thumbMime(thumb.path) });
  }
  if (subs && subs.path && fs.existsSync(subs.path)) {
    parts.push({ role: 'subs', sourcePath: subs.path, contentType: 'text/vtt' });
  }
  const written = [];
  let bucket = null;
  try {
    for (const part of parts) {
      const stored = await objects.putFile({
        workspaceId, contentId, role: part.role,
        sourcePath: part.sourcePath, contentType: part.contentType, sha256: digest,
      });
      const key = stored && stored.key ? stored.key : stored;
      if (stored && stored.bucket) bucket = stored.bucket;
      written.push(key);
    }
  } catch (e) {
    await objects.forgetContent({ id: contentId, workspace_id: workspaceId });
    await objects.drain();
    throw e;
  }
  const storageKey = objectKey({ workspaceId, contentId, role: 'original' });
  if (!bucket && objects.location) {
    const where = objects.location(workspaceId, contentId);
    if (where) bucket = where.bucket;
  }
  rememberLocation(contentId, bucket, storageKey);
  return { published: true, keys: written, bucket, storageKey };
}

function rememberLocation(contentId, bucket, storageKey) {
  if (!contentId || !bucket || !storageKey) return;
  try {
    const { db } = require('../../db/database');
    const names = new Set(db.prepare('PRAGMA table_info(content)').all().map((c) => c.name));
    if (!names.has('storage_bucket') || !names.has('storage_key')) return;
    db.prepare('UPDATE content SET storage_bucket = ?, storage_key = ? WHERE id = ?').run(bucket, storageKey, contentId);
  } catch (e) {
    console.error(`[storage] could not record location for ${contentId}: ${redact(e && e.message)}`);
  }
}

function thumbMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

/** Schedule a publish of whatever this row currently points at on disk. Failures are logged, not thrown. */
function schedulePublish(row) {
  const objects = remote();
  if (!objects || !row || !row.id) return Promise.resolve();
  const storage = require('./index');
  const job = publishContentBytes({
    workspaceId: row.workspace_id,
    contentId: row.id,
    mime: row.mime_type,
    digest: row.byte_digest,
    original: row.filepath ? { path: storage.file(row.filepath) } : null,
    thumb: row.thumbnail_path ? { path: storage.file(row.thumbnail_path) } : null,
    subs: row.subtitle_url && !/^https?:\/\//i.test(row.subtitle_url) ? { path: storage.file(row.subtitle_url) } : null,
  }).catch((e) => {
    console.error(`[storage] publish ${row.id} failed: ${redact(e && e.message)}`);
  });
  return job;
}

module.exports = { publishContentBytes, schedulePublish, rememberLocation };
