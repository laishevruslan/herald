import { fabric } from 'fabric';

/** Logical poster size (D-SC-6 landscape-1080). */
export const POSTER_W = 1920;
export const POSTER_H = 1080;

/** On-screen editor size — smaller so the spike fits a laptop; multiplier restores px. */
export const DISPLAY_W = 960;
export const DISPLAY_H = 540;

export type FabricCanvas = InstanceType<typeof fabric.Canvas>;

export function exportMultiplier(): number {
  return POSTER_W / DISPLAY_W;
}

/**
 * Rasterize the Fabric canvas to a PNG Blob at the logical poster size.
 * Waits for document.fonts so Inter is in the bitmap (plan §10 risk).
 */
export async function canvasToPngBlob(canvas: FabricCanvas): Promise<Blob> {
  await document.fonts.ready;
  const multiplier = exportMultiplier();
  const dataUrl = canvas.toDataURL({
    format: 'png',
    multiplier,
    enableRetinaScaling: false,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Expose last export for Playwright verify (spike only). */
export function rememberExportForVerify(blob: Blob): void {
  const w = window as Window & { __STUDIO_SPIKE_LAST_PNG__?: Blob };
  w.__STUDIO_SPIKE_LAST_PNG__ = blob;
}
