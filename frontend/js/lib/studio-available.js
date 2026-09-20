'use strict';

/*
 * I5: do not show Studio actions unless the island was built into /studio/.
 * Spike 6.0 ships the island source + docker verify; Library wiring is 6.1.
 * Cache the probe for the page lifetime so we do not hammer HEAD on every render.
 */

let cached = null;

/**
 * @returns {Promise<boolean>}
 */
export function studioIslandAvailable() {
  if (cached != null) return Promise.resolve(cached);
  return fetch('/studio/index.html', { method: 'HEAD', cache: 'no-store' })
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
export function _resetStudioAvailabilityCache() {
  cached = null;
}
