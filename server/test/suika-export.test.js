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

test('Suika raster data URL is kept; script and layerhub data URLs are not', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'x.png');
  fd.append(
    'scene_json',
    JSON.stringify(
      suikaScene({
        fill: [{
          type: 'Image',
          attrs: { src: 'data:image/png;base64,aaaa', heraldContentId: 'content-src' },
        }],
      }),
    ),
  );
  const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(r.status, 201);
  const body = await r.json();
  const design = studio.getByContentId(body.content_id, WS);
  const scene = JSON.parse(design.scene_json);
  const bg = scene.paper.data.find((node) => node.id === 'bg');
  assert.equal(bg.fill[0].attrs.heraldContentId, 'content-src');
  assert.match(bg.fill[0].attrs.src, /^data:image\/png/);

  const script = studio.sanitizeSceneJson(
    suikaScene({ fill: [{ type: 'Image', attrs: { src: 'javascript:alert(1)' } }] }),
  );
  assert.equal(script.ok, false);

  const svg = studio.sanitizeSceneJson(
    suikaScene({ fill: [{ type: 'Image', attrs: { src: 'data:image/svg+xml;base64,PHN2Zz4=' } }] }),
  );
  assert.equal(svg.ok, false);

  const layerhub = studio.sanitizeSceneJson({
    version: 1,
    objects: [{ type: 'image', src: 'data:image/png;base64,aaaa' }],
  });
  assert.equal(layerhub.ok, false);
});

test('screen presets keep their pixel size', () => {
  assert.deepEqual(studio.pickPreset('bar-1920', 1, 1), { width: 1920, height: 540, preset: 'bar-1920' });
  assert.deepEqual(studio.pickPreset('landscape-4k', 0, 0), { width: 3840, height: 2160, preset: 'landscape-4k' });
  assert.deepEqual(studio.pickPreset('square-1080', 0, 0), { width: 1080, height: 1080, preset: 'square-1080' });
  assert.deepEqual(studio.pickPreset('landscape-1080', 0, 0), { width: 1920, height: 1080, preset: 'landscape-1080' });
  assert.deepEqual(studio.pickPreset('portrait-1080', 0, 0), { width: 1080, height: 1920, preset: 'portrait-1080' });
  assert.deepEqual(studio.pickPreset('epaper-5x3', 0, 0), { width: 800, height: 480, preset: 'epaper-5x3' });
  assert.equal(studio.pickPreset('nope', 10, 10).preset, 'landscape-1080');
  assert.equal(studio.pickPreset('', 1920, 540).preset, 'bar-1920');
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

/** A second valid 1×1 PNG, different bytes from TINY_PNG. */
const TINY_PNG_2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

function playerFacts(id) {
  // Same stamp the playlist poll uses (deviceSocket refreshContentRevs): rev changes
  // exactly when the bytes change, and filepath is the file the player will fetch.
  return db.prepare(
    `SELECT filename, filepath, file_size,
            COALESCE(NULLIF(updated_at, 0), created_at) AS content_rev
       FROM content WHERE id = ?`,
  ).get(id);
}

test('Suika re-save keeps the name, replaces bytes, and bumps the player revision', async () => {
  const beforePlaylists = db.prepare('SELECT COUNT(*) AS n FROM playlists').get().n;

  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'Lobby.png');
  fd.append('scene_json', JSON.stringify(suikaScene()));
  fd.append('preset', 'landscape-1080');
  fd.append('name', 'Lobby.png');
  const createdRes = await fetch(`${base}/export`, { method: 'POST', body: fd });
  assert.equal(createdRes.status, 201);
  const created = await createdRes.json();
  const before = playerFacts(created.content_id);
  assert.equal(before.filename, 'Lobby.png');

  const fd2 = new FormData();
  fd2.append('file', new Blob([TINY_PNG_2], { type: 'image/png' }), 'Design 2026-10-14.png');
  fd2.append('scene_json', JSON.stringify(suikaScene({ objectName: 'Background-v3' })));
  fd2.append('content_id', created.content_id);
  fd2.append('preset', 'landscape-1080');
  fd2.append('name', 'Design 2026-10-14.png');
  const r2 = await fetch(`${base}/export`, { method: 'POST', body: fd2 });
  assert.equal(r2.status, 200);
  const body2 = await r2.json();
  assert.equal(body2.content_id, created.content_id);
  assert.equal(body2.draft, undefined);

  const after = playerFacts(created.content_id);
  assert.equal(after.filename, 'Lobby.png', 're-save must not rename the clip');
  assert.notEqual(after.filepath, before.filepath, 'new bytes live in a new file');
  assert.ok(after.content_rev > before.content_rev, 'player content_rev must grow');
  assert.notEqual(after.file_size, before.file_size);

  const rows = db.prepare('SELECT COUNT(*) AS n FROM content WHERE workspace_id = ?').get(WS);
  const designs = db.prepare('SELECT COUNT(*) AS n FROM studio_designs WHERE content_id = ?').get(created.content_id);
  assert.equal(designs.n, 1, 'one sidecar, not a second design');
  assert.ok(rows.n >= 1);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playlists').get().n,
    beforePlaylists,
    'saving a design must not create a playlist',
  );
});

test('Suika re-save with require_approval parks the PNG and does not touch live bytes', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'live.png');
  fd.append('scene_json', JSON.stringify(suikaScene()));
  fd.append('preset', 'landscape-1080');
  fd.append('name', 'Approved lobby.png');
  const created = await (await fetch(`${base}/export`, { method: 'POST', body: fd })).json();
  const live = db.prepare('SELECT filepath, filename, draft_json, updated_at FROM content WHERE id = ?').get(created.content_id);
  assert.equal(live.draft_json, null);

  db.prepare('UPDATE workspaces SET require_approval = 1 WHERE id = ?').run(WS);
  try {
    const fd2 = new FormData();
    fd2.append('file', new Blob([TINY_PNG_2], { type: 'image/png' }), 'Design 2026-10-14.png');
    fd2.append('scene_json', JSON.stringify(suikaScene({ objectName: 'Background-draft' })));
    fd2.append('content_id', created.content_id);
    fd2.append('preset', 'landscape-1080');
    fd2.append('name', 'Design 2026-10-14.png');
    const r2 = await fetch(`${base}/export`, { method: 'POST', body: fd2 });
    assert.equal(r2.status, 200);
    const body2 = await r2.json();
    assert.equal(body2.content_id, created.content_id);
    assert.equal(body2.draft, true);
    assert.equal(body2.pending_review, true);

    const after = db.prepare('SELECT filepath, filename, draft_json, updated_at FROM content WHERE id = ?').get(created.content_id);
    assert.equal(after.filepath, live.filepath, 'live file stays until review publishes');
    assert.equal(after.filename, 'Approved lobby.png');
    assert.equal(after.updated_at, live.updated_at, 'a pending draft must not look like a new revision to the player');
    const draft = JSON.parse(after.draft_json);
    assert.ok(draft.filepath);
    assert.notEqual(draft.filepath, live.filepath);

    const design = studio.getByContentId(created.content_id, WS);
    assert.equal(JSON.parse(design.scene_json).editor, 'suika');
    assert.match(design.scene_json, /Background-draft/);
  } finally {
    db.prepare('UPDATE workspaces SET require_approval = 0 WHERE id = ?').run(WS);
  }
});

test('two Suika pages are two clips and not a playlist', async () => {
  const beforePlaylists = db.prepare('SELECT COUNT(*) AS n FROM playlists').get().n;
  const names = ['Menu — 1.png', 'Menu — 2.png'];
  const ids = [];
  for (const name of names) {
    const fd = new FormData();
    fd.append('file', new Blob([TINY_PNG], { type: 'image/png' }), name);
    fd.append('scene_json', JSON.stringify(suikaScene()));
    fd.append('preset', 'landscape-1080');
    fd.append('name', name);
    const r = await fetch(`${base}/export`, { method: 'POST', body: fd });
    assert.equal(r.status, 201);
    ids.push((await r.json()).content_id);
  }
  assert.notEqual(ids[0], ids[1]);
  const stored = ids.map((id) => db.prepare('SELECT filename FROM content WHERE id = ?').get(id).filename);
  assert.deepEqual(stored, names);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM playlists').get().n, beforePlaylists);
});

test('Layerhub scene maps to studio_editor layerhub', () => {
  const ok = studio.sanitizeSceneJson({
    version: 1,
    objects: [{ type: 'textbox', text: 'Hi', left: 0, top: 0, width: 10, fontSize: 12 }],
  });
  assert.equal(ok.ok, true);
  assert.equal(studio.detectSceneEditor(ok.parsed), 'layerhub');
});
