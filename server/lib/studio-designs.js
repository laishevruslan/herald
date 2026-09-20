'use strict';

/*
 * Studio designs (phase 6.1) — sidecar for poster scene JSON next to a content PNG.
 *
 * The player never sees scene_json (I3/I4). Only the operator island reloads it for Edit.
 * Bytes live in `content` via ingestUploadedFile / replace; this table is metadata only.
 */

const { db } = require('../db/database');
const { ingestUploadedFile, deriveMediaMetadata, safeFilename } = require('./content-ingest');
const { finalizeUpload } = require('./upload-sniff');
const { unlinkIfUnreferenced } = require('./content-files');
const { digestFile } = require('./content-digest');
const { devicesPlayingContent } = require('./devices-playing');
const path = require('path');
const config = require('../config');

/** Soft cap: scene must not embed data-URL bitmaps (D-SC / plan §7). */
const MAX_SCENE_JSON_BYTES = 1_500_000;

const PRESETS = Object.freeze({
  'landscape-1080': { width: 1920, height: 1080 },
  'portrait-1080': { width: 1080, height: 1920 },
});

function pickPreset(id, width, height) {
  if (id && PRESETS[id]) return { ...PRESETS[id], preset: id };
  const w = Number(width) || 1920;
  const h = Number(height) || 1080;
  if (w === 1080 && h === 1920) return { width: w, height: h, preset: 'portrait-1080' };
  return { width: 1920, height: 1080, preset: 'landscape-1080' };
}

function walkStrings(value, visit) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, visit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) walkStrings(v, visit);
  }
}

/**
 * Parse + size-gate scene JSON. Rejects data:image and javascript: URLs so the
 * DB does not grow bitmaps and Fabric never loads script URLs on re-edit.
 * @returns {{ ok: true, json: string, parsed: object } | { ok: false, status: number, error: string }}
 */
function sanitizeSceneJson(raw) {
  if (raw == null || raw === '') {
    return { ok: true, json: '{}', parsed: {} };
  }
  let text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (Buffer.byteLength(text, 'utf8') > MAX_SCENE_JSON_BYTES) {
    return { ok: false, status: 413, error: 'scene_json too large (max 1.5MB; do not embed data URLs)' };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, error: 'scene_json must be valid JSON' };
  }
  if (parsed == null || typeof parsed !== 'object') {
    return { ok: false, status: 400, error: 'scene_json must be an object' };
  }
  let bad = null;
  walkStrings(parsed, (s) => {
    const t = s.trim().toLowerCase();
    if (t.startsWith('data:image') || t.startsWith('data:application')) {
      bad = 'scene_json must not contain data URL images — use library content ids';
    } else if (t.startsWith('javascript:')) {
      bad = 'scene_json must not contain javascript: URLs';
    }
  });
  if (bad) return { ok: false, status: 400, error: bad };
  // Re-serialize to a stable canonical form (drops weird whitespace bloat).
  text = JSON.stringify(parsed);
  if (Buffer.byteLength(text, 'utf8') > MAX_SCENE_JSON_BYTES) {
    return { ok: false, status: 413, error: 'scene_json too large after normalize' };
  }
  return { ok: true, json: text, parsed };
}

function getByContentId(contentId, workspaceId) {
  return db.prepare(
    'SELECT content_id, workspace_id, scene_json, width, height, updated_at FROM studio_designs WHERE content_id = ? AND workspace_id = ?',
  ).get(contentId, workspaceId) || null;
}

function listForWorkspace(workspaceId) {
  return db.prepare(
    'SELECT content_id, width, height, updated_at FROM studio_designs WHERE workspace_id = ? ORDER BY updated_at DESC',
  ).all(workspaceId);
}

function contentIdsWithDesign(contentIds) {
  if (!contentIds.length) return new Set();
  const placeholders = contentIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT content_id FROM studio_designs WHERE content_id IN (${placeholders})`,
  ).all(...contentIds);
  return new Set(rows.map((r) => r.content_id));
}

function upsertDesign({ contentId, workspaceId, sceneJson, width, height }) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO studio_designs (content_id, workspace_id, scene_json, width, height, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(content_id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      scene_json = excluded.scene_json,
      width = excluded.width,
      height = excluded.height,
      updated_at = excluded.updated_at
  `).run(contentId, workspaceId, sceneJson, width, height, now);
  return getByContentId(contentId, workspaceId);
}

/**
 * Replace PNG bytes on an existing content row (Studio re-publish). Image-only;
 * approval / revision history follows the same spirit as PUT /content/:id/replace
 * without re-entering the Express route.
 */
async function replacePngBytes(content, file) {
  if (!content.mime_type || !content.mime_type.startsWith('image/')) {
    const err = new Error('Studio can only replace image content');
    err.status = 400;
    throw err;
  }
  unlinkIfUnreferenced(content.filepath, content.id, 'filepath');
  unlinkIfUnreferenced(content.thumbnail_path, content.id, 'thumbnail_path');

  let filepath, mime;
  try {
    ({ filepath, mime } = finalizeUpload(file));
  } catch (e) {
    const err = new Error(e.message || 'Invalid upload');
    err.status = e.status || 400;
    throw err;
  }
  if (!mime.startsWith('image/')) {
    try {
      require('fs').unlinkSync(path.join(config.contentDir, filepath));
    } catch { /* best effort */ }
    const err = new Error('Studio export must be an image (PNG/JPEG)');
    err.status = 400;
    throw err;
  }

  const { width, height, durationSec, thumbnailPath } = await deriveMediaMetadata(file.path, filepath, mime);
  let newDigest = null;
  try {
    newDigest = await digestFile(path.join(config.contentDir, filepath));
  } catch {
    newDigest = null;
  }

  db.prepare(`UPDATE content
                 SET filepath = ?, mime_type = ?, file_size = ?, thumbnail_path = ?, width = ?, height = ?,
                     duration_sec = ?, byte_digest = ?,
                     updated_at = MAX(CAST(strftime('%s','now') AS INTEGER), COALESCE(NULLIF(updated_at, 0), created_at) + 1)
               WHERE id = ?`)
    .run(filepath, mime, file.size, thumbnailPath, width, height, durationSec, newDigest, content.id);

  return {
    row: db.prepare('SELECT * FROM content WHERE id = ?').get(content.id),
    affectedDevices: devicesPlayingContent(content.id),
  };
}

async function publishExport({
  file,
  userId,
  workspaceId,
  sceneRaw,
  contentId,
  presetId,
  width,
  height,
  filename,
}) {
  const scene = sanitizeSceneJson(sceneRaw);
  if (!scene.ok) {
    const err = new Error(scene.error);
    err.status = scene.status;
    throw err;
  }
  const dims = pickPreset(presetId, width, height);

  if (!file) {
    const err = new Error('PNG file required');
    err.status = 400;
    throw err;
  }

  let content;
  let affectedDevices = [];

  if (contentId) {
    const existing = getByContentId(contentId, workspaceId);
    if (!existing) {
      const err = new Error('Studio design not found');
      err.status = 404;
      throw err;
    }
    const row = db.prepare('SELECT * FROM content WHERE id = ? AND workspace_id = ?').get(contentId, workspaceId);
    if (!row) {
      const err = new Error('Content not found');
      err.status = 404;
      throw err;
    }
    const replaced = await replacePngBytes(row, file);
    content = replaced.row;
    affectedDevices = replaced.affectedDevices;
  } else {
    const name = safeFilename(filename || 'Studio poster.png');
    if (file.originalname == null || !String(file.originalname).trim()) {
      file.originalname = name;
    } else {
      file.originalname = name;
    }
    content = await ingestUploadedFile({ file, userId, workspaceId, folderId: null });
  }

  upsertDesign({
    contentId: content.id,
    workspaceId,
    sceneJson: scene.json,
    width: dims.width,
    height: dims.height,
  });

  return { content_id: content.id, content, affectedDevices, width: dims.width, height: dims.height };
}

module.exports = {
  MAX_SCENE_JSON_BYTES,
  PRESETS,
  pickPreset,
  sanitizeSceneJson,
  getByContentId,
  listForWorkspace,
  contentIdsWithDesign,
  upsertDesign,
  publishExport,
  replacePngBytes,
};
