'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

test('studio island package pins Layerhub MIT packages, not @scenify/sdk', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend-studio', 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@layerhub-io/react'], '0.3.3');
  assert.equal(pkg.dependencies['@layerhub-io/core'], '0.3.3');
  assert.equal(pkg.dependencies.fabric, '5.3.0');
  const blob = JSON.stringify(pkg);
  assert.doesNotMatch(blob, /@scenify\/sdk/);
  assert.doesNotMatch(blob, /umanda\/scenify/);
  assert.doesNotMatch(blob, /gsap/);
  assert.doesNotMatch(blob, /gifshot/);
});

test('studio-available helper exists for I5 button gating', () => {
  const src = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'lib', 'studio-available.js'), 'utf8');
  assert.match(src, /studioIslandAvailable/);
  assert.match(src, /\/studio\/index\.html/);
});

test('dashboard i18n has studio keys in en and ru', () => {
  const en = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'en.js'), 'utf8');
  const ru = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'ru.js'), 'utf8');
  for (const key of [
    'studio.name',
    'studio.new_poster',
    'studio.edit_poster',
    'studio.help_blurb',
    'studio.cyrillic_note',
    'studio.unavailable',
  ]) {
    assert.match(en, new RegExp(`'${key}'`));
    assert.match(ru, new RegExp(`'${key}'`));
  }
  assert.match(ru, /Редактор постеров/);
  assert.doesNotMatch(en, /Scenify/);
  assert.doesNotMatch(ru, /Scenify/);
});

test('license-check accepts --root for the studio island', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'license-check.js'), 'utf8');
  assert.match(src, /--root/);
  assert.match(src, /frontend-studio/);
});

test('studio spike docker assets exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'docker', 'studio-spike', 'Dockerfile')));
  assert.ok(fs.existsSync(path.join(ROOT, 'docker', 'studio-spike', 'docker-compose.yml')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'LICENSE-AUDIT.md')));
});
