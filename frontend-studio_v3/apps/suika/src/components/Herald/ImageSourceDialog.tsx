import { type FC, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { Button } from '@/components/ui/button';

import {
  embedLibraryImage,
  fetchContentBlob,
  imageBlobToDataUrl,
  type LibraryImageRow,
  listLibraryImages,
} from '../../herald/api';
import { getHeraldSession } from '../../herald/bridge';
import {
  heraldImageRequestId,
  settleHeraldImage,
} from '../../herald/image-request';
import { PRESET_SIZE } from '../../herald/presets';

function maxEdge(): number {
  const preset = getHeraldSession()?.query.preset;
  const size = preset ? PRESET_SIZE[preset] : undefined;
  if (!size) return 1920;
  return Math.max(size.width, size.height);
}

export const ImageSourceDialog: FC = () => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LibraryImageRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const close = (picked: boolean) => {
    setOpen(false);
    setBusyId(null);
    if (!picked) settleHeraldImage(null);
  };

  useEffect(() => {
    const onRequest = () => {
      setCurrentId(heraldImageRequestId());
      setError(null);
      setOpen(true);
    };
    window.addEventListener('herald:request-image', onRequest);
    return () => window.removeEventListener('herald:request-image', onRequest);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const exclude = getHeraldSession()?.contentId || null;
    listLibraryImages(exclude)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError(intl.formatMessage({ id: 'herald.libraryFailed' }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [intl, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urls: string[] = [];
    const run = async () => {
      for (const row of rows) {
        if (cancelled) return;
        const blob = await fetchContentBlob(row.id, 'thumbnail');
        if (!blob || cancelled) continue;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        if (!cancelled) setThumbs((prev) => ({ ...prev, [row.id]: url }));
      }
    };
    void run();
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
      setThumbs({});
    };
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setBusyId(null);
      settleHeraldImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pickRow = async (row: LibraryImageRow) => {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    try {
      const embedded = await embedLibraryImage(
        row.id,
        row.filename || 'Image',
        maxEdge(),
      );
      setOpen(false);
      settleHeraldImage(embedded);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : intl.formatMessage({ id: 'herald.libraryReadFailed' });
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusyId('file');
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const blob = new Blob([buf], { type: file.type || 'image/png' });
      const url = await imageBlobToDataUrl(blob, maxEdge());
      setOpen(false);
      settleHeraldImage({ url, name: file.name });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : intl.formatMessage({ id: 'herald.libraryReadFailed' }),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 24, 39, 0.45)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="herald-library-title"
        style={{
          width: 'min(520px, 100%)',
          maxHeight: 'min(640px, 100%)',
          background: '#fff',
          color: '#111',
          border: '1px solid #e6e6e6',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '12px 14px',
            borderBottom: '1px solid #e6e6e6',
          }}
        >
          <h2 id="herald-library-title" style={{ margin: 0, fontSize: 14 }}>
            {intl.formatMessage({ id: 'herald.libraryTitle' })}
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busyId !== null}
          >
            {intl.formatMessage({ id: 'uploadFile' })}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void onFile(file);
            }}
          />
        </div>
        <div style={{ overflow: 'auto', padding: 10, flex: 1 }}>
          {loading && (
            <p style={{ margin: 8, fontSize: 13, color: '#666' }}>
              {intl.formatMessage({ id: 'herald.libraryLoading' })}
            </p>
          )}
          {!loading && rows.length === 0 && !error && (
            <p style={{ margin: 8, fontSize: 13, color: '#666' }}>
              {intl.formatMessage({ id: 'herald.libraryEmpty' })}
            </p>
          )}
          {error && (
            <p style={{ margin: 8, fontSize: 13, color: '#b91c1c' }}>{error}</p>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
            }}
          >
            {rows.map((row) => {
              const selected = row.id === currentId;
              const thumb = thumbs[row.id];
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void pickRow(row)}
                  style={{
                    textAlign: 'left',
                    border: selected ? '2px solid #1592fe' : '1px solid #e6e6e6',
                    borderRadius: 6,
                    background: '#fff',
                    padding: 6,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: 84,
                      background: '#f4f4f4',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : null}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 6,
                      fontSize: 12,
                      color: '#111',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {busyId === row.id
                      ? intl.formatMessage({ id: 'herald.libraryLoading' })
                      : row.filename || row.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '10px 14px',
            borderTop: '1px solid #e6e6e6',
          }}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => close(false)}
          >
            {intl.formatMessage({ id: 'cancel' })}
          </Button>
        </div>
      </div>
    </div>
  );
};
