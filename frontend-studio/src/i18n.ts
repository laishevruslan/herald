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
    publishedSlideBg: 'Background saved. Returning to the slide…',
    back: 'Back to library',
    backSlide: 'Back to slide',
    preset: 'Size',
    ready: 'Ready. Canvas {w}×{h} (display {dw}×{dh}).',
    readyEdit: 'Editing poster {w}×{h}. Publish replaces the same library file.',
    fontWait: 'Loading studio fonts…',
    fontFail: 'Studio fonts did not load — export may use a fallback face.',
    fontFamily: 'Font',
    brandColors: 'Brand colours',
    applyFill: 'Fill selection',
    cyrillicNote:
      'Default Inter pack is latin + latin-ext only. Cyrillic may render as .notdef until a language pack ships.',
    needLogin: 'Sign in to the dashboard first — Studio reuses the same session.',
    pickImage: 'Choose an image from the library',
    close: 'Close',
    noImages: 'No images in this workspace yet. Upload one in the Content Library.',
    newTextDefault: 'New text',
    presetLandscape: '1920×1080 landscape',
    presetPortrait: '1080×1920 portrait',
    presetEpaper: '800×480 e-paper (colour PNG — panel will dither)',
    epaperWarn:
      'E-paper preset exports a colour PNG. Room-sign panels dither it to 1-bit — do not expect crisp colour on the wall.',
    forSlideBg: 'Publishing will set this PNG as the current slide background.',
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
    publishedSlideBg: 'Фон сохранён. Возвращаемся к слайду…',
    back: 'Назад в библиотеку',
    backSlide: 'Назад к слайду',
    preset: 'Размер',
    ready: 'Готово. Холст {w}×{h} (экран {dw}×{dh}).',
    readyEdit: 'Редактирование постера {w}×{h}. Публикация заменит тот же файл в библиотеке.',
    fontWait: 'Загрузка шрифтов Studio…',
    fontFail: 'Шрифты Studio не загрузились — в экспорте может быть запасной шрифт.',
    fontFamily: 'Шрифт',
    brandColors: 'Цвета бренда',
    applyFill: 'Залить выделение',
    cyrillicNote:
      'Базовый пакет Inter — только latin + latin-ext. Кириллица может стать .notdef, пока нет языкового пака.',
    needLogin: 'Сначала войдите в панель — Studio использует ту же сессию.',
    pickImage: 'Выберите изображение из библиотеки',
    close: 'Закрыть',
    noImages: 'В этом workspace ещё нет изображений. Загрузите в библиотеке контента.',
    newTextDefault: 'Новый текст',
    presetLandscape: '1920×1080 альбом',
    presetPortrait: '1080×1920 портрет',
    presetEpaper: '800×480 e-paper (цветной PNG — панель сделает дизеринг)',
    epaperWarn:
      'Пресет e-paper экспортирует цветной PNG. Панели room-sign дизерят его в 1 бит — не ждите чёткого цвета на стене.',
    forSlideBg: 'Публикация установит этот PNG фоном текущего слайда.',
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
