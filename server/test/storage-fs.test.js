'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('CONTENT_BACKEND unset is the filesystem adapter on config.contentDir', () => {
  const storage = require('../lib/storage');
  assert.equal(storage.backend, 'fs');
  assert.equal(storage.kind, 'fs');
  assert.equal(storage.root(), path.resolve(require('../config').contentDir));
  assert.equal(typeof storage.put, 'function');
  assert.equal(typeof storage.getStream, 'function');
  assert.equal(typeof storage.head, 'function');
  assert.equal(typeof storage.copy, 'function');
  assert.equal(typeof storage.remove, 'function');
  assert.equal(typeof storage.deleteIfUnreferenced, 'function');
});

test('CONTENT_BACKEND=s3 without a bucket endpoint is refused at load', () => {
  const r = spawnSync(process.execPath, ['-e', "require('./lib/storage')"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_BACKEND: 's3', RUSTFS_ENDPOINT: '', RUSTFS_BUCKET: '', RUSTFS_ACCESS_KEY: '', RUSTFS_SECRET_KEY: '' },
    encoding: 'utf8',
  });
  assert.notEqual(r.status, 0);
  assert.match(`${r.stderr}`, /CONTENT_BACKEND=s3 requires/);
});

test('an unknown CONTENT_BACKEND is refused at load', () => {
  const r = spawnSync(process.execPath, ['-e', "require('./lib/storage')"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_BACKEND: 'nope' },
    encoding: 'utf8',
  });
  assert.notEqual(r.status, 0);
  assert.match(`${r.stderr}`, /CONTENT_BACKEND=nope is not available/);
});

test('fs adapter put, head, ranged read, copy, and remove stay inside the root', async () => {
  const { createFilesystemStorage } = require('../lib/storage/fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-storage-'));
  const files = createFilesystemStorage(() => dir);
  const src = path.join(dir, 'src.bin');
  fs.writeFileSync(src, Buffer.from('abcdefghijklmnopqrstuvwxyz'));

  const stored = files.put(src, 'clip.bin');
  assert.equal(stored, path.join(dir, 'clip.bin'));
  assert.equal(fs.existsSync(src), false, 'put moves the source');
  const info = files.head('clip.bin');
  assert.equal(info.size, 26);

  const ranged = await new Promise((resolve, reject) => {
    const chunks = [];
    files.getStream('clip.bin', { start: 0, end: 2 })
      .on('data', (c) => chunks.push(c))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
  assert.equal(ranged, 'abc');

  const dupSrc = path.join(dir, 'again.bin');
  fs.writeFileSync(dupSrc, Buffer.from('abcdefghijklmnopqrstuvwxyz'));
  files.put(dupSrc, 'clip.bin', { overwrite: false });
  assert.equal(fs.existsSync(dupSrc), false, 'a duplicate name drops the new bytes');
  assert.equal(fs.readFileSync(stored).toString(), 'abcdefghijklmnopqrstuvwxyz');

  const copySrc = path.join(dir, 'copy-src.bin');
  fs.writeFileSync(copySrc, Buffer.from('thumb'));
  const copied = files.copy(copySrc, 'thumb.bin');
  assert.equal(fs.readFileSync(copied).toString(), 'thumb');
  assert.equal(fs.existsSync(copySrc), true, 'copy leaves the source');

  assert.equal(files.file('../outside.bin'), path.join(dir, 'outside.bin'));
  assert.equal(files.resolveRef('../outside.bin'), null);
  assert.equal(files.resolveRef('.history/../../outside.bin'), null);
  assert.equal(files.file(''), null);
  assert.equal(files.file('.'), null);
  assert.equal(files.remove('nope.bin'), false);

  assert.equal(files.remove('clip.bin'), true);
  assert.equal(files.head('clip.bin'), null);
  assert.equal(files.remove('thumb.bin'), true);

  fs.rmSync(dir, { recursive: true, force: true });
});
