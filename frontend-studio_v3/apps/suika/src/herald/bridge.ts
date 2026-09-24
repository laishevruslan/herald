/**
 * Herald Phase 1 Save bridge: PNG + wrapped paper → POST /api/studio/export,
 * then postMessage to opener and close (plan §4.4 / §6.1).
 */
import {
  exportService,
  type IEditorPaperData,
  type SuikaEditor,
} from '@suika/core';

import { publishToLibrary } from './api';
import { PRESET_SIZE } from './presets';
import { type HeraldPresetId, type HeraldQuery } from './query';
import { wrapSuikaPaper } from './scene';

export type HeraldSession = {
  query: HeraldQuery;
  /** Namespaced localStorage key — never the shared `suika-paper`. */
  paperStoreKey: string;
  contentId: string | null;
};

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
    }
  | { source: 'suika'; type: 'herald:error'; message: string }
  | { source: 'suika'; type: 'herald:cancelled' };

export function postToOpener(msg: SuikaToHerald): void {
  if (!window.opener || window.opener.closed) return;
  try {
    window.opener.postMessage(msg, window.location.origin);
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

function designFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `Design ${y}-${m}-${day}.png`;
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
    if (!localStorage.getItem('token')) {
      throw new Error('Not signed in to Herald');
    }

    const png = await exportService.getCurrentPagePNGBlob(editor);
    if (!png) {
      throw new Error('Nothing to export — add shapes on the page first');
    }

    const paper = JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData;
    const scene = wrapSuikaPaper(paper);
    const dims = PRESET_SIZE[sess.query.preset as HeraldPresetId] || {
      width: 1920,
      height: 1080,
    };

    const result = await publishToLibrary({
      png,
      scene,
      contentId: sess.contentId,
      preset: sess.query.preset,
      width: dims.width,
      height: dims.height,
      name: designFileName(),
    });

    sess.contentId = result.content_id;
    session = { ...sess, contentId: result.content_id };

    postToOpener({
      source: 'suika',
      type: 'herald:saved',
      contentId: result.content_id,
      width: result.width ?? dims.width,
      height: result.height ?? dims.height,
    });

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

export function cancelHerald(): void {
  postToOpener({ source: 'suika', type: 'herald:cancelled' });
  try {
    window.close();
  } catch {
    /* ignore */
  }
}
