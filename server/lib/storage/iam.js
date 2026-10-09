'use strict';

const { redact } = require('./redact');

/**
 * RustFS admin API (PUT/DELETE /rustfs/admin/v3/...), signed as S3.
 * The client passed here is the provisioner. It is not used for GetObject or PutObject.
 */
function createIam(client) {
  async function expect(res, ok) {
    if (ok(res.status)) return res;
    const err = new Error(`Object storage admin answered ${res.status}`);
    err.status = res.status;
    err.body = redact(res.body || '').slice(0, 500);
    throw err;
  }

  async function putUser(accessKey, secretKey) {
    const res = await client.admin({
      method: 'PUT',
      path: '/rustfs/admin/v3/add-user',
      query: { accessKey },
      body: { secretKey, status: 'enabled' },
    });
    if (res.status === 409) return { exists: true };
    await expect(res, (status) => status === 200 || status === 204);
    return { exists: false };
  }

  async function deleteUser(accessKey) {
    const res = await client.admin({
      method: 'DELETE',
      path: '/rustfs/admin/v3/remove-user',
      query: { accessKey },
    });
    await expect(res, (status) => status === 200 || status === 204 || status === 404);
  }

  async function putPolicy(name, document) {
    const res = await client.admin({
      method: 'PUT',
      path: '/rustfs/admin/v3/add-canned-policy',
      query: { name },
      body: document,
    });
    await expect(res, (status) => status === 200 || status === 204);
  }

  async function attachPolicy(policyName, accessKey) {
    const res = await client.admin({
      method: 'PUT',
      path: '/rustfs/admin/v3/set-user-or-group-policy',
      query: { policyName, userOrGroup: accessKey, isGroup: 'false' },
    });
    await expect(res, (status) => status === 200 || status === 204);
  }

  async function setQuota(bucket, bytes) {
    const res = await client.admin({
      method: 'PUT',
      path: `/rustfs/admin/v3/quota/${bucket}`,
      body: { quota: bytes, quota_type: 'HARD' },
    });
    await expect(res, (status) => status === 200 || status === 204);
  }

  async function clearQuota(bucket) {
    const res = await client.admin({
      method: 'DELETE',
      path: `/rustfs/admin/v3/quota/${bucket}`,
    });
    await expect(res, (status) => status === 200 || status === 204 || status === 404);
  }

  return { putUser, deleteUser, putPolicy, attachPolicy, setQuota, clearQuota };
}

module.exports = { createIam };
