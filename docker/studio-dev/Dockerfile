# Local Studio island for Docker Desktop (Vite dev server).
#
#   docker compose -f docker/studio-dev/docker-compose.yml up -d --build
#   open http://localhost:5174/studio/
#
# Proxies /api to the running Herald CMS (screentinker on herald_default).
# Mounts source for live reload.

FROM node:20-bookworm

WORKDIR /app

COPY frontend-studio/package.json frontend-studio/package-lock.json ./
RUN npm ci

# Source + OFL fonts (vite plugin serves ../server/fonts → /fonts)
COPY frontend-studio/ ./
COPY server/fonts /server/fonts

ENV STUDIO_API_PROXY=http://screentinker:3001
EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
