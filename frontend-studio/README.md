# Studio island (phase 6.3a)

**UI name:** Poster editor / Редактор постеров — not “Scenify”, not “Layerhub”.

Isolated Vite + React app on **`@layerhub-io/react`** (`Provider` + `Canvas` + chrome). Dashboard under `frontend/js/` stays vanilla.

## Features

- Layerhub editor chrome: Layers, Properties, context menu, undo/redo, zoom, align, z-order
- Presets 1920×1080, 1080×1920, 800×480 e-paper (honest dither warning)
- Text (`StaticText`), rectangle (`StaticPath`), image from Content Library (`StaticImage` + `metadata.contentId`)
- OFL fonts from `/fonts`; brand colour swatches from workspace white-label
- **Publish to library** → `POST /api/studio/export` (PNG via `renderer.toDataURL` + compact `scene_json` v2)
- Slide background via `?for=slide-bg`
- JWT from `localStorage.token` (same session as dashboard)
- Island i18n: `?lang=ru` | `en`
- Content Library **New poster** asks for size (landscape / portrait / e-paper) before opening `/studio/`

## Local (host Node)

```bash
# terminal 1 — CMS
cd server && npm start

# terminal 2 — island (proxies /api to :3001)
cd frontend-studio && npm ci && npm run dev
# http://localhost:5174/studio/
```

## Local (Docker Desktop)

Requires Herald already running (`docker compose up -d` → `screentinker` on `herald_default`):

```bash
docker compose -f docker/studio-dev/docker-compose.yml up -d --build
# http://localhost:5174/studio/?lang=ru
# Stop: docker compose -f docker/studio-dev/docker-compose.yml down
```

The island proxies `/api` to `http://screentinker:3001` on the compose network. Source under `frontend-studio/` is bind-mounted for live reload.

Production / release image: `scripts/build-studio.sh` or the `studio-builder` stage in the root `Dockerfile` copies the island to `frontend/studio/`.

## Verify

```bash
docker compose -f docker/studio-6.3/docker-compose.yml run --rm studio-63
docker compose -f docker/studio-6.2/docker-compose.yml run --rm studio-62
docker compose -f docker/studio-spike/docker-compose.yml run --rm studio-spike
```

Licence table: [`LICENSE-AUDIT.md`](LICENSE-AUDIT.md). Plan: [`docs/scenify-studio-plan.md`](../docs/scenify-studio-plan.md).
