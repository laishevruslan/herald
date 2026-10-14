/**
 * Catalogue faces from server/lib/slide-fonts.js.
 * Glyphs are drawn by opentype (paths in the PNG). @font-face is injected
 * as well so a CSS preview and the export pass do not depend on the OS font.
 */
import { fontManager } from '@suika/core';

import {
  type CatalogueFont,
  fetchSlideFonts,
  getApiBase,
} from './api';

export type HeraldFontOption = {
  css: string;
  label: string;
  cyrillic: boolean;
};

let installed: CatalogueFont[] = [];

export function installedCatalogue(): CatalogueFont[] {
  return installed;
}

function fontOrigin(): string {
  return getApiBase() || '';
}

const FALLBACK_FACES = [
  { script: 'latin', suffix: '', range: '' },
  { script: 'latin-ext', suffix: '-ext', range: '' },
  { script: 'cyrillic', suffix: '-cyrillic', range: '' },
  { script: 'cyrillic-ext', suffix: '-cyrillic-ext', range: '' },
];

function validFont(font: CatalogueFont): boolean {
  return Boolean(
    font &&
      font.css &&
      font.file &&
      Array.isArray(font.weights) &&
      font.weights.length >= 2,
  );
}

function facesOf(font: CatalogueFont) {
  return font.faces?.length ? font.faces : FALLBACK_FACES;
}

export function injectCatalogueFontFaces(fonts: CatalogueFont[]): void {
  if (typeof document === 'undefined') return;
  const base = fontOrigin();
  const css = fonts
    .filter(validFont)
    .flatMap((font) =>
      facesOf(font)
        .filter((face) => face.range)
        .map(
          (face) =>
            `@font-face{font-family:'${font.css.replace(/'/g, '')}';font-style:normal;` +
            `font-weight:${font.weights[0]} ${font.weights[1]};font-display:swap;` +
            `src:url(${base}/fonts/${font.file}${face.suffix}.woff2) format('woff2');` +
            `unicode-range:${face.range}}`,
        ),
    )
    .join('\n');
  let el = document.getElementById('suika-herald-fonts');
  if (!el) {
    el = document.createElement('style');
    el.id = 'suika-herald-fonts';
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function cssForFontId(id: string | null | undefined): string | null {
  if (!id) return null;
  const hit = installed.find((font) => font.id === id || font.css === id);
  return hit ? hit.css : null;
}

export function fontOptions(
  headingCss: string | null,
  bodyCss: string | null,
): HeraldFontOption[] {
  const byCss = new Map<string, HeraldFontOption>();
  for (const font of installed) {
    if (!font.css || byCss.has(font.css)) continue;
    byCss.set(font.css, {
      css: font.css,
      label: font.label || font.css,
      cyrillic: font.faces?.length
        ? font.faces.some((face) => face.script === 'cyrillic')
        : true,
    });
  }
  const rest = [...byCss.values()];
  const first: HeraldFontOption[] = [];
  for (const css of [headingCss, bodyCss]) {
    if (!css) continue;
    const hit = byCss.get(css);
    if (!hit || first.some((item) => item.css === css)) continue;
    first.push(hit);
  }
  const firstIds = new Set(first.map((item) => item.css));
  return [...first, ...rest.filter((item) => !firstIds.has(item.css))];
}

/** Load every catalogue subset into the glyph engine. A missing file is skipped. */
export async function installHeraldFonts(): Promise<CatalogueFont[]> {
  const fonts = (await fetchSlideFonts()).filter(validFont);
  installed = fonts;
  injectCatalogueFontFaces(fonts);
  if (fonts.length) {
    await fontManager.loadFamilies(
      fonts.map((font) => ({
        name: font.css,
        urls: facesOf(font).map(
          (face) => `${fontOrigin()}/fonts/${font.file}${face.suffix}.woff2`,
        ),
      })),
    );
  }
  return fonts;
}

/** Fetch the faces before PNG export so the browser is not on an OS fallback. */
export async function warmHeraldFontsForExport(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const loads = installed.map((font) => {
    const weight = font.weights?.[1] || font.weights?.[0] || 400;
    return document.fonts
      .load(`${weight} 48px '${font.css.replace(/'/g, '')}'`)
      .catch(() => null);
  });
  await Promise.all(loads);
  await document.fonts.ready;
}
