import './Header.scss';

import { MutateGraphsAndRecord } from '@suika/core';
import { type FC, useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { Button } from '@/components/ui/button';

import { EditorContext } from '../../context';
import {
  getHeraldSession,
  HeraldPageEmptyError,
  saveAllHeraldPages,
  saveToHerald,
} from '../../herald/bridge';
import {
  applyHeraldAuthoringMode,
  useHeraldAuthoringMode,
} from '../../herald/mode';
import { publishWorkspaceTemplate } from '../../herald/workspace-templates';
import { type MessageIds } from '../../locale';
import { LocaleSelector } from '../LocaleSelector';
import { ZoomActions } from '../ZoomActions';
import Title from './components/Title';
import { ToolBar } from './components/Toolbar';

interface IProps {
  title: string;
  heraldMode?: boolean;
  safeZone?: boolean;
  onToggleSafeZone?: () => void;
  epaper?: boolean;
  onClearCanvas: () => void;
}

export const Header: FC<IProps> = ({
  title,
  heraldMode = false,
  safeZone = true,
  onToggleSafeZone,
  epaper = false,
  onClearCanvas,
}) => {
  const intl = useIntl();
  const editor = useContext(EditorContext);
  const authoring = useHeraldAuthoringMode();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectionTick, setSelectionTick] = useState(0);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const t = (id: MessageIds) => intl.formatMessage({ id });

  useEffect(() => {
    if (!editor) return;
    const onItems = () => setSelectionTick((n) => n + 1);
    editor.selectedElements.on('itemsChange', onItems);
    const onPages = () => {
      const n = editor.doc.graphicsStoreManager
        .getCanvasItems()
        .filter((canvas) => !canvas.isDeleted()).length;
      setPageCount(n);
    };
    onPages();
    editor.sceneGraph.on('render', onPages);
    return () => {
      editor.selectedElements.off('itemsChange', onItems);
      editor.sceneGraph.off('render', onPages);
    };
  }, [editor]);

  const lockable =
    editor && selectionTick >= 0
      ? editor.selectedElements
          .getItems()
          .filter((item) => item.type !== 'Document' && item.type !== 'Canvas')
      : [];
  const anyUnlocked = lockable.some((item) => !item.attrs.heraldLock);

  const onToggleLock = () => {
    if (!editor || authoring !== 'design' || lockable.length === 0) return;
    MutateGraphsAndRecord.setHeraldLock(editor, lockable, anyUnlocked);
    editor.render();
  };

  const onSaveTemplate = async () => {
    if (!editor || busy || authoring !== 'design') return;
    setBusy(true);
    try {
      await publishWorkspaceTemplate(editor, templateName);
      setTemplateOpen(false);
      setTemplateName('');
      setStatus(t('herald.templateSaved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg || t('herald.templateSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onSaveAll = async () => {
    if (!editor || busy) return;
    setBusy(true);
    setStatus(t('herald.saving'));
    try {
      const result = await saveAllHeraldPages(editor);
      setStatus(
        intl.formatMessage(
          { id: 'herald.savedPages' },
          { n: result.pageCount },
        ),
      );
    } catch (e) {
      if (e instanceof HeraldPageEmptyError) {
        setStatus(
          intl.formatMessage({ id: 'herald.pageEmpty' }, { name: e.pageName }),
        );
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!editor || busy) return;
    setBusy(true);
    setStatus(t('herald.saving'));
    try {
      const result = await saveToHerald(editor);
      setStatus(result.draft ? t('herald.savedDraft') : t('herald.saved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sk-header">
      <ToolBar onClearCanvas={onClearCanvas} />
      {heraldMode ? (
        <div className="suika-header-title suika-header-title--herald">
          {t('herald.title')}
        </div>
      ) : (
        <Title value={title} />
      )}
      <div className="sk-right-area">
        {heraldMode && (
          <>
            <div className="sk-herald-modes">
              <Button
                type="button"
                size="sm"
                variant={authoring === 'design' ? 'default' : 'outline'}
                aria-pressed={authoring === 'design'}
                disabled={!editor}
                onClick={() =>
                  editor && applyHeraldAuthoringMode(editor, 'design')
                }
              >
                {t('herald.modeDesign')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authoring === 'fill' ? 'default' : 'outline'}
                aria-pressed={authoring === 'fill'}
                disabled={!editor}
                onClick={() =>
                  editor && applyHeraldAuthoringMode(editor, 'fill')
                }
              >
                {t('herald.modeFill')}
              </Button>
            </div>
            {authoring === 'design' && lockable.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onToggleLock}
              >
                {anyUnlocked
                  ? t('herald.lockForFill')
                  : t('herald.unlockForFill')}
              </Button>
            )}
            {authoring === 'design' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!editor || busy}
                onClick={() => setTemplateOpen(true)}
              >
                {t('herald.saveAsTemplate')}
              </Button>
            )}
            <label className="sk-herald-safezone">
              <input
                type="checkbox"
                checked={safeZone}
                onChange={() => onToggleSafeZone?.()}
              />
              {t('herald.safeZone')}
            </label>
            {epaper && (
              <span className="sk-herald-epaper" title={t('herald.epaperHint')}>
                {t('herald.epaperHint')}
              </span>
            )}
            {status && (
              <span className="sk-herald-status" title={status}>
                {status}
              </span>
            )}
            {pageCount > 1 && !getHeraldSession()?.query.forSlideBg && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!editor || busy}
                onClick={() => void onSaveAll()}
              >
                {t('herald.saveAllPages')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!editor || busy}
              onClick={() => void onSave()}
              className="sk-herald-save-btn"
            >
              {busy ? t('herald.saving') : t('herald.saveToHerald')}
            </Button>
          </>
        )}
        <LocaleSelector />
        <ZoomActions />
      </div>
      {templateOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="herald-template-name-label"
            className="w-full max-w-sm rounded-lg border bg-background p-4 text-foreground"
            onSubmit={(event) => {
              event.preventDefault();
              void onSaveTemplate();
            }}
          >
            <label
              id="herald-template-name-label"
              className="block text-sm font-medium"
              htmlFor="herald-template-name"
            >
              {t('herald.templateName')}
            </label>
            <input
              id="herald-template-name"
              value={templateName}
              maxLength={80}
              onChange={(event) => setTemplateName(event.target.value)}
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTemplateOpen(false)}
              >
                {t('herald.templateCancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={busy || !templateName.trim()}
              >
                {t('herald.templateSave')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
