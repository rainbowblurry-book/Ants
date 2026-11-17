/**
 * Focus manager (DR-086, J31, J53, UI.md §1.7).
 *
 * One registry of focusables per scope. Arrows move to the nearest item in
 * that direction (primary distance + 2 × cross distance), or to an explicit
 * neighbour. Tab and Shift+Tab follow registration order. Enter and Space
 * show the press on keydown and act on keyup. Esc goes back. A dialog pushes
 * a scope, which traps focus, and popping it restores the previous focus.
 * Disabled items are skipped. The ring shows only after keyboard input and
 * hides on pointer-down.
 *
 * No Phaser here: `FocusRing` (components.ts) draws the ring from `onChange`.
 */
export type Dir = 'left' | 'right' | 'up' | 'down';

export interface FocusRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Focusable {
  id: string;
  rect(): FocusRect;
  /** Corner radius of the shape, so the ring can follow it. */
  radius: number;
  enabled(): boolean;
  /** Keydown on Enter/Space: show the press. */
  press?(): void;
  /** Keyup on Enter/Space: act. */
  activate(): void;
  /** Leave without acting (focus moved while pressed). */
  release?(): void;
  neighbours?: Partial<Record<Dir, string>>;
}

/** Picks the nearest candidate centre in a direction: primary + 2 × cross. */
export function nearestInDirection(
  from: FocusRect,
  candidates: readonly { id: string; rect: FocusRect }[],
  dir: Dir,
): string | null {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const x = c.rect.x + c.rect.w / 2 - cx;
    const y = c.rect.y + c.rect.h / 2 - cy;
    let primary: number;
    let cross: number;
    if (dir === 'right') [primary, cross] = [x, Math.abs(y)];
    else if (dir === 'left') [primary, cross] = [-x, Math.abs(y)];
    else if (dir === 'down') [primary, cross] = [y, Math.abs(x)];
    else [primary, cross] = [-y, Math.abs(x)];
    if (primary <= 0.5) continue;
    const score = primary + 2 * cross;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}

export type FocusKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Tab'
  | 'Enter'
  | 'Space'
  | 'Escape';

const ARROWS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

interface Scope {
  items: Focusable[];
  current: string | null;
  onBack: (() => void) | null;
}

export class FocusManager {
  private scopes: Scope[] = [{ items: [], current: null, onBack: null }];
  /** True after keyboard input, false after pointer-down (like :focus-visible). */
  ringVisible = false;
  /** Off in Battle (DR-086): the ring never shows there. */
  enabled = true;
  private pressed: string | null = null;
  private listeners = new Set<(m: FocusManager) => void>();

  private get scope(): Scope {
    return this.scopes[this.scopes.length - 1] as Scope;
  }

  get depth(): number {
    return this.scopes.length;
  }

  get current(): Focusable | null {
    const id = this.scope.current;
    return this.scope.items.find((i) => i.id === id) ?? null;
  }

  onChange(l: (m: FocusManager) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(): void {
    for (const l of this.listeners) l(this);
  }

  /** Adds an item to the top scope, in reading order. */
  register(item: Focusable): void {
    this.scope.items = this.scope.items.filter((i) => i.id !== item.id);
    this.scope.items.push(item);
  }

  unregister(id: string): void {
    for (const s of this.scopes) {
      s.items = s.items.filter((i) => i.id !== id);
      if (s.current === id) s.current = null;
    }
    this.emit();
  }

  setBack(onBack: (() => void) | null): void {
    this.scope.onBack = onBack;
  }

  /** Opens a trapping scope (a dialog). Its items are registered after this. */
  pushScope(onBack: (() => void) | null = null): void {
    this.cancelPress();
    this.scopes.push({ items: [], current: null, onBack });
    this.emit();
  }

  /** Closes the top scope and restores the focus it covered. */
  popScope(): void {
    if (this.scopes.length === 1) return;
    this.cancelPress();
    this.scopes.pop();
    this.emit();
  }

  focus(id: string | null): void {
    if (id !== null) {
      const it = this.scope.items.find((i) => i.id === id);
      if (!it?.enabled()) return;
    }
    if (this.scope.current !== id) this.cancelPress();
    this.scope.current = id;
    this.emit();
  }

  pointerDown(): void {
    if (!this.ringVisible) return;
    this.ringVisible = false;
    this.emit();
  }

  private cancelPress(): void {
    if (this.pressed === null) return;
    const it = this.scope.items.find((i) => i.id === this.pressed);
    it?.release?.();
    this.pressed = null;
  }

  private usable(): Focusable[] {
    return this.scope.items.filter((i) => i.enabled());
  }

  private step(delta: 1 | -1): void {
    const items = this.usable();
    if (items.length === 0) return;
    const at = items.findIndex((i) => i.id === this.scope.current);
    const next =
      at < 0 ? (delta > 0 ? 0 : items.length - 1) : (at + delta + items.length) % items.length;
    this.focus((items[next] as Focusable).id);
  }

  private move(dir: Dir): void {
    const cur = this.current;
    const items = this.usable();
    if (!cur) {
      if (items[0]) this.focus(items[0].id);
      return;
    }
    const explicit = cur.neighbours?.[dir];
    if (explicit && items.some((i) => i.id === explicit)) {
      this.focus(explicit);
      return;
    }
    const target = nearestInDirection(
      cur.rect(),
      items.filter((i) => i.id !== cur.id).map((i) => ({ id: i.id, rect: i.rect() })),
      dir,
    );
    if (target) this.focus(target);
  }

  /** Key down. Returns true when the key was used. */
  keyDown(key: FocusKey | string, shift = false): boolean {
    if (!this.enabled) return false;
    this.ringVisible = true;
    let used = true;
    const dir = ARROWS[key];
    if (dir) {
      this.move(dir);
    } else if (key === 'Tab') {
      this.step(shift ? -1 : 1);
    } else if (key === 'Enter' || key === 'Space' || key === ' ') {
      const cur = this.current;
      if (cur?.enabled()) {
        this.pressed = cur.id;
        cur.press?.();
      }
    } else if (key === 'Escape') {
      this.cancelPress();
      this.scope.onBack?.();
    } else {
      used = false;
    }
    this.emit();
    return used;
  }

  /** Key up: Enter and Space act here. */
  keyUp(key: FocusKey | string): void {
    if (!this.enabled) return;
    if (key !== 'Enter' && key !== 'Space' && key !== ' ') return;
    const cur = this.current;
    const id = this.pressed;
    this.pressed = null;
    if (cur && id === cur.id && cur.enabled()) cur.activate();
  }
}
