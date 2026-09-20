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

## 5. What 3.0 does not include

- No factory gallery (Meeting Room Sign / Waste / Agenda). Those are 3.1–3.3.
- No inspector UI for the four flags — set them in the slide JSON, or wait for a factory.
- The slide **editor canvas** (`styleFor` / stage) ignores the flags so the operator can still select hidden elements. The wall applies them.
- No `GET /api/slide-templates`. No new player capability.

---

## 6. Tests that hold the contract

| File | What it refuses to regress |
|---|---|
| `server/test/data-sources-ical.test.js` | `CANON` keys on busy and free fixtures; `remaining_today_empty` empty vs phrase; `remaining_today_count` |
| `server/test/slide-render.test.js` | `hide_if_empty` hides `Next:  ()` but not a title without a time; `show_when` busy/free inversion; `color_when` + `__status: error` is stale hex, not free green; missing slug is stale; invalid `bind_status` is dropped |
| `server/test/slide-deck*.test.js` | bind flags survive save; defaults are not written |
