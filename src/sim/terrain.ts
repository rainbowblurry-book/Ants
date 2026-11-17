/**
 * Destructible terrain grid (DR-020, DR-021, DR-022, J2, J25).
 *
 * One cell per logical px, holding a material id 0..7. The sim owns the grid;
 * the renderer only drains dirty rects and redraws from it.
 */

export const Material = {
  EMPTY: 0,
  SOIL: 1,
  SOFT: 2,
  HARD: 3,
  ROCK: 4,
  BOUNCY: 5,
  SLICK: 6,
  WATER: 7,
} as const;
export type MaterialId = (typeof Material)[keyof typeof Material];
export const MATERIAL_COUNT = 8;

/** Crater multiplier per material (DR-022). ROCK is 0: never erased. */
export const CRATER_MULT: readonly number[] = [0, 1.0, 1.5, 0.5, 0, 0.6, 1.0, 0];
/** Restitution e per material (DR-022). */
export const RESTITUTION: readonly number[] = [0, 0.35, 0.1, 0.3, 0.35, 0.85, 0.4, 0];
/**
 * Friction mu per material (DR-022). Used for projectile tangential friction.
 * Ant movement on SLICK uses DR-036's numbers instead (J2).
 */
export const FRICTION: readonly number[] = [0, 0.8, 0.9, 0.7, 0.7, 0.6, 0.05, 0];
/** The largest crater multiplier, used to size the erase box. */
const MAX_CRATER_MULT = 1.5;

/** Detached solid fragments smaller than this are deleted after an erase (DR-021). */
export const FRAGMENT_MIN_CELLS = 60;

export const WORLD_W = 960;
export const WORLD_H = 540;

/** What lies below the grid (DR-026). Only `floor` is solid out of bounds. */
export type Bottom = 'void' | 'water' | 'floor';

export function isSolidMaterial(m: number): boolean {
  return m >= Material.SOIL && m <= Material.SLICK;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Keep-out test for `fill`: return true to leave the cell at (x, y) alone. */
export type KeepOut = (x: number, y: number) => boolean;

export class TerrainGrid {
  readonly w: number;
  readonly h: number;
  readonly cells: Uint8Array;
  readonly bottom: Bottom;
  private dirty: Rect[] = [];
  /** Per-cell visit stamp for the fragment flood fill. */
  private mark: Int32Array;
  private gen = 0;
  /** Reusable buffers for the flood fill. */
  private queue: Int32Array;
  private erased: Int32Array;

  constructor(w: number, h: number, bottom: Bottom = 'void', cells?: Uint8Array) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      throw new RangeError(`TerrainGrid: bad size ${w}x${h}`);
    }
    this.w = w;
    this.h = h;
    this.bottom = bottom;
    if (cells) {
      if (cells.length !== w * h) throw new RangeError('TerrainGrid: cells length mismatch');
      for (let i = 0; i < cells.length; i++) {
        if ((cells[i] as number) >= MATERIAL_COUNT) {
          throw new RangeError(`TerrainGrid: bad material ${cells[i]} at ${i}`);
        }
      }
      this.cells = cells;
    } else {
      this.cells = new Uint8Array(w * h);
    }
    this.mark = new Int32Array(w * h);
    this.queue = new Int32Array(w * h);
    this.erased = new Int32Array(w * h);
  }

  /** Material at a point. Coordinates are floored to the cell. */
  materialAt(x: number, y: number): number {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx < 0 || cx >= this.w || cy < 0) return Material.EMPTY;
    if (cy >= this.h) return this.bottom === 'floor' ? Material.SOIL : Material.EMPTY;
    return this.cells[cy * this.w + cx] as number;
  }

  /** True if the point is inside solid terrain. Out of bounds is empty, except a floor bottom. */
  solidAt(x: number, y: number): boolean {
    return isSolidMaterial(this.materialAt(x, y));
  }

  /** Sets one cell (level building and tests). Does not push a dirty rect. */
  set(x: number, y: number, m: number): void {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.cells[y * this.w + x] = m;
  }

  /** Fills an axis-aligned box with a material (level building and tests). */
  fillRect(x: number, y: number, w: number, h: number, m: number): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) this.cells.fill(m, yy * this.w + x0, yy * this.w + x1);
  }

  /**
   * Blasts a crater (DR-021, DR-022). A solid cell is erased when the distance
   * from its centre to (cx, cy) is at most r × its crater multiplier. WATER and
   * EMPTY are untouched. Then small fragments cut loose by this erase are
   * deleted. Returns the number of cells removed, fragments included.
   */
  erase(cx: number, cy: number, r: number): number {
    if (!(r > 0)) return 0;
    const reach = r * MAX_CRATER_MULT;
    const x0 = Math.max(0, Math.floor(cx - reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + reach));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + reach));
    const box = new BoxAcc();
    let count = 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * this.w;
      for (let x = x0; x <= x1; x++) {
        const i = row + x;
        const m = this.cells[i] as number;
        if (!isSolidMaterial(m)) continue;
        const mult = CRATER_MULT[m] as number;
        if (mult === 0) continue;
        const dx = x + 0.5 - cx;
        const lim = r * mult;
        if (dx * dx + dy * dy <= lim * lim) {
          this.cells[i] = Material.EMPTY;
          this.erased[count++] = i;
          box.add(x, y);
        }
      }
    }
    if (count === 0) return 0;
    const removed = this.removeFragments(count, box);
    this.pushDirty(box);
    return count + removed;
  }

  /**
   * Adds terrain (J25, Mound Plop): EMPTY and WATER cells whose centre is
   * within r of (cx, cy) become `material`, unless `keepOut` says no.
   * Returns the number of cells filled.
   */
  fill(cx: number, cy: number, r: number, material: number, keepOut?: KeepOut): number {
    if (!(r > 0)) return 0;
    if (!isSolidMaterial(material)) throw new RangeError(`fill: ${material} is not solid`);
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    const box = new BoxAcc();
    let count = 0;
    const rr = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * this.w;
      for (let x = x0; x <= x1; x++) {
        const i = row + x;
        const m = this.cells[i] as number;
        if (m !== Material.EMPTY && m !== Material.WATER) continue;
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy > rr) continue;
        if (keepOut?.(x + 0.5, y + 0.5)) continue;
        this.cells[i] = material;
        count++;
        box.add(x, y);
      }
    }
    if (count > 0) this.pushDirty(box);
    return count;
  }

  /** Returns and clears the dirty rects pushed since the last drain. */
  drainDirty(): Rect[] {
    const out = this.dirty;
    this.dirty = [];
    return out;
  }

  /** Dirty rects waiting for the renderer (read-only peek). */
  pendingDirty(): readonly Rect[] {
    return this.dirty;
  }

  /** FNV-1a hash of the cells, for replay and determinism checks. */
  hash(): number {
    let h = 0x811c9dc5;
    const c = this.cells;
    for (let i = 0; i < c.length; i++) {
      h ^= c[i] as number;
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  clone(): TerrainGrid {
    return new TerrainGrid(this.w, this.h, this.bottom, this.cells.slice());
  }

  private pushDirty(box: BoxAcc): void {
    this.dirty.push({ x: box.x0, y: box.y0, w: box.x1 - box.x0 + 1, h: box.y1 - box.y0 + 1 });
  }

  /**
   * Deletes solid fragments of fewer than FRAGMENT_MIN_CELLS cells that touch
   * a cell this erase removed (DR-021). Connectivity is 4-neighbour. A piece
   * resting on a `floor` bottom counts as attached. Deterministic: seeds are
   * visited in erase order, neighbours in a fixed order.
   */
  private removeFragments(erasedCount: number, box: BoxAcc): number {
    const w = this.w;
    const h = this.h;
    const cells = this.cells;
    const mark = this.mark;
    const queue = this.queue;
    this.gen++;
    if (this.gen === 0x7fffffff) {
      mark.fill(0);
      this.gen = 1;
    }
    const gen = this.gen;
    let removed = 0;
    for (let e = 0; e < erasedCount; e++) {
      const ei = this.erased[e] as number;
      const ex = ei % w;
      const ey = (ei - ex) / w;
      for (let k = 0; k < 4; k++) {
        const nx = ex + (k === 0 ? -1 : k === 1 ? 1 : 0);
        const ny = ey + (k === 2 ? -1 : k === 3 ? 1 : 0);
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const seed = ny * w + nx;
        if (mark[seed] === gen || !isSolidMaterial(cells[seed] as number)) continue;
        // Flood fill until the piece is known to be big enough to keep.
        let head = 0;
        let tail = 0;
        queue[tail++] = seed;
        mark[seed] = gen;
        let big = false;
        while (head < tail) {
          const i = queue[head++] as number;
          const x = i % w;
          const y = (i - x) / w;
          if (y === h - 1 && this.bottom === 'floor') {
            big = true;
            break;
          }
          for (let q = 0; q < 4; q++) {
            const ax = x + (q === 0 ? -1 : q === 1 ? 1 : 0);
            const ay = y + (q === 2 ? -1 : q === 3 ? 1 : 0);
            if (ax < 0 || ax >= w || ay < 0 || ay >= h) continue;
            const j = ay * w + ax;
            if (!isSolidMaterial(cells[j] as number)) continue;
            if (mark[j] === gen) {
              // Reached a piece an earlier fill this call already kept.
              if (!inQueue(queue, tail, j)) {
                big = true;
                break;
              }
              continue;
            }
            mark[j] = gen;
            queue[tail++] = j;
            if (tail >= FRAGMENT_MIN_CELLS) {
              big = true;
              break;
            }
          }
          if (big) break;
        }
        if (big) continue;
        for (let t = 0; t < tail; t++) {
          const i = queue[t] as number;
          cells[i] = Material.EMPTY;
          const x = i % w;
          box.add(x, (i - x) / w);
        }
        removed += tail;
      }
    }
    return removed;
  }
}

/** True if j is among the first `tail` queue entries (tail < FRAGMENT_MIN_CELLS). */
function inQueue(queue: Int32Array, tail: number, j: number): boolean {
  for (let t = 0; t < tail; t++) if (queue[t] === j) return true;
  return false;
}

/** Bounding box accumulator for dirty rects. */
class BoxAcc {
  x0 = Number.POSITIVE_INFINITY;
  y0 = Number.POSITIVE_INFINITY;
  x1 = Number.NEGATIVE_INFINITY;
  y1 = Number.NEGATIVE_INFINITY;
  add(x: number, y: number): void {
    if (x < this.x0) this.x0 = x;
    if (y < this.y0) this.y0 = y;
    if (x > this.x1) this.x1 = x;
    if (y > this.y1) this.y1 = y;
  }
}

// ---------------------------------------------------------------------------
// RLE mask format (DR-025): row-major runs of (material byte, varint length).
// ---------------------------------------------------------------------------

/** Encodes cells as (value, LEB128 varint run length) pairs. */
export function encodeRle(cells: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < cells.length) {
    const v = cells[i] as number;
    let run = 1;
    while (i + run < cells.length && cells[i + run] === v) run++;
    out.push(v);
    let n = run;
    while (n >= 0x80) {
      out.push((n & 0x7f) | 0x80);
      n = Math.floor(n / 128);
    }
    out.push(n);
    i += run;
  }
  return Uint8Array.from(out);
}

/** Decodes an RLE mask. Throws if it does not fill exactly `length` cells. */
export function decodeRle(bytes: Uint8Array, length: number): Uint8Array {
  const cells = new Uint8Array(length);
  let p = 0;
  let o = 0;
  while (p < bytes.length) {
    const v = bytes[p++] as number;
    if (v >= MATERIAL_COUNT) throw new RangeError(`decodeRle: bad material ${v}`);
    let run = 0;
    let mul = 1;
    for (;;) {
      if (p >= bytes.length) throw new RangeError('decodeRle: truncated run length');
      const b = bytes[p++] as number;
      run += (b & 0x7f) * mul;
      if (b < 0x80) break;
      mul *= 128;
      if (mul > 268435456) throw new RangeError('decodeRle: run length too long');
    }
    if (run === 0 || o + run > length) throw new RangeError('decodeRle: run overflows the grid');
    cells.fill(v, o, o + run);
    o += run;
  }
  if (o !== length) throw new RangeError(`decodeRle: filled ${o} of ${length} cells`);
  return cells;
}
