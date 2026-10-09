'use strict';

const fs = require('fs');
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

/*
 * Local-disk answers for the upstream location layer (lib/storage/locations.js).
 * RustFS stays on CONTENT_BACKEND=s3 through publish.js. These methods keep playlist
 * payloads, deletes and replaces from throwing when no storage profile is configured.
 * A profile id other than local resolves as missing, so nothing here writes a bucket.
 */
const LOCAL_PROFILE = Object.freeze({
  id: 'local', org_id: null, name: 'Local disk', provider: 'local', mode: 'rw',
  read_priority: 0, presign: 0, synthetic: true,
});
storage.LOCAL_PROFILE = LOCAL_PROFILE;
storage.ENV_ID = 'env';
storage.outId = (id) => (id == null || id === '' ? 'local' : String(id));
storage.presignTtl = (sec) => {
  const n = Number(sec);
  return Math.min(3600, Math.max(60, Number.isFinite(n) && n > 0 ? n : 900));
};
storage.getProfile = (id) => (id == null || id === '' || id === 'local' ? LOCAL_PROFILE : null);
storage.writeTargetsForWorkspace = () => ({ primary: LOCAL_PROFILE, dualWrite: null, orgId: null });
storage.profileForWorkspace = () => null;
storage.profileForOrg = () => null;
storage.publicView = (p) => p || null;
storage.backendFor = (profile) => {
  if (!profile || profile.provider === 'local' || profile.id === 'local') {
    return {
      existsSync(key) {
        const p = storage.file(key);
        return !!(p && fs.existsSync(p));
      },
    };
  }
  return null;
};

module.exports = storage;
