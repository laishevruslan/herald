import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from 'react';

import { type HeraldFontOption } from './fonts';

export type HeraldChrome = {
  active: true;
  swatches: string[];
  fonts: HeraldFontOption[];
};

let chrome: HeraldChrome | null = null;
const listeners = new Set<Dispatch<SetStateAction<HeraldChrome | null>>>();

export function setHeraldChrome(next: HeraldChrome | null): void {
  chrome = next;
  listeners.forEach((listener) => listener(chrome));
}

export function useHeraldChrome(): HeraldChrome | null {
  const [value, setValue] = useState<HeraldChrome | null>(chrome);
  useEffect(() => {
    setValue(chrome);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
