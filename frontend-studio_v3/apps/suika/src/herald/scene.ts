/**
 * scene_json wrapper so Layerhub Fabric JSON and Suika paper stay distinguishable.
 * Plan §4.2.
 */
import { type IEditorPaperData } from '@suika/core';

import { HERALD_APP_VERSION } from './presets';

export const SUIKA_SCENE_V = 1;
export const SUIKA_EDITOR_TAG = 'suika' as const;

export type SuikaSceneWrapper = {
  v: typeof SUIKA_SCENE_V;
  editor: typeof SUIKA_EDITOR_TAG;
  appVersion: string;
  paper: IEditorPaperData;
};

export function wrapSuikaPaper(paper: IEditorPaperData): SuikaSceneWrapper {
  return {
    v: SUIKA_SCENE_V,
    editor: SUIKA_EDITOR_TAG,
    appVersion: paper.appVersion || HERALD_APP_VERSION,
    paper,
  };
}

export function unwrapSuikaPaper(scene: unknown): IEditorPaperData | null {
  if (!scene || typeof scene !== 'object') return null;
  const o = scene as Record<string, unknown>;
  if (o.editor === SUIKA_EDITOR_TAG && o.paper && typeof o.paper === 'object') {
    return o.paper as IEditorPaperData;
  }
  // Bare paper (appVersion + data) — tolerate for older spike dumps.
  if (
    typeof o.appVersion === 'string' &&
    Array.isArray(o.data) &&
    typeof o.paperId === 'string'
  ) {
    return o as unknown as IEditorPaperData;
  }
  return null;
}
