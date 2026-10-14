/**
 * Herald Phase 1/3 Save bridge: PNG + wrapped paper → POST /api/studio/export,
 * then postMessage to opener and close (plan §4.4 / §6.1).
 * Phase 3: slide-bg writes suika.slideBgReturn and returns to /#/slides.
 */
import {
  exportService,
  type IEditorPaperData,
  type SuikaEditor,
} from '@suika/core';

import { authHeaders, publishToLibrary } from './api';
import { warmHeraldFontsForExport } from './fonts';
import { getParentOrigin } from './init';
import { PRESET_SIZE } from './presets';
import { type HeraldPresetId, type HeraldQuery } from './query';
import { wrapSuikaPaper } from './scene';

export type HeraldSession = {
  query: HeraldQuery;
  /** Namespaced localStorage key — never the shared `suika-paper`. */
  paperStoreKey: string;
  contentId: string | null;
};

const SUIKA_SLIDE_BG_KEY = 'suika.slideBgReturn';

let session: HeraldSession | null = null;

export function getHeraldSession(): HeraldSession | null {
  return session;
}

export function setHeraldSession(next: HeraldSession | null): void {
  session = next;
}

export function heraldPaperStoreKey(contentId?: string | null): string {
  return `suika-paper-herald-${contentId || 'new'}`;
}

type SuikaToHerald =
  | { source: 'suika'; type: 'suika:ready'; designId?: string }
  | {
      source: 'suika';
      type: 'herald:saved';
      contentId: string;
      width: number;
      height: number;
      /** False on the first save of a clip. True when the same content row was replaced. */
      replaced?: boolean;
      /** More than 1 when every page was saved as its own clip. */
      pageCount?: number;
    }
  | { source: 'suika'; type: 'herald:error'; message: string }
  | { source: 'suika'; type: 'herald:cancelled' };

function openerTargetOrigin(): string {
  return getParentOrigin() || window.location.origin;
}

export function postToOpener(msg: SuikaToHerald): void {
  if (!window.opener || window.opener.closed) return;
  try {
    window.opener.postMessage(msg, openerTargetOrigin());
  } catch {
    /* opener may be cross-origin or gone */
  }
}

export function notifyReady(designId?: string | null): void {
  postToOpener({
    source: 'suika',
    type: 'suika:ready',
    ...(designId ? { designId } : {}),
  });
}

function designFileName(forSlideBg: boolean): string {
  if (forSlideBg) return 'Slide background.png';
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `Design ${y}-${m}-${day}.png`;
}

function designStem(): string {
  return designFileName(false).replace(/\.png$/i, '');
}

export class HeraldPageEmptyError extends Error {
  readonly pageName: string;

  constructor(pageName: string) {
    super(pageName);
    this.pageName = pageName;
  }
}

function heraldCanvases(editor: SuikaEditor) {
  return editor.doc.graphicsStoreManager
    .getCanvasItems()
    .filter((canvas) => !canvas.isDeleted())
    .sort((a, b) => {
      const aIndex = a.attrs.parentIndex?.position ?? '';
      const bIndex = b.attrs.parentIndex?.position ?? '';
      return aIndex < bIndex ? -1 : aIndex > bIndex ? 1 : 0;
    });
}

function markSlideBgDone(contentId: string): void {
  try {
    const prev = JSON.parse(sessionStorage.getItem(SUIKA_SLIDE_BG_KEY) || '{}');
    sessionStorage.setItem(
      SUIKA_SLIDE_BG_KEY,
      JSON.stringify({
        ...prev,
        contentId,
        done: true,
        pending: false,
      }),
    );
  } catch {
    try {
      sessionStorage.setItem(
        SUIKA_SLIDE_BG_KEY,
        JSON.stringify({ contentId, done: true }),
      );
    } catch {
      /* ignore */
    }
  }
}

function returnToSlides(): void {
  const slidesUrl = `${window.location.origin}/#/slides`;
  try {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = '/#/slides';
      } catch {
        /* cross-origin opener — postMessage already sent; opener applies locally */
      }
      window.setTimeout(() => {
        try {
          window.close();
        } catch {
          /* ignore */
        }
      }, 120);
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.href = slidesUrl;
}

export type SaveToHeraldResult = {
  contentId: string;
  width: number;
  height: number;
  draft?: boolean;
};

/**
 * Export current page PNG + paper sidecar, publish, notify opener, close window.
 */
export async function saveToHerald(
  editor: SuikaEditor,
  opts?: { closeWindow?: boolean },
): Promise<SaveToHeraldResult> {
  const sess = session;
  if (!sess) {
    throw new Error('Not in Herald mode');
  }

  try {
    const auth = authHeaders() as Record<string, string>;
    if (!auth.Authorization) {
      throw new Error('Not signed in to Herald');
    }

    await warmHeraldFontsForExport();
    const png = await exportService.getCurrentPagePNGBlob(editor);
    if (!png) {
      throw new Error('Nothing to export — add shapes on the page first');
    }

    const dims = PRESET_SIZE[sess.query.preset as HeraldPresetId] || {
      width: 1920,
      height: 1080,
    };
    const forSlideBg = sess.query.forSlideBg;
    const current = editor.doc.getCurrentCanvas();
    const existingId =
      sess.contentId || current.attrs.heraldPageContentId || null;
    const replaced = Boolean(existingId);
    if (existingId) current.attrs.heraldPageContentId = existingId;

    const scene = wrapSuikaPaper(
      JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData,
    );
    const result = await publishToLibrary({
      png,
      scene,
      contentId: existingId,
      preset: sess.query.preset,
      width: dims.width,
      height: dims.height,
      name: replaced ? undefined : designFileName(forSlideBg),
    });

    current.attrs.heraldPageContentId = result.content_id;
    sess.contentId = result.content_id;
    session = { ...sess, contentId: result.content_id };
    if (!replaced) {
      const stamped = wrapSuikaPaper(
        JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData,
      );
      await publishToLibrary({
        png,
        scene: stamped,
        contentId: result.content_id,
        preset: sess.query.preset,
        width: dims.width,
        height: dims.height,
      });
    }

    postToOpener({
      source: 'suika',
      type: 'herald:saved',
      contentId: result.content_id,
      width: result.width ?? dims.width,
      height: result.height ?? dims.height,
      replaced,
      pageCount: 1,
    });

    if (forSlideBg) {
      markSlideBgDone(result.content_id);
      returnToSlides();
      return {
        contentId: result.content_id,
        width: result.width ?? dims.width,
        height: result.height ?? dims.height,
        draft: result.draft,
      };
    }

    if (opts?.closeWindow !== false) {
      // Allow the opener to process the message before unload.
      window.setTimeout(() => {
        try {
          window.close();
        } catch {
          /* ignore */
        }
      }, 120);
    }

    return {
      contentId: result.content_id,
      width: result.width ?? dims.width,
      height: result.height ?? dims.height,
      draft: result.draft,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postToOpener({ source: 'suika', type: 'herald:error', message });
    throw err;
  }
}

/**
 * One library clip per canvas page. Does not create a playlist.
 * A page that already has a content id is replaced and keeps its library name.
 * New pages are named "Design YYYY-MM-DD — 1", "— 2", …
 */
export async function saveAllHeraldPages(
  editor: SuikaEditor,
  opts?: { closeWindow?: boolean },
): Promise<SaveToHeraldResult & { pageCount: number }> {
  const sess = session;
  if (!sess) throw new Error('Not in Herald mode');
  const auth = authHeaders() as Record<string, string>;
  if (!auth.Authorization) throw new Error('Not signed in to Herald');

  const canvases = heraldCanvases(editor);
  if (canvases.length === 0) {
    throw new Error('Nothing to export — add shapes on the page first');
  }
  for (const canvas of canvases) {
    const visible = canvas.getChildren().filter((item) => item.isVisible());
    if (visible.length === 0) {
      throw new HeraldPageEmptyError(canvas.attrs.objectName || 'Page');
    }
  }

  const current = editor.doc.getCurrentCanvas();
  const claimed = new Set(
    canvases
      .map((canvas) => canvas.attrs.heraldPageContentId)
      .filter((id): id is string => Boolean(id)),
  );
  if (sess.contentId && !claimed.has(sess.contentId)) {
    current.attrs.heraldPageContentId = sess.contentId;
  }

  await warmHeraldFontsForExport();
  const pngs: Blob[] = [];
  for (const canvas of canvases) {
    const png = await exportService.getCanvasPNGBlob(canvas);
    if (!png) throw new HeraldPageEmptyError(canvas.attrs.objectName || 'Page');
    pngs.push(png);
  }

  const dims = PRESET_SIZE[sess.query.preset as HeraldPresetId] || {
    width: 1920,
    height: 1080,
  };
  const stem = designStem();
  const replaced = canvases.some((canvas) => canvas.attrs.heraldPageContentId);
  const published: string[] = [];

  try {
    for (let i = 0; i < canvases.length; i++) {
      const existing = canvases[i].attrs.heraldPageContentId || null;
      const scene = wrapSuikaPaper(
        JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData,
      );
      const result = await publishToLibrary({
        png: pngs[i],
        scene,
        contentId: existing,
        preset: sess.query.preset,
        width: dims.width,
        height: dims.height,
        name: existing ? undefined : `${stem} — ${i + 1}.png`,
      });
      canvases[i].attrs.heraldPageContentId = result.content_id;
      published.push(result.content_id);
    }

    const scene = wrapSuikaPaper(
      JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData,
    );
    for (let i = 0; i < canvases.length; i++) {
      await publishToLibrary({
        png: pngs[i],
        scene,
        contentId: published[i],
        preset: sess.query.preset,
        width: dims.width,
        height: dims.height,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postToOpener({ source: 'suika', type: 'herald:error', message });
    throw err;
  }

  const contentId =
    current.attrs.heraldPageContentId || published[0] || sess.contentId || '';
  sess.contentId = contentId;
  session = { ...sess, contentId };

  postToOpener({
    source: 'suika',
    type: 'herald:saved',
    contentId,
    width: dims.width,
    height: dims.height,
    replaced,
    pageCount: canvases.length,
  });

  if (opts?.closeWindow !== false) {
    window.setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, 120);
  }

  return {
    contentId,
    width: dims.width,
    height: dims.height,
    pageCount: canvases.length,
  };
}

export function cancelHerald(): void {
  postToOpener({ source: 'suika', type: 'herald:cancelled' });
  try {
    window.close();
  } catch {
    /* ignore */
  }
}
