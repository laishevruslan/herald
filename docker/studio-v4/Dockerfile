# frontend-studio_v4 (Scenify / CRA + Fabric) for Docker Desktop.
#
#   docker compose -f docker/studio-v4/docker-compose.yml up -d --build
#   open http://localhost:3004/
#
# Node 16: react-scripts@4 / webpack@4 need OpenSSL 1.x (or legacy provider).

FROM node:16-bookworm

WORKDIR /app

COPY frontend-studio_v4/package.json frontend-studio_v4/yarn.lock ./
# yarn.lock still pins unpublished @scenify/sdk; regenerate against npm:@nkyo/scenify-sdk alias
RUN yarn install

COPY frontend-studio_v4/ ./

ENV HOST=0.0.0.0
ENV PORT=3004
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true
ENV BROWSER=none

EXPOSE 3004

CMD ["yarn", "start"]
