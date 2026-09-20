import { apiFetch } from './api';

/** Eight swatches when brand-kit phase 4 is absent (plan §5.2). */
export const DEFAULT_SWATCHES = [
  '#FFFFFF',
  '#111827',
  '#1E293B',
  '#1B2029',
  '#3B82F6',
  '#2563EB',
  '#F59E0B',
  '#4B5563',
] as const;

export type BrandColors = {
  primary: string;
  secondary: string;
  bg: string;
  swatches: string[];
};

function uniqHex(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const h = String(raw || '').trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(h)) continue;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

/**
 * Prefer workspace white-label colours (exists today) padded to 8 swatches.
 * Full brand-kit API is phase 4 of the parent plan — not required for 6.2.
 */
export async function loadBrandColors(): Promise<BrandColors> {
  const fallback: BrandColors = {
    primary: '#3B82F6',
    secondary: '#1E293B',
    bg: '#111827',
    swatches: [...DEFAULT_SWATCHES],
  };
  try {
    const r = await apiFetch('/api/white-label');
    if (!r.ok) return fallback;
    const wl = await r.json();
    const primary = wl.primary_color || fallback.primary;
    const secondary = wl.secondary_color || fallback.secondary;
    const bg = wl.bg_color || fallback.bg;
    const swatches = uniqHex([
      primary, secondary, bg,
      ...DEFAULT_SWATCHES,
    ]).slice(0, 8);
    while (swatches.length < 8) swatches.push(DEFAULT_SWATCHES[swatches.length]);
    return { primary, secondary, bg, swatches };
  } catch {
    return fallback;
  }
}
