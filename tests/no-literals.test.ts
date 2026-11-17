/**
 * UI.md §6 check 2 (DR-088): no colour literal outside theme.json and the
 * files generated from it. Scans src/**, the HTML and CSS, the Vite config
 * and the UI art. SVG art may use only #fff (it is tinted at build time).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Generated from theme.json, or theme.json itself. */
const ALLOWED = new Set(['src/ui/theme.json', 'src/ui/theme.ts', 'src/ui/theme.css']);

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const HEX_NUM = /\b0x[0-9a-fA-F]{6}\b/g;
const RGB = /\brgba?\(/g;
const HSL = /\bhsla?\(/g;

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

function findLiterals(text: string, allowWhite: boolean): string[] {
  const hits: string[] = [];
  for (const re of [HEX, HEX_NUM, RGB, HSL]) {
    for (const m of text.matchAll(re)) {
      if (allowWhite && /^#(?:fff|ffffff)$/i.test(m[0])) continue;
      hits.push(m[0]);
    }
  }
  return hits;
}

describe('no colour literals (UI.md §6 check 2)', () => {
  const codeFiles = [
    ...walk(join(root, 'src'), ['.ts', '.css', '.html', '.json']),
    join(root, 'index.html'),
    join(root, 'vite.config.ts'),
  ];

  it('scans a real file set', () => {
    expect(codeFiles.length).toBeGreaterThan(30);
  });

  it('src, HTML, CSS and config hold no colour literal', () => {
    const bad: string[] = [];
    for (const f of codeFiles) {
      const rel = relative(root, f).split('\\').join('/');
      if (ALLOWED.has(rel)) continue;
      const hits = findLiterals(readFileSync(f, 'utf8'), false);
      if (hits.length > 0) bad.push(`${rel}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('UI and placeholder art use only #fff and var(--token)', () => {
    const svgs = [
      ...walk(join(root, 'art', 'ui'), ['.svg']),
      ...walk(join(root, 'art', 'placeholder'), ['.svg']),
    ];
    expect(svgs.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const f of svgs) {
      const hits = findLiterals(readFileSync(f, 'utf8'), true);
      if (hits.length > 0) bad.push(`${relative(root, f)}: ${hits.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('the scanner catches each literal form', () => {
    expect(findLiterals("fill: '#EE6083'; 0xee6083; rgb(1 2 3); #fff", false)).toHaveLength(4);
    expect(findLiterals('#fff #FFFFFF', true)).toHaveLength(0);
    expect(findLiterals('0x9e3779b1 hash', false)).toHaveLength(0);
  });
});
