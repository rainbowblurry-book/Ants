/**
 * Battle HUD layout: layout A, "move left, shoot right" (OVR-019, the owner's
 * pick L01), over DR-120 as amended by J33, J38, J46 (UI.md §4.5).
 *
 * The screen is W x 540 (OVR-013). One pure function returns every HUD rect
 * for a width, a margin set and a handedness, so tests can check UI.md §6
 * check 3 without a browser. Rects are written at M = 16; anchored sides move
 * inward by M − 16 (DR-085). The top is never mirrored. Left-handed mirrors
 * every bottom rect (x' = W − x − w), then swaps the walk pair so ◀ stays
 * left of ▶.
 *
 * - Left thumb: Hop, Flip, ◀, ▶ in a 2x2 pad.
 * - Right thumb: FIRE in the corner, the angle dial, the power slider and one
 *   weapon button that opens the tray above it (the 6 slots are a pop-up).
 * - Wide screens (side strips of at least 88 + margin): the power slider
 *   stands in the right strip above FIRE. Narrow screens: it sits in the
 *   bottom row between the dial and FIRE, so the clear zone stays free.
 */
import { type Anchor, type Margins, placeSpecRect, type Rect, snap } from '../ui/layout.ts';
import { logical, tokens } from '../ui/theme.ts';

export type Handed = 'right' | 'left';

export interface HudMode {
  /** Weapons in the tray, 1 to 6 (DR-124). */
  weapons: number;
  /** Level 0 Part 1 shows the "Next" button (DR-151, J33). */
  level0Next?: boolean;
  /** Boss levels: the Team B pill becomes the 72-tall boss plate (DR-126). */
  boss?: boolean;
}

/** Interactive controls (hit rects) that are always on screen. The tray slots are a pop-up. */
export const CONTROL_IDS = [
  'pause',
  'find',
  'level0Next',
  'hop',
  'flip',
  'walkL',
  'walkR',
  'weapon',
  'dial',
  'power',
  'fire',
] as const;
export type ControlId = (typeof CONTROL_IDS)[number] | `slot${number}`;

export type ReadoutId =
  | 'teamA'
  | 'teamB'
  | 'plate'
  | 'timer'
  | 'wind'
  | 'effects'
  | 'notice'
  | 'dotRight'
  | 'dotLeft'
  | 'moveBar'
  | 'tray'
  | 'fireVisual'
  | 'gate';

export type HudId = ControlId | ReadoutId;

interface Spec {
  rect: Rect;
  anchor: Anchor;
  bottom: boolean;
}

const T = tokens.touch;
/** A side strip this wide (plus the margin past 16) holds the power slider (OVR-019). */
export const STRIP_FOR_POWER = 88;

/** True when the side strips hold the power slider (OVR-019). */
export function isWide(width: number, m: Margins): boolean {
  const strip = (width - logical.width) / 2;
  return strip - (Math.max(m.left, m.right) - 16) >= STRIP_FOR_POWER;
}

/** Layout A rects at M = 16 on a W-wide screen. */
function specs(mode: HudMode, W: number, wide: boolean): Record<string, Spec> {
  const top = (x: number, y: number, w: number, h: number, anchor: Anchor): Spec => ({
    rect: { x, y, w, h },
    anchor,
    bottom: false,
  });
  const bot = (x: number, y: number, w: number, h: number, anchor: Anchor): Spec => ({
    rect: { x, y, w, h },
    anchor,
    bottom: true,
  });
  const c = W / 2;
  // Team pills keep DR-120's 232 where the top row has room, else 192 (OVR-019).
  const pillW = W >= 1040 ? 232 : 192;
  const fireX = W - 16 - T.fireHit;
  const power = wide ? { x: W - 88, y: 180 } : { x: fireX - 32 - 72, y: 332 };
  const dialX = wide ? fireX - 32 - 144 : power.x - 8 - 144;
  const weaponX = dialX - 8 - 72;
  const out: Record<string, Spec> = {
    // One top row: Blue left, the plate in the middle, Amber right, Pause (OVR-019).
    teamA: top(16, 16, pillW, 48, 'TL'),
    teamB: top(W - 88 - pillW, 16, pillW, mode.boss ? 72 : 48, 'TR'),
    plate: top(c - 180, 16, 360, 56, 'TC'),
    timer: top(c + 124, 20, 48, 48, 'TC'),
    wind: top(c - 180, 80, 360, 48, 'TC'),
    effects: top(c - 240, 132, 480, 40, 'TC'),
    pause: top(W - 80, 16, 64, 64, 'TR'),
    find: top(W - 80, 88, 64, 64, 'TR'),
    notice: top(c - 240, 184, 480, 72, 'C'),
    dotRight: top(W - 408, 180, 392, 112, 'TR'),
    dotLeft: top(16, 180, 392, 112, 'TL'),
    gate: top(c - 180, 212, 360, 96, 'C'),
    hop: bot(16, 372, 72, 72, 'BL'),
    flip: bot(96, 372, 72, 72, 'BL'),
    walkL: bot(16, 452, 72, 72, 'BL'),
    walkR: bot(96, 452, 72, 72, 'BL'),
    // Placed by the Hud next to the ant (OVR-018); this rect gives its size.
    moveBar: bot(16, 344, 152, 24, 'BL'),
    weapon: bot(weaponX, 452, 72, 72, 'BR'),
    dial: bot(dialX, 380, 144, 144, 'BR'),
    power: bot(power.x, power.y, 72, 192, 'BR'),
    fire: bot(fireX, 404, T.fireHit, T.fireHit, 'BR'),
  };
  if (mode.level0Next) out.level0Next = top(W - 160, 88, 72, 64, 'TR');
  // The tray pops up above the weapon button: 3x2 for 4-6 weapons, one row for 1-3 (DR-124).
  const n = Math.max(1, Math.min(6, mode.weapons));
  const cols = Math.min(3, n);
  const rows = n > 3 ? 2 : 1;
  const slot = tokens.component.weaponSlot;
  const pad = 8;
  const tw = cols * slot.size + (cols - 1) * slot.gap + 2 * pad;
  const th = rows * slot.size + (rows - 1) * slot.gap + 2 * pad;
  out.tray = bot(weaponX + 36 - tw / 2, 452 - 8 - th, tw, th, 'BR');
  return out;
}

const MIRROR_ANCHOR: Partial<Record<Anchor, Anchor>> = { BL: 'BR', BR: 'BL', ML: 'MR', MR: 'ML' };

export interface HudLayout {
  rects: Record<string, Rect>;
  /** Ids of the controls always on screen in this layout. */
  controls: ControlId[];
  /** Weapon slot rects in the pop-up tray, in order (weapon 1 first, reading order). */
  slots: Rect[];
  /** UI.md §4.5 clear zone (y 176..328 at M = 16; on a wide screen, the world strip only). */
  clear: Rect;
  handed: Handed;
  /** The screen width these rects are for (OVR-013). */
  width: number;
  /** The power slider stands in the side strip (OVR-019). */
  wide: boolean;
}

/**
 * Every HUD rect on a `width`-wide screen. `s` snaps to 0.5 logical px at S=2
 * (DR-085); leave it out for exact maths in tests.
 */
export function hudLayout(
  m: Margins,
  handed: Handed,
  mode: HudMode,
  s: 1 | 2 | null = null,
  width: number = logical.width,
): HudLayout {
  const W = width;
  const wide = isWide(W, m);
  const rects: Record<string, Rect> = {};
  const sn = (r: Rect): Rect => (s ? { x: snap(r.x, s), y: snap(r.y, s), w: r.w, h: r.h } : r);
  for (const [id, sp] of Object.entries(specs(mode, W, wide))) {
    let r = sp.rect;
    let anchor = sp.anchor;
    if (handed === 'left' && sp.bottom) {
      r = { x: W - r.x - r.w, y: r.y, w: r.w, h: r.h };
      anchor = MIRROR_ANCHOR[anchor] ?? anchor;
    }
    rects[id] = sn(placeSpecRect(r, anchor, m));
  }
  if (handed === 'left') {
    // Mirroring put ▶ on the left; swap the pair so ◀ stays left (UI.md §4.5).
    const l = rects.walkL as Rect;
    rects.walkL = rects.walkR as Rect;
    rects.walkR = l;
  }
  // FIRE visual 104 centred in its 120 hit (DR-122).
  const fire = rects.fire as Rect;
  const inset = (T.fireHit - T.fireVisual) / 2;
  rects.fireVisual = { x: fire.x + inset, y: fire.y + inset, w: T.fireVisual, h: T.fireVisual };

  const slots: Rect[] = [];
  const tray = rects.tray as Rect;
  const slot = tokens.component.weaponSlot;
  const n = Math.max(1, Math.min(6, mode.weapons));
  const pad = 8;
  for (let i = 0; i < n; i++) {
    const r = {
      x: tray.x + pad + (i % 3) * (slot.size + slot.gap),
      y: tray.y + pad + Math.floor(i / 3) * (slot.size + slot.gap),
      w: slot.size,
      h: slot.size,
    };
    rects[`slot${i}`] = r;
    slots.push(r);
  }

  const controls: ControlId[] = CONTROL_IDS.filter((id) => rects[id] !== undefined);

  const strip = (W - logical.width) / 2;
  const x0 = wide ? Math.max(m.left, strip) : m.left;
  const x1 = wide ? Math.min(W - m.right, W - strip) : W - m.right;
  const clear = {
    x: x0,
    y: 176 + (m.top - 16),
    w: x1 - x0,
    h: 328 - (m.bottom - 16) - (176 + (m.top - 16)),
  };
  return { rects, controls, slots, clear, handed, width: W, wide };
}

/** True if a point is inside a rect (edges included). */
export function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
