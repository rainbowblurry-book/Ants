/**
 * Angle helpers built on the literal trig table (DR-011, J9). No Math.atan2
 * or Math.asin: angles are found by searching the table.
 */
import { cosDeci, SIN_QUARTER, sinDeci } from './trig.ts';

/**
 * The angle in 0..900 tenths of a degree whose sine is closest to s (0..1).
 * Values outside 0..1 are clamped.
 */
export function asinDeci(s: number): number {
  if (!(s > 0)) return 0;
  if (s >= 1) return 900;
  let lo = 0;
  let hi = 900;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((SIN_QUARTER[mid] as number) < s) lo = mid;
    else hi = mid;
  }
  const dl = s - (SIN_QUARTER[lo] as number);
  const dh = (SIN_QUARTER[hi] as number) - s;
  return dl <= dh ? lo : hi;
}

/** Slope angle (0..900 deci) of a rise over a run, from the ratio dy / sqrt(dx² + dy²). */
export function slopeDeci(rise: number, run: number): number {
  const ar = rise < 0 ? -rise : rise;
  const len = Math.sqrt(run * run + ar * ar);
  if (len === 0) return 0;
  return asinDeci(ar / len);
}

/** Rotates a vector by an integer angle in tenths of a degree (screen axes). */
export function rotateDeci(x: number, y: number, deci: number): { x: number; y: number } {
  const c = cosDeci(deci);
  const s = sinDeci(deci);
  return { x: x * c - y * s, y: x * s + y * c };
}
