import { type HeraldPresetId } from './query';

export type TemplateChoice =
  | { kind: 'blank' }
  | {
      kind: 'template';
      id: string;
      preset: HeraldPresetId;
      source: 'builtin' | 'workspace';
    };

let pending = false;
let settle: ((choice: TemplateChoice) => void) | null = null;

export function isTemplateChoicePending(): boolean {
  return pending;
}

/** First screen of a new Herald design. Re-edit by contentId never calls this. */
export function requestTemplateChoice(): Promise<TemplateChoice> {
  if (settle) settle({ kind: 'blank' });
  pending = true;
  return new Promise((resolve) => {
    settle = (choice) => {
      pending = false;
      settle = null;
      resolve(choice);
    };
    window.dispatchEvent(new CustomEvent('herald:pick-template'));
  });
}

export function settleTemplateChoice(choice: TemplateChoice): void {
  settle?.(choice);
}
