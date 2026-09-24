import './Editor.scss';

import { pick, throttle } from '@suika/common';
import {
  fontManager,
  initPathKit,
  PathTool,
  type SettingValue,
  SuikaEditor,
} from '@suika/core';
import { type FC, useEffect, useRef, useState } from 'react';

import { FONT_FILES } from '@/constant';

import { EditorContext } from '../context';
import { bootstrapHerald } from '../herald/bootstrap';
import { parseHeraldQuery } from '../herald/query';
import { isSpikeExportMode, runSpikeExport } from '../spike/run-spike-export';
import { AutoSaveGraphics } from '../store/auto-save-graphs';
import { ClearCanvasDialog } from './ClearCanvasDialog';
import { ContextMenu } from './ContextMenu';
import { Header } from './Header';
import { InfoPanel } from './InfoPanel';
import { LayerPanel } from './LayerPanel';
import { Pages } from './Pages';
import { ProgressOverlay } from './ProgressOverlay';

const topMargin = 48;
const leftRightMargin = 240 * 2;
const clearCanvasHintDelay = 20000;

const USER_PREFERENCE_KEY = 'suika-user-preference';
const storeKeys: Partial<keyof SettingValue>[] = [
  'enablePixelGrid',
  'snapToGrid',
  'enableRuler',

  'keepToolSelectedAfterUse',
  'invertZoomDirection',
  'highlightLayersOnHover',
  'flipObjectsWhileResizing',
  'snapToObjects',
  'smallNudge',
  'bigNudge',
];

const Editor: FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [suikaEditor, setEditor] = useState<SuikaEditor | null>(null);

  const [progress, setProgress] = useState(0);
  const [clearCanvasOpen, setClearCanvasOpen] = useState(false);
  const heraldQuery = parseHeraldQuery();
  const heraldMode = heraldQuery.mode === 'herald';

  useEffect(() => {
    if (containerRef.current) {
      const userPreferenceEncoded = localStorage.getItem(USER_PREFERENCE_KEY);
      const userPreference = userPreferenceEncoded
        ? (JSON.parse(userPreferenceEncoded) as Partial<SettingValue>)
        : undefined;

      const editorReference: { value: SuikaEditor | null } = {
        value: null,
      };

      let isCanceled = false;

      const changeViewport = throttle(
        () => {
          const editor = editorReference.value;
          if (!editor) return;
          editor.viewportManager.setViewportSize({
            width: document.body.clientWidth - leftRightMargin,
            height: document.body.clientHeight - topMargin,
          });
          editor.render();
        },
        10,
        { leading: false },
      );

      (async () => {
        await fontManager.loadFonts(FONT_FILES);

        const pathTool = new PathTool(await initPathKit());

        setProgress(100);
        if (isCanceled) return;

        const editor = new SuikaEditor({
          containerElement: containerRef.current!,
          width: document.body.clientWidth - leftRightMargin,
          height: document.body.clientHeight - topMargin,
          offsetY: 48,
          offsetX: 240,
          showPerfMonitor: false,
          userPreference: userPreference,
          pathTool,
        });
        editorReference.value = editor;

        editor.setting.on(
          'update',
          (value: SettingValue, changedKey: keyof SettingValue) => {
            if (!storeKeys.includes(changedKey)) return;

            localStorage.setItem(
              USER_PREFERENCE_KEY,
              JSON.stringify(pick(value, storeKeys)),
            );
          },
        );

        (window as any).editor = editor;

        const spike = isSpikeExportMode();
        const herald = parseHeraldQuery();
        if (spike) {
          // Spike skips shared localStorage so PNG verify is deterministic.
          void runSpikeExport(editor);
        } else if (herald.mode === 'herald') {
          await bootstrapHerald(editor, herald);
          if (isCanceled) {
            editor.destroy();
            return;
          }
        } else {
          new AutoSaveGraphics(editor);
        }

        window.addEventListener('resize', changeViewport);

        setEditor(editor);
      })();

      return () => {
        isCanceled = true;

        editorReference.value?.destroy();
        window.removeEventListener('resize', changeViewport);
        changeViewport.cancel();
      };
    }
  }, [containerRef]);

  return (
    <div>
      <ProgressOverlay
        value={progress}
        clearCanvasHintDelay={clearCanvasHintDelay}
        onClearCanvas={() => setClearCanvasOpen(true)}
      />
      <EditorContext.Provider value={suikaEditor}>
        <Header
          title={heraldMode ? 'herald' : 'suika'}
          heraldMode={heraldMode}
          onClearCanvas={() => setClearCanvasOpen(true)}
        />
        {/* body */}
        <div className="body">
          <div className="suika-editor-left-area">
            <Pages />
            <LayerPanel />
          </div>{' '}
          <div
            ref={containerRef}
            style={{ position: 'absolute', left: 240, top: 0 }}
          />
          <InfoPanel />
          <ContextMenu />
        </div>
      </EditorContext.Provider>
      <ClearCanvasDialog
        open={clearCanvasOpen}
        onOpenChange={setClearCanvasOpen}
      />
    </div>
  );
};

export default Editor;
