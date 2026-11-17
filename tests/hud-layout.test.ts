/**
 * UI.md §6 check 3 (DR-082, DR-120): for both handedness settings and at
 * margins 16 and 24, every hit rect is at least 64, the gaps are at least 8,
 * nothing overlaps or leaves the safe rect, FIRE keeps 32 from every other
 * hit rect, and the clear zone holds no control.
 */
import { describe, expect, it } from 'vitest';
import { type Handed, type HudMode, hudLayout } from '../src/hud/layout.ts';
import { gap, inside, type Margins, type Rect, safeRect } from '../src/ui/layout.ts';

const HANDS: Handed[] = ['right', 'left'];
const MARGINS: [string, Margins][] = [
  ['16', { top: 16, right: 16, bottom: 16, left: 16 }],
  ['24', { top: 24, right: 24, bottom: 24, left: 24 }],
  ['24 left only', { top: 16, right: 16, bottom: 16, left: 24 }],
  ['24 right and bottom', { top: 16, right: 24, bottom: 24, left: 16 }],
];
const MODES: [string, HudMode][] = [
  ['6 weapons', { weapons: 6 }],
  ['3 weapons', { weapons: 3 }],
  ['1 weapon', { weapons: 1 }],
  ['Level 0 Next', { weapons: 6, level0Next: true }],
  ['boss', { weapons: 6, boss: true }],
];

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe('HUD layout (UI.md §6 check 3)', () => {
  for (const hand of HANDS) {
    for (const [mName, m] of MARGINS) {
      for (const [modeName, mode] of MODES) {
        it(`${hand}-handed, margins ${mName}, ${modeName}`, () => {
          const l = hudLayout(m, hand, mode);
          const safe = safeRect(m);
          const ids = l.controls;
          expect(ids.length).toBeGreaterThan(10);
          for (const id of ids) {
            const r = l.rects[id] as Rect;
            expect(r.w, `${id} width`).toBeGreaterThanOrEqual(64);
            expect(r.h, `${id} height`).toBeGreaterThanOrEqual(64);
            expect(inside(r, safe), `${id} inside safe rect`).toBe(true);
            expect(overlaps(r, l.clear), `${id} in the clear zone`).toBe(false);
          }
          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
              const a = l.rects[ids[i] as string] as Rect;
              const b = l.rects[ids[j] as string] as Rect;
              const g = gap(a, b);
              expect(g, `${ids[i]} / ${ids[j]}`).toBeGreaterThanOrEqual(8);
              if (ids[i] === 'fire' || ids[j] === 'fire') {
                expect(g, `FIRE / ${ids[i] === 'fire' ? ids[j] : ids[i]}`).toBeGreaterThanOrEqual(
                  32,
                );
              }
            }
          }
          // The 2P gate sits in the clear zone (J46) and touches no other control.
          const gate = l.rects.gate as Rect;
          expect(inside(gate, safe)).toBe(true);
          for (const id of ids)
            expect(gap(gate, l.rects[id] as Rect), id).toBeGreaterThanOrEqual(8);
          // ◀ stays left of ▶ in both hands.
          expect((l.rects.walkL as Rect).x).toBeLessThan((l.rects.walkR as Rect).x);
          // Readouts stay on screen too.
          for (const id of ['teamA', 'teamB', 'plate', 'wind', 'moveBar', 'namePill', 'tray']) {
            expect(inside(l.rects[id] as Rect, safe), id).toBe(true);
          }
        });
      }
    }
  }

  it('matches the UI.md §4.5 rects at M = 16, right-handed', () => {
    const l = hudLayout({ top: 16, right: 16, bottom: 16, left: 16 }, 'right', { weapons: 6 });
    expect(l.rects.fire).toEqual({ x: 824, y: 404, w: 120, h: 120 });
    expect(l.rects.fireVisual).toEqual({ x: 832, y: 412, w: 104, h: 104 });
    expect(l.rects.dial).toEqual({ x: 16, y: 380, w: 144, h: 144 });
    expect(l.rects.pause).toEqual({ x: 880, y: 16, w: 64, h: 64 });
    expect(l.slots[0]).toEqual({ x: 416, y: 380, w: 64, h: 64 });
    expect(l.slots[5]).toEqual({ x: 560, y: 452, w: 64, h: 64 });
    expect(l.clear).toEqual({ x: 16, y: 176, w: 928, h: 152 });
  });

  it("left-handed mirrors the bottom only, x' = 960 − x − w", () => {
    const m = { top: 16, right: 16, bottom: 16, left: 16 };
    const r = hudLayout(m, 'right', { weapons: 6 });
    const l = hudLayout(m, 'left', { weapons: 6 });
    expect(l.rects.fire).toEqual({ x: 16, y: 404, w: 120, h: 120 });
    expect(l.rects.dial).toEqual({ x: 800, y: 380, w: 144, h: 144 });
    expect(l.rects.walkL).toEqual({ x: 568, y: 452, w: 72, h: 72 });
    expect(l.rects.walkR).toEqual({ x: 648, y: 452, w: 72, h: 72 });
    for (const id of ['teamA', 'teamB', 'plate', 'wind', 'pause', 'find', 'gate'])
      expect(l.rects[id], id).toEqual(r.rects[id]);
  });

  it('snaps to 0.5 px at S=2', () => {
    const l = hudLayout(
      { top: 16.5, right: 21.5, bottom: 16, left: 16 },
      'right',
      { weapons: 6 },
      2,
    );
    for (const r of Object.values(l.rects)) {
      expect(Number.isInteger(r.x * 2)).toBe(true);
      expect(Number.isInteger(r.y * 2)).toBe(true);
    }
  });
});
