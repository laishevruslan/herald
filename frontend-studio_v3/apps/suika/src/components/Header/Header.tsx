import './Header.scss';

import { type FC, useContext, useState } from 'react';
import { useIntl } from 'react-intl';

import { Button } from '@/components/ui/button';

import { EditorContext } from '../../context';
import { saveToHerald } from '../../herald/bridge';
import { type MessageIds } from '../../locale';
import { LocaleSelector } from '../LocaleSelector';
import { ZoomActions } from '../ZoomActions';
import Title from './components/Title';
import { ToolBar } from './components/Toolbar';

interface IProps {
  title: string;
  heraldMode?: boolean;
  onClearCanvas: () => void;
}

export const Header: FC<IProps> = ({
  title,
  heraldMode = false,
  onClearCanvas,
}) => {
  const intl = useIntl();
  const editor = useContext(EditorContext);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const t = (id: MessageIds) => intl.formatMessage({ id });

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
            {status && (
              <span className="sk-herald-status" title={status}>
                {status}
              </span>
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
    </div>
  );
};
