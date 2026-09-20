import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditor } from '@layerhub-io/react';
import {
  PRESETS,
  editorToPngBlob,
  rememberExportForVerify,
  presetFromDims,
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
import { serializeSceneFromTemplate } from './scene';
import { STUDIO_FONTS, fontStack } from './fontCatalogue';
import { loadBrandColors, type BrandColors } from './brand';
import { Toolbar } from './components/Toolbar';
import { LayersPanel } from './components/LayersPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ContextMenu } from './components/ContextMenu';
import { ImagePicker } from './components/ImagePicker';
import { EditorStage } from './components/EditorStage';

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

function rectPath(w: number, h: number): (string | number)[][] {
  return [['M', 0, 0], ['L', w, 0], ['L', w, h], ['L', 0, h], ['z']];
}

/** Actions that need useEditor — must live under Provider + next to Canvas. */
function EditorActions(props: {
  lang: StudioLang;
  preset: PresetId;
  contentId: string | null;
  forSlideBg: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setStatus: (s: Status) => void;
  setContentId: (id: string | null) => void;
  fontCss: string;
  setFontCss: (c: string) => void;
  brand: BrandColors | null;
  onBack: () => void;
  onPreset: (p: PresetId) => void;
}) {
  const {
    lang, preset, contentId, forSlideBg, busy, setBusy, setStatus, setContentId,
    fontCss, setFontCss, brand, onBack, onPreset,
  } = props;
  const editor = useEditor();
  const logical = PRESETS[preset];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [images, setImages] = useState<ContentRow[]>([]);

  const addText = useCallback(() => {
    if (!editor) return;
    const bodyCss = STUDIO_FONTS.find((f) => f.id === brand?.fontBody)?.css || fontCss;
    void editor.objects.add({
      type: 'StaticText',
      text: t(lang, 'newTextDefault'),
      width: Math.min(480, logical.width - 80),
      fontFamily: fontStack(bodyCss),
      fontSize: Math.round(logical.width * 0.03),
      fill: brand?.primary || '#111827',
    });
  }, [editor, lang, logical.width, fontCss, brand]);

  const addRect = useCallback(() => {
    if (!editor) return;
    const w = 200;
    const h = 120;
    void editor.objects.add({
      type: 'StaticPath',
      path: rectPath(w, h),
      width: w,
      height: h,
      fill: brand?.primary || '#f59e0b',
    });
  }, [editor, brand]);

  const applyFontToSelection = useCallback((css: string) => {
    setFontCss(css);
    if (!editor) return;
    editor.objects.update({ fontFamily: fontStack(css) });
  }, [editor, setFontCss]);

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
  }, [setBusy, setStatus]);

  const addLibraryImage = useCallback(async (row: ContentRow) => {
    if (!editor) return;
    setBusy(true);
    try {
      const url = await fetchImageBlobUrl(row.id);
      await editor.objects.add({
        type: 'StaticImage',
        src: url,
        metadata: { contentId: row.id },
      });
      // Scale large images down to ~45% of frame width.
      const active = editor.canvas.canvas.getActiveObject() as {
        width?: number;
        scaleX?: number;
        scaleY?: number;
        set?: (o: Record<string, number>) => void;
      } | null;
      if (active?.width && active.width > 0) {
        const maxW = logical.width * 0.45;
        const scale = Math.min(1, maxW / active.width);
        active.set?.({ scaleX: scale, scaleY: scale });
        editor.canvas.canvas.requestRenderAll();
        editor.history.save();
      }
      setPickerOpen(false);
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [editor, logical.width, setBusy, setStatus]);

  const publish = useCallback(async () => {
    if (!editor) return;
    setBusy(true);
    setStatus({ kind: 'info', text: t(lang, 'publishing') });
    try {
      const png = await editorToPngBlob(editor);
      rememberExportForVerify(png);
      if (!localStorage.getItem('token')) {
        setStatus({ kind: 'err', text: t(lang, 'needLogin') });
        return;
      }
      const template = editor.scene.exportToJSON();
      const scene = serializeSceneFromTemplate(template);
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
        text: t(lang, result.draft || result.pending_review ? 'publishedDraft' : 'published', {
          id: result.content_id.slice(0, 8),
        }),
      });
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [editor, lang, logical, contentId, preset, forSlideBg, setBusy, setStatus, setContentId]);

  return (
    <>
      <Toolbar
        lang={lang}
        preset={preset}
        contentId={contentId}
        forSlideBg={forSlideBg}
        busy={busy}
        fontCss={fontCss}
        onFontCss={setFontCss}
        onPreset={onPreset}
        onBack={onBack}
        onAddText={addText}
        onAddRect={addRect}
        onOpenPicker={() => { void openPicker(); }}
        onPublish={() => { void publish(); }}
        onApplyFont={applyFontToSelection}
      />
      {pickerOpen && (
        <ImagePicker
          lang={lang}
          images={images}
          onClose={() => setPickerOpen(false)}
          onPick={(row) => { void addLibraryImage(row); }}
        />
      )}
    </>
  );
}

export function App() {
  const initial = useMemo(() => readQuery(), []);
  const lang = initial.lang;
  const forSlideBg = initial.forSlideBg;
  const [preset, setPreset] = useState<PresetId>(initial.preset);
  const [contentId, setContentId] = useState<string | null>(initial.contentId);
  const [bootstrapped, setBootstrapped] = useState(!initial.contentId);
  const [status, setStatus] = useState<Status>({ kind: 'info', text: t(lang, 'fontWait') });
  const [busy, setBusy] = useState(false);
  const [fontCss, setFontCss] = useState<string>(STUDIO_FONTS[0].css);
  const [brand, setBrand] = useState<BrandColors | null>(null);

  useEffect(() => {
    let alive = true;
    loadBrandColors().then((c) => { if (alive) setBrand(c); });
    return () => { alive = false; };
  }, []);

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
    <div className="app editor-app">
      <EditorActions
        lang={lang}
        preset={preset}
        contentId={contentId}
        forSlideBg={forSlideBg}
        busy={busy}
        setBusy={setBusy}
        setStatus={setStatus}
        setContentId={setContentId}
        fontCss={fontCss}
        setFontCss={setFontCss}
        brand={brand}
        onBack={goBack}
        onPreset={setPreset}
      />

      {swatches.length > 0 && (
        <div className="brand-bar" role="group" aria-label={t(lang, 'brandColors')}>
          <span className="brand-label">{t(lang, 'brandColors')}</span>
          {swatches.map((hex) => (
            <BrandSwatch key={hex} hex={hex} lang={lang} />
          ))}
        </div>
      )}

      {preset === 'epaper-5x3' && (
        <p className="epaper-warn" role="note">{t(lang, 'epaperWarn')}</p>
      )}

      <div className="workspace">
        <LayersPanel lang={lang} />
        <div className="stage-wrap">
          {bootstrapped && (
            <EditorStage
              key={`${preset}:${contentId || 'new'}`}
              preset={preset}
              contentId={contentId}
              lang={lang}
              onStatus={setStatus}
            />
          )}
        </div>
        <PropertiesPanel lang={lang} brandSwatches={swatches} />
      </div>

      <ContextMenu lang={lang} />
      <footer className={`status ${status.kind}`}>{status.text}</footer>
    </div>
  );
}

function BrandSwatch({ hex, lang }: { hex: string; lang: StudioLang }) {
  const editor = useEditor();
  return (
    <button
      type="button"
      className="swatch"
      title={`${t(lang, 'applyFill')} ${hex}`}
      style={{ background: hex }}
      onClick={() => {
        if (!editor) return;
        editor.objects.update({ fill: hex });
      }}
    />
  );
}
