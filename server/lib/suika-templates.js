'use strict';

/*
 * Workspace Suika templates (phase C).
 *
 * A template is a paper JSON copy for this workspace only. It is not a playlist
 * item and not a row in `content`, so the library and the image picker never
 * list the preview. The thumb is a blob on this row. Deleting a template does
 * not touch studio_designs or content sidecars made from it.
 *
 * No org_id: an organisation pack is a later phase.
 */

const crypto = require('node:crypto');
const { db } = require('../db/database');
const studio = require('./studio-designs');

const APP_VERSION = 'suika-editor_0.0.3';
const MAX_NAME = 80;
const MAX_THUMB_BYTES = 400 * 1024;

function fail(status, error) {
  const err = new Error(error);
  err.status = status;
  throw err;
}

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > MAX_NAME) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

function thumbMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0 || buf.length > MAX_THUMB_BYTES) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  return null;
}

function backgroundSize(paper) {
  const nodes = Array.isArray(paper && paper.data) ? paper.data : [];
  const bg = nodes.find((node) => node && node.objectName === 'Background' && node.type === 'Rect');
  if (!bg) return null;
  const width = Number(bg.width);
  const height = Number(bg.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

/**
 * Accept a Suika paper, or a { v:1, editor:'suika', paper } wrapper.
 * Raster data URLs stay allowed; javascript: stays rejected.
 */
function sanitizePaper(raw) {
  let paper = raw;
  if (typeof raw === 'string') {
    try {
      paper = JSON.parse(raw);
    } catch {
      return { ok: false, status: 400, error: 'paper_json must be valid JSON' };
    }
  }
  const wrapped = paper && paper.editor === 'suika' && paper.paper
    ? paper
    : { v: 1, editor: 'suika', paper };
  const clean = studio.sanitizeSceneJson(wrapped);
  if (!clean.ok) return clean;
  const stored = clean.parsed.paper;
  if (!stored || stored.appVersion !== APP_VERSION) {
    return { ok: false, status: 400, error: 'paper appVersion must be suika-editor_0.0.3' };
  }
  if (!Array.isArray(stored.data) || stored.data.length === 0) {
    return { ok: false, status: 400, error: 'paper.data must be a non-empty array' };
  }
  return { ok: true, paper: stored, json: JSON.stringify(stored) };
}

function assertPreset(preset, paper) {
  const size = studio.PRESETS[preset];
  if (!size) return null;
  const bg = backgroundSize(paper);
  if (!bg || bg.width !== size.width || bg.height !== size.height) return null;
  return preset;
}

function list(workspaceId) {
  if (!workspaceId) return [];
  return db.prepare(
    `SELECT id, name, preset, updated_at, created_by,
            CASE WHEN thumb IS NOT NULL AND length(thumb) > 0 THEN 1 ELSE 0 END AS has_thumb
       FROM workspace_suika_templates
      WHERE workspace_id = ?
      ORDER BY updated_at DESC`,
  ).all(workspaceId).map((row) => ({
    id: row.id,
    name: row.name,
    preset: row.preset,
    updated_at: row.updated_at,
    created_by: row.created_by,
    has_thumb: Boolean(row.has_thumb),
  }));
}

function getPaper(id, workspaceId) {
  const row = db.prepare(
    `SELECT id, name, preset, paper_json, updated_at
       FROM workspace_suika_templates
      WHERE id = ? AND workspace_id = ?`,
  ).get(id, workspaceId);
  if (!row) return null;
  let paper = {};
  try { paper = JSON.parse(row.paper_json); } catch { paper = {}; }
  return {
    id: row.id,
    name: row.name,
    preset: row.preset,
    updated_at: row.updated_at,
    paper,
  };
}

function getThumb(id, workspaceId) {
  const row = db.prepare(
    `SELECT thumb FROM workspace_suika_templates WHERE id = ? AND workspace_id = ?`,
  ).get(id, workspaceId);
  if (!row || !row.thumb) return null;
  const bytes = Buffer.isBuffer(row.thumb) ? row.thumb : Buffer.from(row.thumb);
  const mime = thumbMime(bytes);
  if (!mime) return null;
  return { mime, bytes };
}

function create({ workspaceId, userId, name, preset, paperRaw, thumb }) {
  if (!workspaceId) fail(403, 'No workspace context');
  if (!userId) fail(401, 'Not signed in');
  const cleaned = cleanName(name);
  if (!cleaned) fail(400, 'Template name is required');
  const parsed = sanitizePaper(paperRaw);
  if (!parsed.ok) fail(parsed.status || 400, parsed.error);
  const presetId = assertPreset(preset, parsed.paper);
  if (!presetId) fail(400, 'Preset does not match the paper');
  let thumbBuf = null;
  if (thumb && thumb.length) {
    if (!thumbMime(thumb)) fail(400, 'Thumb must be a small PNG or JPEG');
    thumbBuf = thumb;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO workspace_suika_templates
       (id, workspace_id, name, preset, paper_json, thumb, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))`,
  ).run(id, workspaceId, cleaned, presetId, parsed.json, thumbBuf, userId);
  return { id, name: cleaned, preset: presetId };
}

/** Deletes the template row only. Sidecars and playlist files stay. */
function remove(id, workspaceId) {
  const info = db.prepare(
    'DELETE FROM workspace_suika_templates WHERE id = ? AND workspace_id = ?',
  ).run(id, workspaceId);
  return info.changes > 0;
}

module.exports = {
  APP_VERSION,
  MAX_THUMB_BYTES,
  list,
  getPaper,
  getThumb,
  create,
  remove,
  sanitizePaper,
};
