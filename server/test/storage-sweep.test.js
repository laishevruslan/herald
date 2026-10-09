'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createS3Client } = require('../lib/storage/s3-client');
const { createSweep } = require('../lib/storage/sweep');
const observe = require('../lib/storage/observe');

const NOW = Date.parse('2026-10-09T00:00:00.000Z');
const OLD = '2026-10-07T00:00:00.000Z';
const YOUNG = '2026-10-08T12:00:00.000Z';

function harness(opts = {}) {
  const deleted = [];
  const rootDeleted = [];
  const objects = opts.objects || [];
  let pages = null;
  const client = {
    deleted,
    async listObjects() {
      if (opts.listError) throw opts.listError;
      if (pages) return pages.shift();
      return { objects, truncated: false, token: null };
    },
    async deleteObject({ key }) { deleted.push(key); },
  };
  const root = { async deleteObject({ key }) { rootDeleted.push(key); } };
  const target = {
    kind: 'organization',
    organizationId: 'org1',
    bucket: 'herald-org-org1',
    client,
  };
  let now = opts.now || NOW;
  const sweep = createSweep({
    backend: () => opts.backend || 's3',
    primaryUrl: () => opts.primaryUrl || null,
    now: () => now,
    cycleMs: 0,
    pauseMs: 0,
    bootDelayMs: 0,
    targets: () => (opts.targets === undefined ? [target] : opts.targets),
    contentIds: () => new Set(opts.ids || ['live']),
    catalog: () => opts.catalog || { bytes: 100, ids: ['live'] },
    pending: () => opts.pending || 0,
  });
  return {
    sweep, client, root, deleted, rootDeleted, target,
    setNow(value) { now = value; },
    setPages(list) { pages = list.slice(); },
  };
}

async function drain(sweep) {
  for (let i = 0; i < 20; i++) {
    const out = await sweep.tickOnce();
    if (out.done || out.idle) return out;
  }
  throw new Error('sweep did not finish');
}

test('an old object with no library row is deleted; a young one, a live one, and a foreign key stay', async () => {
  const h = harness({
    objects: [
      { key: 'ws/w1/c/old/original', size: 40, lastModified: OLD },
      { key: 'ws/w1/c/old/thumb', size: 3, lastModified: OLD },
      { key: 'ws/w1/c/young/original', size: 10, lastModified: YOUNG },
      { key: 'ws/w1/c/live/original', size: 100, lastModified: OLD },
      { key: 'other/file', size: 5, lastModified: OLD },
    ],
  });
  await drain(h.sweep);
  assert.deepEqual(h.deleted.sort(), ['ws/w1/c/old/original', 'ws/w1/c/old/thumb']);
  assert.deepEqual(h.rootDeleted, []);
  const status = h.sweep.publicStatus();
  assert.equal(status.orphans_removed, 2);
  assert.equal(status.unrecognized_objects, 1);
  assert.equal(status.drift_excess_bytes, 10);
  assert.equal(status.missing_objects, 0);
  assert.equal(status.quota_degraded, false);
});

test('open upload bytes cover a young object, and a missing row is reported', async () => {
  const covered = harness({
    objects: [{ key: 'ws/w1/c/young/original', size: 10, lastModified: YOUNG }],
    catalog: { bytes: 0, ids: [] },
    ids: [],
    pending: 10,
  });
  await drain(covered.sweep);
  assert.deepEqual(covered.deleted, []);
  assert.equal(covered.sweep.publicStatus().drift_excess_bytes, 0);

  const missing = harness({
    objects: [{ key: 'ws/w1/c/live/original', size: 100, lastModified: OLD }],
    catalog: { bytes: 150, ids: ['live', 'absent'] },
  });
  await drain(missing.sweep);
  assert.deepEqual(missing.deleted, []);
  const status = missing.sweep.adminStatus();
  assert.equal(status.missing_objects, 1);
  assert.equal(status.drift_excess_bytes, 0);
  assert.equal(status.drift[0].organization_id, 'org1');
  assert.equal(status.drift[0].missing_objects, 1);
});

test('a failed listing is an event and does not delete or keep a secret', async () => {
  const h = harness({
    listError: new Error('list failed {"secretKey":"supersecret"} C:\\data\\secret.mp4'),
    objects: [{ key: 'ws/w1/c/old/original', size: 40, lastModified: OLD }],
  });
  await drain(h.sweep);
  assert.deepEqual(h.deleted, []);
  const admin = h.sweep.adminStatus();
  assert.equal(JSON.stringify(admin).includes('supersecret'), false);
  assert.equal(JSON.stringify(admin).includes('secret.mp4'), false);
  assert.ok(admin.sweep_error);
  const pub = JSON.stringify(h.sweep.publicStatus());
  assert.equal(pub.includes('supersecret'), false);
  assert.equal(pub.includes('sweep_error'), false);
});

test('listing continues across pages and a later cycle removes what has aged', async () => {
  const h = harness({
    catalog: { bytes: 0, ids: [] },
    ids: [],
  });
  h.setPages([
    {
      objects: [{ key: 'ws/w1/c/a/original', size: 4, lastModified: YOUNG }],
      truncated: true,
      token: 'page-2',
    },
    {
      objects: [{ key: 'ws/w1/c/b/original', size: 6, lastModified: OLD }],
      truncated: false,
      token: null,
    },
  ]);
  await drain(h.sweep);
  assert.deepEqual(h.deleted, ['ws/w1/c/b/original']);
  assert.equal(h.sweep.publicStatus().drift_excess_bytes, 4);

  h.setNow(NOW + 24 * 60 * 60 * 1000);
  h.setPages([{
    objects: [{ key: 'ws/w1/c/a/original', size: 4, lastModified: YOUNG }],
    truncated: false,
    token: null,
  }]);
  await drain(h.sweep);
  assert.deepEqual(h.deleted, ['ws/w1/c/b/original', 'ws/w1/c/a/original']);
  assert.equal(h.sweep.publicStatus().drift_excess_bytes, 0);
  assert.equal(h.sweep.publicStatus().orphans_removed, 1);
});

test('filesystem mode and a replica do not list or delete', async () => {
  const disk = harness({ backend: 'fs' });
  await drain(disk.sweep);
  assert.equal(disk.sweep.publicStatus(), null);
  assert.deepEqual(disk.deleted, []);

  const replica = harness({ primaryUrl: 'http://primary.example' });
  await drain(replica.sweep);
  assert.deepEqual(replica.deleted, []);
});

test('listObjects reads a page, and a degraded quota phrase is recorded without the secret', async () => {
  observe.resetQuotaDegraded();
  let urlSeen = '';
  const listed = createS3Client({
    endpoint: 'http://127.0.0.1:9',
    region: 'us-east-1',
    accessKeyId: 'k',
    secretAccessKey: 's',
    manageBuckets: false,
    fetchImpl: async (url) => {
      urlSeen = String(url);
      const page = String(url).includes('continuation-token')
        ? '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>ws/w1/c/c2/original</Key><Size>4</Size><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents></ListBucketResult>'
        : '<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>page-2</NextContinuationToken><Contents><Key>ws/w1/c/c1/thumb</Key><Size>2</Size><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents></ListBucketResult>';
      return { status: 200, headers: { forEach() {}, get() { return null; } }, text: async () => page };
    },
  });
  const first = await listed.listObjects({ bucket: 'herald-org-org1' });
  assert.equal(first.truncated, true);
  assert.equal(first.token, 'page-2');
  assert.equal(first.objects[0].size, 2);
  const second = await listed.listObjects({ bucket: 'herald-org-org1', token: 'page-2' });
  assert.equal(second.objects[0].key, 'ws/w1/c/c2/original');
  assert.match(urlSeen, /continuation-token=page-2/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-sweep-'));
  const file = path.join(dir, 'clip.mp4');
  fs.writeFileSync(file, '0123456789');
  const degraded = createS3Client({
    endpoint: 'http://127.0.0.1:9',
    region: 'us-east-1',
    accessKeyId: 'k',
    secretAccessKey: 's',
    manageBuckets: false,
    fetchImpl: async () => ({
      status: 500,
      headers: { forEach() {}, get() { return null; } },
      text: async () => 'Bucket quota check degraded to allow {"secretKey":"supersecret"}',
    }),
  });
  await assert.rejects(() => degraded.putObject({
    bucket: 'herald-org-org1', key: 'ws/w1/c/c1/original', sourcePath: file, contentType: 'video/mp4',
    metadata: { 'herald-content': 'c1', 'herald-role': 'original' },
  }));
  const flag = observe.quotaDegraded();
  assert.equal(flag.quota_degraded, true);
  assert.equal(JSON.stringify(flag).includes('supersecret'), false);
  fs.rmSync(dir, { recursive: true, force: true });
  observe.resetQuotaDegraded();
});

test('status merges the sweep into the storage block', () => {
  const status = fs.readFileSync(path.join(__dirname, '../routes/status.js'), 'utf8');
  const admin = fs.readFileSync(path.join(__dirname, '../routes/admin.js'), 'utf8');
  assert.match(status, /storage\/sweep/);
  assert.match(admin, /storage\/sweep/);
});
