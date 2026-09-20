import { t } from '../i18n.js';

export function render(container) {
  const guides = [
    { icon: '&#128250;', title: 'help.guide.setup.title', steps: ['help.guide.setup.s1', 'help.guide.setup.s2', 'help.guide.setup.s3', 'help.guide.setup.s4', 'help.guide.setup.s5'] },
    { icon: '&#128228;', title: 'help.guide.upload.title', steps: ['help.guide.upload.s1', 'help.guide.upload.s2', 'help.guide.upload.s3', 'help.guide.upload.s4', 'help.guide.upload.s5'] },
    { icon: '&#9881;', title: 'help.guide.widgets.title', steps: ['help.guide.widgets.s1', 'help.guide.widgets.s2', 'help.guide.widgets.s3', 'help.guide.widgets.s4', 'help.guide.widgets.s5'] },
    { icon: '&#10024;', title: 'help.guide.ai.title', steps: ['help.guide.ai.s1', 'help.guide.ai.s2', 'help.guide.ai.s3', 'help.guide.ai.s4', 'help.guide.ai.s5'] },
    { icon: '&#128203;', title: 'help.guide.layouts.title', steps: ['help.guide.layouts.s1', 'help.guide.layouts.s2', 'help.guide.layouts.s3', 'help.guide.layouts.s4', 'help.guide.layouts.s5'] },
    { icon: '&#128197;', title: 'help.guide.schedule.title', steps: ['help.guide.schedule.s1', 'help.guide.schedule.s2', 'help.guide.schedule.s3', 'help.guide.schedule.s4', 'help.guide.schedule.s5'] },
    { icon: '&#128421;', title: 'help.guide.remote.title', steps: ['help.guide.remote.s1', 'help.guide.remote.s2', 'help.guide.remote.s3', 'help.guide.remote.s4', 'help.guide.remote.s5'] },
    { icon: '&#128433;', title: 'help.guide.kiosk.title', steps: ['help.guide.kiosk.s1', 'help.guide.kiosk.s2', 'help.guide.kiosk.s3', 'help.guide.kiosk.s4', 'help.guide.kiosk.s5'] },
    { icon: '&#127916;', title: 'help.guide.walls.title', steps: ['help.guide.walls.s1', 'help.guide.walls.s2', 'help.guide.walls.s3', 'help.guide.walls.s4', 'help.guide.walls.s5', 'help.guide.walls.s6'] },
  ];
  const faqs = [
    'devices', 'trial', 'portrait', 'offline', 'selfhost', 'update',
    'formats', 'whitelabel', 'reports', 'wall', 'wall_portrait',
  ];

  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t('help.title')}</h1><div class="subtitle">${t('help.subtitle')}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:32px">
      ${guides.map((guide) => `
        <div class="settings-section" style="margin:0">
          <h3 style="font-size:15px">${guide.icon} ${t(guide.title)}</h3>
          <ol style="padding-left:20px;list-style:decimal;margin-top:8px">
            ${guide.steps.map((s) => `<li style="color:var(--text-secondary);font-size:13px;line-height:1.8">${t(s)}</li>`).join('')}
          </ol>
        </div>
      `).join('')}
    </div>

    <div class="settings-section">
      <h3>${t('help.faq')}</h3>
      ${faqs.map((id) => `
        <div style="border-bottom:1px solid var(--border);padding:12px 0">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${t(`help.faq.${id}.q`)}</div>
          <div style="color:var(--text-secondary);font-size:13px">${t(`help.faq.${id}.a`)}</div>
        </div>
      `).join('')}
    </div>

    <div class="settings-section">
      <h3>${t('help.shortcuts')}</h3>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px">
        <kbd style="background:var(--bg-input);padding:2px 8px;border-radius:4px;font-family:monospace">Esc</kbd> <span style="color:var(--text-secondary)">${t('help.shortcut_esc')}</span>
        <kbd style="background:var(--bg-input);padding:2px 8px;border-radius:4px;font-family:monospace">F</kbd> <span style="color:var(--text-secondary)">${t('help.shortcut_f')}</span>
      </div>
    </div>
  `;
}

export function cleanup() {}
