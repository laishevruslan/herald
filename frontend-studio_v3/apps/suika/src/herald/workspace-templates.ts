import {
  exportService,
  type IEditorPaperData,
  type SuikaEditor,
} from '@suika/core';

import { fetchWorkspaceTemplate, saveWorkspaceTemplate } from './api';
import { getHeraldSession } from './bridge';
import { HERALD_APP_VERSION } from './presets';
import { isHeraldPresetId } from './query';

const MAX_EDGE = 480;
const MAX_BYTES = 400 * 1024;

const paperCache = new Map<string, IEditorPaperData>();

export function dropWorkspaceTemplateCache(id: string): void {
  paperCache.delete(id);
}

function asPaper(value: unknown): IEditorPaperData {
  const paper = value as IEditorPaperData;
  if (
    !paper ||
    paper.appVersion !== HERALD_APP_VERSION ||
    !Array.isArray(paper.data) ||
    paper.data.length === 0
  ) {
    throw new Error('Could not open that template');
  }
  return paper;
}

export async function loadWorkspaceTemplatePaper(
  id: string,
): Promise<IEditorPaperData> {
  const cached = paperCache.get(id);
  if (cached) return cached;
  const row = await fetchWorkspaceTemplate(id);
  if (!isHeraldPresetId(row.preset)) {
    throw new Error('Could not open that template');
  }
  const paper = asPaper(row.paper);
  paperCache.set(id, paper);
  return paper;
}

async function scaleThumb(png: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(png);
  try {
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(bitmap.width, bitmap.height, 1),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.72);
    });
    if (!blob || blob.size > MAX_BYTES) return null;
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Design mode only. Stores paper JSON for this workspace. No playlist PNG. */
export async function publishWorkspaceTemplate(
  editor: SuikaEditor,
  name: string,
): Promise<void> {
  const sess = getHeraldSession();
  if (!sess) throw new Error('Not in Herald mode');
  if (editor.heraldFillMode)
    throw new Error('Switch to Design to save a template');
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (!trimmed) throw new Error('Template name is required');
  const paper = JSON.parse(editor.sceneGraph.toJSON()) as IEditorPaperData;
  let thumb: Blob | null = null;
  try {
    const png = await exportService.getCurrentPagePNGBlob(editor);
    if (png) thumb = await scaleThumb(png);
  } catch {
    thumb = null;
  }
  await saveWorkspaceTemplate({
    name: trimmed,
    preset: sess.query.preset,
    paper,
    thumb,
  });
}
