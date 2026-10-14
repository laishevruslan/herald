/**
 * Herald-mode editor bootstrap: load existing design (Phase 2) or seed preset (Phase 1).
 * Phase 3: wait for herald:init when cross-origin (no shared localStorage JWT).
 */
import {
  fontManager,
  type IEditorPaperData,
  type SuikaEditor,
} from '@suika/core';

import { AutoSaveGraphics } from '../store/auto-save-graphs';
import {
  embedLibraryImage,
  fetchBrandKit,
  kitSwatches,
  loadDesign,
} from './api';
import {
  heraldPaperStoreKey,
  notifyReady,
  postToOpener,
  setHeraldSession,
} from './bridge';
import { setHeraldChrome } from './chrome';
import { cssForFontId, fontOptions, installHeraldFonts } from './fonts';
import { requestTemplateChoice } from './gallery-request';
import { requestHeraldImage } from './image-request';
import { installHeraldInitListener, waitForHeraldInit } from './init';
import { applyHeraldAuthoringMode } from './mode';
import { blankPaperForPreset, PRESET_SIZE } from './presets';
import { type HeraldPresetId, type HeraldQuery } from './query';
import { unwrapSuikaPaper } from './scene';
import { cloneHeraldPaper, loadTemplatePaper } from './templates';
import { loadWorkspaceTemplatePaper } from './workspace-templates';

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

  editor.imagePicker = () => requestHeraldImage();
  setHeraldChrome({ active: true, swatches: [], fonts: [] });

  await installHeraldFonts().catch(() => []);
  const kit = await fetchBrandKit();
  const headingCss = cssForFontId(kit?.font_heading);
  const bodyCss = cssForFontId(kit?.font_body);
  // Kit failure leaves the editor default (Source Han Sans CN). A loaded
  // catalogue face is used only when the kit actually names one.
  if (bodyCss && fontManager.getFontNames().includes(bodyCss)) {
    editor.setting.set('defaultFontFamily', bodyCss);
  }
  setHeraldChrome({
    active: true,
    swatches: kitSwatches(kit),
    fonts: fontOptions(headingCss, bodyCss).filter((font) =>
      fontManager.getFontNames().includes(font.css),
    ),
  });

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
      applyHeraldAuthoringMode(editor, 'design');
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

  // Create (or failed load): namespaced autosave restore, else the layout gallery.
  // A contentId that failed to load stays on a blank sheet — re-edit never opens the gallery.
  const autosave = new AutoSaveGraphics(editor, paperStoreKey);
  if (autosave.hadStoredData()) {
    try {
      const stored = JSON.parse(
        localStorage.getItem(paperStoreKey) || 'null',
      ) as {
        data?: {
          objectName?: string;
          type?: string;
          width?: number;
          height?: number;
        }[];
      } | null;
      const bg = stored?.data?.find(
        (node) => node?.objectName === 'Background' && node?.type === 'Rect',
      );
      if (bg?.width && bg?.height) {
        const preset = presetFromDims(bg.width, bg.height, query.preset);
        setHeraldSession({
          query: { ...query, preset },
          paperStoreKey,
          contentId: query.contentId,
        });
      }
    } catch {
      /* keep the preset from the URL */
    }
    applyHeraldAuthoringMode(editor, 'design');
  } else {
    let preset = query.preset;
    let paper: IEditorPaperData | null = null;
    let openAsFill = false;
    if (!query.contentId) {
      const choice = await requestTemplateChoice();
      if (choice.kind === 'template') {
        try {
          const source =
            choice.source === 'workspace'
              ? await loadWorkspaceTemplatePaper(choice.id)
              : await loadTemplatePaper(choice.id);
          paper = cloneHeraldPaper(source);
          preset = choice.preset;
          openAsFill = true;
          setHeraldSession({
            query: { ...query, preset },
            paperStoreKey,
            contentId: null,
          });
        } catch {
          paper = null;
          preset = query.preset;
          openAsFill = false;
        }
      }
    }
    if (!paper) {
      let logo: { src: string; contentId: string } | null = null;
      const logoId = kit?.logo_content_id || null;
      // Logo only on a fresh blank sheet. A template and a saved paper are left alone.
      if (!query.contentId && logoId) {
        const { width, height } = PRESET_SIZE[preset];
        try {
          const embedded = await embedLibraryImage(
            logoId,
            'Logo',
            Math.max(width, height),
          );
          logo = { src: embedded.url, contentId: embedded.contentId };
        } catch {
          logo = null;
        }
      }
      paper = blankPaperForPreset(preset, undefined, logo);
    }
    editor.setContents(paper);
    applyHeraldAuthoringMode(editor, openAsFill ? 'fill' : 'design');
    autosave.save();
  }

  notifyReady(query.contentId);
  return autosave;
}
