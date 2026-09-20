import { useEffect, useState } from 'react';
import { useActiveObject, useEditor } from '@layerhub-io/react';
import { STUDIO_FONTS, fontStack } from '../fontCatalogue';
import { t, type StudioLang } from '../i18n';

type Props = {
  lang: StudioLang;
  brandSwatches: string[];
};

function isText(type: string | undefined): boolean {
  return type === 'StaticText' || type === 'textbox' || type === 'i-text' || type === 'text';
}

export function PropertiesPanel({ lang, brandSwatches }: Props) {
  const editor = useEditor();
  const active = useActiveObject() as {
    type?: string;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    opacity?: number;
    id?: string;
  } | null;

  const [text, setText] = useState('');
  const [fill, setFill] = useState('#111827');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(100);
  const [fontCss, setFontCss] = useState('Inter');

  useEffect(() => {
    if (!active) return;
    setText(String(active.text || ''));
    setFill(typeof active.fill === 'string' ? active.fill : '#111827');
    setFontSize(Number(active.fontSize) || 36);
    setOpacity(Math.round((active.opacity ?? 1) * 100));
    const fam = String(active.fontFamily || 'Inter');
    const match = STUDIO_FONTS.find((f) => fam.includes(f.css));
    setFontCss(match?.css || 'Inter');
  }, [active]);

  if (!active || active.type === 'Frame' || active.type === 'Background') {
    return (
      <aside className="side-panel props-panel" aria-label={t(lang, 'properties')}>
        <h2>{t(lang, 'properties')}</h2>
        <p className="muted">{t(lang, 'noSelection')}</p>
        {editor && (
          <label className="prop-field">
            <span>{t(lang, 'background')}</span>
            <input
              type="color"
              defaultValue="#ffffff"
              onChange={(e) => editor.frame.setBackgroundColor(e.target.value)}
            />
          </label>
        )}
      </aside>
    );
  }

  const update = (partial: Record<string, unknown>) => {
    if (!editor) return;
    editor.objects.update(partial as never);
  };

  return (
    <aside className="side-panel props-panel" aria-label={t(lang, 'properties')}>
      <h2>{t(lang, 'properties')}</h2>

      {isText(active.type) && (
        <label className="prop-field">
          <span>{t(lang, 'textContent')}</span>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              update({ text: e.target.value });
            }}
          />
        </label>
      )}

      {isText(active.type) && (
        <label className="prop-field">
          <span>{t(lang, 'fontFamily')}</span>
          <select
            value={fontCss}
            onChange={(e) => {
              setFontCss(e.target.value);
              update({ fontFamily: fontStack(e.target.value) });
            }}
          >
            {STUDIO_FONTS.map((f) => (
              <option key={f.id} value={f.css}>{f.css}</option>
            ))}
          </select>
        </label>
      )}

      {isText(active.type) && (
        <label className="prop-field">
          <span>{t(lang, 'fontSize')}</span>
          <input
            type="number"
            min={8}
            max={400}
            value={fontSize}
            onChange={(e) => {
              const v = Number(e.target.value) || 36;
              setFontSize(v);
              update({ fontSize: v });
            }}
          />
        </label>
      )}

      <label className="prop-field">
        <span>{t(lang, 'fillColor')}</span>
        <input
          type="color"
          value={fill.startsWith('#') ? fill : '#111827'}
          onChange={(e) => {
            setFill(e.target.value);
            update({ fill: e.target.value });
          }}
        />
      </label>

      {brandSwatches.length > 0 && (
        <div className="prop-swatches" role="group" aria-label={t(lang, 'brandColors')}>
          {brandSwatches.map((hex) => (
            <button
              key={hex}
              type="button"
              className="swatch"
              title={`${t(lang, 'applyFill')} ${hex}`}
              style={{ background: hex }}
              onClick={() => {
                setFill(hex);
                update({ fill: hex });
              }}
            />
          ))}
        </div>
      )}

      <label className="prop-field">
        <span>{t(lang, 'opacity')}</span>
        <input
          type="range"
          min={5}
          max={100}
          value={opacity}
          onChange={(e) => {
            const v = Number(e.target.value);
            setOpacity(v);
            update({ opacity: v / 100 });
          }}
        />
      </label>

      <div className="prop-actions">
        <button type="button" onClick={() => editor?.objects.lock()}>{t(lang, 'lock')}</button>
        <button type="button" onClick={() => editor?.objects.unlock()}>{t(lang, 'unlock')}</button>
        <button type="button" onClick={() => editor?.objects.clone()}>{t(lang, 'duplicate')}</button>
        <button type="button" onClick={() => editor?.objects.remove()}>{t(lang, 'delete')}</button>
      </div>
    </aside>
  );
}
