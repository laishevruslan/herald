import { type FC, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  deleteWorkspaceTemplate,
  fetchWorkspaceTemplateThumb,
  listWorkspaceTemplates,
} from '../../herald/api';
import {
  isTemplateChoicePending,
  settleTemplateChoice,
} from '../../herald/gallery-request';
import { PRESET_SIZE } from '../../herald/presets';
import {
  type HeraldPresetId,
  isHeraldPresetId,
  parseHeraldQuery,
} from '../../herald/query';
import {
  type HeraldTemplateEntry,
  loadTemplateCatalog,
  loadTemplatePaper,
  matchesTemplateFilter,
  tagsForPreset,
  templateAssetUrl,
  type TemplateFilter,
} from '../../herald/templates';
import {
  dropWorkspaceTemplateCache,
  loadWorkspaceTemplatePaper,
} from '../../herald/workspace-templates';
import { type MessageIds } from '../../locale';

type WorkspaceCard = {
  id: string;
  name: string;
  preset: HeraldPresetId;
  thumbUrl: string | null;
};

const FILTERS: { id: TemplateFilter; label: MessageIds }[] = [
  { id: 'all', label: 'herald.galleryAll' },
  { id: 'landscape', label: 'herald.galleryLandscape' },
  { id: 'portrait', label: 'herald.galleryPortrait' },
  { id: 'epaper', label: 'herald.galleryEpaper' },
];

const TEMPLATE_NAME: Record<string, MessageIds> = {
  'promo-hero': 'herald.tpl.promo-hero',
  'promo-portrait': 'herald.tpl.promo-portrait',
  'announce-lobby': 'herald.tpl.announce-lobby',
  'event-poster': 'herald.tpl.event-poster',
  hours: 'herald.tpl.hours',
  'menu-photo': 'herald.tpl.menu-photo',
  'menu-list': 'herald.tpl.menu-list',
  'staff-welcome': 'herald.tpl.staff-welcome',
  wifi: 'herald.tpl.wifi',
  safety: 'herald.tpl.safety',
  'epaper-notice': 'herald.tpl.epaper-notice',
  'bar-ticker': 'herald.tpl.bar-ticker',
};

export const TemplateGallery: FC = () => {
  const intl = useIntl();
  const preset = parseHeraldQuery().preset;
  const size = PRESET_SIZE[preset];
  const [open, setOpen] = useState(isTemplateChoicePending);
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [entries, setEntries] = useState<HeraldTemplateEntry[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    const onRequest = () => {
      setError(null);
      setBusyId(null);
      setOpen(true);
    };
    window.addEventListener('herald:pick-template', onRequest);
    return () => window.removeEventListener('herald:pick-template', onRequest);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urls: string[] = [];
    setLoading(true);
    setError(null);
    setPendingDelete(null);
    const builtin = loadTemplateCatalog().catch(() => {
      if (!cancelled) {
        setError(intl.formatMessage({ id: 'herald.galleryFailed' }));
      }
      return [] as HeraldTemplateEntry[];
    });
    const own = listWorkspaceTemplates()
      .then(async (rows) => {
        const cards: WorkspaceCard[] = [];
        for (const row of rows) {
          if (!isHeraldPresetId(row.preset)) continue;
          let thumbUrl: string | null = null;
          if (row.has_thumb) {
            thumbUrl = await fetchWorkspaceTemplateThumb(row.id);
            if (thumbUrl) urls.push(thumbUrl);
          }
          cards.push({
            id: row.id,
            name: row.name,
            preset: row.preset,
            thumbUrl,
          });
        }
        return cards;
      })
      .catch(() => {
        if (!cancelled) {
          setError(intl.formatMessage({ id: 'herald.galleryFailed' }));
        }
        return [] as WorkspaceCard[];
      });
    void Promise.all([builtin, own])
      .then(([items, cards]) => {
        if (cancelled) {
          urls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setEntries(items);
        setWorkspace(cards);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [intl, open]);

  if (!open) return null;

  const visible = entries.filter((entry) =>
    matchesTemplateFilter(entry.tags, filter),
  );
  const visibleWorkspace = workspace.filter((card) =>
    matchesTemplateFilter(tagsForPreset(card.preset), filter),
  );
  const t = (id: MessageIds) => intl.formatMessage({ id });

  const onDeleteWorkspace = (id: string) => {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    setBusyId(id);
    setError(null);
    deleteWorkspaceTemplate(id)
      .then(() => {
        dropWorkspaceTemplateCache(id);
        setWorkspace((cards) => {
          const gone = cards.find((card) => card.id === id);
          if (gone?.thumbUrl) URL.revokeObjectURL(gone.thumbUrl);
          return cards.filter((card) => card.id !== id);
        });
        setPendingDelete(null);
      })
      .catch(() => {
        setError(t('herald.templateDeleteFailed'));
      })
      .finally(() => setBusyId(null));
  };

  const closeWith = (choice: Parameters<typeof settleTemplateChoice>[0]) => {
    setOpen(false);
    setBusyId(null);
    settleTemplateChoice(choice);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="herald-gallery-title"
        className="flex max-h-[min(720px,100%)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-background text-foreground"
      >
        <div className="border-b px-4 py-3">
          <h2 id="herald-gallery-title" className="text-sm font-semibold">
            {t('herald.galleryTitle')}
          </h2>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => closeWith({ kind: 'blank' })}
            className="flex items-center justify-between rounded-md border bg-background px-4 py-3 text-left hover:bg-muted"
          >
            <span>
              <span className="block text-sm font-medium">
                {t('herald.galleryBlank')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {size.width}×{size.height}
              </span>
            </span>
          </button>

          {visibleWorkspace.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium">
                {t('herald.galleryWorkspace')}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {visibleWorkspace.map((card) => {
                  const dims = PRESET_SIZE[card.preset];
                  return (
                    <div
                      key={card.id}
                      className={cn(
                        'overflow-hidden rounded-md border bg-background',
                        busyId === card.id && 'opacity-60',
                      )}
                    >
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          if (busyId) return;
                          setBusyId(card.id);
                          setError(null);
                          loadWorkspaceTemplatePaper(card.id)
                            .then(() => {
                              closeWith({
                                kind: 'template',
                                id: card.id,
                                preset: card.preset,
                                source: 'workspace',
                              });
                            })
                            .catch(() => {
                              setBusyId(null);
                              setError(t('herald.galleryOpenFailed'));
                            });
                        }}
                        className="block w-full bg-background text-left hover:bg-muted"
                      >
                        {card.thumbUrl ? (
                          <img
                            src={card.thumbUrl}
                            alt=""
                            className="aspect-video w-full bg-muted object-contain"
                          />
                        ) : (
                          <span className="block aspect-video w-full bg-muted" />
                        )}
                        <span className="block px-2 py-2">
                          <span className="block truncate text-sm">
                            {card.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {dims.width}×{dims.height}
                          </span>
                        </span>
                      </button>
                      <div className="border-t px-2 py-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            pendingDelete === card.id ? 'destructive' : 'ghost'
                          }
                          disabled={busyId !== null}
                          onClick={() => onDeleteWorkspace(card.id)}
                        >
                          {pendingDelete === card.id
                            ? t('herald.templateDeleteConfirm')
                            : t('herald.templateDelete')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-medium">
              {t('herald.galleryBuiltin')}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={filter === item.id ? 'default' : 'outline'}
                  onClick={() => setFilter(item.id)}
                >
                  {t(item.label)}
                </Button>
              ))}
            </div>
            {loading && (
              <p className="text-sm text-muted-foreground">
                {t('herald.galleryLoading')}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading &&
              visible.length === 0 &&
              visibleWorkspace.length === 0 &&
              !error && (
                <p className="text-sm text-muted-foreground">
                  {t('herald.galleryEmpty')}
                </p>
              )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {visible.map((entry) => {
                const dims = PRESET_SIZE[entry.preset];
                const nameId = TEMPLATE_NAME[entry.id];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => {
                      if (busyId) return;
                      setBusyId(entry.id);
                      setError(null);
                      loadTemplatePaper(entry.id)
                        .then(() => {
                          closeWith({
                            kind: 'template',
                            id: entry.id,
                            preset: entry.preset,
                            source: 'builtin',
                          });
                        })
                        .catch(() => {
                          setBusyId(null);
                          setError(t('herald.galleryOpenFailed'));
                        });
                    }}
                    className={cn(
                      'overflow-hidden rounded-md border bg-background text-left hover:bg-muted',
                      busyId === entry.id && 'opacity-60',
                    )}
                  >
                    <img
                      src={templateAssetUrl(`${entry.id}/thumb.png`)}
                      alt=""
                      className="aspect-video w-full bg-muted object-contain"
                    />
                    <span className="block px-2 py-2">
                      <span className="block truncate text-sm">
                        {nameId ? t(nameId) : entry.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {dims.width}×{dims.height}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
