/**
 * Built-in screen layouts. Files live in herald-templates/ and are served
 * from the same origin at templates/ (air-gap: no Herald API).
 */
import { genUuid } from '@suika/common';
import { type IEditorPaperData } from '@suika/core';

import { HERALD_APP_VERSION } from './presets';
import { type HeraldPresetId } from './query';

const PRESET_IDS: HeraldPresetId[] = [
  'landscape-1080',
  'portrait-1080',
  'epaper-5x3',
  'landscape-4k',
  'square-1080',
  'bar-1920',
];

export type TemplateFilter = 'all' | 'landscape' | 'portrait' | 'epaper';

export type HeraldTemplateEntry = {
  id: string;
  name: string;
  preset: HeraldPresetId;
  tags: string[];
};

type PaperNode = {
  id?: string;
  parentIndex?: { guid?: string; position?: string };
};

function templatesRoot(): URL {
  const base = import.meta.env.BASE_URL || './';
  return new URL(base, window.location.href);
}

export function templateAssetUrl(file: string): string {
  return new URL(`templates/${file}`, templatesRoot()).toString();
}

export function tagsForPreset(preset: HeraldPresetId): string[] {
  if (preset === 'portrait-1080') return ['portrait'];
  if (preset === 'epaper-5x3') return ['epaper'];
  if (preset === 'landscape-1080' || preset === 'landscape-4k') {
    return ['landscape'];
  }
  return [];
}

export function matchesTemplateFilter(
  tags: string[],
  filter: TemplateFilter,
): boolean {
  if (filter === 'all') return true;
  return tags.includes(filter);
}

function isPreset(value: string): value is HeraldPresetId {
  return (PRESET_IDS as string[]).includes(value);
}

export async function loadTemplateCatalog(): Promise<HeraldTemplateEntry[]> {
  const response = await fetch(templateAssetUrl('manifest.json'));
  if (!response.ok) {
    throw new Error(`templates ${response.status}`);
  }
  const body = (await response.json()) as { templates?: unknown };
  if (!Array.isArray(body.templates)) return [];
  const entries: HeraldTemplateEntry[] = [];
  for (const item of body.templates) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const preset = typeof row.preset === 'string' ? row.preset : '';
    if (!/^[a-z0-9-]+$/.test(id) || !isPreset(preset)) continue;
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];
    entries.push({
      id,
      name: typeof row.name === 'string' && row.name ? row.name : id,
      preset,
      tags,
    });
  }
  return entries;
}

const paperCache = new Map<string, IEditorPaperData>();

export async function loadTemplatePaper(id: string): Promise<IEditorPaperData> {
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Unknown layout');
  }
  const cached = paperCache.get(id);
  if (cached) return cached;
  const response = await fetch(templateAssetUrl(`${id}/paper.suika`));
  if (!response.ok) throw new Error('Could not open that layout');
  const paper = (await response.json()) as IEditorPaperData;
  if (
    !paper ||
    paper.appVersion !== HERALD_APP_VERSION ||
    !Array.isArray(paper.data) ||
    paper.data.length === 0
  ) {
    throw new Error('Could not open that layout');
  }
  paperCache.set(id, paper);
  return paper;
}

/**
 * New node ids and a new paperId. Two saves must not share one localStorage paper.
 * The document root stays `0-0`; that id is how the scene graph finds the tree.
 */
export function cloneHeraldPaper(paper: IEditorPaperData): IEditorPaperData {
  const copy = JSON.parse(JSON.stringify(paper)) as IEditorPaperData;
  const nodes = copy.data as unknown as PaperNode[];
  const nextId = new Map<string, string>();
  for (const node of nodes) {
    if (!node.id || node.id === '0-0') continue;
    const id = genUuid();
    nextId.set(node.id, id);
    node.id = id;
  }
  for (const node of nodes) {
    const guid = node.parentIndex?.guid;
    if (guid && nextId.has(guid) && node.parentIndex) {
      node.parentIndex.guid = nextId.get(guid);
    }
  }
  copy.paperId = genUuid();
  copy.appVersion = HERALD_APP_VERSION;
  return copy;
}
