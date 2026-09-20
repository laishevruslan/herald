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
    'studio.slide_bg_from_studio',
    'studio.slide_bg_applied',
  ]) {
    assert.match(en, new RegExp(`'${key}'`));
    assert.match(ru, new RegExp(`'${key}'`));
  }
  assert.match(ru, /Редактор постеров/);
  assert.match(ru, /Фон из Studio/);
  assert.doesNotMatch(en, /Scenify/);
  assert.doesNotMatch(ru, /Scenify/);
});

test('license-check accepts --root for the studio island', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'license-check.js'), 'utf8');
  assert.match(src, /--root/);
  assert.match(src, /frontend-studio/);
});

test('studio 6.1/6.2/6.3 docker assets and Layerhub Editor modules exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'docker', 'studio-6.1', 'Dockerfile')));
  assert.ok(fs.existsSync(path.join(ROOT, 'docker', 'studio-6.2', 'Dockerfile')));
  assert.ok(fs.existsSync(path.join(ROOT, 'docker', 'studio-6.3', 'Dockerfile')));
  assert.ok(fs.existsSync(path.join(ROOT, 'server', 'routes', 'studio.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'server', 'lib', 'studio-designs.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'src', 'fontCatalogue.ts')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'src', 'brand.ts')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'src', 'fonts.css')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'src', 'App.tsx')));
  assert.ok(fs.existsSync(path.join(ROOT, 'frontend-studio', 'src', 'components', 'EditorStage.tsx')));
  const main = fs.readFileSync(path.join(ROOT, 'frontend-studio', 'src', 'main.tsx'), 'utf8');
  assert.match(main, /@layerhub-io\/react/);
  assert.match(main, /LayerhubProvider|Provider/);
});
