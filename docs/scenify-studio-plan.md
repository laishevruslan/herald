# Studio на Scenify / Design Editor (фаза 6)

**Статус: ПЛАН + 6.0/6.1/6.2 выполнены (2026-09-20).** Код: `frontend-studio/`, `/api/studio`, `studio_designs`, фон слайда из Studio. 6.3 — не делать.
**Родитель:** [`enterprise-slide-editor-plan.md`](enterprise-slide-editor-plan.md), фаза 6.
**Соседи:** [`canva-editor-embed-plan.md`](canva-editor-embed-plan.md) (тот же шов «внешний холст → байты в библиотеку»), инварианты I1, I3, I4, I5.
**Съёмка:** сентябрь 2026. **Spike:** ветка `spike/studio-6.0`, контейнер `docker/studio-spike/`.

Короткий ответ: **Scenify — лучший бесплатный кандидат на фазу 6**, если и только если он остаётся островом постера: человек рисует в Fabric-редакторе, мы забираем PNG/JPEG через `ingestUploadedFile`, плеер играет файл. Документ Fabric **не** становится слайдом и **не** едет на панель. Это не замена Слайдов и не повод пропускать фазы 1–5.

Не брать: `@scenify/sdk` с GitHub-бейджем GPL, `umanda/scenify-sdk` (GPL-3.0), `designcombo/react-design-editor` (нет файла LICENSE). Брать: замороженный MIT-снимок **Layerhub** (`@layerhub-io/*`, последний npm — октябрь 2022) плюс тонкая оболочка Vite. Официальный npm `@scenify/sdk` помечен автором «not production ready».

---

## 0. Зачем вообще фаза 6

После галереи шаблонов, меню из DataSet, resize/undo и Canva ingest всё ещё остаётся дыра слоя A: оператор хочет **нарисовать акцию внутри нашего дашборда**, не уходя в canva.com и не платя Polotno ~$10k/год / CE.SDK по квоте.

Scenify закрывает именно это ожидание («Canva-like внутри продукта») ценой того, что мы **сами** становимся мейнтейнерами заброшенного Fabric-редактора. Поэтому фаза 6 по-прежнему stretch: сначала измерить, что фазы 1–5 и Canva не хватило.

Критерий «надо», без которого PR не открывать (из родительского плана):

> После фаз 1–5 продажи всё ещё отваливаются формулировкой «нет Canva-like editor inside».

---

## 1. Что это за проект (генеалогия)

Один человек (Dany Boza / xorb) несколько раз переименовывал один и тот же Canva-клон на React + Fabric.js. Репозитории путают в маркетинге; для юриста и для `scripts/license-check.js` это **разные** артефакты.

```
2021  Scenify Editor          React+Fabric, CRA, @scenify/sdk
        │                     demo: editor.scenify.io
        ▼
2022  Layerhub                monorepo MIT: core / react / objects / types / vue
        │                     npm @layerhub-io/react@0.3.3 (последняя публикация 2022-10-07)
        │                     react-design-editor (Canva clone, ~1k★ в зеркалах) — upstream GitHub 404
        ▼
2024  DesignCombo             новый орг, Vite+Fabric 6, graphic + video
                              LICENSE файла в react-design-editor нет
```

| Артефакт | Что внутри | Лицензия на диске | Можно ли класть в ScreenTinker |
|---|---|---|---|
| `bazooka720/scenify-editor` | CRA-приложение, `@scenify/sdk@0.1.8`, Iconscout, Pixabay, сервер Express+Mongo+`node-canvas`+AWS | README: MIT | Код UI — как референс. Не vendoring целиком: CRA 4, Node 14, чужой бэкенд |
| `@scenify/sdk` / `umanda/scenify-sdk` | Fabric 4/5, GSAP, gifshot. README: «not production ready» | **GPL-3.0** | **Нет.** `license-check.js` DENY на GPL; MIT-продукт нельзя «просто слинковать» |
| `@nkyo/scenify-sdk` | Форк, fabric ^5.3, 2 скачивания/нед., последняя публикация 2023-10 | GitHub badge GPL-3.0, npm `license: MIT`, файл LICENSE у форка — MIT | **Не брать.** Форк GPL-родителя, переименованный в MIT без явного relicensing от правообладателя — риск, который gate не поймает, а юрист поймает |
| `layerhub-io/layerhub-io` | Пакеты `@layerhub-io/core|react|objects|types` | MIT | **Да, заморозить версию.** Upstream фактически мёртв (npm 2022) |
| `@layerhub-io/react@0.3.3` | React 18 peer, зависит от `@layerhub-io/core` | MIT на npm | Да, pin в `package.json` острова, не в `server/` |
| Зеркала `react-design-editor` | Оболочка (панели, шаблоны, video/presentation modes) вокруг SDK | Обычно MIT в копиях 2022 | Брать **конкретный коммит** с LICENSE, не random fork |
| `designcombo/react-design-editor` | Vite, Fabric 6, Zustand, Tailwind. Последний push день создания (2024-08) | Только «Copyright © 2024». Файла LICENSE нет | **Нет**, пока не положат OSI-лицензию. Комментарий «free including commercial» в *другом* репо не лицензия |
| `salgum1114/react-design-editor` | Другой продукт (Ant Design + Fabric), MIT, живой npm | MIT | Не Scenify. Не мешать в один остров |

**Имя в нашем UI:** «Studio» или «Poster editor». Не «Scenify» и не «Layerhub» на кнопке (чужой бренд, к тому же мёртвый). В коде и в этом документе — `studio`, пакеты — `layerhub`.

---

## 2. Что редактор умеет (и чего нет)

Снято по README Scenify Editor и по составу Layerhub.

Есть ( sufficing для постера 1920×1080):

- объекты: добавить / удалить / resize / z-order / clone / copy-paste;
- zoom / pan, guidelines, undo/redo, context menu;
- export / download;
- JSON шаблона (`editor.importTemplate` / `export`);
- серверный рендер картинки в **их** демо-сервере (`fabric` + npm `canvas`).

В README как несделанное (не обещать в нашем Studio v1):

- group/ungroup;
- crop объекта;
- анимации Fade/Bounce/Shake/… (в SDK торчит GSAP — см. §6);
- presentation mode;
- share design.

Чего нет относительно Слайдов — и это нормально, потому что Studio **не слайд**:

| Наше | У Scenify |
|---|---|
| `kind: clock/date/countdown/qr` + константный скрипт | нет live-виджетов |
| `{{ds:slug.field}}` | нет |
| e-paper 1-bit / `cqw` | пиксельный холст |
| OFL-бандл на все плееры | шрифт, который Fabric успел загрузить в браузере |
| Save ≠ Publish → playlist виджетов | download PNG |
| 11 aspect пресетов как свойство дека | размер канвы, который зададим мы |

Итог: это **слой A** из родительского плана (постер), не слой B (живые шаблоны). Склеивать JSON Fabric с `template.elements` — запрещено тем же правилом, что Canva (`kind: 'canva'` не делать).

---

## 3. Сравнение с другими кандидатами фазы 6

Родительский план предлагал «Polotno или CE.SDK». После разбора Scenify порядок такой:

| | Деньги | Self-host без ключа | White-label | Документ на стене | Риск забросить |
|---|---|---|---|---|---|
| **Layerhub / Scenify lineage (MIT)** | $0 | да | да | только после raster | **мы** мейнтейнеры, код 2022 |
| Polotno | ~$899/мес или ~$10k/год | почти (проверка лицензии наружу) | да | raster | вендор живой |
| IMG.LY CE.SDK | quote, hostname pin | offline validation — enterprise | да | raster | вендор живой, дорого |
| Canva Return Nav | аккаунт пользователя | оператор online, панель офлайн | нет (бренд Canva) | raster | не наш код |
| GrapesJS | $0 core | да | да | HTML на стене = I3 нет | page builder, не 16:9 poster |
| Fabric.js с нуля | $0 | да | да | raster | 6–12 мес. UI; Designer уже умер на этом пути |

Почему не Polotno, если Scenify мёртв: **self-host и I5.** Ключ Polotno/CE.SDK на чужом домене self-hosted инстанса либо водяной знак на стене, либо скрытая кнопка. Layerhub не стучит домой. Для продукта, который продаёт air-gap, это решающий плюс.

Почему не «просто Fabric в `slides.js`»: CONTRIBUTING — без бандлера; Fabric+React не влезают в ванильный дашборд. Designer уже показал, чем кончается холст без документа-источника и без ingest. Studio — отдельный остров с **явным** экспортом файла.

---

## 4. Решения, которые фиксируют архитектуру

### D-SC-1 — Scenify/Layerhub — кандидат фазы 6, не замена Слайдов

Не парсить Fabric JSON в `template.elements`. Не делать `kind: 'scenify'` / `'fabric'` / `'studio'`. Выход — `content` ряд, как Canva (D2/D5 родительского плана и canva-плана).

Слайд может взять этот `content.id` фоном или `kind: 'image'`. Часы и `{{ds}}` живут на Слайдах рядом, не внутри Fabric.

### D-SC-2 — Только MIT-снимок Layerhub, не npm `@scenify/sdk`

Vendoring:

- pin `@layerhub-io/react@0.3.3`, `@layerhub-io/core@0.3.3`, `@layerhub-io/objects`, `@layerhub-io/types`;
- либо git subtree конкретного коммита `layerhub-io/layerhub-io` + оболочка, скопированная из MIT-зеркала `react-design-editor` **с файлом LICENSE в коммите**.

Запрещено в дереве:

- `umanda/scenify-sdk`, `@scenify/sdk` без аудита relicensing;
- `@nkyo/scenify-sdk`;
- DesignCombo graphic editor до появления LICENSE;
- их сервер (Mongo, AWS SDK, Iconscout secret).

`scripts/license-check.js` смотрит `server/` production. Остров `frontend-studio/` нужен **свой** прогон gate (или включение в тот же скрипт), иначе GPL приедет транзитом через `fabric` не приедет — fabric MIT — но через случайный `@scenify/sdk` приедет.

### D-SC-3 — Остров Vite, дашборд без бандлера

```
frontend/js/          ваниль, без React          — не трогать ради Studio
frontend-studio/      Vite + React + Layerhub    — единственное место Fabric
  src/App.tsx
  src/export.ts
  vite.config.ts      base: '/studio/'
```

Сервер отдаёт `/studio/` как статику собранного острова (как уже отдаёт `frontend/`). Dev: `vite` на отдельном порту с proxy JWT-cookie/header.

CONTRIBUTING («No build step for the frontend») остаётся верным для дашборда. Studio — **осознанное исключение**, задокументированное здесь, не прецедент тащить React в `#/slides`.

### D-SC-4 — Экспорт в браузере, не `node-canvas` в дефолтном образе

Их демо-сервер рендерит через npm `canvas` (Cairo). Это native-addon: на Windows-разработке и в slim Docker это отдельный ад. Sharp у нас уже есть как **dev** (license-check специально об этом пишет).

v1: `canvas.toDataURL({ format: 'png', multiplier })` в браузере автора → `Blob` → `POST /api/content` (multipart, тот же ingest, что upload). Автор сидит за десктопом; 1920×1080 PNG ему по силам.

Серверный Fabric-render — только если понадобится массовый re-export без открытого браузера. Opt-in пакет, не в обязательном self-host образе. Не путать с LibreOffice из GAP-26.

### D-SC-5 — JSON сцены — метаданные content-ряда, как `canva_design_id`

Таблица `studio_designs`:

| колонка | зачем |
|---|---|
| `content_id` | PNG, который играет плеер |
| `workspace_id` | изоляция |
| `scene_json` | Fabric/Layerhub template для повторного Edit |
| `width` / `height` | пресет |
| `updated_at` | |

Повторный Edit открывает тот же `content_id` и по Save **replace** байт (`PUT /api/content/:id/replace` уже есть — как D6 Canva). Не плодить второй ассет по умолчанию.

`scene_json` не отдавать плееру, не класть в widget HTML, не логировать в activity (может содержать data URL).

### D-SC-6 — Размеры задаём мы

Пресеты кнопки New совпадают с аспектами Слайдов / embedded-профилей, не с «Instagram Post»:

| id | px | зачем |
|---|---|---|
| `landscape-1080` | 1920×1080 | ТВ |
| `portrait-1080` | 1080×1920 | тотем |
| `landscape-4k` | 3840×2160 | опционально, тяжелый PNG |
| `square` | 1080×1080 | |
| `epaper-5x3` | 800×480 | только если оператор понимает, что это **цветной PNG**, который e-paper дизерит. Не делать дефолтом. Честная подпись в UI. |

`multiplier` экспорта = `width / canvasDisplayWidth`, чтобы zoom редактора не дал 800px файл с холста «как будто 1920».

### D-SC-7 — Ассеты только из нашей библиотеки (и наших OFL-шрифтов)

Их оболочка тянет Iconscout (нужны `CLIENT_ID/SECRET`) и Pixabay. Не копировать.

- Фото: picker `GET /api/content?mime=image/*` → объект Fabric `src` = наш `/uploads/...` или blob URL. Не чужой CDN в `scene_json` как единственная копия (I4: если картинка только на pixabay.com, офлайн-ре-export сломается; для **игры** это не важно — играет уже ingest PNG — но re-edit сломается).
- Шрифты: зарегистрировать в Fabric те же семейства, что `slide-fonts.js` (Inter, Archivo, Oswald, Bitter, JetBrains Mono) с `/fonts/*.woff2`. Не тащить Google Fonts CSS с WAN в редактор как единственный источник — автор за корпоративным прокси без fonts.gstatic получит запасной Arial, а PNG «уедет».
- Иконки v1: SVG из workspace или простой набор CC0, который мы сами кладём в `frontend-studio/public/shapes/`.

Pixabay, если GAP-18 жив: кнопка в Studio зовёт **наш** import, не их виджет с `REACT_APP_PIXABAY_KEY` в бандле клиента.

### D-SC-8 — Studio не на панели и не в Designer

Плеер не грузит Fabric, GSAP, React. Designer (`frontend/js/views/designer.js`) не получает этот холст. Help: Studio → библиотека → опционально слайд-фон.

Анимации Layerhub/GSAP, если всплывут в UI — **выключить** в v1. Иначе человек нарисует Bounce, получит PNG первого кадра и решит, что «на стене не играет». Честнее не показывать (I5).

### D-SC-9 — Self-host получает Studio

В отличие от Polotno/CE.SDK, ключа нет. Кнопка видна везде, где собран `/studio/` (он в tarball). Если остров не собран — кнопки нет, не 404 посреди дашборда (I5). CI должен собирать остров в release artifact; иначе hosted «есть», self-host tarball «нет» — и это снова ложь.

### D-SC-10 — Не начинать, пока нет галереи и ingest

Родительский D-SDK-3. Canva-шов и Studio-шов делят `ingestUploadedFile` и replace. Без них Studio некуда класть байты.

---

## 5. Целевой UX

### 5.1 Вход

Content Library и (фаза 2 родителя, не блокер) инспектор фона слайда:

- **New poster** — пресет размера → `#/studio?preset=landscape-1080` или `/studio/?preset=…` (остров, не hash-роутер дашборда: Vite app).
- **Edit poster** — на карточке с `studio_designs` рядом. Без строки — кнопки нет.

JWT: остров на том же origin, читает `localStorage.token` как дашборд **или** httpOnly cookie, если к тому моменту сессия переедет. Не вводить вторую авторизацию.

### 5.2 Внутри Studio

Минимум, без video/presentation modes Layerhub (вырезать из оболочки, не тащить мёртвые вкладки):

- холст, слои, текст, фигуры, изображение из библиотеки;
- бренд-цвета workspace, если фаза 4 родителя уже есть — иначе 8 swatches;
- Save draft (только `scene_json`, без ingest) и **Publish to library** (export PNG + ingest/replace);
- Назад в Library.

Не в v1: их шаблоны с demo-сервера, video timeline, share, Iconscout.

### 5.3 После Publish to library

Карточка PNG, бейдж «Studio», кнопки Edit poster / Use on slide. Назначение в плейлист — как любой image. Экран офлайн.

Многостраничность: холст один. Несколько постеров = несколько content-рядов. Не эмулировать дек Слайдов внутри Fabric.

---

## 6. Зависимости и лицензии — что именно нельзя протащить

| Пакет | Зачем им | Наш вердикт |
|---|---|---|
| `fabric` | холст | MIT, можно. Pin major (Layerhub ждал Fabric 5; не прыгать на 6 без диффа) |
| `react` / `react-dom` | остров | MIT, только `frontend-studio/` |
| `gsap` | анимации в старом SDK | В v1 **не включать**. Лицензия ядра сейчас свободная, но анимации на PNG бессмысленны и путают |
| `gifshot` | GIF | Не нужно |
| `canvas` (node) | SSR | Не в production deps `server/` |
| `mongodb` / `aws-sdk` | их API | Нет |
| Iconscout SDK | иллюстрации | Нет, ключи в клиенте |
| BaseUI / Styletron | UI Scenify 2021 | Не тащить; оболочка — наши CSS-переменные дашборда или минимальный CSS острова |

OFL-шрифты: те же обязательства, что в `slide-fonts.js` (лицензия рядом, не subset без переименования). Studio **раздаёт те же файлы** с `/fonts`, не вторую копию.

---

## 7. Форма кода

Не плодить второй ingest и второй content-picker.

| Файл | Роль |
|---|---|
| `frontend-studio/` | Vite app. `Editor` из `@layerhub-io/react`, пресеты, picker, export |
| `frontend-studio/package.json` | свои deps, не смешивать с `server/package.json` |
| `server/routes/studio.js` | JWT + `resolveTenancy`. `POST /api/studio/export` принимает multipart PNG + `scene_json`; `GET /api/studio/:contentId` отдаёт scene; `PUT` replace |
| `server/lib/studio-designs.js` | CRUD таблицы, без Express |
| `server/lib/content-ingest.js` | без изменений API |
| таблица `studio_designs` | см. D-SC-5 |
| `frontend/js/views/content-library.js` | кнопки New/Edit poster, скрыты если `/studio/` не смонтирован |
| `frontend/js/views/slides.js` | позже: «Заменить фон из Studio» — не в PR 1 |
| `server/test/studio-export.test.js` | ingest sniff, IDOR workspace, scene_json не в play payload |
| `scripts/build-studio.sh` / цель в существующем release | `pnpm --dir frontend-studio build` → `frontend/studio/` или `server/public/studio/` |
| `scripts/license-check.js` | расширить корнем `frontend-studio` **или** отдельный вызов в CI |

Маршрут `POST /api/studio/export`:

1. Проверить JWT, workspace.
2. Файл — через тот же multer/лимиты, что upload.
3. `ingestUploadedFile` или `replace`.
4. Upsert `studio_designs.scene_json`. JSON лимит: не data URL картинок (картинки уже content_id / уже в PNG). Если клиент прислал гигабайт data URL — 413.
5. Ответ `{ content_id }`.

Санитизация `scene_json`: это JSON для **повторного открытия у нас**, не для интерполяции в HTML плеера. Тем не менее не хранить `javascript:` src. При `importTemplate` Layerhub грузит `src` объектов — SSRF **автора в его браузере**, не сервера, если мы не делаем server-side fabric load. Сервер JSON только кладёт в BYTEA/JSONB. Не `JSON.parse` + fetch картинок на бэкенде в v1.

---

## 8. Разбивка работ

Оценки — один человек, знакомый с репо. **Не начинать до фаз 1 и 5 родителя** (галерея + хотя бы ручной upload ingest; Canva не обязателен).

### 6.0 — юридический и технический spike (~2–3 дн.) — **DONE 2026-09-20**

1. [x] Скачать `@layerhub-io/react@0.3.3` и `core`. Прогнать license-check на их дереве.
2. [x] Поднять hello-world Vite: холст, текст, `toDataURL`, без их полной оболочки.
3. [x] Зафиксировать коммит Layerhub + решение: **npm pin** (не subtree). См. `frontend-studio/LICENSE-AUDIT.md`.
4. Kill-критерии spike (любой = стоп, вернуться к «только Canva»):
   - [x] Fabric экспортирует читаемый 1920×1080 PNG с OFL Inter — **PASS** (`docker/studio-spike` → `out/studio-spike-export.png`)
   - [x] в зависимостях GPL/AGPL — **нет** (`license-check.js --root frontend-studio`)
   - [x] бандл острова > ~3 MB gzip без шрифтов — **нет** (~206 KB JS gzip; зафиксировано в LICENSE-AUDIT)
   - [x] не удаётся вырезать video/presentation/Iconscout за день — **не тащили оболочку** (hello-world only)

**Готово, когда:** есть ветка-spike с PNG в `/tmp` и таблицей лицензий. Не мержить в main без ревью kill-критериев.

**Артефакты 6.0:**

| Путь | Назначение |
|---|---|
| `frontend-studio/` | Vite остров, pin Layerhub 0.3.3, Fabric hello-world |
| `frontend-studio/LICENSE-AUDIT.md` | таблица лицензий + kill-критерии |
| `docker/studio-spike/` | отдельный контейнер: `npm ci` → license-check → build → Playwright PNG |
| `scripts/license-check.js --root` | gate для острова |
| `scripts/build-studio.sh` | форма релизного хука → `frontend/studio/` |
| `frontend/js/lib/studio-available.js` | I5 probe (кнопка ещё не подключена) |
| `frontend/js/i18n/{en,ru,de}.js` | ключи `studio.*` |

**Не сделано в 6.0 (ожидаемо → 6.1+):**

- `POST /api/studio/export`, таблица `studio_designs`, replace
- кнопки New/Edit poster в Content Library (ключи i18n есть, UI нет)
- публикация `/studio/` в основной `Dockerfile` / CI release artifact
- portrait пресет, picker библиотеки, brand kit
- полный Editor UI из `@layerhub-io/react` (spike использует Fabric напрямую + smoke-import core)

### 6.1 — остров + ingest (~5–8 дн.) — **DONE 2026-09-20**

1. [x] `frontend-studio` в main (ветка `feat/studio-6.1`), сборка в CI + stage в `Dockerfile` → `/frontend/studio/`.
2. [x] Auth (JWT `localStorage.token` + `X-Workspace-Id`), пресеты **1920×1080** и **1080×1920**.
3. [x] Текст, прямоугольник, изображение из Library (auth fetch → blob URL; в `scene_json` только `contentId`).
4. [x] `POST /api/studio/export`, таблица `studio_designs`, кнопки New/Edit poster в Library (скрыты без `/studio/` — I5).
5. [x] Replace при повторном Edit (тот же `content_id`).
6. [x] i18n en/de/ru на кнопках дашборда; остров en/ru.

**Готово, когда:** оператор рисует «SALE −30%», Publish to library, плейлист играет PNG офлайн; Edit открывает макет.

**Артефакты 6.1:**

| Путь | Назначение |
|---|---|
| `server/lib/studio-designs.js` | sanitize scene, upsert, ingest/replace |
| `server/routes/studio.js` | JWT `/api/studio` |
| `server/test/studio-export.test.js` | auth shape, IDOR, data URL reject, replace id |
| `docker/studio-6.1/` | отдельный контейнер: build island + unit tests |
| `Dockerfile` studio-builder stage | self-host получает `/studio/` |

**Не сделано полностью / отложено после 6.1:**

- Полный UI `@layerhub-io/react` Editor (по-прежнему Fabric hello-world + Library image)
- Approval-workflow draft path при replace (Studio пишет live bytes как обычный image replace без draft ветки approvalOn — упрощение 6.1; при включённом approval оператору лучше Publish через Content replace)

### 6.2 — шрифты, бренд, слайд-фон (~3–5 дн.) — **DONE 2026-09-20**

1. [x] Регистрация `/fonts` в Fabric до первого paint (`waitForStudioFonts`, полный каталог Inter/Archivo/Oswald/Bitter/JetBrains Mono из `server/fonts`).
2. [x] Цвета brand kit: **stand-in** через `/api/white-label` + 8 swatches (фаза 4 родителя brand-kit API ещё нет — зафиксировано ниже).
3. [x] Со слайда: «Фон из Studio» / «Редактировать постер» → `?for=slide-bg` → Publish пишет `template.background_content_id` через `sessionStorage`.
4. [x] Честная подпись для 800×480 (`epaper-5x3` + предупреждение о дизеринге).

**Артефакты 6.2:**

| Путь | Назначение |
|---|---|
| `frontend-studio/src/fontCatalogue.ts` + `fonts.css` | OFL семьи, await до paint |
| `frontend-studio/src/brand.ts` | white-label → 8 swatches |
| `frontend/js/views/slides.js` | кнопки фона (I5), return hook |
| `docker/studio-6.2/` | отдельный контейнер: build + unit tests (epaper) |

**Не сделано полностью в 6.2:**

- Настоящий **brand-kit API** фазы 4 родителя (палитры workspace, роли цветов) — сейчас только white-label primary/secondary/bg + дефолтные 8 swatches
- Кириллический OFL language pack (UI честно предупреждает про `.notdef`)
- Полный `@layerhub-io/react` Editor chrome (панели Layerhub) — Fabric toolbar
- Approval draft path при Studio replace (как в 6.1)
- Авто-save дека после применения фона (оператор должен Save сам — намеренно, dirty flag)

### 6.3 — не делать в этой фазе

- Fabric JSON в плеере;
- GSAP-анимации;
- их Mongo-шаблоны;
- node-canvas в Docker по умолчанию;
- 4K как дефолт;
- video editor DesignCombo;
- замена `#/slides`.

### Убийство фичи

Если после 6.1 Support получает «шрифт поехал / PNG мыльный / Studio пустой на Safari» чаще, чем «удобно рисовать» — выключить кнопку (I5), оставить таблицу и файлы (контент на стенах не трогать), в Help оставить Canva. Не чинить Fabric год.

---

## 9. Тесты

| Тест | Что держит |
|---|---|
| export без JWT → 401 | auth |
| `scene_json` чужого workspace → 404 | IDOR |
| PNG проходит тот же sniff, что upload | `content-ingest` |
| replace не создаёт второй content id | D-SC-5 |
| play payload виджета/плейлиста **не** содержит `scene_json` и не содержит `fabric` | I3 / I4 |
| без собранного `/studio/` кнопки нет | I5 |
| license-check на `frontend-studio` зелёный | GPL |
| пресет 1920×1080 → metadata width/height файла | D-SC-6 |
| плеер offline показывает PNG | I4 |

Не тестировать «Fabric undo внутри острова» юнит-тестами сервера. Не мокать «холст как слайд».

E2E spike (ручной): Chrome + Firefox, retina 2x (multiplier), кириллица после языкового пака шрифтов — до пака честно падает в .notdef, это задокументировать в UI, не чинить латиницей.

---

## 10. Риски

| Риск | Почему | Смягчение |
|---|---|---|
| Брошенный SDK | npm 2022, автор ушёл в DesignCombo | pin, мы мейнтейнеры; kill-switch 6.1 |
| Путаница лицензий форков | GPL vs MIT на одном имени Scenify | D-SC-2, не `@scenify/sdk` |
| «Встроили редактор слайдов» в маркетинге | холст выглядит как Слайды | Help: Studio рисует картинку; живые часы — Слайды |
| Мыльный PNG | zoom канвы ≠ pixel size | D-SC-6 `multiplier` |
| Шрифт в редакторе ≠ на PNG | Fabric рендерит до load | ждать `document.fonts.ready` + наши `/fonts` |
| data URL в scene_json раздувает БД | оператор вставил 4K фото data URL | запрет data URL на save; только content URL / id |
| React в репо | прецедент бандлера | остров изолирован; CONTRIBUTING не менять для `frontend/js` |
| Safari / iPad автор | Fabric historically flaky | v1 desktop Chrome/Firefox; iPad — «не поддерживается», не кнопка-ложь |
| Конфликт с Canva | два «Edit» на одной карточке | карточка либо `canva_links`, либо `studio_designs`, не оба. Смена инструмента = новый ассет или явный convert |
| e-paper | цветной PNG дизерится | не предлагать Studio как способ сделать room-sign |

---

## 11. Соответствие инвариантам

| Инвариант | Как |
|---|---|
| I1 Слайды | Studio не пишет `template`. Только `content` / фон |
| I2 Данные отдельно | Нет. Постер мёртвый. Цены в меню — по-прежнему DataSet на Слайдах |
| I3 Плеер без чужого JS | На стене `<img>`/`<video>` из библиотеки. Fabric/React/GSAP только в `/studio/` у оператора |
| I4 Офлайн | ingest до назначения. `src` в scene_json не используется плеером |
| I5 Честные кнопки | нет сборки острова → нет кнопки; нет Bounce, который не уедет на стену |
| I6 Плейлист | обычный content item |

---

## 12. Definition of done (фаза 6)

1. Spike 6.0 зелёный (лицензия + PNG Inter 1920×1080).
2. Оператор self-host без ключей третьих сторон: Library → New poster → рисует → Publish to library → экран показывает файл офлайн.
3. Edit poster обновляет тот же `content_id`.
4. Ни один плеер не грузит Fabric.
5. `license-check` не видит GPL в острове.
6. Фраза в UI: «Poster editor», не «Scenify», не «встроенный Canva».

---

## 13. Первый PR фазы 6

Не оболочка на 15 панелей. Не video. Не subtree всего layerhub monorepo «на всякий».

**PR 1 (эта ветка `spike/studio-6.0`) = spike island, без ingest:** Vite, Layerhub pin, один пресет 1920×1080, текст+прямоугольник, export PNG в `/tmp` через Docker verify, без `scene_json` / Library buttons. Кнопки Library скрыты (I5: остров не в основном image).

PR 1b / 6.1 — `POST /api/studio/export` + ingest, `studio_designs` + Edit + replace + кнопка в Library.
PR 3 / 6.2 — шрифты `/fonts`, brand swatches (white-label), фон слайда, epaper-5x3. **DONE.**

Если PR 1 кладёт Fabric JSON в `slide_decks.doc` — вынести. Это D-SC-1.

---

## 14. Как это стыкуется с фазой 6 родителя

Было: «PoC Polotno или CE.SDK на hosted».

Стало: **PoC Layerhub (Scenify lineage, MIT) как Studio-остров, hosted и self-host.** Polotno/CE.SDK остаются запасным выходом только если spike 6.0 убит лицензией или экспортом — и тогда снова только hosted, потому что у них ключ.

Порядок продуктов для слоя A не меняется:

1. Слайды + галерея (фазы 1–4 родителя) — live.
2. Canva Return Navigation (фаза 5) — чужой красивый редактор, файл к нам.
3. Studio (эта фаза) — свой красивый редактор без подписки, файл к нам.
4. PPT (GAP-26) — офисный ingest.

Три редактора не три документа на стене. На стене по-прежнему плейлист виджетов и файлов.

---

## История

| Дата | Что |
|---|---|
| 2026-09-20 | Spike **6.0 DONE**: `frontend-studio/` (npm pin Layerhub 0.3.3), `license-check --root`, Docker verify `docker/studio-spike`, i18n `studio.*` en/ru/de, kill-критерии PASS. Не в 6.0: ingest, Library UI, основной Dockerfile. |
| 2026-09-20 | **6.1 DONE**: `studio_designs` + `POST /api/studio/export`, Library New/Edit, presets landscape/portrait, Library image picker, Dockerfile studio stage, CI build, `docker/studio-6.1`. Неполное: Layerhub Editor chrome, brand kit, slide background, approval draft replace. |
| 2026-09-20 | **6.2 DONE**: OFL `/fonts` до paint, font picker, white-label swatches, «Фон из Studio» (`?for=slide-bg` + sessionStorage → `background_content_id`), пресет `epaper-5x3` с честной подписью, i18n en/ru/de + island ru, `docker/studio-6.2`. Неполное: brand-kit API фазы 4, кириллический language pack, Layerhub Editor chrome, approval draft replace, auto-save дека после фона. |
| 2026-09 | Первая версия плана (генеалогия Scenify → Layerhub, D-SC-1…10). |
