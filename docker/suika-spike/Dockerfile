# Suika Phase 0 spike — isolated build + PNG 1920×1080 export verify
#
# Does NOT replace the main ScreenTinker image:
#   docker compose -f docker/suika-spike/docker-compose.yml run --rm suika-spike
#
# Produces /out/suika-spike-export.png on the host via the volume.

FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY frontend-studio_v3/package.json frontend-studio_v3/pnpm-lock.yaml frontend-studio_v3/pnpm-workspace.yaml frontend-studio_v3/.npmrc /repo/frontend-studio_v3/
COPY frontend-studio_v3/packages /repo/frontend-studio_v3/packages
COPY frontend-studio_v3/apps/suika /repo/frontend-studio_v3/apps/suika
COPY scripts/license-check.js /repo/scripts/license-check.js
COPY VERSION /repo/VERSION

WORKDIR /repo/frontend-studio_v3
ENV HUSKY=0
ENV SUIKA_BASE=/suika/
RUN pnpm install --no-frozen-lockfile --filter @suika/suika...
RUN node /repo/scripts/license-check.js --root /repo/frontend-studio_v3
RUN pnpm --filter @suika/suika... run build
# Playwright browsers ship in the base image; the Node driver is not — install for spike verify only.
RUN pnpm add -Dw playwright@1.49.1

ENV SUIKA_SPIKE_URL=http://127.0.0.1:4173/suika/?spike=export
ENV SUIKA_SPIKE_OUT=/out/suika-spike-export.png

COPY docker/suika-spike/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
