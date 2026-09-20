'use strict';

/*
 * Phase-3 factory templates. Geometry and {{ds:slug.field}} bindings live here so the wizard and
 * the tests cannot drift. Chrome prefixes (Next / Now) are passed in by the dashboard at create
 * time — the wall is not the dashboard, so t() is not called from this file.
 *
 * ⚠️ ONE MODULE, NOT TWO. A frontend copy of these boxes would be a second source of truth the
 * first time somebody fixes a 1-bit colour. The SPA POSTs { factory, slug, title, chrome } and
 * gets back a normal deck document.
 */

const SLUG_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_TITLE = 120;
const MAX_PREFIX = 80;

const META = Object.freeze([
  {
    id: 'room-epaper-5x3',
    version: 1,
    aspect: '5:3',
    chip: 'room',
    title_key: 'slides.factory.room_epaper_5x3.title',
    desc_key: 'slides.factory.room_epaper_5x3.desc',
  },
  {
    id: 'room-lcd-16x9',
    version: 1,
    aspect: '16:9',
    chip: 'room',
    title_key: 'slides.factory.room_lcd_16x9.title',
    desc_key: 'slides.factory.room_lcd_16x9.desc',
  },
]);

function sanitizeSlug(raw) {
  const s = String(raw == null ? '' : raw).trim();
  return SLUG_RE.test(s) ? s : 'room';
}

function sanitizeTitle(raw) {
  const s = String(raw == null ? '' : raw).trim().slice(0, MAX_TITLE);
  return s || 'Meeting room';
}

function sanitizePrefix(raw, fallback) {
  const s = String(raw == null ? '' : raw).trim().slice(0, MAX_PREFIX);
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

function applyChrome(fields, slug, chrome) {
  const next = sanitizePrefix(chrome && chrome.next_prefix, 'Next');
  const now = sanitizePrefix(chrome && chrome.now_prefix, 'Now');
  if (Object.prototype.hasOwnProperty.call(fields, 'next_meeting')) {
    fields.next_meeting = `${next}: ${tok(slug, 'next_title')} (${tok(slug, 'next_time')})`;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'now_meeting')) {
    fields.now_meeting = `${now}: ${tok(slug, 'current_title')} (${tok(slug, 'current_time')})`;
  }
  return fields;
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

const BUILDERS = {
  'room-epaper-5x3': buildRoomEpaper,
  'room-lcd-16x9': buildRoomLcd,
};

function listFactories() {
  return META.map((m) => ({ ...m }));
}

/**
 * @param {string} id
 * @param {{ slug?: string, title?: string, chrome?: { next_prefix?: string, now_prefix?: string } }} [opts]
 * @returns {{ id: string, version: number, aspect: string, slide: object } | null}
 */
function buildFactory(id, opts = {}) {
  const meta = META.find((m) => m.id === id);
  const builder = BUILDERS[id];
  if (!meta || !builder) return null;
  const slug = sanitizeSlug(opts.slug);
  const title = sanitizeTitle(opts.title);
  const slide = builder(slug, title);
  applyChrome(slide.fields, slug, opts.chrome);
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
};
