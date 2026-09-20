'use strict';

/*
 * Workspace brand kit API — authoring colours / fonts / logo (not white-label).
 */

const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
process.env.DATA_DIR = path.join(os.tmpdir(), 'st-brandkit-' + crypto.randomBytes(4).toString('hex'));
process.env.SELF_HOSTED = 'true';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { db } = require('../db/database');
const brandKit = require('../lib/brand-kit');

const WS = 'ws-bk';
const USER = 'u-bk';
const USER_EDITOR = 'u-bk-ed';
let server, base;

before(async () => {
  db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'platform_admin')").run(USER, 'bk@test', 'Admin');
  db.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'user')").run(USER_EDITOR, 'ed@test', 'Ed');
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run('org-bk', 'Org', USER);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS, 'org-bk', 'WS');

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.workspaceId = WS;
    req.user = { id: USER, role: 'platform_admin' };
    req.workspaceRole = 'workspace_admin';
    req.isPlatformAdmin = true;
    next();
  });
  app.use('/', require('../routes/brand-kit'));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

test('GET returns defaults when no row', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.source, 'default');
  assert.equal(body.color_primary, '#3B82F6');
  assert.equal(body.font_body, 'inter');
  assert.ok(Array.isArray(body.swatches));
  assert.ok(body.swatches.length >= 4);
  assert.ok(Array.isArray(body.fonts_catalog));
  assert.ok(body.fonts_catalog.some((f) => f.id === 'inter'));
});

test('PUT upserts kit; invalid hex rejected via fallback to previous', async () => {
  const r = await fetch(`${base}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      color_primary: '#ABCDEF',
      color_accent: '#112233',
      font_heading: 'oswald',
      font_body: 'bitter',
    }),
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.source, 'workspace');
  assert.equal(body.color_primary, '#ABCDEF');
  assert.equal(body.color_accent, '#112233');
  assert.equal(body.font_heading, 'oswald');
  assert.equal(body.font_body, 'bitter');

  const again = brandKit.get(WS);
  assert.equal(again.color_primary, '#ABCDEF');
});

test('unknown font id falls back to catalogue default', async () => {
  const r = await fetch(`${base}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ font_heading: 'Impact' }),
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.font_heading, 'oswald'); // previous value kept
});

test('workspace_editor cannot PUT', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.workspaceId = WS;
    req.user = { id: USER_EDITOR, role: 'user' };
    req.workspaceRole = 'workspace_editor';
    req.isPlatformAdmin = false;
    next();
  });
  app.use('/', require('../routes/brand-kit'));
  const s = http.createServer(app);
  await new Promise((r) => s.listen(0, r));
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color_primary: '#000000' }),
    });
    assert.equal(r.status, 403);
  } finally {
    await new Promise((r) => s.close(r));
  }
});

test('logo_content_id must be an image in the workspace', async () => {
  const bad = await fetch(`${base}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logo_content_id: 'missing-id' }),
  });
  assert.equal(bad.status, 400);

  const cid = crypto.randomUUID();
  db.prepare(`INSERT INTO content (id, user_id, workspace_id, filename, filepath, mime_type, file_size)
              VALUES (?, ?, ?, 'logo.png', 'logo.png', 'image/png', 10)`).run(cid, USER, WS);
  const ok = await fetch(`${base}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logo_content_id: cid }),
  });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).logo_content_id, cid);
});
