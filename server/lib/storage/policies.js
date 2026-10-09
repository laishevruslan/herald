'use strict';

/*
 * Bucket names and the IAM documents Herald asks RustFS to store.
 * A workspace key can touch only ws/<id>/. An organization key can touch that
 * organization's bucket and cannot delete it. There is no public principal.
 */

const BUCKET_RE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const ID_RE = /^[A-Za-z0-9_-]+$/;

function assertId(value, label) {
  const id = String(value ?? '');
  if (!ID_RE.test(id)) {
    const err = new Error(`Invalid ${label}`);
    err.code = 'EINVAL';
    throw err;
  }
  return id;
}

function orgBucket(organizationId) {
  const id = assertId(organizationId, 'organization id').toLowerCase();
  const name = `herald-org-${id}`;
  if (!BUCKET_RE.test(name)) {
    const err = new Error('Organization id does not make a DNS-style bucket name');
    err.code = 'EINVAL';
    throw err;
  }
  return name;
}

function platformBucket() {
  return 'herald-platform';
}

function workspaceAccessKey(workspaceId) {
  return `ws-${assertId(workspaceId, 'workspace id')}`;
}

function organizationAccessKey(organizationId) {
  return `org-${assertId(organizationId, 'organization id')}`;
}

function workspacePolicyName(workspaceId) {
  return `herald-ws-${assertId(workspaceId, 'workspace id')}`;
}

function organizationPolicyName(organizationId) {
  return `herald-org-${assertId(organizationId, 'organization id')}`;
}

const OBJECT_ACTIONS = ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:AbortMultipartUpload'];

function workspacePolicy(bucket, workspaceId) {
  const id = assertId(workspaceId, 'workspace id');
  const prefix = `ws/${id}`;
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: OBJECT_ACTIONS.slice(),
        Resource: `arn:aws:s3:::${bucket}/${prefix}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['s3:ListBucket', 's3:GetBucketLocation'],
        Resource: `arn:aws:s3:::${bucket}`,
        Condition: { StringLike: { 's3:prefix': [`${prefix}/*`] } },
      },
    ],
  };
}

/** Data-plane key for every prefix in the organization bucket. DeleteBucket is not included. */
function organizationPolicy(bucket) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: OBJECT_ACTIONS.slice(),
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['s3:ListBucket', 's3:GetBucketLocation'],
        Resource: `arn:aws:s3:::${bucket}`,
      },
    ],
  };
}

function objectArn(bucket, key) {
  return `arn:aws:s3:::${bucket}/${key}`;
}

function bucketArn(bucket) {
  return `arn:aws:s3:::${bucket}`;
}

function wildcard(pattern, value) {
  const re = new RegExp(`^${String(pattern).split('*').map(escapeRegex).join('.*')}$`);
  return re.test(String(value ?? ''));
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function arnMatches(pattern, resource) {
  if (pattern === resource) return true;
  if (String(pattern).endsWith('/*')) return String(resource).startsWith(String(pattern).slice(0, -1));
  return false;
}

function statementAllows(statement, { action, resource, prefix }) {
  if (!statement || statement.Effect !== 'Allow') return false;
  const actions = [].concat(statement.Action || []);
  if (!actions.includes(action)) return false;
  const resources = [].concat(statement.Resource || []);
  if (!resources.some((pattern) => arnMatches(pattern, resource))) return false;
  const like = statement.Condition && statement.Condition.StringLike && statement.Condition.StringLike['s3:prefix'];
  if (like) {
    const patterns = [].concat(like);
    if (!patterns.some((pattern) => wildcard(pattern, prefix))) return false;
  }
  return true;
}

/** Default deny: allowed only when some Allow statement matches. */
function requestAllowed(policy, request) {
  return (policy.Statement || []).some((statement) => statementAllows(statement, request));
}

module.exports = {
  orgBucket,
  platformBucket,
  workspaceAccessKey,
  organizationAccessKey,
  workspacePolicyName,
  organizationPolicyName,
  workspacePolicy,
  organizationPolicy,
  objectArn,
  bucketArn,
  requestAllowed,
};
