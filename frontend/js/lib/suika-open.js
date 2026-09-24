/**
 * Open Suika herald-mode editor (Library Create/Edit + Slides slide-bg).
 * Variant A: same-origin /suika/. Variant B: window.__SUIKA_ORIGIN + herald:init.
 */
import { showToast } from '../components/toast.js';
import { t } from '../i18n.js';
import {
  buildSuikaEditorUrl,
  getSuikaOrigin,
  getSuikaPostMessageTarget,
} from './suika-origin.js';

function readHeraldAuthForInit() {
  const token = localStorage.getItem('token') || '';
  let workspaceId = localStorage.getItem('workspaceId') || '';
  if (!workspaceId) {
    try {
      workspaceId =
        JSON.parse(localStorage.getItem('user') || 'null')?.current_workspace_id ||
        '';
    } catch {
      workspaceId = '';
    }
  }
  return { token, workspaceId: workspaceId ? String(workspaceId) : '' };
}

export function sendHeraldInit(targetWindow, extra = {}) {
  if (!targetWindow || targetWindow.closed) return;
  const { token, workspaceId } = readHeraldAuthForInit();
  const targetOrigin = getSuikaPostMessageTarget();
  const msg = {
    source: 'herald',
    type: 'herald:init',
    ...(token ? { token } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...extra,
  };
  try {
    targetWindow.postMessage(msg, targetOrigin);
  } catch {
    /* cross-origin may refuse before load */
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.preset]
 * @param {string} [opts.contentId]
 * @param {boolean} [opts.forSlideBg]
 * @param {boolean} [opts.sameTab] force same-tab navigation (no popup)
 * @returns {Window|null}
 */
export function openDesignEditorWindow(opts = {}) {
  const lang = (localStorage.getItem('rd_lang') || 'en').slice(0, 2);
  const preset = opts.preset || 'landscape-1080';
  const params = new URLSearchParams({
    mode: 'herald',
    preset,
    lang,
  });
  if (opts.contentId) params.set('contentId', opts.contentId);
  if (opts.forSlideBg) params.set('for', 'slide-bg');
  const url = buildSuikaEditorUrl(params);

  if (opts.sameTab) {
    window.location.href = url;
    return null;
  }

  const win = window.open(url, 'herald-suika');
  if (!win) {
    showToast(t('design.popup_blocked'), 'info');
    window.location.href = url;
    return null;
  }
  try {
    win.focus();
  } catch {
    /* ignore */
  }
  return win;
}

/**
 * Message listener for Library (and optional hosts). Handles suika:ready → herald:init
 * when Dev Variant B is active, plus herald:saved / herald:error.
 *
 * @param {(contentId: string) => void} onSaved
 * @returns {(event: MessageEvent) => void}
 */
export function createSuikaHeraldMessageHandler(onSaved) {
  return function onSuikaHeraldMessage(event) {
    const expected = getSuikaPostMessageTarget();
    if (event.origin !== expected) return;
    const data = event.data;
    if (!data || data.source !== 'suika') return;

    if (data.type === 'suika:ready') {
      if (getSuikaOrigin() && event.source && event.source !== window) {
        sendHeraldInit(event.source, {
          ...(data.designId ? { contentId: data.designId } : {}),
        });
      }
      return;
    }

    if (data.type === 'herald:saved' && data.contentId) {
      onSaved(data.contentId);
      return;
    }
    if (data.type === 'herald:error' && data.message) {
      showToast(data.message, 'error');
    }
  };
}
