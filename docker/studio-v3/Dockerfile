# frontend-studio_v3 (Fabric.js / Next.js editor) for Docker Desktop.
#
#   docker compose -f docker/studio-v3/docker-compose.yml up -d --build
#   open http://localhost:3003/

FROM node:20-bookworm

WORKDIR /app

COPY frontend-studio_v3/package.json frontend-studio_v3/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY frontend-studio_v3/ ./

EXPOSE 3003

CMD ["npm", "run", "dev"]
