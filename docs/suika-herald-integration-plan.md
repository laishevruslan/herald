# Интеграция Suika (`frontend-studio_v3`) с Herald / ScreenTinker

**Статус: ПЛАН + Фаза 0 (Spike) + Фаза 1 (Save) выполнены (2026-09-24).**  
Код: остров `/suika/`, I5-кнопка «Создать дизайн», Save-to-Herald (`POST /api/studio/export` + `postMessage`), spike PNG, MIT `license-check`, локаль `ru`. **Фаза 2 (Re-edit) — ещё нет.**  
**Дата съёмки:** 2026-09-24.  
**Цель продукта:** кнопка «Создать дизайн» в Herald открывает Suika в **новом окне**; оператор рисует постер; при сохранении PNG (+ редактируемый sidecar) попадает в Content Library Herald.  
**Не цель v1:** встраивать Suika iframe внутрь дашборда, заменять Studio (Layerhub), тащить multiplayer/Yjs/Nest backend Suika, отдавать `.suika` JSON плееру.

**Соседи (тот же шов «внешний холст → байты в библиотеку»):**

- [`scenify-studio-plan.md`](scenify-studio-plan.md) — уже реализованный остров `/studio/` + `POST /api/studio/export`
- [`canva-editor-embed-plan.md`](canva-editor-embed-plan.md) — внешний редактор с возвратом байт, без iframe

**Инварианты Herald, которые план обязан сохранить:**

| ID | Смысл для Suika |
|----|-----------------|
| **I1** | Авторство экрана — Слайды / контент, не Designer. Suika = генератор **медиафайла**, не третий автор слайда. |
| **I3 / I4** | Плеер играет PNG/JPEG из `content`, не JSON редактора. Офлайн/air-gap не зависит от живого Suika. |
| **I5** | Кнопка «Создать дизайн» видна только если остров собран / доступен. Нет 404 посреди Library. |

---

## 0. Короткий ответ

**Не обязательно встраивать Suika в UI Herald.** Достаточно модели «кнопка → `window.open` → сохранить → закрыть окно → карточка в Library».

Правильный шов уже существует у Studio:

1. Оператор рисует в отдельном фронтенде.
2. Экспорт даёт **растр (PNG)** через `ingestUploadedFile`.
3. Редактируемый документ кладётся sidecar в БД (`studio_designs.scene_json` или twin-таблица).
4. Плеер / плейлист видят только строку `content`.

Suika (`apps/suika`) сегодня умеет PNG / SVG / `.suika` JSON, но **не** умеет postMessage, query-mode и publish в Herald API. Весь интеграционный слой — тонкая обвязка вокруг уже готового export/load API ядра.

**Рекомендуемый v1:** same-origin остров `/suika/` (как `/studio/`) + `window.open`, reuse `POST /api/studio/export` (или twin `/api/suika/export`) с `scene_json` = Suika paper + метаданным `editor: 'suika'`.  
**Допустимый альтернативный путь (dev / отдельный origin):** popup на порту 6167 + `postMessage` handshake + явная передача JWT.

---

## 1. Что есть сейчас

### 1.1. Herald (ScreenTinker)

| Кусок | Путь | Состояние |
|-------|------|-----------|
| Content Library | `frontend/js/views/content-library.js` | Upload, папки, **New poster** / **Edit poster** → `/studio/` |
| Studio island (Layerhub) | `frontend-studio/` → build в `frontend/studio/` | Same-origin, JWT из `localStorage.token` |
| Studio API | `server/routes/studio.js`, `server/lib/studio-designs.js` | `POST /api/studio/export`, `GET /api/studio/:contentId` |
| Sidecar | таблица `studio_designs` | `content_id`, `scene_json`, `width`, `height` |
| I5 probe | `frontend/js/lib/studio-available.js` | `HEAD /studio/index.html` |
| Auth | JWT Bearer, 7d, claims + workspace | Не cookie; popup с чужого origin **не** видит `localStorage` |
| Slide background return | `slides.js` + `sessionStorage` `studio.slideBgReturn` | Паттерн «publish → вернуться в Слайды» |

Пресеты Studio (переиспользовать):

| `preset` | Размер |
|----------|--------|
| `landscape-1080` | 1920×1080 |
| `portrait-1080` | 1080×1920 |
| `epaper-5x3` | 800×480 |

Query Studio, которые стоит зеркалить для Suika: `preset`, `contentId`, `lang`, `for=slide-bg`.

### 1.2. frontend-studio_v3 (Suika)

| Кусок | Путь | Состояние |
|-------|------|-----------|
| Standalone editor | `frontend-studio_v3/apps/suika` | Целевой app для Herald; Vite **6167**; `base: './'` |
| Multiplayer | `apps/suika-multiplayer` + Nest `apps/backend` | **Не брать в v1** (deprecated / отдельный auth / Yjs) |
| Auto-save | `apps/suika/src/store/auto-save-graphs.ts` | `localStorage['suika-paper']` |
| Export | `packages/core/src/service/export_service.ts` | `.suika` JSON, SVG, PNG текущей страницы |
| Load | `SuikaEditor.setContents(IEditorPaperData)` | Файл / localStorage; **нет** URL params |
| Embed / postMessage | — | **Отсутствует** |
| Лицензия | MIT (`frontend-studio_v3/LICENSE`) | Совместимо с продуктом |

Формат `.suika` = JSON `IEditorPaperData`:

```ts
{
  appVersion: "suika-editor_0.0.3",
  paperId: string,       // UUID
  data: GraphicsAttrs[]  // плоский список узлов с parentIndex
}
```

Сериализация: `editor.sceneGraph.toJSON()`.  
PNG: `exportService.exportCurrentPagePNG` / `toPNGBlob()` из `packages/core/src/to_svg.ts`.

---

## 2. Целевой UX (v1)

```
Content Library (#/content)
  └─ [Создать дизайн]  (рядом с New poster / вместо него — продуктовое решение, см. §8)
        │
        ▼
  window.open('/suika/?mode=herald&preset=landscape-1080&lang=ru', 'herald-suika')
        │
        ▼
  Suika (полноэкранное окно)
        │  рисование
        ▼
  [Сохранить в Herald]  (не «скачать .suika»)
        │
        ├─ PNG (текущая страница / artboard)
        ├─ scene_json = IEditorPaperData (+ editor tag)
        └─ POST /api/studio/export  (или /api/suika/export)
        │
        ▼
  content row + studio_designs (или suika_designs)
        │
        ├─ postMessage { type: 'herald:saved', contentId } → opener
        └─ window.close()
        │
        ▼
  Library обновляет сетку / выделяет новый item
```

**Редактирование:** кнопка «Edit design» на карточке с sidecar →  
`/suika/?mode=herald&contentId=<id>` → Suika грузит `GET /api/studio/:contentId` → `setContents` → Save = replace того же `content_id`.

**Отмена:** крестик / Cancel → `window.close()` без ingest; opener не меняет Library.

---

## 3. Архитектурные варианты

### Вариант A — Same-origin остров + новое окно (рекомендуется)

Как Studio, но `window.open` вместо `location.href`.

| Плюсы | Минусы |
|-------|--------|
| Общий `localStorage.token` — без handoff JWT | Нужен Docker/CI шаг сборки в `frontend/suika/` |
| CORS не проблема | Popup-blocker: открывать только из click-handler |
| Можно reuse `/api/studio/*` без новых auth правил | Два острова (`/studio/` и `/suika/`) в артефакте |

**Deploy:**

1. `pnpm --filter @suika/suika build` → `apps/suika/build`
2. Копировать в `frontend/suika/` (скрипт по образцу `scripts/build-studio.sh`)
3. Express уже отдаёт `frontend/` статикой → `/suika/index.html`
4. I5: `HEAD /suika/index.html`

**Auth в Suika:** читать `localStorage.getItem('token')` и `Authorization: Bearer …` как в `frontend-studio/src/api.ts`.

### Вариант B — Cross-origin popup (dev 6167 / отдельный хост)

| Плюсы | Минусы |
|-------|--------|
| Быстрый локальный цикл без сборки в `frontend/` | Нет общего localStorage |
| Можно держать Suika на отдельном CDN | Нужен postMessage + token bridge; на hosted prod — allowlist Origin |

**Handshake (обязателен):**

```
Herald opener                         Suika popup
─────────────                         ───────────
window.open(suikaUrl?mode=herald)
                                      ready → postMessage('suika:ready')
postMessage({ type:'herald:init',
  token, workspaceId, designId?,
  paper?, preset, lang }, targetOrigin)
                                      store token in memory (не в URL!)
                                      setContents / apply preset
… save …
                                      POST /api/… with Bearer
                                      postMessage('herald:saved', {contentId})
                                      close()
```

Правила безопасности:

- Проверять `event.origin` с обеих сторон (allowlist: CMS origin ↔ Suika origin).
- JWT **не** класть в query string (логи, Referer, history).
- Не использовать `*` как `targetOrigin` в production.
- При `SELF_HOSTED=true` CORS уже permissive; на hosted — добавить origin Suika в `corsOriginCheck`, если popup ходит в API сам.

### Вариант C — Только скачать PNG и ручной upload

Отклонить для продукта: нет re-edit, ломает ожидание «сохранил → в библиотеке», дублирует Canva-manual.

### Вариант D — Iframe внутри дашборда

Явно **не v1** (запрос пользователя: новое окно). Оставить как фазу 3, если UX потребует «не терять контекст Library». Same-origin iframe тогда проще, чем cross-origin.

**Выбор плана:** реализовать **A** как production-путь; **B** — как dev-флаг `SUIKA_ORIGIN=http://127.0.0.1:6167` с тем же postMessage-контрактом (в same-origin A postMessage всё равно полезен для «обновить сетку / закрыть»).

---

## 4. Контракт данных

### 4.1. Что уходит в Herald при Save

| Поле | Источник | Куда |
|------|----------|------|
| PNG file | `toPNGBlob()` текущей страницы / frame | `content` via ingest |
| `scene_json` | `JSON.parse(editor.sceneGraph.toJSON())` | sidecar |
| `width` / `height` | preset или bounds страницы | sidecar + metadata |
| `content_id` | query при re-edit | replace того же content |
| `name` | имя файла / «Design YYYY-MM-DD» | `content.filename` / title |
| `editor` | константа `'suika'` | внутри `scene_json` обёртки **или** отдельная колонка |

### 4.2. Обёртка `scene_json` (рекомендуется)

Чтобы не смешивать Layerhub Fabric-JSON и Suika paper вслепую:

```json
{
  "v": 1,
  "editor": "suika",
  "appVersion": "suika-editor_0.0.3",
  "paper": { "appVersion": "...", "paperId": "...", "data": [ ... ] }
}
```

При Edit:

- если `editor === 'suika'` → открывать `/suika/`
- если отсутствует / `layerhub` → открывать `/studio/` (текущее поведение)

Санитизация на сервере (как сейчас для Studio):

- лимит размера JSON (~1.5 MB);
- запрет `data:image` / `javascript:` в строках;
- картинки в paper по возможности через `contentId` / уже заинжестенные URL Herald, не внешние CDN как единственная копия (I4 для re-edit).

### 4.3. Где хранить sidecar

| Вариант | Решение |
|---------|---------|
| **Reuse `studio_designs`** | Минимум схемы; различать редактор полем в JSON. **Рекомендуется для v1.** |
| Новая `suika_designs` | Чище изоляция; дубль ingest/API. Имеет смысл, если Layerhub и Suika живут параллельно долго и конфликтуют лимитами. |

API:

- **Минимум:** расширить `POST /api/studio/export` — принимать Suika-обёртку без изменения контракта multipart (`file` + `scene_json` + `preset` / `content_id` / `name`).
- **Альтернатива:** `POST /api/suika/export` + тонкий wrapper над `lib/studio-designs.js` (тот же ingest).

Плеер **никогда** не читает sidecar.

### 4.4. postMessage schema

```ts
// Suika → Herald
type SuikaToHerald =
  | { source: 'suika'; type: 'suika:ready'; designId?: string }
  | { source: 'suika'; type: 'herald:saved'; contentId: string; width: number; height: number }
  | { source: 'suika'; type: 'herald:error'; message: string }
  | { source: 'suika'; type: 'herald:cancelled' };

// Herald → Suika (нужно в основном для варианта B)
type HeraldToSuika =
  | {
      source: 'herald';
      type: 'herald:init';
      token?: string;          // только cross-origin
      workspaceId?: string;
      contentId?: string;
      preset?: string;
      lang?: 'en' | 'ru' | 'de';
      paper?: object;          // уже распарсенный IEditorPaperData или обёртка
    }
  | { source: 'herald'; type: 'herald:cancel' };
```

Имена `source` фиксировать, чтобы не ловить чужие сообщения от расширений.

---

## 5. Изменения по сторонам (без реализации — чеклист)

### 5.1. Suika (`frontend-studio_v3/apps/suika`)

| # | Задача | Где |
|---|--------|-----|
| S1 | Парсить `mode=herald` (+ `contentId`, `preset`, `lang`, `for`) | **DONE (Фаза 1)** — `herald/query.ts` |
| S2 | В herald-mode: **не** писать в общий `suika-paper` **или** ключ `suika-paper-herald-${contentId\|\|'new'}` | **DONE (Фаза 1)** — namespaced key |
| S3 | Пункт меню / primary CTA **«Сохранить в Herald»** вместо download `.suika` | **DONE (Фаза 1)** — Menu + Header CTA |
| S4 | Собрать PNG blob + paper JSON; `fetch('/api/studio/export', FormData)` с Bearer | **DONE (Фаза 1)** — `herald/api.ts` + `bridge.ts` |
| S5 | `postMessage` success/error; `window.close()` | **DONE (Фаза 1)** |
| S6 | Load: если `contentId` — `GET /api/studio/:contentId` → `setContents(paper)` | Фаза 2 |
| S7 | Preset: задать размер страницы/frame под 1920×1080 и т.д. | **DONE (Фаза 1)** — `herald/presets.ts` blank paper |
| S8 | Cross-origin: слушать `herald:init`, хранить token в memory | опционально, флаг |
| S9 | Vite `base`: для острова `/suika/` выставить `base: '/suika/'` в production build (как Studio) | **DONE (Фаза 0)** — `SUIKA_BASE` |

Не трогать `apps/backend`, workbench, multiplayer.

### 5.2. Herald frontend

| # | Задача | Где |
|---|--------|-----|
| H1 | Кнопка «Создать дизайн» (+ i18n) | **DONE (Фаза 0)** |
| H2 | I5 probe `HEAD /suika/index.html` | **DONE (Фаза 0)** |
| H2b | CSP `/suika/`: `suikaCsp` с `'unsafe-eval'` (PathKit); dashboard без eval | **DONE** |
| H3 | Click → `window.open` с query; сохранить `suikaOpener` listener | **DONE (Фаза 1)** — `mode=herald&preset` + `message` listener |
| H4 | На `herald:saved` — refresh list / highlight | **DONE (Фаза 1)** |
| H5 | Edit на карточке с `editor==='suika'` → `/suika/?contentId=` | Фаза 2 |
| H6 | (Опционально) slide-bg: `for=slide-bg` + sessionStorage ключ `suika.slideBgReturn` | `slides.js` |
| H7 | Dev: если `window.__SUIKA_ORIGIN` / config — открывать 6167 и делать B-handshake | маленький helper |

### 5.3. Herald server

| # | Задача | Где |
|---|--------|-----|
| R1 | Принять Suika-обёртку в sanitize `scene_json` | **DONE (Фаза 1)** — `sanitizeSceneJson` + `detectSceneEditor` |
| R2 | (Опц.) тег `editor` в list API, чтобы UI знал какую кнопку Edit показать | Фаза 2 |
| R3 | Тесты: export PNG + sidecar, IDOR workspace, play payload без scene | **DONE (Фаза 1)** — `suika-export.test.js` |
| R4 | CORS allowlist для Suika origin **только если** вариант B на hosted | `server.js` |

Новых таблиц в v1 не требуется при reuse `studio_designs`.

### 5.4. Build / Docker / CI

| # | Задача |
|---|--------|
| D1 | `scripts/build-suika.sh` (+ `.ps1` если нужно) по образцу Studio | **DONE (Фаза 0)** |
| D2 | Dockerfile multi-stage: node+pnpm build `apps/suika` → copy в `frontend/suika/` | **DONE (Фаза 0)** |
| D3 | Release tarball включает `/suika/`; без него кнопка скрыта (I5) | **DONE (Фаза 0)** — Docker image |
| D4 | `license-check.js` — MIT Suika уже ок; не тянуть GPL | **DONE (Фаза 0)** |
| D5 | Документация Help: «Создать дизайн» = Suika; «New poster» = Studio (или объединить UI — §8) | частично: i18n + план; Help/CHANGELOG — Фаза 3 |

---

## 6. Потоки подробно

### 6.1. Create

1. Пользователь авторизован в Herald, открыт `#/content`.
2. I5: `/suika/index.html` доступен → кнопка видима.
3. (Опц.) модалка пресета — reuse UI Studio.
4. `const w = window.open(url, 'herald-suika', 'noopener=yes')`  
   - **Важно:** для postMessage нужен доступ к `w`; `noopener` в feature-string может отрезать `opener`. Использовать `rel=noopener` на `<a>` **или** открывать без noopener и полагаться на origin-check; рекомендуется: `window.open(url, 'herald-suika')` **без** `noopener`, Suika проверяет `event.origin`.
5. Suika boot → herald mode → пустой canvas нужного размера.
6. Save → multipart export → content создан.
7. `postMessage` → Library `loadContent()` → окно закрывается.

### 6.2. Edit

1. List content помечает items с sidecar; UI читает `editor` из API или эвристики (`scene_json` parse на клиенте нежелателен — лучше флаг с сервера).
2. Open `/suika/?mode=herald&contentId=…`.
3. Suika: GET scene → unwrap `paper` → `setContents`.
4. Save с тем же `content_id` → replace файла + upsert sidecar (уже реализовано в Studio export).

### 6.3. Окно закрыто без Save

Opener: `w.closed` poll (раз в 1s) или только ждать message; ничего не менять в Library.

### 6.4. Popup blocked

Показать toast: «Разрешите всплывающие окна» + fallback-ссылка «Открыть в этой вкладке» (`location.href = url`) — тот же same-origin путь, что у Studio сегодня.

---

## 7. Auth и безопасность — чеклист

- [x] JWT только в `Authorization` header или memory после postMessage; не в URL. **(Фаза 1: Bearer из localStorage)**
- [x] `scene_json` sanitize: размер, схемы, запрет опасных URI (+ Suika wrapper).
- [x] IDOR: export/load только своего `workspace_id` (как Studio tests; Suika reuse того же API).
- [x] postMessage: строгий `origin` (`event.origin === location.origin`).
- [x] CSRF: API уже Bearer-only — cookie CSRF не требуется.
- [x] XSS в paper: сервер не интерполирует JSON в HTML плеера.
- [x] Не логировать полный `scene_json` в activity.
- [x] Максимальный размер PNG — общий `MAX_FILE_SIZE` / multer.
- [x] Clear canvas в herald-mode не должен сносить чужой localStorage ключ оператора вне Herald.

---

## 8. Продуктовые решения (**зафиксировано в Фазе 0**)

| Вопрос | Решение |
|--------|---------|
| Две кнопки: New poster (Studio) и Создать дизайн (Suika)? | **Да (временно).** Обе I5-gated; параллельный UX. |
| Заменить Studio полностью? | **Нет** в этом плане. Suika — параллельный остров. |
| SVG в Library? | v1 — **только PNG** (как Studio). |
| Multi-page Suika? | Export **текущей** страницы. |
| Имя в UI | «Создать дизайн» / Design editor — **не** бренд Suika на кнопке. |
| Слайды background | После Library create/edit (не Фаза 0). |
| Production origin | **Вариант A** (same-origin `/suika/`). Вариант B — только локальный Vite :6167 при необходимости. |

---

## 9. Фазы реализации

### Фаза 0 — Spike (0.5–1 дн.) — **DONE 2026-09-24**

- [x] Остров `/suika/`: `scripts/build-suika.sh` / `.ps1`, Dockerfile `suika-builder`, `SUIKA_BASE=/suika/`.
- [x] Сервер: hard-404 для unbuilt `/suika/` + явный index route (как `/studio/`).
- [x] Сервер: `suikaCsp` для `/suika/` (`'unsafe-eval'` + `worker-src blob:`) — PathKit; dashboard CSP не расширять.
- [x] I5: `suika-available.js` + кнопка «Создать дизайн» (скрыта без острова); `window.open` без Save-bridge.
- [x] Spike fixture 1920×1080 + `?spike=export` + `docker/suika-spike` (Playwright PNG verify).
- [x] `appVersion` demo `.suika` = `suika-editor_0.0.3` (тест).
- [x] MIT: `license-check.js --root frontend-studio_v3` (pnpm ls).
- [x] Решение **A** (same-origin); i18n en/ru/de дашборд + `ru` в Suika.
- [x] Тесты: `server/test/suika-spike.test.js`, расширение `content-404.test.js`.

**Критерий выхода:** PNG 1920×1080 с текстом/фигурами — `docker compose -f docker/suika-spike/docker-compose.yml run --rm suika-spike` → `/out/suika-spike-export.png` (**проверено 2026-09-24: 1920×1080, ~71 KB**).

### Фаза 1 — Контракт Save (2–4 дн.) — **DONE 2026-09-24**

- [x] S1–S5, S7, R1, R3, H1–H4 (D1–D2 уже в Фазе 0).
- [x] Same-origin `/suika/?mode=herald&preset=…` + кнопка Create + export в Library.
- [x] Обёртка `scene_json` `{ v:1, editor:'suika', paper }`; namespaced autosave.
- [x] `postMessage` `herald:saved` → Library refresh + highlight.
- [x] Тесты: `server/test/suika-export.test.js`.
- [x] i18n en/ru/de дашборд (`design.saved_toast`) + Suika `herald.*` en/ru/zh.

**Критерий выхода:** оператор без DevTools создаёт дизайн и видит его в `#/content` (Save to Herald).

### Фаза 2 — Re-edit (1–2 дн.)

- S6, H5, флаг editor в API.
- Replace сохраняет тот же `content_id` (плейлисты не ломаются).

**Критерий:** Edit → правка текста → Save → тот же id, новый PNG.

### Фаза 3 — Polish (1–3 дн.)

- Пресет-модалка, i18n, slide-bg, popup-blocked fallback, Dev cross-origin B.
- Docs Help + строка в CHANGELOG.
- Решение: оставить Studio или спрятать за feature-flag.

### Не делать в этих фазах

- Iframe-embed Suika в дашборд.
- Suika Nest/Yjs/workbench.
- Fabric/Suika JSON в play payload.
- PDF export.
- Автологин / вторая учётка Suika.

---

## 10. Карта файлов (ожидаемые касания)

```
herald/
  docs/suika-herald-integration-plan.md     ← этот документ
  frontend/js/views/content-library.js      # кнопка, open, listener
  frontend/js/lib/suika-available.js        # I5
  frontend/js/views/slides.js               # опц. slide-bg
  frontend/suika/                           # build output (не исходники)
  scripts/build-suika.sh
  server/lib/studio-designs.js              # sanitize обёртки
  server/routes/studio.js                   # опц. editor flag
  server/test/suika-export.test.js          # новый
  Dockerfile / docker-compose               # stage build

herald/frontend-studio_v3/
  apps/suika/src/components/Editor.tsx
  apps/suika/src/components/Header/.../Menu.tsx
  apps/suika/src/store/auto-save-graphs.ts
  apps/suika/src/herald/bridge.ts           # новый: mode, save, postMessage
  apps/suika/src/herald/api.ts              # новый: export/load fetch
  apps/suika/vite.config.ts                 # base /suika/
```

---

## 11. Тест-план

### Автоматические

- Export без JWT → 401.
- Export чужого `content_id` → 404.
- Export создаёт `content` + sidecar; replace сохраняет id.
- List/play endpoints **не** отдают `scene_json`.
- Sanitize: oversized JSON → 413; `javascript:` → reject.
- (Frontend e2e опционально) message schema round-trip в jsdom.

### Ручные

- [ ] Create → PNG в Library → добавить в плейлист → панель показывает картинку offline.
- [ ] Edit → изменить → Save → плейлист без перепривязки показывает новое.
- [ ] Закрыть окно без Save → Library без изменений.
- [ ] Popup blocked → fallback в той же вкладке.
- [ ] Portrait / landscape / e-paper пресеты.
- [ ] Два редактора: Layerhub poster и Suika design не перетирают друг друга (разный content_id; Edit открывает правильный остров).
- [ ] Self-hosted air-gap: без интернета create/edit/play работают.
- [ ] Hosted: CORS, если пробовали вариант B.

---

## 12. Риски и митигации

| Риск | Митигация |
|------|-----------|
| Popup blocker | Только user gesture; fallback same-tab |
| Смешение Layerhub и Suika JSON | Обёртка `editor: 'suika'`; Edit роутит по флагу |
| localStorage коллизия `suika-paper` | Namespaced key в herald-mode |
| Огромный paper с bitmap fills | Запрет data URL; картинки через Library content |
| Качество PNG / шрифты | Spike фазы 0; при провале — не показывать кнопку (I5) |
| Два острова раздувают Docker image | Tree-shake; не включать multiplayer/docs |
| Upstream Suika API drift (`appVersion`) | Pin commit/subfolder; миграции как у Studio scene v1→v2 |
| Операторы путают Studio и Suika | Одна кнопка или чёткие labels + Help |

---

## 13. Оценка трудозатрат

| Фаза | Оценка |
|------|--------|
| 0 Spike | 0.5–1 дн. |
| 1 Create + Save | 2–4 дн. |
| 2 Re-edit | 1–2 дн. |
| 3 Polish | 1–3 дн. |
| **Итого** | **~5–10 дн.** одного разработчика, знакомого с обоими деревьями |

Меньше, чем полный Studio с нуля: ingest, tenancy, I5 и Library UX уже есть.

---

## 14. Definition of Done (v1)

1. В Content Library есть кнопка создания дизайна (скрыта без `/suika/` — I5).
2. Кнопка открывает Suika в новом окне (или same-tab fallback).
3. Save создаёт/обновляет элемент Library: играбельный PNG + sidecar для re-edit.
4. Плеер не получает Suika JSON.
5. JWT/workspace tenancy соблюдены; тесты export/IDOR зелёные.
6. Нет зависимости от Suika multiplayer backend.
7. Документ Help / CHANGELOG обновлены; этот план помечен «фаза N выполнена» по мере закрытия.

---

## 15. Следующий шаг после утверждения плана

1. [x] Зафиксировать продуктовый выбор §8 (две кнопки; reuse `studio_designs`; Variant A).
2. [x] Spike: build pipeline `/suika/` + I5-кнопка без полного bridge — проверка I5/Docker.
3. [x] PR фазы 1: herald-mode Save + Library open/listener (`S1–S5`, `H1–H4`, export API).
4. Далее — Фаза 2: re-edit (`S6`, `H5`, флаг editor в list API).

Код по этому документу пишется по фазам выше; §8 и вариант A зафиксированы.
