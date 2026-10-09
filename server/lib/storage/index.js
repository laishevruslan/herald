'use strict';

const config = require('../../config');
const { createFilesystemStorage } = require('./fs');

/*
 * Content-byte port. Routes and writers ask this module for a file; they do not join
 * `contentDir` themselves.
 *
 * CONTENT_BACKEND unset or `fs` keeps every byte on disk. `s3` adds one bucket per
 * organization. Reads and writes use that workspace's key. The provisioner key creates
 * buckets and users and is not used for GetObject or PutObject. Local scratch is unchanged:
 * sniff, ffmpeg and history stay on disk, and `open(dir)` is always a filesystem so a
 * replica cache and mesh tests never write a shared bucket.
 * Any other value fails here, at load.
 *
 * presignGet is not part of this delivery. Nothing in the player path calls it.
 */

function selectedBackend() {
  const raw = process.env.CONTENT_BACKEND;
  if (raw == null || String(raw).trim() === '') return 'fs';
  return String(raw).trim().toLowerCase();
}

const backend = selectedBackend();
if (backend !== 'fs' && backend !== 's3') {
  throw new Error(
    `CONTENT_BACKEND=${backend} is not available. Leave CONTENT_BACKEND unset, or set it to fs or s3.`
  );
}

const storage = createFilesystemStorage(() => config.contentDir);

/** An adapter rooted at `rootDir`. Always the filesystem, including when the bench bucket is on. */
function open(rootDir) {
  if (!rootDir) return storage;
  return createFilesystemStorage(() => rootDir);
}

/**
 * Delete a content basename only when no other content row still names it.
 * The reference count stays in lib/content-files.js (one answer for "who else points
 * at these bytes"); the unlink goes through this adapter.
 */
function deleteIfUnreferenced(rel, keeperId, column) {
  return require('../content-files').unlinkIfUnreferenced(rel, keeperId, column);
}

storage.open = open;
storage.backend = backend;
storage.objects = null;
storage.deleteIfUnreferenced = deleteIfUnreferenced;

if (backend === 's3') {
  const { createS3Storage, readS3Env } = require('./s3');
  const { liveProvision } = require('./provision');
  const env = readS3Env();
  storage.objects = createS3Storage({ provision: liveProvision(env), endpoint: env.endpoint, region: env.region });
}

module.exports = storage;
