'use strict';

const crypto = require('crypto');
const { createS3Client } = require('./s3-client');
const { createIam } = require('./iam');
const { redact } = require('./redact');
const {
  orgBucket, platformBucket, workspaceAccessKey, organizationAccessKey,
  workspacePolicyName, organizationPolicyName, workspacePolicy, organizationPolicy,
} = require('./policies');
const { objectKey } = require('./keys');

/*
 * One bucket per organization, one IAM user per workspace, one IAM user per organization.
 * The provisioner creates them. GetObject and PutObject use the workspace user.
 * The organization user is for an explicit copy and for seeing whether the bucket is empty.
 * A repeat call reads the sealed secret and does not mint another one.
 */

function createProvision(env, deps = {}) {
  const iam = deps.iam;
  const seal = deps.seal || require('./seal');
  const makeClient = deps.makeClient || ((accessKeyId, secretAccessKey) => createS3Client({
    endpoint: env.endpoint,
    region: env.region,
    accessKeyId,
    secretAccessKey,
    manageBuckets: false,
  }));
  const buckets = deps.buckets || {
    async ensureBucket(bucket) { await deps.provisioner.ensureBucket(bucket); },
    async blockPublicPolicy(bucket) { await deps.provisioner.putPublicAccessBlock(bucket); },
    async deleteBucket(bucket) { await deps.provisioner.deleteBucket(bucket); },
  };
  const db = () => deps.db || require('../../db/database').db;
  const workspaceClients = new Map();
  const orgClients = new Map();
  const inflight = new Map();
  let platformClient = null;

  function organizationId(workspaceId) {
    const row = db().prepare('SELECT organization_id FROM workspaces WHERE id = ?').get(workspaceId);
    return row && row.organization_id ? row.organization_id : null;
  }

  function principal(scope, column, id) {
    return db().prepare(
      `SELECT id, scope, organization_id, workspace_id, bucket, access_key_id, secret_enc, created_at
         FROM storage_principals WHERE scope = ? AND ${column} = ?`
    ).get(scope, id) || null;
  }

  function insertPrincipal(row) {
    db().prepare(
      `INSERT INTO storage_principals
         (id, scope, organization_id, workspace_id, bucket, access_key_id, secret_enc, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(row.id, row.scope, row.organization_id, row.workspace_id, row.bucket, row.access_key_id, row.secret_enc, row.created_at);
  }

  function secretOf(row, label) {
    const secret = seal.decrypt(row.secret_enc);
    if (!secret) {
      const err = new Error(`Stored ${label} key cannot be unsealed`);
      err.code = 'EACCES';
      throw err;
    }
    return secret;
  }

  async function quotaBytes(organizationId) {
    if (deps.quotaBytes) return deps.quotaBytes(organizationId);
    try {
      const plan = require('../../middleware/subscription').planForOrganization(organizationId);
      if (!plan) return undefined;
      if (plan.max_storage_mb === -1) return null;
      const bytes = Number(plan.max_storage_mb) * 1024 * 1024;
      return Number.isFinite(bytes) && bytes >= 0 ? Math.floor(bytes) : undefined;
    } catch (e) {
      console.error(`[storage] quota lookup failed: ${redact(e && e.message)}`);
      return undefined;
    }
  }

  async function applyQuota(bucket, organizationId) {
    const bytes = await quotaBytes(organizationId);
    if (bytes === undefined) return;
    if (bytes == null) await iam.clearQuota(bucket);
    else await iam.setQuota(bucket, bytes);
  }

  async function mintUser({ accessKey, policyName, document }) {
    const secretKey = crypto.randomBytes(32).toString('base64url');
    try {
      const created = await iam.putUser(accessKey, secretKey);
      if (created.exists) {
        await iam.deleteUser(accessKey);
        await iam.putUser(accessKey, secretKey);
      }
      await iam.putPolicy(policyName, document);
      await iam.attachPolicy(policyName, accessKey);
      return secretKey;
    } catch (e) {
      if (e && e.message) e.message = redact(e.message);
      if (e && e.body) e.body = redact(e.body);
      throw e;
    }
  }

  async function openOrganization(organizationId) {
    const cached = orgClients.get(organizationId);
    if (cached) return cached;
    const bucket = orgBucket(organizationId);
    await buckets.ensureBucket(bucket);
    await buckets.blockPublicPolicy(bucket);
    await applyQuota(bucket, organizationId);
    let row = principal('organization', 'organization_id', organizationId);
    let secret;
    if (row) secret = secretOf(row, 'organization');
    else {
      const accessKey = organizationAccessKey(organizationId);
      secret = await mintUser({
        accessKey,
        policyName: organizationPolicyName(organizationId),
        document: organizationPolicy(bucket),
      });
      row = {
        id: crypto.randomUUID(),
        scope: 'organization',
        organization_id: organizationId,
        workspace_id: null,
        bucket,
        access_key_id: accessKey,
        secret_enc: seal.encrypt(secret),
        created_at: Math.floor(Date.now() / 1000),
      };
      insertPrincipal(row);
    }
    const client = makeClient(row.access_key_id, secret);
    const opened = { bucket, client, accessKeyId: row.access_key_id };
    orgClients.set(organizationId, opened);
    return opened;
  }

  async function ensureWorkspace(workspaceId) {
    const cached = workspaceClients.get(workspaceId);
    if (cached) return cached;
    const orgId = organizationId(workspaceId);
    if (!orgId) {
      const err = new Error('Workspace has no organization');
      err.code = 'EINVAL';
      throw err;
    }
    const org = await openOrganization(orgId);
    let row = principal('workspace', 'workspace_id', workspaceId);
    let secret;
    if (row) secret = secretOf(row, 'workspace');
    else {
      const accessKey = workspaceAccessKey(workspaceId);
      secret = await mintUser({
        accessKey,
        policyName: workspacePolicyName(workspaceId),
        document: workspacePolicy(org.bucket, workspaceId),
      });
      row = {
        id: crypto.randomUUID(),
        scope: 'workspace',
        organization_id: orgId,
        workspace_id: workspaceId,
        bucket: org.bucket,
        access_key_id: accessKey,
        secret_enc: seal.encrypt(secret),
        created_at: Math.floor(Date.now() / 1000),
      };
      insertPrincipal(row);
    }
    const client = makeClient(row.access_key_id, secret);
    const opened = { bucket: org.bucket, client, accessKeyId: row.access_key_id, organizationId: orgId };
    workspaceClients.set(workspaceId, opened);
    return opened;
  }

  function organization(organizationId) {
    if (!organizationId) {
      const err = new Error('Organization id is required');
      err.code = 'EINVAL';
      throw err;
    }
    if (orgClients.has(organizationId)) return Promise.resolve(orgClients.get(organizationId));
    const key = `org:${organizationId}`;
    if (inflight.has(key)) return inflight.get(key);
    const job = openOrganization(organizationId).finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  }

  function workspace(workspaceId) {
    if (workspaceClients.has(workspaceId)) return Promise.resolve(workspaceClients.get(workspaceId));
    const key = `ws:${workspaceId}`;
    if (inflight.has(key)) return inflight.get(key);
    const job = ensureWorkspace(workspaceId).finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  }

  async function platform() {
    if (platformClient) return platformClient;
    const bucket = platformBucket();
    await buckets.ensureBucket(bucket);
    await buckets.blockPublicPolicy(bucket);
    const client = makeClient(env.platformAccessKey, env.platformSecret);
    platformClient = { bucket, client, accessKeyId: env.platformAccessKey };
    return platformClient;
  }

  async function copyWithinOrganization({ fromWorkspaceId, toWorkspaceId, fromContentId, toContentId }) {
    if (!fromWorkspaceId || !toWorkspaceId || !fromContentId || !toContentId) {
      const err = new Error('Copy needs a source and a destination');
      err.code = 'EINVAL';
      throw err;
    }
    if (fromWorkspaceId === toWorkspaceId && fromContentId === toContentId) {
      const err = new Error('Copy needs a different row');
      err.code = 'EINVAL';
      throw err;
    }
    const fromOrg = organizationId(fromWorkspaceId);
    const toOrg = organizationId(toWorkspaceId);
    if (!fromOrg || fromOrg !== toOrg) {
      const err = new Error('Object copy stays inside one organization');
      err.code = 'EINVAL';
      throw err;
    }
    const org = await openOrganization(fromOrg);
    const copied = [];
    for (const role of ['original', 'thumb', 'subs']) {
      const fromKey = objectKey({ workspaceId: fromWorkspaceId, contentId: fromContentId, role });
      const toKey = objectKey({ workspaceId: toWorkspaceId, contentId: toContentId, role });
      try {
        await org.client.copyObject({ bucket: org.bucket, fromKey, toKey });
        copied.push(toKey);
      } catch (e) {
        if (role !== 'original' && e && e.status === 404) continue;
        throw e;
      }
    }
    return { bucket: org.bucket, keys: copied, accessKeyId: org.accessKeyId };
  }

  async function releaseWorkspace(workspaceId) {
    workspaceClients.delete(workspaceId);
    const row = principal('workspace', 'workspace_id', workspaceId);
    const accessKey = row ? row.access_key_id : workspaceAccessKey(workspaceId);
    try { await iam.deleteUser(accessKey); }
    catch (e) { console.error(`[storage] remove workspace user failed: ${redact(e && e.message)}`); }
    db().prepare("DELETE FROM storage_principals WHERE scope = 'workspace' AND workspace_id = ?").run(workspaceId);
  }

  async function releaseOrganization(organizationId, workspaceIds) {
    for (const id of workspaceIds || []) {
      try { await releaseWorkspace(id); }
      catch (e) { console.error(`[storage] release workspace failed: ${redact(e && e.message)}`); }
    }
    const row = principal('organization', 'organization_id', organizationId);
    if (!row) return { bucketDeleted: false };
    let occupied = true;
    try {
      const secret = secretOf(row, 'organization');
      const client = orgClients.get(organizationId)
        ? orgClients.get(organizationId).client
        : makeClient(row.access_key_id, secret);
      occupied = await client.listHasObjects({ bucket: row.bucket });
    } catch (e) {
      console.error(`[storage] organization ${organizationId} listing failed: ${redact(e && e.message)}`);
      return { bucketDeleted: false };
    }
    if (occupied) {
      console.error(`[storage] organization ${organizationId} bucket still has objects; the organization key stays`);
      return { bucketDeleted: false };
    }
    await buckets.deleteBucket(row.bucket);
    try { await iam.deleteUser(row.access_key_id); }
    catch (e) { console.error(`[storage] remove organization user failed: ${redact(e && e.message)}`); }
    db().prepare("DELETE FROM storage_principals WHERE scope = 'organization' AND organization_id = ?").run(organizationId);
    orgClients.delete(organizationId);
    return { bucketDeleted: true };
  }

  return {
    workspace, platform, organization, copyWithinOrganization, releaseWorkspace, releaseOrganization,
    location(workspaceId, contentId) {
      const storageKey = objectKey({ workspaceId, contentId, role: 'original' });
      if (workspaceId == null || workspaceId === '') return { bucket: platformBucket(), storageKey };
      const orgId = organizationId(workspaceId);
      if (!orgId) return null;
      return { bucket: orgBucket(orgId), storageKey };
    },
  };
}

function liveProvision(env) {
  const provisioner = createS3Client({
    endpoint: env.endpoint,
    region: env.region,
    accessKeyId: env.provisionerAccessKey,
    secretAccessKey: env.provisionerSecret,
  });
  return createProvision(env, {
    iam: createIam(provisioner),
    provisioner,
    buckets: {
      ensureBucket: (bucket) => provisioner.ensureBucket(bucket),
      blockPublicPolicy: (bucket) => provisioner.putPublicAccessBlock(bucket),
      deleteBucket: (bucket) => provisioner.deleteBucket(bucket),
    },
  });
}

module.exports = { createProvision, liveProvision };
