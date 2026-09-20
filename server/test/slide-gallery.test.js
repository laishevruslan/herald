'use strict';

// Gallery maths and CSS thumbs live in frontend/js/lib/slide-gallery.js as pure functions.
// The wizard must not invent 1-bit colours, must keep Blank as a card, and must not skip the
// bind step — those are views/slides.js, but the grid/filter/escape rules are pinned here so a
// chip rename or an ArrowDown that wraps the wrong way cannot ship on a screenshot.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MOD = pathToFileURL(path.join(__dirname, '..', '..', 'frontend', 'js', 'lib', 'slide-gallery.js')).href;
const SLIDES = path.join(__dirname, '..', '..', 'frontend', 'js', 'views', 'slides.js');
const HELP = path.join(__dirname, '..', '..', 'frontend', 'js', 'views', 'help.js');
let G;

test('load the gallery module', async () => {
  G = await import(MOD);
  assert.deepEqual([...G.GALLERY_CHIPS], ['all', 'room', 'facilities', 'agenda', 'blank']);
  assert.equal(G.GALLERY_COLUMNS, 2);
});

test('galleryItems always starts with Blank and uses the server list when it has ids', async () => {
  G = G || await import(MOD);
  const fromServer = G.galleryItems([
    { id: 'room-lcd-16x9', chip: 'room', title_key: 'slides.factory.room_lcd_16x9.title', desc_key: 'slides.factory.room_lcd_16x9.desc' },
  ]);
  assert.equal(fromServer[0].id, 'blank');
  assert.deepEqual(fromServer.map((c) => c.id), ['blank', 'room-lcd-16x9']);
});

test('an empty or failed catalogue still offers T1–T3 so the wizard does not regress to Blank-only', async () => {
  G = G || await import(MOD);
  const ids = G.galleryItems([]).map((c) => c.id);
  assert.ok(ids.includes('blank'));
  assert.ok(ids.includes('room-epaper-5x3'));
  assert.ok(ids.includes('waste-lcd-16x9'));
  assert.ok(ids.includes('agenda-lcd-16x9'));
  assert.ok(ids.includes('room-lcd-9x16'));
  assert.ok(ids.includes('rooms-board-16x9'));
  assert.equal(ids[0], 'blank');
});

test('filterGallery All is the full list; Room hides waste and agenda; Blank is one card', async () => {
  G = G || await import(MOD);
  const items = G.galleryItems([
    { id: 'room-epaper-5x3', chip: 'room' },
    { id: 'waste-epaper-5x3', chip: 'facilities' },
    { id: 'agenda-lcd-16x9', chip: 'agenda' },
  ]);
  assert.equal(G.filterGallery(items, 'all').length, 4);
  assert.deepEqual(G.filterGallery(items, 'room').map((c) => c.id), ['room-epaper-5x3']);
  assert.deepEqual(G.filterGallery(items, 'facilities').map((c) => c.id), ['waste-epaper-5x3']);
  assert.deepEqual(G.filterGallery(items, 'agenda').map((c) => c.id), ['agenda-lcd-16x9']);
  assert.deepEqual(G.filterGallery(items, 'blank').map((c) => c.id), ['blank']);
});

test('arrow keys move in a 2-column grid and do not wrap', async () => {
  G = G || await import(MOD);
  assert.equal(G.moveGalleryIndex(6, 0, 'ArrowRight'), 1);
  assert.equal(G.moveGalleryIndex(6, 0, 'ArrowLeft'), 0);
  assert.equal(G.moveGalleryIndex(6, 0, 'ArrowDown'), 2);
  assert.equal(G.moveGalleryIndex(6, 2, 'ArrowUp'), 0);
  assert.equal(G.moveGalleryIndex(6, 5, 'ArrowRight'), 5);
  assert.equal(G.moveGalleryIndex(6, 4, 'ArrowDown'), 5);
  assert.equal(G.moveGalleryIndex(0, 0, 'ArrowRight'), 0);
});

test('thumbHtml is CSS boxes, never a PNG, and drops non-hex colours', async () => {
  G = G || await import(MOD);
  const html = G.thumbHtml({
    background: '#FFFFFF',
    aspect: '5:3',
    parts: [
      { t: 'txt', x: 6, y: 10, v: 'AVAILABLE', c: '#000000', s: 13, w: 700 },
      { t: 'bar', x: 0, y: 0, w: 8, h: 100, c: 'red' },
      { t: 'txt', x: 1, y: 2, v: '<img src=x>', c: '#000' },
      { t: 'bar', x: 10, y: 20, w: 30, h: 5, c: '#16A34A' },
    ],
  }, (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])));
  assert.match(html, /aspect-ratio:5 \/ 3/);
  assert.match(html, /AVAILABLE/);
  assert.match(html, /#16A34A/);
  assert.ok(!html.includes('png'), 'gallery thumbs must not be image files');
  assert.ok(!html.includes('<img'), 'sample text must be escaped');
  assert.ok(!html.includes('background:red'), 'non-hex colours are dropped');
  assert.ok(!html.includes('javascript:'));
});

test('thumbHtml paints 9:16 as a tall plate', async () => {
  G = G || await import(MOD);
  const html = G.thumbHtml({ background: '#0B1220', aspect: '9:16', parts: [] });
  assert.match(html, /aspect-ratio:9 \/ 16/);
});

test('the New Deck wizard is a card gallery, not a radio list, and Help names Data Sources', () => {
  const slides = fs.readFileSync(SLIDES, 'utf8');
  assert.doesNotMatch(slides, /name=["']deckTpl["']/, 'radio name=deckTpl must not return');
  assert.match(slides, /data-gallery-chip/);
  assert.match(slides, /data-gallery-id/);
  assert.match(slides, /goStep2/);
  assert.match(slides, /deckSourceSelect\$\{n - 1\}/);
  assert.match(slides, /board_slot_4/);
  assert.match(slides, /rooms-board-16x9/);
  const help = fs.readFileSync(HELP, 'utf8');
  assert.match(help, /help\.guide\.datasources\.title/);
  assert.match(help, /help\.shortcut_gallery_arrows/);
});
