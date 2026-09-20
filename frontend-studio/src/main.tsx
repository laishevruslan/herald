import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fabric } from 'fabric';
import {
  POSTER_W,
  POSTER_H,
  DISPLAY_W,
  DISPLAY_H,
  canvasToPngBlob,
  downloadBlob,
  rememberExportForVerify,
  type FabricCanvas,
} from './exportPng';
import { detectLang, t, type StudioLang } from './i18n';
import './fonts.css';
import './styles.css';

type Status = { kind: 'ok' | 'err' | 'info'; text: string };

function App() {
  const lang: StudioLang = detectLang();
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'info', text: t(lang, 'fontWait') });
  const [busy, setBusy] = useState(false);
  const [layerhubNote, setLayerhubNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prove the MIT pin resolves at runtime (not just package.json).
        await import('@layerhub-io/core');
        if (!cancelled) setLayerhubNote(t(lang, 'layerhubOk'));
      } catch {
        if (!cancelled) setLayerhubNote(t(lang, 'layerhubFail'));
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    if (!canvasEl.current) return;
    const canvas = new fabric.Canvas(canvasEl.current, {
      width: DISPLAY_W,
      height: DISPLAY_H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;

    const headline = new fabric.Textbox('SALE −30%', {
      left: 80,
      top: 180,
      width: DISPLAY_W - 160,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '700',
      fontSize: 72,
      fill: '#111827',
      textAlign: 'center',
    });
    const sub = new fabric.Textbox('Poster editor spike — not a slide', {
      left: 80,
      top: 290,
      width: DISPLAY_W - 160,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '400',
      fontSize: 28,
      fill: '#4b5563',
      textAlign: 'center',
    });
    const badge = new fabric.Rect({
      left: DISPLAY_W / 2 - 90,
      top: 380,
      width: 180,
      height: 48,
      rx: 8,
      ry: 8,
      fill: '#2563eb',
    });
    canvas.add(headline, sub, badge);
    canvas.requestRenderAll();

    let alive = true;
    (async () => {
      try {
        await document.fonts.load('700 72px Inter');
        await document.fonts.ready;
        if (!alive) return;
        // Re-render after font load so the bitmap matches the face we export.
        canvas.requestRenderAll();
        setStatus({
          kind: 'ok',
          text: t(lang, 'ready', { w: POSTER_W, h: POSTER_H, dw: DISPLAY_W, dh: DISPLAY_H }),
        });
      } catch {
        if (!alive) return;
        setStatus({ kind: 'err', text: t(lang, 'fontFail') });
      }
    })();

    return () => {
      alive = false;
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [lang]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.add(new fabric.Textbox('New text', {
      left: 120,
      top: 120,
      width: 400,
      fontFamily: 'Inter, sans-serif',
      fontSize: 36,
      fill: '#111827',
    }));
    canvas.requestRenderAll();
  }, []);

  const addRect = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.add(new fabric.Rect({
      left: 160,
      top: 160,
      width: 200,
      height: 120,
      fill: '#f59e0b',
      rx: 6,
      ry: 6,
    }));
    canvas.requestRenderAll();
  }, []);

  const exportPng = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBusy(true);
    setStatus({ kind: 'info', text: t(lang, 'exporting') });
    try {
      const blob = await canvasToPngBlob(canvas);
      rememberExportForVerify(blob);
      downloadBlob(blob, 'studio-spike-1920x1080.png');
      setStatus({
        kind: 'ok',
        text: t(lang, 'exported', {
          w: POSTER_W,
          h: POSTER_H,
          kb: Math.round(blob.size / 1024),
        }),
      });
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  }, [lang]);

  return (
    <div className="app">
      <header className="toolbar">
        <h1>{t(lang, 'title')}</h1>
        <button type="button" onClick={addText}>{t(lang, 'addText')}</button>
        <button type="button" onClick={addRect}>{t(lang, 'addRect')}</button>
        <button
          type="button"
          className="primary"
          data-testid="export-png"
          disabled={busy}
          onClick={() => { void exportPng(); }}
        >
          {t(lang, 'exportPng')}
        </button>
        <p className="hint">{t(lang, 'subtitle')} {t(lang, 'cyrillicNote')}</p>
      </header>
      <div className="stage-wrap">
        <div className="stage">
          <canvas ref={canvasEl} />
        </div>
      </div>
      <footer className={`status ${status.kind}`}>
        {status.text}
        {layerhubNote ? ` · ${layerhubNote}` : ''}
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
