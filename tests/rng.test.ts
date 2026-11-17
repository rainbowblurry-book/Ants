import { describe, expect, it } from 'vitest';
import { createStreams, cyrb128, Rng, STREAM_NAMES, streamSeed } from '../src/sim/rng.ts';

/**
 * Independent reference sfc32, in the widely published JavaScript form of
 * PractRand's `tmp = a + b + counter++`: the counter is added, then incremented.
 */
function refSfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
}

const take = (r: Rng, n: number) => Array.from({ length: n }, () => r.nextU32());

describe('rng (DR-011)', () => {
  it('matches a reference sfc32 for the same cyrb128 seed', () => {
    const [a, b, c, d] = cyrb128('1234:L01:wind');
    const ref = refSfc32(a, b, c, d);
    const r = Rng.fromString('1234:L01:wind');
    for (let i = 0; i < 1000; i++) expect(r.nextU32()).toBe(ref());
  });

  it('locks the known-answer vector (changing it breaks every saved replay)', () => {
    expect(cyrb128('')).toEqual([41608494, 3485963809, 1435736333, 1262568316]);
    const r = Rng.fromString('42:L00:terrain');
    expect(take(r, 4)).toEqual([1807241874, 3879322210, 3824054657, 1255271543]);
  });

  it('gives the same sequence for the same seed', () => {
    const a = createStreams(99, 'L12');
    const b = createStreams(99, 'L12');
    for (const name of STREAM_NAMES) expect(take(a[name], 200)).toEqual(take(b[name], 200));
  });

  it('gives different sequences for different seeds, levels and purposes', () => {
    const base = take(createStreams(1, 'L01').wind, 16);
    expect(take(createStreams(2, 'L01').wind, 16)).not.toEqual(base);
    expect(take(createStreams(1, 'L02').wind, 16)).not.toEqual(base);
    const s = createStreams(1, 'L01');
    const seqs = STREAM_NAMES.map((n) => take(s[n], 16).join(','));
    expect(new Set(seqs).size).toBe(STREAM_NAMES.length);
  });

  it('keeps streams independent: drawing from one never shifts another', () => {
    const quiet = createStreams(7, 'L33');
    const noisy = createStreams(7, 'L33');
    for (let i = 0; i < 5000; i++) noisy.cosmetic.next();
    for (let i = 0; i < 300; i++) noisy.ai.next();
    expect(take(noisy.wind, 100)).toEqual(take(quiet.wind, 100));
    expect(take(noisy.spread, 100)).toEqual(take(quiet.spread, 100));
    expect(take(noisy.terrain, 100)).toEqual(take(quiet.terrain, 100));
  });

  it('uses the documented seed string', () => {
    expect(streamSeed(5, 'L09', 'spread')).toBe('5:L09:spread');
  });

  it('saves and restores state exactly', () => {
    const r = Rng.fromString('save');
    take(r, 37);
    const st = r.getState();
    const after = take(r, 50);
    const r2 = new Rng(st);
    expect(take(r2, 50)).toEqual(after);
    r.setState(st);
    expect(take(r, 50)).toEqual(after);
  });

  it('int() stays in range and covers it evenly', () => {
    const r = Rng.fromString('int');
    const counts = new Array(11).fill(0) as number[];
    for (let i = 0; i < 110000; i++) {
      const v = r.int(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThanOrEqual(5);
      counts[v + 5] = (counts[v + 5] as number) + 1;
    }
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(500);
    expect(() => r.int(3, 2)).toThrow();
    expect(() => r.int(0.5, 2)).toThrow();
  });

  it('next() is in [0, 1)', () => {
    const r = Rng.fromString('unit');
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
