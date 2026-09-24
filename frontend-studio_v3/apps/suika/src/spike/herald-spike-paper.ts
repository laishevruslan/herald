/**
 * Herald Phase 0 spike fixture: 1920×1080 page with shapes + text.
 * appVersion must match SuikaEditor.appVersion (suika-editor_0.0.3).
 * Typed as IEditorPaperData via assertion — paper JSON mirrors .suika on disk.
 */
import {
  GraphicsType,
  type IEditorPaperData,
  PaintType,
} from '@suika/core';

export const HERALD_SPIKE_APP_VERSION = 'suika-editor_0.0.3';

export const heraldSpike1080Paper = {
  appVersion: HERALD_SPIKE_APP_VERSION,
  paperId: 'herald-spike-landscape-1080',
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
      id: 'page-spike',
      objectName: 'Spike 1080',
      width: 0,
      height: 0,
      type: GraphicsType.Canvas,
      transform: [1, 0, 0, 1, 0, 0],
      strokeWidth: 1,
      parentIndex: { guid: '0-0', position: 'a0' },
    },
    {
      id: 'bg-rect',
      objectName: 'Background',
      width: 1920,
      height: 1080,
      type: GraphicsType.Rect,
      transform: [1, 0, 0, 1, 0, 0],
      strokeWidth: 0,
      fill: [{ type: PaintType.Solid, attrs: { r: 15, g: 23, b: 42, a: 1 } }],
      parentIndex: { guid: 'page-spike', position: 'a0' },
    },
    {
      id: 'accent-rect',
      objectName: 'Accent',
      width: 420,
      height: 180,
      type: GraphicsType.Rect,
      transform: [1, 0, 0, 1, 120, 200],
      strokeWidth: 0,
      cornerRadius: 16,
      fill: [{ type: PaintType.Solid, attrs: { r: 59, g: 130, b: 246, a: 1 } }],
      parentIndex: { guid: 'page-spike', position: 'a1' },
    },
    {
      id: 'title-text',
      objectName: 'Title',
      type: GraphicsType.Text,
      content: 'Herald Spike 1920×1080',
      fontSize: 64,
      fontFamily: 'sans-serif',
      width: 900,
      height: 80,
      transform: [1, 0, 0, 1, 120, 420],
      strokeWidth: 1,
      fill: [{ type: PaintType.Solid, attrs: { r: 226, g: 232, b: 240, a: 1 } }],
      letterSpacing: { value: 0, units: 'PIXELS' },
      parentIndex: { guid: 'page-spike', position: 'a2' },
    },
    {
      id: 'body-text',
      objectName: 'Body',
      type: GraphicsType.Text,
      content: 'Suika → PNG → Content Library',
      fontSize: 32,
      fontFamily: 'sans-serif',
      width: 800,
      height: 48,
      transform: [1, 0, 0, 1, 120, 520],
      strokeWidth: 1,
      fill: [{ type: PaintType.Solid, attrs: { r: 148, g: 163, b: 184, a: 1 } }],
      letterSpacing: { value: 0, units: 'PIXELS' },
      parentIndex: { guid: 'page-spike', position: 'a3' },
    },
  ],
} as unknown as IEditorPaperData;
