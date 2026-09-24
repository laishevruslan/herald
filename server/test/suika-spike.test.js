'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const HAS_SUIKA_SOURCES = fs.existsSync(path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika'));

test('suika island is MIT and pins standalone @suika/suika (not multiplayer stack)', { skip: !HAS_SUIKA_SOURCES }, () => {
  const lic = fs.readFileSync(path.join(ROOT, 'frontend-studio_v3', 'LICENSE'), 'utf8');
  assert.match(lic, /MIT License/);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika', 'package.json'), 'utf8'),
  );
  assert.equal(pkg.name, '@suika/suika');
  assert.equal(pkg.private, true);
  const rootPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'frontend-studio_v3', 'package.json'), 'utf8'),
  );
  assert.equal(rootPkg.license, 'MIT');
  assert.match(rootPkg.scripts['app:build'] || '', /@suika\/suika/);
});

test('demo .suika papers match current editor appVersion', { skip: !HAS_SUIKA_SOURCES }, () => {
  const editorSrc = fs.readFileSync(
    path.join(ROOT, 'frontend-studio_v3', 'packages', 'core', 'src', 'editor.ts'),
    'utf8',
  );
  assert.match(editorSrc, /appVersion = 'suika-editor_0\.0\.3'/);
  const demoDir = path.join(ROOT, 'frontend-studio_v3', 'demo');
  if (!fs.existsSync(demoDir)) return;
  for (const name of fs.readdirSync(demoDir).filter((f) => f.endsWith('.suika'))) {
    const paper = JSON.parse(fs.readFileSync(path.join(demoDir, name), 'utf8'));
    assert.equal(
      paper.appVersion,
      'suika-editor_0.0.3',
      `${name} appVersion must match SuikaEditor.appVersion`,
    );
    assert.ok(Array.isArray(paper.data) && paper.data.length > 0, `${name} has graphics`);
  }
});

test('spike fixture is 1920×1080 and matches appVersion', { skip: !HAS_SUIKA_SOURCES }, () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika', 'src', 'spike', 'herald-spike-paper.ts'),
    'utf8',
  );
  assert.match(src, /suika-editor_0\.0\.3/);
  assert.match(src, /width: 1920/);
  assert.match(src, /height: 1080/);
  assert.match(src, /Herald Spike/);
});

test('suika-available helper exists for I5 button gating', () => {
  const src = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'lib', 'suika-available.js'), 'utf8');
  assert.match(src, /suikaIslandAvailable/);
  assert.match(src, /\/suika\/index\.html/);
});

test('dashboard i18n has design keys in en and ru (no Suika brand on button)', () => {
  const en = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'en.js'), 'utf8');
  const ru = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'ru.js'), 'utf8');
  for (const key of [
    'design.name',
    'design.new',
    'design.help_blurb',
    'design.unavailable',
    'design.open_editor',
    'design.popup_blocked',
  ]) {
    assert.match(en, new RegExp(`'${key}'`));
    assert.match(ru, new RegExp(`'${key}'`));
  }
  assert.match(ru, /Создать дизайн/);
  assert.match(ru, /Редактор дизайна/);
  assert.doesNotMatch(en, /'design\.new': 'Suika/);
  assert.doesNotMatch(ru, /'design\.new': 'Suika/);
});

test('suika island has Russian locale messages', { skip: !HAS_SUIKA_SOURCES }, () => {
  const idx = fs.readFileSync(
    path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika', 'src', 'locale', 'index.ts'),
    'utf8',
  );
  assert.match(idx, /ru\.json/);
  assert.match(idx, /'ru'/);
  const ru = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika', 'src', 'locale', 'ru.json'),
      'utf8',
    ),
  );
  assert.equal(ru['export.currentPageAsPNG'], 'Экспорт страницы в PNG');
  assert.equal(ru.file, 'Файл');
  assert.equal(ru['herald.saveToHerald'], 'Сохранить в Herald');
});

test('content library Create design opens Suika window (Phase 0)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'views', 'content-library.js'), 'utf8');
  assert.match(src, /openDesignEditorWindow/);
  assert.match(src, /newDesignBtn/);
  assert.match(src, /suikaIslandAvailable/);
  assert.match(src, /mode:\s*'herald'/);
  assert.match(src, /herald:saved/);
  assert.match(src, /onSuikaHeraldMessage/);
  assert.match(src, /herald-suika/);
});

test('Suika herald bridge modules exist (Phase 1)', () => {
  const heraldDir = path.join(ROOT, 'frontend-studio_v3', 'apps', 'suika', 'src', 'herald');
  if (fs.existsSync(heraldDir)) {
    for (const name of ['query.ts', 'presets.ts', 'scene.ts', 'api.ts', 'bridge.ts', 'bootstrap.ts']) {
      assert.ok(fs.existsSync(path.join(heraldDir, name)), name);
    }
    const bridge = fs.readFileSync(path.join(heraldDir, 'bridge.ts'), 'utf8');
    assert.match(bridge, /saveToHerald/);
    assert.match(bridge, /postToOpener/);
    const api = fs.readFileSync(path.join(heraldDir, 'api.ts'), 'utf8');
    assert.match(api, /\/api\/studio\/export/);
    const scene = fs.readFileSync(path.join(heraldDir, 'scene.ts'), 'utf8');
    assert.match(scene, /SUIKA_EDITOR_TAG/);
    return;
  }
  // Production image has only the built island — assert the bridge survived the Vite build.
  const suikaDir = path.join(ROOT, 'frontend', 'suika');
  assert.ok(fs.existsSync(path.join(suikaDir, 'index.html')), 'frontend/suika/index.html');
  const assets = fs.existsSync(path.join(suikaDir, 'assets'))
    ? fs.readdirSync(path.join(suikaDir, 'assets')).filter((f) => f.endsWith('.js'))
    : [];
  assert.ok(assets.length > 0, 'built suika JS assets');
  const blob = assets
    .map((f) => fs.readFileSync(path.join(suikaDir, 'assets', f), 'utf8'))
    .join('\n');
  assert.match(blob, /saveToHerald|herald:saved/);
  const serverLib = fs.readFileSync(path.join(ROOT, 'server', 'lib', 'studio-designs.js'), 'utf8');
  assert.match(serverLib, /detectSceneEditor/);
  assert.match(serverLib, /editor === 'suika'/);
});

test('dashboard i18n has design.saved_toast in en and ru', () => {
  const en = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'en.js'), 'utf8');
  const ru = fs.readFileSync(path.join(ROOT, 'frontend', 'js', 'i18n', 'ru.js'), 'utf8');
  assert.match(en, /'design\.saved_toast'/);
  assert.match(ru, /'design\.saved_toast'/);
  assert.match(ru, /Дизайн сохранён в библиотеку/);
});

test('build-suika scripts and docker spike assets exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'build-suika.sh')));
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'build-suika.ps1')));
  const spikeDir = path.join(ROOT, 'docker', 'suika-spike');
  if (fs.existsSync(spikeDir)) {
    assert.ok(fs.existsSync(path.join(spikeDir, 'Dockerfile')));
    assert.ok(fs.existsSync(path.join(spikeDir, 'docker-compose.yml')));
    assert.ok(fs.existsSync(path.join(spikeDir, 'entrypoint.sh')));
  }
  const dockerfilePath = path.join(ROOT, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    assert.match(dockerfile, /suika-builder/);
    assert.match(dockerfile, /frontend\/suika/);
    assert.match(dockerfile, /SUIKA_BASE=\/suika\//);
  } else {
    // Production image: assert the island built into the runtime tree instead.
    assert.ok(fs.existsSync(path.join(ROOT, 'frontend', 'suika', 'index.html')));
  }
});

test('exportService exposes getCurrentPagePNGBlob for spike/publish', { skip: !HAS_SUIKA_SOURCES }, () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'frontend-studio_v3', 'packages', 'core', 'src', 'service', 'export_service.ts'),
    'utf8',
  );
  assert.match(src, /getCurrentPagePNGBlob/);
});

test('license-check documents frontend-studio_v3 / pnpm root', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'license-check.js'), 'utf8');
  assert.match(src, /frontend-studio_v3/);
  assert.match(src, /pnpm-lock\.yaml/);
});

test('suika CSP admits eval for PathKit without widening dashboard CSP', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server', 'server.js'), 'utf8');
  const suikaStart = server.indexOf('const suikaCsp');
  const dashStart = server.indexOf('const dashboardCsp');
  assert.ok(suikaStart > dashStart, 'suikaCsp follows dashboardCsp');
  assert.match(server, /startsWith\(['"]\/suika['"]\)/);
  assert.match(server, /return suikaCsp\(/);
  const suikaEnd = server.indexOf('app.use(helmet(', suikaStart);
  const suikaScript = server
    .slice(suikaStart, suikaEnd > suikaStart ? suikaEnd : suikaStart + 1500)
    .match(/scriptSrc:\s*\[[^\]]+\]/);
  assert.ok(suikaScript, 'suikaCsp must declare scriptSrc');
  assert.match(suikaScript[0], /'unsafe-eval'/);
  assert.match(suikaScript[0], /'wasm-unsafe-eval'/);
  assert.match(
    server.slice(suikaStart, suikaEnd > suikaStart ? suikaEnd : suikaStart + 1500),
    /workerSrc:\s*\["'self'",\s*'blob:'\]/,
  );
  const dashScript = server.slice(dashStart, suikaStart).match(/scriptSrc:\s*\[[^\]]+\]/);
  assert.ok(dashScript, 'dashboardCsp must declare scriptSrc');
  assert.doesNotMatch(dashScript[0], /'unsafe-eval'/);
});
