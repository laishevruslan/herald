'use strict';

const { objectKey } = require('./keys');
const { StorageQuotaError } = require('./s3-client');

/**
 * Object adapter. With `provision`, each workspace reads and writes with its own key
 * and the organization key is only used by copyWithinOrganization. With `client` and
 * `bucket` (tests, and only tests), one injected client serves every call.
 */
function createS3Storage(opts) {
  const provision = opts.provision || null;
  const bucket = opts.bucket;
  const client = opts.client || null;
  const pending = new Set();

  async function locate(workspaceId) {
    if (provision) {
      if (workspaceId == null || workspaceId === '') return provision.platform();
      return provision.workspace(workspaceId);
    }
    return { bucket, client };
  }

  function track(p) {
    pending.add(p);
    return p.finally(() => pending.delete(p));
  }

  function keyOf(ref, role) {
    return objectKey({ workspaceId: ref.workspaceId, contentId: ref.contentId, role });
  }

  async function putFile({ workspaceId, contentId, role, sourcePath, contentType, sha256 }) {
    const where = await locate(workspaceId);
    const key = keyOf({ workspaceId, contentId }, role);
    await where.client.putObject({
      bucket: where.bucket,
      key,
      sourcePath,
      contentType,
      metadata: {
        'herald-sha256': sha256 || '',
        'herald-workspace': workspaceId || '',
        'herald-content': contentId,
        'herald-role': role || 'original',
      },
    });
    return { key, bucket: where.bucket };
  }

  async function head(ref) {
    const where = await locate(ref.workspaceId);
    return where.client.headObject({ bucket: where.bucket, key: keyOf(ref, ref.role) });
  }

  async function getStream(ref, range) {
    const where = await locate(ref.workspaceId);
    return where.client.getObject({ bucket: where.bucket, key: keyOf(ref, ref.role), range });
  }

  async function copy(from, to) {
    if (String(from.workspaceId || '') !== String(to.workspaceId || '')) {
      const err = new Error('Cross-workspace copy uses copyWithinOrganization');
      err.code = 'EINVAL';
      throw err;
    }
    const where = await locate(from.workspaceId);
    await where.client.copyObject({
      bucket: where.bucket,
      fromKey: keyOf(from, from.role),
      toKey: keyOf(to, to.role),
    });
  }

  async function copyWithinOrganization(spec) {
    if (!provision) {
      const err = new Error('Cross-workspace copy needs organization keys');
      err.code = 'EINVAL';
      throw err;
    }
    return provision.copyWithinOrganization(spec);
  }

  async function remove(ref) {
    const where = await locate(ref.workspaceId);
    await where.client.deleteObject({ bucket: where.bucket, key: keyOf(ref, ref.role) });
  }

  /** Drop this row's original, thumb and subs. Other rows keep their own keys. */
  function forgetContent(row) {
    if (!row || !row.id) return Promise.resolve(0);
    const ref = { workspaceId: row.workspace_id, contentId: row.id };
    const job = (async () => {
      const where = await locate(ref.workspaceId);
      let failed = 0;
      for (const role of ['original', 'thumb', 'subs']) {
        try { await where.client.deleteObject({ bucket: where.bucket, key: keyOf(ref, role) }); }
        catch (e) {
          failed += 1;
          console.error(`[storage] delete ${role} for ${row.id} failed: ${require('./redact').redact(e && e.message)}`);
        }
      }
      return failed;
    })();
    return track(job);
  }

  function drain() {
    return Promise.all([...pending]);
  }

  async function releaseWorkspace(workspaceId) {
    await drain();
    if (provision) await provision.releaseWorkspace(workspaceId);
  }

  async function releaseOrganization(organizationId, workspaceIds) {
    await drain();
    if (provision) return provision.releaseOrganization(organizationId, workspaceIds);
    return { bucketDeleted: false };
  }

  return {
    kind: 's3',
    bucket: bucket || null,
    putFile,
    head,
    getStream,
    copy,
    copyWithinOrganization,
    remove,
    forgetContent,
    drain,
    releaseWorkspace,
    releaseOrganization,
    provision,
    location(workspaceId, contentId) {
      if (provision) return provision.location(workspaceId, contentId);
      return { bucket, storageKey: keyOf({ workspaceId, contentId }, 'original') };
    },
  };
}

function readS3Env(env = process.env) {
  const endpoint = String(env.RUSTFS_ENDPOINT || '').trim();
  const region = String(env.RUSTFS_REGION || 'us-east-1').trim() || 'us-east-1';
  const provisionerAccessKey = String(env.RUSTFS_PROVISIONER_ACCESS_KEY || '').trim();
  const provisionerSecret = String(env.RUSTFS_PROVISIONER_SECRET_KEY || '').trim();
  const platformAccessKey = String(env.RUSTFS_PLATFORM_ACCESS_KEY || '').trim();
  const platformSecret = String(env.RUSTFS_PLATFORM_SECRET_KEY || '').trim();
  const missing = [];
  if (!endpoint) missing.push('RUSTFS_ENDPOINT');
  if (!provisionerAccessKey) missing.push('RUSTFS_PROVISIONER_ACCESS_KEY');
  if (!provisionerSecret) missing.push('RUSTFS_PROVISIONER_SECRET_KEY');
  if (!platformAccessKey) missing.push('RUSTFS_PLATFORM_ACCESS_KEY');
  if (!platformSecret) missing.push('RUSTFS_PLATFORM_SECRET_KEY');
  if (missing.length) {
    throw new Error(
      `CONTENT_BACKEND=s3 requires ${missing.join(', ')}. `
      + 'The RustFS root key is not a data key. Leave CONTENT_BACKEND unset to keep files on disk.'
    );
  }
  return {
    endpoint, region, provisionerAccessKey, provisionerSecret, platformAccessKey, platformSecret,
  };
}

module.exports = { createS3Storage, readS3Env, StorageQuotaError };
