export type FabricCanvas = any;

export const PRESETS = {
  'landscape-1080': { width: 1920, height: 1080, id: 'landscape-1080' as const },
  'portrait-1080': { width: 1080, height: 1920, id: 'portrait-1080' as const },
  'epaper-5x3': { width: 800, height: 480, id: 'epaper-5x3' as const },
};

export type PresetId = keyof typeof PRESETS;

export function displaySize(logicalW: number, logicalH: number): { dw: number; dh: number } {
  const max = 960;
  if (logicalW >= logicalH) {
    return { dw: max, dh: Math.max(1, Math.round((max * logicalH) / logicalW)) };
  }
  return { dw: Math.max(1, Math.round((max * logicalW) / logicalH)), dh: max };
}

export function exportMultiplier(logicalW: number, displayW: number): number {
  return logicalW / displayW;
}

/** PNG at logical frame size via Layerhub offscreen renderer (D-SC-6). */
export async function editorToPngBlob(editor: {
  scene: { exportToJSON: () => unknown };
  renderer: { toDataURL: (template: unknown, params: Record<string, unknown>) => Promise<unknown> };
}): Promise<Blob> {
  await document.fonts.ready;
  const template = editor.scene.exportToJSON();
  const dataUrl = (await editor.renderer.toDataURL(template, {})) as string;
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    throw new Error('PNG export failed');
  }
  const res = await fetch(dataUrl);
  return res.blob();
}

/** @deprecated Prefer editorToPngBlob — kept for legacy fabric canvas paths. */
export async function canvasToPngBlob(
  canvas: FabricCanvas,
  logicalW: number,
  displayW: number,
): Promise<Blob> {
  await document.fonts.ready;
  const multiplier = exportMultiplier(logicalW, displayW);
  const dataUrl = canvas.toDataURL({
    format: 'png',
    multiplier,
    enableRetinaScaling: false,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function rememberExportForVerify(blob: Blob): void {
  const w = window as Window & { __STUDIO_SPIKE_LAST_PNG__?: Blob };
  w.__STUDIO_SPIKE_LAST_PNG__ = blob;
}

export function presetFromDims(width: number, height: number): PresetId {
  if (width === 1080 && height === 1920) return 'portrait-1080';
  if (width === 800 && height === 480) return 'epaper-5x3';
  return 'landscape-1080';
}
