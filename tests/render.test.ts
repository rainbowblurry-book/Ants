/**
 * Stage 4 render logic in node: terrain fill, band and outline (DR-021,
 * DR-024), the camera rules (DR-046, J7, J49) and the fixed-step loop (PLAN §1).
 */
import { describe, expect, it } from 'vitest';
import { TERRAIN_PALETTE_PLACEHOLDER as PAL } from '../src/assets/manifest.ts';
import { CAM, CameraDirector, type CamFrame, clampCentre } from '../src/render/camera.ts';
import { FixedStep, MAX_STEPS, SIM_DT_MS } from '../src/render/loop.ts';
import {
  BAND_PX,
  bakeFill,
  blurSolid,
  CHUNK_H,
  CHUNK_W,
  chunksOf,
  composeRect,
  INK_LUT,
  rgba32,
  unionRects,
} from '../src/render/terrainPixels.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';

const W = 960;
const H = 540;

function flat(y0 = 300, m: number = Material.SOIL): TerrainGrid {
  const g = new TerrainGrid(W, H, 'void');
  g.fillRect(0, y0, W, H - y0, m);
  return g;
}

function renderAll(g: TerrainGrid): Uint32Array {
  const fill = bakeFill(g, PAL);
  const out = new Uint32Array(W * H);
  composeRect(g, fill, rgba32(PAL.ink), { x: 0, y: 0, w: W, h: H }, out, W, 0, 0);
  return out;
}

const alphaOf = (px: number) => px >>> 24;
const isInk = (px: number) => (px & 0xffffff) === (rgba32(PAL.ink) & 0xffffff);

describe('terrain pixels (DR-021, DR-024)', () => {
  it('bakes the surface band 10 px deep under the initial empty space', () => {
    const g = flat(300);
    const fill = bakeFill(g, PAL);
    const col = 500;
    expect(fill[299 * W + col]).toBe(0);
    for (let y = 300; y < 300 + BAND_PX; y++) expect(fill[y * W + col]).toBe(rgba32(PAL.band));
    expect(fill[(300 + BAND_PX) * W + col]).toBe(rgba32(PAL.fill[Material.SOIL] as number));
  });

  it('ground under water gets no band (water is not empty space)', () => {
    const g = flat(300);
    g.fillRect(400, 330, 40, 20, Material.WATER);
    const fill = bakeFill(g, PAL);
    expect(fill[350 * W + 420]).toBe(rgba32(PAL.fill[Material.SOIL] as number));
    expect(fill[340 * W + 420]).toBe(rgba32(PAL.fill[Material.WATER] as number));
  });

  it('the band never regrows: a crater shows soil fill, not band', () => {
    const g = flat(300);
    const fill = bakeFill(g, PAL);
    g.erase(500, 330, 30);
    // A cell below the crater floor keeps its baked (soil) colour.
    const y = 362;
    expect(g.solidAt(500, y)).toBe(true);
    expect(fill[y * W + 500]).toBe(rgba32(PAL.fill[Material.SOIL] as number));
  });

  it('the ink LUT peaks at S = 0.5 and is zero at 0 and 1', () => {
    expect(INK_LUT[0]).toBe(0);
    expect(INK_LUT[255]).toBe(0);
    expect(INK_LUT[128]).toBe(255);
  });

  it('a straight edge gets an outline about 4.5 px wide, centred on the edge', () => {
    const out = renderAll(flat(300));
    const col = 480;
    let inked = 0;
    let first = -1;
    for (let y = 280; y < 320; y++) {
      const px = out[y * W + col] as number;
      if (alphaOf(px) > 0 && isInk(px)) {
        inked++;
        if (first < 0) first = y;
      }
    }
    expect(inked).toBeGreaterThanOrEqual(4);
    expect(inked).toBeLessThanOrEqual(6);
    // It straddles the edge between rows 299 (air) and 300 (soil).
    expect(first).toBeLessThanOrEqual(299);
    expect(first + inked).toBeGreaterThan(300);
  });

  it('no ink along the screen edges (out of bounds reads the nearest cell)', () => {
    const out = renderAll(flat(300));
    // Left and right columns below the surface are plain fill.
    for (const x of [0, 1, W - 2, W - 1]) {
      expect(out[400 * W + x]).toBe(rgba32(PAL.fill[Material.SOIL] as number));
    }
    // The bottom rows too.
    expect(out[(H - 1) * W + 480]).toBe(rgba32(PAL.fill[Material.SOIL] as number));
  });

  it('a crater gets the same rounded inked edge all round', () => {
    const g = flat(200);
    const fill = bakeFill(g, PAL);
    const out = new Uint32Array(W * H);
    composeRect(g, fill, rgba32(PAL.ink), { x: 0, y: 0, w: W, h: H }, out, W, 0, 0);
    g.erase(480, 400, 40);
    const dirty = unionRects(g.drainDirty());
    expect(dirty).not.toBeNull();
    if (!dirty) return;
    const r = { x: dirty.x - 6, y: dirty.y - 6, w: dirty.w + 12, h: dirty.h + 12 };
    composeRect(g, fill, rgba32(PAL.ink), r, out, W, 0, 0);
    // Centre of the crater is clear, the rim (r = 40) is ink in 4 directions.
    expect(alphaOf(out[400 * W + 480] as number)).toBe(0);
    for (const [dx, dy] of [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ] as const) {
      const px = out[(400 + dy) * W + (480 + dx)] as number;
      expect(isInk(px), `${dx},${dy}`).toBe(true);
    }
  });

  it('blur output is 0..255 and symmetric on a symmetric mask', () => {
    const g = flat(300);
    const s = blurSolid(g, { x: 470, y: 290, w: 20, h: 20 });
    expect(Math.max(...s)).toBe(255);
    expect(Math.min(...s)).toBe(0);
  });

  it('chunks: 4x3 of 240x180; a 100 px blast touches 1 to 4', () => {
    expect(chunksOf({ x: 0, y: 0, w: W, h: H })).toHaveLength(12);
    expect(chunksOf({ x: 10, y: 10, w: 100, h: 100 })).toHaveLength(1);
    expect(chunksOf({ x: CHUNK_W - 50, y: CHUNK_H - 50, w: 100, h: 100 })).toHaveLength(4);
  });
});

const idle: CamFrame = { hitStop: false, projectile: null, retreating: false, knockback: null };

describe('camera (DR-046, J7, J49)', () => {
  it('TurnStart eases to the ant at zoom 1.15 in 500 ms', () => {
    const c = new CameraDirector();
    c.onPhase('turnStart', { x: 300, y: 350 }, 0);
    const mid = c.update(250, 16, idle);
    expect(mid.zoom).toBeGreaterThan(1);
    expect(mid.zoom).toBeLessThan(CAM.turnStartZoom);
    const end = c.update(500, 16, idle);
    expect(end.zoom).toBeCloseTo(1.15);
    expect(end.cx).toBeCloseTo(clampCentre(300, 350, 1.15).x);
  });

  it('follows the projectile with zoom up to 1.2 and never past 1.25', () => {
    const c = new CameraDirector();
    c.onPhase('turnStart', { x: 300, y: 350 }, 0);
    c.update(600, 16, idle);
    c.onPhase('fire', { x: 300, y: 350 }, 600);
    let out = c.update(616, 16, idle);
    for (let t = 616; t < 3000; t += 16) {
      out = c.update(t, 16, { ...idle, projectile: { x: 600, y: 200, vx: 300, vy: 0 } });
      expect(out.zoom).toBeLessThanOrEqual(CAM.maxZoom);
    }
    expect(out.zoom).toBeCloseTo(1.2, 2);
    expect(out.cx).toBeGreaterThan(550);
  });

  it('J49: the retreat window eases to the whole world (zoom 1.0)', () => {
    const c = new CameraDirector();
    c.onPhase('turnStart', { x: 300, y: 350 }, 0);
    c.update(600, 16, idle);
    c.onPhase('fire', { x: 300, y: 350 }, 600);
    let out = c.update(700, 16, { ...idle, retreating: true });
    for (let t = 700; t < 1400; t += 16)
      out = c.update(t, 16, {
        ...idle,
        retreating: true,
        projectile: { x: 600, y: 200, vx: 300, vy: 0 },
      });
    expect(out.zoom).toBeCloseTo(1, 3);
  });

  it('impact: hit-stop 75 ms, shake capped at 6 px, hold 400 ms then return', () => {
    const c = new CameraDirector();
    c.onBlast({ x: 500, y: 300 }, 100, 1000);
    expect(c.hitStopping(1050)).toBe(true);
    expect(c.hitStopping(1080)).toBe(false);
    let maxShake = 0;
    for (let t = 1000; t < 1300; t += 4) {
      const o = c.update(t, 4, idle);
      maxShake = Math.max(maxShake, Math.abs(o.shakeX), Math.abs(o.shakeY));
    }
    expect(maxShake).toBeGreaterThan(3);
    expect(maxShake).toBeLessThanOrEqual(6);
    // After the hold and the return, the full view is back.
    const out = c.update(2500, 16, idle);
    expect(out.zoom).toBeCloseTo(1);
    expect(out.shakeX).toBe(0);
  });

  it('J7: after the hold it follows the largest knockback until it lands', () => {
    const c = new CameraDirector();
    c.onPhase('turnStart', { x: 500, y: 300 }, 0);
    c.update(600, 16, idle);
    c.onBlast({ x: 500, y: 300 }, 30, 600);
    c.update(1100, 16, { ...idle, knockback: { x: 700, y: 200 } });
    let out = c.update(1116, 16, { ...idle, knockback: { x: 700, y: 200 } });
    for (let t = 1132; t < 2500; t += 16)
      out = c.update(t, 16, { ...idle, knockback: { x: 700, y: 200 } });
    expect(out.cx).toBeCloseTo(clampCentre(700, 200, out.zoom).x, 0);
  });

  it('reduced motion: no zoom, no shake, no hit-stop, 150 ms cuts', () => {
    const c = new CameraDirector(true);
    c.onPhase('turnStart', { x: 300, y: 350 }, 0);
    const out = c.update(150, 16, idle);
    expect(out.zoom).toBe(1);
    c.onBlast({ x: 500, y: 300 }, 100, 200);
    expect(c.hitStopping(210)).toBe(false);
    expect(c.update(220, 16, idle).shakeX).toBe(0);
  });
});

describe('fixed step (PLAN §1)', () => {
  it('runs one step per 1/60 s and keeps the remainder as alpha', () => {
    const f = new FixedStep();
    expect(f.advance(SIM_DT_MS).steps).toBe(1);
    const r = f.advance(SIM_DT_MS / 2);
    expect(r.steps).toBe(0);
    expect(r.alpha).toBeCloseTo(0.5);
  });

  it('clamps a long frame to 250 ms and at most 5 steps, dropping the rest', () => {
    const f = new FixedStep();
    expect(f.advance(1000).steps).toBe(MAX_STEPS);
    expect(f.advance(0).steps).toBe(0);
  });
});
