#!/usr/bin/env node
/**
 * Headless Phase 0 spike verify: open Suika with ?spike=export, assert PNG is 1920×1080.
 * Writes STUDIO_SPIKE_OUT / SUIKA_SPIKE_OUT. Used by docker/suika-spike.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE =
  process.env.SUIKA_SPIKE_URL ||
  process.env.STUDIO_SPIKE_URL ||
  'http://127.0.0.1:4173/suika/?spike=export';
const OUT =
  process.env.SUIKA_SPIKE_OUT ||
  process.env.STUDIO_SPIKE_OUT ||
  '/tmp/suika-spike-export.png';

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
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 180_000 });
    await page.waitForFunction(
      () =>
        Boolean(window.__SUIKA_SPIKE_READY__) ||
        Boolean(window.__SUIKA_SPIKE_ERROR__),
      null,
      { timeout: 120_000 },
    );
    const err = await page.evaluate(() => window.__SUIKA_SPIKE_ERROR__ || null);
    if (err) throw new Error(`spike failed: ${err}`);
    const b64 = await page.evaluate(async () => {
      const blob = window.__SUIKA_SPIKE_LAST_PNG__;
      if (!blob) return null;
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });
    if (!b64) throw new Error('no PNG blob from spike');
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
