'use strict';

/*
 * Studio poster export API (phase 6.1).
 *
 * JWT + tenancy only — scene_json is operator authoring data, not a PAT target.
 * PNG goes through the same multer + ingest/replace path as the Content Library.
 */

const express = require('express');
const fs = require('fs');
const { denyReadOnly } = require('../lib/tenancy');
const upload = require('../middleware/upload');
const studio = require('../lib/studio-designs');
const config = require('../config');

const router = express.Router();

// Multer writes into contentDir; ensure it exists (fresh DATA_DIR in tests / first boot).
fs.mkdirSync(config.contentDir, { recursive: true });

function pushPlaylistRefresh(req, deviceIds) {
  try {
    const io = req.app.get('io');
    if (!io || !deviceIds || !deviceIds.length) return;
    const { buildPlaylistPayload } = require('../ws/deviceSocket');
    const commandQueue = require('../lib/command-queue');
    const deviceNs = io.of('/device');
    for (const id of new Set(deviceIds)) {
      commandQueue.queueOrEmitPlaylistUpdate(deviceNs, id, buildPlaylistPayload);
    }
  } catch { /* silent — same as content replace */ }
}

/** List designs in this workspace (no scene_json — for Library badges). */
router.get('/', (req, res) => {
  if (!req.workspaceId) return res.status(403).json({ error: 'No workspace context' });
  res.json({ designs: studio.listForWorkspace(req.workspaceId) });
});

/** Load scene for Edit poster / Edit design. */
router.get('/:contentId', (req, res) => {
  if (!req.workspaceId) return res.status(403).json({ error: 'No workspace context' });
  const row = studio.getByContentId(req.params.contentId, req.workspaceId);
  if (!row) return res.status(404).json({ error: 'Studio design not found' });
  let scene = {};
  try { scene = JSON.parse(row.scene_json || '{}'); } catch { scene = {}; }
  res.json({
    content_id: row.content_id,
    width: row.width,
    height: row.height,
    updated_at: row.updated_at,
    editor: studio.detectSceneEditor(scene),
    scene_json: scene,
  });
});

/**
 * Publish (create or replace) a poster PNG + scene.
 * multipart: file (required), scene_json (string), content_id?, preset?, width?, height?, name?
 */
router.post('/export', upload.single('file'), async (req, res) => {
  if (!req.workspaceId) return res.status(403).json({ error: 'No workspace context' });
  if (denyReadOnly(req, res)) return;

  try {
    const result = await studio.publishExport({
      file: req.file,
      userId: req.user.id,
      workspaceId: req.workspaceId,
      sceneRaw: req.body && req.body.scene_json,
      contentId: (req.body && req.body.content_id) || null,
      presetId: (req.body && req.body.preset) || null,
      width: req.body && req.body.width,
      height: req.body && req.body.height,
      filename: (req.body && req.body.name) || null,
      actor: require('../lib/releases').actorOf(req),
    });
    if (!result.draft) pushPlaylistRefresh(req, result.affectedDevices);
    const status = result.content && req.body && req.body.content_id ? 200 : 201;
    res.status(status).json({
      content_id: result.content_id,
      width: result.width,
      height: result.height,
      ...(result.draft ? { draft: true, pending_review: true } : {}),
    });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[studio/export]', e);
    res.status(status).json({ error: e.message || 'Export failed' });
  }
});

module.exports = router;
