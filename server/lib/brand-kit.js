'use strict';

/*
 * Workspace brand kit (enterprise-slide-editor-plan phase 4 / Studio 6.2 gap).
 *
 * Four colours, two catalogue fonts, optional logo content_id.
 * Not white-label (login chrome) — this is the authoring palette for Slides/Studio.
 */

const { db } = require('../db/database');
const slideFonts = require('./slide-fonts');

const HEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULTS = Object.freeze({
  color_primary: '#3B82F6',
  color_secondary: '#1E293B',
  color_accent: '#F59E0B',
  color_bg: '#111827',
  font_heading: 'archivo',
  font_body: 'inter',
  logo_content_id: null,
});

function hexOr(value, fallback) {
  const s = String(value || '').trim();
  return HEX.test(s) ? s.toUpperCase() : fallback;
}

function fontOr(value, fallback) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id) return fallback;
  if (Object.prototype.hasOwnProperty.call(slideFonts.FAMILIES, id)) return id;
  return fallback;
}

function logoOr(value) {
  if (value == null || value === '') return null;
  const id = String(value).trim();
  return id.length && id.length <= 64 ? id : null;
}

function rowToKit(row, workspaceId) {
  if (!row) {
    return {
      workspace_id: workspaceId,
      ...DEFAULTS,
      source: 'default',
      updated_at: null,
    };
  }
  return {
    workspace_id: row.workspace_id,
    color_primary: row.color_primary,
    color_secondary: row.color_secondary,
    color_accent: row.color_accent,
    color_bg: row.color_bg,
    font_heading: row.font_heading,
    font_body: row.font_body,
    logo_content_id: row.logo_content_id || null,
    source: 'workspace',
    updated_at: row.updated_at,
  };
}

function get(workspaceId) {
  if (!workspaceId) return rowToKit(null, null);
  const row = db.prepare('SELECT * FROM workspace_brand_kits WHERE workspace_id = ?').get(workspaceId);
  return rowToKit(row, workspaceId);
}

/**
 * Upsert kit. Validates hex + catalogue fonts. Logo must belong to the workspace when set.
 */
function upsert(workspaceId, patch) {
  if (!workspaceId) {
    const err = new Error('No workspace context');
    err.status = 403;
    throw err;
  }
  const cur = get(workspaceId);
  const next = {
    color_primary: hexOr(patch.color_primary, cur.color_primary),
    color_secondary: hexOr(patch.color_secondary, cur.color_secondary),
    color_accent: hexOr(patch.color_accent, cur.color_accent),
    color_bg: hexOr(patch.color_bg, cur.color_bg),
    font_heading: fontOr(patch.font_heading, cur.font_heading),
    font_body: fontOr(patch.font_body, cur.font_body),
    logo_content_id: patch.logo_content_id !== undefined
      ? logoOr(patch.logo_content_id)
      : cur.logo_content_id,
  };

  if (next.logo_content_id) {
    const c = db.prepare(
      'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND mime_type LIKE \'image/%\'',
    ).get(next.logo_content_id, workspaceId);
    if (!c) {
      const err = new Error('logo_content_id must be an image in this workspace');
      err.status = 400;
      throw err;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO workspace_brand_kits (
      workspace_id, color_primary, color_secondary, color_accent, color_bg,
      font_heading, font_body, logo_content_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id) DO UPDATE SET
      color_primary = excluded.color_primary,
      color_secondary = excluded.color_secondary,
      color_accent = excluded.color_accent,
      color_bg = excluded.color_bg,
      font_heading = excluded.font_heading,
      font_body = excluded.font_body,
      logo_content_id = excluded.logo_content_id,
      updated_at = excluded.updated_at
  `).run(
    workspaceId,
    next.color_primary,
    next.color_secondary,
    next.color_accent,
    next.color_bg,
    next.font_heading,
    next.font_body,
    next.logo_content_id,
    now,
  );
  return get(workspaceId);
}

/** Swatches for Studio / pickers: kit colours first, then neutrals. */
function swatchesFor(kit) {
  const extras = ['#FFFFFF', '#111827', '#1E293B', '#4B5563', '#3B82F6', '#F59E0B'];
  const out = [];
  const seen = new Set();
  for (const h of [
    kit.color_primary, kit.color_secondary, kit.color_accent, kit.color_bg, ...extras,
  ]) {
    const u = String(h || '').toUpperCase();
    if (!HEX.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 8) break;
  }
  return out;
}

module.exports = {
  DEFAULTS,
  get,
  upsert,
  swatchesFor,
};
