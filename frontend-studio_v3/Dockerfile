FROM node:18-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install -g pnpm@9.0.2
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:alpine
# Standalone editor (no backend required). Multiplayer build needs API/WS.
COPY --from=build /app/apps/suika/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80