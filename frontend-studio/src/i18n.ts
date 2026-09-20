/**
 * Minimal island copy for the spike UI. Dashboard buttons use frontend/js/i18n.
 * Prefer ?lang=ru | en; default en.
 */

export type StudioLang = 'en' | 'ru';

const dict: Record<StudioLang, Record<string, string>> = {
  en: {
    title: 'Poster editor',
    subtitle: 'Spike — not a slide. Export is a PNG for the library.',
    addText: 'Add text',
    addRect: 'Add rectangle',
    exportPng: 'Export PNG 1920×1080',
    exporting: 'Exporting…',
    ready: 'Fonts ready. Canvas {w}×{h} (display {dw}×{dh}).',
    exported: 'Exported {w}×{h} PNG ({kb} KB).',
    fontWait: 'Waiting for Inter…',
    fontFail: 'Inter did not load — export may use a fallback face.',
    cyrillicNote:
      'Default Inter pack is latin + latin-ext only. Cyrillic may render as .notdef until a language pack ships.',
    layerhubOk: 'Layerhub core import OK (npm pin).',
    layerhubFail: 'Layerhub core import failed.',
  },
  ru: {
    title: 'Редактор постеров',
    subtitle: 'Spike — это не слайд. Экспорт — PNG для библиотеки.',
    addText: 'Добавить текст',
    addRect: 'Добавить прямоугольник',
    exportPng: 'Экспорт PNG 1920×1080',
    exporting: 'Экспорт…',
    ready: 'Шрифты готовы. Холст {w}×{h} (экран {dw}×{dh}).',
    exported: 'Экспортирован PNG {w}×{h} ({kb} КБ).',
    fontWait: 'Ожидание Inter…',
    fontFail: 'Inter не загрузился — в экспорте может быть запасной шрифт.',
    cyrillicNote:
      'Базовый пакет Inter — только latin + latin-ext. Кириллица может стать .notdef, пока нет языкового пака.',
    layerhubOk: 'Импорт Layerhub core OK (npm pin).',
    layerhubFail: 'Импорт Layerhub core не удался.',
  },
};

export function detectLang(): StudioLang {
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'ru' || q === 'en') return q;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return nav === 'ru' ? 'ru' : 'en';
}

export function t(lang: StudioLang, key: string, vars?: Record<string, string | number>): string {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
