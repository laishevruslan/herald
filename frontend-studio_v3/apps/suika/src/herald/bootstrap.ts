/**
 * Herald-mode editor bootstrap: preset artboard, namespaced autosave, ready ping.
 * contentId load (re-edit) is Phase 2 — Phase 1 creates a blank preset paper.
 */
import { type SuikaEditor } from '@suika/core';

import { AutoSaveGraphics } from '../store/auto-save-graphs';
import { heraldPaperStoreKey, notifyReady, setHeraldSession } from './bridge';
import { blankPaperForPreset } from './presets';
import { type HeraldQuery } from './query';

export function bootstrapHerald(
  editor: SuikaEditor,
  query: HeraldQuery,
): AutoSaveGraphics {
  const paperStoreKey = heraldPaperStoreKey(query.contentId);
  setHeraldSession({
    query,
    paperStoreKey,
    contentId: query.contentId,
  });

  // Prefer namespaced autosave restore; else seed preset artboard (create flow).
  const autosave = new AutoSaveGraphics(editor, paperStoreKey);
  if (!autosave.hadStoredData()) {
    editor.setContents(blankPaperForPreset(query.preset));
    editor.render();
    autosave.save();
  }

  notifyReady(query.contentId);
  return autosave;
}
