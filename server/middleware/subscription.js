const { db } = require('../db/database');
const config = require('../config');
const { isSupportSession } = require('../lib/support-access');

const TRIAL_DAYS = 14;

// The ONE way a lapsed trial becomes Free. Used by the lazy path below (getUserPlan) and by the
// nightly sweep (services/trialExpiry.js) so the two can never disagree on what "expired" writes.
//
// Sets plan_id='free', clears trial_started (so a later hand-granted plan is never re-downgraded
// — see the comment in getUserPlan) and stamps trial_expired_at with the moment the trial
// actually ended (trial_started + TRIAL_DAYS), NOT "now": the sweep may run days after the fact
// and the expiry email + the player's "Trial Expired" card both key on this column.
//
// Guarded by the same predicate as getUserPlan so a stray call on a paying / comped / active
// account is a no-op. Returns true when a row was flipped.
// Prepared lazily: some test fixtures build a minimal users table without the trial columns and
// require this module before any migration runs; a module-load prepare would throw there.
let _expireTrialStmt;
const EXPIRE_TRIAL_SQL = `
  UPDATE users
     SET plan_id = 'free',
         trial_expired_at = trial_started + ${TRIAL_DAYS * 86400},
         trial_started = NULL
   WHERE id = ?
     AND trial_started IS NOT NULL
     AND trial_started + ${TRIAL_DAYS * 86400} <= CAST(strftime('%s','now') AS INTEGER)
     AND stripe_subscription_id IS NULL
     AND plan_id = trial_plan
     AND plan_id != 'free'
`;
function expireTrial(userId) {
  if (!_expireTrialStmt) _expireTrialStmt = db.prepare(EXPIRE_TRIAL_SQL);
  return _expireTrialStmt.run(userId).changes === 1;
}

// Ids of every user whose trial has lapsed but who still sits on the trial plan. Same predicate
// as expireTrial; the sweep feeds these back through expireTrial one at a time.
//
// ⚠️ CAST(strftime(...) AS INTEGER): strftime returns TEXT, and in SQLite an INTEGER compares
// LESS THAN any TEXT, so `trial_started + N <= strftime('%s','now')` is ALWAYS true and
// `> strftime(...)` ALWAYS false. Compare against an integer or the predicate lies silently.
let _expiredTrialIdsStmt;
const EXPIRED_TRIAL_IDS_SQL = `
  SELECT id FROM users
   WHERE trial_started IS NOT NULL
     AND trial_started + ${TRIAL_DAYS * 86400} <= CAST(strftime('%s','now') AS INTEGER)
     AND stripe_subscription_id IS NULL
     AND plan_id = trial_plan
     AND plan_id != 'free'
`;
function findExpiredTrialUserIds() {
  if (!_expiredTrialIdsStmt) _expiredTrialIdsStmt = db.prepare(EXPIRED_TRIAL_IDS_SQL);
  return _expiredTrialIdsStmt.all().map(r => r.id);
}

/* ============================ dunning: a PAID subscription that stopped paying ============================
 *
 * Distinct from the trial path above and deliberately so. A trial ends on a clock nobody can pay to
 * stop; a failed payment is a customer who WANTS to pay and whose card did not work. So the first
 * seven days change nothing except what they are told, and only then do they fall to Free.
 *
 * ⚠️ The players are never touched by any of this. Degrading a paying customer's SCREENS over a
 * card problem turns a billing hiccup into a dark shopfront; falling to Free applies the Free
 * limits, exactly as an expired trial already does, and nothing else.
 *
 * ⚠️ CAST(strftime('%s','now') AS INTEGER) — same trap as the trial predicate above: strftime
 * returns TEXT and SQLite sorts every INTEGER below every TEXT, so an un-cast comparison is
 * silently always-true or always-false.
 */
const GRACE_DAYS = Math.max(0, Number(process.env.BILLING_GRACE_DAYS) || 7);

// Start the clock, once. `past_due_since IS NULL` makes a repeated failed invoice — Stripe retries
// several times per episode — leave the ORIGINAL failure time alone, which is what the grace is
// measured from. Returns true only for the first one.
let _startGraceStmt;
function startGrace(userId, atSec = Math.floor(Date.now() / 1000)) {
  if (!_startGraceStmt) _startGraceStmt = db.prepare(`
    UPDATE users SET past_due_since = ?, subscription_status = 'past_due'
     WHERE id = ? AND past_due_since IS NULL`);
  return _startGraceStmt.run(atSec, userId).changes === 1;
}

// A payment went through (or the subscription is active again): forget the episode entirely,
// including the email stamps, so a future lapse months from now is announced rather than silent.
let _clearGraceStmt;
function clearGrace(userId) {
  if (!_clearGraceStmt) _clearGraceStmt = db.prepare(`
    UPDATE users
       SET past_due_since = NULL, payment_failed_email_sent_at = NULL,
           subscription_lapsed_email_sent_at = NULL, subscription_status = 'active'
     WHERE id = ? AND past_due_since IS NOT NULL`);
  return _clearGraceStmt.run(userId).changes === 1;
}

// Ids of subscribers whose grace has run out and who are still on a paid plan. Same predicate as
// downgradeLapsed; the sweep feeds these back through it one at a time.
let _lapsedIdsStmt;
function findLapsedSubscriberIds() {
  if (!_lapsedIdsStmt) _lapsedIdsStmt = db.prepare(`
    SELECT id FROM users
     WHERE past_due_since IS NOT NULL
       AND past_due_since + ${GRACE_DAYS * 86400} <= CAST(strftime('%s','now') AS INTEGER)
       AND plan_id != 'free'`);
  return _lapsedIdsStmt.all().map(r => r.id);
}

/*
 * Fall to Free. `stripe_subscription_id` is deliberately KEPT: it is how the reconcile finds this
 * account again if the customer fixes their card, and clearing it would orphan a subscription that
 * still exists in Stripe. `customer.subscription.deleted` is the event that clears it, because
 * that is the one that means the subscription is really gone.
 */
let _downgradeLapsedStmt;
function downgradeLapsed(userId) {
  if (!_downgradeLapsedStmt) _downgradeLapsedStmt = db.prepare(`
    UPDATE users SET plan_id = 'free', subscription_status = 'unpaid'
     WHERE id = ?
       AND past_due_since IS NOT NULL
       AND past_due_since + ${GRACE_DAYS * 86400} <= CAST(strftime('%s','now') AS INTEGER)
       AND plan_id != 'free'
       AND plan_comped = 0`);
  return _downgradeLapsedStmt.run(userId).changes === 1;
}

/*
 * The other half of the downgrade, and it was missing.
 *
 * downgradeLapsed() writes plan_id='free'. Recovery therefore has to put the plan BACK — clearing
 * the grace clock and writing subscription_status='active' on its own leaves someone who has just
 * paid sitting on Free limits, which from their side is indistinguishable from not having paid at
 * all. Called from every path that learns the money arrived: the invoice webhook, the subscription
 * webhook, and the daily reconcile.
 *
 * ⚠️ The plan id is CHECKED against the plans table first. A plan_id with no row grants nothing —
 * getUserPlan INNER JOINs plans — so writing an unknown one is strictly worse than leaving them on
 * Free, where at least the limits are real.
 */
function restorePlan(userId, planId) {
  if (!planId) return false;
  const known = db.prepare('SELECT 1 FROM plans WHERE id = ?').get(planId);
  if (!known) {
    console.warn(`[billing] refusing to restore unknown plan '${planId}' for user ${userId}`);
    return false;
  }
  return db.prepare(`
    UPDATE users
       SET plan_id = CASE WHEN plan_comped = 1 THEN plan_id ELSE ? END, subscription_status = 'active', past_due_since = NULL,
           payment_failed_email_sent_at = NULL, subscription_lapsed_email_sent_at = NULL
     WHERE id = ?`).run(planId, userId).changes === 1;
}

/*
 * Which of our plans a Stripe subscription represents.
 *
 * ⚠️ THE BILLED PRICE IS THE AUTHORITY; metadata.plan_id is only the fallback. Checkout stamps
 * subscription metadata ONCE and Stripe never changes it when the billing portal swaps the price —
 * and the portal is where every plan change happens. Metadata-first re-wrote the ORIGINAL plan
 * after every portal upgrade or downgrade, so billing and entitlement drifted apart in both
 * directions. Metadata still answers for a price no plan row knows (a hand-made price in the
 * Stripe dashboard, a plan whose price id was never configured here).
 *
 * planIdFromPrice is the strict half — null unless a plans row carries that price — for callers
 * that may only OVERWRITE a stored plan when Stripe's charge proves it (the reconcile).
 */
function planIdFromPrice(sub) {
  const priceId = sub && sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price
    && sub.items.data[0].price.id;
  if (!priceId) return null;
  const row = db.prepare('SELECT id FROM plans WHERE stripe_price_monthly = ? OR stripe_price_yearly = ?')
    .get(priceId, priceId);
  return row ? row.id : null;
}
function planIdFromSubscription(sub) {
  return planIdFromPrice(sub) || (sub && sub.metadata && sub.metadata.plan_id) || null;
}

function getUserPlan(userId) {
  const user = db.prepare(`
    SELECT u.*, p.name as plan_name, p.display_name as plan_display_name,
           p.max_devices, p.max_storage_mb, p.remote_control, p.remote_url,
           p.priority_support, p.price_monthly, p.price_yearly
    FROM users u
    JOIN plans p ON u.plan_id = p.id
    WHERE u.id = ?
  `).get(userId);

  // No user row (or no joinable plan) — return null so callers treat it as unrestricted
  // (checkDeviceAccess: `if (!plan) return { allowed: true }`). Previously the else branch
  // below dereferenced an undefined `user` ("Cannot set properties of undefined"), which — once
  // a claimed device's reclaim runs checkDeviceAccess — was swallowed by the caller's try/catch
  // and silently dropped the device to the provision-fresh path instead of reclaiming it.
  if (!user) return null;

  // Check if trial has expired
  if (user.trial_started) {
    const trialEnd = user.trial_started + (TRIAL_DAYS * 86400);
    const now = Math.floor(Date.now() / 1000);
    user.trial_active = now < trialEnd;
    user.trial_days_left = Math.max(0, Math.ceil((trialEnd - now) / 86400));
    user.trial_end = trialEnd;

    // Auto-downgrade an EXPIRED trial to free. Keyed on "no real paid subscription"
    // (stripe_subscription_id IS NULL) plus "still on the plan the trial granted"
    // (plan_id === trial_plan) — deliberately NOT on subscription_status.
    //
    // TRAP — do not reintroduce a subscription_status guard here: that column DEFAULTs to
    // 'active' and is only ever changed by Stripe webhook events. A `subscription_status !==
    // 'active'` check is therefore ALWAYS false for trial users who never touch Stripe — the
    // entire population this is meant to catch — so the downgrade never fired and every signup
    // kept Pro free forever.
    //
    // The `plan_id === user.trial_plan` clause is load-bearing: it protects comped / hand-
    // granted plans (e.g. an enterprise plan set manually, where plan_id !== trial_plan) from
    // being silently downgraded. Grandfathered users (trial_started IS NULL) never reach this
    // block at all.
    if (!user.trial_active && !user.stripe_subscription_id && user.plan_id === user.trial_plan && user.plan_name !== 'free') {
      expireTrial(userId);
      // Re-fetch with free plan
      return getUserPlan(userId);
    }
  } else {
    user.trial_active = false;
    user.trial_days_left = 0;
  }

  return user;
}

function getUserDeviceCount(userId) {
  return db.prepare('SELECT COUNT(*) as count FROM devices WHERE user_id = ?').get(userId).count;
}

function getUserStorageMB(userId) {
  const result = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM content WHERE user_id = ?').get(userId);
  return Math.ceil(result.total / (1024 * 1024));
}

/*
 * The storage allowance is the organization's, because that is who the plan bills.
 *
 * Stripe still writes the live plan onto the org owner (`users.plan_id`). `organizations.plan_id`
 * is copied once when the org is created and nothing updates it afterwards, so reading it would
 * freeze a customer on the plan they had the day the org was minted. The owner's row is the same
 * source AI credits already use.
 *
 * Bytes follow the workspace, not the account that pressed upload. A colleague's file, a support
 * upload (`user_id` NULL — there is no users row to point at) and a second workspace of the same
 * org all sit in this sum. A row with no workspace (a platform template) does not: it belongs to
 * nobody's plan. Two workspaces that share one on-disk file still count each row's `file_size`;
 * the shared inode is a disk optimisation, and the allowance has always been a sum of rows.
 */
function organizationIdForWorkspace(workspaceId) {
  if (!workspaceId) return null;
  const row = db.prepare('SELECT organization_id FROM workspaces WHERE id = ?').get(workspaceId);
  return row && row.organization_id ? row.organization_id : null;
}

function planForOrganization(organizationId) {
  if (!organizationId) return null;
  const org = db.prepare('SELECT owner_user_id FROM organizations WHERE id = ?').get(organizationId);
  if (!org || !org.owner_user_id) return null;
  return getUserPlan(org.owner_user_id);
}

function organizationStorageBytes(organizationId) {
  if (!organizationId) return 0;
  const row = db.prepare(`
    SELECT COALESCE(SUM(COALESCE(c.file_size, 0)), 0) AS total
      FROM content c
      JOIN workspaces w ON w.id = c.workspace_id
     WHERE w.organization_id = ?
  `).get(organizationId);
  return Number(row && row.total ? row.total : 0);
}

function getOrganizationStorageMB(organizationId) {
  return Math.ceil(organizationStorageBytes(organizationId) / (1024 * 1024));
}

function storageDecisionForWorkspace(workspaceId) {
  const organizationId = organizationIdForWorkspace(workspaceId);
  if (!organizationId) return { ok: false, reason: 'no_organization' };
  const plan = planForOrganization(organizationId);
  const usedBytes = organizationStorageBytes(organizationId);
  if (!plan) return { ok: false, reason: 'no_plan', organizationId, usedBytes };
  if (plan.max_storage_mb === -1) {
    return { ok: true, unlimited: true, organizationId, plan, usedBytes, roomBytes: null };
  }
  const limitBytes = plan.max_storage_mb * 1024 * 1024;
  return {
    ok: true,
    unlimited: false,
    organizationId,
    plan,
    usedBytes,
    roomBytes: limitBytes - usedBytes,
  };
}

/*
 * What an upload into this workspace may still store.
 *
 * `room === null` with `blocked` clear means the plan is unlimited — including a self-hosted
 * install whose plan is set up that way (`max_storage_mb = -1`). Self-hosting does not itself
 * turn a finite plan into an infinite one.
 *
 * `blocked` means there is no plan to charge. Callers that are about to write bytes must refuse.
 * Callers that only preview a move treat it the way a missing plan was treated before: no number
 * to compare, so they do not invent a limit.
 */
function storageRoomForUpload(workspaceId) {
  const decision = storageDecisionForWorkspace(workspaceId);
  if (!decision.ok) return { blocked: decision.reason || 'no_plan', room: null };
  return {
    blocked: null,
    room: decision.unlimited ? null : decision.roomBytes,
    organizationId: decision.organizationId,
    plan: decision.plan,
  };
}

/**
 * Bytes this workspace's organization may still store, or null when that plan is unlimited
 * or there is no plan to measure. Null is "no ceiling", which is why a write path must use
 * storageRoomForUpload and refuse a blocked (plan-less) organization instead of this helper.
 *
 * ⚠️ EXISTS BECAUSE checkStorageLimit CANNOT DO THIS. That middleware runs before any bytes are
 * seen and can only ask "are you already at the limit", so an organization at 19.9GB of 20GB
 * passes it and then uploads a 500MB file, landing at 20.4GB. Nothing was lying; the size simply
 * was not knowable yet.
 *
 * A resumable upload DECLARES its size before sending anything, which is the one thing a session
 * knows that a stream does not — so the allowance can be enforced up front, before a gigabyte
 * crosses the Pacific to be refused at the end.
 *
 * Returns a possibly NEGATIVE number when the organization is already over (a plan downgrade
 * will do it), so callers see the true shortfall rather than a floor of zero.
 *
 * The argument is a workspace id. The sum is every content row in that workspace's organization.
 */
function storageRoomBytes(workspaceId) {
  const allowance = storageRoomForUpload(workspaceId);
  if (!allowance || allowance.blocked || allowance.room == null) return null;
  return allowance.room;
}

/*
 * Which workspace's organization the Subscription page should display.
 *
 * /api/subscription is mounted without resolveTenancy, so req.workspaceId is empty there.
 * The JWT still carries the workspace the operator switched to. A stale id (they were removed)
 * is dropped, the same way resolveTenancy drops it, and we use the first workspace they can
 * still open. A support session has no billable workspace on this route — its JWT workspace is
 * cleared — so the page stays "not billed" rather than showing a customer's allowance as theirs.
 */
function workspaceIdForStorageView(req) {
  if (!req || !req.user) return null;
  if (req.workspaceId) return req.workspaceId;
  if (isSupportSession(req.user)) return null;
  const tenancy = require('../lib/tenancy');
  const candidate = req.jwtWorkspaceId;
  if (candidate) {
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(candidate);
    if (ws && tenancy.accessContext(req.user.id, req.user.role, ws)) return ws.id;
  }
  const first = tenancy.firstAccessibleWorkspace(req.user.id);
  return first ? first.id : null;
}

function storageSnapshot(req) {
  const workspaceId = workspaceIdForStorageView(req);
  if (workspaceId) {
    const organizationId = organizationIdForWorkspace(workspaceId);
    if (organizationId) {
      const decision = storageDecisionForWorkspace(workspaceId);
      return {
        storage_mb: getOrganizationStorageMB(organizationId),
        storage_limit_mb: decision.ok ? (decision.unlimited ? -1 : decision.plan.max_storage_mb) : null,
        storage_scope: 'organization',
      };
    }
  }
  const userId = req && req.user && req.user.id;
  const plan = userId ? getUserPlan(userId) : null;
  return {
    storage_mb: userId ? getUserStorageMB(userId) : 0,
    storage_limit_mb: plan ? plan.max_storage_mb : -1,
    storage_scope: 'user',
  };
}

// Check if user can add more devices
function checkDeviceLimit(req, res, next) {
  const plan = getUserPlan(req.user.id);
  if (!plan) {
    /*
     * A support session has no `users` row by design, so getUserPlan finds no plan and this
     * refused it — `No plan found`, before a single byte was accepted. Reported from the field
     * on 2026-09-28: signed in through a support token to reproduce a customer's playback
     * problem, uploading content was impossible.
     *
     * Only a support session is let through, NOT every plan-less caller. getUserPlan returns null
     * for two different situations and they deserve opposite answers: a session with no billable
     * account (support), and a real user whose plan_id does not join a plans row — a data fault,
     * where silently granting unlimited storage is the wrong repair. Support sessions are consent
     * -gated, time-boxed and recorded in support_grants, so they are the narrow case.
     */
    if (isSupportSession(req.user)) return next();
    return res.status(403).json({ error: 'No plan found' });
  }

  // -1 means unlimited
  if (plan.max_devices === -1) return next();

  const deviceCount = getUserDeviceCount(req.user.id);
  if (deviceCount >= plan.max_devices) {
    return res.status(403).json({
      error: `Device limit reached (${plan.max_devices} on ${plan.plan_display_name} plan). Upgrade to add more.`,
      code: 'DEVICE_LIMIT',
      current: deviceCount,
      limit: plan.max_devices,
      plan: plan.plan_name
    });
  }
  next();
}

function refuseNoPlan(res) {
  return res.status(403).json({ error: 'No plan found' });
}

function refuseStorage(res, plan, usedMB, organization) {
  const scope = organization ? ' for this organization' : '';
  return res.status(403).json({
    error: `Storage limit reached (${plan.max_storage_mb}MB on ${plan.plan_display_name} plan${scope}). Upgrade for more.`,
    code: 'STORAGE_LIMIT',
    current_mb: usedMB,
    limit_mb: plan.max_storage_mb,
    plan: plan.plan_name,
  });
}

// Check if this upload still fits the organization's plan.
function checkStorageLimit(req, res, next) {
  /*
   * A workspace is the billable scope: the org owner's plan, the sum of every workspace in
   * that org. Support has no users row, so the old "no plan → let them through" made a support
   * session unlimited inside a customer who was already full. Inside a workspace they take the
   * same ceiling as the customer. A missing owner plan is a data fault for them too — letting
   * it through would be the silent unlimited again.
   *
   * No workspace yet: the route itself answers "switch to a workspace", and that answer has to
   * be reachable. A support session with nowhere to land is let through to it (the 2026-09-28
   * field bug was `No plan found` before the route ran). A real account whose plan_id joins no
   * plans row is still refused: that is a broken account, not a support session.
   */
  if (req.workspaceId) {
    const decision = storageDecisionForWorkspace(req.workspaceId);
    if (!decision.ok) return refuseNoPlan(res);
    if (decision.unlimited) return next();
    const usedMB = Math.ceil(decision.usedBytes / (1024 * 1024));
    if (usedMB >= decision.plan.max_storage_mb) return refuseStorage(res, decision.plan, usedMB, true);
    return next();
  }

  const plan = getUserPlan(req.user && req.user.id);
  if (!plan) {
    if (isSupportSession(req.user)) return next();
    return refuseNoPlan(res);
  }
  if (plan.max_storage_mb === -1) return next();
  const usedMB = getUserStorageMB(req.user.id);
  if (usedMB >= plan.max_storage_mb) return refuseStorage(res, plan, usedMB, false);
  next();
}

// Check if user has remote control access
function checkRemoteControl(req, res, next) {
  const plan = getUserPlan(req.user.id);
  if (!plan || !plan.remote_control) {
    return res.status(403).json({
      error: 'Remote control requires Starter plan or above.',
      code: 'FEATURE_LOCKED',
      plan: plan?.plan_name
    });
  }
  next();
}

// Check remote URL feature access
function checkRemoteUrl(req, res, next) {
  const plan = getUserPlan(req.user.id);
  if (!plan || !plan.remote_url) {
    return res.status(403).json({
      error: 'Remote URL content requires Pro plan or above.',
      code: 'FEATURE_LOCKED',
      plan: plan?.plan_name
    });
  }
  next();
}

/*
 * ⚠️ NEVER MOUNTED, and now superseded. This was the only thing in the codebase that looked like
 * subscription enforcement, which is exactly why it was dangerous: it is exported, commented, and
 * wired to nothing, so `past_due` had no effect on anything at all. Enforcement is now the
 * dunning sweep (services/dunning.js) moving a lapsed subscriber to Free, after which the ordinary
 * plan limits apply — one mechanism, the same one an expired trial already uses. Kept only so a
 * self-hosted fork that DID mount it is not broken by its disappearance; do not add it to a route.
 */
function checkActiveSubscription(req, res, next) {
  const plan = getUserPlan(req.user.id);
  if (!plan) return res.status(403).json({ error: 'No plan found' });

  // Free plan is always active
  if (plan.plan_name === 'free') return next();

  // Self-hosted mode doesn't check expiry
  if (config.selfHosted) return next();

  // Check if subscription has expired
  if (plan.subscription_status !== 'active' && plan.subscription_ends && plan.subscription_ends < Math.floor(Date.now() / 1000)) {
    return res.status(403).json({
      error: 'Subscription expired. Please renew to continue.',
      code: 'SUBSCRIPTION_EXPIRED'
    });
  }
  next();
}

module.exports = {
  storageRoomBytes,
  storageRoomForUpload,
  storageSnapshot,
  organizationIdForWorkspace,
  organizationStorageBytes,
  getOrganizationStorageMB,
  TRIAL_DAYS,
  GRACE_DAYS,
  startGrace,
  clearGrace,
  findLapsedSubscriberIds,
  downgradeLapsed,
  restorePlan,
  planIdFromPrice,
  planIdFromSubscription,
  expireTrial,
  findExpiredTrialUserIds,
  getUserPlan,
  getUserDeviceCount,
  getUserStorageMB,
  checkDeviceLimit,
  checkStorageLimit,
  checkRemoteControl,
  checkRemoteUrl,
  checkActiveSubscription
};
