import { type SuikaEditor } from '@suika/core';
import { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { PRESET_SIZE, safeZoneRatio } from '../../herald/presets';
import { type HeraldPresetId } from '../../herald/query';

interface IProps {
  editor: SuikaEditor;
  preset: HeraldPresetId;
  enabled: boolean;
}

type Frame = { left: number; top: number; width: number; height: number };

/**
 * Viewport overlay only. It is not a scene node, so toJSON() and the PNG omit it.
 */
export const SafeZoneOverlay: FC<IProps> = ({ editor, preset, enabled }) => {
  const [frame, setFrame] = useState<Frame | null>(null);

  useEffect(() => {
    if (!enabled) {
      setFrame(null);
      return;
    }
    const update = () => {
      const size = PRESET_SIZE[preset];
      if (!size) {
        setFrame(null);
        return;
      }
      const ratio = safeZoneRatio(preset);
      const x = size.width * ratio;
      const y = size.height * ratio;
      const w = size.width * (1 - ratio * 2);
      const h = size.height * (1 - ratio * 2);
      const tl = editor.toViewportPt({ x, y });
      const br = editor.toViewportPt({ x: x + w, y: y + h });
      setFrame({
        left: tl.x,
        top: tl.y,
        width: Math.max(0, br.x - tl.x),
        height: Math.max(0, br.y - tl.y),
      });
    };
    update();
    editor.viewportManager.on('viewMatrixChange', update);
    return () => {
      editor.viewportManager.off('viewMatrixChange', update);
    };
  }, [editor, enabled, preset]);

  if (!enabled || !frame) return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        border: '1px dashed #1592fe',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />,
    editor.containerElement,
  );
};
