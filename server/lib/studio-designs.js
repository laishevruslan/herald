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
  'epaper-5x3': { width: 800, height: 480 },
});

function pickPreset(id, width, height) {
  if (id && PRESETS[id]) return { ...PRESETS[id], preset: id };
  const w = Number(width) || 1920;
  const h = Number(height) || 1080;
  if (w === 1080 && h === 1920) return { width: w, height: h, preset: 'portrait-1080' };
  if (w === 800 && h === 480) return { width: w, height: h, preset: 'epaper-5x3' };
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
 * Accepts Layerhub scenes and Suika wrappers ({ v:1, editor:'suika', paper }).
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
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: 'scene_json must be an object' };
  }

  // Suika wrapper (plan §4.2): must carry a paper object; do not accept empty shells.
  if (parsed.editor === 'suika') {
    if (parsed.v !== 1) {
      return { ok: false, status: 400, error: 'suika scene_json.v must be 1' };
    }
    if (!parsed.paper || typeof parsed.paper !== 'object' || Array.isArray(parsed.paper)) {
      return { ok: false, status: 400, error: 'suika scene_json.paper must be an object' };
    }
    if (!Array.isArray(parsed.paper.data)) {
      return { ok: false, status: 400, error: 'suika scene_json.paper.data must be an array' };
    }
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

/** Detect which island owns a stored scene (for Edit routing — Phase 2). */
function detectSceneEditor(parsed) {
  if (parsed && typeof parsed === 'object' && parsed.editor === 'suika') return 'suika';
  return 'layerhub';
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
 * Replace PNG bytes on an existing content row (Studio re-publish). Image-only.
 * When workspace require_approval is on, parks new bytes in draft_json like
 * PUT /content/:id/replace — live filepath stays until review publishes.
 *
 * @param {object} content content row
 * @param {object} file multer file
 * @param {{ actor?: object }} [opts]
 * @returns {Promise<{ row: object, affectedDevices: string[], draft?: boolean }>}
 */
async function replacePngBytes(content, file, opts = {}) {
  if (!content.mime_type || !content.mime_type.startsWith('image/')) {
    const err = new Error('Studio can only replace image content');
    err.status = 400;
    throw err;
  }

  const policy = require('./release-policy');
  const revisions = require('./revisions');
  const approvalOn = !!(content.workspace_id && policy.approvalRequired(db, content.workspace_id));
  const actor = opts.actor || { userId: null, kind: 'system', label: null };

  let retainedFile = null;
  let retainedThumb = null;
  if (!approvalOn) {
    const prev = revisions.latest(db, 'content', content.id);
    const tag = prev ? `r${prev.rev_no}` : 'r0';
    retainedFile = revisions.retainContentFile(db, content.id, content.filepath, tag);
    retainedThumb = revisions.retainContentFile(db, content.id, content.thumbnail_path, tag);
    if (!retainedFile) unlinkIfUnreferenced(content.filepath, content.id, 'filepath');
    if (!retainedThumb) unlinkIfUnreferenced(content.thumbnail_path, content.id, 'thumbnail_path');
  }

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

  if (approvalOn) {
    const prevDraft = revisions.parseJson(content.draft_json, null) || {};
    revisions.disposeDraftFiles(db, content.id, prevDraft, content);
    const { filepath: _f, thumbnail_path: _t, ...prevFields } = prevDraft;
    const draft = {
      ...prevFields,
      filepath,
      mime_type: mime,
      file_size: file.size,
      thumbnail_path: thumbnailPath,
      width,
      height,
      duration_sec: durationSec,
      byte_digest: newDigest,
    };
    db.prepare('UPDATE content SET draft_json = ? WHERE id = ?').run(JSON.stringify(draft), content.id);
    revisions.recordCurrent(db, 'content', content.id, { actor, summary: 'Studio replace (draft)' });
    return {
      row: db.prepare('SELECT * FROM content WHERE id = ?').get(content.id),
      affectedDevices: [],
      draft: true,
    };
  }

  db.transaction(() => {
    if (retainedFile) {
      db.prepare('UPDATE revisions SET file_ref = ? WHERE resource_type = ? AND resource_id = ? AND file_ref = ?')
        .run(retainedFile, 'content', content.id, content.filepath);
    }
    if (retainedThumb) {
      db.prepare('UPDATE revisions SET thumb_ref = ? WHERE resource_type = ? AND resource_id = ? AND thumb_ref = ?')
        .run(retainedThumb, 'content', content.id, content.thumbnail_path);
    }
    db.prepare(`UPDATE content
                   SET filepath = ?, mime_type = ?, file_size = ?, thumbnail_path = ?, width = ?, height = ?,
                       duration_sec = ?, byte_digest = ?,
                       updated_at = MAX(CAST(strftime('%s','now') AS INTEGER), COALESCE(NULLIF(updated_at, 0), created_at) + 1)
                 WHERE id = ?`)
      .run(filepath, mime, file.size, thumbnailPath, width, height, durationSec, newDigest, content.id);
    revisions.recordCurrent(db, 'content', content.id, { actor, summary: 'Studio replace' });
  })();

  return {
    row: db.prepare('SELECT * FROM content WHERE id = ?').get(content.id),
    affectedDevices: devicesPlayingContent(content.id),
    draft: false,
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
  actor,
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
  let draft = false;

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
    const replaced = await replacePngBytes(row, file, { actor });
    content = replaced.row;
    affectedDevices = replaced.affectedDevices;
    draft = !!replaced.draft;
  } else {
    const name = safeFilename(filename || 'Studio poster.png');
    if (file.originalname == null || !String(file.originalname).trim()) {
      file.originalname = name;
    } else {
      file.originalname = name;
    }
    content = await ingestUploadedFile({ file, userId, workspaceId, folderId: null });
  }

  // Scene sidecar always updates (re-edit state). Draft PNG does not change live bytes;
  // scene still advances so Edit shows what was submitted for review.
  upsertDesign({
    contentId: content.id,
    workspaceId,
    sceneJson: scene.json,
    width: dims.width,
    height: dims.height,
  });

  return {
    content_id: content.id,
    content,
    affectedDevices,
    width: dims.width,
    height: dims.height,
    draft,
  };
}

module.exports = {
  MAX_SCENE_JSON_BYTES,
  PRESETS,
  pickPreset,
  sanitizeSceneJson,
  detectSceneEditor,
  getByContentId,
  listForWorkspace,
  contentIdsWithDesign,
  upsertDesign,
  publishExport,
  replacePngBytes,
};
