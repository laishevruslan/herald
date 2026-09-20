'use strict';

/*
 * Studio export (phase 6.1): JWT-shaped tenancy stub + multipart PNG → content + studio_designs.
 */

const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
process.env.DATA_DIR = path.join(os.tmpdir(), 'st-studio-' + crypto.randomBytes(4).toString('hex'));
process.env.SELF_HOSTED = 'true';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const sharp = require('sharp');
const { db } = require('../db/database');
const config = require('../config');
const studio = require('../lib/studio-designs');

const WS = 'ws-studio';
const WS2 = 'ws-studio-other';
const USER = 'u-studio';
let server, base;

before(async () => {
  await fsp.mkdir(config.contentDir, { recursive: true });
  db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'platform_admin')").run(USER, 'studio@test', 'QA');
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run('org-studio', 'Org', USER);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS, 'org-studio', 'WS');
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS2, 'org-studio', 'WS2');

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

async function pngBytes(w = 64, h = 36) {
  return sharp({ create: { width: w, height: h, channels: 3, background: '#224466' } }).png().toBuffer();
}

test('export without file → 400', async () => {
  const fd = new FormData();
  fd.append('scene_json', '{}');
  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 400);
});

test('export PNG creates content + studio_designs; replace keeps same content_id', async () => {
  const bytes = await pngBytes(192, 108);
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'image/png' }), 'poster.png');
  fd.append('scene_json', JSON.stringify({
    version: 1,
    objects: [{ type: 'textbox', text: 'SALE', left: 0, top: 0, width: 100, fontSize: 24 }],
  }));
  fd.append('preset', 'landscape-1080');
  fd.append('name', 'Sale poster.png');

  const r1 = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r1.status, 201);
  const body1 = await r1.json();
  assert.ok(body1.content_id);
  assert.equal(body1.width, 1920);
  assert.equal(body1.height, 1080);

  const design = studio.getByContentId(body1.content_id, WS);
  assert.ok(design);
  assert.match(design.scene_json, /SALE/);

  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(body1.content_id);
  assert.ok(content);
  assert.equal(content.workspace_id, WS);
  assert.match(content.mime_type, /^image\//);

  const bytes2 = await pngBytes(200, 100);
  const fd2 = new FormData();
  fd2.append('file', new Blob([bytes2], { type: 'image/png' }), 'poster2.png');
  fd2.append('scene_json', JSON.stringify({ version: 1, objects: [{ type: 'rect', left: 1, top: 2, width: 3, height: 4, fill: '#f00' }] }));
  fd2.append('content_id', body1.content_id);
  fd2.append('preset', 'landscape-1080');

  const r2 = await fetch(`${base}/export`, { method: 'POST', body: fd2 });
  assert.equal(r2.status, 200);
  const body2 = await r2.json();
  assert.equal(body2.content_id, body1.content_id, 'replace must keep the same content id (D-SC-5)');

  const design2 = studio.getByContentId(body1.content_id, WS);
  assert.match(design2.scene_json, /rect/);
});

test('scene_json with data URL → 400', async () => {
  const bytes = await pngBytes();
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'image/png' }), 'x.png');
  fd.append('scene_json', JSON.stringify({
    objects: [{ type: 'image', src: 'data:image/png;base64,aaaa' }],
  }));
  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 400);
});

test('GET design from other workspace → 404 (IDOR)', async () => {
  const bytes = await pngBytes();
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'image/png' }), 'x.png');
  fd.append('scene_json', '{}');
  const created = await (await fetch(`${base}/export`, { method: 'POST', body: fd })).json();

  // Mount a second app bound to WS2
  const app2 = express();
  app2.use((req, _res, next) => {
    req.workspaceId = WS2;
    req.user = { id: USER, role: 'platform_admin' };
    req.workspaceRole = 'workspace_admin';
    next();
  });
  app2.use('/', require('../routes/studio'));
  const s2 = http.createServer(app2);
  await new Promise((r) => s2.listen(0, r));
  const base2 = `http://127.0.0.1:${s2.address().port}`;
  try {
    const r = await fetch(`${base2}/${created.content_id}`);
    assert.equal(r.status, 404);
  } finally {
    await new Promise((r) => s2.close(r));
  }
});

test('sanitizeSceneJson rejects javascript: urls', () => {
  const bad = studio.sanitizeSceneJson({ src: 'javascript:alert(1)' });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 400);
});

test('play payload helpers never include scene_json field names in studio list', async () => {
  const list = studio.listForWorkspace(WS);
  for (const row of list) {
    assert.equal('scene_json' in row, false);
  }
});

test('epaper-5x3 preset records 800×480 metadata (phase 6.2)', async () => {
  const bytes = await pngBytes(80, 48);
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'image/png' }), 'epaper.png');
  fd.append('scene_json', JSON.stringify({
    version: 1,
    objects: [{ type: 'textbox', text: 'ROOM', left: 0, top: 0, width: 80, fontSize: 12, fontFamily: "'Inter', sans-serif" }],
  }));
  fd.append('preset', 'epaper-5x3');
  fd.append('name', 'E-paper poster.png');

  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.width, 800);
  assert.equal(body.height, 480);
  const design = studio.getByContentId(body.content_id, WS);
  assert.equal(design.width, 800);
  assert.equal(design.height, 480);
  assert.match(design.scene_json, /Inter/);
});

test('Studio replace with require_approval parks PNG in draft_json (6.3c)', async () => {
  const bytes = await pngBytes(100, 60);
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'image/png' }), 'live.png');
  fd.append('scene_json', JSON.stringify({ version: 2, objects: [{ type: 'textbox', text: 'LIVE' }] }));
  fd.append('preset', 'landscape-1080');
  const created = await (await fetch(`${base}/export`, { method: 'POST', body: fd })).json();
  const live = db.prepare('SELECT filepath, draft_json FROM content WHERE id = ?').get(created.content_id);
  assert.ok(live.filepath);
  assert.equal(live.draft_json, null);

  db.prepare('UPDATE workspaces SET require_approval = 1 WHERE id = ?').run(WS);

  const bytes2 = await pngBytes(110, 70);
  const fd2 = new FormData();
  fd2.append('file', new Blob([bytes2], { type: 'image/png' }), 'draft.png');
  fd2.append('scene_json', JSON.stringify({ version: 2, objects: [{ type: 'textbox', text: 'DRAFT' }] }));
  fd2.append('content_id', created.content_id);
  fd2.append('preset', 'landscape-1080');

  const r2 = await fetch(`${base}/export`, { method: 'POST', body: fd2 });
  assert.equal(r2.status, 200);
  const body2 = await r2.json();
  assert.equal(body2.content_id, created.content_id);
  assert.equal(body2.draft, true);
  assert.equal(body2.pending_review, true);

  const after = db.prepare('SELECT filepath, draft_json FROM content WHERE id = ?').get(created.content_id);
  assert.equal(after.filepath, live.filepath, 'live bytes must not change while pending review');
  assert.ok(after.draft_json);
  const draft = JSON.parse(after.draft_json);
  assert.ok(draft.filepath);
  assert.notEqual(draft.filepath, live.filepath);

  const design = studio.getByContentId(created.content_id, WS);
  assert.match(design.scene_json, /DRAFT/);

  db.prepare('UPDATE workspaces SET require_approval = 0 WHERE id = ?').run(WS);
});
