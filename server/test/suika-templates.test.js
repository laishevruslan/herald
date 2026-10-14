'use strict';

/*
 * Phase C: workspace Suika templates are workspace-scoped paper JSON.
 * Deleting a template does not touch a design sidecar made from it.
 */

const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
process.env.DATA_DIR = path.join(os.tmpdir(), 'st-suika-tpl-' + crypto.randomBytes(4).toString('hex'));
process.env.SELF_HOSTED = 'true';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { db } = require('../db/database');
const config = require('../config');

const WS = 'ws-suika-tpl';
const WS2 = 'ws-suika-tpl-2';
const USER = 'u-suika-tpl';
let server;
let base;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function paper(extra) {
  const data = [
    { id: '0-0', type: 'Document', width: 0, height: 0 },
    { id: 'page-1', type: 'Canvas', width: 0, height: 0, parentIndex: { guid: '0-0', position: 'a0' } },
    {
      id: 'bg',
      type: 'Rect',
      objectName: 'Background',
      width: 1920,
      height: 1080,
      parentIndex: { guid: 'page-1', position: 'a0' },
    },
  ];
  if (extra) data.push(extra);
  return {
    appVersion: 'suika-editor_0.0.3',
    paperId: 'paper-tpl',
    data,
  };
}

before(async () => {
  await fsp.mkdir(config.contentDir, { recursive: true });
  db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'platform_admin')").run(USER, 'tpl@test', 'QA');
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run('org-suika-tpl', 'Org', USER);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS, 'org-suika-tpl', 'WS');
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS2, 'org-suika-tpl', 'Other');
  db.prepare(
    "INSERT INTO content (id, user_id, workspace_id, filename, filepath, mime_type) VALUES ('c-suika-tpl', ?, ?, 'keep.png', 'keep.png', 'image/png')",
  ).run(USER, WS);
  db.prepare(
    "INSERT INTO studio_designs (content_id, workspace_id, scene_json, width, height) VALUES ('c-suika-tpl', ?, '{}', 1920, 1080)",
  ).run(WS);

  const app = express();
  app.use((req, _res, next) => {
    req.workspaceId = req.headers['x-test-workspace'] || WS;
    req.user = { id: USER, role: 'platform_admin' };
    req.workspaceRole = req.headers['x-test-role'] || 'workspace_admin';
    next();
  });
  app.use('/', require('../routes/suika-templates'));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

function form(fields, thumb) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  if (thumb) fd.append('thumb', new Blob([thumb], { type: 'image/png' }), 'thumb.png');
  return fd;
}

test('save, list, reload paper with heraldLock, and thumb', async () => {
  const locked = paper({
    id: 'title',
    type: 'Text',
    heraldLock: true,
    content: 'Акция',
    width: 400,
    height: 80,
    parentIndex: { guid: 'page-1', position: 'a1' },
  });
  const created = await fetch(`${base}/`, {
    method: 'POST',
    body: form(
      {
        name: '  Лобби  ',
        preset: 'landscape-1080',
        paper_json: JSON.stringify(locked),
      },
      TINY_PNG,
    ),
  });
  assert.equal(created.status, 201);
  const saved = await created.json();
  assert.equal(saved.name, 'Лобби');
  assert.equal(saved.preset, 'landscape-1080');

  const list = await (await fetch(`${base}/`)).json();
  assert.equal(list.templates.length, 1);
  assert.equal(list.templates[0].id, saved.id);
  assert.equal(list.templates[0].has_thumb, true);
  assert.equal(Object.hasOwn(list.templates[0], 'paper_json'), false);

  const got = await (await fetch(`${base}/${saved.id}`)).json();
  const title = got.paper.data.find((node) => node.id === 'title');
  assert.equal(title.heraldLock, true);
  assert.equal(got.paper.appVersion, 'suika-editor_0.0.3');

  const thumb = await fetch(`${base}/${saved.id}/thumb`);
  assert.equal(thumb.status, 200);
  assert.equal(thumb.headers.get('content-type'), 'image/png');

  const other = await fetch(`${base}/`, { headers: { 'x-test-workspace': WS2 } });
  const otherList = await other.json();
  assert.equal(otherList.templates.length, 0);
  const hidden = await fetch(`${base}/${saved.id}`, { headers: { 'x-test-workspace': WS2 } });
  assert.equal(hidden.status, 404);

  const removed = await fetch(`${base}/${saved.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const designs = db.prepare('SELECT content_id FROM studio_designs WHERE content_id = ?').get('c-suika-tpl');
  assert.equal(designs.content_id, 'c-suika-tpl');
  const content = db.prepare('SELECT id FROM content WHERE id = ?').get('c-suika-tpl');
  assert.equal(content.id, 'c-suika-tpl');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM workspace_suika_templates').get().n, 0);
});

test('viewer cannot save, and a bad paper is rejected', async () => {
  const denied = await fetch(`${base}/`, {
    method: 'POST',
    headers: { 'x-test-role': 'workspace_viewer' },
    body: form({
      name: 'Nope',
      preset: 'landscape-1080',
      paper_json: JSON.stringify(paper()),
    }),
  });
  assert.equal(denied.status, 403);

  const script = await fetch(`${base}/`, {
    method: 'POST',
    body: form({
      name: 'Bad',
      preset: 'landscape-1080',
      paper_json: JSON.stringify(paper({ id: 'x', objectName: 'javascript:alert(1)' })),
    }),
  });
  assert.equal(script.status, 400);

  const mismatch = await fetch(`${base}/`, {
    method: 'POST',
    body: form({
      name: 'Wrong size',
      preset: 'epaper-5x3',
      paper_json: JSON.stringify(paper()),
    }),
  });
  assert.equal(mismatch.status, 400);
});
