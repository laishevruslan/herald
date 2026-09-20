# План закрытия функциональных пробелов

**Status: PLAN, not fully built.** GAP-01…GAP-04 и INT-01…INT-05 (Цикл 1) — **BUILT** (2026-09-08). GAP-05…GAP-15 (Цикл 2) — **BUILT** (2026-09-08). GAP-16 карта парка — **BUILT** (2026-09-08). GAP-17 периодический скриншот — **BUILT** (2026-09-08). GAP-18 импорт Canva/Pixabay — **BUILT** (2026-09-08). GAP-19 geo-расписание — **BUILT** (2026-09-08). GAP-20 нативный Windows/Linux player (kiosk shell) — **BUILT** (2026-09-08). GAP-21 SSP / programmatic ads — **BUILT** (2026-09-08). Цикл 3 (остальное) — план.
Источник: сравнение ScreenTinker 2.0 с Xibo CMS 4.x (сентябрь 2026) и
внутренние документы (`docs/triggers-design.md`, `docs/playlist-nesting-design.md`,
`docs/playlist-inheritance-design.md`, `docs/player-parity.md`, `docs/mesh-directive.md`,
`docs/104-draft-preview-build-plan.md`).

Это рабочий план для продукта, а не список «сделать как Xibo». ScreenTinker остаётся CMS вокруг
**плейлиста + Слайдов (template + fields)**. Layout-редактор Xibo не копируется. Designer
помечается устаревающим и не расширяется.

Связанный обзор: canvas `screentinker-vs-xibo` в Cursor (сравнение покрытия по областям).

---

## Зачем этот документ

Xibo закрывает сценарии, которые у нас либо отсутствуют, либо существуют как частный случай,
пример в `Examples/`, API без продукта, или мёртвая заглушка в UI. Пока они не названы и не
разложены по зависимостям, каждый цикл будет снова выбирать «ещё один виджет».

Документ отвечает на три вопроса:

1. Что именно ограничено или отсутствует (инвентарь).
2. Как это лечь на текущую архитектуру, не ломая плееры.
3. В каком порядке это строить, чтобы цикл N не блокировался циклом N+1.

---

## Инварианты (не нарушать)

Нарушение любого пункта — стоп, а не «потом поправим».

- **I1 — Слайды остаются источником правды для авторства.** Новый визуальный контент идёт в
  `config.template` + `config.fields`. Designer не получает новых типов элементов.
- **I2 — Данные отдельно от макета.** Таблица (меню, рейсы, персонал) живёт в DataSet / полях
  слайда, а не в запечённом HTML.
- **I3 — Плеер не исполняет операторский ввод как код.** Скрипты слайдов — константы; конфиг
  через `data-` атрибуты. Так уже сделаны clock/date/countdown/QR. Так же — любые новые live-элементы.
- **I4 — Офлайн-путь не зависит от WAN.** Overlay, interrupt, меню, weather fallback: контент
  либо уже в кэше, либо есть явное запасное состояние. Триггер, которому нужен хаб, — не триггер.
- **I5 — Паритет плееров.** Новый тип контента либо работает на Android / web / Tizen / BrightSign,
  либо честно не декларируется в `player-capabilities.js`. Нельзя показать кнопку, которая на
  панели ничего не делает (`docs/player-parity.md`).
- **I6 — Один resolver плейлиста.** Назначение, расписание, overlay, кампания, динамическая
  группа читают `resolveDevicePlaylist` (и аналоги для overlay), а не пишут `devices.playlist_id`
  кто первый встал. См. `docs/playlist-inheritance-design.md`.

---

## Вне скоупа (не делать)

| Тема | Почему нет |
|---|---|
| Второй canvas-Designer | Заменён Слайдами; расширение Designer закрепляет устаревший путь |
| Adobe Flash, биржевые/валютные/карты-виджеты с чужими ключами | Один DataSet + шаблон покрывает это без вендорских API |
| SAML / CAS | OIDC SSO уже есть; SAML — отдельный коннектор, не дыра в IAM |
| PHP-модули, Twig, Xibo middleware | Другой стек |
| Платные лицензии плееров | Позиционирование ScreenTinker |
| Полное зеркалирование контента по mesh в 2.0 | `docs/mesh-directive.md` I2: вверх по умолчанию, вниз только request+grant |
| Cursored nesting плейлистов в Цикле 1 | `docs/playlist-nesting-design.md`: фаза 2 сознательно отложена |
| Проксирование чужих webpage (XFO) | `docs/104-draft-preview-build-plan.md`: клиентски неопределимо |

---

## Как читать приоритет

| P | Значение | Критерий |
|---|---|---|
| **P0** | Цикл 1 | Снимает отказ при выборе («у Xibo это есть») **и** ложится на уже существующий слой плеера |
| **P1** | Цикл 2 | Делает CMS операторским, а не «календарём окон» |
| **P2** | Цикл 3 | Сеть, реклама, железо; бессмысленно до P0–P1 |
| **P-int** | Внутренний долг | Уже начато или задокументировано у нас, но не доведено. Не конкурентный gap, а недоделанная собственная работа |

Оценка объёма: **S** дни, **M** 1–2 недели, **L** несколько недель с миграцией схемы и всеми плеерами.

---

# Часть A — инвентарь

Сводка. Подробности и план работ — в Части B.

### Отсутствует

DataSets (GAP-01 **BUILT**) · Menu Boards (GAP-03 **BUILT**) · именованные dayparts (GAP-05 **BUILT**) · geo-расписание (GAP-19 **BUILT**) · schedule criteria (GAP-12 **BUILT**) · кампании /
max plays per hour · agenda «что сейчас» · PDF как пункт плейлиста · HLS/live stream как тип
контента · ICS-календарь как продукт · теги · динамические / вложенные группы · срок жизни медиа
и Library Tidy · часы работы экрана и команды по расписанию · периодический
скриншот (GAP-17 **BUILT**) · Canva/Pixabay (GAP-18 **BUILT**) · SSP (GAP-21 **BUILT**) · нативный Windows/Linux player (GAP-20 **BUILT**) · PowerPoint conversion ·
кастомный module SDK · concurrent layout lock · bandwidth cap · RS232/shell к панели ·
scheduled PDF-отчёты на почту · Jalali-календарь (не планируется).

### Ограничено (есть, но не продукт)

| Что | Как ограничено |
|---|---|
| Overlay / PiP | Назначение overlay-плейлиста по расписанию (GAP-02 **BUILT**); one-shot `/api/pip` и Triggers остаются. BrightSign hwz — честный warning, не прячем UI. |
| Triggers | UI есть; Tizen/браузер — нет listen-порта на панели (хаб-forward); BrightSign audio mute на железе не проверен |
| Weather / RSS | Серверный снимок + TTL/fallback (GAP-04 **BUILT**); RSS парсится на сервере, без rss2json (GAP-04b) |
| Social Feed | Тип снят из create-form (INT-05 **BUILT** 2026-09-08); существующие виджеты — «тип снят, замените на RSS/DataSet» |
| Directory Board | Читает DataSet (`dataset_id` + column map); dual-read `config.categories` на этот релиз |
| Layouts | 7 шаблонов + drag зон, не произвольный layout Xibo |
| Designer | Помечен устаревающим; Help/onboarding ведут в Слайды (INT-03 **BUILT**) |
| Отчёты | PoP + CSV + mesh uptime; нет графиков, PDF, расписания рассылки, per-widget opt-out |
| Remote control | Android (accessibility); остальные — скриншот/команды |
| Группы | Ручные; устройство в двух группах исторически плохо резолвилось |
| HTML bundle | Монтируется, но **online-only** на всех плеерах (`docs/player-parity.md`) |
| Вложенные плейлисты | Stateless flatten; нет курсора «N элементов за оборот» |
| Mesh | Opt-in, глубина 2, контент/виджеты/layout не зеркалятся |
| Tizen OTA | Нет самообновления — только повторная установка `.wgt` |
| BrightSign | Reload виджета после деплоя может требовать restart; hwz режет transitions/PiP |
| Превью черновика | #104 **BUILT** (2026-09-08): `GET /playlists/:id/preview-payload` + iframe `/player?preview=1` |
| Enable system capture | Кнопка Android-only, не за `remote.screenshot` (INT-02 **BUILT**) |

---

# Часть B — карточки работ

Каждая карточка: проблема, сейчас, цель, как лечь, файлы, тесты, зависимости, объём.

---

## Цикл 1 — P0: закрыть отказ при выборе

### GAP-01 DataSets — табличные данные отдельно от макета

**P0 · L · зависимость: нет (фундамент для GAP-03, GAP-06, части GAP-11) · статус: BUILT 2026-09-08**

**Проблема.** Меню, рейсы, персонал, цены правятся только внутри виджета или слайда. У Xibo
DataSet — независимый объект: CSV, remote JSON, API, RSS из таблицы, realtime connector.

**Сейчас (сделано).** Workspace-scoped таблицы `datasets` / `dataset_rows`. UI `#/datasets`,
API `/api/datasets` (PAT + JWT). Directory-board v2 читает DataSet; слайд-элемент `table`
ссылается на `dataset_id`. Старый `config.categories` dual-read + migrate-on-boot
(`source: 'embedded'`). CSV import; JSON URL sync по cron **без** `overwrite_local`.
Публичный `GET /api/datasets/:id/data.json`. RSS publish — не в v1.

**Как легло.** HTML directory-board не вытаскивался. F.3: migrate-on-boot + dual-read этот релиз.

**Файлы.** `server/routes/datasets.js`, `server/lib/datasets.js`, `server/services/dataset-sync.js`,
`frontend/js/views/datasets.js`, `docs/openapi.yaml`.

**Тесты.** `server/test/datasets-lib.test.js`, `datasets-api.test.js`; isolation; CSV; sync skip
local edits; slide/widget empty state.

**Не делали.** SQL от оператора; JS в шаблоне строки; realtime websocket (Цикл 3).

---

### GAP-02 Планируемый overlay / постоянный PiP-слой

**P0 · M · зависит от I6 (resolver); усиливает GAP-01 (ticker из DataSet) · статус: BUILT 2026-09-08**

**Проблема.** У Xibo overlay-layout живёт отдельно от основного расписания. У нас PiP умеет
плеер (`playback.pip`), Examples и Triggers кладут контент в этот слой, но оператор не может
сказать: «на всех лобби с 8:00 бегущая строка».

**Сейчас (сделано).** Таблица `overlay_assignments` (device XOR group, `schedule_id` NULL = всегда).
Resolver-сиблинг `resolveDeviceOverlay` (I6: никогда не пишет `devices.playlist_id`). Device override
побеждает группу. Payload `overlay: { playlist, pin: true, always, position, schedule } | null`.
Тот же `#pipContainer` / `pipLayout` / `#pip`, что у triggers: trigger > overlay > base. Overlay
крутит items независимо (F.2). Пин в кэш вместе с trigger media. UI на устройстве, в группе и на
Schedule. Виджеты (тикер) разрешены; YouTube и remote_url — нет. BrightSign hwz: warning, не прячем
pip-capable UI (I5).

**Как легло.** Не второй ExoPlayer на Android, пока играет trigger — overlay отпускает декодер.
Tizen `PipOverlay.teardown` снимает только `.pip-box`. Окно расписания оценивается на плеере
(`cms-schedule-eval.js`), чтобы WAN-down не гасил слой (I4).

**Файлы.** `server/lib/overlay.js`, `server/lib/resolve-device-overlay.js`, `server/routes/overlay.js`,
`server/lib/cms-schedule-eval.js`, web `#pipContainer` / `.overlay-box`, Android `OverlayPlaylist.kt`,
Tizen `overlay-playlist.js`, `frontend/js/views/device-detail.js` (панель overlay).

**Тесты.** `overlay-lib.test.js` (device > group, isolation, always vs window); `overlay-api.test.js`;
`overlay-player.test.js` (pin, fingerprint, z-order); `overlay-playlist.test.js`; pinning concat.

**Не делали.** Второй hardware decoder рядом с trigger player; Designer; interpolating operator JS (I3).

---

### GAP-03 Menu Boards

**P0 · M · зависит от GAP-01 · статус: BUILT 2026-09-08**

**Проблема.** QSR назван рынком в README. У Xibo Menu Board: Category / Products. У нас нет.

**Сейчас.** Текст/HTML, слайды, directory-board (не цены).

**Цель.** Шаблон слайда (или виджет) «меню»: категории, название, цена, калории, бейдж
(new/spicy/sold out), фото. Данные только из DataSet. Смена цены не republish слайда, только
строка датасета; плеер подтягивает JSON с ETag.

**Как лечь.** Не отдельный «Menu CMS». DataSet со схемой-пресетом `menu.v1` + 2–3 слайдовых
шаблона (одна колонка, две, комбо). Sold out = поле, не удаление строки.

**Тесты.** Пустая категория не дырявит сетку. Офлайн: последний успешный JSON. Unicode цен и
названий (NFC, как медиа).

**Собрано.** Пресет `menu.v1`; вид слайда `menu` (layout `one` / `two` / `combo`); `MENU_SCRIPT`
опрашивает `/api/datasets/:id/data.json` с ETag/304; sold_out остаётся в сетке; пустые
категории опускаются. **F.1:** слайд-шаблон на DataSet, не виджет и не Designer.

---

### GAP-04 Fallback для Weather / RSS / webpage

**P0 · S · зависимостей нет · статус: BUILT 2026-09-08**

**Проблема.** Офлайн — заявленная сила, а live-виджеты при обрыве пустеют. У Xibo fallback и
freshness check.

**Сейчас (сделано).** Сервер кладёт последний успешный weather/RSS в `widget_live_snapshots`
(cron + refresh при save). Виджет печёт seed в HTML и опрашивает `GET /api/widgets/:id/live.json`
(CORS, ETag/304). Конфиг: `fallback_text` / картинка из библиотеки + `stale_after_sec` — по
истечении TTL payload не отдаётся, на экране fallback, не протухшая погода. Webpage: постер из
библиотеки под iframe + честная подпись (как #104); iframe.onerror прячет рамку. Чужой HTML не
проксируется. Скрипты — константы (`widget-live-scripts.js`), конфиг через `data-*` и seed (I3).

**Как легло.** Серверный снимок, не fetch из виджета на wttr.in/rss2json. GAP-04b в том же проходе.

**Тесты.** `server/test/widget-live.test.js`, `widget-live-api.test.js`; XSS без rss2json; locale
weather в `data-locale`, не в URL провайдера.

---

### GAP-04b RSS без третьего SaaS

**P0/P1 · S · рядом с GAP-04 · статус: BUILT 2026-09-08**

Виджет RSS больше не ходит в `rss2json.com`. Сервер качает feed по http(s), парсит RSS 2.0 / Atom,
отдаёт JSON тем же кэшем, что GAP-04. **F.4:** без feature-flag, сразу серверный парсер.

---

## Цикл 1 сопутствующий внутренний долг (P-int, делать в том же окне)

### INT-01 Довести триггеры на железе

**P-int · S–M · статус: BUILT 2026-09-08** (честность продукта; ear-test BrightSign не выполнялся)

UI есть. Tizen зафиксирован как «нет UDP/HTTP ingress на панели»; дашборд не предлагает listen-порты
на Tizen и в браузерной вкладке — флажки Accept там значат пересылку хабом
(`TRIGGERS_ACCEPT_HTTP` / `UDP`). `trigger.http` / `trigger.udp` в словаре capabilities, чтобы
пробитый bind не отбрасывался. BrightSign audio mute на железе по-прежнему **не проверен ушами**;
плеер пишет и `muted=true`, и `volume=0`. Probe: `brightsign/audio-plane-test.html`.

### INT-02 Кнопка enable_system_capture

**P-int · S · статус: BUILT 2026-09-08**

Команда на сервере ungated. Кнопка только на Android (`isAndroidDevice`), не за
`can('remote.screenshot')`. Вкладка Remote показывается Android-панели даже без remote-caps, иначе
bootstrap прятался вместе с вкладкой.

### INT-03 Designer: Help и onboarding

**P-int · S · статус: BUILT 2026-09-08**

Help «AI Content Design» и onboarding ведут в Слайды. Designer остаётся в нав с пометкой
устаревания (en/ru).

### INT-04 Черновик-превью плейлиста (#104)

**P-int · M · статус: BUILT 2026-09-08**

План: `docs/104-draft-preview-build-plan.md`. `assemblePayload` общий с устройством;
`GET /api/playlists/:id/preview-payload`; iframe `/player?preview=1`. Skip/fast-forward не
расширяли (уже был #239 prev/next — оставлен).

### INT-05 Social Feed: сделать

**P-int · S · статус: BUILT 2026-09-08**

Тип убран из create-form. POST `/api/widgets` с `social` — 400. Существующие виджеты рендерят
«тип снят, замените на RSS/DataSet», без «Configure API key». Mastodon/DataSet — Цикл 2, не этот проход.

---

## Цикл 2 — P1: операторский CMS

### GAP-05 Именованные dayparts

**P1 · S · зависит от текущего Schedule · статус: BUILT 2026-09-08**

**Проблема.** «Завтрак 7–11» копируется на каждое устройство.

**Цель.** Объект daypart (имя, локальные окна по дням недели, timezone workspace). Событие
расписания ссылается на daypart_id вместо сырых часов. Изменение «обеда» двигает все события.

**Как лечь.** Не заменять calendar UI. Daypart — шаблон интервала; resolver расписания уже
умеет start/end.

**Тесты.** Пересечение dayparts + priority как сейчас. Смена timezone workspace не сдвигает
«07:00 локально».

---

### GAP-06 Календарь / ICS как продукт

**P1 · M · лучше после GAP-01 · статус: BUILT 2026-09-08**

**Проблема.** `Examples/PIP-Room-Status-Calendar` — не виджет и не слайд.

**Цель.** Виджет + элемент слайда: URL ICS или DataSet событий. Поля: now / next / список дня.
Офлайн: последний ICS в кэше.

**Как лечь.** Парсер ICS на сервере (не в WebView). Конфиг через data-атрибуты, скрипт-константа
(I3). Не fetch ICS с панели в WAN-down сценарии.

**Не делать.** Редактор календаря взамен Google; достаточно потребления ICS.

---

### GAP-07 HLS / live stream

**P1 · S–M · I5 обязателен · статус: BUILT 2026-09-08**

**Проблема.** Нет типа контента «поток».

**Цель.** `content.type = stream`, URL HLS. Плеер: Android ExoPlayer HLS, web `hls.js` или
native Safari, Tizen AVPlay если умеет, иначе честный unsupported. Таймаут → следующий пункт
плейлиста или постер.

**Тесты.** Паритет: устройство без `playback.hls` не получает пункт в snapshot (как другие
capability gates). Ошибка потока не клинит плейлист.

---

### GAP-08 PDF как пункт плейлиста

**P1 · M · статус: BUILT 2026-09-08**

**Проблема.** Прайс и объявления приходят PDF.

**Цель.** На upload сервер рендерит страницы в PNG/WebP (как ffmpeg для видео). Плеер играет
изображения с dwell на страницу. Оригинал хранится для скачивания.

**Как лечь.** Не PDF.js на Tizen/BrightSign. Один путь — картинки. Зависимость: poppler/pdftoppm
или аналог в Docker-образе (как ffmpeg: optional + честный лог при отсутствии).

**Тесты.** Многостраничный PDF → N items или один item с внутренним циклом страниц
(решить в реализации: **рекомендация** — один content с `pages[]`, dwell per page, чтобы
proof-of-play считал документ, а не 40 файлов).

---

### GAP-09 Теги и динамические группы

**P1 · M · I6 обязателен · статус: BUILT 2026-09-08**

**Проблема.** Группы ручные. Xibo: tags, nested groups, dynamic groups по критерию.

**Цель v1.**

- Теги на device, content, playlist (свободные строки, нормализация lowercase).
- Динамическая группа: правило `tag in (...)` и/или `platform = android`. Членство считается
  при чтении, не копируется.
- Вложенные группы **не в v1** (P2): легко сломать resolver.

**Как лечь.** Назначение плейлиста/overlay/schedule на динамическую группу идёт через тот же
resolver, что ручная. Устройство в двух группах: priority группы + oldest, как schedules.

**Тесты.** Смена тега мгновенно меняет membership без 12 writers. Ручная группа с тем же
устройством: явный priority.

---

### GAP-10 Agenda «что сейчас на экране»

**P1 · S · зависит от I6, усиливается GAP-02/GAP-05 · статус: BUILT 2026-09-08**

**Проблема.** Чтобы понять, что играет парк, надо открывать устройства по одному.

**Цель.** View Schedule / отдельная страница: устройство, базовый плейлист, активное событие,
overlay, trigger если держится, next-up. Фильтр по группе/тегу.

**Как лечь.** Только чтение resolver + scheduler. Никакой новой модели воспроизведения.

---

### GAP-11 Срок жизни медиа и Library Tidy

**P1 · S · статус: BUILT 2026-09-08**

**Проблема.** Промо висит после акции; библиотека растёт.

**Цель.** `expires_at` на content. По истечении: не попадает в **новые** publish; уже
опубликованный snapshot играет до следующего publish (иначе экран вспыхнет дырой). Tidy:
кандидаты «не в одном published snapshot и не в draft», с подтверждением. Не silent delete.

**Тесты.** Expired item в published snapshot остаётся до republish. Tidy не трогает trigger
pin-set.

---

### GAP-12 Schedule criteria (погода и локальный сигнал)

**P1 · M · GAP-05 желателен · статус: BUILT 2026-09-08**

**Проблема.** Xibo 4.1: зонтик только в дождь. У нас Triggers — авария, не контент.

**Цель.** На событии расписания: условие `weather.condition in rain|snow` или
`player.criterion.door = open`. Плеер (не сервер) выбирает подходящее событие — иначе WAN-down
ломает «погоду на панели».

**Как лечь.** Погоду для критерия кэшировать на устройстве (GAP-04). Локальный criterion —
тот же канал, что trigger ingress (HTTP/UDP), но меняет schedule slot, а не кладёт overlay.
Не смешивать с trigger token namespace (`docs/triggers-design.md`).

---

### GAP-13 Кампании и max plays per hour

**P1 · M · PoP уже есть · статус: BUILT 2026-09-08**

**Проблема.** Реклама и proof-of-play CSV есть, частоты нет.

**Цель.** Кампания = упорядоченный набор плейлистов или items + `max_plays_hour` на item.
Счётчик на устройстве, сброс по локальным часам. Отчёт в существующий PoP.

**Как лечь.** Не flatten в CMS каждый час. Плеер соблюдает лимит (как курсор nesting — состояние
на панели). Сервер не может честно лимитировать офлайн-панель.

**Связь.** Cursored nesting (`docs/playlist-nesting-design.md` phase 2) закрывает «N роликов из
блока за оборот». Если кампании нужны раньше курсора — max plays на item, без курсора child
playlist.

---

### GAP-14 Часы работы и команды по расписанию

**P1 · S · статус: BUILT 2026-09-08**

**Проблема.** Screen on/off и reboot есть как команды, нет календаря питания.

**Цель.** Operating hours на устройстве/группе → команды `screen_off` / `screen_on` в начале
края. Опционально: scheduled command (reboot nightly).

**I5.** Только платформы с `power.screen` / reboot capability. Остальные — пункт не показывается.

---

### GAP-15 HTML bundle в офлайн-кэш

**P1 · M · из player-parity, не из Xibo · статус: BUILT 2026-09-08**

**Проблема.** Bundle играет только online. Для киосков и HTML-меню это дыра в I4.

**Цель.** Пинить flattened bundle document в ContentCache, как виджет.

---

## Цикл 3 — P2: сеть, реклама, железо

### GAP-16 Карта парка

**P2 · S · статус: BUILT 2026-09-08**

**Проблема.** Парк не видно на карте; координаты если и есть, то не продукт.

**Сейчас (сделано).** Страница `#/map`: статус online/offline на OSM (Leaflet локально). Opt-in
двусторонний: `devices.geo_opt_in` (CMS, по умолчанию выкл) + OS location permission на Android
(`location.gps`, не в BASELINE). Ручная точка для панелей без GPS; GPS не перезаписывает manual.
Heartbeat игнорирует координаты без opt-in. Payload `geo_share`. Tizen/web не заявляют GPS.

**Файлы.** `server/lib/geo.js`, `server/routes/fleet-map.js`, `frontend/js/views/fleet-map.js`,
Android `DeviceInfo` / `PlayerCapabilities` / `geo_share`.

**Тесты.** `server/test/geo-fleet-map.test.js`; `location.gps` не в BASELINE.

**Не делали.** Трек истории GPS; Google Maps.

### GAP-17 Периодический скриншот

**P2 · S · статус: BUILT 2026-09-08**

**Проблема.** On-demand снимок есть, истории и интервала нет. Сотовая сеть не должна получать поток кадров по умолчанию.

**Сейчас (сделано).** Opt-in `devices.screenshot_interval_sec` (0 = выкл, минимум 60 с). Keep-N
`screenshot_keep` (1–48, по умолчанию 8). Сотовая / metered — только при `screenshot_allow_cellular`
(по умолчанию 0). Плеер гоняет таймер с payload (`screenshot_interval_sec`); сервер пишет на диск
только кадр с `periodic: true` и не чаще ~80% интервала. Live Remote и опрос вкладки устройства в
историю не попадают. UI только при `can('remote.screenshot')` (I5). On-demand не трогали.

**Файлы.** `server/lib/periodic-screenshot.js`, ingest в `deviceSocket.js`, PUT `/api/devices/:id`,
`GET /api/devices/:id/screenshots`, Android / web / Tizen таймер + skip metered.

**Тесты.** `server/test/periodic-screenshot.test.js`.

**Не делали.** История через mesh proxy (там по-прежнему latest); очередь кадров офлайн.

### GAP-18 Импорт Canva

**P2 · M · статус: BUILT 2026-09-08**

**Проблема.** В библиотеке не было пути «взять макет из Canva / сток из Pixabay», не встраивая чужой
редактор.

**Сейчас (сделано).** Canva Connect (PKCE) и Pixabay API → обычный content-ряд. Байты качаются в
`contentDir` и проходят `ingestUploadedFile` (I4: URL экспорта Canva истекает). Редактор Canva не
встраивается в Слайды (I1). Ненастроенный ключ честно отключён (I5). Секреты — JWT-only, как AI.

**Файлы.** `server/lib/media-import.js`, `server/routes/media-import.js`, таблица
`media_import_settings`, UI в Content Library, callback `/api/import/canva/callback`.

**Тесты.** `server/test/media-import.test.js`.

**Не делали.** Встраивание редактора Canva; хранение remote_url на CDN Canva/Pixabay.

Разбор, почему iframe-редактор недоступен, как это делают конкуренты, и реализуемый путь (Connect Return Navigation): [`docs/canva-editor-embed-plan.md`](canva-editor-embed-plan.md).

### GAP-19 Geo-расписание

**P2 · M · после GAP-12 и GAP-16 · статус: BUILT 2026-09-08**

**Проблема.** Событие «играть этот плейлист, только пока экран в зоне» не существовало. Погода
и локальный критерий (GAP-12) уже выбираются на плеере; география жила только на карте парка.

**Сейчас (сделано).** `criteria_json.geo`: полигон `[[lat,lng],…]` (≥3) и `ttl_sec` (60…604800,
по умолчанию 3600). AND с weather / local criterion. Сервер по-прежнему **не** пишет
criteria-событие в `scheduled_playlist_id` (решение 10 / I6): шлёт кандидатов в
`criteria_schedules` плюс `geo_hint` (last-known / ручная точка). Плеер fail closed: нет точки
или GPS last-known старше TTL — событие не включается; ручная точка на карте парка считается
свежей. Web / Tizen / Android оценивают одинаково. Capability новая не нужна: это условие
расписания, не тип контента; работает с ручной точкой без `location.gps`.

**Файлы.** `server/lib/geo-fence.js`, `server/lib/schedule-criteria.js`, `geo_hint` в
`assemblePayload`, UI календаря (Leaflet + вершины), Android `ScheduleCriteria.kt`, Tizen
`js/schedule-criteria.js`, web player `geoHint`.

**Тесты.** `server/test/schedule-criteria.test.js`; Android `ScheduleCriteriaTest`.

**Не делали.** Трек истории; фоновый live GPS; гео-критерий в overlay-слое.

### GAP-20 Нативный Windows / Linux player

**P2 · L · статус: BUILT 2026-09-08**

**Проблема.** Возражение «у Xibo бесплатный Windows player». Кнопка Windows в Add Display вела на
`/scripts/windows-setup.bat`, которого не было (404). Linux PC не имел player-only установщика
(Pi и Debian 13 — all-in-one / другой путь). PWA манифест был у CMS (`start_url: /`), не у `/player`.

**Сейчас (сделано).** Не второй движок. Тот же web player на `/player`:

- PWA `/player/manifest.json` (`display: fullscreen`, `start_url`/`scope`: `/player`).
- Windows: `windows-setup.ps1` + лаунчер Edge/Chrome `--kiosk`, отдельный `--user-data-dir`,
  автозапуск (Scheduled Task at logon) и watchdog раз в минуту (тот же лаунчер, no-op если
  профиль уже занят). Скачанный из Add Display `.bat` запекает origin. Assigned Access — только
  Pro/Edu/Ent и явный `-KioskUser`; Home честно остаётся autostart+watchdog. Winlogon Shell
  администратора не подменяется. InPrivate запрещён (pairing в localStorage профиля).
- Linux PC: `linux-player-setup.sh` player-only (не CMS). Качество лаунчера как у Pi: Wayland
  ozone, `--password-store=basic`, wipe Sessions, SingletonLock, цикл рестарта Chromium.
  Desktop: autostart + timer; Lite: systemd `Restart=always`.
- `platform_family` по-прежнему **web** (I5). Remote desktop не обещается.

**Файлы.** `server/lib/desktop-player.js`, `scripts/windows-setup.ps1`,
`scripts/windows-start-kiosk.ps1`, `scripts/windows-setup.bat`, `scripts/linux-player-setup.sh`,
`server/player/manifest.json`, маршрут `.bat` в `server/server.js`, Add Display / onboarding / Help.

**Тесты.** `server/test/desktop-player.test.js`.

**Не делали.** Второй Chromium/Electron; RDP/remote на Windows; `system.kiosk` в capabilities;
подмена shell у администратора; InPrivate.

### GAP-21 SSP / programmatic ads

**P2 · L · после GAP-02 и GAP-13 · статус: BUILT 2026-09-08**

**Проблема.** Нет честного пути «слот в плейлисте/overlay, fill от вендора». Свой ad-сервер
(букинг, pacing, yield) — не цель v1.

**Сейчас (сделано).** Вендорский коннектор VAST 2/3/4 Linear:

- MIME `application/vnd.screentinker.ssp`. Capability `playback.ssp` **не в BASELINE** (I5):
  панель без декларации не получает слот в snapshot (как HLS).
- Workspace tag URL в `ssp_settings` (secretbox, JWT-only `/api/ssp`). Env `SSP_TAG_URL` —
  fallback. Per-slot URL в `ssp_slot_tags`, не в `content.remote_url`.
- Плеер `POST /api/ssp/fill` (device_id + device_token). Сервер тянет тег (SSRF + один wrapper
  hop), выбирает MediaFile mp4/webm/jpeg/png/gif, **impression URL на плеер не отдаёт**.
  `play_start` / `POST /api/ssp/shown` бьёт пиксели с коробки (max 8, 5s).
- I4: WAN-down / empty / timeout → library fallback (`ssp_fallback` в payload) или skip.
  Креатив офлайн не обещается.
- Overlay (GAP-02) и base playlist. PoP — существующие `play_logs`, имя `[SSP] advertiser`.
  Отдельной таблицы Campaign нет (решение 9: `max_plays_hour`).

**Файлы.** `server/lib/vast.js`, `server/lib/ssp.js`, `server/routes/ssp.js`, fill в
`server/server.js`, filter+enrich в `deviceSocket.js`, web / Android / Tizen players,
Content Library, i18n en/ru.

**Тесты.** `server/test/ssp.test.js`; capability не в BASELINE; web declares `playback.ssp`.

**Не делали.** Свой ad server; OpenRTB bidder; VPAID/JS creative (I3); плеер, который сам
ходит на произвольный VAST URL (SSRF); offline ads.

### GAP-22 Вложенные группы устройств

После того как динамические группы (GAP-09) и resolver прожили релиз. Иначе снова 12 writers.
**M.**

### GAP-23 Отчёты: графики, PDF, почта, per-item opt-out

PoP уже hourly/daily. Добавить: chart в Reports, optional PDF, cron email, флаг
`collect_stats` на content. **M.** Не строить BI.

### GAP-24 Concurrent edit lock на слайды/плейлисты

Xibo Layout Lock. Для нас: lease на deck/playlist, кто редактирует, TTL, steal с предупреждением.
**S.**

### GAP-25 Bandwidth cap на устройство

Лимит суточного download. Плеер откладывает non-urgent pin. OTA и trigger pin — вне лимита или
с отдельным потолком. **M.**

### GAP-26 PowerPoint

Конвертация на сервере в изображения (как PDF) **или** не делать: просить PDF/Canva. Если делать —
тот же пайплайн, что GAP-08. **M.** Не тащить LibreOffice в обязательные зависимости self-host
без opt-in пакета.

### GAP-27 Module SDK / developer templates

HTML bundle + sandbox уже есть. SDK = документированный контракт bundle + dataset binding, не
загрузка произвольного JS в ядро CMS. **L.** После GAP-01.

### GAP-28 RS232 / shell на панель

Android device-owner shell частично есть. BrightSign/Tizen — платформенные команды. Не общий
«shell widget» как у Xibo без capability gate. **M, по платформам.**

### GAP-29 Mesh: выборочный downlink контента

Уже как request+grant. Не путать с «сделать как один Xibo CMS». Следовать `docs/mesh-directive.md`.
**L, отдельная фаза mesh.**

### GAP-30 Cursored playlist nesting

`docs/playlist-nesting-design.md` phase 2. Нужен рекламе и GAP-13 в полной форме. **L, все плееры.**

---

## Ограниченный функционал, который не отдельный эпик

Довести в рамках соседних задач, не заводить отдельный трек.

| Тема | Действие |
|---|---|
| Макеты из 7 шаблонов | Не цель = Xibo freeform. Слайды покрывают композицию внутри зоны. Свободное число зон уже есть drag. Документировать, не «доделывать layout editor» |
| Remote только Android | Честная подпись в UI; Windows/Linux shell (GAP-20 **BUILT**) даёт kiosk, не remote desktop |
| Tizen без OTA | Документировать в Help; не обещать кнопку Update |
| BrightSign reload / hwz | Player-parity; overlay (GAP-02) учитывает hwz |
| Help про ИИ в Designer | INT-03 |
| Локализация Designer «устаревает» | В en/ru есть; остальные локали без пометки — выровнять строки `nav.designer` |
| Volume / часть команд | Сверено в player-parity; регрессии ловить capability-тестами, не новым эпиком |

---

# Часть C — порядок и зависимости

```
INT-03 Designer→Slides help          ──┐
INT-02 capture button                ──┤  можно параллельно с Циклом 1, S
INT-05 Social: remove or replace     ──┘

GAP-04 fallback + GAP-04b RSS parse  ── **BUILT** фундамент офлайна live-виджетов
GAP-01 DataSets                      ── фундамент данных
        ├─ GAP-03 Menu Boards **BUILT**
        ├─ GAP-06 ICS (может стартовать на URL без dataset, маппинг — вторая итерация)
        └─ GAP-27 SDK (Цикл 3)

GAP-02 Overlay                       ── фундамент слоёв
        ├─ GAP-10 Agenda (читает overlay)
        ├─ GAP-21 SSP (Цикл 3)
        └─ INT-01 trigger hardware (тот же compositor)

I6 resolver (если ещё дыры)          ── GAP-09 dynamic groups, GAP-10, GAP-02 group overlay

GAP-05 dayparts ─ GAP-12 criteria ─ GAP-19 geo
GAP-07 HLS, GAP-08 PDF, GAP-11 tidy, GAP-14 hours, GAP-15 bundle cache ── независимо внутри Цикла 2
GAP-13 campaigns ── после PoP как есть; полный вид после GAP-30

Цикл 3: 22, 23, 24, 25, 26, 28, 29 (16–21 собраны)
```

**Не начинать Цикл 2, пока нет:** DataSets v1 (хотя бы CRUD + один consumer) и overlay assignment
(хотя бы always-on, без daypart). Иначе меню и ticker снова станут одноразовыми виджетами.

---

# Часть D — схема данных (черновик, Цикл 1)

Имена таблиц рабочие. Точные миграции — в PR, в том же стиле, что существующие boot-migrations.

```
datasets (
  id, workspace_id, name, schema_json, source,   -- source: manual | csv | url
  source_url, sync_interval_sec, updated_at
)
dataset_rows (
  id, dataset_id, data_json, sort_order, updated_at
)

overlay_assignments (
  id, workspace_id,
  device_id NULL, group_id NULL,                 -- как schedules: ровно одно
  playlist_id,                                   -- published snapshot only
  schedule_id NULL,                              -- NULL = always
  priority
)
```

Dayparts, tags, campaigns — Цикл 2, не смешивать в первую миграцию.

Payload плеера (добавки, не ломая текущий snapshot):

```
overlay: { playlist: <flattened snapshot>, pin: true } | null
datasets: { <id>: { etag, rows } }   -- только те, на которые ссылаются items
```

Плеер без понимания полей игнорирует их (форвард-совместимость). Старый плеер не должен
терять базовый плейлист.

---

# Часть E — критерии готовности циклов

### Цикл 1 готов, когда

- [x] Оператор создаёт DataSet, правит строку, слайд/меню/directory показывает новое без
      пересборки layout вручную. *(directory + slide table + menu board)*
- [x] На устройстве можно назначить overlay-плейлист «всегда»; база играет под ним; trigger
      перекрывает и возвращает.
- [x] Есть хотя бы один menu-шаблон на DataSet.
- [x] Weather и RSS показывают последнее известное или заданный fallback без сети.
- [x] RSS не требует rss2json.
- [x] Social не врёт «настройте ключ» (удалён или работает).
- [x] Help/onboarding не отправляют за ИИ в Designer.
- [x] Тесты workspace isolation на datasets.
- [x] Офлайн overlay; WAN-down weather.
- [x] Capability: overlay не предлагается там, где pip заведомо мёртв, либо есть документированный
      degrade.

### Цикл 2 готов, когда

- [x] Daypart переиспользуется на нескольких экранах.
- [x] Agenda показывает base + overlay + next без обхода устройств.
- [x] PDF и HLS (где capability есть) играют как пункты плейлиста.
- [x] ICS-виджет в библиотеке виджетов, не только в Examples.
- [x] Теги + динамическая группа назначают плейлист без копирования membership.
- [x] Expired media не попадает в новый publish; tidy не убивает pinned trigger/overlay.
- [x] Operating hours гасят экран на платформах с power capability.
- [x] Bundle доступен из кэша офлайн.

### Цикл 3 — отдельные ADR на каждый эпик

Не считать «неполный Xibo» блокером релиза. Вложенные группы — по спросу.

---

# Часть F — открытые решения (закрыть до кода Цикла 1)

1. **Menu = слайд-шаблон или виджет?** **Решение 2026-09-08:** слайд-шаблон на DataSet (вид
   `menu`, layout one/two/combo), чтобы шрифты, motion и publish совпадали со Слайдами.
   Виджет — только если позже понадобится полный экран без колоды. Designer не расширяли (I1).
2. **Overlay dwell.** Overlay-плейлист крутит свои items независимо от базы или статичен?
   **Решение 2026-09-08:** независимый цикл (как зона layout). Иначе ticker из одного RSS-item
   бесполезен. Рекомендация плана совпала.
3. **Directory-board миграция.** **Решение 2026-09-08:** migrate-on-boot + dual-read этот релиз
   (DataSet первый, иначе `config.categories`). Рекомендация плана совпала.
4. **rss2json.** **Решение 2026-09-08:** серверный парсер сразу, без feature-flag (иначе air-gap
   снова сюрприз). Виджет больше не вызывает `rss2json.com`.
5. **Social.** Удалить в Цикле 1 (честнее) или Mastodon через DataSet в Цикле 2. **Решение
   2026-09-08:** тип убран из create-form; существующие виджеты показывают «тип снят, замените на
   RSS/DataSet». POST create с `social` — 400. Mastodon через DataSet остаётся Циклом 2.

6. **PDF pages.** **Решение 2026-09-08:** один content-ряд + `pages[]` в snapshot. Dwell на страницу
   = `duration_sec` пункта плейлиста, чтобы proof-of-play считал документ, а не 40 файлов.
7. **Expiry vs live snapshot.** **Решение 2026-09-08:** sweep только деактивирует; опубликованный
   snapshot играет до следующего publish (без republish из expiry).
8. **Workspace timezone.** **Решение 2026-09-08:** display-only для UI daypart; «07:00» — настенные
   часы, смена TZ workspace не конвертирует окна.
9. **Campaigns.** **Решение 2026-09-08:** нет отдельной таблицы Campaign. `max_plays_hour` на
   playlist item; счётчик на устройстве.
10. **Schedule criteria.** **Решение 2026-09-08:** сервер не кладёт criteria-событие в
    `scheduled_playlist_id`; payload `criteria_schedules` + `weather_hint`; плеер HTTP `/criterion`
    отдельно от trigger token namespace.
11. **Dynamic groups.** **Решение 2026-09-08:** `tag in (...)` — ANY из списка тегов AND опционально
    platform. Вложенные группы не в v1.
12. **Social/Mastodon в Цикле 2.** **Решение 2026-09-08:** не пересобирали. RSS + DataSet закрывают
    честный контент; Mastodon через DataSet остаётся опциональным.
13. **Карта парка.** **Решение 2026-09-08:** OSM + локальный Leaflet, без ключа Google. Opt-in
    CMS (`geo_opt_in`) и OS permission; ручная точка для панелей без GPS; `location.gps` не в
    BASELINE. Тайлы — из браузера оператора; маркеры видны и без них.
14. **Периодический скриншот.** **Решение 2026-09-08:** таймер на плеере с payload; persist только
    `periodic: true` с троттлингом интервала; keep-N на диске; сотовая выкл по умолчанию
    (`screenshot_allow_cellular`). On-demand и Remote stream без изменений. Capability новая не
    вводилась — UI за `remote.screenshot`.
15. **Импорт Canva/Pixabay.** **Решение 2026-09-08:** скачать байты в библиотеку (не live URL).
    Редактор Canva не встраивать. Pixabay — тот же ingest. Секреты workspace, JWT-only; env —
    fallback. SSP — GAP-21 **BUILT** (вендорский VAST, не свой ad server).
16. **Geo-расписание.** **Решение 2026-09-08:** расширить `criteria_json`, не второй scheduler.
    Сервер шлёт time-active geo в `criteria_schedules` + `geo_hint`; плеер fail closed. Manual pin
    = fresh; GPS last-known уважает `ttl_sec`. Не класть в `scheduled_playlist_id`. `location.gps`
    не добавлять в BASELINE.
17. **Windows/Linux player.** **Решение 2026-09-08:** не второй движок. PWA + kiosk shell вокруг
    `/player` (Edge/Chromium `--kiosk`, dedicated profile, autostart, watchdog). Assigned Access
    только на Pro/Edu/Ent и не для учётки администратора. Home = autostart+watchdog, честно.
    `platform_family` web; remote остаётся Android. InPrivate не использовать.

18. **SSP / programmatic.** **Решение 2026-09-08:** вендорский VAST Linear коннектор, не ad
    server. Fill на CMS (SSRF); impression URL не покидают коробку; `playback.ssp` не в
    BASELINE; офлайн — только library fallback (I4). Overlay-слот использует GAP-02.

Когда решение принято — дописать его сюда датой, как в `playlist-nesting-design.md`.

---

# Часть G — соответствие файлам продукта

| Область | Где смотреть сегодня |
|---|---|
| Виджеты | `frontend/js/views/widgets.js`, `server/routes/widgets.js`; live JSON `server/lib/widget-live.js` |
| DataSets | `frontend/js/views/datasets.js`, `server/routes/datasets.js`, `server/lib/datasets.js` |
| Слайды | `frontend/js/views/slides.js`, `server/routes/ai.js`, `server/lib/slide-fonts.js`, `server/lib/slide-render.js` (kind `menu`) |
| Menu Boards | `server/lib/menu-board.js`, пресет `menu.v1` в DataSets, вид слайда `menu` |
| Расписание | `server/routes/schedules.js`, `frontend/js/views/schedule.js` |
| Плейлисты / snapshot | `server/routes/playlists.js`, `server/ws/deviceSocket.js` |
| Наследование | `docs/playlist-inheritance-design.md` |
| PiP / overlay слой | Android `PipOverlay` + `OverlayPlaylist`, web `#pipContainer` / `.overlay-box`, Tizen `pip-overlay.js` + `overlay-playlist.js`, CMS `server/lib/overlay.js` |
| Triggers | `docs/triggers-design.md`, `frontend/js/views/triggers.js`, `server/routes/triggers.js` |
| Паритет плееров | `docs/player-parity.md`, `server/lib/player-capabilities.js` |
| PoP | `frontend/js/views/reports.js`, export CSV |
| Mesh | `docs/mesh-directive.md` |
| Карта парка | `frontend/js/views/fleet-map.js`, `server/lib/geo.js`, `server/routes/fleet-map.js` |
| Geo-расписание | `server/lib/geo-fence.js`, `server/lib/schedule-criteria.js`, календарь, `geo_hint` в payload, Android `ScheduleCriteria.kt`, Tizen `js/schedule-criteria.js` |
| Периодический скриншот | `server/lib/periodic-screenshot.js`, device-detail Now Playing + Info, ingest `deviceSocket.js` |
| Импорт Canva / Pixabay | `server/lib/media-import.js`, `server/routes/media-import.js`, Content Library |
| SSP / programmatic | `server/lib/ssp.js`, `server/lib/vast.js`, `server/routes/ssp.js`, fill `/api/ssp/fill`, `playback.ssp` |
| Windows / Linux kiosk | `scripts/windows-setup.ps1`, `scripts/linux-player-setup.sh`, `server/lib/desktop-player.js`, `/player/manifest.json` |
| Примеры PiP | `Examples/PIP-*` |

---

## История

| Дата | Что |
|---|---|
| 2026-09-08 | Первая версия плана по сравнению с Xibo 4.x и внутреннему долгу 2.0 |
| 2026-09-08 | GAP-01 DataSets собран: CRUD, CSV, URL-sync, directory dual-read, слайд-таблица, i18n ru |
| 2026-09-08 | GAP-02 Overlay собран: overlay_assignments, resolver I6, payload, web/Android/Tizen compositor, pin, UI ru/en, OpenAPI |
| 2026-09-08 | GAP-03 Menu Boards собран: пресет menu.v1, вид слайда menu (one/two/combo), MENU_SCRIPT + ETag, NFC, i18n ru/en |
| 2026-09-08 | GAP-04 + GAP-04b: серверный снимок weather/RSS, TTL/fallback, webpage poster, RSS без rss2json, i18n ru/en |
| 2026-09-08 | INT-01…INT-05: честные trigger-listen UI; Android capture bootstrap; Help/onboarding → Слайды; #104 preview; Social retired |
| 2026-09-08 | Цикл 2 GAP-05…GAP-15: dayparts, ICS-виджет, HLS (cap `playback.hls`), PDF `pages[]`, теги/динамические группы, agenda, tidy без republish, criteria на плеере, max_plays_hour, operating hours, bundle pin trigger/overlay |
| 2026-09-08 | GAP-16 карта парка: `#/map`, OSM+Leaflet, geo_opt_in + `location.gps`, ручная точка, i18n ru/en |
| 2026-09-08 | GAP-17 периодический скриншот: интервал/keep-N/троттлинг, cellular opt-in выкл, история N, i18n ru/en |
| 2026-09-08 | GAP-18 импорт Canva/Pixabay: download+ingest в библиотеку, PKCE, секреты JWT-only, i18n ru/en |
| 2026-09-08 | GAP-19 geo-расписание: `criteria_json.geo` + `geo_hint`, fail closed + TTL, web/Tizen/Android, Leaflet в календаре, i18n ru/en |
| 2026-09-08 | GAP-20 Windows/Linux kiosk: PWA `/player`, Edge/Chromium `--kiosk`, autostart+watchdog, Linux player-only, i18n ru/en |
| 2026-09-08 | GAP-21 SSP: VAST Linear коннектор, `playback.ssp` не в BASELINE, fill+impressions на CMS, fallback I4, web/Android/Tizen, i18n ru/en |
