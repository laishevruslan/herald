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

export function getApiBase(): string {
  return apiBase;
}

export function hasHeraldToken(): boolean {
  if (memoryToken) return true;
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
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
  // A replace keeps the library name. The name field is only for a new clip.
  if (opts.name && !opts.contentId) fd.append('name', opts.name);
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

const HEX = /^#[0-9A-Fa-f]{6}$/;

export type BrandKitResponse = {
  color_primary?: string;
  color_secondary?: string;
  color_accent?: string;
  color_bg?: string;
  font_heading?: string;
  font_body?: string;
  logo_content_id?: string | null;
  swatches?: string[];
  source?: string;
};

/** Workspace brand kit. Null on any failure — the canvas keeps its current defaults. */
export async function fetchBrandKit(): Promise<BrandKitResponse | null> {
  try {
    const r = await apiFetch('/api/brand-kit');
    if (!r.ok) return null;
    const body = (await r.json()) as BrandKitResponse;
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export function kitSwatches(kit: BrandKitResponse | null): string[] {
  const raw = Array.isArray(kit?.swatches) ? kit.swatches : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const hex = String(item || '')
      .trim()
      .toUpperCase();
    if (!HEX.test(hex) || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  return out;
}

export type CatalogueFace = {
  script: string;
  suffix: string;
  range: string;
};

export type CatalogueFont = {
  id: string;
  css: string;
  label: string;
  file: string;
  stack: string;
  weights: number[];
  faces?: CatalogueFace[];
};

/** Same catalogue the slide editor reads (`server/lib/slide-fonts.js`). */
export async function fetchSlideFonts(): Promise<CatalogueFont[]> {
  try {
    const r = await apiFetch('/api/widgets/slide-fonts');
    if (!r.ok) return [];
    const body = (await r.json()) as { fonts?: CatalogueFont[] };
    return Array.isArray(body.fonts) ? body.fonts : [];
  } catch {
    return [];
  }
}

export type LibraryImageRow = {
  id: string;
  filename?: string;
  mime_type?: string | null;
  studio_design?: number;
  studio_editor?: string | null;
};

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|mkv|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;

/**
 * Same cut as the slide background picker: an image in this workspace.
 * Widgets live on `/api/widgets`. A sidecar is scene JSON, not a content row.
 */
export function isLibraryImage(
  row: LibraryImageRow,
  excludeId?: string | null,
): boolean {
  if (!row || typeof row.id !== 'string' || !row.id) return false;
  if (excludeId && row.id === excludeId) return false;
  const mime = String(row.mime_type || '');
  if (mime.startsWith('image/')) return true;
  if (
    !mime &&
    !VIDEO_EXT.test(row.filename || '') &&
    !AUDIO_EXT.test(row.filename || '')
  ) {
    return true;
  }
  return false;
}

export async function listLibraryImages(
  excludeId?: string | null,
): Promise<LibraryImageRow[]> {
  const r = await apiFetch('/api/content?type=image&limit=500');
  if (!r.ok) throw new Error(`content ${r.status}`);
  const body = (await r.json()) as
    | LibraryImageRow[]
    | { items?: LibraryImageRow[] };
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(body?.items)
    ? body.items
    : [];
  return rows.filter((row) => isLibraryImage(row, excludeId));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src === 'string' && src.startsWith('data:image/')) {
        resolve(src);
        return;
      }
      reject(new Error('Not an image'));
    };
    reader.onerror = () => reject(reader.error || new Error('Read failed'));
    reader.readAsDataURL(blob);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}

function canvasToJpeg(img: HTMLImageElement, scale: number, quality: number) {
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read that image');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

const EMBED_BUDGET = 900_000;

/**
 * Bytes in the paper, same idea as a local file (data URL). Shrink a large
 * photo so the sidecar stays under the scene size cap. Small rasters stay
 * as they are, including PNG transparency.
 */
export async function imageBlobToDataUrl(
  blob: Blob,
  maxEdge: number,
): Promise<string> {
  const raw = await blobToDataUrl(blob);
  const raster =
    /^data:image\/(png|jpeg|jpg|gif|webp);/i.test(raw) &&
    !/^data:image\/svg/i.test(raw);
  if (raster && raw.length <= EMBED_BUDGET) return raw;

  const img = await decodeImage(raw);
  const edge = Math.max(img.width, img.height) || 1;
  let scale = edge > maxEdge ? maxEdge / edge : 1;
  let quality = 0.86;
  let url = canvasToJpeg(img, scale, quality);
  for (let attempt = 0; attempt < 6 && url.length > EMBED_BUDGET; attempt++) {
    if (quality > 0.52) quality -= 0.12;
    else scale *= 0.75;
    url = canvasToJpeg(img, scale, quality);
  }
  return url;
}

export async function fetchContentBlob(
  contentId: string,
  path: 'file' | 'thumbnail',
): Promise<Blob | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await apiFetch(
      `/api/content/${encodeURIComponent(contentId)}/${path}`,
      { signal: ctrl.signal },
    );
    if (!r.ok) return null;
    const blob = await r.blob();
    if (path === 'file') {
      const mime = blob.type || '';
      if (mime && !mime.startsWith('image/')) return null;
    }
    return blob;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export type WorkspaceTemplateSummary = {
  id: string;
  name: string;
  preset: string;
  updated_at: number;
  has_thumb: boolean;
};

export async function listWorkspaceTemplates(): Promise<
  WorkspaceTemplateSummary[]
> {
  const r = await apiFetch('/api/suika-templates');
  const body = (await r.json().catch(() => ({}))) as {
    templates?: WorkspaceTemplateSummary[];
    error?: string;
  };
  if (!r.ok) throw new Error(body.error || `templates ${r.status}`);
  return Array.isArray(body.templates) ? body.templates : [];
}

export async function fetchWorkspaceTemplate(
  id: string,
): Promise<{ preset: string; paper: unknown }> {
  const r = await apiFetch(`/api/suika-templates/${encodeURIComponent(id)}`);
  const body = (await r.json().catch(() => ({}))) as {
    preset?: string;
    paper?: unknown;
    error?: string;
  };
  if (!r.ok) throw new Error(body.error || `template ${r.status}`);
  return { preset: body.preset || '', paper: body.paper };
}

export async function fetchWorkspaceTemplateThumb(
  id: string,
): Promise<string | null> {
  const r = await apiFetch(
    `/api/suika-templates/${encodeURIComponent(id)}/thumb`,
  );
  if (!r.ok) return null;
  const blob = await r.blob();
  if (!blob.size) return null;
  return URL.createObjectURL(blob);
}

export async function saveWorkspaceTemplate(opts: {
  name: string;
  preset: string;
  paper: object;
  thumb: Blob | null;
}): Promise<{ id: string; name: string; preset: string }> {
  const fd = new FormData();
  fd.append('name', opts.name);
  fd.append('preset', opts.preset);
  fd.append('paper_json', JSON.stringify(opts.paper));
  if (opts.thumb) fd.append('thumb', opts.thumb, 'thumb.jpg');
  const r = await apiFetch('/api/suika-templates', {
    method: 'POST',
    body: fd,
  });
  const body = (await r.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    preset?: string;
    error?: string;
  };
  if (!r.ok || !body.id) throw new Error(body.error || `template ${r.status}`);
  return {
    id: body.id,
    name: body.name || opts.name,
    preset: body.preset || opts.preset,
  };
}

export async function deleteWorkspaceTemplate(id: string): Promise<void> {
  const r = await apiFetch(`/api/suika-templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `template ${r.status}`);
  }
}

export async function embedLibraryImage(
  contentId: string,
  filename: string,
  maxEdge: number,
): Promise<{ url: string; name: string; contentId: string }> {
  const blob = await fetchContentBlob(contentId, 'file');
  if (!blob) throw new Error('Could not read that image');
  const url = await imageBlobToDataUrl(blob, maxEdge);
  return { url, name: filename || 'Image', contentId };
}
