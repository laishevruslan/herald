#!/usr/bin/env bash
set -euo pipefail

cd /repo/frontend-studio
npm run preview &
PREVIEW_PID=$!

cleanup() {
  kill "$PREVIEW_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait until preview answers (no curl dependency вЂ” node is always present).
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

mkdir -p "$(dirname "${STUDIO_SPIKE_OUT}")"
node scripts/verify-export.mjs

cp "${STUDIO_SPIKE_OUT}" /tmp/studio-spike-export.png
ls -la "${STUDIO_SPIKE_OUT}" /tmp/studio-spike-export.png

# Append bundle sizes into the audit file mounted? Host volume is /out only.
# Print for CI logs / LICENSE-AUDIT manual fill.
echo "=== dist sizes ==="
du -sh dist dist/assets/* 2>/dev/null || true
gzip -c dist/assets/*.js 2>/dev/null | wc -c | awk '{printf "approx total js gzip bytes (concat stream): %s\n", $1}'
