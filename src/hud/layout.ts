/**
 * Battle HUD layout (DR-120 as amended by J33, J38, J46; UI.md §4.5).
 *
 * One pure function returns every HUD rect for a margin set and a handedness,
 * so tests can check UI.md §6 check 3 without a browser. Rects are written in
 * UI.md at M = 16; anchored sides move inward by M − 16 (DR-085). The top is
 * never mirrored. Left-handed mirrors every bottom rect (x' = 960 − x − w),
 * then swaps the walk pair so ◀ stays left of ▶.
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

/** Interactive controls (hit rects). Slots are added as `slot0`..`slot5`. */
export const CONTROL_IDS = [
  'pause',
  'find',
  'level0Next',
  'dial',
  'angleUp',
  'angleDown',
  'flip',
  'hop',
  'walkL',
  'walkR',
  'power',
  'powerUp',
  'powerDown',
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
  | 'namePill'
  | 'fireVisual'
  | 'gate';

export type HudId = ControlId | ReadoutId;

interface Spec {
  rect: Rect;
  anchor: Anchor;
  bottom: boolean;
}

const T = tokens.touch;

/** UI.md §4.5 rects at M = 16. */
function specs(mode: HudMode): Record<string, Spec> {
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
  const out: Record<string, Spec> = {
    teamA: top(16, 16, 232, 48, 'TL'),
    teamB: top(16, 68, 232, mode.boss ? 72 : 48, 'TL'),
    plate: top(270, 16, 420, 56, 'TC'),
    timer: top(634, 20, 48, 48, 'TC'),
    wind: top(300, 80, 360, 48, 'TC'),
    effects: top(240, 132, 480, 40, 'TC'),
    pause: top(880, 16, 64, 64, 'TR'),
    find: top(880, 88, 64, 64, 'TR'),
    // The notice slot, the Dot bubble and the gate sit in the middle band.
    notice: top(240, 184, 480, 72, 'C'),
    dotRight: top(552, 180, 392, 112, 'TR'),
    dotLeft: top(16, 180, 392, 112, 'TL'),
    gate: top(300, 212, 360, 96, 'C'),
    dial: bot(16, 380, 144, 144, 'BL'),
    angleUp: bot(168, 388, 64, 64, 'BL'),
    angleDown: bot(168, 460, 64, 64, 'BL'),
    flip: bot(240, 372, 72, 72, 'BL'),
    hop: bot(320, 372, 72, 72, 'BL'),
    walkL: bot(240, 452, 72, 72, 'BL'),
    walkR: bot(320, 452, 72, 72, 'BL'),
    moveBar: bot(240, 344, 152, 24, 'BL'),
    namePill: bot(416, 328, 208, 40, 'BC'),
    power: bot(648, 332, 72, 192, 'BR'),
    powerUp: bot(728, 388, 64, 64, 'BR'),
    powerDown: bot(728, 460, 64, 64, 'BR'),
    fire: bot(824, 404, T.fireHit, T.fireHit, 'BR'),
  };
  if (mode.level0Next) out.level0Next = top(800, 16, 72, 64, 'TR');
  // Tray: a 3x2 grid for 4-6 weapons, or a bottom-anchored 88-tall row for 1-3 (DR-124).
  const n = Math.max(1, Math.min(6, mode.weapons));
  const slot = tokens.component.weaponSlot;
  const pad = 8;
  if (n >= 4) {
    out.tray = bot(408, 372, 224, 152, 'BC');
  } else {
    const w = n * slot.size + (n - 1) * slot.gap + 2 * pad;
    out.tray = bot(520 - w / 2, 372 + 152 - 88, w, 88, 'BC');
  }
  return out;
}

const MIRROR_ANCHOR: Partial<Record<Anchor, Anchor>> = { BL: 'BR', BR: 'BL', ML: 'MR', MR: 'ML' };

function mirror(r: Rect): Rect {
  return { x: logical.width - r.x - r.w, y: r.y, w: r.w, h: r.h };
}

export interface HudLayout {
  rects: Record<string, Rect>;
  /** Ids of the interactive controls present in this layout. */
  controls: ControlId[];
  /** Weapon slot rects, in tray order (weapon 1 first, reading order). */
  slots: Rect[];
  /** UI.md §4.5 clear zone (x 16..944, y 176..328 at M = 16), moved by the margins. */
  clear: Rect;
  handed: Handed;
}

/**
 * Every HUD rect. `s` snaps to 0.5 logical px at S=2 (DR-085); leave it out
 * for exact maths in tests.
 */
export function hudLayout(
  m: Margins,
  handed: Handed,
  mode: HudMode,
  s: 1 | 2 | null = null,
): HudLayout {
  const rects: Record<string, Rect> = {};
  const sn = (r: Rect): Rect => (s ? { x: snap(r.x, s), y: snap(r.y, s), w: r.w, h: r.h } : r);
  for (const [id, sp] of Object.entries(specs(mode))) {
    let r = sp.rect;
    let anchor = sp.anchor;
    if (handed === 'left' && sp.bottom) {
      r = mirror(r);
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
    const col = n >= 4 ? i % 3 : i;
    const row = n >= 4 ? Math.floor(i / 3) : 0;
    const r = {
      x: tray.x + pad + col * (slot.size + slot.gap),
      y:
        tray.y + pad + row * (slot.size + slot.gap) + (n >= 4 ? 0 : (88 - 2 * pad - slot.size) / 2),
      w: slot.size,
      h: slot.size,
    };
    rects[`slot${i}`] = r;
    slots.push(r);
  }

  const controls: ControlId[] = CONTROL_IDS.filter((id) => rects[id] !== undefined);
  for (let i = 0; i < n; i++) controls.push(`slot${i}`);

  const clear = {
    x: m.left,
    y: 176 + (m.top - 16),
    w: logical.width - m.left - m.right,
    h: 328 - (m.bottom - 16) - (176 + (m.top - 16)),
  };
  return { rects, controls, slots, clear, handed };
}

/** True if a point is inside a rect (edges included). */
export function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
