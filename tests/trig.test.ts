import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cosDeci, normDeci, SIN_QUARTER, sinDeci } from '../src/sim/trig.ts';
import { buildTrigTs, paths } from '../tools/gen-trig.ts';

const rad = (deci: number) => (deci * Math.PI) / 1800;

describe('trig table (DR-011, J9)', () => {
  it('committed src/sim/trig.ts matches the generator', () => {
    // If this fails, run: node tools/gen-trig.ts
    expect(readFileSync(paths.out, 'utf8')).toBe(buildTrigTs());
  });

  it('has 901 entries, exact at 0° and 90°', () => {
    expect(SIN_QUARTER.length).toBe(901);
    expect(SIN_QUARTER[0]).toBe(0);
    expect(SIN_QUARTER[900]).toBe(1);
  });

  it('matches Math.sin to 1e-12 over the quarter wave (build-time check)', () => {
    for (let i = 0; i <= 900; i++) {
      expect(Math.abs((SIN_QUARTER[i] as number) - Math.sin(rad(i)))).toBeLessThan(1e-12);
    }
  });

  it('sinDeci and cosDeci match Math.sin/cos to 1e-12 over a full turn and beyond', () => {
    for (let a = -3600; a <= 7200; a++) {
      expect(Math.abs(sinDeci(a) - Math.sin(rad(a)))).toBeLessThan(1e-12);
      expect(Math.abs(cosDeci(a) - Math.cos(rad(a)))).toBeLessThan(1e-12);
    }
  });

  it('is exactly symmetric and exact at the quadrant points', () => {
    for (let a = 1; a < 3600; a++) {
      expect(sinDeci(-a) + 0).toBe(-sinDeci(a) + 0); // +0 folds -0 at 180°
      expect(sinDeci(1800 - a)).toBe(sinDeci(a));
    }
    expect([sinDeci(0), sinDeci(900), sinDeci(1800), sinDeci(2700)]).toEqual([0, 1, 0, -1]);
    expect([cosDeci(0), cosDeci(900), cosDeci(1800), cosDeci(2700)]).toEqual([1, 0, -1, 0]);
  });

  it('normalises angles and rejects non-integers', () => {
    expect(normDeci(-1)).toBe(3599);
    expect(normDeci(3600)).toBe(0);
    expect(normDeci(7201)).toBe(1);
    expect(() => sinDeci(45.5)).toThrow();
  });
});
