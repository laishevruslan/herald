import { apiFetch } from './api';

/** Eight swatches when no kit / white-label colours are available. */
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
  accent: string;
  bg: string;
  fontHeading: string;
  fontBody: string;
  logoContentId: string | null;
  swatches: string[];
  source: 'brand-kit' | 'white-label' | 'default';
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

function padSwatches(list: string[]): string[] {
  const swatches = uniqHex([...list, ...DEFAULT_SWATCHES]).slice(0, 8);
  while (swatches.length < 8) swatches.push(DEFAULT_SWATCHES[swatches.length]);
  return swatches;
}

/**
 * Prefer workspace brand-kit API (phase 4), then white-label, then defaults.
 */
export async function loadBrandColors(): Promise<BrandColors> {
  const fallback: BrandColors = {
    primary: '#3B82F6',
    secondary: '#1E293B',
    accent: '#F59E0B',
    bg: '#111827',
    fontHeading: 'archivo',
    fontBody: 'inter',
    logoContentId: null,
    swatches: [...DEFAULT_SWATCHES],
    source: 'default',
  };

  try {
    const r = await apiFetch('/api/brand-kit');
    if (r.ok) {
      const kit = await r.json();
      const primary = kit.color_primary || fallback.primary;
      const secondary = kit.color_secondary || fallback.secondary;
      const accent = kit.color_accent || fallback.accent;
      const bg = kit.color_bg || fallback.bg;
      const swatches = Array.isArray(kit.swatches) && kit.swatches.length
        ? padSwatches(kit.swatches)
        : padSwatches([primary, secondary, accent, bg]);
      return {
        primary,
        secondary,
        accent,
        bg,
        fontHeading: kit.font_heading || fallback.fontHeading,
        fontBody: kit.font_body || fallback.fontBody,
        logoContentId: kit.logo_content_id || null,
        swatches,
        source: kit.source === 'workspace' ? 'brand-kit' : 'default',
      };
    }
  } catch { /* fall through */ }

  try {
    const r = await apiFetch('/api/white-label');
    if (!r.ok) return fallback;
    const wl = await r.json();
    const primary = wl.primary_color || fallback.primary;
    const secondary = wl.secondary_color || fallback.secondary;
    const bg = wl.bg_color || fallback.bg;
    return {
      ...fallback,
      primary,
      secondary,
      bg,
      swatches: padSwatches([primary, secondary, bg]),
      source: 'white-label',
    };
  } catch {
    return fallback;
  }
}
