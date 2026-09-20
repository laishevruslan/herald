import { useCallback, useEffect, useState } from 'react';
import { useEditor, useZoomRatio } from '@layerhub-io/react';
import { STUDIO_FONTS, fontStack } from '../fontCatalogue';
import { t, type StudioLang } from '../i18n';
import type { PresetId } from '../exportPng';

type Props = {
  lang: StudioLang;
  preset: PresetId;
  contentId: string | null;
  forSlideBg: boolean;
  busy: boolean;
  fontCss: string;
  onFontCss: (css: string) => void;
  onPreset: (p: PresetId) => void;
  onBack: () => void;
  onAddText: () => void;
  onAddRect: () => void;
  onOpenPicker: () => void;
  onPublish: () => void;
  onApplyFont: (css: string) => void;
};

export function Toolbar(props: Props) {
  const {
    lang, preset, contentId, forSlideBg, busy, fontCss,
    onFontCss, onPreset, onBack, onAddText, onAddRect, onOpenPicker, onPublish, onApplyFont,
  } = props;
  const editor = useEditor();
  const zoomRatio = useZoomRatio() as number;
  const [hist, setHist] = useState({ hasUndo: false, hasRedo: false });

  useEffect(() => {
    if (!editor) return;
    const onHist = (s: { hasUndo: boolean; hasRedo: boolean }) => setHist(s);
    editor.on('history:changed', onHist);
    return () => {
      editor.off('history:changed', onHist);
    };
  }, [editor]);

  const zoomLabel = `${Math.round((zoomRatio || 1) * 100)}%`;

  const run = useCallback((fn: () => void) => {
    if (!editor) return;
    fn();
  }, [editor]);

  return (
    <header className="toolbar">
      <h1>{t(lang, 'title')}</h1>
      <button type="button" onClick={onBack}>
        {forSlideBg ? t(lang, 'backSlide') : t(lang, 'back')}
      </button>
      {!contentId && (
        <select
          className="preset"
          value={preset}
          aria-label={t(lang, 'preset')}
          onChange={(e) => onPreset(e.target.value as PresetId)}
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
        onChange={(e) => {
          onFontCss(e.target.value);
          onApplyFont(e.target.value);
        }}
      >
        {STUDIO_FONTS.map((f) => (
          <option key={f.id} value={f.css} style={{ fontFamily: fontStack(f.css, f.stack) }}>
            {f.css}
          </option>
        ))}
      </select>

      <div className="tool-group" role="group" aria-label="history">
        <button type="button" disabled={!hist.hasUndo} title={t(lang, 'undo')} onClick={() => run(() => editor!.history.undo())}>
          {t(lang, 'undo')}
        </button>
        <button type="button" disabled={!hist.hasRedo} title={t(lang, 'redo')} onClick={() => run(() => editor!.history.redo())}>
          {t(lang, 'redo')}
        </button>
      </div>

      <div className="tool-group" role="group" aria-label="add">
        <button type="button" onClick={onAddText}>{t(lang, 'addText')}</button>
        <button type="button" onClick={onAddRect}>{t(lang, 'addRect')}</button>
        <button type="button" disabled={busy} onClick={onOpenPicker}>{t(lang, 'addImage')}</button>
      </div>

      <div className="tool-group" role="group" aria-label="arrange">
        <button type="button" title={t(lang, 'duplicate')} onClick={() => run(() => editor!.objects.clone())}>
          {t(lang, 'duplicate')}
        </button>
        <button type="button" title={t(lang, 'delete')} onClick={() => run(() => editor!.objects.remove())}>
          {t(lang, 'delete')}
        </button>
        <button type="button" title={t(lang, 'bringForward')} onClick={() => run(() => editor!.objects.bringForward())}>
          {t(lang, 'bringForward')}
        </button>
        <button type="button" title={t(lang, 'sendBackward')} onClick={() => run(() => editor!.objects.sendBackwards())}>
          {t(lang, 'sendBackward')}
        </button>
      </div>

      <div className="tool-group" role="group" aria-label="align">
        <button type="button" title={t(lang, 'alignLeft')} onClick={() => run(() => editor!.objects.alignLeft())}>L</button>
        <button type="button" title={t(lang, 'alignCenter')} onClick={() => run(() => editor!.objects.alignCenter())}>C</button>
        <button type="button" title={t(lang, 'alignRight')} onClick={() => run(() => editor!.objects.alignRight())}>R</button>
        <button type="button" title={t(lang, 'alignTop')} onClick={() => run(() => editor!.objects.alignTop())}>T</button>
        <button type="button" title={t(lang, 'alignMiddle')} onClick={() => run(() => editor!.objects.alignMiddle())}>M</button>
        <button type="button" title={t(lang, 'alignBottom')} onClick={() => run(() => editor!.objects.alignBottom())}>B</button>
      </div>

      <div className="tool-group" role="group" aria-label="zoom">
        <button type="button" title={t(lang, 'zoomOut')} onClick={() => run(() => editor!.zoom.zoomOut())}>−</button>
        <span className="zoom-label" title={zoomLabel}>{zoomLabel}</span>
        <button type="button" title={t(lang, 'zoomIn')} onClick={() => run(() => editor!.zoom.zoomIn())}>+</button>
        <button type="button" title={t(lang, 'zoomFit')} onClick={() => run(() => editor!.zoom.zoomToFit())}>
          {t(lang, 'zoomFit')}
        </button>
        <button type="button" title={t(lang, 'zoomOne')} onClick={() => run(() => editor!.zoom.zoomToOne())}>
          {t(lang, 'zoomOne')}
        </button>
      </div>

      <button
        type="button"
        className="primary"
        data-testid="publish-library"
        disabled={busy}
        onClick={onPublish}
      >
        {t(lang, 'publish')}
      </button>
      <p className="hint">
        {t(lang, 'subtitle')}{' '}
        {forSlideBg ? t(lang, 'forSlideBg') : t(lang, 'cyrillicNote')}
      </p>
    </header>
  );
}
