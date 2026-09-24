'use strict';

/*
 * I5: do not show Design editor actions unless the Suika island was built into /suika/.
 * Phase 0 spike ships the island via Docker/scripts; Library wiring opens a new window
 * (full Save-to-Herald bridge is Phase 1).
 *
 * Relies on the server treating an unbuilt /suika/ as a hard 404 (CONTENT_PREFIXES),
 * not an SPA soft-404 of the dashboard.
 */

let cached = null;

/**
 * @returns {Promise<boolean>}
 */
export function suikaIslandAvailable() {
  if (cached != null) return Promise.resolve(cached);
  return fetch('/suika/index.html', { method: 'HEAD', cache: 'no-store' })
    .then((r) => {
      cached = r.ok;
      return cached;
    })
    .catch(() => {
      cached = false;
      return false;
    });
}

/** Test helper — reset memo between tests. */
export function _resetSuikaAvailabilityCache() {
  cached = null;
}
