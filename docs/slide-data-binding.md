# Slide data binding

How a slide reads a data source at render time. This is the **3.0 contract**: canonical iCal keys, `{{ds:slug.field}}` interpolation, and four opt-in element flags. There is no template expression language and no second player runtime.

The slide still splits **view** (`config.template`) from **record** (`config.fields`). Data-source tokens live in fields. Bind flags live on the template element. A payload change must change the HTML (a colour, a missing row) and must not rewrite the stored template.

Authoritative implementation: [`server/lib/slide-render.js`](../server/lib/slide-render.js) (comment on `KINDS`). Save round-trip: [`server/lib/slide-deck.js`](../server/lib/slide-deck.js) `storedBindFlags`. Status stamp: [`server/lib/data-sources/service.js`](../server/lib/data-sources/service.js) `attachSourceStatus`. iCal dictionary: [`server/lib/data-sources/ical-resolver.js`](../server/lib/data-sources/ical-resolver.js).

Roadmap and factory templates (3.1+) live in [`data-sources-templates-plan.md`](data-sources-templates-plan.md). Architecture RFC: [`DATA_SOURCES_MASTERPLAN.md`](../DATA_SOURCES_MASTERPLAN.md).

---

## 1. Interpolation

In any text field:

```
{{ds:room_berlin.status}}
{{ds:room_berlin.next_title}} ({{ds:room_berlin.next_time}})
```

- `slug` is the data source identifier (`^[a-zA-Z0-9_-]+$`).
- `field` is a key on that source's cached payload.
- A missing slug or missing key becomes `''` (empty string), never the raw token.
- `agenda_text` keeps newlines because the renderer already uses `white-space:pre-wrap`.

The same resolver feeds the widget player, the slide preview API, and the [embedded e-paper path](embedded-renderer.md) (`dataResolverFor` → `getWorkspaceDataMapSync`).

---

## 2. Canonical iCal keys

Do not rename these. The picker in Data Sources and in the slide designer offers them. Aliases such as `next_event_summary` remain for older decks. **There is no `next_event_title`.**

| Key | Meaning |
|---|---|
| `status` | Room word in the source locale (`AVAILABLE` / `BUSY`, `СВОБОДНО` / `ЗАНЯТО`, …) |
| `status_de` / `status_en` | Fixed German / English words, even when the source locale is something else |
| `status_detail` | `Free until 14:00` / `Busy until 14:00` / `Free all day` |
| `is_busy` | Native boolean (`true` / `false`). Bind flags read this, not the word `status`. |
| `current_title`, `current_time`, `current_organizer` | Meeting in progress (empty when free) |
| `next_title`, `next_time`, `next_organizer` | Next meeting |
| `event_count`, `events_today_count` | Counts |
| `remaining_today_count` | Events still running or starting later **today** (`end > now`) |
| `remaining_today_empty` | `''` while any of those remain; otherwise a localised empty-board phrase |
| `agenda_text` | Multi-line “14:00 Sprint Planning” list |
| `event_{n}_title`, `event_{n}_time` | Indexed rows (`n` from 0) |

`remaining_today_empty` exists because `hide_if_empty` treats `"0"` as **not** empty. Bind the phrase, not the count, when the evening board should collapse.

The phrase is chosen from `ROOM_STRINGS` in the resolver (the source's `locale`, not the dashboard SPA language). Russian: «Сегодня встреч больше нет». English: «No more meetings today».

---

## 3. Four element flags

Opt-in keys on a template element. Unknown keys are dropped by `normalizeSlide`. Defaults are **not** written on save, so a headline does not grow `hide_if_empty: false`.

| Key | Type | Default | Effect |
|---|---|---|---|
| `hide_if_empty` | boolean | `false` | After interpolation, skip the element if its **own** slot is empty. Neighbouring slots are not inspected. |
| `show_when` | `'always'` \| `'busy'` \| `'free'` \| `'stale'` | `'always'` | Skip when the bound source's state does not match. |
| `bind_status` | slug, `/^[a-zA-Z0-9_-]{1,64}$/` | none | Which source `show_when` / `color_when` read. Invalid slugs are dropped. The slug is never concatenated into HTML. |
| `color_when` | `{ busy, free, stale }` hex | none | Override colour at render. Each value goes through the same hex allowlist as `style.color` (`#RGB` / `#RRGGBB`). Applied to **box / rule fill** and **stat glyph colour**. Other kinds ignore it. |

### When a slot is empty

Empty is `trim()` of the interpolated value equal to `''`, **or** the interpolated string equal to the chrome left after stripping `{{ds:…}}` tokens from the original field.

That hides `Next: {{ds:x.next_title}}` and `Next: {{ds:x.next_title}} ({{ds:x.next_time}})` when both tokens resolve to nothing (`Next:  ()` must not appear). A title with a missing time still shows, because the interpolated string is no longer equal to the token-stripped chrome.

Put chrome that wraps a token in the **same** field as the token, and set `hide_if_empty: true` on that element.

### busy / free / stale

Resolved from the raw cache, never from interpolated CSS:

1. Missing slug, missing `resolveData`, or `__status` of `'error'` / `'stale'` → **stale** (fail closed: do not paint AVAILABLE).
2. `is_busy === true` (or the string `'true'`) → **busy**.
3. `is_busy === false` (or `'false'`) → **free**.
4. `__status === 'ok'` or a non-empty `status` word → **free**.
5. Otherwise → **stale**.

`__status` is **not** an iCal field. `getWorkspaceDataMapSync` copies the row's `last_status` (`ok` / `error` / `pending`) onto the payload as the reserved key `__status`. Templates must not bind it as text. `status` stays the room word.

### Render order

1. Interpolate `{{ds:}}` in fields.
2. Resolve `bind_status` → busy / free / stale.
3. Skip the element if `show_when` does not match.
4. Skip the element if `hide_if_empty` and the slot is empty.
5. If `color_when` is set, override `style.color` for box / rule / stat.

---

## 4. Hand-authored example

A 16:9 door strip. The designer canvas does not preview these flags; the wall, widget render, embedded path, and preview API do.

```json
{
  "template": {
    "background": "#0F172A",
    "elements": [
      {
        "slot": "bar",
        "kind": "box",
        "box": { "x": 0, "y": 0, "w": 100, "h": 12 },
        "style": { "color": "#6B7280" },
        "bind_status": "room_berlin",
        "color_when": { "busy": "#B91C1C", "free": "#15803D", "stale": "#6B7280" }
      },
      {
        "slot": "busy_word",
        "kind": "stat",
        "box": { "x": 4, "y": 2, "w": 40, "h": 8 },
        "bind_status": "room_berlin",
        "show_when": "busy"
      },
      {
        "slot": "free_word",
        "kind": "stat",
        "box": { "x": 4, "y": 2, "w": 40, "h": 8 },
        "bind_status": "room_berlin",
        "show_when": "free"
      },
      {
        "slot": "next_line",
        "kind": "body",
        "box": { "x": 4, "y": 80, "w": 92 },
        "hide_if_empty": true
      }
    ]
  },
  "fields": {
    "busy_word": "{{ds:room_berlin.status}}",
    "free_word": "{{ds:room_berlin.status}}",
    "next_line": "Next: {{ds:room_berlin.next_title}} ({{ds:room_berlin.next_time}})"
  }
}
```

On a failed fetch the bar is `#6B7280`, not green. With no next meeting, `next_line` is omitted.

---

## 5. What 3.0 does not include (still true)

- No inspector UI for the four flags — factories set them; hand JSON still works.
- The slide **editor canvas** (`styleFor` / stage) ignores the flags so the operator can still select hidden elements. The wall applies them.
- Factories are created via `POST /api/slide-decks { factory }` and listed at `GET /api/slide-decks/factories` or `GET /api/slide-templates`.

## 5a. Meeting-room factories (3.1)

| id | Aspect | For |
|---|---|---|
| `room-epaper-5x3` | 5:3 | Seeed Sticky / Waveshare 7.5″ — black/white only |
| `room-lcd-16x9` | 16:9 | Door tablet / small TV — green `#16A34A` / red `#DC2626` / grey `#6B7280` bar |

Create from Slides → New deck → pick the card → pick the calendar → room name → Create. Chrome prefixes (`Next` / `Now`, or the dashboard language) are written into `fields.next_meeting` / `fields.now_meeting` at create time and are then ordinary editable text.

`current_organizer` is not bound (privacy). Bindings are CANON keys only. Implementation: [`server/lib/slide-templates.js`](../server/lib/slide-templates.js).

## 5b. Waste collection factories (3.2)

| id | Aspect | For |
|---|---|---|
| `waste-epaper-5x3` | 5:3 | Seeed Sticky / Waveshare 7.5″ — black/white only, no traffic-light fills |
| `waste-lcd-16x9` | 16:9 | Lobby / kitchen TV — dark, week list `event_0..4`, empty image slot |

Headline (`Next collection`), put-the-bin-out note, and `Then:` prefix are written from the dashboard language at create time. Fraction identity is the calendar word (`Gelber Sack`, `Restmüll`), not a yellow/blue fill. `Then:` binds `event_1_title` with `hide_if_empty` (the upcoming bag is `next_title` / `event_0`). The wizard hints to set an Include filter; it does not write one.

Same module as T1. Invalid slug falls back to `abfall`.

## 5c. Daily office agenda (3.3)

| id | Aspect | For |
|---|---|---|
| `agenda-lcd-16x9` | 16:9 | Lobby / tea-point TV — and 4K, same JSON (`cqw`) |

Header: live `date` (long) + `clock` + a stored headline (dashboard language `Today` / «Сегодня» at create). Body is eight timed rows (`row_n_time` / `row_n_title` → `event_n_*`), **not** `agenda_text`. `empty_hint` binds `remaining_today_empty` with `hide_if_empty`. No busy/free bar: this is not a room sign. Empty afternoon rows stay empty (no stack kind). Invalid slug falls back to `lobby`. E-paper agenda is not in phase 3.

## 5d. New Deck gallery (3.4)

Slides → New deck is a two-column card grid, not a radio list. Each factory from `GET /api/slide-decks/factories` carries `chip` (`room` / `facilities` / `agenda`) and a CSS `thumbnail` (`background`, `aspect`, `parts` of `bar`/`txt`). The dashboard paints those parts as absolutely positioned spans — no PNG, so a 1-bit colour cannot rot in a screenshot. Sample words on the thumbs stay English (`AVAILABLE`, `Sprint Planning`, `Gelber Sack`, `Today`); chrome the operator will see on the wall still comes from `t()` at create time.

Filter chips: All / Room / Facilities / Agenda / Blank. Blank remains a card. Arrow keys move the selection in a 2-column grid and do not wrap. Enter (and double-click) continue to the bind step — they do not skip the calendar picker. If the catalogue request fails, the wizard still lists T1–T3 from client fallback ids (empty plates, no sample words).

## 5e. Stretch factories (3.5)

| id | Aspect | For |
|---|---|---|
| `room-lcd-9x16` | 9:16 | Portrait door tablet — top strip, same busy/free/stale hex as `room-lcd-16x9` |
| `rooms-board-16x9` | 16:9 | Corridor 2×2 — four slugs, four `bind_status` bars |

Portrait is not for 1-bit Sticky. The board is status only (no tap-to-book). `POST /api/slide-decks` accepts `data_source_slugs` and `titles` arrays; invalid slugs fall back to `room_a`…`room_d`. PAT catalogue: `GET /api/slide-templates` and `GET /api/slide-templates/:id/doc?slug=&slugs=&title=&titles=`.

Getting-started was **not** given a fifth “connect a calendar” step: the checklist is still device → content → playlist → assign. A calendar-sign item would lengthen onboarding for every video-only install.

Implementation: same [`server/lib/slide-templates.js`](../server/lib/slide-templates.js). Router: [`server/routes/slide-templates.js`](../server/routes/slide-templates.js). Gallery paint: [`frontend/js/lib/slide-gallery.js`](../frontend/js/lib/slide-gallery.js).

---

## 6. Tests that hold the contract

| File | What it refuses to regress |
|---|---|
| `server/test/data-sources-ical.test.js` | `CANON` keys on busy and free fixtures; `remaining_today_empty` empty vs phrase; `remaining_today_count`; Gelber Sack Abholung → waste factory HTML |
| `server/test/slide-render.test.js` | `hide_if_empty` hides `Next:  ()` but not a title without a time; `show_when` busy/free inversion; `color_when` + `__status: error` is stale hex, not free green; missing slug is stale; invalid `bind_status` is dropped |
| `server/test/slide-deck*.test.js` | bind flags survive save; defaults are not written |
| `server/test/slide-templates.test.js` | T1 aspect/motion/1-bit palette; CANON-only binds; ICS → BELEGT/FREI; empty Next chrome; LCD bar stale ≠ green; Sticky pack 48000 bytes; T2 1-bit / no traffic lights; LCD week list + empty image; Then: hides without event_1; T3 16:9 eight rows / no `agenda_text`; midday list vs empty-evening phrase; gallery thumbs 1-bit + sample words; T4 2×2 four slugs; portrait 9:16 top strip |
| `server/test/slide-gallery.test.js` | Blank first; chip filters; 2-col arrows do not wrap; CSS thumbs drop non-hex / escape text; wizard has no `deckTpl` radio; 9:16 plate; board wizard `deckSourceSelect${n}` + `board_slot_4` |
