import enText from './en.json';
import ruText from './ru.json';
import zhText from './zh.json';

export const en = enText;
export const zh: typeof en = zhText;
export const ru: typeof en = ruText;

export type SupportedLocale = 'zh' | 'en' | 'ru';
export type MessageIds = keyof typeof zh & keyof typeof en & keyof typeof ru;
