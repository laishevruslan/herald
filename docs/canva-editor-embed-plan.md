# Встраивание редактора Canva

**Статус: ПЛАН. Кода нет.**
**Связанное решение:** GAP-18 в [`feature-gap-plan.md`](feature-gap-plan.md) — импорт байт в библиотеку, **редактор не встраивать**. Этот документ разбирает, *можно ли* встроить редактор, как это делают конкуренты, и какой путь законно реализовать.
**Инварианты:** I1 (авторство — Слайды, не Designer), I4 (офлайн не зависит от WAN), I5 (не показывать кнопку, которая на панели ничего не делает).

Короткий ответ: **настоящий редактор Canva внутри iframe нашего дашборда недоступен.** Canva отдаёт iframe-редактор только Print Partnerships, заявки на которых **закрыты**. То, что конкуренты называют «Canva integration», почти всегда одно из двух: встраивание *опубликованного вида* (не редактора) или приложение *внутри* редактора Canva, которое публикует файлы в CMS.

Реализуемый продукт — не iframe, а **«Edit in Canva» с возвратом** (Connect API Return Navigation) плюс повторный ingest в библиотеку. Опционально, как у Xibo, — приложение в маркетплейсе Canva (пользователь живёт в Canva, не у нас).

---

## 0. Зачем это спрашивают

Оператор умеет Canva и не умеет наш slide-редактор. Конкуренты на сайте пишут «Canva». Ожидание: нажал кнопку в ScreenTinker — открылся Canva — сохранил — экран обновился.

Это три разных ожидания, и их нельзя закрыть одним iframe:

| Ожидание | Что на самом деле нужно |
|---|---|
| «Редактировать макет, не уходя с дашборда» | iframe редактора — Print Partnerships, недоступно |
| «Поменять постер и чтобы экран сам подхватил» | live Smart Embed вида *или* повторный экспорт байт |
| «Дизайнер работает в Canva, IT расставляет экраны» | приложение Canva → публикация в CMS (модель Xibo) |

План ниже разделяет эти три, чтобы PR не пытался сделать VistaPrint внутри Content Library.

---

## 1. Что уже есть в ScreenTinker

Честный инвентарь HEAD.

| Кусок | Где | Состояние |
|---|---|---|
| Webpage-виджет + публичный Canva URL | виджет `webpage`, гайд `frontend/integrations/canva-digital-signage.html` | **Работает.** Share → Publish → Website / Embed, вставить `*.my.canva.site` или `src` из embed. Edit-URL (`/design/…/edit`) **не** встраивается: логин + `X-Frame-Options`. |
| Импорт через Canva Connect (PKCE) → файл в библиотеке | GAP-18 объявлен BUILT 2026-09-08 | **В этом дереве файлов нет** (`server/lib/media-import.js` отсутствует). Решение зафиксировано: качать байты, не хранить CDN-URL Canva. Считать **несделанным пререквизитом** фазы 1. |
| Ingest байт | `server/lib/content-ingest.js` `ingestUploadedFile` | **Готово.** Любой будущий экспорт Canva обязан пройти сюда (снифф MIME, thumbnail, workspace). |
| SSRF-guard на исходящий fetch | `server/lib/ssrf-guard.js` | **Готово.** Скачивание экспорта Canva — только через него. |
| Слайды `template` + `fields` | `server/lib/slide-render.js` | Canva-картинка может стать `background_content_id` / `kind: 'image'`. Редактор Canva **не** становится третьим автором слайда. |
| Designer | `frontend/js/views/designer.js` | Помечен устаревающим (`feature-gap-plan.md` I1). Canva туда не класть. |

GAP-18 явно сказал: «Редактор Canva не встраивается в Слайды (I1)». Этот план не отменяет I1. Он предлагает другой шов: Canva производит **медиафайл**, Слайды/плейлист его потребляют.

---

## 2. Четыре модели интеграции (как это устроено технически)

Canva публично документирует четыре разных продукта. Их постоянно смешивают в маркетинге.

### M1 — Live Smart Embed вида (не редактор)

Canva Share → Embed даёт HTML/`https://www.canva.com/design/…/view?embed`. Страница обновляется, когда в Canva правят дизайн (с оговорками про autosave и re-publish).

Это **просмотр**, не редактор. Плеер грузит чужой origin. Нужен интернет на панели.

### M2 — Canva Apps SDK, Content Publisher (редактор остаётся на canva.com)

Приложение из маркетплейса Canva живёт **в боковой панели редактора Canva**. Intent `prepareContentPublisher` → пользователь жмёт Publish → приложение забирает экспортированные PNG/JPG (URL на 24 часа) и шлёт их на CMS.

Редактор не встраивается в CMS. CMS встраивается в Canva.

Xibo так и сделан: апп `canva.xibosignage.com`, OAuth на CMS, вкладки Publish (Layout или Library) и Import (медиа CMS → холст Canva). Self-hosted CMS должен быть **публичным HTTPS** — серверы Canva должны до него достучаться. HTTP и LAN-only не работают.

Старый Publish Extension Canva **снят**. Xibo мигрировал на новый Design Publisher / Content Publisher intent.

### M3 — Connect API + Return Navigation («Edit in Canva»)

Официальный путь Connect для «открой редактор и вернись»:

1. OAuth (PKCE), скоупы минимум `design:read`, `design:meta:read`; для создания/экспорта — `design:content:write`, `design:content:read`.
2. `GET /rest/v1/designs` или `POST /rest/v1/designs` (создать с `width`/`height`, например 1920×1080).
3. Кнопка ведёт на временный `urls.edit_url` (`https://www.canva.com/api/design/{token}/edit`) с `correlation_state` (≤50 символов).
4. Пользователь редактирует **на домене Canva** (полный редактор, не iframe у нас).
5. Кнопка Return в UI Canva бьёт в наш `return URL` с `correlation_jwt`. JWT проверяется по JWKS `https://api.canva.com/rest/v1/connect/keys`.
6. Интеграция заново экспортирует дизайн (`POST /rest/v1/exports`, job, скачать URL — живут 24 часа) и кладёт байты в библиотеку.

Это максимально близко к «встроили редактор», что Connect разрешает без Print Partnership. Редактор **не** в нашем DOM.

В настройках интеграции на Canva Developer Portal нужно включить Return navigation и прописать return URL.

### M4 — Print Partnerships JS API (настоящий iframe-редактор)

```js
const api = await Canva.Partnership.initialize({
  apiKey, autoAuthToken, container: document.getElementById('container'),
});
api.createDesign({ partnerProductId: 'Poster11x17', designSource: 'direct', onBackClick, onArtworkCreate });
api.editDesign({ designId });
```

Редактор реально монтируется в `container` на сайте партнёра. Это продукт для печати по требованию (визитки, постеры), не для digital signage.

**Canva не принимает новые заявки Print Partners** ([документация](https://www.canva.dev/docs/print-partnerships/): *We are not accepting new Applications for Print Partners*). Без партнёрства нет `apiKey` / `autoAuthToken` / `partnerProductId`.

**M4 в план реализации не входит.** Не проектировать «когда откроют заявки» — это другой продукт и другой договор.

---

## 3. Как это продают конкуренты

Снято по публичным гайдам, сентябрь 2026.

### Yodeck — M1

Виджет из галереи приложений. Вставляется Smart Embed. Настройки: refresh, fallback-картинка, duration. Документация прямо: «без скачивания и загрузки файлов», «автообновление».

Плюс для маркетинга, минус для signage: панель ходит на Canva; офлайн — чёрный экран, если нет fallback. Canva плохо autoplay'ит многостраничные embed (это отмечают и другие).

### ScreenCloud — M1

Отдельное приложение Canva: paste embed code, «real-time updates», multi-slide + transitions внутри одного app instance. FAQ: правки в Canva когда доедут; приватный дизайн нельзя; видео в дизайне — с ограничениями.

Редактор в ScreenCloud не встроен.

### OptiSigns — M1 (+ ручной upload)

Два пути в их гайде: скачать файл и залить; либо Embed HTML для live-обновлений. Сами пишут, что Canva embed **не листает страницы** — обход через Playlist (одна страница Canva = один ассет). Kiosk Designer позиционируют как «лучше для signage»: разрешение, локальный кэш, навигация.

Честное признание: live embed удобен оператору и плох как плеер.

### Retriever — M1

Отдельный шаблон «Canva Embed». Предупреждения: autosave может выкатить полуготовое на экран; no autoplay → для слайдов/видео лучше экспорт в Video; панель обязана быть online; битая embed-ссылка даёт ошибку, которую нельзя публиковать.

### Xibo — M2 (эталон «редактор + CMS»)

Пользователь **не уходит из Canva**. Апп в маркетплейсе:

- Publish as Layout **или** в Media Library (сейчас JPG/PNG; видео обещают позже);
- Import: картинки из CMS на холст Canva (drag);
- Cloud CMS — Approve в один клик; self-hosted — Client ID/Secret + redirect `https://canva.xibosignage.com/complete`;
- CMS обязан быть HTTPS с интернета;
- white-label аппа нет;
- нужные resolutions 1080p в CMS, иначе publish падает.

Это не «Xibo встроил Canva». Это «Canva встроил кнопку Опубликовать в Xibo».

### ScreenTinker сегодня — слабый M1

Гайд честно говорит: отдельного Canva-приложения нет, используйте Webpage-виджет. Нет refresh/fallback как у Yodeck, нет кнопки «Edit in Canva», нет публикации из редактора Canva.

GAP-18 хотел M3 без Return Navigation: только picker + export. Даже это в HEAD не лежит.

### Сводная таблица

| | Редактор в CMS | Редактор Canva | Байты на диске CMS | Экран без WAN | Кто так делает |
|---|---|---|---|---|---|
| M1 Smart Embed | нет | нет (вид) | нет | нет | Yodeck, ScreenCloud, OptiSigns |
| M2 Canva App | нет | да, на canva.com | да (PNG/JPG) | да, после publish | Xibo |
| M3 Return Navigation | нет (редирект) | да, на canva.com | да, после return | да, после ingest | Connect-демо e-commerce; у signage почти никто не рекламирует |
| M4 Partnership iframe | **да** | да, в нашем DOM | да, через `onArtworkCreate` | да | только Print Partners, набор закрыт |
| ST Webpage сейчас | нет | нет | нет | нет | мы |
| ST GAP-18 (задумано) | нет | нет | да | да | мы, не в HEAD |

Ни один публичный конкурент digital signage **не встраивает редактор Canva к себе в дашборд.** Ближайший UX «я в Canva и жму Publish» — Xibo (M2). Ближайший UX «я в CMS и жму Edit» — M3.

---

## 4. Решения, которые фиксируют архитектуру

### D1 — M4 не делать и не обещать в UI

Кнопка «открыть редактор Canva здесь» без Print Partnership — ложь (I5). Не рисовать iframe-заглушку.

### D2 — Выход Canva — это content-ряд, не слайд и не Designer

Экспорт PNG/JPG/MP4 проходит `ingestUploadedFile`. Плейлист и Слайды ссылаются на `content.id`, как на любой upload.

Не парсить Canva JSON в `template.elements`. Не делать `kind: 'canva'`. Иначе плеер начинает зависеть от Canva (I4, I5) и Слайды перестают быть источником правды (I1).

Связь «этот файл пришёл из дизайна X» — метаданные на content-ряде (`source: 'canva'`, `canva_design_id`), чтобы кнопка «Edit in Canva» знала, что переоткрыть. Это не live-URL.

### D3 — Экраны никогда не ходят на canva.com

I4. Download URL экспорта живёт 24 часа — поэтому байты обязаны оказаться в `contentDir` до publish на панель. `remote_url` на CDN Canva не оставлять (GAP-18 уже так решил).

M1 (Webpage + embed) остаётся **ручным** путём для тех, кому live-обновление важнее офлайна. Не делать его дефолтом кнопки Canva и не называть «редактором».

### D4 — Основной продукт фазы 1–2: M3 (Edit in Canva + ingest)

Это единственный Connect-путь, где оператор стартует **из нашего дашборда**, видит настоящий редактор Canva и возвращается с файлом.

M2 (апп в маркетплейсе) — фаза 3: другой артефакт (TypeScript-апп, ревью Canva, публичный HTTPS), другой UX (дизайнер не открывает ScreenTinker). Для self-hosted air-gap M2 непригоден; M3 пригоден: в интернет ходит только браузер оператора.

### D5 — Секреты как у AI, не в env единственным источником

Client ID/secret интеграции Canva — JWT-only, workspace или org, как задумано в GAP-18. Env — fallback для hosted `screentinker.com`. Self-hosted без ключа: UI честно выключен (I5), не 500.

OAuth-токены пользователя Canva — encrypted at rest, не в activity log.

### D6 — Один design_id на content-ряд, re-export перезаписывает байты

«Edit in Canva» на уже импортированном файле не плодит второй ассет по умолчанию. `PUT /api/content/:id/replace` уже есть и выравнивает metadata. История версий — существующий `revisions.js`, если replace его дёргает; не строить вторую историю «canva_revisions».

Если дизайн многостраничный: либо один PDF/MP4, либо N PNG в папку. Дефолт фазы 1 — **одна страница / flattened PNG** (как Xibo «первая страница в preview»). Многостраничность — фаза 2, явным выбором в UI.

### D7 — Размеры знака задаём мы, не «что получилось в Canva»

`POST /rest/v1/designs` с `design_type: { type: 'custom', width: 1920, height: 1080 }` (или 1080×1920, или 800×480 для Sticky). Список пресетов совпадает с аспектами Слайдов / embedded-профилей, не с типографикой Canva «Instagram Post».

### D8 — Не white-label Canva

Xibo честно пишет, что апп нельзя white-label. Кнопка «Edit in Canva» обязана соблюдать [бренд Canva](https://www.canva.com/brand/). Не рисовать поддельный логотип и не называть кнопку просто «Edit».

---

## 5. Почему не iframe, подробно

Чтобы снять повторный спор в PR.

1. **Продукт iframe-редактора существует, нам его не продадут.** Partnership SDK + `container`. Набор партнёров закрыт.
2. **Обычный edit URL нельзя вставить в iframe.** Canva ставит frame-ancestors / логин. Наш же гайд это уже описывает. Webpage-виджет это подтверждает каждый день.
3. **Connect `edit_url` — навигация, не embed.** Это одноразовый токен на `canva.com`. В iframe получим пустой фрейм или логин Canva.
4. **Apps SDK работает наоборот:** наш код в iframe *у Canva*, не наоборот.
5. **Self-hosted / air-gap:** даже если бы iframe был, редактор всё равно тянет ассеты Canva. Смысл I4 — экраны. Оператор с ноутбуком в интернете — допустимая асимметрия для M3.

Итоговая формулировка для README/help: *«ScreenTinker открывает редактор Canva в новой вкладке и забирает результат в библиотеку. Редактор Canva внутри дашборда Canva не отдаёт сторонним CMS.»*

---

## 6. Целевой UX (то, что строим)

### 6.1 Из Content Library (фаза 1)

- Кнопка **Canva**, видна только если интеграция настроена.
- Если пользователь Canva не связан — PKCE, редирект, возврат в Library.
- Два действия: **Import existing** (грид дизайнов + thumbnail с Connect) и **Create new** (выбор пресета размера → `POST designs` → переход по `edit_url`).
- После Return: спиннер экспорта → ingest → карточка в библиотеке с бейджем Canva и кнопкой **Edit in Canva**.
- Ошибки экспорта, которые Canva отдаёт честно: `license_required` (премиум-элементы), `approval_required`. Показать текст Canva, не «Import failed».

### 6.2 Со слайда (фаза 2, не блокер)

В инспекторе фона/image-элемента: «Заменить из Canva» / «Редактировать в Canva», если у `content_id` есть `canva_design_id`. После return — replace байт, widget/slide rev++, publish как обычно.

Не открывать Canva как stage слайда. Слайд по-прежнему template+fields.

### 6.3 Чего нет в UX

- iframe на `#/slides` или `#/designer`;
- «live Canva» как тип плейлист-элемента по умолчанию;
- автопубликация на все экраны в момент Return без явного Publish плейлиста (у нас draft/publish уже есть — не обходить).

---

## 7. Форма кода

Не плодить второй ingest.

| Файл | Роль |
|---|---|
| `server/lib/canva-connect.js` | OAuth PKCE, refresh, list/create/export designs, verify `correlation_jwt` через JWKS. Без Express. |
| `server/routes/canva.js` | JWT + `resolveTenancy`. `GET /auth`, `GET /callback`, `GET /designs`, `POST /designs`, `GET /return`, `POST /import/:designId`. |
| `server/lib/content-ingest.js` | без изменений API; вызывающий кладёт buffer/file как upload. |
| таблица `canva_links` | `content_id`, `workspace_id`, `design_id`, `user_canva_id`, `updated_at`. Не URL. |
| таблица `canva_oauth` | workspace-scoped refresh token, encrypted. |
| `frontend/js/views/content-library.js` | кнопки Canva, грид, обработка return (`#/content?canva=return`). |
| `server/test/canva-connect.test.js` | JWT verify (фикстура JWKS), export URL 24h → ingest, SSRF на download host allowlist. |

**Allowlist скачивания.** URL экспорта Canva — `document-export.canva.com` и аналоги из доков. `guardedRequest` + проверка host allowlist, не «любой https». Редирект за пределы allowlist — отказ.

**correlation_state.** 50 символов мало для workspace+content+csrf. Класть в БД строку `canva_return_state` (`id`, `workspace_id`, `user_id`, `content_id | null`, `preset`, `expires_at`), в URL — `id` в base64url.

**Return URL.** Для hosted: `https://screentinker.com/api/canva/return`. Для self-hosted: оператор вписывает публичный origin в настройках интеграции Canva (как redirect OAuth). Инстанс за NAT без туннеля M3 всё равно работает для *ухода* в Canva, но Return не вернётся — UI обязан сказать это при сохранении redirect URI.

Многоинстансность: Client ID один на продукт (hosted) или свой у self-hoster. Не хардкодить `screentinker.com` как единственный return (I7 mesh / air-gap).

---

## 8. Разбивка работ

Оценки — инженерные дни одного человека, знакомого с репо.

### Фаза 0 — пререквизит GAP-18, если его всё ещё нет в HEAD (~3–5 дн.)

1. PKCE Connect, list designs, export job, download через SSRF+allowlist, `ingestUploadedFile`.
2. Настройки ключа в workspace, UI Library «Import from Canva», выкл. без ключа.
3. Тесты на протухший export URL (не оставлять `remote_url`).

Без этого Return Navigation некуда возвращать байты.

### Фаза 1 — Return Navigation + Create (~5–8 дн.)

1. Developer Portal: включить Return navigation, скоупы, redirect + return URL.
2. `POST /api/canva/designs` с пресетами 16:9 / 9:16 / 5:3.
3. Кнопка Edit: `edit_url` + `correlation_state`.
4. `GET /api/canva/return` — verify JWT, найти state, kick export, ingest или replace, редирект в Library.
5. Бейдж + повторный Edit на карточке.
6. i18n `en`/`de`/`ru` минимум. Бренд Canva на кнопке.

**Готово, когда:** оператор без открытия JSON создаёт 1920×1080 дизайн, правит в Canva, жмёт Return, видит PNG в библиотеке, назначает в плейлист, панель показывает файл офлайн.

### Фаза 2 — многостраничность и слайды (~3–5 дн.)

1. Выбор в UI: «одна страница / все страницы PNG / PDF / MP4» — что отдаёт export API для тарифа пользователя.
2. Все страницы → несколько content-рядов в папке или PDF как один item (PDF→playlist у нас уже есть).
3. Со слайда: replace `background_content_id`.
4. Честный fail на `license_required`.

### Фаза 3 — Canva App как у Xibo (stretch, ~2–3 нед. + ревью Canva)

Отдельный репозиторий или `canva-app/`: Apps SDK, Content Publisher intent, OAuth на ScreenTinker.

| Шаг | Суть |
|---|---|
| 1 | `@canva/cli` шаблон Content Publisher |
| 2 | `publishContent`: скачать `outputMedia[].url`, `POST /api/content` с PAT или OAuth code |
| 3 | Settings UI: workspace, папка, «в библиотеку» (не «в слайд») |
| 4 | Import tab опционально: `GET /api/content` картинки → upload в Canva |
| 5 | Публикация в маркетплейсе Canva — срок и бренд решает Canva, не мы |
| 6 | Hosted: один OAuth client. Self-hosted: как Xibo, оператор вводит CMS URL **только если** origin доступен Canva с интернета |

Air-gapped инстанс фазу 3 не получает — и не должен видеть кнопку «Publish from Canva» в help как обязательную.

**Не начинать фазу 3, пока фаза 1 не пожила на hosted.** Иначе два непротестированных OAuth навстречу друг другу.

### Фаза 4 — не делать

- Partnership iframe;
- live `remote_url` на панели;
- `kind: 'canva'` в слайдах;
- проксирование редактора через наш origin (нарушение ToS Canva + cookie/login ад).

### Улучшение M1 (не редактор, низкий приоритет)

Если понадобится паритет с Yodeck «вставил ссылку»: пресет Webpage «Canva embed» с валидацией URL (отказ edit-ссылок), подсказка duration, optional fallback image из библиотеки. Это 1–2 дня и **не** замена фаз 1–2. I4 на этом пути по-прежнему нарушен — честно писать в UI: «экран должен быть в интернете».

---

## 9. Тесты

| Тест | Что держит |
|---|---|
| без ключа эндпоинты 404/скрыты, не 500 | I5 |
| export URL с хостом вне allowlist → отказ | SSRF |
| протухший download (24h) не пишется в `remote_url` | GAP-18 / I4 |
| JWT return с чужим `aud` / протухший `exp` → 401 | подделка Return |
| `correlation_state` другого workspace не импортирует в этот | IDOR |
| ingest после Canva проходит тот же снифф, что upload | `content-ingest` |
| replace по `canva_design_id` не создаёт второй ряд | D6 |
| create design 800×480 → metadata width/height | D7 Sticky |
| плеер с выключенным WAN показывает файл после ingest | I4 |

Не тестировать Partnership SDK. Не мокать «iframe загрузился».

---

## 10. Риски

| Риск | Почему | Смягчение |
|---|---|---|
| «Встроили редактор» в маркетинге, а это редирект | привычка к Figma embed | формулировка D1 в help и кнопке |
| Self-hosted Return не доходит | инстанс за NAT | предупреждение при настройке redirect; фаза 1 всё равно полезна на hosted |
| Премиум-элементы Canva | export `license_required` | показать ответ Canva, не ретраить вслепую |
| Autosave vs Return | пользователь жмёт Return до сохранения | Canva обычно автосейвит; всё равно export после Return, не по вебхуку на каждый keystroke |
| ToS / бренд | логотип, имя Canva | брендгайд; не white-label |
| Ревью аппа Canva затягивается | фаза 3 | не блокировать фазу 1 |
| GAP-18 «BUILT» в плане, файлов нет | документ обогнал дерево | фаза 0 — первый PR |
| Дизайнер правит в Canva, оператор правит слайд | два источника правды | Canva владеет картинкой; слайд владеет полями/слотами. Не сливать |

---

## 11. Соответствие инвариантам

| Инвариант | Как не сломать |
|---|---|
| I1 Слайды | Canva не пишет `template`. Только `content` / `background_content_id` |
| I2 Данные отдельно | Не класть live JSON Canva в слайд |
| I3 Плеер без чужого JS | На панели файл, не embed-скрипт Canva |
| I4 Офлайн | ingest до назначения на устройство |
| I5 Паритет / честные кнопки | нет ключа → нет кнопки; нет iframe-кнопки вообще |
| I6 Плейлист | обычный content item, resolver не трогаем |

---

## 12. Definition of done

Оператор на hosted (и self-hosted с публичным HTTPS):

1. Подключает Canva в настройках workspace (или использует ключ инстанса).
2. Content Library → Canva → Create 1920×1080 (или Import).
3. Правит дизайн в полной вкладке Canva, жмёт Return.
4. Файл лежит в библиотеке, доступен офлайн на Android / web / Tizen / BrightSign.
5. Повторный Edit in Canva обновляет тот же content id.
6. Ни один экран не ходит на canva.com.

Фраза «встроенный редактор Canva» в UI и README **не используется**.

---

## 13. Первый PR

Не апп в маркетплейсе. Не Webpage-пресет.

**PR 1 = фаза 0 + минимальный Return из фазы 1:** PKCE, list+export+ingest, кнопка Import, Return на уже существующий `design_id` (без Create preset, если нужно ужать). Create new — PR 2. Слайды — PR 3. Canva App — отдельная серия после жизни на hosted.

Если PR 1 пытается одновременно нарисовать iframe «на будущее» — вынести. Это и есть D1.
