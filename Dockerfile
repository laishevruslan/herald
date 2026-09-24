# ScreenTinker server image: serves the dashboard, the web player, and the
# device API. All mutable state (db, uploads, jwt secret) lives under /data so it
# survives container restarts - mount a volume there. A built ScreenTinker.apk
# can be mounted at /data/ScreenTinker.apk to enable OTA APK downloads.
#
# No TLS in the image: it listens on plain HTTP :3001. Front it with a
# TLS-terminating reverse proxy / Cloudflare in production.

# --- studio island (phase 6): Vite build → frontend/studio (I5: buttons appear only if present) ---
FROM node:20-slim AS studio-builder
WORKDIR /studio
COPY frontend-studio/package.json frontend-studio/package-lock.json ./
RUN npm ci
COPY frontend-studio/ ./
RUN npm run build

# --- suika design island (Phase 0+): pnpm monorepo → frontend/suika ---
FROM node:20-slim AS suika-builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /suika
ENV HUSKY=0
ENV SUIKA_BASE=/suika/
COPY frontend-studio_v3/package.json frontend-studio_v3/pnpm-lock.yaml frontend-studio_v3/pnpm-workspace.yaml frontend-studio_v3/.npmrc ./
COPY frontend-studio_v3/packages ./packages
COPY frontend-studio_v3/apps/suika ./apps/suika
COPY scripts/license-check.js /scripts/license-check.js
COPY VERSION /VERSION
RUN pnpm install --no-frozen-lockfile --filter @suika/suika...
RUN node /scripts/license-check.js --root /suika
RUN pnpm --filter @suika/suika... run build

# --- builder: install production deps (better-sqlite3 is the only native one left; image
# decoding is pure JS + WASM since sharp was dropped, and sharp is now a devDependency that
# --omit=dev leaves out entirely) ---
FROM node:20-slim AS builder
WORKDIR /app/server
# build toolchain in case a native prebuild is missing for the target arch
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:20-slim
# ffmpeg (ships ffprobe) powers video thumbnails + duration extraction at upload.
# Without it videos still upload and play, but arrive with no thumbnail or duration.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# Relocate all state onto the volume (config.js reads DATA_DIR; unset would use
# the in-repo paths, which we do not want in a container).
ENV DATA_DIR=/data
WORKDIR /app/server
# App source (node_modules/test/db/uploads/certs are excluded via .dockerignore),
# then the built deps, the frontend the server serves, and the VERSION file it
# reads as ../VERSION.
COPY server/ /app/server/
COPY --from=builder /app/server/node_modules /app/server/node_modules
COPY frontend/ /app/frontend/
COPY --from=studio-builder /studio/dist/ /app/frontend/studio/
COPY --from=suika-builder /suika/apps/suika/build/ /app/frontend/suika/
# shared/Transitions is a RUNTIME dependency: server/lib/transition-config.js + transition-bundle.js
# require the shader manifest/params/sources from ../../shared at load time (the server won't boot
# without it). Small, and keeps the .glsl files the single source across server + player + Tizen.
COPY shared/ /app/shared/
COPY VERSION /app/VERSION
# ⚠️ AND THE RELEASE NOTES, which the server reads from the repo ROOT at runtime
# (server/lib/release-notes.js). Missing here, the API answers `current: null` and the "what's new"
# panel is empty on every containerised install — while the unit tests pass, because they read the
# file out of the source tree. Found on alpha, on the release that introduced the panel.
COPY release-notes.json /app/release-notes.json
# the /openapi.yaml route serves ../docs/openapi.yaml (the spec Redoc on /docs fetches);
# without this it 404s in the image even though it serves fine from a dev checkout.
COPY docs/openapi.yaml /app/docs/openapi.yaml
# database.js requires scripts/migrate-multitenancy at boot
COPY scripts/ /app/scripts/
# The BrightSign bridge and sync modules are served to the player from ../brightsign so the copy
# the player loads can never drift from the one on the player's own storage. That RUNTIME path
# does not exist unless the directory is in the image: without this the routes 404 in a container
# while working perfectly from a dev checkout — and a missing player asset fails silently, because
# the SPA fallback answers 200 with HTML where JavaScript was expected.
COPY brightsign/ /app/brightsign/
# Bundled plugins (countdown sample, etc.). Loaded only when PLUGINS_ENABLED=true;
# operator-installed copies live on the /data volume at $DATA_DIR/plugins.
COPY plugins/ /app/plugins/
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "server.js"]
