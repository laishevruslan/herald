/*
 * New Deck gallery: filter chips, arrow-key movement, CSS (not PNG) thumbnails.
 *
 * Factory geometry stays on the server. This file only decides which cards are visible and how
 * the mini preview is painted, so the wizard cannot drift from listFactories() on a 1-bit colour.
 * FALLBACK_CARDS is ids + i18n keys only — used when GET /slide-decks/factories fails — so T1–T3
 * and the 3.5 stretch ids remain selectable; sample words and bar colours come from the server
 * catalogue when it answers.
 */

export const GALLERY_CHIPS = Object.freeze(['all', 'room', 'facilities', 'agenda', 'blank']);
export const GALLERY_COLUMNS = 2;

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BLANK_CARD = Object.freeze({
  id: 'blank',
  chip: 'blank',
  aspect: '16:9',
  title_key: 'slides.tpl_blank_title',
  desc_key: 'slides.tpl_blank_desc',
  thumbnail: Object.freeze({
    background: '#1B2029',
    aspect: '16:9',
    parts: Object.freeze([]),
  }),
});

function plate(background, aspect) {
  return Object.freeze({ background, aspect, parts: Object.freeze([]) });
}

export const FALLBACK_CARDS = Object.freeze([
  {
    id: 'room-epaper-5x3', chip: 'room', aspect: '5:3',
    title_key: 'slides.factory.room_epaper_5x3.title',
    desc_key: 'slides.factory.room_epaper_5x3.desc',
    thumbnail: plate('#FFFFFF', '5:3'),
  },
  {
    id: 'room-lcd-16x9', chip: 'room', aspect: '16:9',
    title_key: 'slides.factory.room_lcd_16x9.title',
    desc_key: 'slides.factory.room_lcd_16x9.desc',
    thumbnail: plate('#0B1220', '16:9'),
  },
  {
    id: 'room-lcd-9x16', chip: 'room', aspect: '9:16',
    title_key: 'slides.factory.room_lcd_9x16.title',
    desc_key: 'slides.factory.room_lcd_9x16.desc',
    thumbnail: plate('#0B1220', '9:16'),
  },
  {
    id: 'rooms-board-16x9', chip: 'room', aspect: '16:9',
    title_key: 'slides.factory.rooms_board_16x9.title',
    desc_key: 'slides.factory.rooms_board_16x9.desc',
    thumbnail: plate('#0B1220', '16:9'),
  },
  {
    id: 'waste-epaper-5x3', chip: 'facilities', aspect: '5:3',
    title_key: 'slides.factory.waste_epaper_5x3.title',
    desc_key: 'slides.factory.waste_epaper_5x3.desc',
    thumbnail: plate('#FFFFFF', '5:3'),
  },
  {
    id: 'waste-lcd-16x9', chip: 'facilities', aspect: '16:9',
    title_key: 'slides.factory.waste_lcd_16x9.title',
    desc_key: 'slides.factory.waste_lcd_16x9.desc',
    thumbnail: plate('#0B1220', '16:9'),
  },
  {
    id: 'agenda-lcd-16x9', chip: 'agenda', aspect: '16:9',
    title_key: 'slides.factory.agenda_lcd_16x9.title',
    desc_key: 'slides.factory.agenda_lcd_16x9.desc',
    thumbnail: plate('#0B1220', '16:9'),
  },
]);

function inferChip(id) {
  const s = String(id || '');
  if (s.startsWith('room')) return 'room';
  if (s.startsWith('waste-')) return 'facilities';
  if (s.startsWith('agenda-')) return 'agenda';
  return 'blank';
}

function normalizeCard(f) {
  return {
    id: f.id,
    chip: f.chip || inferChip(f.id),
    aspect: (f.aspect === '5:3' || f.aspect === '9:16') ? f.aspect : '16:9',
    title_key: f.title_key,
    desc_key: f.desc_key,
    thumbnail: f.thumbnail,
  };
}

export function galleryItems(factories) {
  const list = Array.isArray(factories)
    ? factories.filter((f) => f && ID_RE.test(f.id)).map(normalizeCard)
    : [];
  const cards = list.length ? list : FALLBACK_CARDS;
  return [BLANK_CARD, ...cards];
}

export function filterGallery(items, chip) {
  const list = Array.isArray(items) ? items : [];
  if (!chip || chip === 'all') return list.slice();
  return list.filter((item) => item.chip === chip);
}

export function moveGalleryIndex(count, index, key, columns = GALLERY_COLUMNS) {
  if (count <= 0) return 0;
  const cols = Math.max(1, Number(columns) || GALLERY_COLUMNS);
  let i = Math.max(0, Math.min(count - 1, Number(index) || 0));
  if (key === 'ArrowRight') i = Math.min(count - 1, i + 1);
  else if (key === 'ArrowLeft') i = Math.max(0, i - 1);
  else if (key === 'ArrowDown') i = Math.min(count - 1, i + cols);
  else if (key === 'ArrowUp') i = Math.max(0, i - cols);
  return i;
}

function pct(n, dflt) {
  const v = Number(n);
  if (!Number.isFinite(v)) return dflt;
  return Math.max(0, Math.min(100, v));
}

export function thumbHtml(thumbnail, escapeFn) {
  const esc = typeof escapeFn === 'function' ? escapeFn : (s) => String(s);
  const th = (thumbnail && typeof thumbnail === 'object') ? thumbnail : {};
  const bg = HEX_RE.test(th.background) ? th.background : '#1B2029';
  const ratio = th.aspect === '5:3' ? '5 / 3' : th.aspect === '9:16' ? '9 / 16' : '16 / 9';
  const parts = Array.isArray(th.parts) ? th.parts.slice(0, 12) : [];
  const inner = parts.map((p) => {
    if (!p || typeof p !== 'object') return '';
    if (p.t === 'bar' && HEX_RE.test(p.c)) {
      return `<span style="position:absolute;left:${pct(p.x, 0)}%;top:${pct(p.y, 0)}%;width:${pct(p.w, 0)}%;height:${pct(p.h, 0)}%;background:${p.c}"></span>`;
    }
    if (p.t === 'txt' && HEX_RE.test(p.c)) {
      const weight = Number(p.w) === 700 ? 700 : 400;
      const size = Math.max(6, Math.min(18, Number(p.s) || 8));
      return `<span style="position:absolute;left:${pct(p.x, 4)}%;top:${pct(p.y, 4)}%;color:${p.c};font-weight:${weight};font-size:${size}px;white-space:nowrap;font-family:sans-serif">${esc(String(p.v == null ? '' : p.v).slice(0, 40))}</span>`;
    }
    return '';
  }).join('');
  return `<div style="position:relative;aspect-ratio:${ratio};background:${bg};overflow:hidden;border-radius:6px">${inner}</div>`;
}
