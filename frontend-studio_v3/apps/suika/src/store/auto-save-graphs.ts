import { debounce } from '@suika/common';
import { type IEditorPaperData, type SuikaEditor } from '@suika/core';

import { dataCompatibilityV3 } from './data-compatibility-v3';

const DEFAULT_STORE_KEY = 'suika-paper';

export type AutoSaveOptions = {
  /** When true, do not restore from localStorage (server load already applied). */
  skipLoad?: boolean;
};

export class AutoSaveGraphics {
  private storeKey: string;
  private restoredFromStore = false;

  constructor(
    private editor: SuikaEditor,
    storeKey: string = DEFAULT_STORE_KEY,
    opts: AutoSaveOptions = {},
  ) {
    this.storeKey = storeKey;
    if (!opts.skipLoad) {
      let data = this.load();
      if (data) {
        if (data.appVersion !== editor.appVersion) {
          if (data.appVersion === 'suika-editor_0.0.2') {
            data = dataCompatibilityV3(data);
            editor.setContents(data);
            this.restoredFromStore = true;
          } else {
            window.alert(
              '编辑器版本和图纸版本不兼容，将清空本地缓存 (version not match, to clear data)',
            );
            data = null;
          }
        } else {
          editor.setContents(data);
          this.restoredFromStore = true;
        }
      }
    }

    this.autoSave();
    this.editor.on('destroy', () => this.stopAutoSave());
  }

  /** True when constructor restored paper from localStorage. */
  hadStoredData(): boolean {
    return this.restoredFromStore;
  }

  private listener = debounce(() => {
    this.save();
  }, 10);

  autoSave() {
    this.editor.commandManager.on('change', this.listener);
  }
  stopAutoSave() {
    this.editor.commandManager.off('change', this.listener);
  }
  save() {
    localStorage.setItem(this.storeKey, this.editor.sceneGraph.toJSON());
  }
  clear() {
    localStorage.removeItem(this.storeKey);
  }
  load() {
    const dataStr = localStorage.getItem(this.storeKey);
    if (!dataStr) return null;
    const data = JSON.parse(dataStr) as IEditorPaperData;
    return data;
  }
}
