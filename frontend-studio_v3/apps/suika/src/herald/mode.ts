import { type SuikaEditor } from '@suika/core';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export type HeraldAuthoringMode = 'design' | 'fill';

let mode: HeraldAuthoringMode = 'design';
const listeners = new Set<Dispatch<SetStateAction<HeraldAuthoringMode>>>();

function publish(next: HeraldAuthoringMode): void {
  mode = next;
  listeners.forEach((listener) => listener(mode));
}

/**
 * Design is the default for a blank sheet, a re-opened clip, and an autosave.
 * A gallery template (built-in or workspace) opens in Fill.
 */
export function applyHeraldAuthoringMode(
  editor: SuikaEditor,
  next: HeraldAuthoringMode,
): void {
  editor.heraldFillMode = next === 'fill';
  if (next === 'fill') {
    if (editor.toolManager.getActiveToolName() !== 'select') {
      void editor.toolManager.setActiveTool('select');
    }
    editor.textEditor.inactive();
    editor.pathEditor.inactive();
  }
  publish(next);
  editor.render();
}

export function useHeraldAuthoringMode(): HeraldAuthoringMode {
  const [value, setValue] = useState<HeraldAuthoringMode>(mode);
  useEffect(() => {
    setValue(mode);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
