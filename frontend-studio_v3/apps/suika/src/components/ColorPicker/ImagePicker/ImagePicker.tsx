import './ImagePicker.scss';

import { DEFAULT_IMAGE_SRC } from '@suika/core';
import { useMount } from 'ahooks';
import { type FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';

import { useHeraldChrome } from '../../../herald/chrome';
import { requestHeraldImage } from '../../../herald/image-request';

interface IProps {
  value: string;
  heraldContentId?: string;
  onChange: (src: string, meta?: { heraldContentId?: string }) => void;
}
export const ImagePicker: FC<IProps> = ({
  value,
  heraldContentId,
  onChange,
}) => {
  const chrome = useHeraldChrome();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useMount(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // only image

    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        setTimeout(() => {
          onChange(src);
        });
      };
      reader.readAsDataURL(file);
    };

    fileInputRef.current = fileInput;
  });

  return (
    <div className="suika-image-picker">
      <div className="suika-img-content">
        <img className="suika-img-preview" src={value || DEFAULT_IMAGE_SRC} />
        <div className="suika-img-choose-btn-wrapper">
          <button
            className="suika-img-choose-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FormattedMessage id="uploadFile" />
          </button>
          {chrome?.active && (
            <button
              className="suika-img-choose-btn"
              onClick={() => {
                void requestHeraldImage(heraldContentId).then((picked) => {
                  if (!picked) return;
                  onChange(picked.url, {
                    heraldContentId: picked.contentId,
                  });
                });
              }}
            >
              <FormattedMessage id="herald.fromLibrary" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
