/**
 * Terrain pixels (DR-021, DR-024, DR-001). Pure, so node tests can check it.
 *
 * - Fill colours are baked once from the initial mask and a palette. A
 *   surface band covers the top 10 px under the initial empty space and never
 *   regrows (DR-021).
 * - The outline is two box-blur passes (radius 2) over the solid mask, giving
 *   S in 0..1, then an ink-alpha LUT that peaks at S = 0.5 (about 4.5 px
 *   wide). Out-of-bounds reads the nearest in-bounds cell, so there is no ink
 *   at the screen edges (DR-024).
 * - Only a dirty rect is recomputed. Output is RGBA in a Uint32Array view
 *   (little-endian: 0xAABBGGRR), straight alpha, for a canvas ImageData.
 */
import type { TerrainPalette } from '../assets/manifest';
import { isSolidMaterial, Material, type Rect, type TerrainGrid } from '../sim/terrain';

export const CHUNK_W = 240;
export const CHUNK_H = 180;
export const CHUNK_COLS = 4;
export const CHUNK_ROWS = 3;
/** DR-021: the surface band is 10 px deep. */
export const BAND_PX = 10;
/** DR-024: box-blur radius and passes. */
export const BLUR_R = 2;
export const BLUR_PASSES = 2;
/** Ink can reach this far from the mask edge; a dirty rect grows by it. */
export const INK_REACH = BLUR_R * BLUR_PASSES + 1;

/** 0xRRGGBB + alpha -> 0xAABBGGRR. */
export function rgba32(rgb: number, a = 255): number {
  return (((a & 255) << 24) | ((rgb & 255) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 255)) >>> 0;
}

/**
 * Ink alpha by S (0..255 -> 0..255). Full ink for |S − 0.5| ≤ 0.30, fading
 * to none at 0.40: on a straight edge that is about 4.5 px of solid ink.
 */
export const INK_FULL = 0.3;
export const INK_ZERO = 0.4;
export const INK_LUT: Uint8Array = (() => {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const d = Math.abs(i / 255 - 0.5);
    const a = d <= INK_FULL ? 1 : d >= INK_ZERO ? 0 : (INK_ZERO - d) / (INK_ZERO - INK_FULL);
    lut[i] = Math.round(a * 255);
  }
  return lut;
})();

/**
 * The fill colour of every cell (0 = transparent), from the initial mask.
 * Solid cells in the first BAND_PX rows below an empty cell take the band.
 */
export function bakeFill(grid: TerrainGrid, palette: TerrainPalette): Uint32Array {
  const { w, h, cells } = grid;
  const out = new Uint32Array(w * h);
  const fills = palette.fill.map((c) => (c === null ? 0 : rgba32(c)));
  const band = rgba32(palette.band);
  for (let x = 0; x < w; x++) {
    let sinceEmpty = Number.POSITIVE_INFINITY;
    for (let y = 0; y < h; y++) {
      const i = y * w + x;
      const m = cells[i] as number;
      if (!isSolidMaterial(m)) {
        sinceEmpty = 0;
        out[i] = fills[m] ?? 0;
        continue;
      }
      sinceEmpty++;
      // ROCK and SLICK keep their own face; soil-like ground gets the band.
      const banded = sinceEmpty <= BAND_PX && m !== Material.ROCK && m !== Material.SLICK;
      out[i] = banded ? band : (fills[m] ?? 0);
    }
  }
  return out;
}

/** Intersection of a rect with the grid, in whole cells. */
export function clampRect(r: Rect, w: number, h: number): Rect {
  const x0 = Math.max(0, Math.floor(r.x));
  const y0 = Math.max(0, Math.floor(r.y));
  const x1 = Math.min(w, Math.ceil(r.x + r.w));
  const y1 = Math.min(h, Math.ceil(r.y + r.h));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

export function growRect(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

/** Union of rects (one bounding box; DR-024 merges a blast's rects). */
export function unionRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * S (0..255) over `rect`: the solid mask blurred twice with a radius-2 box,
 * separably. Reads out to BLUR_R × BLUR_PASSES around the rect, clamping
 * coordinates to the grid.
 */
export function blurSolid(grid: TerrainGrid, rect: Rect): Uint8Array {
  const m = BLUR_R * BLUR_PASSES;
  const bw = rect.w + m * 2;
  const bh = rect.h + m * 2;
  const gw = grid.w;
  const gh = grid.h;
  let a = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    const gy = Math.min(gh - 1, Math.max(0, rect.y - m + y));
    for (let x = 0; x < bw; x++) {
      const gx = Math.min(gw - 1, Math.max(0, rect.x - m + x));
      a[y * bw + x] = isSolidMaterial(grid.cells[gy * gw + gx] as number) ? 1 : 0;
    }
  }
  let b = new Float32Array(bw * bh);
  const k = BLUR_R * 2 + 1;
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    // Horizontal, edge-clamped.
    for (let y = 0; y < bh; y++) {
      const row = y * bw;
      for (let x = 0; x < bw; x++) {
        let s = 0;
        for (let d = -BLUR_R; d <= BLUR_R; d++)
          s += a[row + Math.min(bw - 1, Math.max(0, x + d))] as number;
        b[row + x] = s / k;
      }
    }
    [a, b] = [b, a];
    // Vertical, edge-clamped.
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let s = 0;
        for (let d = -BLUR_R; d <= BLUR_R; d++)
          s += a[Math.min(bh - 1, Math.max(0, y + d)) * bw + x] as number;
        b[y * bw + x] = s / k;
      }
    }
    [a, b] = [b, a];
  }
  const out = new Uint8Array(rect.w * rect.h);
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      out[y * rect.w + x] = Math.round((a[(y + m) * bw + (x + m)] as number) * 255);
    }
  }
  return out;
}

/**
 * Writes fill + ink for `rect` (grid cells) into `out`, an RGBA32 buffer of
 * `outW` columns whose top-left is grid cell (ox, oy).
 */
export function composeRect(
  grid: TerrainGrid,
  fill: Uint32Array,
  ink: number,
  rect: Rect,
  out: Uint32Array,
  outW: number,
  ox: number,
  oy: number,
): void {
  const s = blurSolid(grid, rect);
  const ir = ink & 255;
  const ig = (ink >> 8) & 255;
  const ib = (ink >> 16) & 255;
  for (let y = 0; y < rect.h; y++) {
    const gy = rect.y + y;
    for (let x = 0; x < rect.w; x++) {
      const gx = rect.x + x;
      const base = fill[gy * grid.w + gx] as number;
      const a = INK_LUT[s[y * rect.w + x] as number] as number;
      let px = base;
      if (a > 0) {
        const ba = base >>> 24;
        if (ba === 0) {
          px = ((a << 24) | (ib << 16) | (ig << 8) | ir) >>> 0;
        } else {
          const t = a / 255;
          const r = Math.round((base & 255) * (1 - t) + ir * t);
          const g = Math.round(((base >> 8) & 255) * (1 - t) + ig * t);
          const b = Math.round(((base >> 16) & 255) * (1 - t) + ib * t);
          px = ((ba << 24) | (b << 16) | (g << 8) | r) >>> 0;
        }
      }
      out[(gy - oy) * outW + (gx - ox)] = px;
    }
  }
}

/** Chunk indexes (col, row) a rect touches. */
export function chunksOf(r: Rect): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  if (r.w <= 0 || r.h <= 0) return out;
  const c0 = Math.max(0, Math.floor(r.x / CHUNK_W));
  const c1 = Math.min(CHUNK_COLS - 1, Math.floor((r.x + r.w - 1) / CHUNK_W));
  const r0 = Math.max(0, Math.floor(r.y / CHUNK_H));
  const r1 = Math.min(CHUNK_ROWS - 1, Math.floor((r.y + r.h - 1) / CHUNK_H));
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) out.push({ col, row });
  return out;
}
