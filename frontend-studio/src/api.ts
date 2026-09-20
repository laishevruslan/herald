/** Same-origin JWT the dashboard stores — no second login (D-SC / plan §5.1). */

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function workspaceHeaders(): HeadersInit {
  let ws = localStorage.getItem('workspaceId') || '';
  if (!ws) {
    try {
      ws = JSON.parse(localStorage.getItem('user') || 'null')?.current_workspace_id || '';
    } catch { /* ignore */ }
  }
  return ws ? { 'X-Workspace-Id': ws } : {};
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const auth = authHeaders() as Record<string, string>;
  const ws = workspaceHeaders() as Record<string, string>;
  for (const [k, v] of Object.entries({ ...auth, ...ws })) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return fetch(path, { ...init, headers });
}

export async function fetchImageBlobUrl(contentId: string): Promise<string> {
  const r = await apiFetch(`/api/content/${contentId}/file`);
  if (!r.ok) throw new Error(`image ${contentId}: ${r.status}`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

export type ContentRow = {
  id: string;
  filename: string;
  mime_type: string;
  thumbnail_path?: string | null;
};

export async function listLibraryImages(): Promise<ContentRow[]> {
  const r = await apiFetch('/api/content?type=image&limit=100');
  if (!r.ok) throw new Error(`content list: ${r.status}`);
  return r.json();
}

export async function publishToLibrary(opts: {
  png: Blob;
  scene: object;
  contentId?: string | null;
  preset: string;
  width: number;
  height: number;
  name?: string;
}): Promise<{ content_id: string }> {
  const fd = new FormData();
  fd.append('file', opts.png, opts.name || 'studio-poster.png');
  fd.append('scene_json', JSON.stringify(opts.scene));
  fd.append('preset', opts.preset);
  fd.append('width', String(opts.width));
  fd.append('height', String(opts.height));
  if (opts.name) fd.append('name', opts.name);
  if (opts.contentId) fd.append('content_id', opts.contentId);

  const r = await apiFetch('/api/studio/export', { method: 'POST', body: fd });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `export ${r.status}`);
  return body;
}

export async function loadDesign(contentId: string): Promise<{
  content_id: string;
  width: number;
  height: number;
  scene_json: { version?: number; objects?: SceneObject[] };
}> {
  const r = await apiFetch(`/api/studio/${contentId}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `design ${r.status}`);
  return body;
}

export type SceneObject =
  | {
      type: 'textbox';
      text: string;
      left: number;
      top: number;
      width: number;
      fontSize: number;
      fontWeight?: string | number;
      fill?: string;
      textAlign?: string;
    }
  | {
      type: 'rect';
      left: number;
      top: number;
      width: number;
      height: number;
      fill?: string;
      rx?: number;
      ry?: number;
    }
  | {
      type: 'image';
      contentId: string;
      left: number;
      top: number;
      scaleX: number;
      scaleY: number;
      angle?: number;
    };
