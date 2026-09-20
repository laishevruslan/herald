import { useEditor, useContextMenuRequest } from '@layerhub-io/react';
import { t, type StudioLang } from '../i18n';

type MenuReq = {
  left: number;
  top: number;
  target?: unknown;
} | null;

export function ContextMenu({ lang }: { lang: StudioLang }) {
  const editor = useEditor();
  const req = useContextMenuRequest() as MenuReq;
  if (!req || !editor) return null;

  const close = () => editor.cancelContextMenuRequest();
  const run = (fn: () => void) => {
    fn();
    close();
  };

  return (
    <div
      className="ctx-menu"
      style={{ left: req.left, top: req.top }}
      role="menu"
      onMouseLeave={close}
    >
      <button type="button" role="menuitem" onClick={() => run(() => editor.objects.copy())}>
        {t(lang, 'ctxCopy')}
      </button>
      <button type="button" role="menuitem" onClick={() => run(() => editor.objects.paste())}>
        {t(lang, 'ctxPaste')}
      </button>
      <button type="button" role="menuitem" onClick={() => run(() => editor.objects.clone())}>
        {t(lang, 'ctxDuplicate')}
      </button>
      <button type="button" role="menuitem" onClick={() => run(() => editor.objects.bringForward())}>
        {t(lang, 'ctxForward')}
      </button>
      <button type="button" role="menuitem" onClick={() => run(() => editor.objects.sendBackwards())}>
        {t(lang, 'ctxBackward')}
      </button>
      <button type="button" role="menuitem" className="danger" onClick={() => run(() => editor.objects.remove())}>
        {t(lang, 'ctxDelete')}
      </button>
    </div>
  );
}
