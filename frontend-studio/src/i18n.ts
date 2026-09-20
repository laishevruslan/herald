/**
 * Minimal island copy. Dashboard buttons use frontend/js/i18n.
 * Prefer ?lang=ru | en; default from navigator.
 */

export type StudioLang = 'en' | 'ru';

const dict: Record<StudioLang, Record<string, string>> = {
  en: {
    title: 'Poster editor',
    subtitle: 'Not a slide. Publish writes a PNG to the library.',
    addText: 'Add text',
    addRect: 'Add rectangle',
    addImage: 'Image from library',
    publish: 'Publish to library',
    publishing: 'Publishing…',
    published: 'Saved to library ({id}…). Assign it to a playlist like any image.',
    back: 'Back to library',
    preset: 'Size',
    ready: 'Ready. Canvas {w}×{h} (display {dw}×{dh}).',
    readyEdit: 'Editing poster {w}×{h}. Publish replaces the same library file.',
    fontWait: 'Waiting for Inter…',
    fontFail: 'Inter did not load — export may use a fallback face.',
    cyrillicNote:
      'Default Inter pack is latin + latin-ext only. Cyrillic may render as .notdef until a language pack ships.',
    needLogin: 'Sign in to the dashboard first — Studio reuses the same session.',
    pickImage: 'Choose an image from the library',
    close: 'Close',
    noImages: 'No images in this workspace yet. Upload one in the Content Library.',
    newTextDefault: 'New text',
  },
  ru: {
    title: 'Редактор постеров',
    subtitle: 'Это не слайд. «Опубликовать» сохраняет PNG в библиотеку.',
    addText: 'Добавить текст',
    addRect: 'Добавить прямоугольник',
    addImage: 'Картинка из библиотеки',
    publish: 'Опубликовать в библиотеку',
    publishing: 'Публикация…',
    published: 'Сохранено в библиотеку ({id}…). Назначьте в плейлист как обычное изображение.',
    back: 'Назад в библиотеку',
    preset: 'Размер',
    ready: 'Готово. Холст {w}×{h} (экран {dw}×{dh}).',
    readyEdit: 'Редактирование постера {w}×{h}. Публикация заменит тот же файл в библиотеке.',
    fontWait: 'Ожидание Inter…',
    fontFail: 'Inter не загрузился — в экспорте может быть запасной шрифт.',
    cyrillicNote:
      'Базовый пакет Inter — только latin + latin-ext. Кириллица может стать .notdef, пока нет языкового пака.',
    needLogin: 'Сначала войдите в панель — Studio использует ту же сессию.',
    pickImage: 'Выберите изображение из библиотеки',
    close: 'Закрыть',
    noImages: 'В этом workspace ещё нет изображений. Загрузите в библиотеке контента.',
    newTextDefault: 'Новый текст',
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
