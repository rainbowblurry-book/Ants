/**
 * Terrain on screen (DR-021, DR-024): 12 chunk canvases of 240x180 at 1 px
 * per logical px, one CanvasTexture each. Once per render frame the view
 * drains the grid's dirty rects, merges them, recomposes fill + ink in the
 * merged rect (grown by the ink reach) and re-uploads only the touched chunks.
 */
import type * as Phaser from 'phaser';
import type { TerrainPalette } from '../assets/manifest';
import type { TerrainGrid } from '../sim/terrain';
import {
  bakeFill,
  CHUNK_COLS,
  CHUNK_H,
  CHUNK_ROWS,
  CHUNK_W,
  chunksOf,
  clampRect,
  composeRect,
  growRect,
  INK_REACH,
  rgba32,
  unionRects,
} from './terrainPixels';

interface Chunk {
  col: number;
  row: number;
  tex: Phaser.Textures.CanvasTexture;
  image: ImageData;
  px: Uint32Array;
}

export interface BlastCost {
  ms: number;
  chunks: number;
}

export class TerrainView {
  private chunks: Chunk[] = [];
  private fill: Uint32Array;
  private ink: number;
  readonly images: Phaser.GameObjects.Image[] = [];
  /** Cost of each refresh that did work (DR-024 budget probe). */
  readonly costs: BlastCost[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly grid: TerrainGrid,
    palette: TerrainPalette,
    keyPrefix = 'terrain',
  ) {
    this.fill = bakeFill(grid, palette);
    this.ink = rgba32(palette.ink);
    for (let row = 0; row < CHUNK_ROWS; row++) {
      for (let col = 0; col < CHUNK_COLS; col++) {
        const key = `${keyPrefix}-${col}-${row}`;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const tex = scene.textures.createCanvas(key, CHUNK_W, CHUNK_H);
        if (!tex) throw new Error('terrain: cannot create a canvas texture');
        const image = tex.context.createImageData(CHUNK_W, CHUNK_H);
        const px = new Uint32Array(image.data.buffer);
        this.chunks.push({ col, row, tex, image, px });
        this.images.push(scene.add.image(col * CHUNK_W, row * CHUNK_H, key).setOrigin(0, 0));
      }
    }
    // The first draw covers everything; any dirty rects so far are included.
    grid.drainDirty();
    this.redraw({ x: 0, y: 0, w: grid.w, h: grid.h });
  }

  private chunk(col: number, row: number): Chunk {
    return this.chunks[row * CHUNK_COLS + col] as Chunk;
  }

  private redraw(area: { x: number; y: number; w: number; h: number }): number {
    const r = clampRect(area, this.grid.w, this.grid.h);
    const touched = chunksOf(r);
    for (const { col, row } of touched) {
      const c = this.chunk(col, row);
      const cr = clampRect(
        {
          x: Math.max(r.x, col * CHUNK_W),
          y: Math.max(r.y, row * CHUNK_H),
          w: Math.min(r.x + r.w, (col + 1) * CHUNK_W) - Math.max(r.x, col * CHUNK_W),
          h: Math.min(r.y + r.h, (row + 1) * CHUNK_H) - Math.max(r.y, row * CHUNK_H),
        },
        this.grid.w,
        this.grid.h,
      );
      if (cr.w <= 0 || cr.h <= 0) continue;
      composeRect(this.grid, this.fill, this.ink, cr, c.px, CHUNK_W, col * CHUNK_W, row * CHUNK_H);
      c.tex.context.putImageData(c.image, 0, 0);
      c.tex.refresh();
    }
    return touched.length;
  }

  /** Call once per render frame. Returns true when something was redrawn. */
  sync(): boolean {
    const rects = this.grid.drainDirty();
    const merged = unionRects(rects);
    if (!merged) return false;
    const t0 = performance.now();
    const n = this.redraw(growRect(merged, INK_REACH + 1));
    this.costs.push({ ms: performance.now() - t0, chunks: n });
    if (this.costs.length > 64) this.costs.shift();
    return true;
  }

  /** RGBA of one world pixel as drawn (tests and probes). */
  pixel(x: number, y: number): [number, number, number, number] {
    const col = Math.floor(x / CHUNK_W);
    const row = Math.floor(y / CHUNK_H);
    const c = this.chunks[row * CHUNK_COLS + col];
    if (!c) return [0, 0, 0, 0];
    const v =
      c.px[(Math.floor(y) - row * CHUNK_H) * CHUNK_W + (Math.floor(x) - col * CHUNK_W)] ?? 0;
    return [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24];
  }

  get chunkCount(): number {
    return this.chunks.length;
  }
}
