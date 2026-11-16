import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildThemeCssFile,
  buildThemeTs,
  loadTheme,
  paths,
  resolveOnColors,
  resolveSemanticColors,
} from '../tools/gen-theme.ts';

describe('theme tokens (DR-088)', () => {
  const theme = loadTheme();

  it('generated theme.ts and theme.css match theme.json', () => {
    // If this fails, run: node tools/gen-theme.ts
    expect(readFileSync(paths.ts, 'utf8')).toBe(buildThemeTs(theme));
    expect(readFileSync(paths.css, 'utf8')).toBe(buildThemeCssFile(theme));
  });

  it('resolves every semantic colour to a hex', () => {
    const colors = resolveSemanticColors(theme);
    expect(Object.keys(colors).length).toBeGreaterThan(20);
    for (const c of Object.values(colors)) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(colors.ink?.hex).toBe(theme.primitive.color['plum-900']);
    expect(colors.letterbox?.hex).toBe(colors.ink?.hex);
    expect(colors.scrim?.alpha).toBe(0.7);
  });

  it('gives every onColor fill one text colour', () => {
    const on = resolveOnColors(theme);
    expect(on['team-a']).toBe(theme.primitive.color.white);
    expect(on.action).toBe(theme.primitive.color['plum-900']);
  });
});
