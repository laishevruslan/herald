import { type IRGBA } from '@suika/core';
import { type FC } from 'react';
import { SketchPicker } from 'react-color';

import { useHeraldChrome } from '../../herald/chrome';

interface IProps {
  color: IRGBA;
  onChange: (color: IRGBA) => void;
  onChangeComplete: (color: IRGBA) => void;
}

export const SolidPicker: FC<IProps> = ({
  color,
  onChange,
  onChangeComplete,
}) => {
  const chrome = useHeraldChrome();
  const handleColor = (newColor: IRGBA) => {
    onChange(newColor);
  };
  const swatches = chrome?.swatches?.length ? chrome.swatches : undefined;

  return (
    <div>
      <SketchPicker
        presetColors={swatches}
        color={color}
        onChange={(newColor) => {
          handleColor({ ...newColor.rgb, a: newColor.rgb.a || 1 });
        }}
        onChangeComplete={(newColor) => {
          const rgba = { ...newColor.rgb, a: newColor.rgb.a || 1 };
          handleColor(rgba);
          onChangeComplete(rgba);
        }}
      />
    </div>
  );
};
