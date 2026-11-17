/**
 * DR-195 manifest key test, the DR-014 resident-page check and the DR-088
 * pipeline checks. The atlas is planned (and rasterised into a temp folder)
 * from the same SOURCES the build uses.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ASSETS,
  ATLAS_PAGE_MAX,
  ATLASES,
  FONTS,
  MAX_RESIDENT_PAGES,
  placeholders,
  RASTER,
  SOURCES,
} from '../src/assets/manifest.ts';
import { bakeAll, bakeCharsets, KNOWN_MISSING } from '../tools/bake-fonts.ts';
import { areaReport, buildAtlas, planAtlas, pngSize, UI_AREA_MAX_MP } from '../tools/build-ui.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = planAtlas('shared');
const planned = new Map(plan.frames.map((f) => [f.frame, f]));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|json|html|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe('asset manifest (DR-195)', () => {
  it('every key has a frame in its atlas', () => {
    const missing = Object.entries(ASSETS)
      .filter(([, e]) => !planned.has(e.frame))
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it('every source frame is used by at least one key', () => {
    const used = new Set(Object.values(ASSETS).map((e) => e.frame));
    expect(SOURCES.filter((s) => !used.has(s.frame)).map((s) => s.frame)).toEqual([]);
  });

  it('every source file exists', () => {
    expect(SOURCES.filter((s) => !existsSync(join(root, s.src))).map((s) => s.src)).toEqual([]);
  });

  it('code never names a frame or an asset path directly', () => {
    const needles = [
      ...new Set([...SOURCES.map((s) => s.frame), ...Object.values(ATLASES).map((a) => a.path)]),
      ...Object.values(FONTS).map((f) => f.path),
    ];
    const bad: string[] = [];
    for (const f of walk(join(root, 'src'))) {
      const rel = relative(root, f).split('\\').join('/');
      if (rel === 'src/assets/manifest.ts') continue;
      const text = readFileSync(f, 'utf8');
      for (const n of needles)
        if (text.includes(`'${n}'`) || text.includes(`"${n}"`) || text.includes(`\`${n}`))
          bad.push(`${rel}: ${n}`);
    }
    expect(bad).toEqual([]);
  });

  it('ant keys use the DR-195 shape and are flagged as placeholders', () => {
    expect(ASSETS['ant.side.blue.idle']?.placeholder).toBe(true);
    expect(ASSETS['ant.side.amber.ko']?.placeholder).toBe(true);
    expect(ASSETS['ant.side.blue.idle']?.originY).toBe(1);
    const ph = placeholders();
    expect(ph).toContain('ant.side.blue.idle');
    expect(ph).toContain('terrain.palette');
    // UI art is final, not placeholder.
    expect(ph.some((k) => k.startsWith('ui.'))).toBe(false);
  });
});

describe('atlas pages and area (DR-014, DR-088)', () => {
  it('the shared atlas fits its resident pages, each at most 2048²', () => {
    expect(plan.pages.length).toBeLessThanOrEqual(ATLASES.shared.resident);
    for (const p of plan.pages) {
      expect(p.w).toBeLessThanOrEqual(ATLAS_PAGE_MAX);
      expect(p.h).toBeLessThanOrEqual(ATLAS_PAGE_MAX);
    }
  });

  it('at most 3 atlas pages are resident by plan', () => {
    const resident = Object.values(ATLASES).reduce((n, a) => n + a.resident, 0);
    expect(resident).toBeLessThanOrEqual(MAX_RESIDENT_PAGES);
    expect(MAX_RESIDENT_PAGES).toBe(3);
  });

  it('UI frames stay under 2 MP', () => {
    expect(areaReport(plan).uiMp).toBeLessThanOrEqual(UI_AREA_MAX_MP);
  });

  it('frames never overlap and stay inside their page', () => {
    for (const a of plan.frames) {
      const page = plan.pages[a.page];
      expect(page).toBeDefined();
      if (!page) continue;
      expect(a.x + a.w).toBeLessThanOrEqual(page.w);
      expect(a.y + a.h).toBeLessThanOrEqual(page.h);
    }
    for (let i = 0; i < plan.frames.length; i++) {
      for (let j = i + 1; j < plan.frames.length; j++) {
        const a = plan.frames[i];
        const b = plan.frames[j];
        if (!a || !b || a.page !== b.page) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.frame} / ${b.frame}`).toBe(false);
      }
    }
  });

  it('rasterises to pages of the planned size at 2x', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ants-atlas-'));
    const built = await buildAtlas('shared', dir);
    built.pages.forEach((p, i) => {
      const size = pngSize(readFileSync(join(dir, `${ATLASES.shared.path}-${i}.png`)));
      expect(size).toEqual(p);
    });
    const json = JSON.parse(readFileSync(join(dir, `${ATLASES.shared.path}.json`), 'utf8'));
    const icon = SOURCES.find((s) => s.frame === 'ui/icon-back');
    const entry = json.textures[0].frames.find(
      (f: { filename: string }) => f.filename === 'ui/icon-back',
    );
    expect(entry.frame.w).toBe((icon?.w ?? 0) * RASTER);
  });
});

describe('font bake (DR-081)', () => {
  it('charsets follow theme.json', () => {
    const sets = bakeCharsets();
    expect(sets.F128).toContain('A');
    expect(sets.F128).not.toContain('a');
    expect(sets.F64).toContain('°');
    expect(sets.F64).toContain('∞');
    expect(sets.F56).toContain('·'); // from the locale file
    expect(sets.F56).toContain('…');
  });

  it('bakes every glyph but the known missing ones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ants-fonts-'));
    const results = await bakeAll(dir);
    for (const r of results) {
      for (const ch of r.missing) expect(KNOWN_MISSING[ch], `${r.key} ${ch}`).toBeDefined();
      expect(existsSync(join(dir, `${FONTS[r.key].path}.xml`))).toBe(true);
      expect(existsSync(join(dir, `${FONTS[r.key].path}-stroke.png`))).toBe(
        FONTS[r.key].stroke > 0,
      );
    }
    expect(results.find((r) => r.key === 'F64')?.missing).toEqual(['∞']);
  });
});
