# OpenDesign (frontend-studio_v2) for Docker Desktop.
#
#   docker compose -f docker/studio-v2/docker-compose.yml up -d --build
#   open http://localhost:5178/
#
# Vite UI + Wrangler (Hono/D1) API in one container.

FROM node:22-bookworm

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY frontend-studio_v2/package.json frontend-studio_v2/pnpm-lock.yaml frontend-studio_v2/pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY frontend-studio_v2/ ./

EXPOSE 5178 8787

CMD ["pnpm", "run", "dev:docker"]
