'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createFilesystemStorage } = require('../lib/storage/fs');
const { createS3Storage } = require('../lib/storage/s3');
const { objectKey } = require('../lib/storage/keys');
const { StorageQuotaError } = require('../lib/storage/s3-client');
const { createMigrator, DROP_CONFIRM } = require('../lib/storage/migrate');

function memorySettings() {
  const values = new Map();
  return {
    get(key, dflt) { return values.has(key) ? values.get(key) : dflt; },
    set(key, value) { values.set(key, String(value)); },
  };
}

function memoryClient(put) {
  const objects = new Map();
  const puts = [];
  return {
    objects,
    puts,
    async putObject({ bucket, key, sourcePath, metadata }) {
      puts.push({ bucket, key });
      if (put) await put({ bucket, key, sourcePath, metadata });
      objects.set(`${bucket}\n${key}`, { body: fs.readFileSync(sourcePath), metadata: metadata || {} });
    },
    async headObject({ bucket, key }) {
      const hit = objects.get(`${bucket}\n${key}`);
      if (!hit) return null;
      return { size: hit.body.length, contentType: 'application/octet-stream', metadata: hit.metadata };
    },
    async deleteObject({ bucket, key }) { objects.delete(`${bucket}\n${key}`); },
  };
}

function provision(client) {
  return {
    async workspace() { return { bucket: 'herald-org-org1', client }; },
    async platform() { return { bucket: 'herald-platform', client }; },
    location(workspaceId, contentId) {
      const bucket = workspaceId ? 'herald-org-org1' : 'herald-platform';
      return { bucket, storageKey: objectKey({ workspaceId, contentId, role: 'original' }) };
    },
  };
}

function openHarness({ backend = 's3', primaryUrl = null, client = memoryClient() } = {}) {
  const Database = require('better-sqlite3');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-mig-'));
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE content (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    filepath TEXT,
    thumbnail_path TEXT,
    subtitle_url TEXT,
    file_size INTEGER,
    byte_digest TEXT,
    mime_type TEXT,
    storage_bucket TEXT,
    storage_key TEXT
  )`);
  const disk = createFilesystemStorage(dir);
  disk.backend = backend;
  disk.objects = backend === 's3' ? createS3Storage({ provision: provision(client) }) : null;
  const settings = memorySettings();
  let digestCalls = 0;
  const migrator = createMigrator({
    storage: () => disk,
    db: () => db,
    settings,
    primaryUrl: () => primaryUrl,
    pauseMs: 60000,
    digestFile: async (abs) => {
      digestCalls += 1;
      return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    },
  });
  function write(name, body) {
    const buf = Buffer.from(body);
    fs.writeFileSync(path.join(dir, name), buf);
    return { size: buf.length, digest: crypto.createHash('sha256').update(buf).digest('hex') };
  }
  function add(row) {
    db.prepare(
      `INSERT INTO content (id, workspace_id, filepath, thumbnail_path, subtitle_url, file_size, byte_digest, mime_type)
       VALUES (@id, @workspace_id, @filepath, @thumbnail_path, @subtitle_url, @file_size, @byte_digest, @mime_type)`,
    ).run({
      workspace_id: 'w1',
      thumbnail_path: null,
      subtitle_url: null,
      file_size: null,
      byte_digest: null,
      mime_type: 'video/mp4',
      ...row,
    });
  }
  async function drain() {
    for (let i = 0; i < 12; i++) {
      const out = await migrator.tickOnce();
      if (out && out.done) return out;
    }
    throw new Error('transfer did not finish');
  }
  return {
    dir, db, disk, client, settings, migrator, write, add, drain,
    digests: () => digestCalls,
    close() {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('a copied row keeps its local file until the operator confirms, and a rerun skips a live object', async () => {
  const h = openHarness();
  try {
    const file = h.write('clip.mp4', '0123456789');
    h.add({ id: 'c1', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    fs.writeFileSync(path.join(h.dir, 'notes.txt'), 'keep');
    await h.drain();
    const row = h.db.prepare('SELECT storage_bucket, storage_key FROM content WHERE id = ?').get('c1');
    assert.equal(row.storage_bucket, 'herald-org-org1');
    assert.equal(row.storage_key, 'ws/w1/c/c1/original');
    assert.equal(fs.existsSync(path.join(h.dir, 'clip.mp4')), true);
    assert.equal(h.client.puts.length, 1);
    assert.equal(h.migrator.publicStatus().rows_on_disk, 0);
    assert.equal(h.migrator.publicStatus().rows_in_bucket, 1);

    h.migrator.start();
    h.migrator.stop();
    await h.migrator.tickOnce();
    assert.equal(h.client.puts.length, 1, 'a live HeadObject is not uploaded again');

    h.client.objects.clear();
    h.migrator.start();
    h.migrator.stop();
    await h.migrator.tickOnce();
    assert.equal(h.client.puts.length, 2, 'a missing object is put again');
    assert.equal(fs.existsSync(path.join(h.dir, 'clip.mp4')), true);
    assert.equal(fs.existsSync(path.join(h.dir, 'notes.txt')), true);
  } finally { h.close(); }
});

test('two rows that share a basename are put twice from one hash, and the file stays while either key is empty', async () => {
  const h = openHarness();
  try {
    const file = h.write('shared.mp4', '0123456789');
    h.add({ id: 'a', filepath: 'shared.mp4', file_size: file.size, byte_digest: file.digest });
    h.add({ id: 'b', filepath: 'shared.mp4', file_size: file.size, byte_digest: file.digest });
    await h.migrator.tickOnce();
    assert.equal(h.digests(), 1);
    assert.equal(h.client.puts.length, 1);
    await assert.rejects(
      () => h.migrator.dropLocalCopies({ confirm: 'migrate' }),
      (e) => e.status === 400,
    );
    const early = await h.migrator.dropLocalCopies({ confirm: DROP_CONFIRM });
    assert.equal(early.removed, 0);
    assert.ok(early.kept >= 1);
    assert.equal(fs.existsSync(path.join(h.dir, 'shared.mp4')), true);

    await h.drain();
    assert.equal(h.digests(), 1);
    assert.equal(h.client.puts.length, 2);
    assert.deepEqual(h.client.puts.map((p) => p.key).sort(), ['ws/w1/c/a/original', 'ws/w1/c/b/original']);
    const dropped = await h.migrator.dropLocalCopies({ confirm: DROP_CONFIRM });
    assert.equal(dropped.removed, 1);
    assert.equal(fs.existsSync(path.join(h.dir, 'shared.mp4')), false);

    h.write('shared.mp4', '0123456789');
    h.client.objects.clear();
    const kept = await h.migrator.dropLocalCopies({ confirm: DROP_CONFIRM });
    assert.equal(kept.removed, 0);
    assert.equal(fs.existsSync(path.join(h.dir, 'shared.mp4')), true);
  } finally { h.close(); }
});

test('a missing file, a size mismatch, and a digest mismatch do not invent an object', async () => {
  const h = openHarness();
  try {
    h.add({ id: 'gone', filepath: 'gone.mp4', file_size: 4, byte_digest: 'abc' });
    const wrongSize = h.write('size.mp4', '0123456789');
    h.add({ id: 'size', filepath: 'size.mp4', file_size: wrongSize.size + 5, byte_digest: wrongSize.digest });
    const wrongDigest = h.write('sum.mp4', '0123456789');
    h.add({ id: 'sum', filepath: 'sum.mp4', file_size: wrongDigest.size, byte_digest: 'f'.repeat(64) });
    const remote = h.write('remote-name.mp4', 'nope');
    h.add({ id: 'url', filepath: 'https://cdn.example/a.mp4', file_size: remote.size, byte_digest: remote.digest });
    await h.drain();
    assert.equal(h.client.puts.length, 0);
    const keys = h.db.prepare('SELECT id, storage_key FROM content ORDER BY id').all();
    assert.deepEqual(keys.map((r) => r.storage_key), [null, null, null, null]);
    assert.equal(h.migrator.publicStatus().rows_on_disk, 3);
    assert.equal(h.migrator.publicStatus().last_error.code, 'digest_mismatch');
    assert.equal(fs.existsSync(path.join(h.dir, 'size.mp4')), true);
  } finally { h.close(); }
});

test('a platform row is stored in herald-platform', async () => {
  const h = openHarness();
  try {
    const file = h.write('plat.mp4', 'template');
    h.add({ id: 'plat1', workspace_id: null, filepath: 'plat.mp4', file_size: file.size, byte_digest: file.digest });
    await h.drain();
    const row = h.db.prepare('SELECT storage_bucket, storage_key FROM content WHERE id = ?').get('plat1');
    assert.equal(row.storage_bucket, 'herald-platform');
    assert.equal(row.storage_key, 'platform/c/plat1/original');
    assert.equal(h.client.puts[0].bucket, 'herald-platform');
    assert.equal(fs.existsSync(path.join(h.dir, 'plat.mp4')), true);
  } finally { h.close(); }
});

test('a quota or a secret-bearing failure is recorded without the secret and does not remove the file', async () => {
  const quota = openHarness({
    client: memoryClient(async () => { throw new StorageQuotaError('Bucket quota exceeded {"secretKey":"supersecret"}'); }),
  });
  try {
    const file = quota.write('clip.mp4', '0123456789');
    quota.add({ id: 'a', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    quota.add({ id: 'b', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    const stopped = await quota.migrator.tickOnce();
    assert.equal(stopped.done, true);
    assert.equal(quota.client.puts.length, 1);
    assert.equal(quota.db.prepare('SELECT storage_key FROM content WHERE id = ?').get('b').storage_key, null);
    const status = quota.migrator.publicStatus();
    assert.equal(status.last_error.code, 'storage_limit');
    assert.equal(JSON.stringify(status).includes('supersecret'), false);
    assert.equal(fs.existsSync(path.join(quota.dir, 'clip.mp4')), true);
  } finally { quota.close(); }

  const leaked = openHarness({
    client: memoryClient(async () => {
      throw new Error('disk full {"secretKey":"supersecret"} RUSTFS_PLATFORM_SECRET_KEY=hunter2 C:\\data\\clip.mp4');
    }),
  });
  try {
    const file = leaked.write('clip.mp4', '0123456789');
    leaked.add({ id: 'c1', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    await leaked.migrator.tickOnce();
    const body = JSON.stringify(leaked.migrator.publicStatus());
    assert.equal(body.includes('supersecret'), false);
    assert.equal(body.includes('hunter2'), false);
    assert.equal(body.includes('clip.mp4'), false);
    assert.equal(leaked.db.prepare('SELECT storage_key FROM content WHERE id = ?').get('c1').storage_key, null);
  } finally { leaked.close(); }
});

test('a head that does not match the file does not record storage_key', async () => {
  const client = memoryClient();
  client.headObject = async () => ({ size: 1, contentType: 'video/mp4', metadata: { 'herald-sha256': 'nope' } });
  const h = openHarness({ client });
  try {
    const file = h.write('clip.mp4', '0123456789');
    h.add({ id: 'c1', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    await h.drain();
    assert.equal(h.db.prepare('SELECT storage_key FROM content WHERE id = ?').get('c1').storage_key, null);
    assert.equal(h.client.objects.size, 0);
    assert.equal(h.migrator.publicStatus().last_error.code, 'head_mismatch');
    assert.equal(fs.existsSync(path.join(h.dir, 'clip.mp4')), true);
  } finally { h.close(); }
});

test('filesystem mode and a replica do not transfer or delete local copies', async () => {
  const disk = openHarness({ backend: 'fs' });
  try {
    assert.equal(disk.migrator.publicStatus(), null);
    assert.equal(disk.migrator.adminStatus().backend, 'fs');
    assert.throws(() => disk.migrator.start(), (e) => e.code === 'not_s3');
    const file = disk.write('clip.mp4', '0123456789');
    disk.add({ id: 'c1', filepath: 'clip.mp4', file_size: file.size, byte_digest: file.digest });
    await assert.rejects(
      () => disk.migrator.dropLocalCopies({ confirm: DROP_CONFIRM }),
      (e) => e.code === 'not_s3',
    );
    assert.equal(fs.existsSync(path.join(disk.dir, 'clip.mp4')), true);
  } finally { disk.close(); }

  const replica = openHarness({ primaryUrl: 'http://primary.example' });
  try {
    assert.throws(() => replica.migrator.start(), (e) => e.status === 409);
    replica.settings.set('content_storage_migrate', '1');
    replica.migrator.resumeIfRequested();
    assert.equal(replica.migrator.adminStatus().running, false);
    await assert.rejects(
      () => replica.migrator.dropLocalCopies({ confirm: DROP_CONFIRM }),
      (e) => e.status === 409,
    );
  } finally { replica.close(); }
});

test('a confirmed drop is refused while a transfer is running, and a restart can resume one', async () => {
  const h = openHarness();
  try {
    h.migrator.start();
    assert.equal(h.migrator.adminStatus().running, true);
    assert.equal(h.settings.get('content_storage_migrate'), '1');
    await assert.rejects(
      () => h.migrator.dropLocalCopies({ confirm: DROP_CONFIRM }),
      (e) => e.status === 409 && e.code === 'running',
    );
    const resumed = createMigrator({
      storage: () => h.disk,
      db: () => h.db,
      settings: h.settings,
      primaryUrl: () => null,
      pauseMs: 60000,
      digestFile: async () => null,
    });
    h.migrator.stop();
    h.settings.set('content_storage_migrate', '1');
    resumed.resumeIfRequested();
    assert.equal(resumed.adminStatus().running, true);
    resumed.stop();
    h.migrator.stop();
  } finally { h.close(); }
});

test('status and the admin routes expose counts, not a migrate flag that deletes files', () => {
  const status = fs.readFileSync(path.join(__dirname, '../routes/status.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '../routes/admin.js'), 'utf8');
  assert.match(status, /content_storage/);
  assert.match(admin, /router\.post\('\/content-storage\/start', requirePlatformAdmin/);
  assert.match(admin, /router\.post\('\/content-storage\/drop-local', requirePlatformAdmin/);
  assert.equal(admin.includes("confirm: req.body && req.body.confirm"), true);
  assert.equal(DROP_CONFIRM, 'drop-local-copies');
});
