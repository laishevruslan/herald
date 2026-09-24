#!/usr/bin/env bash
set -euo pipefail

cd /repo/frontend-studio_v3/apps/suika
# Preview the production build with the same base path Herald will use.
npx --yes vite preview --host 127.0.0.1 --port 4173 --strictPort &
PREVIEW_PID=$!

cleanup() {
  kill "$PREVIEW_PID" 2>/dev/null || true
}
trap cleanup EXIT

node <<'WAIT'
const deadline = Date.now() + 120_000;
(async function poll() {
  while (Date.now() < deadline) {
    try {
      const r = await fetch('http://127.0.0.1:4173/suika/');
      if (r.ok) { process.exit(0); }
    } catch (_) { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error('suika preview did not become ready');
  process.exit(1);
})();
WAIT

mkdir -p "$(dirname "${SUIKA_SPIKE_OUT}")"
# Resolve playwright from the workspace root (added in the spike Dockerfile).
cd /repo/frontend-studio_v3
node apps/suika/scripts/verify-spike-export.mjs

ls -la "${SUIKA_SPIKE_OUT}"
echo "=== build sizes ==="
du -sh build build/assets/* 2>/dev/null || true
