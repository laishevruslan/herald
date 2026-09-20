# Enterprise-редактор слайдов и галерея шаблонов Digital Signage

**Статус: ПЛАН. Кода нет.**
**Дата съёмки:** сентябрь 2026.
**Инварианты:** I1 (авторство — Слайды, `template` + `fields`), I3 (плеер не исполняет операторский ввод как код), I4 (офлайн не зависит от WAN), I5 (не показывать кнопку, которая на панели ничего не делает). Frontend дашборда — ванильный JS без бандлера (`CONTRIBUTING.md`).

Связанные документы (этот план их не отменяет, а стыкует):

| Документ | Что закрывает | Что этот план добавляет |
|---|---|---|
| [`feature-gap-plan.md`](feature-gap-plan.md) | I1–I6, Designer устаревает, GAP-24 lock, GAP-26 PPT, GAP-27 SDK | Не копировать layout-редактор Xibo; не расширять Designer |
| [`data-sources-templates-plan.md`](data-sources-templates-plan.md) | Фаза 3: 5 фабрик (room / waste / agenda) | Это **первый слой** галереи, не вся галерея |
| [`canva-editor-embed-plan.md`](canva-editor-embed-plan.md) | Canva нельзя встроить iframe; путь — Return Navigation + ingest байт | Canva — канал «красивого постера», не документ слайда |
| [`scenify-studio-plan.md`](scenify-studio-plan.md) | Фаза 6: Layerhub/Scenify как остров постера | Бесплатный Canva-like; Fabric JSON не едет на панель |
| [`DATA_SOURCES_MASTERPLAN.md`](../DATA_SOURCES_MASTERPLAN.md) | Источники данных и `{{ds:slug.field}}` | Шаблоны потребляют это; редактор не должен это ломать |

Короткий ответ: **готового «вставь Canva внутрь CMS и забудь» для digital signage нет.** Ни один публичный конкурент не встраивает настоящий редактор Canva в свой дашборд. То, что продают как enterprise-редактор, на деле три разных продукта. ScreenTinker уже выбрал правильный из них (документ `template` + `fields`, публикация в плейлист). Недостаёт не «другого холста», а **галереи шаблонов, бренд-кита, нормального authoring UX и честного пути для постеров из Canva/SDK**. Готовый white-label редактор (Polotno, IMG.LY CE.SDK, **Scenify/Layerhub**) можно взять только как **остров экспорта картинки в библиотеку**, не как runtime плеера и не как замену Слайдам. Бесплатный кандидат фазы 6 — MIT-снимок Layerhub; разбор и запрет GPL-форков — в [`scenify-studio-plan.md`](scenify-studio-plan.md).

---

## 0. Зачем это спрашивают

Оператор хочет «сделать слайд как в Canva»: перетащил, выровнял, выбрал шаблон меню, поменял цену, нажал Publish, экран обновился. Конкуренты на сайте пишут «Designer», «Canvas», «750+ templates», «Canva».

Это четыре разных ожидания, и их нельзя закрыть одним холстом:

| Ожидание | Что на самом деле нужно | Кто так продаёт |
|---|---|---|
| «Красивый постер / акция / меню-картинка» | Редактор графики + экспорт PNG/MP4 на диск CMS | Canva, ScreenCloud Canvas, OptiSigns Designer, PosterMyWall |
| «Табличка на двери / меню с живыми ценами / погода» | Шаблон с **полями**, данные отдельно | Appspace Cards, Xibo Elements, наши Слайды |
| «На одном ТВ сразу меню + реклама + часы» | Зоны layout, не слайд | Xibo Layout, Yodeck Layout, наш Layout Editor |
| «Не умею дизайнить, дайте картинку из галереи» | Каталог шаблонов с превью, мастер «шаблон → данные → создать» | Yodeck Discover Templates, Rise Vision, OptiSigns |

План ниже разделяет эти четыре, чтобы PR не пытался сделать Figma внутри `slide-render.js`.

---

## 1. Что уже есть в ScreenTinker

Честный инвентарь HEAD, сентябрь 2026. Где `feature-gap-plan.md` пишет BUILT, а файлов нет — это сказано отдельно.

### 1.1 Слайды — настоящий продукт авторства

Документ дека живёт в `slide_decks`. Публикация (`server/lib/slide-deck.js`) эмитит **один виджет на слайд + плейлист**. Downstream (расписание, группы, resolver, все плееры) не узнаёт новый тип контента. Это сознательное решение: «дек — документ автора, на стене — то, что уже умеет играть».

Контракт слайда (`server/lib/slide-render.js`):

- `template` — геометрия, стиль, motion, `slot` на элемент;
- `fields` — `{ slot: value }`, в том числе `{{ds:slug.field}}`;
- лимит **40 элементов** на слайд, **60 полей**, поле ≤ 2000 символов;
- motion — только CSS keyframes (`fade`, `slideL/R/U/D`, `zoom`, `wipe`); JS-библиотека анимации на панели запрещена (BrightSign уже ломал UMD);
- цвета — только `#RGB` / `#RRGGBB` (XSS через `style=""`);
- шрифты бандлятся с сервера (OFL: Inter, Archivo, Oswald, Bitter, JetBrains Mono), latin + latin-ext. Кириллицы в бандле **нет**.

Виды элементов (`KINDS`):

| kind | Что делает |
|---|---|
| `head` / `body` / `stat` | текст из `fields[slot]` |
| `image` | фото из библиотеки, `fit: cover\|contain` |
| `rule` / `box` | линейка / панель |
| `qr` | QR из поля (URL можно сменить без пересборки макета) |
| `clock` / `date` / `countdown` | live, скрипт — константа, конфиг через `data-*` (I3) |
| `lettering` | картинка букв, **слова всё равно в field** |

Фон: цвет, картинка (`background_content_id`), видео (`background_video_content_id` + poster), dim. У дека: `aspect` (11 пресетов включая 5:3 e-paper), общий music bed.

Чего в `KINDS` **нет**, хотя планы это иногда предполагают: `table`, `menu`, `shape` (круг/звезда), `group`, `video` как элемент (видео есть только фоном), `ticker`, `iframe`. GAP-01 в `feature-gap-plan.md` пишет «слайд-элемент `table` ссылается на `dataset_id`» как BUILT — **в этом дереве kind `table` отсутствует.** GAP-03 Menu Boards (`menu.v1`, `MENU_SCRIPT`) тоже помечен BUILT — **файлов нет.** Считать оба несделанными пререквизитами, не опираться на статус в том документе.

### 1.2 Редактор `#/slides` — рабочий, не enterprise

`frontend/js/views/slides.js` (~2100 строк, один файл).

Есть:

- список деков, Save ≠ Publish, Preview открывает плеер в новой вкладке **по опубликованному** плейлисту (и честно так говорит);
- filmstrip слайдов, палитра kinds слева, слой-лист, инспектор Content / Style / Motion / Slide;
- drag элемента по сцене (проценты от холста);
- числовые X/Y/W/H в инспекторе (слайдер + input);
- z-order вперёд, удаление элемента;
- AI: сгенерировать слайд / фон / слои-вырезы;
- 3 radio в New Deck: blank / room / waste — **черновик**, без превью, без выбора источника, немецкий текст, только 5:3;
- подстановка `{{ds:…}}` на холсте из кэша источников.

Нет (это и есть разрыв с «enterprise»):

- resize-ручек на холсте (размер только слайдерами);
- snap / направляющие / выравнивание нескольких элементов;
- undo / redo (в коде прямо: «there is no undo»);
- multi-select, group, lock, rotate;
- копирование слайда / элемента, вставка с другого дека;
- бренд-кит (цвета, лого, запрет шрифтов);
- lockable regions («оператор меняет текст, не двигает логотип»);
- concurrent edit lock (GAP-24);
- галерея шаблонов с превью;
- клавиатура (стрелки, Del, Ctrl+D, Ctrl+Z);
- сетка / safe area 5–10% от края (читаемость с 5 метров).

### 1.3 Designer — устаревший путь

`frontend/js/views/designer.js`: печёт HTML, нет документа-источника, системные шрифты (Impact — нет на Android/Tizen/BrightSign). I1 и INT-03: Help ведёт в Слайды, Designer не расширять. Сюда не класть ни Canva, ни Polotno, ни новые kinds.

### 1.4 Layout Editor — другой продукт

`frontend/js/views/layout-editor.js`: зоны экрана в процентах (split-screen), 7 встроенных шаблонов layout. Это **не** редактор слайда. `feature-gap-plan.md` явно: свободный layout Xibo не копируем; композиция внутри зоны — Слайды. Не смешивать в одном UX.

### 1.5 Внешние редакторы сегодня

| Путь | Состояние |
|---|---|
| Webpage + опубликованный Canva / Google Slides | Работает. Экран ходит в интернет. Edit-URL не встраивается (XFO). |
| GAP-18 Canva Connect ingest | В плане BUILT; `server/lib/media-import.js` в HEAD **нет**. Считать несделанным. |
| Pixabay | Задумано рядом с GAP-18; проверять отдельно. |
| PPT | GAP-26, не сделано. |

---

## 2. Как это устроено у конкурентов

Снято по публичным гайдам, сентябрь 2026. Маркетинг «встроенный Canva» почти всегда означает embed **вида** или апп **внутри** Canva, не iframe редактора в CMS. Подробности Canva — в `canva-editor-embed-plan.md`; здесь — именно authoring + шаблоны.

### 2.1 Паттерн отрасли (не бренд)

Серьёзный вендор держит **три слоя**, которые ScreenTinker сейчас пытается закрыть одним `slides.js`:

```
┌─────────────────────────────────────────────────────────────┐
│  A. Poster studio     Canva / Canvas / Designer / PMW       │
│     выход = файл (PNG/MP4/PDF) в библиотеку                 │
├─────────────────────────────────────────────────────────────┤
│  B. Data templates    Cards / Elements / Apps               │
│     выход = живой виджет: часы, меню, комната, погода       │
├─────────────────────────────────────────────────────────────┤
│  C. Screen layout     зоны на панели                        │
│     выход = «меню слева, реклама справа»                    │
└─────────────────────────────────────────────────────────────┘
```

Enterprise покупает B+C как CMS и A как «чтобы маркетинг не ждал дизайнера». Кто пытается сделать A=B (один холст и для постера, и для live-данных), получает либо мёртвые часы на картинке, либо редактор, в котором нельзя сделать акцию «−30%».

### 2.2 По вендорам

#### Xibo (архитектурный родственник)

- **Layout Editor** = зоны + виджеты + Elements. Не Canva.
- Шаблоны: свои (Save as Template) + **Xibo Exchange** (каталог, drag на холст, **заменяет** текущий layout — предупреждают, что необратимо).
- Canva: апп в маркетплейсе Canva (модель M2). Пользователь живёт в Canva, жмёт Publish as Layout **или** в Library (JPG/PNG). Редактор в CMS не встроен.
- Данные отдельно от HTML виджета — тот же принцип, что наши `fields`.
- Concurrent Layout Lock (у нас GAP-24).
- Menu Board — отдельный объект Category/Products, не «нарисуй цену на холсте».

Вывод для нас: копировать Exchange (галерея + clone) и lock. Не копировать свободный многозонный layout как замену Слайдам.

#### Yodeck

- Layout Editor + вкладка **Discover Templates** и в списке, и в сайдбаре редактора.
- Фильтры: ориентация, категория, поиск.
- **Branded Templates** — только Enterprise: корпорация заливает свои макеты, филиалы заполняют.
- Отдельно — app gallery (Calendar, Canva embed, соцсети). Canva = Smart Embed вида (панель ходит на Canva).
- Design Services — платная отрисовка под бренд.

Вывод: галерея живёт **внутри редактора**, не отдельной страницей. Enterprise = branded pack + lock, не «ещё 200 ручек на холсте».

#### ScreenCloud

- **Canvas** — собственный дизайн-редактор, 140+ screen-ready шаблонов, portrait/landscape пресеты.
- Lockable areas, save as template для команды, правки уезжают на экраны.
- Рядом — приложения (Meeting Room, Calendar Wall, Canva embed). Meeting Room и Calendar Wall **разные** приложения — не один слайд с галочками.
- Маркетинг прямо: «забудьте third-party design tools».

Вывод: Canvas закрывает слой A (постер). Live-данные — другие apps. Нам нельзя склеить «переговорка» и «акция −30%» в один тип документа без потери одного из них.

#### OptiSigns

- Публичная галерея «thousands of free templates» + Designer (drag, иконки, стикеры, виджеты Weather/Time, Google Sheets).
- Canva: либо скачать файл, либо Embed HTML; сами пишут, что embed **не листает страницы**.
- Kiosk Designer позиционируют как лучше для signage (разрешение, кэш).

Вывод: объём галереи — конкурентный аргумент на сайте. Шаблоны OptiSigns **нельзя** переложить к себе (их IP). Нужна своя библиотека или пользовательский Canva.

#### Rise Vision

- 750+ шаблонов + **AI presentation design** (промпт → брендированная презентация).
- Интеграции: Power BI, M365, Google, Canva, соцсети.
- Недельный контент-календарь как сервис, не как фича редактора.

Вывод: число «750» — маркетинг шаблонов и AI, не холста. Наш AI generate slide уже есть; не хватает **галереи**, в которую AI сажает результат, и бренд-кита, чтобы AI не выбирал Comic Sans.

#### Appspace (корпоративный эталон для карт)

- **Cards**: `schema.json` (что можно править) + `model.json` (значения) + тема.
- Оператор не двигает пиксели; он заполняет карточку. Дизайнер темы — другая роль.
- Room Schedule vs Calendar Wall — разные карточки.

Вывод: это ближайший UX к нашему `template` + `fields`. Enterprise для оператора филиала — **не Figma**, а «заполни поля / смени фото». Полный холст нужен бренд-команде, которая **готовит** шаблон.

#### NoviSign

- Creative Composer: 20+ виджетов, шаблоны, слои, align.
- **PosterMyWall** внутри Media Center: 425k шаблонов, импорт в CMS. Canva добавлен тем же путём.
- Слой A отдан вендору шаблонов, слой B — свой composer.

Вывод: легитимная стратегия «не строить Canva, купить каталог». PosterMyWall — коммерческий партнёр, не бесплатный pack.

#### PosterBooking / низкий сегмент

- Залей картинку из Canva, поставь в расписание. Редактора почти нет.

Вывод: так выглядит продукт, если закрыть только слой A файлами. ScreenTinker уже выше за счёт Слайдов; откатываться к «только upload» нельзя.

### 2.3 Сводная таблица

| | Свой холст | Галерея шаблонов | Live-данные в макете | Canva | Бренд-lock | Зоны экрана |
|---|---|---|---|---|---|---|
| Xibo | Layout+Elements | Exchange + свои | виджеты / DataSet | App в Canva (M2) | через права | **да, ядро** |
| Yodeck | Layout Editor | Discover + branded | apps | embed вида (M1) | Enterprise pack | да |
| ScreenCloud | Canvas | 140+ | отдельные apps | embed вида | lockable areas | ограниченно |
| OptiSigns | Designer | тысячи | виджеты + Sheets | файл или embed | нет как продукт | split |
| Rise Vision | AI + шаблоны | 750+ | apps / Power BI | интеграция | бренд в шаблоне | да |
| Appspace | Cards, не Figma | карточки | schema+data | не ядро | **да, суть** | да |
| NoviSign | Composer | свои + PMW | виджеты | Media Center | нет акцента | да |
| **ScreenTinker сейчас** | Слайды (поля) | 2 черновых radio | `{{ds}}` + DataSet | Webpage M1 | нет | 7 layout |

Никто из таблицы не отдаёт оператору филиала полный Illustrator. Enterprise = **роль «заполни шаблон»** + **роль «собери шаблон»** + **роль «залей постер из Canva»**.

---

## 3. Готовые редакторы: можно ли не писать свой

Проверено, что реально встраивается в продукт, а не «открой вкладку».

### 3.1 Кандидаты

| Решение | Что это | Лицензия / деньги | Self-host / air-gap | Стык с нашим стеком |
|---|---|---|---|---|
| **Canva Connect + Return Navigation** | Редактор на canva.com, возврат файла | Canva-аккаунт пользователя; интеграция бесплатна как API, контент — по тарифу Canva | Оператор с ноутбуком в интернете; панель офлайн после ingest | Уже разобрано. **Не iframe.** Не пишет `template.elements` |
| **Canva Apps SDK (как Xibo)** | Кнопка Publish внутри Canva | Ревью маркетплейса; CMS обязан быть публичным HTTPS | Air-gap непригоден | Фаза 3 canva-плана |
| **IMG.LY CE.SDK** | White-label design/photo/video SDK | Enterprise quote, hostname/bundle, MAU; trial 30 дн.; watermark без ключа | Offline validation — **только enterprise** | Web SDK. Нужен бандлер. Шаблоны + placeholders. Не наш HTML-плеер |
| **Polotno SDK** | Canva-like React-редактор, JSON документа | Self-serve ~$899/мес или $9 990/год на один бренд; Grass Roots от ~$249/мес; trial 60 дн. staging-only | Редактор self-hosted; проверка лицензии стучит наружу; Cloud Render опционален | React + MobX. `CONTRIBUTING.md`: фронт без бандлера. JSON Polotno ≠ наш template |
| **Design Huddle** | White-label iframe-редактор | Enterprise quote | Данные в их облаке / по договору | iframe + чужой origin на дашборде |
| **Placid** | Safe template editor (только поля) | SaaS по шаблонам | Облако | Близко по UX к Appspace Cards / нашим fields; визуал чужой |
| **Templated.io** | URL-embed редактор | SaaS | Облако | Быстро, но документ не наш, плеер не наш |
| **Unlayer** | Email/page builder | SaaS / on-prem bundle | On-prem есть | Заточен под email-таблицы, не под 16:9 signage + live clock |
| **GrapesJS core** | OSS page builder (BSD) | Бесплатно; Studio SDK — сессии | Да | HTML/CSS страница, не `template`+`fields`. Плеер начал бы есть чужой HTML (ломает I3/песочницу) |
| **Grapes Studio SDK** | Упакованный Grapes | Сессии, от $200/мес | npm-бандл, не iframe | Тот же конфликт с контрактом слайда |
| **Fabric.js / Konva** | Canvas-библиотека | OSS | Да | Это не редактор, а движок. 6–12 мес. на UI поверх. Designer уже прошёл этот путь и умер без документа |
| **Photopea / Figma / Microsoft Designer** | Чужие веб-приложения | Нет OEM-embed | Нет | Edit URL не влезает в iframe так же, как Canva |
| **Creatomate / Bannerbear / Rendley** | Render API без редактора | По рендерам | Облако | Полезно для массовой генерации полей, не для автора |
| **LibreOffice / Gotenberg** | PPT/PDF → картинки | OSS, opt-in пакет | Да | GAP-26. Это ingest, не редактор |

Print Partnerships Canva (настоящий iframe-редактор) **закрыты для новых заявок**. В план не входит.

### 3.2 Почему нельзя заменить Слайды на Polotno / CE.SDK

1. **Плеер играет HTML из `slide-render.js`, а не JSON холста.** Чтобы Polotno «был слайдом», на Android/Tizen/BrightSign/e-paper пришлось бы либо тащить их runtime (I3, I4, I5, размер плеера), либо на каждом Publish растрировать в PNG и **потерять** clock/QR/`{{ds}}`. Получится Poster Booking.
2. **Live-элементы — наше преимущество.** CE.SDK умеет placeholders; он не умеет наш `bind_status` / e-paper 1-bit / константный LIVE_SCRIPT. Придётся писать мост в обе стороны навсегда.
3. **Фронт без бандлера.** Polotno — React. CE.SDK — npm. Это новый пакетный остров. Допустимо как **отдельный** `frontend-studio/` с Vite, недопустимо как подмена `slides.js` без решения о сборке.
4. **Self-host и лицензия.** Ключ CE.SDK привязан к hostname; без ключа — watermark. У self-hosted инстансов за чужим доменом ключ не подойдёт «из коробки». Polotno — один бренд / одно приложение; white-label ScreenTinker для реселлеров = отдельная лицензия. I5: нельзя показать Studio, которое рисует водяной знак на стене.
5. **Стоимость.** $10k/год за Polotno или custom CE.SDK — это цена **слоя A**, который Canva уже закрывает для пользователя бесплатным/своим аккаунтом. Платить ещё раз имеет смысл только если нужен white-label «наш Canva» без бренда Canva.

### 3.3 Решение по SDK (фиксируем)

**D-SDK-1.** Документ слайда остаётся наш. Никакой `kind: 'polotno'` / `kind: 'cesdk'` / `kind: 'canva'`.

**D-SDK-2.** Слой A (постеры) закрываем в таком порядке:

1. Native Slides + своя галерея (слой B, и часть простых постеров).
2. Canva Return Navigation + ingest (слой A для тех, кто уже в Canva) — `canva-editor-embed-plan.md`.
3. PPT/PDF → страницы как изображения (GAP-26) — слой A для офисных команд.
4. **Только если 1–3 не хватает:** Studio-остров на MIT-снимке Layerhub (Scenify lineage) с экспортом PNG в `ingestUploadedFile`. Плеер видит файл. Ключа нет — кнопка есть и на self-host, если остров собран (I5). Polotno/CE.SDK — запас, если spike Layerhub убит; у них ключ, self-host без ключа кнопку скрывать. Подробности: [`scenify-studio-plan.md`](scenify-studio-plan.md).

**D-SDK-3.** Не начинать коммерческий SDK, пока нет галереи шаблонов и Canva ingest. Иначе два непротестированных OAuth/лицензии и ноль картинок в каталоге.

**D-SDK-4.** PoC Studio, если дойдём: 2 недели, только hosted, один пресет 1920×1080, export PNG → library. Критерий убийства PoC: экспорт не проходит ingest или плеер не играет офлайн.

Рекомендация на сегодня: **не покупать SDK.** Купить его позже дешевле, чем встроить сейчас и переехать с JSON.

---

## 4. Digital Signage Templates: где взять и что можно использовать

### 4.1 Юридическая рамка (иначе галерея незаконна)

| Источник | Можно ли класть в наш продукт | Как использовать |
|---|---|---|
| Шаблоны Canva | **Нет** как поставка «наших» шаблонов. ToS Canva не даёт сублицензию на чужие дизайны | Пользователь открывает **свой** Canva → Return/export → наш файл |
| Галереи OptiSigns / Yodeck / ScreenCloud / Rise | **Нет.** Это их IP | Только как референс композиции (не копировать пиксель-в-пиксель) |
| PosterMyWall | Только через **их** партнёрский API, коммерческий договор | Как NoviSign, не как «скачали пак» |
| Бесплатные PPT/Google Slides с SlideChef, pptfreebies и т.п. | Читать лицензию каждого пака. Часто «free for personal», запрет resale, стоковые фото с отдельным лицензированием | Если лицензия позволяет коммерческий SaaS — конвертировать в PNG (GAP-26) и класть как **пример медиа**, не как `template.elements` |
| Unsplash / Pexels / Pixabay | Фото — да, с атрибуцией по правилам площадки | Фон и `kind: 'image'`, не «шаблон» |
| Google Fonts OFL | Да, уже так | Не подмножествовать без переименования (см. `slide-fonts.js`) |
| Свои JSON-фабрики | **Да. Это основной путь.** | Геометрия + слоты + превью, рисуем мы |
| CC0 / public domain картинки | Да | Текстуры, иконки без торговых марок |
| GitHub «digital menu» репозитории | По файлу LICENSE. MIT-код ≠ право на чужие фото/текстуры chalkboard | Можно смотреть раскладку; ассеты часто нельзя |

Итог: **готового бесплатного пака «200 JSON-шаблонов digital signage, бери в CMS» не существует.** То, что вендоры называют free templates — либо их редактор, либо Canva, либо PPT. Наш каталог надо **нарисовать самим** в нашем контракте. Объём 750 как у Rise — годы дизайна или партнёрство; объём 15–40 качественных фабрик закрывает отказ при выборе.

### 4.2 Что реально собрать без юриста

Приоритет — шаблоны, которые **не имеют смысла как плоский PNG**, потому что там live-данные. Постеры «Happy Hour» конкуренты берут из Canva; нам незачем рисовать 400 акционных картинок.

**Волна 1 — фабрики с данными (уже специфицированы):** см. `data-sources-templates-plan.md`

- `room-epaper-5x3`, `room-lcd-16x9`
- `waste-epaper-5x3`, `waste-lcd-16x9`
- `agenda-lcd-16x9`

**Волна 2 — signage-классика в нашем JSON** (оригинальная геометрия, OFL-шрифты, свои цвета):

| id (черновик) | Формат | Данные | Зачем |
|---|---|---|---|
| `menu-one-16x9` / `menu-two-16x9` / `menu-combo-16x9` | 16:9 | DataSet `menu.v1` | QSR, GAP-03 заново, не виджет |
| `menu-portrait-9x16` | 9:16 | тот же DataSet | тотем у кассы |
| `welcome-lcd-16x9` | 16:9 | поля + опц. `{{ds}}` | лобби, лого из бренд-кита |
| `announcement-16x9` / `announcement-9x16` | оба | поля | HR / авария (без красного мигания на e-paper) |
| `wayfinding-16x9` | 16:9 | поля + стрелки как `box`/`image` | стрелки, не карта GIS |
| `qr-poster-9x16` | 9:16 | `kind: 'qr'` + head | Wi-Fi, отзыв, меню PDF |
| `clock-date-16x9` | 16:9 | live clock/date | заставка без данных |
| `countdown-event-16x9` | 16:9 | countdown | открытие, конференция |
| `image-caption-16x9` | 16:9 | фото + подпись | витрина / галерея |
| `quote-16x9` | 16:9 | поля | корпоративные ценности |
| `directory-table-16x9` | 16:9 | DataSet / `{{ds}}` | персонал, рейсы — **нужен kind `table` или повторяемые строки** |
| `weather-strip-16x9` | 16:9 | weather snapshot как field/bind | не отдельный JS-виджет |
| `rss-headlines-16x9` | 16:9 | RSS snapshot | тикер из полей + `hide_if_empty` |

**Волна 3 — бренд и филиалы**

- Workspace brand kit: 4 цвета, 2 шрифта из каталога, лого `content_id`.
- «Save deck as template» — клон JSON в галерею workspace (как Xibo Save as Template).
- Org-level branded pack (как Yodeck Enterprise): шаблоны org, филиал только fields.

**Волна 4 — не делать самим**

- Сезонные «Halloween sale» паки — пользовательский Canva.
- 4K motion-графика — MP4 из библиотеки / Canva Video.
- Копии чужих меню-бордов пиццерии.

### 4.3 Превью шаблона

Не рендерить PNG дизайнером в git (разъедется с JSON). Фабрика отдаёт тот же `doc`, что и слайд; превью — мини-сцена тем же `styleFor` / серверный SVG snapshot. Для e-paper — ч/б превью, иначе оператор выберет циан, который на 1-bit умрёт (уже случилось в черновике room).

---

## 5. Целевой продукт: что такое «enterprise-редактор» у нас

Не Figma. Три режима одного документа Слайдов.

### 5.1 Роли

| Роль | Что видит | Чего не видит |
|---|---|---|
| **Оператор экрана** (филиал) | Галерея → мастер (шаблон, источник, 3–7 полей) → Publish | Палитру kinds, drag пикселей, AI layers |
| **Контент-менеджер** | Полный редактор слайда: холст, слои, motion, AI, DataSet bind | Чужие деки без права; Studio, если остров не собран |
| **Бренд-админ** (org) | Brand kit, lock слоёв, публикация шаблона в org-галерею | |
| **Дизайнер в Canva** | Кнопка Canva в Library, Return, байты на диске | Наш холст |

I5: если у роли нет холста — не показывать пустую палитру. Мастер создания **не** открывает полный редактор, пока человек не нажмёт «Изменить макет».

### 5.2 Полноценный редактор (роль контент-менеджера)

Минимальный набор, после которого можно честно писать «встроенный редактор», не стыдясь рядом с ScreenCloud Canvas:

**P0 — authoring, без которого холст врёт**

1. Resize handles (8 точек) + сохранение aspect у QR/`lettering`.
2. Snap к краям, центру, другим элементам (порог ~1% холста), направляющие.
3. Undo/redo стек на документ дека (не на один слайд), Ctrl+Z / Ctrl+Shift+Z. AI-generate кладёт **одну** точку стека.
4. Duplicate slide / duplicate element. Copy-paste внутри дека.
5. Клавиши: стрелки (1% / Shift 0.1%), Del, Ctrl+D, Ctrl+S.
6. Safe-area overlay 8% (выкл). Подсказка «текст у края не читается с коридора».
7. Multi-select + align (left/center/right/top/middle/bottom) + distribute.
8. Concurrent lease на deck (GAP-24): кто редактирует, TTL, steal с предупреждением.

**P1 — enterprise-ожидания**

9. Brand kit на workspace: цвета в пикере сверху, дефолтный фон/шрифт новых элементов, лого слот.
10. `locked: true` на элементе шаблона: оператор в режиме Fill не двигает и не удаляет; может менять field, если `lock` не `content`.
11. Save as template (workspace, затем org).
12. Замена фона из библиотеки / Canva / AI, не ломая elements.
13. Кириллический OFL-пак (или subset **с переименованием**, иначе нарушим OFL comment в `slide-fonts.js`). Без этого ru-шаблоны вранье на панели.

**P2 — можно не обещать в релизе редактора**

14. Rotate, boolean shapes, pen, фильтры фото.
15. Видео как элемент зоны (не фон) — конфликт с BrightSign hwz, см. комментарии в `slide-render.js`.
16. Комментарии / approval уже есть отдельно (`approvals-and-history.md`) — не дублировать в холсте.

Превью: кнопка Preview должна уметь **черновик** (сейчас честно играет published). Либо publish-to-preview-playlist, либо `preview-payload` как у плейлистов (#104). Иначе менеджер правит и «проверяет» вчерашнее.

### 5.3 Чего редактор по-прежнему не делает

- Не исполняет произвольный HTML/JS с холста (I3).
- Не заменяет Layout Editor.
- Не встраивает Canva iframe.
- Не обещает паритет с Photoshop.

---

## 6. Архитектурные решения

### D1 — Один документ, два UX

`template` + `fields` остаётся источником правды. Галерея **клонирует** JSON (как D1 в data-sources-templates-plan). Полный редактор и мастер заполнения читают один `doc`.

### D2 — Редактор — view документа, плеер не меняется

Любая новая ручка (snap, lock, brand) либо пишется в уже существующие ключи, либо добавляет **opt-in** ключ, который `normalizeSlide` знает и round-trip не теряет (`storedCfg` / `sanitizeStored`). Поля, которых нет в sanitizer, **исчезнут при Save** — это уже был XSS/data-loss баг. Новый ключ = тест round-trip.

### D3 — Три входа создания дека

```
New → [ Gallery ]  [ Blank ]  [ Import ]
              │         │         ├ Canva (когда будет)
              │         │         ├ PPT/PDF (GAP-26)
              │         │         └ Studio / Layerhub (фаза 6)
              │         └ пустой слайд, полный редактор
              └ мастер: превью → aspect → bind данных → Fill fields → Create
```

Черновые radio room/waste удаляются, когда фабрики волны 1 отдаются API.

### D4 — kind `table` / меню — не HTML от оператора

Повторяемые строки из DataSet: либо новый kind `table` с column map (как обещали в GAP-01), либо N заранее созданных `body` слотов `item_0..n` в фабрике. Для меню QSR DataSet `menu.v1` + kind `table` правильнее, иначе 40 элементов кончатся на 15 блюдах.

Не делать: оператор вставляет `<table>` в field.

### D5 — Постер из внешнего редактора — content-ряд

Canva / Studio / PPT → `ingestUploadedFile` → `content.id`. Слайд может поставить это фоном или `kind: 'image'`. Не парсить PSD/Canva JSON в elements.

### D6 — Бандлер только за забором Studio

`frontend/js` остаётся без сборки. Если появится SDK — `frontend-studio/` (Vite) + iframe/`<script type=module>` с отдельного origin path `/studio/`. Слайды туда не переезжают.

### D7 — Шаблоны версионируются как фабрики, не как live-master

`factory_id` + `factory_version` в `doc` опционально. «Сбросить макет» — позже. Правка галереи не переписывает чужие деки.

### D8 — Designer заморожен до удаления

Новый код авторства — только `#/slides`. Срок выпила Designer — отдельный эпик после того, как галерея+lock заживут и Help не будет ссылаться на старый путь.

---

## 7. Форма кода

Не плодить второй renderer.

| Файл | Роль |
|---|---|
| `server/lib/slide-templates.js` | Фабрики волн 1–2. Чистые функции → `{ id, version, aspect, category, doc }`. CJS, чтобы тесты и API не расходились с клиентом |
| `server/lib/slide-template-copy.js` | Строки хрома (Next meeting, Sold out) по locale |
| `server/routes/slide-templates.js` | `GET /api/slide-templates` (каталог + превью-дескриптор), `GET /api/slide-templates/:id/doc?slug=&locale=` |
| `server/routes/slide-decks.js` | `POST { factory, data_source_slug, title, locale }`; `POST /:id/save-as-template` |
| `server/lib/slide-render.js` | `hide_if_empty`, `show_when`, `color_when`/`bind_status` (уже в data-sources-templates-plan); позже `locked`, kind `table` |
| `server/lib/slide-deck.js` | `normalizeDeck` обязан проносить новые ключи |
| `server/lib/brand-kit.js` | workspace colors/fonts/logo; подстановка при factory |
| таблица `slide_templates` | workspace/org/system, JSON doc, category, aspect, thumbnail meta |
| `frontend/js/lib/slide-gallery.js` | Каталог UI без `api` в фабрике |
| `frontend/js/views/slides.js` | Разрезать по мере роста: stage / inspector / gallery modal. Resize+snap+undo сюда или в `frontend/js/lib/slide-stage.js` |
| `frontend/js/views/slides-fill.js` | Режим Fill (только fields + превью) для роли оператора |
| `server/test/slide-templates.test.js` | снимок геометрии, bind-ключи из канона, i18n не-DE |
| `server/test/slide-deck-config-roundtrip.js` | каждый новый ключ |
| `server/test/slide-editor-guards.test.js` | lock не снимается без права; factory без slug не создаёт `testraum` |

Превью черновика: расширить существующий playlist preview-payload на «deck draft» **или** временный unpublished playlist — выбрать в PR 3, не изобретать второй плеер.

---

## 8. Разбивка работ

Оценки — инженерные дни одного человека, знакомого с репо. Дизайн шаблонов (визуал) — отдельно, помечен «дизайн».

### Фаза 0 — честный инвентарь и пререквизиты (~2–4 дн.)

1. Зафиксировать в `feature-gap-plan.md`, что GAP-03 Menu и kind `table` в HEAD нет (чтобы планы не врали).
2. Довести фабрики волны 1 по `data-sources-templates-plan.md` (это отдельный уже написанный план; здесь он **блокер** галереи).
3. Не начинать resize, пока `hide_if_empty` / `bind_status` не в renderer: шаблоны комнат иначе снова циан на e-paper.

**Готово, когда:** New Deck показывает карточки с превью, room/waste/agenda создаются с выбранным источником, на 1-bit не используем цвет как смысл.

### Фаза 1 — галерея как продукт (~5–8 дн. + дизайн 5–8 шаблонов волны 2)

1. `GET /api/slide-templates` + модалка-галерея: категория, ориентация, превью.
2. Мастер: шаблон → источник/DataSet если нужен → поля хрома → создать.
3. Blank остаётся.
4. i18n en/de/ru на названия категорий и хром.
5. 8–12 фабрик волны 2 **без** kind `table` (welcome, announcement, qr-poster, clock, countdown, image-caption, quote, wayfinding). Меню — фаза 2.

**Готово, когда:** человек без чтения JSON выпускает welcome 16:9 и qr-poster 9:16 и видит их на превью плеера.

### Фаза 2 — меню и таблица (~8–12 дн.)

1. DataSet пресет `menu.v1` (если его правда нет): category, name, price, calories, badge, photo_content_id, sold_out, sort.
2. kind `table` **или** шаблонный repeater: колонки из map, пустая категория не дырявит сетку, sold_out остаётся в сетке (зачёркнуто / бейдж).
3. Фабрики `menu-one/two/combo` + portrait.
4. Офлайн: последний JSON DataSet с ETag, как задумано в GAP-03.
5. Тесты Unicode цен, NFC, пустые категории.

Это закрывает QSR-отказ «у Xibo есть menu board».

### Фаза 3 — editor UX P0 (~8–12 дн.)

1. `slide-stage.js`: pointer resize, snap, guides.
2. История undo (команды, не снапшоты всего innerHTML — иначе AI-картинки раздуют память; хранить патчи `doc`).
3. Duplicate, клавиатура, safe area.
4. Draft preview.
5. GAP-24 lease.

**Готово, когда:** можно собрать announcement руками без слайдеров W/H, отменить AI-generate, не затереть чужой открытый дек.

### Фаза 4 — бренд и Fill-режим (~5–8 дн.)

1. Brand kit API + пикер.
2. `locked` + роль Fill.
3. Save as template (workspace).
4. Org pack — если multi-tenancy org уже умеет шарить объекты; иначе только workspace.

### Фаза 5 — слой A, внешние редакторы

Параллелить с 3–4, не блокировать.

1. Canva фазы 0–1 из `canva-editor-embed-plan.md`.
2. GAP-26 PPT opt-in (Gotenberg/LibreOffice не в дефолтном образе).
3. Улучшение M1 Webpage «Canva embed» с валидацией URL — низкий приоритет, I4 нарушен, честно писать.

### Фаза 6 — Studio на Scenify/Layerhub (stretch, не коммитить в roadmap публично)

План: [`scenify-studio-plan.md`](scenify-studio-plan.md).

PoC — **не** Polotno и не CE.SDK. Остров `frontend-studio/` на замороженном `@layerhub-io/react@0.3.3` (MIT, наследник Scenify Design Editor). Человек рисует постер → PNG → `ingestUploadedFile`. Fabric JSON хранится только для повторного Edit, на панель не едет.

Не брать npm `@scenify/sdk` / GPL-форки / DesignCombo без LICENSE.

Критерий «надо»: после фаз 1–5 продажи всё ещё отваливаются формулировкой «нет Canva-like editor inside». Сначала измерить, не строить.

**Spike 6.0 (2026-09-20): DONE / зелёный.** `frontend-studio/` + `docker/studio-spike` (отдельный контейнер): license-check без GPL, PNG 1920×1080 с OFL Inter, бандл ~206 KB gzip. Решение: **npm pin**, не subtree. Ingest / Library UI — 6.1. Если 6.1 Support завалит Fabric — kill-switch кнопки, Canva ingest остаётся.

### Фаза 7 — не делать

- Второй Designer на Fabric/Konva **внутри** `#/slides` (Fabric допустим только в острове Studio, фаза 6).

- iframe Canva Partnership.
- Плеер, исполняющий JSON Polotno / Fabric / Layerhub.
- Копирование шаблонов конкурентов.
- White-label Canva.
- Произвольный HTML-kind.
- Rotate/pen/фильтры до P0 UX.
- Кириллица «как-нибудь» через системный шрифт панели (разный на каждом экране — тот баг, ради которого бандлили OFL).

---

## 9. Тесты

| Тест | Что держит |
|---|---|
| factory doc проходит `normalizeDeck` без потери elements | sanitizer |
| смена field не меняет число/box элементов | I1 / D2 data-sources-plan |
| `is_busy` меняет цвет полосы, не JSON геометрии | bind_status |
| e-paper фабрика: только #000/#FFF на осмысленных пятнах | 1-bit |
| нет источника → не создаётся дек с `testraum` | D5 data-sources-plan |
| lock: Fill-роль 403 на PUT template, 200 на PUT fields | права |
| lease: второй редактор видит 423/сообщение | GAP-24 |
| Canva/Studio ingest = тот же sniff, что upload | I4 |
| нет сборки `/studio/` или нет ключа Canva → кнопки скрыты, не 500 | I5 |
| round-trip новых ключей (`locked`, `bind_status`, `hide_if_empty`) | data-loss |
| плеер без WAN показывает ingest-постер и slide HTML | I4 / I5 |
| menu sold_out не удаляет строку | GAP-03 |
| XSS: цвет/URL/field в template | уже были баги |

Не тестировать «iframe Canva загрузился». Не мокать лицензию IMG.LY как «редактор есть».

---

## 10. Риски

| Риск | Почему | Смягчение |
|---|---|---|
| «Сделаем как Canva» в одном PR | привычка к Figma | D-SDK-1 в этом документе; ревью режет JSON чужого холста в `slide_decks` |
| Планы пишут BUILT, кода нет | GAP-03/18 | фаза 0, не строить меню «поверх существующего» |
| Свои 12 шаблонов выглядят бедно против «750» | маркетинг Rise | позиционировать live-шаблоны + Canva для постеров; не врать в цифре |
| Юрист и чужие PPT/Canva паки | resale ToS | только свои фабрики + пользовательский экспорт |
| Undo раздует RAM | AI images в doc как content_id — ок; data URL в истории — нет | в стеке хранить content_id, не байты |
| Resize vs `cqw` | высота в % и кегль в cqw живут вместе уже | ручки меняют box, не size_cqw, пока не решим «fit text» |
| Кириллица | бандл latin-ext | явный языковой пак, не « slомается тихо» |
| Studio license на self-host доменах | hostname pin Polotno/CE.SDK | Layerhub без ключа; запасной платный SDK — только hosted |
| Preview врёт | играет published | фаза 3 draft preview |
| Designer и Slides два автора | путаница | не расширять Designer; в nav оставить пометку |

---

## 11. Соответствие инвариантам

| Инвариант | Как не сломать |
|---|---|
| I1 Слайды | Все фичи пишут `template`/`fields`. Canva/SDK/PPT → content. Designer не трогаем |
| I2 Данные отдельно | Меню и директория — DataSet. Не печь цены в HTML |
| I3 Плеер без чужого JS | Новые kinds — константный скрипт + `data-*`. Запрет HTML-kind и GrapesJS runtime на стене |
| I4 Офлайн | Ingest до назначения; DataSet/iCal — кэш; embed Canva не делать дефолтом |
| I5 Паритет / честные кнопки | Нет ключа SDK/Canva — нет кнопки. Видео-элемент не обещать на hwz, пока не решено |
| I6 Плейлист | Publish дека по-прежнему эмитит виджеты + playlist |

---

## 12. Definition of done

Оператор на hosted (и self-hosted без Studio):

1. Открывает Слайды → Галерея → выбирает «Announcement 16:9» или «Room sign» с превью.
2. В мастере привязывает календарь / вводит заголовок / лого из бренд-кита.
3. В Fill-режиме меняет текст, не сдвигая залоченные слои.
4. Контент-менеджер в полном редакторе двигает и ресайзит, отменяет действие, сохраняет, публикует.
5. Превью показывает **текущий черновик**, не вчерашний publish.
6. Постер из Canva (когда фаза 5 готова) лежит файлом в библиотеке и ставится фоном слайда; экран не ходит на canva.com.
7. Меню QSR берёт цены из DataSet; смена цены не требует пересборки макета.
8. В UI и README нет фразы «встроенный редактор Canva». Есть: «редактор слайдов ScreenTinker» и «открыть в Canva».

---

## 13. Первый PR

Не SDK. Не 40 шаблонов. Не resize.

**PR 1 = каталог + одна новая фабрика поверх волны 1.**

- `server/lib/slide-templates.js` с room/waste/agenda, если их ещё нет, плюс `welcome-lcd-16x9` и `qr-poster-9x16`.
- `GET /api/slide-templates`, модалка с карточками вместо трёх radio.
- Мастер с обязательным источником для room/waste.
- Тесты снимка JSON и «нет testraum».

PR 2 — ещё фабрики волны 2 + i18n категорий.
PR 3 — stage: resize + snap + undo.
PR 4 — menu.v1 + table/repeater.
PR 5 — brand kit + lock + Fill.
Canva — по своему плану, можно параллельно с PR 3, не в том же диффе.

Если PR 1 тянет React/Polotno «на будущее» — вынести. Это D-SDK-1.

---

## 14. Как отвечать на вопрос «а почему не купим редактор»

Коротко, для продаж и для себя:

- Купить Polotno/CE.SDK = купить **Photoshop в браузере**. Стена играет либо картинку (потеряли часы, QR, календарь, офлайн-данные), либо мы пишем второй плеер.
- Конкуренты, у которых «красиво сразу», либо отдают Canva/PosterMyWall, либо годы рисовали свою галерею. Никто не встроил чужой холст в native player.
- Наш дифференциатор уже есть: один документ, который оживает от DataSet/iCal и одинаково рендерится на Android / web / Tizen / BrightSign / e-paper. Этого нет у Canva.
- Enterprise просит не «перо», а **шаблон + бренд + права + не сломать филиалу макет**. Это фазы 1, 2, 4, не SDK.
- Canva всё равно нужна как клапана для маркетинга — отдельным, уже описанным швом.

Если через полгода после галереи и Canva ingest хост-пользователи всё ещё рисуют в Figma и таскают PNG руками — тогда PoC Studio. Не раньше.
