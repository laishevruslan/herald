'use strict';

/*
 * Workspace brand kit API — colours / fonts / logo for authoring (Slides + Studio).
 * JWT + tenancy. PUT gated like white-label (workspace_admin).
 */

const express = require('express');
const { requireWorkspaceAdmin } = require('../lib/permissions');
const brandKit = require('../lib/brand-kit');
const slideFonts = require('../lib/slide-fonts');

const router = express.Router();

router.get('/', (req, res) => {
  if (!req.workspaceId) return res.status(403).json({ error: 'No workspace context' });
  const kit = brandKit.get(req.workspaceId);
  res.json({
    ...kit,
    swatches: brandKit.swatchesFor(kit),
    fonts_catalog: Object.entries(slideFonts.FAMILIES).map(([id, f]) => ({
      id,
      css: f.css,
      label: f.label,
      role: f.role,
    })),
  });
});

router.put('/', requireWorkspaceAdmin, (req, res) => {
  if (!req.workspaceId) return res.status(403).json({ error: 'No workspace context' });
  try {
    const kit = brandKit.upsert(req.workspaceId, req.body || {});
    res.json({
      ...kit,
      swatches: brandKit.swatchesFor(kit),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Save failed' });
  }
});

module.exports = router;
