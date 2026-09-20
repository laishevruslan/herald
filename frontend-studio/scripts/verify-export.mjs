#!/usr/bin/env node
/**
 * Headless spike verify: open the Studio preview, click Export, assert PNG is 1920×1080.
 * Writes /tmp/studio-spike-export.png (or STUDIO_SPIKE_OUT). Used by docker/studio-spike.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.STUDIO_SPIKE_URL || 'http://127.0.0.1:4173/studio/';
const OUT = process.env.STUDIO_SPIKE_OUT || '/tmp/studio-spike-export.png';

function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('not a PNG');
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('[data-testid="publish-library"]', { timeout: 60_000 });
    // Give @font-face / document.fonts.ready a beat after paint.
    await page.waitForTimeout(1500);
    await page.click('[data-testid="publish-library"]');
    await page.waitForFunction(
      () => Boolean(window.__STUDIO_SPIKE_LAST_PNG__),
      null,
      { timeout: 60_000 },
    );
    const b64 = await page.evaluate(async () => {
      const blob = window.__STUDIO_SPIKE_LAST_PNG__;
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });
    const buf = Buffer.from(b64, 'base64');
    const { width, height } = pngSize(buf);
    if (width !== 1920 || height !== 1080) {
      throw new Error(`expected 1920×1080, got ${width}×${height}`);
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buf);
    console.log(`OK: wrote ${OUT} (${width}×${height}, ${buf.length} bytes)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
