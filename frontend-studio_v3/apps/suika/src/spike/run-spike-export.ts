/**
 * Phase 0 spike: load a 1920×1080 fixture and expose PNG for headless verify.
 * Activated with ?spike=export (no Herald save bridge — that is Phase 1).
 */
import { exportService, type SuikaEditor } from '@suika/core';

import { heraldSpike1080Paper } from './herald-spike-paper';

declare global {
  interface Window {
    __SUIKA_SPIKE_LAST_PNG__?: Blob;
    __SUIKA_SPIKE_READY__?: boolean;
    __SUIKA_SPIKE_ERROR__?: string;
  }
}

export function isSpikeExportMode(): boolean {
  return new URLSearchParams(location.search).get('spike') === 'export';
}

export async function runSpikeExport(editor: SuikaEditor): Promise<void> {
  try {
    editor.setContents(heraldSpike1080Paper);
    editor.render();
    // Allow fonts / layout a beat before rasterising.
    await new Promise((r) => setTimeout(r, 400));
    const blob = await exportService.getCurrentPagePNGBlob(editor);
    if (!blob) {
      throw new Error('spike export produced no PNG');
    }
    window.__SUIKA_SPIKE_LAST_PNG__ = blob;
    window.__SUIKA_SPIKE_READY__ = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    window.__SUIKA_SPIKE_ERROR__ = message;
    console.error('[suika-spike]', message);
  }
}
