# frontend-studio_v5 (Aktivisda / Vue 2) for Docker Desktop.
#
#   docker compose -f docker/studio-v5/docker-compose.yml up -d --build
#   open http://localhost:3005/

FROM node:20-bookworm

# canvas (library devDep) may need these at install time
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY frontend-studio_v5/ ./

RUN cd aktivisda-library && npm ci && npm run build
RUN npm install --legacy-peer-deps

ENV VUE_APP_NAME=aktivisda
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 3005

CMD ["npm", "run", "serve:docker"]
