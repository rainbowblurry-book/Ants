import { describe, expect, it } from 'vitest';
import { LOGICAL_H, LOGICAL_W, parseScaleOverride, pickRenderScale } from '../src/boot/renderScale';

describe('render scale (DR-013)', () => {
  it('keeps the logical canvas at 960x540', () => {
    expect([LOGICAL_W, LOGICAL_H]).toEqual([960, 540]);
  });

  it('uses S=2 from DPR 1.5 up, and S=1 below', () => {
    expect(pickRenderScale(1, false)).toBe(1);
    expect(pickRenderScale(1.25, false)).toBe(1);
    expect(pickRenderScale(1.5, false)).toBe(2);
    expect(pickRenderScale(2, false)).toBe(2);
    expect(pickRenderScale(3, false)).toBe(2);
  });

  it('forces S=1 in Performance mode', () => {
    expect(pickRenderScale(3, true)).toBe(1);
    expect(pickRenderScale(1, true)).toBe(1);
  });

  it('reads the ?s= override and ignores bad values', () => {
    expect(parseScaleOverride('?s=1')).toBe(1);
    expect(parseScaleOverride('?s=2')).toBe(2);
    expect(parseScaleOverride('?a=b&s=2')).toBe(2);
    expect(parseScaleOverride('')).toBeNull();
    expect(parseScaleOverride('?s=3')).toBeNull();
    expect(parseScaleOverride('?s=')).toBeNull();
  });
});
