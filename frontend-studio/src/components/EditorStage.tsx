import { useEffect, useRef } from 'react';
import { Canvas, useEditor } from '@layerhub-io/react';
import {
  buildTemplateFromScene,
  seedDefaultObjects,
  upgradeLegacyObjects,
} from '../scene';
import { loadDesign } from '../api';
import { waitForStudioFonts } from '../fontCatalogue';
import { PRESETS, type PresetId } from '../exportPng';
import { t, type StudioLang } from '../i18n';

type Status = { kind: 'ok' | 'err' | 'info'; text: string };

type Props = {
  preset: PresetId;
  contentId: string | null;
  lang: StudioLang;
  onStatus: (s: Status) => void;
};

/**
 * Layerhub Canvas + one-shot bootstrap (fonts → frame → import scene → zoomToFit).
 * Remount via key= when preset/contentId changes (Canvas init is empty-deps).
 */
export function EditorStage({ preset, contentId, lang, onStatus }: Props) {
  const logical = PRESETS[preset];

  return (
    <div className="stage layerhub-stage">
      <Canvas
        config={{
          clipToFrame: true,
          shortcuts: true,
          guidelines: true,
          type: 'GRAPHIC',
          background: '#1a1d23',
          frameMargin: 40,
          size: { width: 800, height: 600 },
        }}
      />
      <Bootstrap
        logicalW={logical.width}
        logicalH={logical.height}
        contentId={contentId}
        lang={lang}
        onStatus={onStatus}
      />
    </div>
  );
}

function Bootstrap({
  logicalW,
  logicalH,
  contentId,
  lang,
  onStatus,
}: {
  logicalW: number;
  logicalH: number;
  contentId: string | null;
  lang: StudioLang;
  onStatus: (s: Status) => void;
}) {
  const editor = useEditor();
  const done = useRef(false);

  useEffect(() => {
    done.current = false;
  }, [editor, logicalW, logicalH, contentId]);

  useEffect(() => {
    if (!editor || done.current) return;
    let alive = true;
    (async () => {
      try {
        onStatus({ kind: 'info', text: t(lang, 'fontWait') });
        await waitForStudioFonts();
        if (!alive) return;
        editor.frame.resize({ width: logicalW, height: logicalH });

        if (contentId) {
          const design = await loadDesign(contentId);
          if (!alive) return;
          const raw = design.scene_json || {};
          const version = Number((raw as { version?: number }).version) || 1;
          const objects = upgradeLegacyObjects(
            (raw as { objects?: Parameters<typeof upgradeLegacyObjects>[0] }).objects || [],
            design.width || logicalW,
            design.height || logicalH,
            version,
          );
          const template = await buildTemplateFromScene(objects, logicalW, logicalH);
          await editor.scene.importFromJSON(template);
          onStatus({
            kind: 'ok',
            text: t(lang, 'readyEdit', { w: design.width, h: design.height }),
          });
        } else {
          const template = await buildTemplateFromScene(
            seedDefaultObjects(logicalW, logicalH),
            logicalW,
            logicalH,
          );
          await editor.scene.importFromJSON(template);
          onStatus({
            kind: 'ok',
            text: t(lang, 'ready', { w: logicalW, h: logicalH }),
          });
        }
        editor.zoom.zoomToFit();
        done.current = true;
      } catch (e) {
        if (!alive) return;
        onStatus({
          kind: 'err',
          text: e instanceof Error ? e.message : t(lang, 'fontFail'),
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [editor, logicalW, logicalH, contentId, lang, onStatus]);

  return null;
}
