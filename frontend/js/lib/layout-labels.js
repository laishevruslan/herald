// Translate seeded layout / zone template names. Custom user-named layouts
// pass through unchanged — only the known English seed labels are mapped.
import { t } from '../i18n.js';

const LAYOUT_KEYS = {
  'Fullscreen': 'layout.tpl.fullscreen',
  'Split Horizontal': 'layout.tpl.split_h',
  'Split Vertical': 'layout.tpl.split_v',
  'L-Bar with Ticker': 'layout.tpl.l_bar',
  'Picture in Picture': 'layout.tpl.pip',
  'Three Column': 'layout.tpl.thirds',
  'Four Quadrants': 'layout.tpl.quad',
  'Portrait Fullscreen': 'layout.tpl.p_full',
  'Portrait Split': 'layout.tpl.p_split',
  'Portrait with Ticker': 'layout.tpl.p_ticker',
  'Portrait Banner + Body': 'layout.tpl.p_banner',
  'Portrait Three Stacked': 'layout.tpl.p_thirds',
  'Portrait Picture in Picture': 'layout.tpl.p_pip',
};

const ZONE_KEYS = {
  'Main': 'layout.zone.main',
  'Left': 'layout.zone.left',
  'Right': 'layout.zone.right',
  'Top': 'layout.zone.top',
  'Bottom': 'layout.zone.bottom',
  'Center': 'layout.zone.center',
  'Main Content': 'layout.zone.main_content',
  'Side Panel': 'layout.zone.side_panel',
  'Bottom Ticker': 'layout.zone.bottom_ticker',
  'Background': 'layout.zone.background',
  'PiP Window': 'layout.zone.pip_window',
  'Top Left': 'layout.zone.top_left',
  'Top Right': 'layout.zone.top_right',
  'Bottom Left': 'layout.zone.bottom_left',
  'Bottom Right': 'layout.zone.bottom_right',
  'Top Banner': 'layout.zone.top_banner',
  'Body': 'layout.zone.body',
  'Middle': 'layout.zone.middle',
};

export function layoutLabel(name) {
  if (!name) return '';
  const key = LAYOUT_KEYS[name];
  return key ? t(key) : name;
}

export function zoneLabel(name) {
  if (!name) return '';
  const key = ZONE_KEYS[name];
  return key ? t(key) : name;
}
