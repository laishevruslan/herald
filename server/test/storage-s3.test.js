'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { Readable, PassThrough } = require('stream');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPO = path.join(ROOT, '..');

const { objectKey } = require('../lib/storage/keys');
const { signingKey, encodePath } = require('../lib/storage/sigv4');
const { createS3Client, StorageQuotaError } = require('../lib/storage/s3-client');
const { createS3Storage, readS3Env } = require('../lib/storage/s3');
const { publishContentBytes } = require('../lib/storage/publish');
const { hitHeaders, jsonMiss, streamObject, roleFor, sendPublishedOrLocal } = require('../lib/storage/public');

let gate = Promise.resolve();
function exclusive(fn) {
  const run = gate.then(fn, fn);
  gate = run.then(() => {}, () => {});
  return run;
}

test('bench keys are per content id, and a bad id is refused', () => {
  assert.equal(objectKey({ workspaceId: 'ws-1', contentId: 'c_1', role: 'original' }), 'ws/ws-1/c/c_1/original');
  assert.equal(objectKey({ workspaceId: 'ws-1', contentId: 'c_1', role: 'thumb' }), 'ws/ws-1/c/c_1/thumb');
  assert.equal(objectKey({ workspaceId: null, contentId: 'c_1', role: 'subs' }), 'platform/c/c_1/subs');
  assert.equal(objectKey({ workspaceId: 'ws-1', contentId: 'c_2', role: 'original' }), 'ws/ws-1/c/c_2/original');
  assert.throws(() => objectKey({ workspaceId: '../x', contentId: 'c_1', role: 'original' }), (e) => e.code === 'EINVAL');
  assert.equal(encodePath('ws/a b/c'), 'ws/a%20b/c');
});

test('SigV4 signing key matches the published AWS example', () => {
  const key = signingKey('wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', '20150830', 'us-east-1', 'iam');
  assert.equal(key.toString('hex'), 'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9');
});

test('s3 load keeps local files and refuses a half-configured bucket', () => {
  const bad = spawnSync(process.execPath, ['-e', "require('./lib/storage')"], {
    cwd: ROOT,
    env: {
      ...process.env,
      CONTENT_BACKEND: 's3',
      RUSTFS_ENDPOINT: 'http://127.0.0.1:9',
      RUSTFS_PROVISIONER_ACCESS_KEY: '',
      RUSTFS_PROVISIONER_SECRET_KEY: '',
      RUSTFS_PLATFORM_ACCESS_KEY: '',
      RUSTFS_PLATFORM_SECRET_KEY: '',
    },
    encoding: 'utf8',
  });
  assert.notEqual(bad.status, 0);
  assert.match(`${bad.stderr}`, /CONTENT_BACKEND=s3 requires RUSTFS_PROVISIONER_ACCESS_KEY/);

  const ok = spawnSync(process.execPath, ['-e', `
    const s = require('./lib/storage');
    const os = require('os');
    if (s.backend !== 's3' || s.kind !== 'fs' || !s.objects) process.exit(2);
    const opened = s.open(os.tmpdir());
    if (opened.kind !== 'fs' || opened.backend === 's3') process.exit(3);
    if (typeof s.put !== 'function' || typeof s.file !== 'function') process.exit(4);
    if (typeof s.objects.copyWithinOrganization !== 'function') process.exit(5);
    if (s.objects.secretAccessKey || s.objects.provisionerSecret) process.exit(6);
  `], {
    cwd: ROOT,
    env: {
      ...process.env,
      CONTENT_BACKEND: 's3',
      RUSTFS_ENDPOINT: 'http://127.0.0.1:9',
      RUSTFS_PROVISIONER_ACCESS_KEY: 'prov-key',
      RUSTFS_PROVISIONER_SECRET_KEY: 'prov-secret',
      RUSTFS_PLATFORM_ACCESS_KEY: 'plat-key',
      RUSTFS_PLATFORM_SECRET_KEY: 'plat-secret',
    },
    encoding: 'utf8',
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.throws(
    () => readS3Env({ RUSTFS_ENDPOINT: 'http://127.0.0.1:9' }),
    /RUSTFS_PROVISIONER_ACCESS_KEY/,
  );
  const { orgBucket } = require('../lib/storage/policies');
  assert.throws(() => orgBucket('bad id'), (e) => e.code === 'EINVAL');
});

function memoryClient() {
  const objects = new Map();
  return {
    objects,
    async putObject({ key, sourcePath, contentType, metadata }) {
      objects.set(key, { body: fs.readFileSync(sourcePath), contentType, metadata });
    },
    async headObject({ key }) {
      const hit = objects.get(key);
      return hit ? { size: hit.body.length, contentType: hit.contentType } : null;
    },
    async getObject({ key, range }) {
      const hit = objects.get(key);
      if (!hit) return null;
      let body = hit.body;
      let status = 200;
      let contentRange = null;
      if (range && Number.isFinite(range.start)) {
        const end = Number.isFinite(range.end) ? range.end : body.length - 1;
        body = body.subarray(range.start, end + 1);
        status = 206;
        contentRange = `bytes ${range.start}-${end}/${hit.body.length}`;
      }
      return { status, size: body.length, contentRange, contentType: hit.contentType, stream: Readable.from(body) };
    },
    async deleteObject({ key }) { objects.delete(key); },
    async copyObject() {},
  };
}

test('one shared basename, two content ids: deleting one leaves the other readable', async () => {
  const client = memoryClient();
  const bucket = createS3Storage({ bucket: 'herald-bench', client });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-s3-'));
  const file = path.join(dir, 'clip.mp4');
  const thumb = path.join(dir, 'clip.jpg');
  fs.writeFileSync(file, Buffer.from('0123456789'));
  fs.writeFileSync(thumb, Buffer.from('jpeg'));
  await bucket.putFile({ workspaceId: 'w1', contentId: 'row-a', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'abc' });
  await bucket.putFile({ workspaceId: 'w1', contentId: 'row-a', role: 'thumb', sourcePath: thumb, contentType: 'image/jpeg', sha256: 'abc' });
  await bucket.putFile({ workspaceId: 'w1', contentId: 'row-b', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'abc' });

  await bucket.forgetContent({ id: 'row-a', workspace_id: 'w1' });
  await bucket.drain();
  assert.equal(await bucket.head({ workspaceId: 'w1', contentId: 'row-a', role: 'original' }), null);
  const other = await bucket.getStream({ workspaceId: 'w1', contentId: 'row-b', role: 'original' }, { start: 0, end: 2 });
  const chunk = await readAll(other.stream);
  assert.equal(other.status, 206);
  assert.equal(chunk.toString(), '012');
  assert.equal(fs.existsSync(file), true);
  const meta = client.objects.get('ws/w1/c/row-b/original').metadata;
  assert.equal(meta['herald-sha256'], 'abc');
  assert.equal(meta['herald-workspace'], 'w1');
  assert.equal(meta['herald-role'], 'original');
});

test('a quota answer is STORAGE_LIMIT and a failed publish does not delete the local file', async () => exclusive(async () => {
  const err = new StorageQuotaError('Bucket quota exceeded');
  assert.equal(err.code, 'STORAGE_LIMIT');
  assert.equal(err.status, 403);
  const storage = require('../lib/storage');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-s3-'));
  const file = path.join(dir, 'clip.mp4');
  fs.writeFileSync(file, 'hello');
  const deleted = [];
  const prevBackend = storage.backend;
  const prevObjects = storage.objects;
  storage.backend = 's3';
  storage.objects = createS3Storage({
    bucket: 'herald-bench',
    client: {
      async putObject() { throw err; },
      async deleteObject({ key }) { deleted.push(key); },
    },
  });
  try {
    await assert.rejects(
      () => publishContentBytes({ workspaceId: 'w1', contentId: 'c1', mime: 'video/mp4', original: { path: file } }),
      (e) => e.code === 'STORAGE_LIMIT',
    );
    assert.equal(fs.existsSync(file), true);
    assert.ok(deleted.includes('ws/w1/c/c1/original'));
  } finally {
    storage.backend = prevBackend;
    storage.objects = prevObjects;
  }
}));

test('a player hit carries harden headers, and a miss is JSON without an immutable cache', async () => exclusive(async () => {
  const storage = require('../lib/storage');
  const prevBackend = storage.backend;
  const prevObjects = storage.objects;
  const body = Buffer.from('frame');
  storage.backend = 's3';
  storage.objects = createS3Storage({
    bucket: 'herald-bench',
    client: {
      async getObject() {
        return { status: 200, size: body.length, contentRange: null, contentType: 'video/mp4', stream: Readable.from(body) };
      },
      async headObject() { return { size: body.length, contentType: 'video/mp4' }; },
    },
  });
  try {
    const row = { id: 'c1', workspace_id: 'w1', filepath: 'clip.mp4', thumbnail_path: 'clip.jpg', mime_type: 'video/mp4' };
    assert.equal(roleFor(row, 'clip.jpg'), 'thumb');
    const res = mockRes();
    const hardened = [];
    const sent = await streamObject(
      { method: 'GET', headers: {} },
      res,
      row,
      'clip.mp4',
      (r, name) => { hardened.push(name); r.setHeader('Content-Security-Policy', 'sandbox allow-scripts'); r.setHeader('X-Content-Type-Options', 'nosniff'); },
    );
    assert.equal(sent, true);
    assert.deepEqual(hardened, ['clip.mp4']);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.headers['cross-origin-resource-policy'], 'cross-origin');
    assert.match(res.headers['cache-control'], /immutable/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['content-security-policy'], 'sandbox allow-scripts');
    assert.equal(res.headers['content-type'], 'video/mp4');
    assert.equal((await readAll(res)).toString(), 'frame');

    const miss = {
      headers: { 'cache-control': 'public, max-age=2592000, immutable', 'content-disposition': 'attachment' },
      removeHeader(k) { delete this.headers[k.toLowerCase()]; },
      status(n) { this.statusCode = n; return this; },
      type() { return this; },
      json(payload) { this.body = payload; return this; },
    };
    jsonMiss(miss);
    assert.equal(miss.statusCode, 404);
    assert.deepEqual(miss.body, { error: 'Not found' });
    assert.equal(miss.headers['cache-control'], undefined);
    assert.equal(miss.headers['content-disposition'], undefined);
    hitHeaders(mockRes(), 'gone.mp4', () => {});
  } finally {
    storage.backend = prevBackend;
    storage.objects = prevObjects;
  }
}));

test('the path-style client stores, ranges, and turns a quota body into STORAGE_LIMIT', async () => {
  const saved = new Map();
  let quota = false;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (!String(req.headers.authorization || '').startsWith('AWS4-HMAC-SHA256 ')) {
      res.writeHead(403); res.end('unsigned'); return;
    }
    if (String(req.headers.authorization).includes('bench-secret')) {
      res.writeHead(500); res.end('secret leaked'); return;
    }
    if (req.method === 'HEAD' && req.url === '/herald-bench') { res.writeHead(200); res.end(); return; }
    if (req.method === 'HEAD' && req.url.startsWith('/herald-bench/')) {
      const hit = saved.get(req.url);
      if (!hit) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {
        'content-type': hit.type || 'application/octet-stream',
        'content-length': String(hit.body.length),
        'x-amz-meta-herald-sha256': hit.sha || '',
      });
      res.end();
      return;
    }
    if (req.method === 'PUT' && req.url === '/herald-bench') { res.writeHead(200); res.end(); return; }
    if (quota && req.method === 'PUT') {
      res.writeHead(403, { 'content-type': 'application/xml', 'x-amz-error-code': 'QuotaExceeded' });
      res.end('<Error><Code>QuotaExceeded</Code><Message>Bucket quota exceeded</Message></Error>');
      return;
    }
    if (req.method === 'PUT') {
      saved.set(req.url, {
        body, type: req.headers['content-type'], sha: req.headers['x-amz-meta-herald-sha256'],
        tagging: req.headers['x-amz-tagging'],
      });
      res.writeHead(200); res.end(); return;
    }
    if (req.method === 'GET') {
      const hit = saved.get(req.url);
      if (!hit) { res.writeHead(404); res.end(); return; }
      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d+)-(\d*)$/.exec(range);
        const start = Number(m[1]);
        const end = m[2] === '' ? hit.body.length - 1 : Number(m[2]);
        const slice = hit.body.subarray(start, end + 1);
        res.writeHead(206, {
          'content-type': hit.type,
          'content-length': String(slice.length),
          'content-range': `bytes ${start}-${end}/${hit.body.length}`,
        });
        res.end(slice);
        return;
      }
      res.writeHead(200, { 'content-type': hit.type, 'content-length': String(hit.body.length) });
      res.end(hit.body);
      return;
    }
    if (req.method === 'DELETE') { saved.delete(req.url); res.writeHead(204); res.end(); return; }
    res.writeHead(400); res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-s3-'));
  const file = path.join(dir, 'clip.mp4');
  fs.writeFileSync(file, Buffer.from('0123456789'));
  const client = createS3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: 'us-east-1',
    accessKeyId: 'bench-key',
    secretAccessKey: 'bench-secret',
  });
  try {
    const bucket = createS3Storage({ bucket: 'herald-bench', client });
    await bucket.putFile({ workspaceId: 'w1', contentId: 'c1', role: 'original', sourcePath: file, contentType: 'video/mp4', sha256: 'digest' });
    const ranged = await bucket.getStream({ workspaceId: 'w1', contentId: 'c1', role: 'original' }, { start: 4, end: 6 });
    assert.equal(ranged.status, 206);
    assert.equal((await readAll(ranged.stream)).toString(), '456');
    assert.equal(saved.get('/herald-bench/ws/w1/c/c1/original').sha, 'digest');
    assert.match(saved.get('/herald-bench/ws/w1/c/c1/original').tagging, /herald-content=c1/);
    assert.match(saved.get('/herald-bench/ws/w1/c/c1/original').tagging, /herald-role=original/);
    const info = await client.headObject({ bucket: 'herald-bench', key: 'ws/w1/c/c1/original' });
    assert.equal(info.size, 10);
    assert.equal(info.metadata['herald-sha256'], 'digest');
    quota = true;
    const extra = path.join(dir, 'more.mp4');
    fs.writeFileSync(extra, Buffer.from('more'));
    await assert.rejects(
      () => bucket.putFile({ workspaceId: 'w1', contentId: 'c2', role: 'original', sourcePath: extra, contentType: 'video/mp4', sha256: 'd2' }),
      (e) => e instanceof StorageQuotaError && e.code === 'STORAGE_LIMIT',
    );
    assert.equal(saved.has('/herald-bench/ws/w1/c/c2/original'), false);
  } finally {
    server.close();
  }
});

test('compose keeps RustFS off the default stack and unpublished on the S3 port', () => {
  for (const name of ['docker-compose.yml', 'docker-compose.example.yml']) {
    const text = fs.readFileSync(path.join(REPO, name), 'utf8');
    assert.match(text, /profiles:\s*\["rustfs"\]/);
    assert.match(text, /image:\s*rustfs\/rustfs:1\.0\.0-beta\.10/);
    assert.match(text, /user:\s*"10001:10001"/);
    assert.match(text, /rustfs-data:\/data/);
    assert.match(text, /127\.0\.0\.1:9001:9001/);
    assert.doesNotMatch(text, /9000:9000/);
    assert.doesNotMatch(text, /rustfsadmin/);
    const lumin = text.split(/^  go2rtc:/m)[0];
    const active = lumin.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
    assert.doesNotMatch(active, /rustfs/i);
    assert.doesNotMatch(active, /CONTENT_BACKEND/);
  }
  const example = fs.readFileSync(path.join(REPO, '.env.example'), 'utf8');
  assert.match(example, /^# RUSTFS_ACCESS_KEY=$/m);
  assert.match(example, /^# RUSTFS_SECRET_KEY=$/m);
  assert.doesNotMatch(example, /RUSTFS_SECRET_KEY=.+/);
});

test('fs mode does not publish, and the s3 read path is wired without replacing the static mount', () => exclusive(() => {
  const storage = require('../lib/storage');
  assert.equal(storage.backend, 'fs');
  return publishContentBytes({ workspaceId: 'w1', contentId: 'c1', original: { path: path.join(os.tmpdir(), 'missing.bin') } })
    .then((r) => assert.equal(r.published, false))
    .then(() => {
      const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
      const contentSrc = fs.readFileSync(path.join(ROOT, 'routes', 'content.js'), 'utf8');
      const ingestSrc = fs.readFileSync(path.join(ROOT, 'lib', 'content-ingest.js'), 'utf8');
      assert.match(serverSrc, /express\.static\(contentStorage\.root\(\)/);
      assert.match(serverSrc, /contentStorage\.backend === 's3'/);
      assert.match(serverSrc, /harden: hardenUploadResponse/);
      assert.match(contentSrc, /code: 'STORAGE_LIMIT'/);
      assert.match(ingestSrc, /publishContentBytes/);
      assert.match(fs.readFileSync(path.join(ROOT, 'lib', 'content-files.js'), 'utf8'), /forgetPublished/);
    });
}));

test('a row is read from disk until storage_key is set, then from the bucket', async () => exclusive(async () => {
  const storage = require('../lib/storage');
  const config = require('../config');
  const prevBackend = storage.backend;
  const prevObjects = storage.objects;
  const prevFile = storage.file;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-s3-read-'));
  const file = path.join(dir, 'clip.mp4');
  fs.writeFileSync(file, 'disk');
  let gets = 0;
  storage.backend = 's3';
  storage.file = (name) => (path.basename(String(name || '')) === 'clip.mp4' ? file : null);
  storage.objects = {
    async getStream() {
      gets += 1;
      return { status: 200, size: 6, stream: Readable.from(Buffer.from('bucket')) };
    },
    async head() { return { size: 6, metadata: { 'herald-sha256': 'abc' } }; },
  };
  const respond = () => {
    const res = mockRes();
    res.sendFile = (p) => { res.sentFile = p; res.end(); };
    return res;
  };
  try {
    const diskRes = respond();
    const fromDisk = await sendPublishedOrLocal(
      { method: 'GET', headers: {} },
      diskRes,
      { row: { id: 'c1', workspace_id: 'w1', filepath: 'clip.mp4', mime_type: 'video/mp4' }, filename: 'clip.mp4' },
    );
    assert.equal(fromDisk, true);
    assert.equal(gets, 0);
    assert.equal(diskRes.sentFile, file);

    const bucketRes = respond();
    const fromBucket = await sendPublishedOrLocal(
      { method: 'GET', headers: {} },
      bucketRes,
      { row: { id: 'c1', workspace_id: 'w1', filepath: 'clip.mp4', storage_key: 'ws/w1/c/c1/original', mime_type: 'video/mp4' }, filename: 'clip.mp4' },
    );
    assert.equal(fromBucket, true);
    if (config.primaryUrl) {
      assert.equal(gets, 0);
      assert.equal(bucketRes.sentFile, file);
    } else {
      assert.equal(gets, 1);
      assert.equal((await readAll(bucketRes)).toString(), 'bucket');
    }
  } finally {
    storage.backend = prevBackend;
    storage.objects = prevObjects;
    storage.file = prevFile;
  }
}));

function mockRes() {
  const res = new PassThrough();
  res.headers = {};
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.getHeader = (k) => res.headers[String(k).toLowerCase()];
  res.removeHeader = (k) => { delete res.headers[k.toLowerCase()]; };
  res.status = (n) => { res.statusCode = n; return res; };
  return res;
}

function readAll(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
