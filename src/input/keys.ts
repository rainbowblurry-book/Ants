/**
 * Battle key map (DR-121, the full map per J53; UI.md §1.7).
 *
 * Pure: a KeyboardEvent's `key` and `code` become one battle action. Keys
 * with Ctrl, Alt or Meta are left to the browser. Fire ignores key repeat
 * (the caller drops `repeat` events for one-shot actions).
 */
export type BattleAction =
  | 'walkLeft'
  | 'walkRight'
  | 'angleUp'
  | 'angleDown'
  | 'powerUp'
  | 'powerDown'
  | 'fire'
  | 'hop'
  | 'flip'
  | 'turn'
  | 'prevWeapon'
  | 'nextWeapon'
  | 'pick1'
  | 'pick2'
  | 'pick3'
  | 'pick4'
  | 'pick5'
  | 'pick6'
  | 'recentre'
  | 'pause'
  | 'fullscreen';

/** Held actions repeat or hold while the key is down; the rest act once per press. */
export const HELD: ReadonlySet<BattleAction> = new Set([
  'walkLeft',
  'walkRight',
  'angleUp',
  'angleDown',
  'powerUp',
  'powerDown',
]);

const BY_KEY: Record<string, BattleAction> = {
  a: 'walkLeft',
  ArrowLeft: 'walkLeft',
  d: 'walkRight',
  ArrowRight: 'walkRight',
  w: 'angleUp',
  ArrowUp: 'angleUp',
  s: 'angleDown',
  ArrowDown: 'angleDown',
  '=': 'powerUp',
  '+': 'powerUp',
  PageUp: 'powerUp',
  '-': 'powerDown',
  PageDown: 'powerDown',
  ' ': 'fire',
  Enter: 'fire',
  Shift: 'hop',
  z: 'hop',
  x: 'flip',
  t: 'turn',
  q: 'prevWeapon',
  e: 'nextWeapon',
  Tab: 'nextWeapon',
  '1': 'pick1',
  '2': 'pick2',
  '3': 'pick3',
  '4': 'pick4',
  '5': 'pick5',
  '6': 'pick6',
  c: 'recentre',
  Escape: 'pause',
  p: 'pause',
  f: 'fullscreen',
};

const BY_CODE: Record<string, BattleAction> = {
  NumpadAdd: 'powerUp',
  NumpadSubtract: 'powerDown',
  NumpadEnter: 'fire',
};

export interface KeyLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

/** The battle action of a key, or null. */
export function actionOf(e: KeyLike): BattleAction | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  const byCode = e.code ? BY_CODE[e.code] : undefined;
  if (byCode) return byCode;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  return BY_KEY[k] ?? null;
}

/** Weapon index (0-based) of a pick action, else −1. */
export function pickIndex(a: BattleAction): number {
  return a.startsWith('pick') ? Number(a.slice(4)) - 1 : -1;
}
