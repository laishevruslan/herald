# Studio spike — isolated build + PNG export verify
#
# Does NOT replace the main ScreenTinker image. Phase 6.0 only:
#   docker compose -f docker/studio-spike/docker-compose.yml run --rm studio-spike
#
# Produces /tmp/studio-spike-export.png inside the container (copied to
# docker/studio-spike/out/ on the host via the volume).

FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /repo

# Island first (better layer cache), then OFL fonts the spike must load.
COPY frontend-studio/package.json frontend-studio/package-lock.json* /repo/frontend-studio/
WORKDIR /repo/frontend-studio
RUN npm ci

COPY frontend-studio/ /repo/frontend-studio/
COPY server/fonts/inter.woff2 server/fonts/inter-ext.woff2 server/fonts/OFL-inter.txt /repo/server/fonts/
COPY scripts/license-check.js /repo/scripts/license-check.js

# Licence gate on the island tree (production deps only).
RUN node /repo/scripts/license-check.js --root /repo/frontend-studio

RUN npm run build

# Preview + headless export. Playwright browsers already in the base image.
ENV STUDIO_SPIKE_URL=http://127.0.0.1:4173/studio/
ENV STUDIO_SPIKE_OUT=/out/studio-spike-export.png

COPY docker/studio-spike/entrypoint.sh /entrypoint.sh
# Windows checkouts may leave CRLF; shebang then becomes `bash\r`.
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
