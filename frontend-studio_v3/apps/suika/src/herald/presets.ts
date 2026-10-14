/**
 * Blank Suika paper sized to Herald Studio presets.
 * Page (Canvas) has no intrinsic size — PNG bbox comes from a full-bleed background Rect.
 */
import { GraphicsType, type IEditorPaperData, PaintType } from '@suika/core';

import { type HeraldPresetId } from './query';

export const HERALD_APP_VERSION = 'suika-editor_0.0.3';

export const PRESET_SIZE: Record<
  HeraldPresetId,
  { width: number; height: number }
> = {
  'landscape-1080': { width: 1920, height: 1080 },
  'portrait-1080': { width: 1080, height: 1920 },
  'epaper-5x3': { width: 800, height: 480 },
  'landscape-4k': { width: 3840, height: 2160 },
  'square-1080': { width: 1080, height: 1080 },
  'bar-1920': { width: 1920, height: 540 },
};

/** LCD overscan margin. E-paper panels crop a little more. */
export function safeZoneRatio(preset: HeraldPresetId): number {
  return preset === 'epaper-5x3' ? 0.08 : 0.05;
}

export function isEpaperPreset(preset: HeraldPresetId): boolean {
  return preset === 'epaper-5x3';
}

export type HeraldLogoSeed = {
  src: string;
  contentId: string;
};

export function blankPaperForPreset(
  preset: HeraldPresetId,
  paperId?: string,
  logo?: HeraldLogoSeed | null,
): IEditorPaperData {
  const { width, height } = PRESET_SIZE[preset];
  const id = paperId || `herald-${preset}-${Date.now().toString(36)}`;
  const data: unknown[] = [
    {
      id: '0-0',
      objectName: 'Document',
      width: 0,
      height: 0,
      type: GraphicsType.Document,
      transform: [1, 0, 0, 1, 0, 0],
      strokeWidth: 1,
    },
    {
      id: 'page-herald',
      objectName: 'Page 1',
      width: 0,
      height: 0,
      type: GraphicsType.Canvas,
      transform: [1, 0, 0, 1, 0, 0],
      strokeWidth: 1,
      parentIndex: { guid: '0-0', position: 'a0' },
    },
    {
      id: 'bg-herald',
      objectName: 'Background',
      width,
      height,
      type: GraphicsType.Rect,
      transform: [1, 0, 0, 1, 0, 0],
      strokeWidth: 0,
      fill: [
        {
          type: PaintType.Solid,
          attrs: { r: 255, g: 255, b: 255, a: 1 },
        },
      ],
      parentIndex: { guid: 'page-herald', position: 'a0' },
    },
  ];

  if (logo?.src && logo.contentId) {
    const ratio = safeZoneRatio(preset);
    const marginX = Math.round(width * ratio);
    const marginY = Math.round(height * ratio);
    const side = Math.max(32, Math.round(Math.min(width, height) * 0.12));
    data.push({
      id: 'logo-herald',
      objectName: 'Logo',
      width: side,
      height: side,
      type: GraphicsType.Rect,
      transform: [1, 0, 0, 1, marginX, marginY],
      strokeWidth: 0,
      fill: [
        {
          type: PaintType.Image,
          attrs: { src: logo.src, heraldContentId: logo.contentId },
        },
      ],
      parentIndex: { guid: 'page-herald', position: 'a1' },
    });
  }

  return {
    appVersion: HERALD_APP_VERSION,
    paperId: id,
    data,
  } as unknown as IEditorPaperData;
}
