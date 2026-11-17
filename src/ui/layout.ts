/**
 * Safe area and layout anchors (DR-085, J32, UI.md §1.6).
 *
 * The canvas fills the viewport with no padding (`viewport-fit=cover`). Each
 * side's margin comes from how far the device inset reaches past the FIT
 * letterbox:  margin = max(16, max(0, inset − letterbox) / fitScale + 8).
 *
 * The maths is pure (node tests). `LayoutService` adds the DOM probe and the
 * resize event.
 */
import { logical, tokens } from './theme.ts';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export type Margins = Insets;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Anchor = 'TL' | 'TC' | 'TR' | 'ML' | 'C' | 'MR' | 'BL' | 'BC' | 'BR';
export const ANCHORS: readonly Anchor[] = ['TL', 'TC', 'TR', 'ML', 'C', 'MR', 'BL', 'BC', 'BR'];

const L = tokens.layout;
/** Rects in UI.md are written with this margin (M = 16). */
export const SPEC_MARGIN = L.marginMin;

/** Snap to 0.5 logical px at S=2 and to whole px at S=1 (DR-085). */
export function snap(v: number, s: 1 | 2): number {
  const step = s === 2 ? L.snap.S2 : L.snap.S1;
  return Math.round(v / step) * step;
}

/** CSS size of the FIT canvas inside a viewport. */
export function fitCanvas(viewport: { w: number; h: number }): {
  w: number;
  h: number;
  scale: number;
} {
  const scale = Math.min(viewport.w / logical.width, viewport.h / logical.height);
  return { w: logical.width * scale, h: logical.height * scale, scale };
}

/** DR-085 margins, in logical px (not snapped). */
export function computeMargins(
  insets: Insets,
  viewport: { w: number; h: number },
  canvasCss: { w: number; h: number } = fitCanvas(viewport),
): Margins {
  const scale = canvasCss.w / logical.width;
  const lbX = Math.max(0, (viewport.w - canvasCss.w) / 2);
  const lbY = Math.max(0, (viewport.h - canvasCss.h) / 2);
  const side = (inset: number, letterbox: number) =>
    Math.max(L.marginMin, Math.max(0, inset - letterbox) / scale + L.insetExtra);
  return {
    top: side(insets.top, lbY),
    right: side(insets.right, lbX),
    bottom: side(insets.bottom, lbY),
    left: side(insets.left, lbX),
  };
}

/** Margins rounded up to the snap step, so they never shrink below the rule. */
export function snapMargins(m: Margins, s: 1 | 2): Margins {
  const step = s === 2 ? L.snap.S2 : L.snap.S1;
  const up = (v: number) => Math.ceil(v / step - 1e-9) * step;
  return { top: up(m.top), right: up(m.right), bottom: up(m.bottom), left: up(m.left) };
}

export function safeRect(m: Margins): Rect {
  return {
    x: m.left,
    y: m.top,
    w: logical.width - m.left - m.right,
    h: logical.height - m.top - m.bottom,
  };
}

/** The point of an anchor on a rect. */
export function anchorPoint(r: Rect, a: Anchor): { x: number; y: number } {
  const col =
    a === 'TL' || a === 'ML' || a === 'BL' ? 0 : a === 'TR' || a === 'MR' || a === 'BR' ? 1 : 0.5;
  const row = a[0] === 'T' ? 0 : a[0] === 'B' ? 1 : 0.5;
  return { x: r.x + r.w * col, y: r.y + r.h * row };
}

/**
 * Moves a rect written for M = 16 inward on its anchored sides when the real
 * margin is larger (UI.md conventions: "edge-anchored rects move inward by
 * M − 16"). Centre axes do not move.
 */
export function placeSpecRect(spec: Rect, anchor: Anchor, m: Margins): Rect {
  let { x, y } = spec;
  if (anchor === 'TL' || anchor === 'ML' || anchor === 'BL') x += m.left - SPEC_MARGIN;
  if (anchor === 'TR' || anchor === 'MR' || anchor === 'BR') x -= m.right - SPEC_MARGIN;
  if (anchor[0] === 'T') y += m.top - SPEC_MARGIN;
  if (anchor[0] === 'B') y -= m.bottom - SPEC_MARGIN;
  return { x, y, w: spec.w, h: spec.h };
}

/** Mirror a rect for the left-handed HUD: x' = 960 − x − w (UI.md §4.5). */
export function mirrorX(r: Rect): Rect {
  return { x: logical.width - r.x - r.w, y: r.y, w: r.w, h: r.h };
}

export function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - 1e-9 &&
    inner.y >= outer.y - 1e-9 &&
    inner.x + inner.w <= outer.x + outer.w + 1e-9 &&
    inner.y + inner.h <= outer.y + outer.h + 1e-9
  );
}

/** Gap between two rects (0 when they touch, negative when they overlap). */
export function gap(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

// --------------------------------------------------------------- service

type Listener = (l: LayoutService) => void;

/**
 * The DOM side: a probe element reads `env(safe-area-inset-*)` on resize and
 * orientation change. One instance per game.
 */
export class LayoutService {
  margins: Margins = { top: 16, right: 16, bottom: 16, left: 16 };
  safe: Rect = safeRect(this.margins);
  private listeners = new Set<Listener>();
  private probe: HTMLElement | null = null;

  constructor(
    private readonly s: 1 | 2,
    private readonly canvas: () => HTMLCanvasElement | null,
  ) {}

  start(): void {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;inset:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(probe);
    this.probe = probe;
    const update = () => this.update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    this.update();
  }

  readInsets(): Insets {
    if (!this.probe) return { top: 0, right: 0, bottom: 0, left: 0 };
    const cs = getComputedStyle(this.probe);
    const px = (v: string) => Number.parseFloat(v) || 0;
    return {
      top: px(cs.paddingTop),
      right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom),
      left: px(cs.paddingLeft),
    };
  }

  update(): void {
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    const c = this.canvas()?.getBoundingClientRect();
    const canvasCss = c && c.width > 0 ? { w: c.width, h: c.height } : fitCanvas(viewport);
    this.margins = snapMargins(computeMargins(this.readInsets(), viewport, canvasCss), this.s);
    this.safe = safeRect(this.margins);
    for (const l of this.listeners) l(this);
  }

  /** Subscribe to resize; returns the unsubscribe function. */
  onResize(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  anchor(a: Anchor): { x: number; y: number } {
    return anchorPoint(this.safe, a);
  }

  place(spec: Rect, a: Anchor): Rect {
    const r = placeSpecRect(spec, a, this.margins);
    return { x: snap(r.x, this.s), y: snap(r.y, this.s), w: r.w, h: r.h };
  }
}
