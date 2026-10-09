'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/*
 * Seal for storage_principals.secret_enc. The key is STORAGE_SEAL_KEY, or a file created
 * the first time object storage is provisioned — not at every boot, and not the JWT secret.
 * The file sits next to .jwt_secret. Neither the seal nor a tenant secret is written to a log.
 */

const FILE_NAME = '.storage_seal_key';

function sealPath() {
  return path.join(require('../../config').certsDir, FILE_NAME);
}

function material() {
  const fromEnv = process.env.STORAGE_SEAL_KEY;
  if (fromEnv != null && String(fromEnv).trim() !== '') return String(fromEnv).trim();
  const file = sealPath();
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const created = crypto.randomBytes(32).toString('base64url');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, created, { mode: 0o600 });
  return created;
}

let key;
function aesKey() {
  if (!key) key = crypto.createHash('sha256').update(material()).digest();
  return key;
}

function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

function decrypt(blob) {
  if (!blob) return null;
  try {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt, FILE_NAME };
