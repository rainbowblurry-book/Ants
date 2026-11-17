import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scan } from '../tools/ban-scan.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['src/sim', 'src/ai'];

function listTs(dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const name of readdirSync(abs).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) out.push(...listTs(relative(root, p)));
    else if (/\.(ts|js|mts|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

describe('ban scan (DR-010, DR-011)', () => {
  it('catches every banned pattern in a sample', () => {
    const bad = [
      'const a = Math.random();',
      'const b = Date.now();',
      'const c = performance.now();',
      'const d = Math.sin(1) + Math.atan2(1, 2) + Math.pow(2, 3);',
      'const e = 2 ** 3;',
      'arr.sort();',
      "import Phaser from 'phaser';",
      'const s = new Set<number>();',
    ];
    for (const line of bad) expect(scan(line), line).not.toEqual([]);
  });

  it('ignores comments and strings, and allows det-ok Sets', () => {
    const ok = [
      '// Math.random is banned here, and so is Date',
      '/** a ** b and Math.sin(x) in docs */',
      "const msg = 'no Math.random or Date';",
      'arr.sort((a, b) => a - b);',
      'const m = Math.sqrt(2) + Math.floor(1.5) + Math.imul(3, 4);',
      'const s = new Set<number>(); // det-ok: membership only, never iterated',
    ];
    for (const line of ok) expect(scan(line), line).toEqual([]);
  });

  it('finds no banned API in src/sim or src/ai', () => {
    const files = DIRS.flatMap(listTs);
    expect(files.length).toBeGreaterThan(0);
    const report: string[] = [];
    for (const f of files) {
      for (const h of scan(readFileSync(f, 'utf8'))) report.push(`${relative(root, f)}:${h}`);
    }
    expect(report).toEqual([]);
  });
});
