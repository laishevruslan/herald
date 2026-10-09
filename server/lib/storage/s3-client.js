'use strict';

const fs = require('fs');
const { Readable } = require('stream');
const { sign, sha256Hex, encodePath, canonicalQuery } = require('./sigv4');
const { redact } = require('./redact');

const EMPTY_HASH = sha256Hex('');

class StorageQuotaError extends Error {
  constructor(message) {
    super(message || 'Bucket quota exceeded');
    this.name = 'StorageQuotaError';
    this.code = 'STORAGE_LIMIT';
    this.status = 403;
  }
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = require('crypto').createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

function discard(res) {
  const body = res && res.body;
  if (body && typeof body.cancel === 'function') body.cancel().catch(() => {});
}

function isQuotaBody(text) {
  return /QuotaExceeded|Bucket quota exceeded|quota exceeded/i.test(String(text || ''));
}

function watchResponse(res, text) {
  let blob = String(text || '');
  try {
    if (res && res.headers && typeof res.headers.forEach === 'function') {
      res.headers.forEach((value) => { blob += `\n${value}`; });
    }
  } catch { /* a header walk must not hide the storage error */ }
  if (!/Bucket quota check degraded to allow/i.test(blob)) return;
  try { require('./observe').noteQuotaDegraded(); }
  catch { console.error('[storage] Bucket quota check degraded to allow'); }
}

function xmlText(block, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!m) return '';
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseList(xml) {
  const objects = [];
  const re = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = re.exec(xml))) {
    const key = xmlText(match[1], 'Key');
    if (!key) continue;
    const size = Number(xmlText(match[1], 'Size'));
    objects.push({
      key,
      size: Number.isFinite(size) ? size : 0,
      lastModified: xmlText(match[1], 'LastModified'),
    });
  }
  const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
  const token = xmlText(xml, 'NextContinuationToken');
  return { objects, truncated, token: truncated && token ? token : null };
}

/**
 * Path-style S3 client for one RustFS endpoint. Credentials stay in this closure.
 * `fetchImpl` is injectable so tests can answer HTTP without a bucket.
 */
function createS3Client({ endpoint, region, accessKeyId, secretAccessKey, fetchImpl, now, manageBuckets = true }) {
  const base = String(endpoint || '').replace(/\/+$/, '');
  const doFetch = fetchImpl || global.fetch;
  if (!base) throw new Error('RUSTFS_ENDPOINT is required');
  if (typeof doFetch !== 'function') throw new Error('This server cannot call object storage');

  let bucketReady = null;

  async function call({ method, bucket, key, query, headers = {}, body, payloadHash, streamBody, absolutePath }) {
    const path = absolutePath != null
      ? (String(absolutePath).startsWith('/') ? encodePath(absolutePath) : `/${encodePath(absolutePath)}`)
      : (key == null ? `/${encodePath(bucket)}` : `/${encodePath(bucket)}/${encodePath(key)}`);
    const queryString = canonicalQuery(query);
    const host = new URL(base).host;
    const signedHeaders = { host, ...headers };
    const hash = payloadHash || (body ? sha256Hex(body) : EMPTY_HASH);
    const signed = sign({
      method, path, query: queryString, headers: signedHeaders, payloadHash: hash,
      accessKeyId, secretAccessKey, region, now: now ? now() : new Date(),
    });
    const res = await doFetch(`${base}${path}${queryString ? `?${queryString}` : ''}`, {
      method,
      headers: {
        ...headers,
        host,
        'x-amz-date': signed.amzDate,
        'x-amz-content-sha256': hash,
        authorization: signed.authorization,
      },
      body: streamBody || body || undefined,
      duplex: streamBody ? 'half' : undefined,
    });
    watchResponse(res, '');
    return res;
  }

  async function readError(res) {
    let text = '';
    try { text = await res.text(); } catch { text = ''; }
    watchResponse(res, text);
    text = redact(text);
    if (isQuotaBody(text) || isQuotaBody(res.headers.get('x-amz-error-code'))) {
      throw new StorageQuotaError('Bucket quota exceeded');
    }
    const err = new Error(`Object storage answered ${res.status}`);
    err.status = res.status;
    err.body = text.slice(0, 500);
    return err;
  }

  async function ensureBucket(bucket) {
    if (bucketReady) return bucketReady;
    bucketReady = (async () => {
      const head = await call({ method: 'HEAD', bucket, payloadHash: EMPTY_HASH });
      if (head.status === 200 || head.status === 301) { discard(head); return; }
      if (head.status !== 404 && head.status !== 403) throw await readError(head);
      discard(head);
      const created = await call({
        method: 'PUT', bucket, headers: { 'content-length': '0' }, payloadHash: EMPTY_HASH,
      });
      if (created.status !== 200 && created.status !== 409) throw await readError(created);
      discard(created);
    })().catch((e) => { bucketReady = null; throw e; });
    return bucketReady;
  }

  async function putObject({ bucket, key, sourcePath, contentType, metadata }) {
    if (manageBuckets) await ensureBucket(bucket);
    const stat = fs.statSync(sourcePath);
    const payloadHash = await hashFile(sourcePath);
    const headers = {
      'content-type': contentType || 'application/octet-stream',
      'content-length': String(stat.size),
    };
    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        if (v == null || v === '') continue;
        headers[`x-amz-meta-${k}`] = String(v);
      }
      const tags = [];
      if (metadata['herald-content']) tags.push(`herald-content=${encodeURIComponent(metadata['herald-content'])}`);
      if (metadata['herald-role']) tags.push(`herald-role=${encodeURIComponent(metadata['herald-role'])}`);
      if (tags.length) headers['x-amz-tagging'] = tags.join('&');
    }
    const res = await call({
      method: 'PUT', bucket, key, headers, payloadHash,
      streamBody: Readable.toWeb(fs.createReadStream(sourcePath)),
    });
    if (res.status !== 200 && res.status !== 201) throw await readError(res);
    discard(res);
    return { size: stat.size, sha256: payloadHash };
  }

  async function getObject({ bucket, key, range }) {
    const headers = {};
    if (range && Number.isFinite(range.start)) {
      const end = Number.isFinite(range.end) ? range.end : '';
      headers.range = `bytes=${range.start}-${end}`;
    }
    const res = await call({ method: 'GET', bucket, key, headers, payloadHash: EMPTY_HASH });
    if (res.status === 404) { discard(res); return null; }
    if (res.status !== 200 && res.status !== 206) throw await readError(res);
    const stream = res.body && typeof Readable.fromWeb === 'function'
      ? Readable.fromWeb(res.body)
      : Readable.from(Buffer.from(await res.arrayBuffer()));
    return {
      status: res.status,
      size: Number(res.headers.get('content-length')) || null,
      contentRange: res.headers.get('content-range'),
      contentType: res.headers.get('content-type'),
      stream,
    };
  }

  async function headObject({ bucket, key }) {
    const res = await call({ method: 'HEAD', bucket, key, payloadHash: EMPTY_HASH });
    if (res.status === 404) { discard(res); return null; }
    if (res.status !== 200) throw await readError(res);
    const metadata = {};
    res.headers.forEach((value, name) => {
      const key = String(name).toLowerCase();
      if (key.startsWith('x-amz-meta-')) metadata[key.slice('x-amz-meta-'.length)] = value;
    });
    discard(res);
    return {
      size: Number(res.headers.get('content-length')) || 0,
      contentType: res.headers.get('content-type'),
      metadata,
    };
  }

  async function deleteObject({ bucket, key }) {
    const res = await call({ method: 'DELETE', bucket, key, payloadHash: EMPTY_HASH });
    if (res.status === 204 || res.status === 200 || res.status === 404) { discard(res); return; }
    throw await readError(res);
  }

  async function listObjects({ bucket, token, maxKeys = 500 }) {
    const query = { 'list-type': '2', 'max-keys': String(maxKeys) };
    if (token) query['continuation-token'] = token;
    const res = await call({ method: 'GET', bucket, query, payloadHash: EMPTY_HASH });
    if (res.status === 404) { discard(res); return { objects: [], truncated: false, token: null }; }
    if (res.status !== 200) throw await readError(res);
    let text = '';
    try { text = await res.text(); } catch { text = ''; }
    watchResponse(res, text);
    return parseList(text);
  }

  async function listHasObjects({ bucket }) {
    const res = await call({
      method: 'GET', bucket, query: { 'list-type': '2', 'max-keys': '1' }, payloadHash: EMPTY_HASH,
    });
    if (res.status === 404) { discard(res); return false; }
    if (res.status !== 200) throw await readError(res);
    let text = '';
    try { text = await res.text(); } catch { text = ''; }
    return /<Contents>|<CommonPrefixes>/.test(text) || /<KeyCount>\s*[1-9]/.test(text);
  }

  async function deleteBucket(bucket) {
    const res = await call({ method: 'DELETE', bucket, payloadHash: EMPTY_HASH });
    if (res.status === 204 || res.status === 200 || res.status === 404) { discard(res); return; }
    throw await readError(res);
  }

  async function putPublicAccessBlock(bucket) {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>'
      + '<PublicAccessBlockConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
      + '<BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls>'
      + '<BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets>'
      + '</PublicAccessBlockConfiguration>';
    const res = await call({
      method: 'PUT',
      bucket,
      query: { publicAccessBlock: '' },
      headers: { 'content-type': 'application/xml', 'content-length': String(Buffer.byteLength(xml)) },
      body: xml,
      payloadHash: sha256Hex(xml),
    });
    if (res.status !== 200 && res.status !== 204) throw await readError(res);
    discard(res);
  }

  async function admin({ method, path, query, body }) {
    const payload = body == null || body === '' ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
    const headers = {};
    if (payload) headers['content-type'] = 'application/json';
    const res = await call({
      method,
      absolutePath: path,
      query,
      headers,
      body: payload || undefined,
      payloadHash: sha256Hex(payload),
    });
    let text = '';
    try { text = await res.text(); } catch { text = ''; }
    watchResponse(res, text);
    return { status: res.status, body: redact(text) };
  }

  async function copyObject({ bucket, fromKey, toKey }) {
    if (manageBuckets) await ensureBucket(bucket);
    const headers = {
      'x-amz-copy-source': `/${bucket}/${encodePath(fromKey)}`,
      'content-length': '0',
    };
    const res = await call({ method: 'PUT', bucket, key: toKey, headers, payloadHash: EMPTY_HASH });
    if (res.status !== 200) throw await readError(res);
    discard(res);
  }

  return {
    accessKeyId,
    putObject, getObject, headObject, deleteObject, copyObject, ensureBucket,
    listObjects, listHasObjects, deleteBucket, putPublicAccessBlock, admin,
  };
}

module.exports = { createS3Client, StorageQuotaError, isQuotaBody };
