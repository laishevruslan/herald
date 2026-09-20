#!/usr/bin/env bash
set -euo pipefail

mkdir -p /out/studio
cp -R /opt/studio/. /out/studio/
echo "Studio island copied to /out/studio ($(du -sh /out/studio | cut -f1))"

cd /repo/server
node --test test/studio-export.test.js test/studio-spike.test.js

# Headless PNG export (Layerhub renderer → 1920×1080)
cd /repo/frontend-studio
npm run preview &
PREVIEW_PID=$!
cleanup() { kill "$PREVIEW_PID" 2>/dev/null || true; }
trap cleanup EXIT

node <<'WAIT'
const deadline = Date.now() + 90_000;
(async function poll() {
  while (Date.now() < deadline) {
    try {
      const r = await fetch('http://127.0.0.1:4173/studio/');
      if (r.ok) { process.exit(0); }
    } catch (_) { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error('preview did not become ready');
  process.exit(1);
})();
WAIT

mkdir -p /out
export STUDIO_SPIKE_OUT=/out/studio-63-export.png
node scripts/verify-export.mjs
ls -la "${STUDIO_SPIKE_OUT}"
echo "=== dist sizes ==="
du -sh dist dist/assets/* 2>/dev/null || true
