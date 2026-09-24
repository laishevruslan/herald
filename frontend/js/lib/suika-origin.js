/**
 * Dev Variant B: optional cross-origin Suika base (e.g. http://127.0.0.1:6167).
 * Production same-origin uses '' so paths stay relative (/suika/…).
 *
 * Set before opening the editor:
 *   window.__SUIKA_ORIGIN = 'http://127.0.0.1:6167';
 */
export function getSuikaOrigin() {
  try {
    const raw = (typeof window !== 'undefined' && window.__SUIKA_ORIGIN) || '';
    const s = String(raw).trim().replace(/\/$/, '');
    if (!s) return '';
    // Only http(s) absolute origins — never accept path-only or javascript:
    if (!/^https?:\/\//i.test(s)) return '';
    return s;
  } catch {
    return '';
  }
}

/** Absolute Suika island URL or same-origin path starting with /suika/. */
export function buildSuikaEditorUrl(searchParams) {
  const q = searchParams instanceof URLSearchParams
    ? searchParams.toString()
    : String(searchParams || '');
  const origin = getSuikaOrigin();
  const path = `/suika/${q ? `?${q}` : ''}`;
  return origin ? `${origin}${path}` : path;
}

/** Target origin for postMessage when opener talks to a cross-origin Suika popup. */
export function getSuikaPostMessageTarget() {
  const origin = getSuikaOrigin();
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
}
