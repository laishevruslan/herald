#!/usr/bin/env bash
# Build the Studio island into frontend/studio/ for optional CMS static mount (phase 6.1+).
# Spike 6.0 prefers the isolated docker/studio-spike verify; this script is the release hook shape.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend-studio"
npm ci
node "$ROOT/scripts/license-check.js" --root "$ROOT/frontend-studio"
npm run build
rm -rf "$ROOT/frontend/studio"
mkdir -p "$ROOT/frontend/studio"
cp -R dist/. "$ROOT/frontend/studio/"
echo "Built frontend/studio/ ($(du -sh "$ROOT/frontend/studio" | cut -f1))"
