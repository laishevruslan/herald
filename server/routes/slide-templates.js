'use strict';

/*
 * PAT catalogue of factory slide templates. Geometry lives in lib/slide-templates.js — this
 * router is the documented alias of GET /api/slide-decks/factories so an integrator can mint a
 * door sign without round-tripping the dashboard wizard. Slug is not workspace-validated here;
 * missing feeds render empty / stale on the wall, they do not 404 this GET.
 */

const express = require('express');
const router = express.Router();
const slideTemplates = require('../lib/slide-templates');

function queryOpts(req) {
  return {
    slug: req.query.slug,
    slugs: req.query.slugs ? String(req.query.slugs).split(',') : undefined,
    title: req.query.title,
    titles: req.query.titles ? String(req.query.titles).split(',') : undefined,
  };
}

router.get('/', (req, res) => {
  res.json(slideTemplates.listFactories());
});

router.get('/:id/doc', (req, res) => {
  const built = slideTemplates.buildFactory(req.params.id, queryOpts(req));
  if (!built) return res.status(404).json({ error: 'Unknown factory.' });
  res.json(built);
});

module.exports = router;
