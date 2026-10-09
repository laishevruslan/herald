'use strict';

/*
 * Object keys for the one bench bucket (step 2).
 *
 * The prefix is the workspace. The content id is in the key, not the sha256, so two rows that
 * happen to share a basename do not share an object: deleting one cannot empty the other.
 * Platform rows (no workspace) live in the same bucket under `platform/` until step 3 gives
 * them `herald-platform`.
 *
 *   ws/<workspaceId>/c/<contentId>/original|thumb|subs
 *   platform/c/<contentId>/original|thumb|subs
 */

const ID_RE = /^[A-Za-z0-9_-]+$/;
const ROLES = Object.freeze({ original: 'original', thumb: 'thumb', subs: 'subs' });

function assertId(value, label) {
  const id = String(value ?? '');
  if (!ID_RE.test(id)) {
    const err = new Error(`Invalid ${label}`);
    err.code = 'EINVAL';
    throw err;
  }
  return id;
}

function objectKey({ workspaceId, contentId, role }) {
  const id = assertId(contentId, 'content id');
  const part = ROLES[role] || ROLES.original;
  const scope = workspaceId == null || workspaceId === ''
    ? 'platform'
    : `ws/${assertId(workspaceId, 'workspace id')}`;
  return `${scope}/c/${id}/${part}`;
}

module.exports = { objectKey, ID_RE, ROLES };
