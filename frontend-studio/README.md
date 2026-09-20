# Studio island (phase 6 spike)

**UI name:** Poster editor / Редактор постеров — not “Scenify”, not “Layerhub”.

Isolated Vite + React + Fabric app. The vanilla dashboard under `frontend/js/` is untouched.

## Decision (6.0)

| Question | Answer |
|---|---|
| Source | **npm pin** `@layerhub-io/react@0.3.3` + `@layerhub-io/core@0.3.3` (not git subtree, not `@scenify/sdk`) |
| Why not subtree | Pin is enough for the spike; subtree of the whole monorepo would drag Vue packages and dead demos |
| Why not `@scenify/sdk` | GPL-3.0 — denied by `scripts/license-check.js` |
| Export | Browser `canvas.toDataURL` → PNG 1920×1080 (no `node-canvas` in this image) |

Full licence table: [`LICENSE-AUDIT.md`](LICENSE-AUDIT.md). Plan: [`docs/scenify-studio-plan.md`](../docs/scenify-studio-plan.md).

## Local

```bash
cd frontend-studio
npm ci
npm run license-check
npm run dev          # http://localhost:5174/studio/
npm run build && npm run preview
```

OFL Inter is served from `../server/fonts` via the Vite middleware at `/studio-fonts/` (same bytes as slides).

## Docker verify (separate container)

```bash
docker compose -f docker/studio-spike/docker-compose.yml build
docker compose -f docker/studio-spike/docker-compose.yml run --rm studio-spike
# → docker/studio-spike/out/studio-spike-export.png (1920×1080)
```

## What this spike does **not** include

- `studio_designs` / ingest / Library buttons (phase 6.1)
- GSAP animations, Iconscout, video/presentation modes
- Fabric JSON on the player
