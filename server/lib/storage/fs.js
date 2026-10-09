'use strict';

const fs = require('fs');
const path = require('path');
const { copyFileBytes } = require('../fsutil');

/*
 * Filesystem adapter for the content library.
 *
 * Every byte stays under one root — the same directory express.static serves at
 * /uploads/content. Names that would leave that root are refused. Copies go through
 * copyFileBytes so a volume without permission bits (exFAT on a player) still receives
 * the file.
 */

function createFilesystemStorage(rootProvider) {
  if (typeof rootProvider !== 'function') {
    const fixed = rootProvider;
    rootProvider = () => fixed;
  }

  function root() {
    return path.resolve(rootProvider());
  }

  /** Absolute path strictly inside the root, or null. The root itself is not a file. */
  function contained(abs) {
    const base = root();
    const resolved = path.resolve(abs);
    if (resolved === base) return null;
    if (!resolved.startsWith(base + path.sep)) return null;
    return resolved;
  }

  /**
   * Absolute path of one content basename (filepath, thumbnail, subtitle, staged part).
   * `path.basename` first, so a stored value that still carries a directory prefix cannot
   * escape. Null for an empty name or `.` / `..`.
   */
  function file(name) {
    const base = path.basename(String(name ?? ''));
    if (!base || base === '.' || base === '..') return null;
    return contained(path.join(root(), base));
  }

  /**
   * Absolute path of a relative ref that may include subdirectories (`.history/<id>/<file>`).
   * Each segment is taken as a basename, so `..` cannot climb out of the root.
   */
  function resolveRef(rel) {
    if (rel == null || rel === '') return null;
    const parts = String(rel).replace(/\\/g, '/').split('/').filter(Boolean);
    if (!parts.length) return null;
    const safe = [];
    for (const part of parts) {
      const base = path.basename(part);
      if (!base || base === '.' || base === '..' || base !== part) return null;
      safe.push(base);
    }
    return contained(path.join(root(), ...safe));
  }

  function head(name) {
    const abs = file(name);
    if (!abs) return null;
    try {
      const st = fs.statSync(abs);
      if (!st.isFile()) return null;
      return { size: st.size, mtimeMs: st.mtimeMs, path: abs };
    } catch {
      return null;
    }
  }

  function exists(name) {
    return head(name) !== null;
  }

  /**
   * Read stream of a stored basename. `range.end` is inclusive, matching HTTP Range and
   * fs.createReadStream. The caller receives the stream's own error if the file is missing.
   */
  function getStream(name, range) {
    const abs = file(name);
    if (!abs) {
      const err = new Error('Invalid content name');
      err.code = 'EINVAL';
      throw err;
    }
    const opts = {};
    if (range && Number.isFinite(range.start)) opts.start = range.start;
    if (range && Number.isFinite(range.end)) opts.end = range.end;
    return fs.createReadStream(abs, opts);
  }

  function ensureRoot() {
    fs.mkdirSync(root(), { recursive: true });
    return root();
  }

  /**
   * Put bytes that are already on the local disk at an absolute path inside the root.
   * `move` renames (copy + unlink only across devices). A plain copy never changes mode
   * in a way that fails the copy on exFAT.
   */
  function place(sourcePath, destAbs, { move = false } = {}) {
    const dest = contained(destAbs);
    if (!dest) {
      const err = new Error('Invalid content path');
      err.code = 'EINVAL';
      throw err;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (path.resolve(sourcePath) === dest) return dest;
    if (!move) {
      copyFileBytes(sourcePath, dest);
      return dest;
    }
    try {
      fs.renameSync(sourcePath, dest);
    } catch (e) {
      if (e.code !== 'EXDEV') throw e;
      copyFileBytes(sourcePath, dest);
      fs.unlinkSync(sourcePath);
    }
    return dest;
  }

  /**
   * Move a local file into the root under `name`.
   * overwrite false: when that name is already there, drop the source and keep the
   * existing bytes (mesh dedup — the name is the digest, so the bytes match).
   */
  function put(sourcePath, name, opts = {}) {
    const dest = file(name);
    if (!dest) {
      const err = new Error('Invalid content name');
      err.code = 'EINVAL';
      throw err;
    }
    if (opts.overwrite === false && fs.existsSync(dest)) {
      fs.unlinkSync(sourcePath);
      return dest;
    }
    return place(sourcePath, dest, { move: true });
  }

  /** Copy a local file into the root under `name`. The source is left in place. */
  function copy(sourcePath, name) {
    const dest = file(name);
    if (!dest) {
      const err = new Error('Invalid content name');
      err.code = 'EINVAL';
      throw err;
    }
    return place(sourcePath, dest, { move: false });
  }

  /** Unlink one basename. False when it is already gone or the name is not a content file. */
  function remove(name) {
    const abs = file(name);
    if (!abs) return false;
    try {
      fs.unlinkSync(abs);
      return true;
    } catch (e) {
      if (e.code === 'ENOENT') return false;
      throw e;
    }
  }

  /** Remove a directory under the root (retained `.history/<id>`). Never the root itself. */
  function removeTree(rel) {
    const abs = resolveRef(rel);
    if (!abs) return false;
    fs.rmSync(abs, { recursive: true, force: true });
    return true;
  }

  return {
    kind: 'fs',
    root,
    file,
    resolveRef,
    head,
    exists,
    getStream,
    ensureRoot,
    place,
    put,
    copy,
    remove,
    removeTree,
  };
}

module.exports = { createFilesystemStorage };
