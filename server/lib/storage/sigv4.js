'use strict';

const crypto = require('crypto');

/** AWS SigV4 signing for path-style S3. Payload hash is hex sha256 of the body. */

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function signingKey(secret, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/** Encode a path the way SigV4 requires. Slashes stay; everything else outside the unreserved set is percent-encoded. */
function encodePath(key) {
  return String(key).split('/').map((seg) => encodeSegment(seg)).join('/');
}

function encodeSegment(seg) {
  let out = '';
  for (const ch of seg) {
    if (/[A-Za-z0-9\-_.~]/.test(ch)) out += ch;
    else {
      const buf = Buffer.from(ch, 'utf8');
      for (const b of buf) out += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return out;
}

/** Canonical query string. Empty values are kept (`publicAccessBlock=`). Nulls are omitted. */
function canonicalQuery(query) {
  if (query == null || query === '') return '';
  if (typeof query === 'string') return query;
  const pairs = [];
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    pairs.push([encodeSegment(String(key)), encodeSegment(String(value))]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

function canonicalHeaders(headers) {
  const names = Object.keys(headers).map((n) => n.toLowerCase()).sort();
  const lines = names.map((name) => {
    const raw = headers[Object.keys(headers).find((k) => k.toLowerCase() === name)];
    const value = String(raw).trim().replace(/\s+/g, ' ');
    return `${name}:${value}\n`;
  });
  return { canonical: lines.join(''), signed: names.join(';') };
}

/**
 * @returns {{ authorization: string, amzDate: string, payloadHash: string }}
 */
function sign({
  method, path, query = '', headers, payloadHash, accessKeyId, secretAccessKey, region, service = 's3', now = new Date(),
}) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const all = { ...headers, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash };
  const { canonical, signed } = canonicalHeaders(all);
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    query,
    canonical,
    signed,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secretAccessKey, dateStamp, region, service))
    .update(stringToSign, 'utf8').digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`;
  return { authorization, amzDate, payloadHash };
}

module.exports = { sign, signingKey, sha256Hex, encodePath, canonicalQuery };
