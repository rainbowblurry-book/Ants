import { describe, expect, it } from 'vitest';
import {
  CRATER_MULT,
  decodeRle,
  encodeRle,
  FRAGMENT_MIN_CELLS,
  Material,
  TerrainGrid,
  WORLD_H,
  WORLD_W,
} from '../src/sim/terrain.ts';

const M = Material;

/** A grid filled solid with one material below y = top. */
function slab(material: number, top = 270, w = WORLD_W, h = WORLD_H): TerrainGrid {
  const g = new TerrainGrid(w, h);
  g.fillRect(0, top, w, h - top, material);
  return g;
}

function countSolid(g: TerrainGrid): number {
  let n = 0;
  for (let i = 0; i < g.cells.length; i++) {
    const m = g.cells[i] as number;
    if (m >= 1 && m <= 6) n++;
  }
  return n;
}

/** How far straight down from the blast centre the crater reaches. */
function craterDepth(g: TerrainGrid, x: number, top: number): number {
  let y = top;
  while (y < g.h && !g.solidAt(x + 0.5, y + 0.5)) y++;
  return y - top;
}

describe('terrain grid (DR-021, DR-022)', () => {
  it('is 960x540, one byte per px (518,400 bytes)', () => {
    const g = new TerrainGrid(WORLD_W, WORLD_H);
    expect(g.cells.length).toBe(518400);
    expect(g.cells.byteLength).toBe(518400);
  });

  it('has the DR-022 crater multipliers', () => {
    expect(CRATER_MULT).toEqual([0, 1.0, 1.5, 0.5, 0, 0.6, 1.0, 0]);
  });

  it('solidAt reads the grid; out of bounds is empty except a floor bottom', () => {
    const g = slab(M.SOIL, 500);
    expect(g.solidAt(10, 499)).toBe(false);
    expect(g.solidAt(10, 500)).toBe(true);
    expect(g.solidAt(10.9, 500.9)).toBe(true);
    expect(g.solidAt(-1, 520)).toBe(false);
    expect(g.solidAt(960, 520)).toBe(false);
    expect(g.solidAt(10, 540)).toBe(false);
    expect(g.solidAt(10, -1)).toBe(false);
    const f = new TerrainGrid(100, 100, 'floor');
    expect(f.solidAt(50, 100)).toBe(true);
    expect(f.solidAt(50, 99)).toBe(false);
    expect(f.solidAt(-1, 100)).toBe(false);
  });

  it('WATER is not solid and is never erased', () => {
    const g = slab(M.WATER, 300);
    expect(g.solidAt(100, 400)).toBe(false);
    expect(g.erase(100, 400, 40)).toBe(0);
    expect(g.materialAt(100, 400)).toBe(M.WATER);
  });

  it('erases per material: SOIL r, SOFT 1.5r, HARD 0.5r, BOUNCY 0.6r, SLICK r, ROCK never', () => {
    const r = 40;
    const top = 270;
    const expected: [number, number][] = [
      [M.SOIL, 1.0],
      [M.SOFT, 1.5],
      [M.HARD, 0.5],
      [M.BOUNCY, 0.6],
      [M.SLICK, 1.0],
      [M.ROCK, 0],
    ];
    for (const [mat, mult] of expected) {
      const g = slab(mat, top);
      g.erase(480, top, r);
      // Crater depth below the surface equals r × mult (to the cell).
      expect(Math.abs(craterDepth(g, 480, top) - r * mult), `material ${mat}`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  it('erases a round crater: every removed cell is within r of the centre', () => {
    const g = slab(M.SOIL, 0);
    const before = g.cells.slice();
    const n = g.erase(300.5, 200.5, 28);
    expect(n).toBeGreaterThan(0);
    let count = 0;
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (before[i] !== g.cells[i]) {
          count++;
          const dx = x + 0.5 - 300.5;
          const dy = y + 0.5 - 200.5;
          expect(dx * dx + dy * dy).toBeLessThanOrEqual(28 * 28);
        }
      }
    }
    expect(count).toBe(n);
    // Area is close to πr².
    expect(Math.abs(n - Math.PI * 28 * 28) / (Math.PI * 28 * 28)).toBeLessThan(0.02);
  });

  it('a mixed border erases each cell by its own material', () => {
    const g = new TerrainGrid(200, 200);
    g.fillRect(0, 100, 100, 100, M.SOFT);
    g.fillRect(100, 100, 100, 100, M.HARD);
    g.erase(100, 100, 40);
    expect(craterDepth(g, 60, 100)).toBeGreaterThan(0); // SOFT: 1.5r reaches x 60
    expect(craterDepth(g, 101, 100)).toBeLessThanOrEqual(21); // HARD: 0.5r = 20
    expect(craterDepth(g, 99, 100)).toBeGreaterThanOrEqual(59); // SOFT: 1.5r = 60
  });

  it('deletes detached fragments under 60 cells inside the dirty rect', () => {
    const g = new TerrainGrid(200, 200);
    g.fillRect(0, 150, 200, 50, M.SOIL); // ground
    // A 7x7 blob (49 cells) joined to the ground by a 1-px stalk of 10 cells.
    g.fillRect(100, 130, 7, 7, M.SOIL);
    g.fillRect(103, 137, 1, 13, M.SOIL);
    const before = countSolid(g);
    // Blast the stalk only: the blob is cut loose and must be deleted.
    const n = g.erase(103.5, 144, 3);
    expect(n).toBeGreaterThan(0);
    for (let y = 130; y < 137; y++)
      for (let x = 100; x < 107; x++) expect(g.solidAt(x, y)).toBe(false);
    expect(countSolid(g)).toBe(before - n);
  });

  it('keeps detached pieces of 60 cells or more (floating islands stay)', () => {
    const g = new TerrainGrid(200, 200);
    g.fillRect(0, 150, 200, 50, M.SOIL);
    g.fillRect(100, 130, 10, 6, M.SOIL); // 60 cells
    g.fillRect(104, 136, 1, 14, M.SOIL);
    g.erase(104.5, 144, 3);
    let blob = 0;
    for (let y = 130; y < 136; y++) for (let x = 100; x < 110; x++) if (g.solidAt(x, y)) blob++;
    expect(blob).toBe(FRAGMENT_MIN_CELLS);
  });

  it('leaves small pieces alone when this erase did not touch them', () => {
    const g = new TerrainGrid(200, 200);
    g.fillRect(0, 150, 200, 50, M.SOIL);
    g.fillRect(20, 20, 6, 6, M.ROCK); // an authored 36-cell pebble far away
    g.erase(150, 150, 20);
    expect(g.solidAt(22, 22)).toBe(true);
  });

  it('a piece resting on a floor bottom counts as attached', () => {
    const g = new TerrainGrid(100, 100, 'floor');
    g.fillRect(40, 95, 5, 5, M.SOIL); // 25 cells on the bottom row
    g.fillRect(45, 95, 5, 5, M.SOIL);
    g.erase(50, 97, 2.5);
    expect(g.solidAt(41, 98)).toBe(true);
  });

  it('pushes one dirty rect per erase or fill, covering every changed cell', () => {
    const g = slab(M.SOIL, 270);
    expect(g.erase(480, 270, 28)).toBeGreaterThan(0);
    const rects = g.drainDirty();
    expect(rects).toHaveLength(1);
    const r = rects[0] as { x: number; y: number; w: number; h: number };
    expect(r.x).toBeGreaterThanOrEqual(452);
    expect(r.x + r.w).toBeLessThanOrEqual(509);
    expect(r.y).toBe(270);
    expect(g.drainDirty()).toEqual([]);
    expect(g.erase(480, 10, 20)).toBe(0); // in the air: nothing changes
    expect(g.drainDirty()).toEqual([]);
  });

  it('fill (J25) turns EMPTY and WATER into the material, honours keep-out, pushes a rect', () => {
    const g = new TerrainGrid(200, 200);
    g.fillRect(0, 150, 200, 50, M.WATER);
    g.fillRect(0, 100, 50, 50, M.ROCK);
    const n = g.fill(100, 150, 34, M.SOIL, (x, y) => {
      const dx = x - 130;
      const dy = y - 150;
      return dx * dx + dy * dy < 18 * 18;
    });
    expect(n).toBeGreaterThan(0);
    expect(g.materialAt(100, 150)).toBe(M.SOIL); // was WATER
    expect(g.materialAt(100, 130)).toBe(M.SOIL); // was EMPTY
    expect(g.materialAt(130, 150)).toBe(M.WATER); // keep-out
    expect(g.materialAt(40, 140)).toBe(M.ROCK); // solid is never replaced
    expect(g.drainDirty()).toHaveLength(1);
    expect(() => g.fill(10, 10, 5, M.WATER)).toThrow();
  });

  it('erase is deterministic: same blasts, same hash', () => {
    const run = () => {
      const g = slab(M.SOFT, 200);
      g.fillRect(300, 150, 200, 80, M.HARD);
      for (let i = 0; i < 30; i++) g.erase(200 + i * 17.3, 210 + (i % 5) * 9.1, 18 + (i % 4) * 10);
      return g.hash();
    };
    expect(run()).toBe(run());
  });
});

describe('RLE mask (DR-025)', () => {
  it('round-trips a level-like grid', () => {
    const g = slab(M.SOIL, 300);
    g.fillRect(100, 250, 120, 50, M.HARD);
    g.fillRect(500, 200, 40, 100, M.ROCK);
    g.fillRect(0, 500, 960, 40, M.WATER);
    for (let i = 0; i < 20; i++) g.erase(80 + i * 41, 300, 25);
    const bytes = encodeRle(g.cells);
    expect(bytes.length).toBeLessThan(20000);
    expect(decodeRle(bytes, g.cells.length)).toEqual(g.cells);
  });

  it('round-trips edge cases: one run, all different, long varints', () => {
    const one = new Uint8Array(518400).fill(M.SOIL);
    const enc = encodeRle(one);
    expect(enc.length).toBe(1 + 3); // 518400 needs a 3-byte varint
    expect(decodeRle(enc, one.length)).toEqual(one);
    const alt = Uint8Array.from({ length: 1000 }, (_, i) => i % 8);
    expect(decodeRle(encodeRle(alt), alt.length)).toEqual(alt);
    expect(decodeRle(encodeRle(new Uint8Array(0)), 0)).toEqual(new Uint8Array(0));
  });

  it('rejects bad masks', () => {
    expect(() => decodeRle(Uint8Array.from([1, 5]), 6)).toThrow(); // too short
    expect(() => decodeRle(Uint8Array.from([1, 7]), 6)).toThrow(); // too long
    expect(() => decodeRle(Uint8Array.from([9, 6]), 6)).toThrow(); // bad material
    expect(() => decodeRle(Uint8Array.from([1, 0x80]), 6)).toThrow(); // truncated
    expect(() => new TerrainGrid(2, 2, 'void', Uint8Array.from([0, 1, 2, 8]))).toThrow();
  });
});
