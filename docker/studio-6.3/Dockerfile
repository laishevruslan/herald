# Studio 6.3 — full Layerhub Editor UI verify
#
#   docker compose -f docker/studio-6.3/docker-compose.yml run --rm studio-63
#
# Playwright base (browsers preinstalled) + island build + PNG export +
# server studio unit tests.

FROM mcr.microsoft.com/playwright:v1.49.1-jammy

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

COPY docker/studio-6.3/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

WORKDIR /repo/server
ENV SELF_HOSTED=true
ENV NODE_ENV=test
ENV STUDIO_SPIKE_URL=http://127.0.0.1:4173/studio/
ENV STUDIO_SPIKE_OUT=/out/studio-63-export.png
ENTRYPOINT ["/entrypoint.sh"]
