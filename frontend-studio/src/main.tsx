import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fabric } from 'fabric';
import {
  PRESETS,
  displaySize,
  canvasToPngBlob,
  rememberExportForVerify,
  presetFromDims,
  type FabricCanvas,
  type PresetId,
} from './exportPng';
import { detectLang, t, type StudioLang } from './i18n';
import {
  fetchImageBlobUrl,
  listLibraryImages,
  loadDesign,
  publishToLibrary,
  type ContentRow,
} from './api';
import { applyScene, seedDefaultPoster, serializeScene } from './scene';
import { STUDIO_FONTS, fontStack, waitForStudioFonts } from './fontCatalogue';
import { loadBrandColors, type BrandColors } from './brand';
import './fonts.css';
import './styles.css';

type Status = { kind: 'ok' | 'err' | 'info'; text: string };

const SLIDE_BG_KEY = 'studio.slideBgReturn';

function parsePreset(raw: string | null): PresetId {
  if (raw === 'portrait-1080' || raw === 'epaper-5x3' || raw === 'landscape-1080') return raw;
  return 'landscape-1080';
}

function readQuery(): {
  preset: PresetId;
  contentId: string | null;
  lang: StudioLang;
  forSlideBg: boolean;
} {
  const q = new URLSearchParams(window.location.search);
  return {
    preset: parsePreset(q.get('preset')),
    contentId: q.get('contentId') || q.get('content_id'),
    lang: detectLang(),
    forSlideBg: q.get('for') === 'slide-bg',
  };
}

function App() {
  const initial = useMemo(() => readQuery(), []);
  const lang = initial.lang;
  const forSlideBg = initial.forSlideBg;
  const [preset, setPreset] = useState<PresetId>(initial.preset);
  const [contentId, setContentId] = useState<string | null>(initial.contentId);
  const [bootstrapped, setBootstrapped] = useState(!initial.contentId);
  const logical = PRESETS[preset];
  const { dw, dh } = displaySize(logical.width, logical.height);

  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'info', text: t(lang, 'fontWait') });
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<ContentRow[]>([]);
  const [fontCss, setFontCss] = useState<string>(STUDIO_FONTS[0].css);
  const [brand, setBrand] = useState<BrandColors | null>(null);

  useEffect(() => {
    let alive = true;
    loadBrandColors().then((c) => { if (alive) setBrand(c); });
    return () => { alive = false; };
  }, []);

  // Resolve preset from existing design before mounting the canvas.
  useEffect(() => {
    if (!initial.contentId) return;
    let alive = true;
    (async () => {
      try {
        const design = await loadDesign(initial.contentId!);
        if (!alive) return;
        setPreset(presetFromDims(design.width, design.height));
        setBootstrapped(true);
      } catch (e) {
        if (!alive) return;
        setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
        setBootstrapped(true);
      }
    })();
    return () => { alive = false; };
  }, [initial.contentId]);

  useEffect(() => {
    if (!bootstrapped || !canvasEl.current) return;
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }
    const canvas = new fabric.Canvas(canvasEl.current, {
      width: dw,
      height: dh,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;

    let alive = true;
    (async () => {
      try {
        await waitForStudioFonts();
        if (!alive) return;
        if (contentId) {
          const design = await loadDesign(contentId);
          await applyScene(canvas, design.scene_json?.objects || []);
          setStatus({
            kind: 'ok',
            text: t(lang, 'readyEdit', { w: design.width, h: design.height }),
          });
        } else {
          seedDefaultPoster(canvas, dw, dh);
          setStatus({
            kind: 'ok',
            text: t(lang, 'ready', { w: logical.width, h: logical.height, dw, dh }),
          });
        }
      } catch (e) {
        if (!alive) return;
        setStatus({
          kind: 'err',
          text: e instanceof Error ? e.message : t(lang, 'fontFail'),
        });
      }
    })();

    return () => {
      alive = false;
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [bootstrapped, preset, contentId, dw, dh, lang, logical.width, logical.height]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.add(new fabric.Textbox(t(lang, 'newTextDefault'), {
      left: 40,
      top: 40,
      width: Math.min(400, dw - 80),
      fontFamily: fontStack(fontCss),
      fontSize: 36,
      fill: brand?.primary || '#111827',
    }));
    canvas.requestRenderAll();
  }, [lang, dw, fontCss, brand]);

  const addRect = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.add(new fabric.Rect({
      left: 80,
      top: 80,
      width: 200,
      height: 120,
      fill: brand?.primary || '#f59e0b',
      rx: 6,
      ry: 6,
    }));
    canvas.requestRenderAll();
  }, [brand]);

  const applyFontToSelection = useCallback((css: string) => {
    setFontCss(css);
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject() as any;
    if (!active) return;
    const stack = fontStack(css);
    if (active.type === 'activeSelection' && active.forEachObject) {
      active.forEachObject((o: any) => {
        if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
          o.set('fontFamily', stack);
        }
      });
    } else if (active.type === 'textbox' || active.type === 'i-text' || active.type === 'text') {
      active.set('fontFamily', stack);
    }
    canvas.requestRenderAll();
  }, []);

  const applyFill = useCallback((hex: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject() as any;
    if (!active) return;
    if (active.type === 'activeSelection' && active.forEachObject) {
      active.forEachObject((o: any) => { o.set('fill', hex); });
    } else {
      active.set('fill', hex);
    }
    canvas.requestRenderAll();
  }, []);

  const openPicker = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await listLibraryImages();
      setImages(rows);
      setPickerOpen(true);
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, []);

  const addLibraryImage = useCallback(async (row: ContentRow) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const url = await fetchImageBlobUrl(row.id);
      await new Promise<void>((resolve, reject) => {
        fabric.Image.fromURL(url, (img: any) => {
          if (!img) { reject(new Error('image load failed')); return; }
          const maxW = dw * 0.45;
          const scale = Math.min(1, maxW / (img.width || maxW));
          img.contentId = row.id;
          img.set({ left: 60, top: 60, scaleX: scale, scaleY: scale });
          canvas.add(img);
          canvas.requestRenderAll();
          resolve();
        });
      });
      setPickerOpen(false);
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [dw]);

  const publish = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBusy(true);
    setStatus({ kind: 'info', text: t(lang, 'publishing') });
    try {
      const png = await canvasToPngBlob(canvas, logical.width, dw);
      rememberExportForVerify(png);
      if (!localStorage.getItem('token')) {
        setStatus({ kind: 'err', text: t(lang, 'needLogin') });
        return;
      }
      const scene = serializeScene(canvas);
      const result = await publishToLibrary({
        png,
        scene,
        contentId,
        preset,
        width: logical.width,
        height: logical.height,
        name: forSlideBg ? 'Slide background.png' : 'Studio poster.png',
      });
      setContentId(result.content_id);
      if (forSlideBg) {
        try {
          const prev = JSON.parse(sessionStorage.getItem(SLIDE_BG_KEY) || '{}');
          sessionStorage.setItem(SLIDE_BG_KEY, JSON.stringify({
            ...prev,
            contentId: result.content_id,
            done: true,
          }));
        } catch {
          sessionStorage.setItem(SLIDE_BG_KEY, JSON.stringify({
            contentId: result.content_id,
            done: true,
          }));
        }
        setStatus({ kind: 'ok', text: t(lang, 'publishedSlideBg') });
        window.setTimeout(() => { window.location.href = '/#/slides'; }, 400);
        return;
      }
      setStatus({
        kind: 'ok',
        text: t(lang, 'published', { id: result.content_id.slice(0, 8) }),
      });
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [lang, logical, dw, contentId, preset, forSlideBg]);

  const goBack = useCallback(() => {
    if (forSlideBg) {
      try {
        const prev = JSON.parse(sessionStorage.getItem(SLIDE_BG_KEY) || '{}');
        if (prev && prev.pending && !prev.done) sessionStorage.removeItem(SLIDE_BG_KEY);
      } catch { /* ignore */ }
      window.location.href = '/#/slides';
      return;
    }
    window.location.href = '/#/content';
  }, [forSlideBg]);

  const swatches = brand?.swatches || [];

  return (
    <div className="app">
      <header className="toolbar">
        <h1>{t(lang, 'title')}</h1>
        <button type="button" onClick={goBack}>
          {forSlideBg ? t(lang, 'backSlide') : t(lang, 'back')}
        </button>
        {!contentId && (
          <select
            className="preset"
            value={preset}
            aria-label={t(lang, 'preset')}
            onChange={(e) => setPreset(e.target.value as PresetId)}
          >
            <option value="landscape-1080">{t(lang, 'presetLandscape')}</option>
            <option value="portrait-1080">{t(lang, 'presetPortrait')}</option>
            <option value="epaper-5x3">{t(lang, 'presetEpaper')}</option>
          </select>
        )}
        <select
          className="preset"
          value={fontCss}
          aria-label={t(lang, 'fontFamily')}
          onChange={(e) => applyFontToSelection(e.target.value)}
        >
          {STUDIO_FONTS.map((f) => (
            <option key={f.id} value={f.css} style={{ fontFamily: fontStack(f.css, f.stack) }}>
              {f.css}
            </option>
          ))}
        </select>
        <button type="button" onClick={addText}>{t(lang, 'addText')}</button>
        <button type="button" onClick={addRect}>{t(lang, 'addRect')}</button>
        <button type="button" disabled={busy} onClick={() => { void openPicker(); }}>
          {t(lang, 'addImage')}
        </button>
        <button
          type="button"
          className="primary"
          data-testid="publish-library"
          disabled={busy}
          onClick={() => { void publish(); }}
        >
          {t(lang, 'publish')}
        </button>
        <p className="hint">
          {t(lang, 'subtitle')}{' '}
          {forSlideBg ? t(lang, 'forSlideBg') : t(lang, 'cyrillicNote')}
        </p>
      </header>

      {swatches.length > 0 && (
        <div className="brand-bar" role="group" aria-label={t(lang, 'brandColors')}>
          <span className="brand-label">{t(lang, 'brandColors')}</span>
          {swatches.map((hex) => (
            <button
              key={hex}
              type="button"
              className="swatch"
              title={`${t(lang, 'applyFill')} ${hex}`}
              style={{ background: hex }}
              onClick={() => applyFill(hex)}
            />
          ))}
        </div>
      )}

      {preset === 'epaper-5x3' && (
        <p className="epaper-warn" role="note">{t(lang, 'epaperWarn')}</p>
      )}

      <div className="stage-wrap">
        <div className="stage">
          <canvas ref={canvasEl} />
        </div>
      </div>
      <footer className={`status ${status.kind}`}>{status.text}</footer>

      {pickerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <header>
              <h2>{t(lang, 'pickImage')}</h2>
              <button type="button" onClick={() => setPickerOpen(false)}>{t(lang, 'close')}</button>
            </header>
            <div className="picker-grid">
              {images.length === 0 && <p className="hint">{t(lang, 'noImages')}</p>}
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="picker-item"
                  onClick={() => { void addLibraryImage(img); }}
                >
                  <span>{img.filename}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
