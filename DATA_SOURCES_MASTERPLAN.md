# Masterplan & Technical Specification: Universal Data Sources & Integrations Engine for ScreenTinker

**Version:** 1.0  
**Target Repository:** `screentinker/screentinker`  
**Branch:** `feat-data-sources`  
**Status:** Architectural RFC & Implementation Plan  

---

## 1. Executive Summary & Core Concept

Currently, ScreenTinker displays static images/videos or isolated widgets (Weather, Clock, RSS) where configuration is tightly bound to the widget itself.

This specification introduces a **Universal Data Sources & Integrations Engine** inspired by modern workflow and dashboard architectures (n8n, Grafana, Appsmith). It cleanly decouples **external data ingestion & authentication** from **visual presentation (Slides & Widgets)**.

### Key Architectural Pillars:
1. **Separation of Concerns:** Data sources fetch, authenticate, parse, and cache live structured data in the server. Slides and widgets simply bind to variables (`{{ds:room_berlin.status}}`).
2. **Security by Design:** API keys, passwords, and secret calendar URLs stay strictly on the server and are never leaked to client screens.
3. **High Performance & Rate-Limit Protection:** Centralized server-side polling with configurable TTLs and ETags ensures external APIs (e.g. Google Calendar, Microsoft 365) are not overwhelmed even with hundreds of connected displays.
4. **Universal Multi-Source Composition:** A single slide can display fields from multiple distinct data sources simultaneously (e.g., room status + solar output + trash schedule).

---

## 2. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL DATA SOURCES                            │
│   [Google Calendar .ics]   [Microsoft 365 .ics]   [REST APIs]   [SQL/MQTT]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Polled per configured interval (ETag)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                   SCREENTINKER SERVER: DATA SOURCE ENGINE                   │
│                                                                             │
│  1. Ingestion & Resolvers (server/lib/data-sources/):                       │
│     - ical-resolver.js: Parses VEVENTs, RRULE series, calculates state      │
│     - json-api-resolver.js: HTTP GET/POST with Auth & JSONPath extraction   │
│                                                                             │
│  2. SQLite Persistence & In-Memory Cache:                                   │
│     - Table: data_sources (id, workspace_id, type, config, cached_data)    │
│                                                                             │
│  3. Slide Template Variable Interpolator (server/lib/slide-render.js):      │
│     - Resolves: "{{ds:source_id.field_name}}" ➔ "FREI bis 14:00 Uhr"         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Render Output (WYSIWYG)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│  - Web Player & Android TV: Dynamic HTML/CSS with instant refresh           │
│  - Seeed Studio reTerminal Sticky (E-Paper): 800x480 Dithered 1-Bit Bitmap  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

Add the `data_sources` table in `server/db/schema.sql` (and migration in `server/db/database.js`):

```sql
CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,                           -- e.g. "ds_meeting_berlin_4f8a"
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                            -- User-friendly key, e.g. "room_berlin"
  name TEXT NOT NULL,                            -- Display name, e.g. "Konferenzraum Berlin"
  type TEXT NOT NULL,                            -- 'ical', 'json_api', 'google_sheets', 'mysql'
  config TEXT NOT NULL,                          -- JSON: { url, interval_min, filters, auth }
  cached_data TEXT,                              -- JSON payload of last parsed state
  last_fetched_at INTEGER DEFAULT 0,             -- Epoch timestamp
  last_status TEXT DEFAULT 'ok',                 -- 'ok', 'error', 'pending'
  last_error TEXT,                               -- Error message on failure
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_data_sources_workspace ON data_sources(workspace_id);
```

---

## 4. Standardized Data Source Payloads (Example: iCal)

When an iCal feed is ingested by `server/lib/data-sources/ical-resolver.js`, it resolves recurring rules (`RRULE`), handles timezones, and generates a structured JSON dictionary:

```json
{
  "status": "AVAILABLE",
  "status_de": "FREI",
  "status_en": "AVAILABLE",
  "status_detail": "Free until 14:00",
  "is_busy": false,

  "current_title": "",
  "current_time": "",
  "current_organizer": "",

  "next_title": "Sprint Planning",
  "next_time": "Today, 14:00",
  "next_organizer": "Max Mustermann",

  "event_count": 3,
  "events_today_count": 2,
  "remaining_today_count": 2,
  "remaining_today_empty": "",

  "agenda_text": "14:00 Sprint Planning\n16:00 Budget Review",

  "event_0_title": "Sprint Planning",
  "event_0_time": "14:00 – 15:30",
  "event_1_title": "Budget Review",
  "event_1_time": "16:00 – 17:00"
}
```

Canonical bind keys (do not rename): `status`, `status_detail`, `is_busy`, `current_title`, `current_time`, `current_organizer`, `next_title`, `next_time`, `agenda_text`, `event_{n}_title`, `event_{n}_time`, `event_count`, `events_today_count`, `remaining_today_count`, `remaining_today_empty`. Aliases such as `next_event_summary` remain for older decks. There is no `next_event_title`.

---

## 5. Slide Integration & Variable Syntax

In ScreenTinker Slides, fields in `config.fields` can reference any data source field using the standard notation:

```json
{
  "template": { ... },
  "fields": {
    "headline": "Konferenzraum Berlin",
    "badge": "{{ds:room_berlin.status_de}}",
    "sub": "{{ds:room_berlin.status_detail}}",
    "next_event": "{{ds:room_berlin.next_title}} ({{ds:room_berlin.next_time}})",
    "qr_link": "https://cal.company.com/book/berlin"
  }
}
```

### Rendering Pipeline:
1. `slideRender.renderSlideHtml(config)` interpolates `{{ds:SLUG.KEY}}` in `config.fields`.
2. `getWorkspaceDataMapSync` stamps each source with reserved `__status` from the row's `last_status` (`ok` / `error` / `pending`). That key is not part of the iCal dictionary — `status` stays the room word.
3. Per-element flags (opt-in, stored on the template, applied at render):
   - `hide_if_empty` — skip the element if its own slot is empty after interpolation, including leftover chrome around empty tokens (`Next:  ()` must not appear).
   - `show_when` — `always` | `busy` | `free` | `stale`. Skip when the bound source does not match.
   - `bind_status` — data-source slug. Reads `is_busy` and `__status`. Missing slug or `__status: error` → **stale** (fail closed: do not paint AVAILABLE).
   - `color_when` — `{ busy, free, stale }` hex on box/rule fill and stat glyphs.
4. A payload change changes the HTML (colour, missing row) and must not rewrite `template`. Cached values are retained on a failed fetch; the flags then paint stale rather than inventing a fallback word.

Operator / author contract: [`docs/slide-data-binding.md`](docs/slide-data-binding.md).

---

## 6. User Experience & UI Design

### 6.1 Sidebar Navigation
Add a dedicated item in the sidebar ([`frontend/index.html`](file:///Users/rene/Documents/github/screentinker/frontend/index.html)):
- Positioned above `Widgets` & `Slides`.
- Icon: `database` / `cable`.
- Label: **Data Sources** / **Datenquellen**.

### 6.2 Data Sources Management View (`#/data-sources`)
- **Card-based overview:**
  - Status indicator (🟢 Connected, 🔴 Error, 🟡 Syncing).
  - Last synced timestamp and item count preview.
  - Quick actions: `[ 🔄 Refresh Now ]`, `[ ✏️ Edit ]`, `[ 🗑️ Delete ]`.
- **Add / Edit Modal:**
  - **Type Picker:** Calendar (`.ics`), REST API (`JSON`), CSV / Google Sheets.
  - **Connection Form:** Name, Slug, Feed URL, Refresh interval.
  - **Collapsible Filter Options:** Lookahead days, max event count, keyword include/exclude, privacy masking.
  - **"Test Connection" Button:** Fetches and displays a live parsed table of the next 3 entries instantly so the user has immediate visual confirmation.

### 6.3 Slide Designer Variable Picker (Inspector)
- When clicking on any text element on a slide:
  - Mode toggle: `[ Text ]` vs `[ ⚡ Dynamic ]`.
  - Dropdown 1: Select Data Source (e.g. `Konferenzraum Berlin`).
  - Dropdown 2: Select Field (e.g. `Status Detail: "Frei bis 14:00"`).
  - The live preview updates immediately.

---

## 7. Implementation Roadmap

### Phase 1: Core Engine & iCal Resolver (Completed ✅)
- [x] Database migration: `data_sources` table in SQLite (`schema.sql` & `database.js`).
- [x] Backend Service: `server/lib/data-sources/ical-resolver.js` (with `node-ical` & `rrule`).
- [x] Background Sync & Cache: `server/lib/data-sources/service.js`.
- [x] REST API: `server/routes/data-sources.js` (CRUD, test connection, manual refresh, workspace tenancy).
- [x] Slide Interpolation: Extend `server/lib/slide-render.js` & `server/routes/widgets.js` to resolve `{{ds:...}}` variables.
- [x] Automated Unit Tests: `server/test/data-sources-ical.test.js` (100% passing).
- [x] Embedded E-Paper Renderer: `server/lib/embedded-render.js` & `server/routes/embedded.js` with workspace resolvers (`resolveData`, `resolveImage`, `resolveFont`) and per-minute slide cache invalidation.

### Phase 2: Frontend Management UI & Designer Integration (Completed ✅)
- [x] Sidebar Navigation update in `frontend/index.html`.
- [x] Data Sources Management View: `frontend/js/views/data-sources.js` (cards, live test & preview, copy tag).
- [x] i18n Translations: German (`de.js`) and English (`en.js`).
- [x] Slide Designer Variable Picker in `frontend/js/views/slides.js`.
- [x] Header Deck rename, filmstrip inline rename, tab switching fixes.
- [x] Soft reload hash tracker in `server/server.js`.

### Phase 3: Out-of-the-Box Slide Templates & Presets (In Progress)

Implementation plan (competitive analysis, renderer gaps, factory IDs, PR split):
[`docs/data-sources-templates-plan.md`](docs/data-sources-templates-plan.md).

T1 door signs and T2 waste reminders ship from `server/lib/slide-templates.js` (`room-epaper-5x3`, `room-lcd-16x9`, `waste-epaper-5x3`, `waste-lcd-16x9`); the wizard binds a data source. There is no agenda factory yet (3.3).

- [x] **3.0** Renderer: `hide_if_empty`, `show_when`, `bind_status` / `color_when`; pass `__status` so a failed fetch cannot look AVAILABLE. (`remaining_today_empty` / `remaining_today_count` are in the resolver; factory templates are 3.1+.)
- [x] **3.1** Template 1: **Meeting Room Door Sign** — `room-epaper-5x3` (800×480 Sticky) and `room-lcd-16x9` (green/red bar). Wizard binds a data source.
- [x] **3.2** Template 2: **Waste / Trash Pickup** — `waste-epaper-5x3` and `waste-lcd-16x9`.
- [ ] **3.3** Template 3: **Daily Office Agenda Board** — `agenda-lcd-16x9` (4K uses the same 16:9 + `cqw`).
- [ ] **3.4** Gallery UX (preview cards), replacing the radio list.
- [ ] **3.5** Stretch: 4-room corridor board, portrait 9:16 door sign. Not required to tick Phase 3.
