# Studio island (phase 6.1)

**UI name:** Poster editor / Редактор постеров — not “Scenify”, not “Layerhub”.

Isolated Vite + React + Fabric app. Dashboard under `frontend/js/` stays vanilla.

## Features (6.1)

- Presets 1920×1080 and 1080×1920
- Text, rectangle, image from Content Library
- **Publish to library** → `POST /api/studio/export` (PNG ingest + `studio_designs.scene_json`)
- Re-edit replaces the same `content_id`
- JWT from `localStorage.token` (same session as dashboard)

## Local

```bash
# terminal 1 — CMS
cd server && npm start

# terminal 2 — island (proxies /api to :3001)
cd frontend-studio && npm ci && npm run dev
# http://localhost:5174/studio/
```

Production / Docker: `scripts/build-studio.sh` or the `studio-builder` stage in the root `Dockerfile` copies the island to `frontend/studio/`.

## Verify

```bash
# API + licence + island build (separate container)
docker compose -f docker/studio-6.1/docker-compose.yml run --rm studio-61

# PNG raster smoke (6.0 container)
docker compose -f docker/studio-spike/docker-compose.yml run --rm studio-spike
```

Licence table: [`LICENSE-AUDIT.md`](LICENSE-AUDIT.md). Plan: [`docs/scenify-studio-plan.md`](../docs/scenify-studio-plan.md).
