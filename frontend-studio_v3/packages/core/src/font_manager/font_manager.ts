import opentype, { type Font, type Glyph } from 'opentype.js';
import decompressWoff2 from 'woff2-encoder/decompress';

import { AsyncTaskManager } from './async_task_manager';

const FONT_LOAD_CONCURRENCY = 3;

const WOFF2_SIGNATURE = 'wOF2';

async function loadFont(url: string): Promise<Font> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url} (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const signature = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  const fontBuffer =
    signature === WOFF2_SIGNATURE
      ? (await decompressWoff2(buffer)).buffer
      : buffer;

  return opentype.parse(fontBuffer as ArrayBuffer);
}

/**
 * One CSS family is several script subsets (latin, cyrillic, …).
 * The text engine asks one Font for every character, so a missing
 * glyph falls through to the next subset of the same family.
 */
class GlyphFallbackFont {
  readonly unitsPerEm: number;
  readonly tables: Font['tables'];
  private readonly faces: Font[];

  constructor(faces: Font[]) {
    this.faces = faces;
    this.unitsPerEm = faces[0].unitsPerEm;
    this.tables = faces[0].tables;
  }

  stringToGlyphs(content: string): Glyph[] {
    const glyphs: Glyph[] = [];
    for (const ch of content) {
      glyphs.push(this.glyphFor(ch));
    }
    return glyphs;
  }

  getKerningValue(left: Glyph, right: Glyph): number {
    const leftFont = (left as Glyph & { font?: Font }).font;
    const rightFont = (right as Glyph & { font?: Font }).font;
    const face = this.faces.find((item) => item === leftFont);
    if (!face || rightFont !== face) return 0;
    return face.getKerningValue(left, right);
  }

  private glyphFor(ch: string): Glyph {
    for (const face of this.faces) {
      const glyph = face.charToGlyph(ch);
      if (glyph && glyph.name !== '.notdef' && glyph.index !== 0) {
        return glyph;
      }
    }
    return this.faces[0].charToGlyph(ch);
  }
}

class FontManager {
  private fonts: Record<string, Font | null> = {};

  async loadFonts(fonts: Record<string, string>) {
    for (const [fontName] of Object.entries(fonts)) {
      if (this.fonts[fontName]) {
        console.warn(`Font ${fontName} is loaded or loading, skip`);
        continue;
      }
      this.fonts[fontName] = null;
    }

    const taskManager = new AsyncTaskManager<Font>(FONT_LOAD_CONCURRENCY);
    const tasks: Array<() => Promise<Font>> = [];

    for (const [fontName, url] of Object.entries(fonts)) {
      if (this.fonts[fontName]) {
        continue;
      }

      tasks.push(async () => {
        const font = await loadFont(url);
        this.fonts[fontName] = font;
        return font;
      });
    }

    await taskManager.addTaskList(tasks);
  }

  /**
   * Load one family from several files (script subsets). Files that fail
   * are skipped. Faces with a different units-per-em are skipped too:
   * mixing them would scale Cyrillic against Latin.
   */
  async loadFamilies(families: { name: string; urls: string[] }[]) {
    await Promise.all(
      families.map(async (family) => {
        if (!family.name || this.fonts[family.name]) return;
        const faces: Font[] = [];
        for (const url of family.urls) {
          try {
            faces.push(await loadFont(url));
          } catch (error) {
            console.warn(`Font file failed ${url}`, error);
          }
        }
        if (!faces.length) return;
        const units = faces[0].unitsPerEm;
        const compatible = faces.filter((face) => face.unitsPerEm === units);
        this.fonts[family.name] =
          compatible.length === 1
            ? compatible[0]
            : (new GlyphFallbackFont(compatible) as unknown as Font);
      }),
    );
  }

  getFont(fontFamily: string) {
    const font = this.fonts[fontFamily];
    if (!font) {
      console.warn(`Font ${fontFamily} not found, use default font`);
      return this.fonts['Source Han Sans CN']!;
    }
    return font;
  }

  getFontNames() {
    return Object.keys(this.fonts);
  }
}

const fontManager = new FontManager();
(window as any).fontManager = fontManager;
export { fontManager };
