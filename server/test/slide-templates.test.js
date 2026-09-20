'use strict';

process.env.TZ = 'UTC';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Jimp } = require('jimp');
const { buildFactory, buildDeck, listFactories } = require('../lib/slide-templates');
const { renderSlideHtml, normalizeSlide } = require('../lib/slide-render');
const { normalizeDeck } = require('../lib/slide-deck');
const { resolveIcalData } = require('../lib/data-sources/ical-resolver');
const { postprocess } = require('../lib/embedded-postprocess');
const { parseProfile } = require('../lib/embedded-profiles');

const CANON_BIND = /^(status|status_detail|is_busy|current_title|current_time|next_title|next_time|agenda_text|event_count|events_today_count|remaining_today_count|remaining_today_empty|event_\d+_title|event_\d+_time)$/;

const ROOM_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-today-1
SUMMARY:Projekt-Sync & Review
DTSTART:20260904T090000Z
DTEND:20260904T100000Z
END:VEVENT
BEGIN:VEVENT
UID:evt-today-2
SUMMARY:Kunden-Präsentation
DTSTART:20260904T140000Z
DTEND:20260904T153000Z
END:VEVENT
END:VCALENDAR`;

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const EPAPER_HEX = new Set(['#000', '#fff', '#000000', '#ffffff']);

function dsTokens(obj) {
  const out = [];
  JSON.stringify(obj).replace(/\{\{ds:[a-zA-Z0-9_-]+\.([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    out.push(key);
    return '';
  });
  return out;
}

function hexes(obj) {
  return JSON.stringify(obj).match(HEX_RE) || [];
}

function resolveOf(payload, slug = 'room') {
  return {
    resolveData: (s, key) => (s === slug ? payload[key] : undefined),
  };
}

test('listFactories names T1, T2 and T3 ids', () => {
  const ids = listFactories().map((f) => f.id);
  assert.deepEqual(ids, [
    'room-epaper-5x3', 'room-lcd-16x9',
    'waste-epaper-5x3', 'waste-lcd-16x9',
    'agenda-lcd-16x9',
  ]);
});

test('listFactories thumbnails are CSS parts, 1-bit on e-paper, with sample words', () => {
  const list = listFactories();
  for (const f of list) {
    assert.equal(typeof f.chip, 'string');
    assert.ok(['room', 'facilities', 'agenda'].includes(f.chip), `${f.id} chip`);
    assert.ok(f.thumbnail && Array.isArray(f.thumbnail.parts));
    assert.match(f.thumbnail.background, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    assert.equal(f.thumbnail.aspect, f.aspect);
    assert.ok(f.thumbnail.parts.length <= 12);
    for (const p of f.thumbnail.parts) {
      assert.ok(p.t === 'bar' || p.t === 'txt', `${f.id} part type`);
      assert.match(p.c, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      if (p.t === 'txt') assert.ok(String(p.v).length <= 40);
    }
  }
  for (const f of list.filter((x) => x.aspect === '5:3')) {
    const colors = [f.thumbnail.background, ...f.thumbnail.parts.map((p) => p.c)];
    for (const c of colors) {
      assert.ok(EPAPER_HEX.has(c.toLowerCase()), `${f.id} gallery thumb leaked chroma: ${c}`);
    }
  }
  const dump = (id) => JSON.stringify(list.find((f) => f.id === id).thumbnail);
  assert.match(dump('room-epaper-5x3'), /AVAILABLE/);
  assert.match(dump('room-epaper-5x3'), /Sprint Planning/);
  assert.match(dump('room-lcd-16x9'), /#16A34A/i);
  assert.match(dump('waste-epaper-5x3'), /Gelber Sack/);
  assert.match(dump('agenda-lcd-16x9'), /Today/);
});

test('unknown factory is null', () => {
  assert.equal(buildFactory('room-epaper-9x16'), null);
  assert.equal(buildDeck('rooms-board-16x9', { slug: 'lobby' }), null);
});

test('room-epaper-5x3 is 5:3, motionless, and only black or white', () => {
  const built = buildFactory('room-epaper-5x3', { slug: 'room', title: 'Berlin' });
  assert.equal(built.aspect, '5:3');
  const deck = normalizeDeck(buildDeck('room-epaper-5x3', { slug: 'room', title: 'Berlin' }));
  assert.equal(deck.aspect, '5:3');
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.aspect, '5:3');
  assert.equal(slide.background, '#FFFFFF');
  for (const e of slide.elements) {
    assert.equal(e.motion, null, `${e.slot} must not animate on e-paper`);
  }
  for (const h of hexes(built.slide)) {
    assert.ok(EPAPER_HEX.has(h.toLowerCase()), `e-paper factory leaked a chroma hex: ${h}`);
  }
  assert.ok(!JSON.stringify(built.slide).includes('#16A34A'));
  assert.ok(!JSON.stringify(built.slide).includes('#DC2626'));
});

test('room-lcd-16x9 paints a corridor bar and animates only the agenda column', () => {
  const built = buildFactory('room-lcd-16x9', { slug: 'room_berlin', title: 'Berlin' });
  assert.equal(built.aspect, '16:9');
  const slide = normalizeSlide(built.slide);
  const bar = slide.elements.find((e) => e.slot === 'status_bar');
  assert.ok(bar && bar.color_when);
  assert.equal(bar.color_when.free, '#16A34A');
  assert.equal(bar.color_when.busy, '#DC2626');
  assert.equal(bar.color_when.stale, '#6B7280');
  const header = slide.elements.filter((e) => ['room_name', 'header_date', 'clock', 'status_word'].includes(e.slot));
  for (const e of header) assert.equal(e.motion, null, `${e.slot} is header — no motion`);
  const agenda = slide.elements.filter((e) => /^ev\d_/.test(e.slot));
  assert.ok(agenda.length >= 8);
  for (const e of agenda) {
    assert.ok(e.motion && e.motion.animation === 'slideU', `${e.slot} should rise on LCD`);
  }
});

test('factory bindings use only CANON keys — never next_event_title or organizer', () => {
  for (const id of ['room-epaper-5x3', 'room-lcd-16x9', 'waste-epaper-5x3', 'waste-lcd-16x9', 'agenda-lcd-16x9']) {
    const built = buildFactory(id, { slug: 'room', title: 'Berlin' });
    const keys = dsTokens(built.slide);
    assert.ok(keys.length > 0, id);
    for (const k of keys) {
      assert.ok(CANON_BIND.test(k), `${id} bound non-CANON key ${k}`);
      assert.notEqual(k, 'next_event_title');
      assert.notEqual(k, 'current_organizer');
      assert.notEqual(k, 'status_de');
      assert.notEqual(k, 'status_en');
    }
    assert.ok(!JSON.stringify(built.slide.fields).includes('__status'));
  }
});

test('invalid slug falls back to room rather than interpolating junk into HTML', () => {
  const built = buildFactory('room-epaper-5x3', { slug: 'room berlin!', title: 'X' });
  assert.match(JSON.stringify(built.slide.fields), /\{\{ds:room\.status\}\}/);
});

test('invalid waste slug falls back to abfall', () => {
  const built = buildFactory('waste-epaper-5x3', { slug: 'gelber sack!', title: 'X' });
  assert.match(JSON.stringify(built.slide.fields), /\{\{ds:abfall\.next_title\}\}/);
});

test('chrome prefixes land in next/now fields and hide_if_empty is on those slots', () => {
  const built = buildFactory('room-epaper-5x3', {
    slug: 'room',
    title: 'Berlin',
    chrome: { next_prefix: 'Nächstes Meeting', now_prefix: 'Jetzt' },
  });
  assert.match(built.slide.fields.next_meeting, /^Nächstes Meeting: \{\{ds:room\.next_title\}\}/);
  assert.match(built.slide.fields.now_meeting, /^Jetzt: \{\{ds:room\.current_title\}\}/);
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.elements.find((e) => e.slot === 'next_meeting').hide_if_empty, true);
  assert.equal(slide.elements.find((e) => e.slot === 'now_meeting').hide_if_empty, true);
});

test('fixture ICS → factory render shows BELEGT / FREI and cannot emit Nächstes Meeting:  ()', async () => {
  const busy = await resolveIcalData({ raw_data: ROOM_ICS, timezone: 'UTC', locale: 'de' }, new Date('2026-09-04T09:30:00Z'));
  const free = await resolveIcalData({ raw_data: ROOM_ICS, timezone: 'UTC', locale: 'de' }, new Date('2026-09-04T11:00:00Z'));
  const built = buildFactory('room-epaper-5x3', {
    slug: 'room',
    title: 'Berlin',
    chrome: { next_prefix: 'Nächstes Meeting', now_prefix: 'Jetzt' },
  });
  const busyHtml = renderSlideHtml(built.slide, resolveOf({ ...busy, __status: 'ok' }));
  const freeHtml = renderSlideHtml(built.slide, resolveOf({ ...free, __status: 'ok' }));
  assert.match(busyHtml, /BELEGT/);
  assert.match(freeHtml, /FREI/);
  assert.equal((busyHtml.match(/>BELEGT</g) || []).length, 1, 'busy and free stats must not both emit');
  assert.equal((freeHtml.match(/>FREI</g) || []).length, 1);

  const emptyNext = { ...free, next_title: '', next_time: '', __status: 'ok' };
  const hidden = renderSlideHtml(built.slide, resolveOf(emptyNext));
  assert.ok(!hidden.includes('Nächstes Meeting:'), 'empty Next chrome leaked');
});

test('LCD bar is red when busy, green when free, grey when the source failed', async () => {
  const busy = await resolveIcalData({ raw_data: ROOM_ICS, timezone: 'UTC', locale: 'en' }, new Date('2026-09-04T09:30:00Z'));
  const free = await resolveIcalData({ raw_data: ROOM_ICS, timezone: 'UTC', locale: 'en' }, new Date('2026-09-04T11:00:00Z'));
  const built = buildFactory('room-lcd-16x9', { slug: 'room', title: 'Berlin' });
  const busyHtml = renderSlideHtml(built.slide, resolveOf({ ...busy, __status: 'ok' }));
  const freeHtml = renderSlideHtml(built.slide, resolveOf({ ...free, __status: 'ok' }));
  const staleHtml = renderSlideHtml(built.slide, resolveOf({ ...free, __status: 'error' }));
  assert.match(busyHtml, /BUSY/);
  assert.match(freeHtml, /AVAILABLE/);
  assert.match(busyHtml, /background:#DC2626/);
  assert.match(freeHtml, /background:#16A34A/);
  assert.match(staleHtml, /background:#6B7280/);
  assert.ok(!staleHtml.includes('background:#16A34A'), 'a failed fetch painted AVAILABLE green');
});

test('editing room_name does not rebuild the template; flipping is_busy does change the bar', () => {
  const built = buildFactory('room-lcd-16x9', { slug: 'room', title: 'Berlin' });
  const a = renderSlideHtml(built.slide, resolveOf({ status: 'BUSY', is_busy: true, __status: 'ok' }));
  const renamed = {
    template: built.slide.template,
    fields: { ...built.slide.fields, room_name: 'Paris' },
  };
  const b = renderSlideHtml(renamed, resolveOf({ status: 'BUSY', is_busy: true, __status: 'ok' }));
  assert.equal((a.match(/class="e/g) || []).length, (b.match(/class="e/g) || []).length);
  const free = renderSlideHtml(built.slide, resolveOf({ status: 'AVAILABLE', is_busy: false, __status: 'ok' }));
  assert.match(a, /background:#DC2626/);
  assert.match(free, /background:#16A34A/);
});

test('room-epaper-5x3 HTML renders and Sticky 1-bit pack is 48000 bytes', async () => {
  const built = buildFactory('room-epaper-5x3', { slug: 'room', title: 'Berlin' });
  const html = renderSlideHtml(built.slide, resolveOf({
    status: 'AVAILABLE', status_detail: 'Free all day', is_busy: false, __status: 'ok',
    next_title: '', next_time: '', current_title: '', current_time: '',
  }));
  assert.match(html, /Berlin/);
  const profile = parseProfile({ preset: 'seeed-reterminal-sticky' });
  assert.equal(profile.width, 800);
  assert.equal(profile.height, 480);
  assert.equal(profile.colorDepth, '1bit');
  const img = new Jimp({ width: profile.width, height: profile.height, color: 0xFFFFFFFF });
  const png = await img.getBuffer('image/png');
  const out = await postprocess(png, profile);
  assert.equal(out.buffer.length, 48000);
});

const WASTE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:waste-gelber
SUMMARY:Gelber Sack Abholung
DTSTART:20260905T060000Z
DTEND:20260905T070000Z
END:VEVENT
BEGIN:VEVENT
UID:waste-papier
SUMMARY:Papier
DTSTART:20260908T060000Z
DTEND:20260908T070000Z
END:VEVENT
END:VCALENDAR`;

test('waste-epaper-5x3 is 5:3, motionless, 1-bit, and has no traffic-light colours', () => {
  const built = buildFactory('waste-epaper-5x3', { slug: 'abfall', title: 'Kitchen' });
  assert.equal(built.aspect, '5:3');
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.aspect, '5:3');
  assert.equal(slide.background, '#FFFFFF');
  for (const e of slide.elements) {
    assert.equal(e.motion, null, `${e.slot} must not animate on e-paper`);
    assert.equal(e.color_when, null, `${e.slot} must not paint busy/free on waste`);
  }
  for (const h of hexes(built.slide)) {
    assert.ok(EPAPER_HEX.has(h.toLowerCase()), `waste e-paper leaked a chroma hex: ${h}`);
  }
  assert.ok(!JSON.stringify(built.slide).includes('#16A34A'));
  assert.ok(!JSON.stringify(built.slide).includes('#DC2626'));
  assert.ok(!JSON.stringify(built.slide).includes('#FACC15'));
});

test('waste-lcd-16x9 is dark, lists event_0..4, and keeps an empty image slot', () => {
  const built = buildFactory('waste-lcd-16x9', { slug: 'abfall', title: 'Kitchen' });
  assert.equal(built.aspect, '16:9');
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.background, '#0B1220');
  const icon = slide.elements.find((e) => e.slot === 'fraction_icon');
  assert.ok(icon && icon.kind === 'image');
  assert.equal(icon.contentId, null);
  const header = slide.elements.filter((e) => ['headline', 'waste_type', 'waste_date', 'waste_note', 'then_line', 'fraction_icon'].includes(e.slot));
  for (const e of header) assert.equal(e.motion, null, `${e.slot} is not the week list`);
  const agenda = slide.elements.filter((e) => /^ev\d_/.test(e.slot));
  assert.equal(agenda.length, 10);
  for (const e of agenda) {
    assert.ok(e.motion && e.motion.animation === 'slideU', `${e.slot} should rise on LCD`);
  }
  for (const e of slide.elements) {
    assert.equal(e.color_when, null, `${e.slot} must not paint busy/free on waste`);
  }
});

test('waste chrome lands in headline / note / Then and hide_if_empty is on the Then line', () => {
  const built = buildFactory('waste-epaper-5x3', {
    slug: 'abfall',
    chrome: {
      headline: 'Nächste Abholung',
      waste_note: 'Bitte die Tonne bis 06:00 bereitstellen.',
      then_prefix: 'Danach',
    },
  });
  assert.equal(built.slide.fields.headline, 'Nächste Abholung');
  assert.equal(built.slide.fields.waste_note, 'Bitte die Tonne bis 06:00 bereitstellen.');
  assert.equal(built.slide.fields.then_line, 'Danach: {{ds:abfall.event_1_title}}');
  assert.equal(built.slide.fields.waste_type, '{{ds:abfall.next_title}}');
  assert.equal(built.slide.fields.waste_date, '{{ds:abfall.next_time}}');
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.elements.find((e) => e.slot === 'then_line').hide_if_empty, true);
  assert.equal(slide.elements.find((e) => e.slot === 'waste_type').hide_if_empty, true);
});

test('waste factory against two pickups shows Gelber Sack and Then: Papier', async () => {
  const data = await resolveIcalData(
    { raw_data: WASTE_ICS, timezone: 'UTC', locale: 'de' },
    new Date('2026-09-04T16:00:00Z'),
  );
  assert.equal(data.next_title, 'Gelber Sack Abholung');
  assert.equal(data.event_1_title, 'Papier');
  const built = buildFactory('waste-epaper-5x3', {
    slug: 'abfall',
    chrome: { headline: 'Next collection', then_prefix: 'Then' },
  });
  const html = renderSlideHtml(built.slide, resolveOf({ ...data, __status: 'ok' }, 'abfall'));
  assert.match(html, /Gelber Sack Abholung/);
  assert.match(html, /Then: Papier/);
  assert.match(html, /Next collection/);
});

test('waste Then: chrome hides when there is no event_1', async () => {
  const one = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:only-gelber
SUMMARY:Gelber Sack Abholung
DTSTART:20260905T060000Z
DTEND:20260905T070000Z
END:VEVENT
END:VCALENDAR`;
  const data = await resolveIcalData({ raw_data: one, timezone: 'UTC' }, new Date('2026-09-04T16:00:00Z'));
  const built = buildFactory('waste-lcd-16x9', {
    slug: 'abfall',
    chrome: { then_prefix: 'Then' },
  });
  const html = renderSlideHtml(built.slide, resolveOf({ ...data, __status: 'ok' }, 'abfall'));
  assert.match(html, /Gelber Sack Abholung/);
  assert.ok(!html.includes('Then:'), 'Then: chrome leaked with no following pickup');
});

test('invalid agenda slug falls back to lobby', () => {
  const built = buildFactory('agenda-lcd-16x9', { slug: 'tea point!', title: 'X' });
  assert.match(JSON.stringify(built.slide.fields), /\{\{ds:lobby\.event_0_title\}\}/);
  assert.match(JSON.stringify(built.slide.fields), /\{\{ds:lobby\.remaining_today_empty\}\}/);
});

test('agenda-lcd-16x9 is 16:9 dark, eight rows, live date, no traffic lights, no agenda_text', () => {
  const built = buildFactory('agenda-lcd-16x9', { slug: 'lobby', title: 'HQ' });
  assert.equal(built.aspect, '16:9');
  const slide = normalizeSlide(built.slide);
  assert.equal(slide.background, '#0B1220');
  const date = slide.elements.find((e) => e.slot === 'header_date');
  assert.ok(date && date.kind === 'date');
  assert.equal(date.cfg.format, 'long');
  const clock = slide.elements.find((e) => e.slot === 'clock');
  assert.ok(clock && clock.kind === 'clock');
  const header = slide.elements.filter((e) => ['headline', 'header_date', 'clock', 'rule_top', 'empty_hint'].includes(e.slot));
  for (const e of header) assert.equal(e.motion, null, `${e.slot} is header — no motion`);
  const rows = slide.elements.filter((e) => /^row_\d_/.test(e.slot));
  assert.equal(rows.length, 16);
  for (const e of rows) {
    assert.ok(e.motion && e.motion.animation === 'slideU', `${e.slot} should rise on LCD`);
    assert.equal(e.hide_if_empty, true);
  }
  const hint = slide.elements.find((e) => e.slot === 'empty_hint');
  assert.equal(hint.hide_if_empty, true);
  assert.equal(built.slide.fields.empty_hint, '{{ds:lobby.remaining_today_empty}}');
  for (const e of slide.elements) {
    assert.equal(e.color_when, null, `${e.slot} must not paint busy/free on an agenda`);
    assert.equal(e.show_when, 'always');
  }
  assert.ok(!JSON.stringify(built.slide.fields).includes('agenda_text'));
  assert.ok(!JSON.stringify(built.slide.fields).includes('current_organizer'));
});

test('agenda chrome headline lands in fields and empty_hint stays a resolver bind', () => {
  const built = buildFactory('agenda-lcd-16x9', {
    slug: 'lobby',
    chrome: { headline: 'Heute' },
  });
  assert.equal(built.slide.fields.headline, 'Heute');
  assert.equal(built.slide.fields.empty_hint, '{{ds:lobby.remaining_today_empty}}');
});

test('agenda factory shows the midday list and the empty-evening phrase, never leftover chrome', async () => {
  const midday = await resolveIcalData(
    { raw_data: ROOM_ICS, timezone: 'UTC', locale: 'en' },
    new Date('2026-09-04T11:00:00Z'),
  );
  const evening = await resolveIcalData(
    { raw_data: ROOM_ICS, timezone: 'UTC', locale: 'en' },
    new Date('2026-09-04T16:00:00Z'),
  );
  assert.equal(midday.remaining_today_empty, '');
  assert.equal(evening.remaining_today_empty, 'No more meetings today');
  assert.equal(midday.event_0_title, 'Kunden-Präsentation');
  assert.equal(evening.event_0_title, undefined);

  const built = buildFactory('agenda-lcd-16x9', {
    slug: 'lobby',
    chrome: { headline: 'Today' },
  });
  const dayHtml = renderSlideHtml(built.slide, resolveOf({ ...midday, __status: 'ok' }, 'lobby'));
  const eveHtml = renderSlideHtml(built.slide, resolveOf({ ...evening, __status: 'ok' }, 'lobby'));
  assert.match(dayHtml, /Kunden-Präsentation/);
  assert.match(dayHtml, /Today/);
  assert.ok(!dayHtml.includes('No more meetings today'), 'empty-board phrase leaked while the afternoon still had a meeting');
  assert.match(eveHtml, /No more meetings today/);
  assert.ok(!eveHtml.includes('Kunden-Präsentation'), 'ended afternoon meeting stayed on the evening board');
  assert.ok(!eveHtml.includes('Projekt-Sync'), 'ended morning meeting stayed on the evening board');
});
