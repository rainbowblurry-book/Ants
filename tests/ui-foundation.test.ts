/**
 * Stage 4 UI foundation in node: Layout (DR-085), Focus (DR-086), Nav
 * (DR-090), fitText (DR-087) and the reduced-motion caps (DR-084).
 */
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenEllipsisError, fitText, roleFloor, roleSize, wrap } from '../src/ui/fitText.ts';
import {
  type Focusable,
  FocusManager,
  type FocusRect,
  nearestInDirection,
} from '../src/ui/focus.ts';
import {
  anchorPoint,
  computeMargins,
  fitCanvas,
  gap,
  mirrorX,
  placeSpecRect,
  safeRect,
  snap,
  snapMargins,
} from '../src/ui/layout.ts';
import { motionEase, motionMs, motionPx } from '../src/ui/motion.ts';
import { type HistoryLike, Nav, type NavAction, sceneRule } from '../src/ui/nav.ts';

describe('Layout (DR-085)', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it('no insets: every margin is 16', () => {
    expect(computeMargins(none, { w: 667, h: 375 })).toEqual({
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    });
  });

  it('DR-085 example: 812x375, side insets absorbed by the letterbox, bottom 21 -> 38', () => {
    const vp = { w: 812, h: 375 };
    const c = fitCanvas(vp);
    expect(c.scale).toBeCloseTo(0.694, 3);
    expect((vp.w - c.w) / 2).toBeCloseTo(72.67, 1);
    const m = computeMargins({ top: 0, right: 47, bottom: 21, left: 47 }, vp);
    expect(m.left).toBe(16);
    expect(m.right).toBe(16);
    expect(m.bottom).toBeCloseTo(38.24, 1);
    expect(Math.round(m.bottom)).toBe(38);
    // Snapping rounds up, so the rule is never undercut.
    expect(snapMargins(m, 2).bottom).toBe(38.5);
    expect(snapMargins(m, 1).bottom).toBe(39);
  });

  it('safe rect, anchors and the M - 16 shift', () => {
    const m = { top: 16, right: 24, bottom: 24, left: 16 };
    const s = safeRect(m);
    expect(s).toEqual({ x: 16, y: 16, w: 920, h: 500 });
    expect(anchorPoint(s, 'BR')).toEqual({ x: 936, y: 516 });
    expect(anchorPoint(s, 'C')).toEqual({ x: 476, y: 266 });
    // FIRE (UI.md §4.5) is bottom-right: it moves in by 8 on both axes.
    expect(placeSpecRect({ x: 824, y: 404, w: 120, h: 120 }, 'BR', m)).toEqual({
      x: 816,
      y: 396,
      w: 120,
      h: 120,
    });
    // The wind gauge is top-centre: no shift with a 16 top margin.
    expect(placeSpecRect({ x: 300, y: 80, w: 360, h: 48 }, 'TC', m)).toEqual({
      x: 300,
      y: 80,
      w: 360,
      h: 48,
    });
  });

  it('snaps to 0.5 at S=2 and whole px at S=1; mirrors and measures gaps', () => {
    expect(snap(10.3, 2)).toBe(10.5);
    expect(snap(10.3, 1)).toBe(10);
    expect(mirrorX({ x: 16, y: 380, w: 144, h: 144 })).toEqual({ x: 800, y: 380, w: 144, h: 144 });
    expect(gap({ x: 0, y: 0, w: 64, h: 64 }, { x: 72, y: 0, w: 64, h: 64 })).toBe(8);
    expect(gap({ x: 0, y: 0, w: 64, h: 64 }, { x: 60, y: 0, w: 64, h: 64 })).toBeLessThan(0);
  });
});

function item(
  id: string,
  rect: FocusRect,
  extra: Partial<Focusable> = {},
): Focusable & { acted: number } {
  const it = {
    id,
    rect: () => rect,
    radius: 24,
    enabled: () => true,
    acted: 0,
    activate() {
      it.acted++;
    },
    ...extra,
  };
  return it;
}

describe('Focus (DR-086)', () => {
  it('nearest in a direction weighs cross distance twice', () => {
    const from = { x: 0, y: 0, w: 10, h: 10 };
    const cands = [
      { id: 'far-straight', rect: { x: 100, y: 0, w: 10, h: 10 } },
      { id: 'near-diagonal', rect: { x: 40, y: 40, w: 10, h: 10 } },
      { id: 'behind', rect: { x: -50, y: 0, w: 10, h: 10 } },
    ];
    // near-diagonal: 40 + 2*40 = 120 > far-straight 100.
    expect(nearestInDirection(from, cands, 'right')).toBe('far-straight');
    expect(nearestInDirection(from, cands, 'left')).toBe('behind');
    expect(nearestInDirection(from, cands, 'up')).toBeNull();
  });

  it('Tab follows registration order and skips disabled items; arrows move', () => {
    const f = new FocusManager();
    const a = item('a', { x: 0, y: 0, w: 64, h: 64 });
    const b = item('b', { x: 100, y: 0, w: 64, h: 64 }, { enabled: () => false });
    const c = item('c', { x: 200, y: 0, w: 64, h: 64 });
    for (const i of [a, b, c]) f.register(i);
    f.focus('a');
    f.keyDown('Tab');
    expect(f.current?.id).toBe('c');
    f.keyDown('Tab', true);
    expect(f.current?.id).toBe('a');
    f.keyDown('ArrowRight');
    expect(f.current?.id).toBe('c');
  });

  it('the ring shows after keys and hides on pointer-down', () => {
    const f = new FocusManager();
    f.register(item('a', { x: 0, y: 0, w: 64, h: 64 }));
    expect(f.ringVisible).toBe(false);
    f.keyDown('ArrowDown');
    expect(f.ringVisible).toBe(true);
    f.pointerDown();
    expect(f.ringVisible).toBe(false);
  });

  it('Enter presses on keydown and acts on keyup', () => {
    const f = new FocusManager();
    const press = vi.fn();
    const a = item('a', { x: 0, y: 0, w: 64, h: 64 }, { press });
    f.register(a);
    f.focus('a');
    f.keyDown('Enter');
    expect(press).toHaveBeenCalledOnce();
    expect(a.acted).toBe(0);
    f.keyUp('Enter');
    expect(a.acted).toBe(1);
    // A keyup without its keydown does nothing.
    f.keyUp('Enter');
    expect(a.acted).toBe(1);
  });

  it('a dialog scope traps focus, Esc calls its back, and closing restores focus', () => {
    const f = new FocusManager();
    f.register(item('menu', { x: 0, y: 0, w: 64, h: 64 }));
    f.focus('menu');
    const back = vi.fn();
    f.pushScope(back);
    f.register(item('cancel', { x: 0, y: 0, w: 64, h: 64 }));
    f.register(item('ok', { x: 100, y: 0, w: 64, h: 64 }));
    f.focus('ok');
    f.keyDown('Tab');
    expect(f.current?.id).toBe('cancel');
    f.keyDown('Tab');
    expect(f.current?.id).toBe('ok'); // wraps inside the dialog, never reaches "menu"
    f.keyDown('Escape');
    expect(back).toHaveBeenCalledOnce();
    f.popScope();
    expect(f.current?.id).toBe('menu');
  });

  it('is inert when disabled (Battle)', () => {
    const f = new FocusManager();
    f.enabled = false;
    expect(f.keyDown('Tab')).toBe(false);
    expect(f.ringVisible).toBe(false);
  });
});

class FakeHistory implements HistoryLike {
  stack: unknown[] = [null];
  pushState(state: unknown, _title = ''): void {
    this.stack.push(state);
  }
  replaceState(state: unknown, _title = ''): void {
    this.stack[this.stack.length - 1] = state;
  }
  back(): void {
    this.stack.pop();
  }
  get top(): unknown {
    return this.stack[this.stack.length - 1];
  }
}

describe('Nav (DR-090)', () => {
  it('scene rules follow the DR-090 table', () => {
    expect(sceneRule('title').kind).toBe('leave');
    expect(sceneRule('levelSelect')).toEqual({ kind: 'goto', scene: 'title' });
    expect(sceneRule('twoPlayerSetup')).toEqual({ kind: 'goto', scene: 'title' });
    expect(sceneRule('comic').kind).toBe('skipComic');
    expect(sceneRule('battle').kind).toBe('openPause');
    expect(sceneRule('results').kind).toBe('resultsExit');
    expect(sceneRule('boot').kind).toBe('ignore');
  });

  it('closes the topmost layer first', () => {
    const acts: NavAction[] = [];
    const nav = new Nav(new FakeHistory(), (a) => acts.push(a));
    nav.forward('levelSelect');
    const closed: string[] = [];
    nav.pushLayer('card', () => closed.push('card'));
    nav.pushLayer('confirm', () => closed.push('confirm'));
    nav.goBack('esc');
    nav.goBack('esc');
    expect(closed).toEqual(['confirm', 'card']);
    expect(acts).toEqual([]);
    nav.goBack('esc');
    expect(acts).toEqual([{ kind: 'goto', scene: 'title' }]);
  });

  it('browser back in Battle opens Pause and re-pushes, so the match is never left', () => {
    const h = new FakeHistory();
    const acts: NavAction[] = [];
    const nav = new Nav(h, (a) => acts.push(a));
    nav.forward('battle');
    const depthBefore = h.stack.length;
    h.back(); // the browser moves back...
    nav.onPopState(h.top); // ...and fires popstate
    expect(acts).toEqual([{ kind: 'openPause' }]);
    expect(h.stack.length).toBe(depthBefore);
  });

  it('Esc at Title does nothing; the UI back button goes through history', () => {
    const h = new FakeHistory();
    const nav = new Nav(h, () => undefined);
    nav.scene = 'title';
    expect(nav.goBack('esc')).toEqual({ kind: 'ignore' });
    nav.forward('levelSelect');
    const n = h.stack.length;
    nav.backButton();
    expect(h.stack.length).toBe(n - 1);
  });

  it('a forward popstate (depth too high) is undone', () => {
    const h = new FakeHistory();
    const acts: NavAction[] = [];
    const nav = new Nav(h, (a) => acts.push(a));
    nav.forward('levelSelect');
    h.pushState({ depth: 9 }, '');
    nav.onPopState({ depth: 9 });
    expect(acts).toEqual([]);
  });
});

/** A fake font: every character is 0.5 em wide. */
const measure = (text: string, size: number) => text.length * size * 0.5;

describe('fitText (DR-087)', () => {
  it('uses the role tokens', () => {
    expect(roleSize('label')).toBe(28);
    expect(roleFloor('label')).toBe(22);
    expect(roleFloor('caption')).toBe(18);
    expect(roleFloor('numeral')).toBe(32); // numerals never shrink
  });

  it('keeps the size when it fits', () => {
    expect(fitText('Play', { role: 'label', maxWidth: 192, measure })).toMatchObject({
      size: 28,
      lines: ['Play'],
    });
  });

  it('shrinks in 1 px steps down to the floor first', () => {
    // 12 chars: 28 -> 168 px; fits 140 at 23 (138 px).
    const r = fitText('Quit to map!', { role: 'label', maxWidth: 140, measure });
    expect(r).toMatchObject({ size: 23, lines: ['Quit to map!'], overflow: false });
  });

  it('then wraps to the max lines', () => {
    const r = fitText('Pick up where you left off?', {
      role: 'body',
      maxWidth: 160,
      maxLines: 3,
      measure,
    });
    expect(r.size).toBe(20);
    expect(r.lines.length).toBeGreaterThan(1);
    expect(r.lines.length).toBeLessThanOrEqual(3);
    for (const l of r.lines) expect(measure(l, r.size)).toBeLessThanOrEqual(160);
  });

  it('ellipsis only where allowed; verbs overflow (and throw when strict)', () => {
    const long = 'Superlongnicknameforanant';
    const name = fitText(long, { role: 'label', maxWidth: 120, ellipsisAllowed: true, measure });
    expect(name.ellipsis).toBe(true);
    expect(name.lines[0]?.endsWith('…')).toBe(true);
    expect(measure(name.lines[0] ?? '', name.size)).toBeLessThanOrEqual(120);
    const verb = fitText(long, { role: 'label', maxWidth: 120, measure });
    expect(verb).toMatchObject({ overflow: true, ellipsis: false });
    expect(() => fitText(long, { role: 'label', maxWidth: 120, measure, strict: true })).toThrow(
      ForbiddenEllipsisError,
    );
  });

  it('wrap keeps a too-long word on its own line', () => {
    expect(wrap('a bbbbbbbbbb c', 10, 30, measure)).toEqual(['a', 'bbbbbbbbbb', 'c']);
  });
});

describe('reduced motion (DR-084)', () => {
  it('caps durations at 120 ms, removes overshoot and limits translates to 8 px', () => {
    expect(motionMs(220, true)).toBe(120);
    expect(motionMs(60, true)).toBe(60);
    expect(motionMs(220, false)).toBe(220);
    expect(motionEase('Back.easeOut', true)).toBe('Sine.easeOut');
    expect(motionPx(-24, true)).toBe(-8);
    expect(motionPx(-24, false)).toBe(-24);
  });
});
