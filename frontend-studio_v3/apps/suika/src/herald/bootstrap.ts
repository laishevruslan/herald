/**
 * Herald-mode editor bootstrap: load existing design (Phase 2) or seed preset (Phase 1).
 * Phase 3: wait for herald:init when cross-origin (no shared localStorage JWT).
 */
import { type SuikaEditor } from '@suika/core';

import { AutoSaveGraphics } from '../store/auto-save-graphs';
import { loadDesign } from './api';
import {
  heraldPaperStoreKey,
  notifyReady,
  postToOpener,
  setHeraldSession,
} from './bridge';
import { installHeraldInitListener, waitForHeraldInit } from './init';
import { blankPaperForPreset, PRESET_SIZE } from './presets';
import { type HeraldPresetId, type HeraldQuery } from './query';
import { unwrapSuikaPaper } from './scene';

function presetFromDims(
  width: number,
  height: number,
  fallback: HeraldPresetId,
): HeraldPresetId {
  for (const [id, size] of Object.entries(PRESET_SIZE) as [
    HeraldPresetId,
    { width: number; height: number },
  ][]) {
    if (size.width === width && size.height === height) return id;
  }
  return fallback;
}

export async function bootstrapHerald(
  editor: SuikaEditor,
  query: HeraldQuery,
): Promise<AutoSaveGraphics> {
  installHeraldInitListener();
  // Cross-origin Dev B: opener pushes JWT after suika:ready. Signal ready early so
  // the handshake can complete before loadDesign / export.
  notifyReady(query.contentId);
  await waitForHeraldInit({ timeoutMs: 4000 });

  const paperStoreKey = heraldPaperStoreKey(query.contentId);
  setHeraldSession({
    query,
    paperStoreKey,
    contentId: query.contentId,
  });

  // Re-edit: always prefer the server sidecar over stale namespaced localStorage.
  if (query.contentId) {
    try {
      const design = await loadDesign(query.contentId);
      if (design.editor && design.editor !== 'suika') {
        throw new Error('This design was made in the poster editor');
      }
      const paper = unwrapSuikaPaper(design.scene_json);
      if (!paper) {
        throw new Error('Design has no Suika paper to edit');
      }
      const preset = presetFromDims(design.width, design.height, query.preset);
      setHeraldSession({
        query: { ...query, preset },
        paperStoreKey,
        contentId: design.content_id,
      });
      editor.setContents(paper);
      editor.render();
      const autosave = new AutoSaveGraphics(editor, paperStoreKey, {
        skipLoad: true,
      });
      autosave.save();
      notifyReady(design.content_id);
      return autosave;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      postToOpener({ source: 'suika', type: 'herald:error', message });
      window.alert(message);
      // Fall through to blank preset so the operator is not stuck on a grey overlay.
    }
  }

  // Create (or failed load): namespaced autosave restore, else seed blank artboard.
  const autosave = new AutoSaveGraphics(editor, paperStoreKey);
  if (!autosave.hadStoredData()) {
    editor.setContents(blankPaperForPreset(query.preset));
    editor.render();
    autosave.save();
  }

  notifyReady(query.contentId);
  return autosave;
}
