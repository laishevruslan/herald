# Studio 6.1 — island build + ingest API verify (separate from main CMS image)
#
#   docker compose -f docker/studio-6.1/docker-compose.yml run --rm studio-61
#
# Builds frontend-studio into /opt/studio, copies to host via /out volume,
# runs license-check, and server studio unit tests.

FROM node:20-bookworm

WORKDIR /repo

COPY server/package.json server/package-lock.json /repo/server/
WORKDIR /repo/server
RUN npm ci

COPY frontend-studio/package.json frontend-studio/package-lock.json /repo/frontend-studio/
WORKDIR /repo/frontend-studio
RUN npm ci

COPY . /repo/

WORKDIR /repo/frontend-studio
RUN node /repo/scripts/license-check.js --root /repo/frontend-studio
RUN npm run build
RUN mkdir -p /opt/studio && cp -R dist/. /opt/studio/

COPY docker/studio-6.1/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

WORKDIR /repo/server
ENV SELF_HOSTED=true
ENV NODE_ENV=test
ENTRYPOINT ["/entrypoint.sh"]
