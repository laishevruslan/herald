'use strict';

// Storage allowance is the organization's plan, summed across every workspace in it.
//
// A file uploaded by a colleague, a support session (user_id NULL) and a second workspace all
// count. A platform row with no workspace does not. Two rows that share one on-disk name still
// count twice: the allowance is a sum of rows, and the shared file is only how the bytes are
// stored. Self-hosting does not waive a finite plan; a plan with max_storage_mb = -1 is the
// unlimited case, hosted or not.

const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
process.env.DATA_DIR = path.join(os.tmpdir(), 'st-orgstore-' + crypto.randomBytes(4).toString('hex'));
process.env.SELF_HOSTED = 'true';
process.env.NODE_ENV = 'test';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../db/database');
const { supportUser } = require('../lib/support-access');
const sub = require('../middleware/subscription');
const uploadSession = require('../lib/upload-session');

const OWNER = 'u-orgstore-owner';
const EDITOR = 'u-orgstore-editor';
const OTHER = 'u-orgstore-other';
const ORG = 'org-store';
const ORG_B = 'org-store-b';
const WS_A1 = 'ws-store-a1';
const WS_A2 = 'ws-store-a2';
const WS_B = 'ws-store-b';
const SHARED = 'shared-sha.png';

function user(id, planId) {
  db.prepare('INSERT INTO users (id, email, password_hash, role, plan_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, id + '@t.local', 'x', 'user', planId);
}

function content({ userId, workspaceId, filepath, size }) {
  db.prepare(`INSERT INTO content (id, user_id, workspace_id, filename, filepath, mime_type, file_size)
              VALUES (?, ?, ?, ?, ?, 'image/png', ?)`).run(
    crypto.randomUUID(), userId, workspaceId, filepath, filepath, size);
}

function run(mw, { user: u, workspaceId = null }) {
  let nexted = false, status = null, body = null;
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; },
  };
  mw({ user: u, workspaceId }, res, () => { nexted = true; });
  return { nexted, status, body };
}

before(() => {
  db.prepare("INSERT INTO plans (id, name, display_name, max_storage_mb) VALUES ('orgstore-1mb', 'tiny', 'Tiny', 1)").run();
  db.prepare("INSERT INTO plans (id, name, display_name, max_storage_mb) VALUES ('orgstore-unl', 'unl', 'Unlimited', -1)").run();
  user(OWNER, 'orgstore-1mb');
  user(EDITOR, 'orgstore-unl');
  user(OTHER, 'orgstore-unl');
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run(ORG, 'A', OWNER);
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run(ORG_B, 'B', OTHER);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS_A1, ORG, 'A1');
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS_A2, ORG, 'A2');
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(WS_B, ORG_B, 'B');

  content({ userId: EDITOR, workspaceId: WS_A1, filepath: SHARED, size: 700 * 1024 });
  content({ userId: null, workspaceId: WS_A2, filepath: SHARED, size: 500 * 1024 });
  content({ userId: OTHER, workspaceId: WS_B, filepath: SHARED, size: 900 * 1024 });
  content({ userId: OWNER, workspaceId: null, filepath: 'platform.png', size: 8 * 1024 * 1024 });
});

test('a shared file counts once per row inside the organization and not in the neighbour', () => {
  assert.equal(sub.organizationStorageBytes(ORG), 700 * 1024 + 500 * 1024);
  assert.equal(sub.organizationStorageBytes(ORG_B), 900 * 1024);
  assert.equal(sub.getOrganizationStorageMB(ORG), 2);
});

test('a platform row with no workspace is outside every organization', () => {
  const all = db.prepare('SELECT COALESCE(SUM(file_size),0) AS t FROM content').get().t;
  assert.ok(all > sub.organizationStorageBytes(ORG) + sub.organizationStorageBytes(ORG_B));
});

test('the ceiling is the org owner plan, not the uploader plan', () => {
  const editor = { id: EDITOR, role: 'user' };
  const over = run(sub.checkStorageLimit, { user: editor, workspaceId: WS_A1 });
  assert.equal(over.nexted, false);
  assert.equal(over.status, 403);
  assert.equal(over.body.code, 'STORAGE_LIMIT');
  assert.equal(over.body.limit_mb, 1);

  const neighbour = run(sub.checkStorageLimit, { user: editor, workspaceId: WS_B });
  assert.equal(neighbour.nexted, true, 'org B is on an unlimited plan');
});

test('room is the organization remainder and goes negative once the plan is already over', () => {
  const room = sub.storageRoomBytes(WS_A1);
  assert.equal(room, (1 * 1024 * 1024) - (700 * 1024 + 500 * 1024));
  assert.ok(room < 0);
  assert.equal(sub.storageRoomBytes(WS_B), null, 'unlimited plan has no ceiling');
});

test('self-hosted does not turn a finite plan into an unlimited one', () => {
  assert.equal(process.env.SELF_HOSTED, 'true');
  const blocked = sub.storageRoomForUpload(WS_A1);
  assert.equal(blocked.blocked, null);
  assert.ok(blocked.room < 0);
  const open = sub.storageRoomForUpload(WS_B);
  assert.equal(open.room, null);
  assert.equal(open.blocked, null);
});

test('a support session inside a full organization is refused, and one with no workspace still reaches the route', () => {
  const support = supportUser({ id: 'support:' + crypto.randomBytes(8).toString('hex'), by: 'ops@example.test' });
  const inside = run(sub.checkStorageLimit, { user: support, workspaceId: WS_A1 });
  assert.equal(inside.nexted, false);
  assert.equal(inside.body.code, 'STORAGE_LIMIT');

  const loose = run(sub.checkStorageLimit, { user: support, workspaceId: WS_B });
  assert.equal(loose.nexted, true, 'the customer plan has room, so support may upload there');

  const nowhere = run(sub.checkStorageLimit, { user: support });
  assert.equal(nowhere.nexted, true, 'no workspace: the route says so, instead of No plan found');
});

test('an organization whose owner has no plan is refused for everyone, including support', () => {
  const bare = 'u-orgstore-bare';
  db.prepare('INSERT INTO users (id, email, password_hash, role, plan_id) VALUES (?, ?, ?, ?, NULL)')
    .run(bare, bare + '@t.local', 'x', 'user');
  const org = 'org-store-bare';
  const ws = 'ws-store-bare';
  db.prepare('INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)').run(org, 'Bare', bare);
  db.prepare('INSERT INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)').run(ws, org, 'Bare');
  const support = supportUser({ id: 'support:' + crypto.randomBytes(8).toString('hex'), by: 'ops@example.test' });
  for (const u of [{ id: EDITOR, role: 'user' }, support]) {
    const r = run(sub.checkStorageLimit, { user: u, workspaceId: ws });
    assert.equal(r.nexted, false);
    assert.equal(r.status, 403);
    assert.equal(r.body.error, 'No plan found');
  }
});

test('a plan-less real account with no workspace is still refused', () => {
  const r = run(sub.checkStorageLimit, { user: { id: 'u-orgstore-bare', role: 'user' } });
  assert.equal(r.nexted, false);
  assert.equal(r.body.error, 'No plan found');
});

test('open uploads in a sibling workspace reserve the same organization allowance', () => {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO upload_sessions (id, workspace_id, user_id, filename, declared_size, part_name)
              VALUES (?, ?, ?, 'big.bin', ?, ?)`).run(id, WS_A2, EDITOR, 200 * 1024, id + '.part');
  assert.equal(uploadSession.reservedBytesForWorkspace(WS_A1), 200 * 1024);
  assert.equal(uploadSession.reservedBytesForWorkspace(WS_B), 0);
});
