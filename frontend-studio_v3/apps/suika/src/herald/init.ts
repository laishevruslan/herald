/**
 * Dev Variant B: listen for herald:init from the CMS opener and store JWT in memory.
 */
import { setHeraldAuth } from './api';

export type HeraldInitPayload = {
  source: 'herald';
  type: 'herald:init';
  token?: string;
  workspaceId?: string;
  contentId?: string;
  preset?: string;
  lang?: string;
  paper?: object;
};

/** Opener origin allowed to send herald:init (set from first valid message). */
let parentOrigin: string | null = null;

export function getParentOrigin(): string | null {
  return parentOrigin;
}

export function setParentOrigin(origin: string | null): void {
  parentOrigin = origin;
}

function isHeraldInit(data: unknown): data is HeraldInitPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.source === 'herald' && d.type === 'herald:init';
}

/**
 * Apply auth from herald:init. Returns true if a usable token was stored.
 */
export function applyHeraldInit(
  data: HeraldInitPayload,
  eventOrigin: string,
): boolean {
  parentOrigin = eventOrigin;
  setHeraldAuth({
    token: data.token || null,
    workspaceId: data.workspaceId || null,
    apiBase: eventOrigin,
  });
  return Boolean(data.token);
}

/**
 * Wait briefly for herald:init when localStorage has no JWT (cross-origin popup).
 * Same-origin installs already have token in localStorage — resolves immediately.
 */
export function waitForHeraldInit(opts?: {
  timeoutMs?: number;
}): Promise<HeraldInitPayload | null> {
  const timeoutMs = opts?.timeoutMs ?? 4000;
  if (typeof window === 'undefined') return Promise.resolve(null);
  try {
    if (localStorage.getItem('token')) return Promise.resolve(null);
  } catch {
    /* private mode */
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload: HeraldInitPayload | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(payload);
    };

    const onMessage = (event: MessageEvent) => {
      if (!isHeraldInit(event.data)) return;
      // Only accept from a real opener window.
      if (window.opener && event.source !== window.opener) return;
      applyHeraldInit(event.data, event.origin);
      finish(event.data);
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => finish(null), timeoutMs);
  });
}

/** Keep listening for late herald:init (re-auth / late opener). */
export function installHeraldInitListener(): () => void {
  const onMessage = (event: MessageEvent) => {
    if (!isHeraldInit(event.data)) return;
    if (window.opener && event.source !== window.opener) return;
    applyHeraldInit(event.data, event.origin);
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
