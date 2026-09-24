#!/usr/bin/env bash
# Build the Suika design island into frontend/suika/ for optional CMS static mount (Phase 0+).
# Mirrors scripts/build-studio.sh. Requires pnpm (corepack enable && corepack prepare pnpm@9 --activate).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend-studio_v3"
export HUSKY=0
export SUIKA_BASE=/suika/
pnpm install --no-frozen-lockfile
node "$ROOT/scripts/license-check.js" --root "$ROOT/frontend-studio_v3"
pnpm --filter @suika/suika... run build
rm -rf "$ROOT/frontend/suika"
mkdir -p "$ROOT/frontend/suika"
cp -R apps/suika/build/. "$ROOT/frontend/suika/"
echo "Built frontend/suika/ ($(du -sh "$ROOT/frontend/suika" | cut -f1))"
