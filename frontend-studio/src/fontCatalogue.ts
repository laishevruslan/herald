/**
 * Same OFL catalogue as server/lib/slide-fonts.js — register before Fabric paints (D-SC-7).
 */

export const STUDIO_FONTS = [
  { id: 'inter', css: 'Inter', stack: 'sans-serif', weight: 700 },
  { id: 'archivo', css: 'Archivo', stack: 'sans-serif', weight: 700 },
  { id: 'oswald', css: 'Oswald', stack: 'sans-serif', weight: 600 },
  { id: 'bitter', css: 'Bitter', stack: 'serif', weight: 700 },
  { id: 'jetbrains-mono', css: 'JetBrains Mono', stack: 'monospace', weight: 500 },
] as const;

export type StudioFontId = (typeof STUDIO_FONTS)[number]['id'];

export function fontStack(css: string, stack = 'sans-serif'): string {
  return `'${css}', ${stack}`;
}

/** Wait until every bundled face has attempted to load (fail soft per family). */
export async function waitForStudioFonts(): Promise<void> {
  const loads = STUDIO_FONTS.map((f) =>
    document.fonts.load(`${f.weight} 48px '${f.css}'`).catch(() => null),
  );
  await Promise.all(loads);
  await document.fonts.ready;
}

export function resolveFontFamily(cssOrId: string | undefined | null): string {
  if (!cssOrId) return fontStack('Inter');
  const byId = STUDIO_FONTS.find((f) => f.id === cssOrId || f.css === cssOrId);
  if (byId) return fontStack(byId.css, byId.stack);
  // Already a full CSS stack from an older scene.
  if (cssOrId.includes(',')) return cssOrId;
  return fontStack(cssOrId);
}
