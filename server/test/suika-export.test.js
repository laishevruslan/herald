'use strict';

/*
 * Suika / Herald Phase 1: Suika scene_json wrapper accepted by studio export.
 * Uses a hand-made 1×1 PNG so the production image (no sharp) can run the suite.
 */

const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
process.env.DATA_DIR = path.join(os.tmpdir(), 'st-suika-' + crypto.randomBytes(4).toString('hex'));
process.env.SELF_HOSTED = 'true';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { db } = require('../db/database');
const config = require('../config');
const studio = require('../lib/studio-designs');

const WS = 'ws-suika';
const USER = 'u-suika';
let server, base;

/** Minimal valid 1×1 PNG (no sharp in production image). */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

before(async () => {
  await fsp.mkdir(config.contentDir, { recursive: true });
  db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'platform_admin')").run(USER, 'suika@test', 'QA');
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run('org-suika', 'Org', USER);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS, 'org-suika', 'WS');

  const app = express();
  app.use((req, _res, next) => {
    req.workspaceId = WS;
    req.user = { id: USER, role: 'platform_admin' };
    req.workspaceRole = 'workspace_admin';
    next();
  });
  app.use('/', require('../routes/studio'));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

function suikaScene(extra = {}) {
  return {
    v: 1,
    editor: 'suika',
    appVersion: 'suika-editor_0.0.3',
    paper: {
      appVersion: 'suika-editor_0.0.3',
      paperId: 'paper-test',
      data: [
        { id: '0-0', type: 'Document', width: 0, height: 0 },
        { id: 'page-1', type: 'Canvas', width: 0, height: 0, parentIndex: { guid: '0-0', position: 'a0' } },
        {
          id: 'bg',
          type: 'Rect',
          width: 1920,
          height: 1080,
          objectName: 'Background',
          parentIndex: { guid: 'page-1', position: 'a0' },
          ...extra,
        },
      ],
    },
  };
}

test('sanitize accepts Suika wrapper and rejects incomplete ones', () => {
  const ok = studio.sanitizeSceneJson(suikaScene());
  assert.equal(ok.ok, true);
  assert.equal(studio.detectSceneEditor(ok.parsed), 'suika');

  const badV = studio.sanitizeSceneJson({ v: 2, editor: 'suika', paper: { data: [] } });
  assert.equal(badV.ok, false);
  assert.equal(badV.status, 400);

  const badPaper = studio.sanitizeSceneJson({ v: 1, editor: 'suika', paper: 'nope' });
  assert.equal(badPaper.ok, false);

  const layerhub = studio.sanitizeSceneJson({ version: 1, objects: [] });
  assert.equal(layerhub.ok, true);
  assert.equal(studio.detectSceneEditor(layerhub.parsed), 'layerhub');
});

test('Suika export creates content + sidecar with editor=suika', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'Design.png');
  fd.append('scene_json', JSON.stringify(suikaScene()));
  fd.append('preset', 'landscape-1080');
  fd.append('name', 'Design 2026-09-24.png');

  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.ok(body.content_id);
  assert.equal(body.width, 1920);
  assert.equal(body.height, 1080);

  const design = studio.getByContentId(body.content_id, WS);
  assert.ok(design);
  const scene = JSON.parse(design.scene_json);
  assert.equal(scene.editor, 'suika');
  assert.equal(scene.v, 1);
  assert.ok(scene.paper && Array.isArray(scene.paper.data));

  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(body.content_id);
  assert.ok(content);
  assert.match(content.mime_type, /^image\//);
});

test('Suika scene_json with data URL → 400', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'x.png');
  fd.append(
    'scene_json',
    JSON.stringify(
      suikaScene({ fill: [{ type: 'Image', attrs: { src: 'data:image/png;base64,aaaa' } }] }),
    ),
  );
  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 400);
});

test('Suika list helpers never expose scene_json', () => {
  const list = studio.listForWorkspace(WS);
  for (const row of list) {
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'scene_json'), false);
  }
});

test('Suika replace keeps content_id; GET returns editor=suika', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'Design.png');
  fd.append('scene_json', JSON.stringify(suikaScene()));
  fd.append('preset', 'landscape-1080');
  fd.append('name', 'Design replace.png');

  const created = await (await fetch(`${base}/export`, { method: 'POST', body: fd })).json();
  assert.ok(created.content_id);

  const fd2 = new FormData();
  fd2.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'Design2.png');
  fd2.append(
    'scene_json',
    JSON.stringify(suikaScene({ objectName: 'Background-v2' })),
  );
  fd2.append('content_id', created.content_id);
  fd2.append('preset', 'landscape-1080');

  const r2 = await fetch(`${base}/export`, { method: 'POST', body: fd2 });
  assert.equal(r2.status, 200);
  const body2 = await r2.json();
  assert.equal(body2.content_id, created.content_id, 'replace keeps same content id');

  const get = await fetch(`${base}/${created.content_id}`);
  assert.equal(get.status, 200);
  const design = await get.json();
  assert.equal(design.editor, 'suika');
  assert.equal(design.scene_json.editor, 'suika');
  assert.match(JSON.stringify(design.scene_json), /Background-v2/);

  const editors = studio.editorsForContentIds([created.content_id]);
  assert.equal(editors.get(created.content_id), 'suika');
});

test('Layerhub scene maps to studio_editor layerhub', () => {
  const ok = studio.sanitizeSceneJson({
    version: 1,
    objects: [{ type: 'textbox', text: 'Hi', left: 0, top: 0, width: 10, fontSize: 12 }],
  });
  assert.equal(ok.ok, true);
  assert.equal(studio.detectSceneEditor(ok.parsed), 'layerhub');
});
