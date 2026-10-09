'use strict';

/*
 * The RustFS quota check can fail open and log "Bucket quota check degraded to allow".
 * Herald still refuses over the plan before PutObject. This flag is how that phrase
 * stops being only a line in the RustFS log.
 */

const PHRASE = 'Bucket quota check degraded to allow';

let quotaDegradedAt = null;
const listeners = new Set();

function noteQuotaDegraded() {
  if (quotaDegradedAt) return quotaDegradedAt;
  quotaDegradedAt = new Date().toISOString();
  console.error(`[storage] ${PHRASE}`);
  for (const fn of listeners) {
    try { fn(quotaDegradedAt); } catch { /* a listener must not break the write that noticed this */ }
  }
  return quotaDegradedAt;
}

/** Restore a flag already stored, without logging it again on every boot. */
function hydrateQuotaDegraded(at) {
  if (!at || quotaDegradedAt) return;
  quotaDegradedAt = String(at);
}

function onQuotaDegraded(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function quotaDegraded() {
  if (!quotaDegradedAt) return { quota_degraded: false };
  return { quota_degraded: true, quota_degraded_at: quotaDegradedAt };
}

function resetQuotaDegraded() {
  quotaDegradedAt = null;
  listeners.clear();
}

module.exports = {
  PHRASE, noteQuotaDegraded, hydrateQuotaDegraded, onQuotaDegraded, quotaDegraded, resetQuotaDegraded,
};
