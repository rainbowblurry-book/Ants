/**
 * UI.md §6 check 1 (DR-080, DR-088): every text-on-fill pair in theme.json is
 * recomputed here and must reach 4.5. Non-text: the focus ring must reach 3
 * against every fill with at least one of its two rings (DR-086).
 */
import { describe, expect, it } from 'vitest';
import { blend, contrast } from '../tools/contrast.ts';
import {
  loadTheme,
  resolveOnColors,
  resolveSemanticColors,
  resolveTokens,
} from '../tools/gen-theme.ts';

const theme = loadTheme();
const colors = resolveSemanticColors(theme);
const onColors = resolveOnColors(theme);
const TEXT_MIN = theme.meta.contrastRule.text;
const NON_TEXT_MIN = theme.meta.contrastRule.nonText;

function hexOf(name: string): string {
  const c = colors[name];
  if (!c) throw new Error(`unknown semantic colour ${name}`);
  return c.hex;
}

/** The fill as seen on screen: the scrim is judged over the worst case, white. */
function seenFill(name: string): string {
  const c = colors[name];
  if (!c) throw new Error(`unknown semantic colour ${name}`);
  return c.alpha === 1 ? c.hex : blend(c.hex, c.alpha, hexOf('meaning-white'));
}

/** Every {fill, text} object in component.*, where both are colour names. */
function componentPairs(): { where: string; fill: string; text: string }[] {
  const out: { where: string; fill: string; text: string }[] = [];
  const walk = (node: unknown, where: string) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const o = node as Record<string, unknown>;
    if (typeof o.fill === 'string' && typeof o.text === 'string' && o.text in colors) {
      out.push({ where, fill: o.fill, text: o.text });
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`);
  };
  walk(resolveTokens(theme, theme.component, 'component'), 'component');
  return out;
}

describe('contrast (UI.md §6 check 1)', () => {
  it('meta rule is 4.5 for text and 3 for non-text', () => {
    expect(TEXT_MIN).toBe(4.5);
    expect(NON_TEXT_MIN).toBe(3);
  });

  it.each(Object.entries(onColors))(
    'onColor %s reaches 4.5 and matches its recorded ratio',
    (fill, text) => {
      const ratio = contrast(seenFill(fill), text);
      expect(ratio).toBeGreaterThanOrEqual(TEXT_MIN);
      const entry = theme.semantic.onColor[fill];
      if (entry && typeof entry === 'object') expect(ratio).toBeCloseTo(entry.ratio, 1);
    },
  );

  it('covers the component text pairs and each reaches 4.5', () => {
    const pairs = componentPairs();
    // button ×5, fire, pillNew, levelNode ×4 at the time of writing.
    expect(pairs.length).toBeGreaterThanOrEqual(11);
    const failing = pairs
      .map((p) => ({ ...p, ratio: contrast(seenFill(p.fill), hexOf(p.text)) }))
      .filter((p) => p.ratio < TEXT_MIN);
    expect(failing).toEqual([]);
  });

  it('component text colours are the one allowed onColor for their fill', () => {
    for (const p of componentPairs()) {
      const allowed = onColors[p.fill];
      if (allowed) expect(hexOf(p.text), p.where).toBe(allowed);
    }
  });

  it('the focus ring is visible on every fill (one ring reaches 3)', () => {
    const inner = hexOf('meaning-white');
    const outer = hexOf('ink');
    for (const name of Object.keys(colors)) {
      const fill = seenFill(name);
      const best = Math.max(contrast(inner, fill), contrast(outer, fill));
      expect(best, name).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    }
  });
});
