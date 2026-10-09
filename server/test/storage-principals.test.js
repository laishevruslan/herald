'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const { canonicalQuery } = require('../lib/storage/sigv4');
const { redact } = require('../lib/storage/redact');
const {
  workspacePolicy, organizationPolicy, requestAllowed, objectArn, bucketArn, orgBucket,
} = require('../lib/storage/policies');
const { createProvision } = require('../lib/storage/provision');
const { createS3Storage } = require('../lib/storage/s3');
const { createS3Client } = require('../lib/storage/s3-client');
const { createIam } = require('../lib/storage/iam');

test('query signing keeps parameter order and does not hide an empty value', () => {
  assert.equal(canonicalQuery({ b: '2', a: '1' }), 'a=1&b=2');
  assert.equal(canonicalQuery({ publicAccessBlock: '' }), 'publicAccessBlock=');
});

test('a workspace key cannot read another prefix; the organization key can read both', () => {
  const bucket = orgBucket('org1');
  const wsA = workspacePolicy(bucket, 'wsa');
  const wsB = workspacePolicy(bucket, 'wsb');
  const org = organizationPolicy(bucket);
  const keyA = 'ws/wsa/c/c1/original';
  const keyB = 'ws/wsb/c/c2/original';
  assert.equal(requestAllowed(wsA, { action: 's3:GetObject', resource: objectArn(bucket, keyA) }), true);
  assert.equal(requestAllowed(wsA, { action: 's3:GetObject', resource: objectArn(bucket, keyB) }), false);
  assert.equal(requestAllowed(wsA, { action: 's3:PutObject', resource: objectArn(bucket, keyB) }), false);
  assert.equal(requestAllowed(wsA, {
    action: 's3:ListBucket', resource: bucketArn(bucket), prefix: 'ws/wsb/c/c2/original',
  }), false);
  assert.equal(requestAllowed(wsA, {
    action: 's3:ListBucket', resource: bucketArn(bucket), prefix: 'ws/wsa/c/c1/original',
  }), true);
  assert.equal(requestAllowed(org, { action: 's3:GetObject', resource: objectArn(bucket, keyA) }), true);
  assert.equal(requestAllowed(org, { action: 's3:GetObject', resource: objectArn(bucket, keyB) }), true);
  assert.equal(requestAllowed(org, { action: 's3:DeleteBucket', resource: bucketArn(bucket) }), false);
  assert.equal(requestAllowed(wsB, { action: 's3:GetObject', resource: objectArn(bucket, keyA) }), false);
  assert.equal(JSON.stringify(wsA).includes('"Principal"'), false);
  assert.equal(JSON.stringify(org).includes('admin:'), false);
});

test('uploads use the workspace key, and a copy is an explicit organization-key operation', async () => {
  const harness = harnessOf();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-principal-'));
  const file = path.join(dir, 'clip.bin');
  fs.writeFileSync(file, 'frames');
  const storage = createS3Storage({ provision: harness.provision });

  const stored = await storage.putFile({
    workspaceId: 'wsa', contentId: 'c1', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'abc',
  });
  assert.equal(stored.bucket, 'herald-org-org1');
  assert.equal(stored.key, 'ws/wsa/c/c1/original');
  assert.equal(harness.calls.filter((c) => c.op === 'put').map((c) => c.accessKeyId).join(','), 'ws-wsa');
  assert.equal(harness.calls.some((c) => c.accessKeyId === 'prov-key'), false);
  assert.equal(harness.calls.some((c) => c.op === 'copy'), false);
  const sent = harness.iam.calls.find((c) => c.op === 'putPolicy' && c.name === 'herald-ws-wsa').document;
  assert.equal(requestAllowed(sent, {
    action: 's3:GetObject', resource: objectArn('herald-org-org1', 'ws/wsb/c/c2/original'),
  }), false);

  await storage.putFile({
    workspaceId: 'wsb', contentId: 'c2', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'abc',
  });
  const userPuts = harness.iam.calls.filter((c) => c.op === 'putUser').map((c) => c.accessKey);
  assert.deepEqual(userPuts, ['org-org1', 'ws-wsa', 'ws-wsb']);

  const copied = await storage.copyWithinOrganization({
    fromWorkspaceId: 'wsa', toWorkspaceId: 'wsb', fromContentId: 'c1', toContentId: 'c2b',
  });
  assert.equal(copied.accessKeyId, 'org-org1');
  assert.equal(harness.calls.filter((c) => c.op === 'copy').every((c) => c.accessKeyId === 'org-org1'), true);
  assert.ok(harness.store.has('herald-org-org1/ws/wsb/c/c2b/original'));

  await assert.rejects(
    () => storage.copyWithinOrganization({
      fromWorkspaceId: 'wsa', toWorkspaceId: 'wsc', fromContentId: 'c1', toContentId: 'c9',
    }),
    (e) => e.code === 'EINVAL',
  );
  await assert.rejects(
    () => storage.copy({ workspaceId: 'wsa', contentId: 'c1', role: 'original' }, { workspaceId: 'wsb', contentId: 'c2b', role: 'original' }),
    (e) => e.code === 'EINVAL',
  );

  const again = harness.iam.calls.filter((c) => c.op === 'putUser').length;
  await storage.putFile({
    workspaceId: 'wsa', contentId: 'c3', role: 'thumb', sourcePath: file, contentType: 'image/jpeg', sha256: 'abc',
  });
  assert.equal(harness.iam.calls.filter((c) => c.op === 'putUser').length, again);

  harness.iam.putPolicy = async () => { throw new Error('admin said {"secretKey":"super-secret-value"}'); };
  await assert.rejects(
    () => storage.putFile({
      workspaceId: 'wsnew', contentId: 'c4', role: 'original', sourcePath: file, contentType: 'video/mp4',
    }),
    (e) => {
      assert.equal(`${e && e.message} ${e && e.body}`.includes('super-secret-value'), false);
      return true;
    },
  );
  assert.equal(JSON.stringify(storage).includes('super-secret-value'), false);

  const ingest = fs.readFileSync(path.join(__dirname, '../lib/content-ingest.js'), 'utf8');
  assert.equal(ingest.includes('copyWithinOrganization'), false);
  const data = fs.readFileSync(path.join(__dirname, '../lib/storage/s3.js'), 'utf8');
  assert.equal(data.includes('process.env.RUSTFS_ACCESS_KEY'), false);
  const prov = fs.readFileSync(path.join(__dirname, '../lib/storage/provision.js'), 'utf8');
  assert.equal(prov.includes('RUSTFS_ACCESS_KEY'), false);
});

test('removing a workspace drops its user, and an empty organization bucket goes with the org', async () => {
  const harness = harnessOf();
  const storage = createS3Storage({ provision: harness.provision });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-principal-'));
  const file = path.join(dir, 'clip.bin');
  fs.writeFileSync(file, 'frames');
  await storage.putFile({
    workspaceId: 'wsa', contentId: 'c1', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'abc',
  });
  let released = await storage.releaseOrganization('org1', ['wsa']);
  assert.equal(released.bucketDeleted, false);
  assert.equal(harness.buckets.deleted.includes('herald-org-org1'), false);
  assert.equal(harness.iam.calls.some((c) => c.op === 'deleteUser' && c.accessKey === 'ws-wsa'), true);

  for (const key of [...harness.store.keys()]) harness.store.delete(key);
  released = await storage.releaseOrganization('org1', []);
  assert.equal(released.bucketDeleted, true);
  assert.equal(harness.buckets.deleted.includes('herald-org-org1'), true);
  const left = harness.db.prepare("SELECT COUNT(*) AS n FROM storage_principals").get().n;
  assert.equal(left, 0);
});

test('unlimited plans clear the bucket quota, and a limited plan sets it', async () => {
  const limited = harnessOf(() => 5 * 1024 * 1024);
  await limited.provision.workspace('wsa');
  assert.equal(limited.iam.calls.some((c) => c.op === 'quota' && c.bytes === 5 * 1024 * 1024), true);
  const unlimited = harnessOf(() => null);
  await unlimited.provision.workspace('wsa');
  assert.equal(unlimited.iam.calls.some((c) => c.op === 'clearQuota'), true);
});

test('platform bytes use the platform key, not the provisioner', async () => {
  const harness = harnessOf();
  const storage = createS3Storage({ provision: harness.provision });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-principal-'));
  const file = path.join(dir, 'clip.bin');
  fs.writeFileSync(file, 'tmpl');
  const stored = await storage.putFile({
    workspaceId: null, contentId: 'plat1', role: 'original', sourcePath: file, contentType: 'image/png', sha256: 'p',
  });
  assert.equal(stored.bucket, 'herald-platform');
  assert.equal(stored.key, 'platform/c/plat1/original');
  assert.equal(harness.calls.filter((c) => c.op === 'put').map((c) => c.accessKeyId).join(','), 'plat-key');
  assert.equal(harness.buckets.blocked.includes('herald-platform'), true);
});

test('admin responses do not keep a secret, and the secret is not in the request URL', async () => {
  process.env.STORAGE_SEAL_KEY = 'test-seal-only';
  const seal = require('../lib/storage/seal');
  const blob = seal.encrypt('tenant-secret');
  assert.equal(seal.decrypt(blob), 'tenant-secret');
  assert.equal(blob.includes('tenant-secret'), false);
  assert.equal(redact('{"secretKey":"super-secret-value"}').includes('super-secret-value'), false);

  const seen = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    seen.push({ url: req.url, body: Buffer.concat(chunks).toString() });
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end('{"secretKey":"super-secret-value","message":"no"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const client = createS3Client({
      endpoint: `http://127.0.0.1:${port}`,
      region: 'us-east-1',
      accessKeyId: 'prov-key',
      secretAccessKey: 'prov-secret',
      manageBuckets: false,
    });
    const iam = createIam(client);
    await assert.rejects(() => iam.putUser('ws-wsa', 'super-secret-value'), (e) => {
      assert.equal(String(e.message).includes('super-secret-value'), false);
      assert.equal(String(e.body).includes('super-secret-value'), false);
      return true;
    });
    assert.equal(seen.length, 1);
    assert.match(seen[0].url, /accessKey=ws-wsa/);
    assert.equal(seen[0].url.includes('super-secret-value'), false);
    assert.equal(seen[0].body.includes('super-secret-value'), true);
  } finally {
    server.close();
  }
});

function harnessOf(quotaBytes = () => undefined) {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE workspaces (id TEXT PRIMARY KEY, organization_id TEXT);
    CREATE TABLE storage_principals (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      organization_id TEXT,
      workspace_id TEXT,
      bucket TEXT NOT NULL,
      access_key_id TEXT NOT NULL,
      secret_enc TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.prepare('INSERT INTO workspaces (id, organization_id) VALUES (?, ?)').run('wsa', 'org1');
  db.prepare('INSERT INTO workspaces (id, organization_id) VALUES (?, ?)').run('wsb', 'org1');
  db.prepare('INSERT INTO workspaces (id, organization_id) VALUES (?, ?)').run('wsc', 'org2');
  db.prepare('INSERT INTO workspaces (id, organization_id) VALUES (?, ?)').run('wsnew', 'org1');
  const store = new Map();
  const calls = [];
  const iam = {
    calls: [],
    async putUser(accessKey, secretKey) {
      this.calls.push({ op: 'putUser', accessKey });
      if (String(secretKey).includes(' ') || secretKey.length < 8) throw new Error('bad secret');
      return { exists: false };
    },
    async deleteUser(accessKey) { this.calls.push({ op: 'deleteUser', accessKey }); },
    async putPolicy(name, document) { this.calls.push({ op: 'putPolicy', name, document }); },
    async attachPolicy(policyName, accessKey) { this.calls.push({ op: 'attach', policyName, accessKey }); },
    async setQuota(bucket, bytes) { this.calls.push({ op: 'quota', bucket, bytes }); },
    async clearQuota(bucket) { this.calls.push({ op: 'clearQuota', bucket }); },
  };
  const buckets = { made: [], blocked: [], deleted: [] };
  const provision = createProvision({
    endpoint: 'http://127.0.0.1:9',
    region: 'us-east-1',
    platformAccessKey: 'plat-key',
    platformSecret: 'plat-secret',
  }, {
    db,
    iam,
    quotaBytes,
    seal: {
      encrypt(value) { return Buffer.from(String(value), 'utf8').toString('base64'); },
      decrypt(value) { return Buffer.from(String(value), 'base64').toString('utf8'); },
    },
    buckets: {
      async ensureBucket(bucket) { buckets.made.push(bucket); },
      async blockPublicPolicy(bucket) { buckets.blocked.push(bucket); },
      async deleteBucket(bucket) { buckets.deleted.push(bucket); },
    },
    makeClient(accessKeyId) {
      return {
        accessKeyId,
        async putObject({ bucket, key }) {
          calls.push({ op: 'put', accessKeyId, key });
          store.set(`${bucket}/${key}`, Buffer.from('x'));
        },
        async deleteObject({ bucket, key }) { store.delete(`${bucket}/${key}`); },
        async copyObject({ bucket, fromKey, toKey }) {
          calls.push({ op: 'copy', accessKeyId, fromKey, toKey });
          const body = store.get(`${bucket}/${fromKey}`);
          if (!body) {
            const err = new Error('missing');
            err.status = 404;
            throw err;
          }
          store.set(`${bucket}/${toKey}`, body);
        },
        async getObject() { return null; },
        async headObject() { return null; },
        async listHasObjects({ bucket }) {
          return [...store.keys()].some((key) => key.startsWith(`${bucket}/`));
        },
      };
    },
  });
  return { db, iam, buckets, calls, store, provision };
}
