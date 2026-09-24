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
};

export function blankPaperForPreset(
  preset: HeraldPresetId,
  paperId?: string,
): IEditorPaperData {
  const { width, height } = PRESET_SIZE[preset];
  const id = paperId || `herald-${preset}-${Date.now().toString(36)}`;
  return {
    appVersion: HERALD_APP_VERSION,
    paperId: id,
    data: [
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
    ],
  } as unknown as IEditorPaperData;
}
