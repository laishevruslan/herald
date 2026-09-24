/**
 * Same-origin Herald API helpers (mirror frontend-studio/src/api.ts).
 * JWT from dashboard localStorage — or memory token from herald:init (Variant B).
 */

let memoryToken: string | null = null;
let memoryWorkspaceId: string | null = null;
/** Herald CMS origin when Suika runs cross-origin (dev port 6167). Empty = same-origin. */
let apiBase = '';

export function setHeraldAuth(opts: {
  token?: string | null;
  workspaceId?: string | null;
  apiBase?: string | null;
}): void {
  if (opts.token !== undefined) memoryToken = opts.token;
  if (opts.workspaceId !== undefined) memoryWorkspaceId = opts.workspaceId;
  if (opts.apiBase !== undefined) {
    apiBase = String(opts.apiBase || '')
      .trim()
      .replace(/\/$/, '');
  }
}

export function clearHeraldAuth(): void {
  memoryToken = null;
  memoryWorkspaceId = null;
  apiBase = '';
}

export function authHeaders(): HeadersInit {
  const token = memoryToken || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function workspaceHeaders(): HeadersInit {
  let ws = memoryWorkspaceId || localStorage.getItem('workspaceId') || '';
  if (!ws) {
    try {
      ws =
        JSON.parse(localStorage.getItem('user') || 'null')
          ?.current_workspace_id || '';
    } catch {
      /* ignore */
    }
  }
  return ws ? { 'X-Workspace-Id': ws } : {};
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const auth = authHeaders() as Record<string, string>;
  const ws = workspaceHeaders() as Record<string, string>;
  for (const [k, v] of Object.entries({ ...auth, ...ws })) {
    if (!headers.has(k)) headers.set(k, v);
  }
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;
  return fetch(url, { ...init, headers });
}

export type PublishResult = {
  content_id: string;
  width: number;
  height: number;
  draft?: boolean;
  pending_review?: boolean;
};

export async function publishToLibrary(opts: {
  png: Blob;
  scene: object;
  contentId?: string | null;
  preset: string;
  width: number;
  height: number;
  name?: string;
}): Promise<PublishResult> {
  const fd = new FormData();
  fd.append('file', opts.png, opts.name || 'Design.png');
  fd.append('scene_json', JSON.stringify(opts.scene));
  fd.append('preset', opts.preset);
  fd.append('width', String(opts.width));
  fd.append('height', String(opts.height));
  if (opts.name) fd.append('name', opts.name);
  if (opts.contentId) fd.append('content_id', opts.contentId);

  const r = await apiFetch('/api/studio/export', { method: 'POST', body: fd });
  const body = (await r.json().catch(() => ({}))) as PublishResult & {
    error?: string;
  };
  if (!r.ok) throw new Error(body.error || `export ${r.status}`);
  return body;
}

export async function loadDesign(contentId: string): Promise<{
  content_id: string;
  width: number;
  height: number;
  editor?: 'suika' | 'layerhub';
  scene_json: unknown;
}> {
  const r = await apiFetch(`/api/studio/${contentId}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      (body && (body as { error?: string }).error) || `design ${r.status}`,
    );
  }
  return body as {
    content_id: string;
    width: number;
    height: number;
    editor?: 'suika' | 'layerhub';
    scene_json: unknown;
  };
}
