import { useEditor, useObjects } from '@layerhub-io/react';
import { t, type StudioLang } from '../i18n';

type LayerObj = {
  id?: string;
  type?: string;
  name?: string;
  text?: string;
};

function labelFor(lang: StudioLang, o: LayerObj): string {
  const type = String(o.type || '');
  if (type === 'StaticText' || type === 'textbox' || type === 'i-text' || type === 'text') {
    const preview = (o.text || '').trim().slice(0, 28);
    return preview ? `${t(lang, 'layerText')}: ${preview}` : t(lang, 'layerText');
  }
  if (type === 'StaticPath' || type === 'rect') return t(lang, 'layerRect');
  if (type === 'StaticImage' || type === 'image') return t(lang, 'layerImage');
  return o.name || t(lang, 'layerOther');
}

export function LayersPanel({ lang }: { lang: StudioLang }) {
  const editor = useEditor();
  const objects = (useObjects() as LayerObj[]) || [];
  // Show top-most first (canvas stack order is bottom→top).
  const rows = [...objects].reverse();

  return (
    <aside className="side-panel layers-panel" aria-label={t(lang, 'layers')}>
      <h2>{t(lang, 'layers')}</h2>
      <ul className="layer-list">
        {rows.length === 0 && <li className="muted">{t(lang, 'noSelection')}</li>}
        {rows.map((o, i) => (
          <li key={o.id || `${o.type}-${i}`}>
            <button
              type="button"
              className="layer-item"
              onClick={() => {
                if (!editor || !o.id) return;
                editor.objects.select(o.id);
              }}
            >
              {labelFor(lang, o)}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
