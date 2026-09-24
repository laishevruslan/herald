'use strict';
/*
 * Unknown content-page URLs must 404, not answer 200 with the dashboard.
 *
 * sitemap.xml advertises six /guides/ URLs. Before this, any other path under that prefix fell
 * through to the SPA catch-all and returned 200 with ~60KB of dashboard HTML. That is a soft-404,
 * and it is worse than a plain miss: a crawler that finds a typo'd or retired guide answering 200
 * with unrelated markup learns to distrust the directory that the real guides live in. Flagged in
 * docs/seo-directory-listings.md, and Bing's report on this site is the reason it got fixed.
 *
 * The same soft-404 hit /studio/ when the poster island was not built: I5 HEAD returned 200 and
 * "New poster" navigated into a CMS refresh with no editor.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'server', 'server.js'), 'utf8');

test('the catch-all refuses content prefixes instead of serving the SPA', () => {
  const m = SRC.match(/const CONTENT_PREFIXES = \[([^\]]*)\]/);
  assert.ok(m, 'CONTENT_PREFIXES must exist');
  assert.match(m[1], /'\/guides\/'/, 'guides is the prefix the sitemap advertises');
  assert.match(m[1], /'\/studio\/'/, 'studio island misses must 404, not SPA');
  assert.match(m[1], /'\/suika\/'/, 'suika island misses must 404, not SPA');

  // The guard has to run BEFORE the sendFile, or it never fires.
  const guard = SRC.indexOf('CONTENT_PREFIXES.some');
  const fallback = SRC.lastIndexOf("res.sendFile(path.join(config.frontendDir, 'index.html'))");
  assert.ok(guard > 0 && fallback > guard, 'the 404 guard must precede the SPA fallback');
});

test('bare /studio/ and /suika/ are routed to island indexes when built, else hard 404', () => {
  // express.static index:false — without these routes, bare paths SPA-fall through.
  assert.match(SRC, /app\.get\(\['\/studio', '\/studio\/'\]/);
  assert.match(SRC, /'studio', 'index\.html'/);
  assert.match(SRC, /app\.get\(\['\/suika', '\/suika\/'\]/);
  assert.match(SRC, /'suika', 'index\.html'/);
  const route = SRC.indexOf("app.get(['/suika', '/suika/']");
  // A comment earlier mentions app.get('*') — match the real catch-all handler.
  const catchAll = SRC.indexOf("app.get('*', (req, res)");
  assert.ok(route > 0 && catchAll > route, 'suika index route must precede the SPA catch-all');
});

test('every guide the sitemap advertises actually exists, or we 404 our own listed URLs', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'frontend', 'sitemap.xml'), 'utf8');
  const listed = [...sitemap.matchAll(/<loc>[^<]*?(\/guides\/[^<]+)<\/loc>/g)].map((x) => x[1]);
  assert.ok(listed.length > 0, 'the sitemap lists guides');
  for (const url of listed) {
    const file = path.join(ROOT, 'frontend', url.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), `sitemap lists ${url} but ${file} is not there`);
  }
});

test('the 404 body is noindex, so a crawler cannot bank it as a page', () => {
  assert.match(SRC, /const NOT_FOUND_PAGE =/);
  assert.match(SRC, /noindex/, 'a 404 body that omits noindex can still be indexed on a soft serve');
  assert.match(SRC, /Page not found/);
});
