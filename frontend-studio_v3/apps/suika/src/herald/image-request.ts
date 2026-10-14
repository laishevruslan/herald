export type HeraldPickedImage = {
  url: string;
  name: string;
  contentId?: string;
};

type Pending = {
  resolve: (value: HeraldPickedImage | null) => void;
  currentId: string | null;
};

let pending: Pending | null = null;

export function requestHeraldImage(
  currentId?: string | null,
): Promise<HeraldPickedImage | null> {
  if (pending) pending.resolve(null);
  return new Promise((resolve) => {
    pending = { resolve, currentId: currentId || null };
    window.dispatchEvent(new CustomEvent('herald:request-image'));
  });
}

export function heraldImageRequestId(): string | null {
  return pending?.currentId ?? null;
}

export function settleHeraldImage(result: HeraldPickedImage | null): void {
  const current = pending;
  pending = null;
  current?.resolve(result);
}
