import { t, type StudioLang } from '../i18n';
import type { ContentRow } from '../api';

type Props = {
  lang: StudioLang;
  images: ContentRow[];
  onClose: () => void;
  onPick: (row: ContentRow) => void;
};

export function ImagePicker({ lang, images, onClose, onPick }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header>
          <h2>{t(lang, 'pickImage')}</h2>
          <button type="button" onClick={onClose}>{t(lang, 'close')}</button>
        </header>
        <div className="picker-grid">
          {images.length === 0 && <p className="hint">{t(lang, 'noImages')}</p>}
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              className="picker-item"
              onClick={() => onPick(img)}
            >
              <span>{img.filename}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
