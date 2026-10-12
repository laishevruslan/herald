'use strict';

/*
 * Template packages: parse, validate, canonicalise, pack. Pure — no database, no disk.
 *
 * ⚠️ A PACKAGE IS UNTRUSTED BYTES UNTIL signing.js SAYS OTHERWISE, and this module assumes the
 * worst of every one: it runs before any signature check, on input anyone can upload.
 *
 * ⚠️ WHY JSON AND NOT A ZIP. The community proposal said "a zip", and a zip is what authors will
 * hand us — scripts/template-catalog.js packs a folder or a zip into this format. But the file a
 * SERVER parses is one JSON document: no central directory that disagrees with the local headers,
 * no symlink entries, no compression ratio to bomb, no path-in-archive to slip. The whole attack
 * surface is JSON.parse behind a byte cap plus the path and size checks below. A second benefit:
 * canonical JSON is deterministic, so CI can rebuild a published package from source and prove the
 * signed bytes are the reviewed bytes (catalog/README.md "Reproducible").
 *
 * Envelope (the file on disk / on the wire):
 *   { "format": "luminascreen-template/1", "package": "<base64 canonical bytes>",
 *     "signature": { "key_id": "<16 hex>", "sig": "<base64>" } | null }
 * Canonical package bytes: JSON with keys sorted at every depth and no whitespace, of
 *   { "manifest": {...}, "files": { "<path>": "<base64>" } }
 * A package's IDENTITY is sha256(canonical bytes) — not of the envelope — so signing, or
 * re-signing under a rotated key, never changes which package it is.
 */

const crypto = require('crypto');

const FORMAT = 'luminascreen-template/1';

/*
 * Two budgets. Everything a document INLINES (html, css, js, images, fonts) shares the small one,
 * because it is re-emitted into every render. Large BINARY ASSETS (WebAssembly, game data, 3D
 * models) are never inlined — they are served by URL from /api/templates/asset/<sha>/ and fetched
 * by the template — so they get their own, larger budget. Only html templates may carry them.
 */
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;             // inlined files, all together
const MAX_FILE_BYTES = 1024 * 1024;                  // one inlined file
const MAX_ASSET_FILE_BYTES = 16 * 1024 * 1024;       // one binary asset
const MAX_PACKAGE_BYTES = 24 * 1024 * 1024;          // everything
const MAX_ENVELOPE_BYTES = Math.ceil(MAX_PACKAGE_BYTES * 4 / 3) + 2 * 1024 * 1024;   // base64 + slack
const MAX_FILES = 64;
const MAX_PARAMS = 40;
const MAX_TAGS = 12;
const MAX_NETWORK = 8;
// A translation file is a few strings. Well under the 1 MB per-file cap, so an oversized locales
// file is refused as a locale file and not as a package file.
const MAX_LOCALE_FILE_BYTES = 64 * 1024;

const ID_RE = /^[a-z][a-z0-9-]{1,63}$/;
const SEMVER_RE = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const PARAM_RE = /^[a-z][a-z0-9_]{0,39}$/;
const SEGMENT = '[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,63}';
const PATH_RE = new RegExp(`^${SEGMENT}(?:/${SEGMENT}){0,3}$`);
// A bare hostname (optionally *.wildcard), lower-case. No scheme, port, path or IP literal: a
// template declares WHICH SITES it talks to, and the CSP builder adds https:// itself.
const HOST_RE = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/*
 * ⚠️ THE CATALOG'S LICENCE RULE IS NOT ENFORCED HERE. What the official catalog will LIST (no
 * GPL/AGPL — the project's licence position) is checked by `template-catalog.js build`, because it
 * is a rule about what WE redistribute. A server importing a template for its own use may run
 * whatever licence its owner accepts; this module only insists the licence is named.
 */
const SPDX_ALLOWED = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'CC0-1.0', 'Unlicense']);
const SPDX_RE = /^[A-Za-z0-9][A-Za-z0-9.+-]{1,39}$/;

// Dashboard languages except English, which is the manifest itself. A locales/en.json or a
// language the dashboard cannot show is the same refusal as a misplaced file.
const LOCALE_LANGS = new Set(['de', 'nl', 'fr', 'es', 'pt', 'it', 'ja', 'zh', 'hi', 'ru']);
const LOCALE_PATH_RE = /^locales\/([a-z]{2})\.json$/;
const LOCALE_TOP_KEYS = new Set(['name', 'description', 'params']);
const LOCALE_PARAM_KEYS = new Set(['label', 'help', 'default', 'options']);
// C0/C1 controls, bidi overrides, and zero-width / BOM characters. Newlines are controls too;
// a textarea default is allowed to keep \n and \t, and nothing else here is.
const CONTROL_RE = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/;
const TEXTAREA_BAD_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/;

const KINDS = new Set(['slide', 'html']);
const PARAM_TYPES = new Set(['text', 'textarea', 'color', 'number', 'select', 'image', 'timezone', 'locale', 'data_source', 'checkbox']);
const ORIENTATIONS = new Set(['landscape', 'portrait']);

const EXT_TYPES = Object.freeze({
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/markdown',
  // Binary assets: served by URL, never inlined (see the budgets above).
  '.wasm': 'application/wasm', '.wad': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
});
const BINARY_ASSET_EXTS = new Set(['.wasm', '.wad', '.bin', '.glb']);
const isBinaryAsset = (p) => BINARY_ASSET_EXTS.has(extOf(p));
const ROOT_EXTRAS = new Set(['LICENSE', 'LICENCE', 'NOTICE']);

class PackageError extends Error {
  constructor(message) { super(message); this.name = 'PackageError'; this.status = 400; }
}
const fail = (m) => { throw new PackageError(m); };

function extOf(p) {
  const base = p.slice(p.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

function mimeFor(p) {
  return EXT_TYPES[extOf(p)] || (ROOT_EXTRAS.has(p) ? 'text/plain' : null);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}

/*
 * Canonical JSON: sorted keys at every depth, no whitespace. Only the shapes JSON itself can carry
 * are accepted — a non-finite number or an undefined would serialise differently on the signer and
 * the verifier, and a signature over "whatever this happens to stringify to" is not a signature.
 */
function canonicalJson(v) {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) fail('non-finite number in package');
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (isPlainObject(v)) {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  }
  fail('unsupported value in package');
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/* Strict base64: the alphabet, correct padding, and a round trip. Buffer.from(…,'base64') on its
 * own silently skips junk characters, so two different strings would decode to the same bytes. */
// ⚠️ NO GROUPED REPETITION: `(?:[A-Za-z0-9+/]{4})*` over an 8 MB string overflowed V8's regex
// stack with a RangeError instead of failing cleanly. A flat character class plus arithmetic.
const B64_CHARS_RE = /^[A-Za-z0-9+/]*={0,2}$/;
function strictBase64(s, what) {
  if (typeof s !== 'string' || s.length % 4 !== 0 || !B64_CHARS_RE.test(s)) fail(`${what} is not valid base64`);
  const buf = Buffer.from(s, 'base64');
  if (buf.toString('base64') !== s) fail(`${what} is not canonical base64`);
  return buf;
}

function str(v, max, what, { required = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) fail(`manifest.${what} is required`);
    return '';
  }
  if (typeof v !== 'string') fail(`manifest.${what} must be a string`);
  // Control characters are refused rather than stripped: a name is shown in the dashboard and a
  // stray U+202E (right-to-left override) is how "evil.exe" is dressed up as "exe.live".
  if (/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/.test(v)) fail(`manifest.${what} contains control characters`);
  if (v.length > max) fail(`manifest.${what} is too long (max ${max})`);
  return v;
}

function validateParam(p, i, kind) {
  if (!isPlainObject(p)) fail(`params[${i}] must be an object`);
  const name = p.name;
  if (typeof name !== 'string' || !PARAM_RE.test(name)) fail(`params[${i}].name is invalid`);
  if (!PARAM_TYPES.has(p.type)) fail(`params[${i}].type "${String(p.type).slice(0, 20)}" is not a known type`);
  const out = {
    name,
    type: p.type,
    label: str(p.label || name, 80, `params[${i}].label`),
    help: str(p.help, 200, `params[${i}].help`),
    required: p.required === true,
  };
  if (p.type === 'select') {
    if (!Array.isArray(p.options) || !p.options.length || p.options.length > 50) fail(`params[${i}].options must be 1-50 entries`);
    out.options = p.options.map((o, j) => {
      const v = isPlainObject(o) ? o.value : o;
      const label = isPlainObject(o) ? o.label : o;
      if (typeof v !== 'string' || !v.length || v.length > 80) fail(`params[${i}].options[${j}] is invalid`);
      return { value: v, label: str(label == null ? v : String(label), 80, `params[${i}].options[${j}].label`) };
    });
  }
  if (p.type === 'text' || p.type === 'textarea') {
    const max = p.max === undefined ? (p.type === 'text' ? 200 : 2000) : Number(p.max);
    if (!Number.isInteger(max) || max < 1 || max > 2000) fail(`params[${i}].max must be 1-2000`);
    out.max = max;
  }
  if (p.type === 'number') {
    for (const k of ['min', 'max', 'step']) {
      if (p[k] !== undefined) {
        if (typeof p[k] !== 'number' || !Number.isFinite(p[k]) || Math.abs(p[k]) > 1e9) fail(`params[${i}].${k} must be a number`);
        out[k] = p[k];
      }
    }
  }
  if (p.default !== undefined) {
    // The default passes the same checks as an operator's value (params.js), which is where the
    // per-type rules live; here only its shape is bounded.
    if (!['string', 'number', 'boolean'].includes(typeof p.default)) fail(`params[${i}].default must be a scalar`);
    if (typeof p.default === 'string' && p.default.length > 2000) fail(`params[${i}].default is too long`);
    if (typeof p.default === 'number' && !Number.isFinite(p.default)) fail(`params[${i}].default must be finite`);
    out.default = p.default;
  }
  return out;
}

/**
 * Validate a manifest object and return a normalised copy containing only known keys.
 * Throws PackageError. `files` (the decoded file map) is used to check references.
 */
function validateManifest(m, files) {
  if (!isPlainObject(m)) fail('manifest must be an object');
  const id = m.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) fail('manifest.id must match ^[a-z][a-z0-9-]{1,63}$');
  if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) fail('manifest.version must be x.y.z');
  if (!KINDS.has(m.kind)) fail('manifest.kind must be "slide" or "html"');
  const kind = m.kind;
  const entry = m.entry === undefined ? (kind === 'html' ? 'index.html' : 'template.json') : m.entry;
  if (typeof entry !== 'string' || !PATH_RE.test(entry)) fail('manifest.entry is invalid');
  if (kind === 'html' && extOf(entry) !== '.html') fail('an html template entry must be a .html file');
  if (kind === 'slide' && extOf(entry) !== '.json') fail('a slide template entry must be a .json file');
  if (files && !Object.prototype.hasOwnProperty.call(files, entry)) fail(`entry "${entry}" is not in the package`);

  const license = str(m.license, 40, 'license', { required: true });
  if (!SPDX_RE.test(license)) fail(`manifest.license "${license}" is not an SPDX licence identifier`);

  let thumbnail = null;
  if (m.thumbnail !== undefined && m.thumbnail !== null) {
    if (typeof m.thumbnail !== 'string' || !PATH_RE.test(m.thumbnail)) fail('manifest.thumbnail is invalid');
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extOf(m.thumbnail))) fail('manifest.thumbnail must be png, jpg or webp');
    if (files && !Object.prototype.hasOwnProperty.call(files, m.thumbnail)) fail('manifest.thumbnail is not in the package');
    thumbnail = m.thumbnail;
  }

  let network = [];
  if (m.network !== undefined) {
    if (!Array.isArray(m.network) || m.network.length > MAX_NETWORK) fail(`manifest.network must be an array of at most ${MAX_NETWORK} hosts`);
    if (kind !== 'html' && m.network.length) fail('only html templates may declare network hosts');
    network = m.network.map((h) => {
      if (typeof h !== 'string' || !HOST_RE.test(h)) fail(`manifest.network host "${String(h).slice(0, 80)}" is not a hostname`);
      return h;
    });
  }

  const tags = m.tags === undefined ? [] : m.tags;
  if (!Array.isArray(tags) || tags.length > MAX_TAGS) fail(`manifest.tags must be at most ${MAX_TAGS} strings`);
  tags.forEach((t, i) => { if (typeof t !== 'string' || !/^[a-z0-9][a-z0-9-]{0,23}$/.test(t)) fail(`manifest.tags[${i}] is invalid`); });

  const orientation = m.orientation === undefined ? ['landscape'] : m.orientation;
  if (!Array.isArray(orientation) || !orientation.length || orientation.some((o) => !ORIENTATIONS.has(o))) {
    fail('manifest.orientation must list landscape and/or portrait');
  }

  const minServer = m.min_server === undefined ? '0.0.0' : m.min_server;
  if (typeof minServer !== 'string' || !SEMVER_RE.test(minServer)) fail('manifest.min_server must be x.y.z');

  const paramsIn = m.params === undefined ? [] : m.params;
  if (!Array.isArray(paramsIn) || paramsIn.length > MAX_PARAMS) fail(`manifest.params must be at most ${MAX_PARAMS} entries`);
  const params = paramsIn.map((p, i) => validateParam(p, i, kind));
  const seen = new Set();
  for (const p of params) {
    if (seen.has(p.name)) fail(`duplicate param "${p.name}"`);
    seen.add(p.name);
  }

  return {
    id,
    name: str(m.name, 80, 'name', { required: true }),
    version: m.version,
    kind,
    description: str(m.description, 500, 'description'),
    author: str(m.author, 80, 'author'),
    homepage: (() => {
      const h = str(m.homepage, 200, 'homepage');
      if (h && !/^https:\/\/[^\s"'<>]+$/.test(h)) fail('manifest.homepage must be an https URL');
      return h;
    })(),
    license,
    tags,
    orientation,
    min_server: minServer,
    entry,
    thumbnail,
    network,
    params,
  };
}

function cleanLocaleParam(file, name, raw, spec) {
  for (const k of Object.keys(raw)) {
    if (!LOCALE_PARAM_KEYS.has(k)) fail(`${file}: params.${name}: unknown key "${String(k).slice(0, 40)}"`);
  }
  const out = {};
  if ('label' in raw) {
    if (typeof raw.label !== 'string') fail(`${file}: params.${name}.label must be a string`);
    if (raw.label.length > 80) fail(`${file}: label is too long (max 80)`);
    if (CONTROL_RE.test(raw.label)) fail(`${file}: label contains control characters`);
    if (raw.label !== '') out.label = raw.label;
  }
  if ('help' in raw) {
    if (typeof raw.help !== 'string') fail(`${file}: params.${name}.help must be a string`);
    if (raw.help.length > 200) fail(`${file}: help is too long (max 200)`);
    if (CONTROL_RE.test(raw.help)) fail(`${file}: help contains control characters`);
    if (raw.help !== '') out.help = raw.help;
  }
  if ('options' in raw) {
    if (spec.type !== 'select') fail(`${file}: only a select param has options`);
    if (!isPlainObject(raw.options)) fail(`${file}: options must be an object keyed by option value`);
    const allowed = new Set((spec.options || []).map((o) => o.value));
    const options = {};
    for (const v of Object.keys(raw.options)) {
      if (!allowed.has(v)) fail(`${file}: "${v}" is not an option value`);
      const lab = raw.options[v];
      if (typeof lab !== 'string') fail(`${file}: options must be an object keyed by option value`);
      if (lab.length > 80) fail(`${file}: too long (max 80)`);
      if (CONTROL_RE.test(lab)) fail(`${file}: contains control characters`);
      if (lab !== '') options[v] = lab;
    }
    if (Object.keys(options).length) out.options = options;
  }
  if ('default' in raw) {
    if (spec.type !== 'text' && spec.type !== 'textarea') fail(`${file}: only a text or textarea param may have a translated default`);
    if (typeof raw.default !== 'string') fail(`${file}: default must be a string`);
    const max = spec.max || (spec.type === 'textarea' ? 2000 : 200);
    if (raw.default.length > max) fail(`${file}: default is too long (max ${max})`);
    const bad = spec.type === 'textarea' ? TEXTAREA_BAD_RE : CONTROL_RE;
    if (bad.test(raw.default)) fail(`${file}: default contains characters that are not allowed`);
    if (raw.default !== '') out.default = raw.default;
  }
  return Object.keys(out).length ? out : null;
}

function cleanLocale(file, obj, manifest) {
  for (const k of Object.keys(obj)) {
    if (!LOCALE_TOP_KEYS.has(k)) fail(`${file}: unknown key "${String(k).slice(0, 40)}"`);
  }
  const out = {};
  if ('name' in obj) {
    if (typeof obj.name !== 'string') fail(`${file}: name must be a string`);
    if (obj.name.length > 80) fail(`${file}: name is too long (max 80)`);
    if (CONTROL_RE.test(obj.name)) fail(`${file}: name contains control characters`);
    if (obj.name !== '') out.name = obj.name;
  }
  if ('description' in obj) {
    if (typeof obj.description !== 'string') fail(`${file}: description must be a string`);
    if (obj.description.length > 500) fail(`${file}: description is too long (max 500)`);
    if (CONTROL_RE.test(obj.description)) fail(`${file}: description contains control characters`);
    if (obj.description !== '') out.description = obj.description;
  }
  if ('params' in obj) {
    if (!isPlainObject(obj.params)) fail(`${file}: params must be an object`);
    const byName = new Map((manifest.params || []).map((p) => [p.name, p]));
    const params = {};
    for (const name of Object.keys(obj.params)) {
      if (!byName.has(name)) fail(`${file}: params."${name}" is not a param of this template`);
      const raw = obj.params[name];
      if (!isPlainObject(raw)) fail(`${file}: params.${name} must be an object`);
      const cleaned = cleanLocaleParam(file, name, raw, byName.get(name));
      if (cleaned) params[name] = cleaned;
    }
    if (Object.keys(params).length) out.params = params;
  }
  return Object.keys(out).length ? out : null;
}

/*
 * locales/<lang>.json beside the manifest. English stays in the manifest, so en is not a locale
 * file, and a language the dashboard does not speak is refused the same way a stray path is.
 * Empty strings and empty objects are dropped; a language left with nothing is omitted.
 */
function parseLocales(files, manifest) {
  const i18n = {};
  for (const p of [...files.keys()].sort()) {
    if (!p.startsWith('locales/')) continue;
    const m = LOCALE_PATH_RE.exec(p);
    if (!m || !LOCALE_LANGS.has(m[1])) fail('only locales/<lang>.json is allowed');
    const buf = files.get(p);
    if (buf.length > MAX_LOCALE_FILE_BYTES) fail(`file "${p.slice(0, 80)}" is larger than ${MAX_LOCALE_FILE_BYTES} bytes`);
    let text = buf.toString('utf8');
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    let obj;
    try { obj = JSON.parse(text); } catch { fail(`${p}: is not valid JSON`); }
    if (!isPlainObject(obj)) fail(`${p}: must be a JSON object`);
    const cleaned = cleanLocale(p, obj, manifest);
    if (cleaned) i18n[m[1]] = cleaned;
  }
  return i18n;
}

/**
 * Decode and validate the canonical package bytes.
 * Returns { manifest, files: Map<path, Buffer>, sha256, i18n }.
 * `lenientLocales` keeps a package whose translation files are bad (an already-installed copy
 * loaded for the screens): the manifest still parses, and i18n is empty rather than throwing.
 */
function parsePackageBytes(bytes, opts) {
  if (!Buffer.isBuffer(bytes)) fail('package bytes must be a buffer');
  if (bytes.length > MAX_ENVELOPE_BYTES) fail('package is too large');
  let obj;
  try { obj = JSON.parse(bytes.toString('utf8')); } catch { fail('package is not valid JSON'); }
  if (!isPlainObject(obj)) fail('package must be an object');
  const keys = Object.keys(obj).sort().join(',');
  if (keys !== 'files,manifest') fail('package must contain exactly "manifest" and "files"');
  // ⚠️ THE BYTES MUST ALREADY BE CANONICAL. Otherwise one package has many encodings, each with
  // its own sha256, and "the index pins this hash" stops meaning "the index pins this package".
  // Compared as BYTES: invalid UTF-8 decodes to U+FFFD, so a string comparison let two different
  // byte sequences (two sha256s) pass as the same canonical package.
  if (!Buffer.from(canonicalJson(obj), 'utf8').equals(bytes)) fail('package bytes are not canonical');
  if (!isPlainObject(obj.files)) fail('package.files must be an object');

  const names = Object.keys(obj.files);
  if (!names.length) fail('package has no files');
  if (names.length > MAX_FILES) fail(`package has more than ${MAX_FILES} files`);
  const files = new Map();
  const lower = new Set();
  let total = 0;
  let totalAll = 0;
  for (const p of names) {
    if (!PATH_RE.test(p) || p.split('/').some((s) => s === '.' || s === '..' || s.startsWith('.'))) fail(`file path "${p.slice(0, 80)}" is not allowed`);
    if (p.includes('/') ? !EXT_TYPES[extOf(p)] : !mimeFor(p)) fail(`file type of "${p.slice(0, 80)}" is not allowed`);
    // Case-insensitive collisions ("Index.html" + "index.html") mean different things on
    // different filesystems; refuse them rather than guess which one a reviewer read.
    const lc = p.toLowerCase();
    if (lower.has(lc)) fail(`duplicate file path (case-insensitive) "${p.slice(0, 80)}"`);
    lower.add(lc);
    const buf = strictBase64(obj.files[p], `file "${p.slice(0, 80)}"`);
    const binary = isBinaryAsset(p);
    const cap = binary ? MAX_ASSET_FILE_BYTES : MAX_FILE_BYTES;
    if (buf.length > cap) fail(`file "${p.slice(0, 80)}" is larger than ${cap} bytes`);
    if (!binary) {
      total += buf.length;
      if (total > MAX_TOTAL_BYTES) fail(`package is larger than ${MAX_TOTAL_BYTES} bytes (not counting binary assets)`);
    }
    totalAll += buf.length;
    if (totalAll > MAX_PACKAGE_BYTES) fail(`package is larger than ${MAX_PACKAGE_BYTES} bytes`);
    files.set(p, buf);
  }
  const fileObj = Object.fromEntries(files);
  const manifest = validateManifest(obj.manifest, fileObj);
  if (manifest.kind !== 'html' && [...files.keys()].some(isBinaryAsset)) fail('only html templates may carry binary assets (.wasm, .wad, .bin, .glb)');
  if (manifest.thumbnail && isBinaryAsset(manifest.thumbnail)) fail('manifest.thumbnail must be an image');
  // The manifest as SHIPPED is what was signed; the normalised copy is what the server uses. A
  // shipped manifest carrying keys this version does not know is refused rather than silently
  // ignored, so a future field with security meaning is never dropped on an older server.
  const known = new Set(['id', 'name', 'version', 'kind', 'description', 'author', 'homepage', 'license', 'tags',
    'orientation', 'min_server', 'entry', 'thumbnail', 'network', 'params']);
  for (const k of Object.keys(obj.manifest)) if (!known.has(k)) fail(`manifest has an unknown key "${k.slice(0, 40)}"`);

  let i18n = {};
  try {
    i18n = parseLocales(files, manifest);
  } catch (e) {
    if (!(opts && opts.lenientLocales)) throw e;
    i18n = {};
  }
  return { manifest, files, sha256: sha256Hex(bytes), i18n };
}

/**
 * Parse a .sttemplate envelope. Returns { packageBytes, signature, manifest, files, sha256 }.
 * Does NOT verify the signature — signing.verifyPackage does, and callers must.
 */
function parseEnvelope(input, opts) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  if (buf.length > MAX_ENVELOPE_BYTES * 2) fail('template file is too large');
  let env;
  try { env = JSON.parse(buf.toString('utf8')); } catch { fail('template file is not valid JSON'); }
  if (!isPlainObject(env)) fail('template file must be an object');
  if (env.format !== FORMAT) fail(`unknown template format (expected ${FORMAT})`);
  for (const k of Object.keys(env)) if (!['format', 'package', 'signature'].includes(k)) fail(`template file has an unknown key "${k.slice(0, 40)}"`);
  const packageBytes = strictBase64(env.package, 'package');
  let signature = null;
  if (env.signature !== undefined && env.signature !== null) {
    const s = env.signature;
    if (!isPlainObject(s) || typeof s.key_id !== 'string' || !/^[0-9a-f]{16}$/.test(s.key_id)) fail('signature.key_id is invalid');
    const sig = strictBase64(s.sig, 'signature');
    if (sig.length !== 64) fail('signature must be 64 bytes');
    signature = { key_id: s.key_id, sig };
  }
  const parsed = parsePackageBytes(packageBytes, opts);
  return { packageBytes, signature, ...parsed };
}

/** Build canonical package bytes from a manifest and a { path: Buffer } map (the author side). */
function buildPackageBytes(manifest, files) {
  const enc = {};
  for (const [p, b] of Object.entries(files)) enc[p] = Buffer.from(b).toString('base64');
  const bytes = Buffer.from(canonicalJson({ manifest, files: enc }), 'utf8');
  parsePackageBytes(bytes);   // the author gets the same errors the server would give
  return bytes;
}

function buildEnvelope(packageBytes, signature = null) {
  return Buffer.from(JSON.stringify({
    format: FORMAT,
    package: packageBytes.toString('base64'),
    signature: signature ? { key_id: signature.key_id, sig: Buffer.from(signature.sig).toString('base64') } : null,
  }, null, 0) + '\n', 'utf8');
}

module.exports = {
  FORMAT, PackageError,
  MAX_TOTAL_BYTES, MAX_FILE_BYTES, MAX_ASSET_FILE_BYTES, MAX_PACKAGE_BYTES, MAX_FILES, MAX_PARAMS, MAX_ENVELOPE_BYTES,
  MAX_LOCALE_FILE_BYTES, LOCALE_LANGS,
  BINARY_ASSET_EXTS, isBinaryAsset, SPDX_RE,
  ID_RE, SEMVER_RE, HOST_RE, PARAM_TYPES, EXT_TYPES, SPDX_ALLOWED,
  canonicalJson, sha256Hex, strictBase64, mimeFor, extOf, isPlainObject,
  validateManifest, parsePackageBytes, parseEnvelope, buildPackageBytes, buildEnvelope,
};
