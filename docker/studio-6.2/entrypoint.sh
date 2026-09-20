#!/usr/bin/env bash
set -euo pipefail

mkdir -p /out/studio
cp -R /opt/studio/. /out/studio/
echo "Studio island copied to /out/studio ($(du -sh /out/studio | cut -f1))"

cd /repo/server
node --test test/studio-export.test.js test/studio-spike.test.js
