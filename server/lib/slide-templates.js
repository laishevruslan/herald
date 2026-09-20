'use strict';

/*
 * Phase-3 factory templates. Geometry and {{ds:slug.field}} bindings live here so the wizard and
 * the tests cannot drift. Chrome prefixes (Next / Now / Next collection / Then) are passed in by
 * the dashboard at create time — the wall is not the dashboard, so t() is not called from this file.
 * Agenda empty-board copy (`remaining_today_empty`) lives in the resolver, not in t().
 *
 * ⚠️ ONE MODULE, NOT TWO. A frontend copy of these boxes would be a second source of truth the
 * first time somebody fixes a 1-bit colour. The SPA POSTs { factory, slug, title, chrome } and
 * gets back a normal deck document.
 */

const SLUG_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_TITLE = 120;
const MAX_PREFIX = 80;
const MAX_NOTE = 160;
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_SAMPLE = 40;

function bar(x, y, w, h, c) {
  return Object.freeze({ t: 'bar', x, y, w, h, c });
}

function txt(x, y, v, c, s, weight) {
  return Object.freeze({ t: 'txt', x, y, v, c, s, w: weight || 400 });
}

function thumb(background, aspect, parts) {
  return Object.freeze({ background, aspect, parts: Object.freeze(parts) });
}

const META = Object.freeze([
  {
    id: 'room-epaper-5x3',
    version: 1,
    aspect: '5:3',
    chip: 'room',
    title_key: 'slides.factory.room_epaper_5x3.title',
    desc_key: 'slides.factory.room_epaper_5x3.desc',
    thumbnail: thumb('#FFFFFF', '5:3', [
      txt(6, 10, 'Berlin', '#000000', 8, 700),
      bar(6, 22, 88, 3, '#000000'),
      txt(6, 32, 'AVAILABLE', '#000000', 13, 700),
      txt(6, 68, 'Sprint Planning', '#000000', 8, 400),
    ]),
  },
  {
    id: 'room-lcd-16x9',
    version: 1,
    aspect: '16:9',
    chip: 'room',
    title_key: 'slides.factory.room_lcd_16x9.title',
    desc_key: 'slides.factory.room_lcd_16x9.desc',
    thumbnail: thumb('#0B1220', '16:9', [
      bar(0, 0, 8, 100, '#16A34A'),
      txt(12, 12, 'Berlin', '#F8FAFC', 9, 700),
      txt(12, 38, 'AVAILABLE', '#F8FAFC', 12, 700),
      txt(12, 68, 'Sprint Planning', '#94A3B8', 8, 400),
    ]),
  },
  {
    id: 'waste-epaper-5x3',
    version: 1,
    aspect: '5:3',
    chip: 'facilities',
    title_key: 'slides.factory.waste_epaper_5x3.title',
    desc_key: 'slides.factory.waste_epaper_5x3.desc',
    thumbnail: thumb('#FFFFFF', '5:3', [
      txt(6, 12, 'Next collection', '#000000', 8, 700),
      txt(6, 36, 'Gelber Sack', '#000000', 13, 700),
      txt(6, 70, 'Sat 5 Sep', '#000000', 8, 400),
    ]),
  },
  {
    id: 'waste-lcd-16x9',
    version: 1,
    aspect: '16:9',
    chip: 'facilities',
    title_key: 'slides.factory.waste_lcd_16x9.title',
    desc_key: 'slides.factory.waste_lcd_16x9.desc',
    thumbnail: thumb('#0B1220', '16:9', [
      txt(6, 12, 'Next collection', '#F8FAFC', 8, 700),
      txt(6, 36, 'Gelber Sack', '#F8FAFC', 12, 700),
      txt(6, 68, 'Sat 5 Sep', '#94A3B8', 8, 400),
    ]),
  },
  {
    id: 'agenda-lcd-16x9',
    version: 1,
    aspect: '16:9',
    chip: 'agenda',
    title_key: 'slides.factory.agenda_lcd_16x9.title',
    desc_key: 'slides.factory.agenda_lcd_16x9.desc',
    thumbnail: thumb('#0B1220', '16:9', [
      txt(6, 10, 'Today', '#F8FAFC', 9, 700),
      txt(6, 40, '09:00  Sprint Planning', '#F8FAFC', 8, 400),
      txt(6, 64, '14:00  Budget Review', '#94A3B8', 8, 400),
    ]),
  },
]);

function clampPct(n, dflt) {
  const v = Number(n);
  if (!Number.isFinite(v)) return dflt;
  return Math.max(0, Math.min(100, v));
}

function sanitizeThumbnail(raw, aspect) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  const bg = HEX_RE.test(src.background) ? src.background : '#1B2029';
  const asp = src.aspect === '5:3' || src.aspect === '16:9' ? src.aspect : (aspect || '16:9');
  const partsIn = Array.isArray(src.parts) ? src.parts.slice(0, 12) : [];
  const parts = [];
  for (const p of partsIn) {
    if (!p || typeof p !== 'object') continue;
    if (p.t === 'bar' && HEX_RE.test(p.c)) {
      parts.push({
        t: 'bar',
        x: clampPct(p.x, 0), y: clampPct(p.y, 0),
        w: clampPct(p.w, 8), h: clampPct(p.h, 8),
        c: p.c,
      });
    } else if (p.t === 'txt' && HEX_RE.test(p.c)) {
      parts.push({
        t: 'txt',
        x: clampPct(p.x, 4), y: clampPct(p.y, 4),
        v: String(p.v == null ? '' : p.v).slice(0, MAX_SAMPLE),
        c: p.c,
        s: Math.max(6, Math.min(18, Number(p.s) || 8)),
        w: Number(p.w) === 700 ? 700 : 400,
      });
    }
  }
  return { background: bg, aspect: asp, parts };
}

function isWasteFactory(id) {
  return String(id || '').startsWith('waste-');
}

function isAgendaFactory(id) {
  return String(id || '').startsWith('agenda-');
}

function fallbackSlug(factoryId) {
  if (isWasteFactory(factoryId)) return 'abfall';
  if (isAgendaFactory(factoryId)) return 'lobby';
  return 'room';
}

function sanitizeSlug(raw, factoryId) {
  const s = String(raw == null ? '' : raw).trim();
  return SLUG_RE.test(s) ? s : fallbackSlug(factoryId);
}

function sanitizeTitle(raw, factoryId) {
  const s = String(raw == null ? '' : raw).trim().slice(0, MAX_TITLE);
  if (s) return s;
  if (isWasteFactory(factoryId)) return 'Waste collection';
  if (isAgendaFactory(factoryId)) return 'Office agenda';
  return 'Meeting room';
}

function sanitizePrefix(raw, fallback) {
  const s = String(raw == null ? '' : raw).trim().slice(0, MAX_PREFIX);
  return s || fallback;
}

function sanitizeNote(raw, fallback) {
  const s = String(raw == null ? '' : raw).trim().slice(0, MAX_NOTE);
  return s || fallback;
}

function tok(slug, key) {
  return `{{ds:${slug}.${key}}}`;
}

function noneMotion() {
  return { animation: 'none', delay: 0, duration: 0, easing: 'linear' };
}

function el(kind, slot, box, style, extra) {
  return {
    kind,
    slot,
    box,
    style: {
      color: '#000000',
      font: 'sans',
      size_cqw: 3,
      weight: 400,
      align: 'left',
      opacity: 1,
      radius_cqw: 0,
      ...style,
    },
    motion: noneMotion(),
    ...(extra || {}),
  };
}

function applyChrome(fields, slug, chrome, factoryId) {
  const next = sanitizePrefix(chrome && chrome.next_prefix, 'Next');
  const now = sanitizePrefix(chrome && chrome.now_prefix, 'Now');
  if (Object.prototype.hasOwnProperty.call(fields, 'next_meeting')) {
    fields.next_meeting = `${next}: ${tok(slug, 'next_title')} (${tok(slug, 'next_time')})`;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'now_meeting')) {
    fields.now_meeting = `${now}: ${tok(slug, 'current_title')} (${tok(slug, 'current_time')})`;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'headline')) {
    const fallback = isAgendaFactory(factoryId) ? 'Today' : 'Next collection';
    fields.headline = sanitizePrefix(chrome && chrome.headline, fallback);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'waste_note')) {
    fields.waste_note = sanitizeNote(chrome && chrome.waste_note, 'Please put the bin out by 06:00.');
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'then_line')) {
    const then = sanitizePrefix(chrome && chrome.then_prefix, 'Then');
    fields.then_line = `${then}: ${tok(slug, 'event_1_title')}`;
  }
  return fields;
}

function wasteCoreFields(slug) {
  return {
    headline: '',
    waste_type: tok(slug, 'next_title'),
    waste_date: tok(slug, 'next_time'),
    waste_note: '',
    then_line: '',
  };
}

/*
 * 800×480 Sticky / Waveshare 7.5″. Black and white only — a green/red bar dithers to noise on
 * 1-bit. Busy inverts the status word (white on a black box); free is black on white; stale is a
 * half-width black rule so a dead feed cannot look AVAILABLE.
 *
 * Organizer is deliberately not bound (privacy mask already lives in the resolver).
 */
function buildRoomEpaper(slug, title) {
  const bind = { bind_status: slug };
  const elements = [
    el('head', 'room_name', { x: 4, y: 3, w: 68 }, { size_cqw: 5, weight: 700, color: '#000000' }),
    el('clock', 'clock', { x: 74, y: 3, w: 22 }, {
      size_cqw: 4.5, weight: 600, align: 'right', color: '#000000',
    }, { clock_format: '24', tz: '', locale: '' }),
    el('rule', 'rule_top', { x: 4, y: 13, w: 92, h: 0.6 }, { color: '#000000' }),
    el('box', 'status_box', { x: 0, y: 16, w: 100, h: 24 }, { color: '#FFFFFF' }, {
      ...bind,
      color_when: { busy: '#000000', free: '#FFFFFF', stale: '#000000' },
    }),
    el('stat', 'status_busy', { x: 4, y: 18, w: 92 }, {
      size_cqw: 11, weight: 700, color: '#FFFFFF',
    }, { ...bind, show_when: 'busy' }),
    el('stat', 'status_free', { x: 4, y: 18, w: 92 }, {
      size_cqw: 11, weight: 700, color: '#000000',
    }, { ...bind, show_when: 'free' }),
    el('rule', 'stale_rule', { x: 25, y: 27, w: 50, h: 0.8 }, { color: '#000000' }, {
      ...bind, show_when: 'stale',
    }),
    el('body', 'status_detail', { x: 4, y: 42, w: 92 }, { size_cqw: 3.5, weight: 500, color: '#000000' }),
    el('body', 'now_meeting', { x: 4, y: 52, w: 70 }, { size_cqw: 3, color: '#000000' }, { hide_if_empty: true }),
    el('body', 'next_meeting', { x: 4, y: 60, w: 70 }, { size_cqw: 3, color: '#000000' }, { hide_if_empty: true }),
  ];
  for (let n = 0; n < 3; n++) {
    const y = 70 + n * 8;
    elements.push(
      el('body', `ev${n}_time`, { x: 4, y, w: 22 }, { size_cqw: 2.6, weight: 600, color: '#000000' }, { hide_if_empty: true }),
      el('body', `ev${n}_title`, { x: 28, y, w: 48 }, { size_cqw: 2.6, color: '#000000' }, { hide_if_empty: true }),
    );
  }
  elements.push(el('qr', 'booking_qr', { x: 84, y: 84, w: 12, h: 12 }, {}, { hide_if_empty: true }));

  const fields = {
    room_name: title,
    status_busy: tok(slug, 'status'),
    status_free: tok(slug, 'status'),
    status_detail: tok(slug, 'status_detail'),
    now_meeting: '',
    next_meeting: '',
    booking_qr: '',
  };
  for (let n = 0; n < 3; n++) {
    fields[`ev${n}_time`] = tok(slug, `event_${n}_time`);
    fields[`ev${n}_title`] = tok(slug, `event_${n}_title`);
  }

  return {
    name: title,
    dwell_sec: 30,
    template: { background: '#FFFFFF', aspect: '5:3', elements },
    fields,
  };
}

/*
 * Door tablet / small TV. The 8% bar carries busy/free/stale colour; the word stays white.
 * Motion only on the agenda column — e-paper factories must not copy this.
 */
function buildRoomLcd(slug, title) {
  const bind = { bind_status: slug };
  const ink = '#F8FAFC';
  const muted = '#94A3B8';
  const elements = [
    el('box', 'status_bar', { x: 0, y: 0, w: 8, h: 100 }, { color: '#6B7280' }, {
      ...bind,
      color_when: { busy: '#DC2626', free: '#16A34A', stale: '#6B7280' },
    }),
    el('head', 'room_name', { x: 12, y: 4, w: 44 }, { size_cqw: 4, weight: 700, color: ink }),
    el('date', 'header_date', { x: 56, y: 4.5, w: 22 }, {
      size_cqw: 2.4, color: muted, align: 'right',
    }, { date_format: 'short', tz: '', locale: '' }),
    el('clock', 'clock', { x: 80, y: 4.5, w: 16 }, {
      size_cqw: 2.4, weight: 600, color: muted, align: 'right',
    }, { clock_format: '24', tz: '', locale: '' }),
    el('stat', 'status_word', { x: 12, y: 16, w: 42 }, { size_cqw: 9, weight: 700, color: ink }),
    el('body', 'status_detail', { x: 12, y: 32, w: 42 }, { size_cqw: 3, color: '#CBD5E1' }),
    el('body', 'now_meeting', { x: 12, y: 44, w: 42 }, { size_cqw: 2.8, color: '#E2E8F0' }, { hide_if_empty: true }),
    el('body', 'next_meeting', { x: 12, y: 54, w: 42 }, { size_cqw: 2.8, color: muted }, { hide_if_empty: true }),
    el('qr', 'booking_qr', { x: 12, y: 78, w: 12, h: 12 }, {}, { hide_if_empty: true }),
  ];
  for (let n = 0; n < 5; n++) {
    const y = 16 + n * 14;
    const motion = { animation: 'slideU', delay: n * 0.05, duration: 0.2, easing: 'ease-out' };
    elements.push(
      el('body', `ev${n}_time`, { x: 58, y, w: 16 }, { size_cqw: 2.6, weight: 600, color: muted }, { hide_if_empty: true, motion }),
      el('body', `ev${n}_title`, { x: 76, y, w: 20 }, { size_cqw: 2.6, color: ink }, { hide_if_empty: true, motion }),
    );
  }

  const fields = {
    room_name: title,
    status_word: tok(slug, 'status'),
    status_detail: tok(slug, 'status_detail'),
    now_meeting: '',
    next_meeting: '',
    booking_qr: '',
  };
  for (let n = 0; n < 5; n++) {
    fields[`ev${n}_time`] = tok(slug, `event_${n}_time`);
    fields[`ev${n}_title`] = tok(slug, `event_${n}_title`);
  }

  return {
    name: title,
    dwell_sec: 30,
    template: { background: '#0B1220', aspect: '16:9', elements },
    fields,
  };
}

/*
 * Kitchen / mail-room 800×480. Fraction identity is the calendar word (Gelber Sack, Restmüll),
 * never a traffic-light fill — yellow and blue dither to noise on 1-bit. Then: is event_1 because
 * next_title / event_0 is the upcoming bag.
 */
function buildWasteEpaper(slug, title) {
  const elements = [
    el('head', 'headline', { x: 4, y: 6, w: 92 }, { size_cqw: 4, weight: 700, color: '#000000' }),
    el('stat', 'waste_type', { x: 4, y: 20, w: 92 }, {
      size_cqw: 9, weight: 700, color: '#000000',
    }, { hide_if_empty: true }),
    el('body', 'waste_date', { x: 4, y: 48, w: 92 }, {
      size_cqw: 4, weight: 600, color: '#000000',
    }, { hide_if_empty: true }),
    el('body', 'waste_note', { x: 4, y: 64, w: 92 }, { size_cqw: 2.8, color: '#000000' }),
    el('body', 'then_line', { x: 4, y: 82, w: 92 }, { size_cqw: 3, color: '#000000' }, { hide_if_empty: true }),
  ];

  return {
    name: title,
    dwell_sec: 30,
    template: { background: '#FFFFFF', aspect: '5:3', elements },
    fields: wasteCoreFields(slug),
  };
}

/*
 * Lobby / kitchen TV. Same hierarchy on the left; the week lives on the right as event_0..4 so a
 * filtered Abfallkalender reads as a week, not a single bag. Image slot is empty until the
 * operator drops in a 1-bit PNG of the fraction — we do not invent a colour from the word.
 */
function buildWasteLcd(slug, title) {
  const ink = '#F8FAFC';
  const muted = '#94A3B8';
  const elements = [
    el('head', 'headline', { x: 4, y: 4, w: 52 }, { size_cqw: 3.2, weight: 700, color: ink }),
    el('stat', 'waste_type', { x: 4, y: 14, w: 52 }, {
      size_cqw: 7, weight: 700, color: ink,
    }, { hide_if_empty: true }),
    el('body', 'waste_date', { x: 4, y: 38, w: 52 }, {
      size_cqw: 2.8, weight: 600, color: '#E2E8F0',
    }, { hide_if_empty: true }),
    el('body', 'waste_note', { x: 4, y: 50, w: 52 }, { size_cqw: 2.2, color: muted }),
    el('body', 'then_line', { x: 4, y: 64, w: 52 }, { size_cqw: 2.4, color: ink }, { hide_if_empty: true }),
    el('image', 'fraction_icon', { x: 82, y: 4, w: 14, h: 24 }, { color: '#0B1220' }),
  ];
  for (let n = 0; n < 5; n++) {
    const y = 36 + n * 12;
    const motion = { animation: 'slideU', delay: n * 0.05, duration: 0.2, easing: 'ease-out' };
    elements.push(
      el('body', `ev${n}_time`, { x: 58, y, w: 14 }, { size_cqw: 2.4, weight: 600, color: muted }, { hide_if_empty: true, motion }),
      el('body', `ev${n}_title`, { x: 74, y, w: 22 }, { size_cqw: 2.4, color: ink }, { hide_if_empty: true, motion }),
    );
  }

  const fields = wasteCoreFields(slug);
  for (let n = 0; n < 5; n++) {
    fields[`ev${n}_time`] = tok(slug, `event_${n}_time`);
    fields[`ev${n}_title`] = tok(slug, `event_${n}_title`);
  }

  return {
    name: title,
    dwell_sec: 30,
    template: { background: '#0B1220', aspect: '16:9', elements },
    fields,
  };
}

/*
 * Lobby / tea-point TV. Structured rows, not agenda_text: a 4K wall needs a time column and
 * wrapping titles at one kehl. Empty rows after 17:00 stay empty (no stack kind — that is 3.5);
 * remaining_today_empty is the honest "no more meetings today" line. Not a room sign: no
 * color_when, no show_when busy/free. Same 16:9 JSON on 4K because cqw scales the type.
 */
function buildAgendaLcd(slug, title) {
  const ink = '#F8FAFC';
  const muted = '#94A3B8';
  const elements = [
    el('head', 'headline', { x: 4, y: 3.5, w: 42 }, { size_cqw: 4, weight: 700, color: ink }),
    el('date', 'header_date', { x: 48, y: 5, w: 30 }, {
      size_cqw: 2.2, color: muted, align: 'right',
    }, { date_format: 'long', tz: '', locale: '' }),
    el('clock', 'clock', { x: 80, y: 5, w: 16 }, {
      size_cqw: 2.2, weight: 600, color: muted, align: 'right',
    }, { clock_format: '24', tz: '', locale: '' }),
    el('rule', 'rule_top', { x: 4, y: 13, w: 92, h: 0.5 }, { color: '#334155' }),
  ];
  for (let n = 0; n < 8; n++) {
    const y = 16 + n * 8.5;
    const motion = { animation: 'slideU', delay: n * 0.04, duration: 0.2, easing: 'ease-out' };
    elements.push(
      el('body', `row_${n}_time`, { x: 4, y, w: 22 }, {
        size_cqw: 2.4, weight: 600, color: muted,
      }, { hide_if_empty: true, motion }),
      el('body', `row_${n}_title`, { x: 28, y, w: 68 }, {
        size_cqw: 2.4, color: ink,
      }, { hide_if_empty: true, motion }),
    );
  }
  elements.push(
    el('body', 'empty_hint', { x: 4, y: 88, w: 92 }, { size_cqw: 2.4, color: muted }, { hide_if_empty: true }),
  );

  const fields = {
    headline: '',
    empty_hint: tok(slug, 'remaining_today_empty'),
  };
  for (let n = 0; n < 8; n++) {
    fields[`row_${n}_time`] = tok(slug, `event_${n}_time`);
    fields[`row_${n}_title`] = tok(slug, `event_${n}_title`);
  }

  return {
    name: title,
    dwell_sec: 30,
    template: { background: '#0B1220', aspect: '16:9', elements },
    fields,
  };
}

const BUILDERS = {
  'room-epaper-5x3': buildRoomEpaper,
  'room-lcd-16x9': buildRoomLcd,
  'waste-epaper-5x3': buildWasteEpaper,
  'waste-lcd-16x9': buildWasteLcd,
  'agenda-lcd-16x9': buildAgendaLcd,
};

function listFactories() {
  return META.map((m) => ({
    id: m.id,
    version: m.version,
    aspect: m.aspect,
    chip: m.chip,
    title_key: m.title_key,
    desc_key: m.desc_key,
    thumbnail: sanitizeThumbnail(m.thumbnail, m.aspect),
  }));
}

/**
 * @param {string} id
 * @param {{ slug?: string, title?: string, chrome?: {
 *   next_prefix?: string, now_prefix?: string,
 *   headline?: string, waste_note?: string, then_prefix?: string,
 * } }} [opts]
 * @returns {{ id: string, version: number, aspect: string, slide: object } | null}
 */
function buildFactory(id, opts = {}) {
  const meta = META.find((m) => m.id === id);
  const builder = BUILDERS[id];
  if (!meta || !builder) return null;
  const slug = sanitizeSlug(opts.slug, id);
  const title = sanitizeTitle(opts.title, id);
  const slide = builder(slug, title);
  applyChrome(slide.fields, slug, opts.chrome, id);
  return { id: meta.id, version: meta.version, aspect: meta.aspect, slide };
}

function buildDeck(id, opts = {}) {
  const built = buildFactory(id, opts);
  if (!built) return null;
  return {
    aspect: built.aspect,
    slides: [{
      name: built.slide.name,
      dwell_sec: built.slide.dwell_sec,
      template: built.slide.template,
      fields: built.slide.fields,
    }],
  };
}

module.exports = {
  listFactories,
  buildFactory,
  buildDeck,
  sanitizeSlug,
  isWasteFactory,
  isAgendaFactory,
};
