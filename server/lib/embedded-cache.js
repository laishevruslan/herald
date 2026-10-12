'use strict';

/*
 * Disk-backed ETag cache for the embedded renderer.
 *
 * E-ink displays refresh rarely (seconds to minutes). Serving the same PNG on every
 * request wastes CPU and battery. This module:
 *
 *   1. Computes a deterministic cache key for (device, content, profile).
 *   2. Serves from a disk cache on hits.
 *   3. Stores rendered output after misses.
 *   4. Supports HTTP ETag / 304 Not Modified so a device can skip SPI writes entirely.
 *
 * Cache eviction: in-memory LRU map of (cacheKey -> {filePath, size, atime}).
 * Budget: MAX_ENTRIES=500 or MAX_BYTES=200MB, whichever triggers first.
 * Eviction runs at module load (clearing leftover files from a previous boot) and
 * whenever a new entry would exceed budget.
 *
 * ⚠️ Cache files are keyed by SHA-256 hash — no user-controlled filename component.
 * ⚠️ The cache is WRITE-THROUGH: a miss renders + stores, then serves from the buffer.
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const MAX_ENTRIES = 500;
const MAX_BYTES   = 200 * 1024 * 1024; // 200 MB

function cacheDir() {
  return process.env.EMBEDDED_CACHE_DIR ||
    path.join(__dirname, '..', 'data', 'embedded-cache');
}

/**
 * A disk LRU with its own directory and budget.
 *
 * The e-ink renderer and the player-raster route must not share one budget: a colour 1080p frame
 * is ~100× an e-ink frame, and one Roku fleet would evict every panel's render. `dir` may be a
 * path or a function (so a test can point EMBEDDED_CACHE_DIR / PLAYER_RASTER_CACHE_DIR after load).
 *
 * @returns {{ get: Function, set: Function, invalidate: Function }}
 */
function createCache(opts = {}) {
  const maxEntries = opts.maxEntries || MAX_ENTRIES;
  const maxBytes = opts.maxBytes || MAX_BYTES;
  const label = opts.label || 'embedded-cache';
  const dirOf = typeof opts.dir === 'function' ? opts.dir : () => (opts.dir || cacheDir());
  // Map preserves insertion order; oldest entries are evicted first.
  const lru = new Map();
  let totalBytes = 0;
  let initialized = false;

  function filePath(key) {
    return path.join(dirOf(), key + '.bin');
  }

  function evictIfNeeded() {
    while (lru.size > maxEntries || totalBytes > maxBytes) {
      const oldest = lru.entries().next().value;
      if (!oldest) break;
      const [oldestKey, entry] = oldest;
      lru.delete(oldestKey);
      totalBytes -= entry.size;
      try { fs.unlinkSync(entry.filePath); } catch { /* already gone */ }
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const dir = dirOf();
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* exists */ }
    let files;
    try { files = fs.readdirSync(dir); } catch { return; }
    const entries = [];
    for (const f of files) {
      if (!f.endsWith('.bin')) continue;
      const key = f.slice(0, -4);
      const fp = path.join(dir, f);
      try {
        const stat = fs.statSync(fp);
        entries.push({ key, filePath: fp, size: stat.size, atime: stat.atimeMs });
      } catch { /* skip */ }
    }
    entries.sort((a, b) => a.atime - b.atime);
    for (const e of entries) {
      lru.set(e.key, { filePath: e.filePath, size: e.size, atime: e.atime });
      totalBytes += e.size;
    }
    evictIfNeeded();
  }

  function get(key) {
    init();
    const entry = lru.get(key);
    if (!entry) return { hit: false };
    let buffer;
    try {
      buffer = fs.readFileSync(entry.filePath);
    } catch {
      lru.delete(key);
      totalBytes -= entry.size;
      return { hit: false };
    }
    lru.delete(key);
    lru.set(key, entry);
    return { hit: true, buffer, etag: toETag(key) };
  }

  function set(key, buffer) {
    init();
    const dir = dirOf();
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* exists */ }
    const fp = filePath(key);
    try {
      fs.writeFileSync(fp, buffer);
    } catch (e) {
      console.warn(`[${label}] write failed:`, e.message);
      return;
    }
    const size = buffer.length;
    if (lru.has(key)) {
      totalBytes -= lru.get(key).size;
      lru.delete(key);
    }
    lru.set(key, { filePath: fp, size, atime: Date.now() });
    totalBytes += size;
    evictIfNeeded();
  }

  function invalidate(key) {
    init();
    const entry = lru.get(key);
    if (!entry) return;
    lru.delete(key);
    totalBytes -= entry.size;
    try { fs.unlinkSync(entry.filePath); } catch { /* already gone */ }
  }

  return { get, set, invalidate };
}

// The e-ink renderer keeps this one instance. Player raster builds its own via createCache.
const embedded = createCache({ dir: cacheDir, maxEntries: MAX_ENTRIES, maxBytes: MAX_BYTES, label: 'embedded-cache' });

/**
 * Compute a deterministic cache key.
 *
 * @param {string} deviceId
 * @param {string} itemId          Playlist item id
 * @param {number} itemUpdatedAt   Unix seconds — advances when content is replaced
 * @param {object} profile         Validated screen_profile object
 * @returns {string}  64-char hex SHA-256
 */
function cacheKey(deviceId, itemId, itemUpdatedAt, profile) {
  const payload = JSON.stringify([
    deviceId,
    itemId,
    itemUpdatedAt,
    profile.width,
    profile.height,
    profile.rotation,
    profile.colorDepth,
    profile.dither,
    profile.outputFormat,
  ]);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/** Wrap a key in RFC 7232 strong ETag quotes. */
function toETag(key) { return `"${key}"`; }

/** Strip outer quotes from an ETag value from a request header. */
function fromETag(etag) {
  if (!etag) return null;
  return etag.replace(/^"|"$/g, '');
}

/**
 * Return true when the incoming If-None-Match header matches the current key
 * and a 304 Not Modified should be sent.
 */
function isNotModified(key, ifNoneMatch) {
  if (!ifNoneMatch) return false;
  return fromETag(ifNoneMatch) === key;
}

module.exports = {
  cacheKey, toETag, isNotModified, createCache,
  get: embedded.get, set: embedded.set, invalidate: embedded.invalidate,
};
