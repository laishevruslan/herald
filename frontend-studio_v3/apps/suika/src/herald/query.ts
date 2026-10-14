/**
 * Herald Phase 1: query contract for same-origin /suika/?mode=herald&…
 * Mirrors Studio params (preset, contentId, lang, for) plus mode=herald.
 */

export type HeraldPresetId =
  | 'landscape-1080'
  | 'portrait-1080'
  | 'epaper-5x3'
  | 'landscape-4k'
  | 'square-1080'
  | 'bar-1920';

export type HeraldQuery = {
  mode: 'herald' | null;
  preset: HeraldPresetId;
  contentId: string | null;
  forSlideBg: boolean;
};

const PRESET_IDS: HeraldPresetId[] = [
  'landscape-1080',
  'portrait-1080',
  'epaper-5x3',
  'landscape-4k',
  'square-1080',
  'bar-1920',
];

export function parseHeraldQuery(
  search: string = typeof location !== 'undefined' ? location.search : '',
): HeraldQuery {
  const params = new URLSearchParams(search);
  const modeRaw = (params.get('mode') || '').toLowerCase();
  const mode = modeRaw === 'herald' ? 'herald' : null;
  const presetRaw = (params.get('preset') ||
    'landscape-1080') as HeraldPresetId;
  const preset = isHeraldPresetId(presetRaw) ? presetRaw : 'landscape-1080';
  const contentId = params.get('contentId') || params.get('content_id') || null;
  const forSlideBg = (params.get('for') || '').toLowerCase() === 'slide-bg';
  return { mode, preset, contentId, forSlideBg };
}

export function isHeraldPresetId(value: string): value is HeraldPresetId {
  return (PRESET_IDS as string[]).includes(value);
}

export function isHeraldMode(
  search: string = typeof location !== 'undefined' ? location.search : '',
): boolean {
  return parseHeraldQuery(search).mode === 'herald';
}
