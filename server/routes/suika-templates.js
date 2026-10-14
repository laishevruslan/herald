'use strict';

/*
 * Workspace Suika templates. JWT + tenancy, same gate as /api/studio.
 * Writes use denyReadOnly (anyone who can edit workspace content).
 * Not mounted on /api/templates — that catalogue is widgets and slides.
 */

const express = require('express');
const multer = require('multer');
const { denyReadOnly } = require('../lib/tenancy');
const templates = require('../lib/suika-templates');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: templates.MAX_THUMB_BYTES, files: 1 },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function workspace(req, res) {
  if (!req.workspaceId) {
    res.status(403).json({ error: 'No workspace context' });
    return null;
  }
  return req.workspaceId;
}

router.get('/', (req, res) => {
  const workspaceId = workspace(req, res);
  if (!workspaceId) return;
  res.json({ templates: templates.list(workspaceId) });
});

router.post('/', (req, res) => {
  upload.single('thumb')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: 'Thumb must be a small PNG or JPEG' });
    }
    const workspaceId = workspace(req, res);
    if (!workspaceId) return;
    if (denyReadOnly(req, res)) return;
    try {
      const body = req.body || {};
      const saved = templates.create({
        workspaceId,
        userId: req.user && req.user.id,
        name: body.name,
        preset: body.preset,
        paperRaw: body.paper_json,
        thumb: req.file && req.file.buffer,
      });
      res.status(201).json(saved);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Save failed' });
    }
  });
});

router.get('/:id/thumb', (req, res) => {
  const workspaceId = workspace(req, res);
  if (!workspaceId) return;
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  const thumb = templates.getThumb(req.params.id, workspaceId);
  if (!thumb) return res.status(404).json({ error: 'Template preview not found' });
  res.set('Content-Type', thumb.mime);
  res.set('Cache-Control', 'private, max-age=60');
  res.send(thumb.bytes);
});

router.get('/:id', (req, res) => {
  const workspaceId = workspace(req, res);
  if (!workspaceId) return;
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  const row = templates.getPaper(req.params.id, workspaceId);
  if (!row) return res.status(404).json({ error: 'Template not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const workspaceId = workspace(req, res);
  if (!workspaceId) return;
  if (denyReadOnly(req, res)) return;
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  const removed = templates.remove(req.params.id, workspaceId);
  if (!removed) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
});

module.exports = router;
