# Menu Boards — enterprise-сравнение и план реализации

**Статус:** PLAN · 2026-09-20  
**Связано:** `docs/feature-gap-plan.md` (GAP-01, GAP-03, GAP-05), `docs/enterprise-slide-editor-plan.md`, `docs/slide-data-binding.md`, `docs/multi-tenancy-design.md`  
**Инварианты:** I1–I6 из feature-gap-plan (Слайды = авторство; данные отдельно от макета; скрипты-константы; офлайн; паритет плееров; один resolver).

---

## 0. Исходная точка (честность по коду)

| Что | Документы | Live HEAD (`server/`, `frontend/`) |
|---|---|---|
| GAP-01 DataSets | BUILT | **Нет** — есть Data Sources (`{{ds:slug}}`), не табличные DataSets |
| GAP-03 Menu Boards | BUILT | **Нет** — нет `menu.v1`, kind `menu`, `MENU_SCRIPT` |
| GAP-05 Named dayparts | BUILT | **Нет** — есть только `playlist_item_schedules` |
| Directory Board | есть | Есть (категории/записи **без** цены/калорий) |

В `Work/screentinker-main/` лежит прототип GAP-03 (`server/lib/menu-board.js`, пресет `menu.v1`, тесты). Его **нельзя** считать продуктом, пока не смержен в HEAD. План ниже: сначала закрыть baseline из прототипа, затем нарастить enterprise-слой, которого у конкурентов QSR уже ждут как «минимум сети».

Маркетинг (README, landing) уже обещает QSR menu boards — разрыв с кодом = отказ на пилоте.

---

## 1. Конкурентный разбор (enterprise / QSR)

Сравниваем не «у кого красивее шаблон», а операторский контур: кто меняет цену, кто видит sold-out, как это доезжает до экрана без republish макета.

### 1.1 Матрица возможностей

| Возможность | Xibo 4 | Rise Vision | TelemetryTV | Scala / Quintet | STRATACACHE | Poppulo | Herald сейчас |
|---|---|---|---|---|---|---|---|
| Отдельный объект меню (не запечённый HTML) | Category + Products | шаблоны + контент | Menu app / MustHaveMenus / Canva | Menu Manager + API | data-driven DMB | live data + integrations | **нет** (directory без цен) |
| Цена/наличие без правки layout | да | да (облако) | да | real-time UI | real-time + POS | через интеграции | **нет** |
| Варианты / product options | Product Options | частично | через дизайн | да | да | зависит от интеграции | **нет** |
| Daypart (завтрак/обед) | через schedule | встроено | daypart + triggers | time-of-day + inventory | daypart + conditional | schedule + rules | item schedules only |
| Калории на доске | поля продукта | nutrition highlights | nutrition/allergen в чеклисте | да | nutrition | live data | **нет** |
| Аллергены / dietary badges | allergy info | gluten-free/vegan tags | заявлено | ingredients/tags | да | возможно | badge-текст в прототипе |
| Sold out / dim unavailable | unavailable + dim | remove/out-of-stock | да | inventory-driven | supply/overage | inventory | sold_out в прототипе |
| Фото / video LTO | library image | photo+video | photo+video+motion | video + DMB | video + LTO | media library | photo в прототипе |
| Multi-panel / zone menu | layout zones | multi-screen | multi-screen | indoor/outdoor + drive-thru | multi-panel + confirmation board | fleet | playlist zones / video wall — **не menu-aware** |
| Franchise: HQ vs store override | RBAC + datasets | cloud roles | centralized + local | central + store login (EAT) | locale/pricing per location | RBAC | workspace roles — **нет price override** |
| POS / inventory sync | API / connectors | ограничено | order status (кейсы) | POS + kitchen | **POS first-class** | retail/POS integrations | **нет** |
| Drive-thru confirmation | нет как продукта | нет | нет | да (Quintet) | да + greeting/LTO | нет | **нет** |
| AI suggestive sell / sensors | нет | нет | нет | AI content suggestions | AI + sensors + loyalty | analytics | **вне скоупа 2.x** |
| Offline cache меню | player cache | cloud-dependent | dedicated player | enterprise player | edge delivery | enterprise | I4 заявлен; для меню — только в прототипе ETag |

### 1.2 Что делают лидеры (выжимка)

**Xibo (архитектурный родственник CMS).**  
Menu Board = отдельный каталог Categories → Products (+ Options). На layout кладутся Elements/Widgets Category и Products. Смена цены/availability **не требует** открытия Layout Editor. Unavailable можно dim, не удаляя. Офлайн — кэш плеера. Это прямой ответ на «QSR в README»: данные отдельно от макета (наш I2).

**Rise Vision / TelemetryTV (SMB→mid-market).**  
Сильный упор на шаблоны, Canva/MustHaveMenus, dayparting, калории/аллергены как compliance-чеклист. Слабее enterprise franchise-governance и POS. Полезны как ориентир UX «оператор кухни меняет цену за 30 секунд».

**Scala Quintet / STRATACACHE (настоящий enterprise QSR).**  
Не «виджет меню», а платформа: indoor + outdoor + drive-thru confirmation, POS, inventory → sold out, daypart + conditional (погода, загрузка смены), региональные цены, AI/персонализация, managed services на сотни тысяч экранов. EAT/Scala: центральный Menu Manager **и** store-level web login для локальных правок. Это потолок, к которому мы **не** идём целиком в одном цикле — но оттуда берём must-have для пилота сети 20+ точек.

**Poppulo / BrightSign.**  
Poppulo — governance, live data, retail integrations. BrightSign — железо + daypart/instant updates через CMS-партнёров, не свой menu CMS. Для нас: надёжный плеер и ETag/офлайн важнее, чем копировать BrightSign Control.

### 1.3 Регуляторный минимум (не «nice to have»)

Для сетей, попадающих под правила:

- **США (FDA Menu Labeling, 21 CFR 101.11):** калории рядом с позицией/ценой на electronic menu boards и drive-thru; statements про 2,000 kcal и «additional nutrition available upon request»; доп. nutrition on request (fat, sodium, …).
- **ЕС (FIC / Reg. 1169/2011):** для non-prepacked — информация об аллергенах (14 Annex II) до заказа; на доске — либо явные коды/иконки, либо чёткий signpost «спросите персонал» + достоверные данные у staff.

Вывод для схемы: `calories` + `allergens` (или `allergen_codes`) + footer statements на шаблоне — часть enterprise Menu Board, не «фаза 4 когда-нибудь».

---

## 2. Что добавить / расширить у Herald

Слои от обязательного к опциональному. Не строить отдельный «Menu CMS» и не возвращать Designer.

### 2.1 P0 — Baseline QSR (закрывает отказ vs Xibo)

Цель: оператор правит строки → экраны обновляются без republish слайда.

| # | Функция | Зачем | Как лечь |
|---|---|---|---|
| B1 | **DataSets** (GAP-01) | таблица = источник правды | `datasets` + `dataset_rows`; `GET .../data.json` + ETag/304; CSV import; UI редактирования строк |
| B2 | Пресет **`menu.v1`** | единая схема | колонки из прототипа: `category`, `name`, `price` (text), `calories`, `badge`, `sold_out`, `photo`, `description` |
| B3 | Вид слайда **`menu`** | layouts `one` / `two` / `combo` | фабрики `menu-one-16x9`, `menu-two-16x9`, `menu-combo-16x9`; body из `menu-board.js`; I3: `MENU_SCRIPT` константа + `data-*` |
| B4 | **Sold out** остаётся в сетке | как Xibo dim | CSS `menu-sold`; не удалять строку |
| B5 | Пустые категории **не дырявят** сетку | UX | omit empty categories; NFC имён (как медиа) |
| B6 | Офлайн last-good JSON | I4 | плеер кэширует успешный payload; 304 не сбрасывает экран |
| B7 | Быстрый UI «Меню» | скорость оператора | DataSet с пресетом + табличный редактор (toggle sold_out в один клик); не заставлять открывать JSON |

**Не делать в P0:** отдельный Menu Board entity как у Xibo (Category/Product таблицы) — пресет DataSet достаточен и совпадает с I2. Отдельный entity — только если операторы упрутся в UX «продукты без категории» на пилоте.

### 2.2 P1 — Операторская сеть (franchise / compliance)

| # | Функция | Зачем у конкурентов | Как лечь |
|---|---|---|---|
| E1 | **`menu.v2` schema** | FDA/EU | добавить: `allergens` (CSV кодов или JSON), `dietary` (vegan/halal/…), `sort_order`, `sku`/`pos_id`, `options` (JSON вариантов: имя+цена), `lto_until` (ISO date), `featured` (bool) |
| E2 | Footer compliance на шаблоне | FDA statements | поля слайда `calorie_footer` / `allergen_notice`; не хардкод в скрипте |
| E3 | **Named dayparts** (GAP-05) | breakfast/lunch у всех | `daypart_id` в schedule; меню = разные DataSet **или** фильтр строк по `daypart` колонки |
| E4 | Фильтр строк по daypart/тегу | одна таблица, несколько досок | `menu` slide config: `category_filter`, `tag_filter`, `max_items`; сервер/скрипт режет JSON |
| E5 | **Location price override** | STRATACACHE / Scala store login | слой `dataset_row_overrides(workspace_id, location_id|device_group_id, row_key, patch_json)`; merge при `data.json?scope=` |
| E6 | Store operator role | EAT case | permission `datasets.rows.edit` без `slides.edit`; store видит только свои override / assigned datasets |
| E7 | Multi-board sync | одна кухня → 3 панели | несколько слайдов/плееров на один `dataset_id`; уже следует из B1 — явно задокументировать |
| E8 | Dim + label sold out | Xibo | i18n «Sold out» / «Нет»; опция hide vs dim |
| E9 | Product options на доске | Xibo Options | подстрока под именем (`+ avocado €1`) из `options[]`; без второго виджета |

### 2.3 P2 — Интеграции и drive-thru (enterprise upsell)

| # | Функция | Зачем | Как лечь |
|---|---|---|---|
| I1 | **POS / inventory connector** | STRATACACHE/Scala | plugin Data Source или sync job: webhook/API → upsert rows by `sku`; sold_out из stock=0 |
| I2 | Bulk price sync | сети | CSV/JSON patch API `PATCH /api/datasets/:id/rows`; идемпотентный `sku` |
| I3 | LTO / promo strip | LTO у QSR | зона слайда или второй DataSet `promo.v1`; daypart + date window |
| I4 | Drive-thru **confirmation board** | Scala/STRATACACHE | отдельный виджет/слайд: live order lines из POS webhook (не menu.v1); вне baseline |
| I5 | Conditional rules | weather/crew | переиспользовать schedule criteria / triggers; не AI |
| I6 | Proof of menu version | audit | row version + PoP: какой ETag/dataset_rev крутился на устройстве |
| I7 | Branded template pack | Yodeck Enterprise | HQ templates locked; филиал меняет только DataSet (см. enterprise-slide-editor-plan) |

### 2.4 Вне скоупа (сознательно)

| Тема | Почему нет сейчас |
|---|---|
| AI suggestive sell / camera loyalty | STRATACACHE-класс; нет edge NPU-контракта |
| Kitchen display / kiosk ordering (Quintet full stack) | другой продукт |
| MustHaveMenus / чужие template marketplaces | IP + зависимость; своя галерея / Canva ingest |
| Второй canvas-Designer «как Canva для меню» | I1; Слайды + DataSet |
| Проксирование чужого webpage меню | XFO/CORS; см. feature-gap |

---

## 3. Архитектура (как лечь на Herald)

```
┌─────────────────────────────────────────────────────────┐
│  CMS                                                    │
│  DataSet (preset menu.v1 → menu.v2)                     │
│    rows: category, name, price, …                       │
│    optional: location overrides                         │
│  Slide template kind=menu → dataset_id + layout         │
│  Schedule / daypart → какой слайд/плейлист активен      │
└───────────────────────────┬─────────────────────────────┘
                            │ publish playlist snapshot
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Player (web / Android / Tizen / BrightSign)            │
│  MENU_SCRIPT: poll GET /api/datasets/:id/data.json      │
│               If-None-Match → 304                       │
│               last-good cache (I4)                      │
│  Render grid from JSON; sold_out CSS; NFC already on    │
│  server grouping                                        │
└─────────────────────────────────────────────────────────┘
```

**Решения (зафиксировать):**

1. **Не** отдельная таблица `menu_boards` в P0–P1. DataSet + preset = Menu Board. Если понадобится Xibo-like UX «Categories / Products», это тонкий UI над теми же rows (`category` группировка), не вторая модель.
2. **Цена — text**, не number (валютный символ, «от 4€», «market»).
3. **Photo** — только library `/api/content/...` или https allowlist (как в прототипе `safePhotoSrc`).
4. Data Sources (`{{ds:}}`) **не** заменяют DataSets для меню: iCal-модель — слоты событий, меню — N строк с группировкой. Связь позже: Data Source type `dataset` может зеркалить snapshot, но не в P0.
5. Directory Board **не** переписывать в menu: другой UX (lobby). Общий код группировки — опциональный shared helper, не merge продуктов.

---

## 4. План реализации по фазам

### Фаза 0 — Правда в документах и инвентарь (S, 1–2 дня)

- [ ] В `feature-gap-plan.md`: GAP-01 / GAP-03 / GAP-05 пометить **NOT IN HEAD** (или «прототип в Work/»), чтобы планы не врали (уже отмечено в enterprise-slide-editor-plan).
- [ ] Решить: merge `Work/screentinker-main` кусков DataSets+menu **или** перенос чистым PR в herald. Рекомендация: перенос выборочно (`datasets.js`, `menu-board.js`, тесты, i18n), не весь Work tree.
- [ ] Чеклист паритета плееров: web HTML slide path обязателен; Android/Tizen/BrightSign = тот же HTML в WebView — отдельный native kind не нужен.

### Фаза 1 — DataSets foundation (GAP-01) (L, блокер)

Без этого Menu Board — заглушка.

- [ ] DDL: `datasets`, `dataset_rows` (workspace-scoped).
- [ ] API: CRUD dataset, rows, `GET /data.json` + ETag, CSV import/export.
- [ ] UI `#/datasets`: схема, таблица строк, пресеты.
- [ ] Тесты: ETag 304, NFC cells, max rows/columns, XSS escape при любом HTML preview.
- [ ] Права: `datasets.read` / `datasets.write` (подготовка к store role).

**Выход:** оператор создаёт таблицу и получает JSON с ETag.

### Фаза 2 — Menu baseline (GAP-03 P0) (M)

Опереться на прототип `Work/.../menu-board.js` + тесты.

- [ ] `MENU_SCHEMA_V1` + preset `menu.v1`.
- [ ] `server/lib/menu-board.js`: groupCategories, layouts one/two/combo, sold_out, empty omit, NFC.
- [ ] Slide kind `menu` в `slide-render.js` / `KINDS`; `MENU_SCRIPT` poll.
- [ ] Фабрики шаблонов 16:9 (и при необходимости 9:16 для узких панелей).
- [ ] i18n ru/en (ключи уже есть в Work).
- [ ] Тесты: перенести `menu-board.test.js`; API smoke; preview iframe.
- [ ] Гайд в UI: «создайте DataSet → пресет Меню → слайд из шаблона».

**Выход:** смена цены в DataSet видна на плеере без republish; sold out dim; офлайн last-good.

### Фаза 3 — Daypart + compliance + franchise (P1) (M–L)

- [ ] Named dayparts (GAP-05) **или** колонка `daypart` + filter на слайде (если GAP-05 откладывается — фильтр достаточен для меню).
- [ ] `menu.v2` миграция пресета (additive columns; v1 rows валидны).
- [ ] Footer statements на шаблонах US/EU.
- [ ] Location overrides + merge в `data.json`.
- [ ] Role: store editor без правки шаблона.
- [ ] Options / featured / sort_order в рендере.
- [ ] Тесты: override не течёт в другой location; filter daypart; allergens escape.

**Выход:** сеть из HQ-шаблона + локальные цены/sold-out; калории и allergen notice на доске.

### Фаза 4 — Integrations (P2) (L, по запросу пилота)

- [ ] Webhook/API upsert by `sku`.
- [ ] Connector-скелет (Square / Toast / generic JSON) как plugin, не ядро.
- [ ] Promo/LTO strip.
- [ ] Dataset revision в PoP/telemetry.
- [ ] Confirmation board — только если есть POS feed и заказчик drive-thru.

**Выход:** цена/наличие из POS без ручного ввода; audit версии меню.

---

## 5. Тест-план (минимум)

| Сценарий | Ожидание |
|---|---|
| Пустая категория | не создаёт пустую колонку/дыру |
| Все items sold_out | категория остаётся, стили sold |
| Unicode / NFC категории | одна группа, не две |
| ETag совпал | 304, DOM не мигает |
| WAN down | last-good меню, не пустой экран |
| Photo unsafe URL | пустой src, нет `javascript:` |
| Override location A | location B не видит цену A |
| Daypart lunch | breakfast rows скрыты |
| XSS в name/price | escape в HTML |
| Preview CMS | тот же JSON path, что плеер |

---

## 6. Оценка объёма и зависимости

```
Фаза 0 (S)
   └─ Фаза 1 DataSets (L) ──┬─ Фаза 2 Menu P0 (M) ── Фаза 3 P1 (M–L)
                            │         ▲
                            │         └── GAP-05 dayparts желателен, не жёсткий блокер
                            └─ (параллельно) slide template gallery / lock — из enterprise-slide-editor-plan
Фаза 4 Integrations (L) — после пилота P1
```

| Фаза | Объём | Зависимости |
|---|---|---|
| 0 | S | — |
| 1 | L | схема БД, multi-tenant workspace |
| 2 | M | фаза 1 |
| 3 | M–L | фаза 2; GAP-05 или колонка daypart; RBAC |
| 4 | L | фаза 3; конкретный POS заказчика |

---

## 7. Критерии готовности продукта «Menu Boards»

**MVP (можно писать на landing без стыда):**

1. DataSet `menu.v1` + UI строк.  
2. Слайд `menu` one/two/combo.  
3. Цена/sold_out без republish.  
4. ETag + offline last-good на web player.  
5. Тесты из §5 (кроме override/daypart).

**Enterprise-ready (пилот сети 20+):**

6. Калории + allergen/dietary + footer.  
7. Daypart switch.  
8. Location price/availability override + store role.  
9. SKU + bulk/API sync (хотя бы CSV).  
10. PoP/dataset revision.

**Не блокирует enterprise-ready:** AI, drive-thru confirmation, sensor personalization.

---

## 8. Связь с другими планами

| Документ | Связь |
|---|---|
| `feature-gap-plan.md` | GAP-01/03/05 — статусы поправить; этот файл = детализация GAP-03+ |
| `enterprise-slide-editor-plan.md` | шаблоны `menu-*-16x9`; kind `menu`/`table` как пререквизиты |
| `slide-data-binding.md` | Data Sources ≠ DataSets; не смешивать модели |
| `data-sources-templates-plan.md` | room/agenda factories; menu factories — сюда, не туда |
| `multi-tenancy-design.md` | overrides и store role живут в workspace RBAC |
| `plugins.md` | POS connector = plugin, не ядро |

---

## История

| Дата | Что |
|---|---|
| 2026-09-20 | Первый план: сравнение Xibo / Rise / TelemetryTV / Scala / STRATACACHE / Poppulo; фиксация NOT IN HEAD; фазы 0–4; P0←прототип Work, P1 franchise/compliance, P2 POS |
