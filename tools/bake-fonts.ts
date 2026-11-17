/**
 * Bitmap font bake (DR-081, DR-088, J27).
 *
 *   node tools/bake-fonts.ts   writes public/assets/gen/fonts/F*.xml + F*.png (+ F*-stroke.png)
 *
 * Lilita One glyph outlines come from opentype.js (it cannot read woff2, so
 * the bake reads the .woff files of the same @fontsource 5.3.0 release, kept
 * in art/fonts/). Every glyph is placed as an SVG path and the sheet is
 * rasterised once with resvg. Output is BMFont XML with kerning, and a second
 * PNG with the same layout for the stroke layer (F64, F128).
 *
 * Charsets come from theme.json (`semantic.type.bakes`). "ASCII + Latin-Ext
 * used by locale files" means printable ASCII plus every character in
 * src/i18n/en.json. A character the font lacks fails the bake, unless it is
 * listed in KNOWN_MISSING with the override that tracks it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONTS, type FontKey } from '../src/assets/manifest.ts';
import { loadTheme } from './gen-theme.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Lilita One sources, tried in order. */
const SOURCES = [
  'art/fonts/lilita-one-latin-400-normal.woff',
  'art/fonts/lilita-one-latin-ext-400-normal.woff',
];

/**
 * Characters a bake asks for that Lilita One does not have and that no
 * override covers yet. Empty: OVR-005 is applied (see SYNTH_GLYPHS).
 */
export const KNOWN_MISSING: Readonly<Record<string, string>> = {};

/**
 * OVR-005 (Tier G, approved 2026-11-17): Lilita One and Nunito have no "∞",
 * which the F64 bake needs for Seed's ammo badge. The bake draws it: a
 * figure-eight (a lemniscate) stroked at Lilita's stem weight with round
 * joins, white, plus the same stroke layer as the digits so it tints alike.
 * Every size comes from the font's own glyphs, in font units:
 * stem = width of "l", height = x-height (the "x" box), centred on the
 * minus sign's axis, each loop as wide as an "o".
 */
export const SYNTH_GLYPHS: Readonly<Record<string, string>> = { '∞': 'OVR-005' };

/** Lemniscate centre line for "∞", in font units (y up), closed. */
export function infinityPoints(f: OtFont): {
  pts: [number, number][];
  stem: number;
  advance: number;
} {
  const box = (c: string) => f.charToGlyph(c).getBoundingBox();
  const l = box('l');
  const x = box('x');
  const minus = box('-');
  const o = box('o');
  const stem = l.x2 - l.x1;
  const outerH = x.y2 - Math.max(0, x.y1);
  const outerW = 2 * (o.x2 - o.x1) - stem;
  const side = o.x1;
  const cx = side + outerW / 2;
  const cy = (minus.y1 + minus.y2) / 2;
  const a = (outerW - stem) / 2;
  const halfH = (outerH - stem) / 2;
  const yScale = halfH / (a / (2 * Math.SQRT2));
  const pts: [number, number][] = [];
  const n = 96;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const d = 1 + Math.sin(t) * Math.sin(t);
    pts.push([cx + (a * Math.cos(t)) / d, cy + (yScale * a * Math.sin(t) * Math.cos(t)) / d]);
  }
  return { pts, stem, advance: Math.round(outerW + 2 * side) };
}

/** A stand-in glyph for a SYNTH_GLYPHS character: a stroked centre line. */
function synthGlyph(f: OtFont, ch: string): { glyph: OtGlyph; stem: number } {
  if (ch !== '∞') throw new Error(`no synthetic glyph for ${ch}`);
  const { pts, stem, advance } = infinityPoints(f);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const half = stem / 2;
  const glyph: OtGlyph = {
    advanceWidth: advance,
    getBoundingBox: () => ({
      x1: Math.min(...xs) - half,
      y1: Math.min(...ys) - half,
      x2: Math.max(...xs) + half,
      y2: Math.max(...ys) + half,
    }),
    getPath: (x0, y0, size) => {
      const k = size / f.unitsPerEm;
      const d = pts
        .map(
          ([u, v], i) =>
            `${i === 0 ? 'M' : 'L'}${(x0 + u * k).toFixed(2)} ${(y0 - v * k).toFixed(2)}`,
        )
        .join(' ');
      return { toPathData: () => `${d} Z` };
    },
  };
  return { glyph, stem };
}

/** Sheet width in px. */
const SHEET_W = 1024;
const GAP = 2;

interface OtGlyph {
  advanceWidth?: number;
  getPath(x: number, y: number, size: number): { toPathData(decimals?: number): string };
  getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
}
interface OtFont {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  charToGlyphIndex(c: string): number;
  charToGlyph(c: string): OtGlyph;
  getKerningValue(a: OtGlyph, b: OtGlyph): number;
}

async function loadFonts(): Promise<OtFont[]> {
  const ot = (await import('opentype.js')) as unknown as {
    parse(buf: ArrayBuffer): OtFont;
    default?: { parse(buf: ArrayBuffer): OtFont };
  };
  const parse = ot.parse ?? ot.default?.parse;
  if (!parse) throw new Error('opentype.js: no parse()');
  return SOURCES.map((p) => {
    const b = readFileSync(join(root, p));
    return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  });
}

const ASCII = Array.from({ length: 95 }, (_v, i) => String.fromCharCode(32 + i)).join('');

/** The characters of every string in src/i18n/en.json. */
export function localeChars(): string {
  const en = JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8')) as Record<
    string,
    string
  >;
  const chars = new Set<string>();
  for (const [k, v] of Object.entries(en)) {
    if (k.startsWith('_')) continue;
    // Placeholders such as {round} are not shown.
    for (const ch of v.replace(/\{[a-zA-Z]+\}/g, '')) chars.add(ch);
  }
  return [...chars].join('');
}

/** "A-Z 0-9 ! ? . '" style charset text from theme.json -> characters (plus space). */
export function parseCharset(spec: string): string {
  if (spec.startsWith('ASCII')) return uniqueSorted(ASCII + localeChars());
  const out = new Set<string>([' ']);
  for (const tok of spec.split(' ')) {
    if (tok === '') continue;
    const range = /^(.)-(.)$/.exec(tok);
    if (range?.[1] && range[2]) {
      for (let c = range[1].charCodeAt(0); c <= range[2].charCodeAt(0); c++) {
        out.add(String.fromCharCode(c));
      }
    } else {
      for (const ch of tok) out.add(ch);
    }
  }
  return uniqueSorted([...out].join(''));
}

function uniqueSorted(s: string): string {
  return [...new Set(s)].sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)).join('');
}

export function bakeCharsets(): Record<FontKey, string> {
  const bakes = (loadTheme().semantic.type as { bakes: Record<string, { charset: string }> }).bakes;
  const out = {} as Record<FontKey, string>;
  for (const key of Object.keys(FONTS) as FontKey[]) {
    const b = bakes[key];
    if (!b) throw new Error(`theme.json has no bake ${key}`);
    out[key] = parseCharset(b.charset);
  }
  return out;
}

interface Placed {
  ch: string;
  code: number;
  font: OtFont;
  glyph: OtGlyph;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pen origin inside the cell. */
  ox: number;
  oy: number;
  advance: number;
  blank: boolean;
  /** Stroke width in font units for a drawn glyph (OVR-005), else 0. */
  synthStem: number;
}

export interface BakeResult {
  key: FontKey;
  chars: number;
  missing: string[];
  sheet: { w: number; h: number };
  kernings: number;
}

function glyphFor(fonts: OtFont[], ch: string): { font: OtFont; glyph: OtGlyph } | null {
  for (const font of fonts) {
    if (font.charToGlyphIndex(ch) > 0) return { font, glyph: font.charToGlyph(ch) };
  }
  return null;
}

async function bake(
  key: FontKey,
  chars: string,
  fonts: OtFont[],
  outDir: string,
): Promise<BakeResult> {
  const { Resvg } = await import('@resvg/resvg-js');
  const spec = FONTS[key];
  const px = spec.px;
  const strokePx = spec.stroke * 2; // logical stroke at the 2x bake
  const pad = Math.ceil(strokePx) + 2;
  const main = fonts[0] as OtFont;
  const scale = px / main.unitsPerEm;
  const ascent = Math.round(main.ascender * scale);
  const descent = Math.round(-main.descender * scale);

  const missing: string[] = [];
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  let shelf = 0;
  const synthFont = Object.create(main) as OtFont; // its own identity: no kerning pairs
  for (const ch of chars) {
    let found = glyphFor(fonts, ch);
    let synthStem = 0;
    if (!found && ch in SYNTH_GLYPHS) {
      const g = synthGlyph(main, ch);
      found = { font: synthFont, glyph: g.glyph };
      synthStem = g.stem;
    }
    if (!found) {
      missing.push(ch);
      continue;
    }
    const s = px / found.font.unitsPerEm;
    const bb = found.glyph.getBoundingBox();
    const blank = ch.trim() === '' || bb.x2 <= bb.x1;
    const left = Math.floor(bb.x1 * s);
    const right = Math.ceil(bb.x2 * s);
    const top = Math.ceil(bb.y2 * s);
    const bottom = Math.floor(bb.y1 * s);
    const w = blank ? 0 : right - left + pad * 2;
    const h = blank ? 0 : top - bottom + pad * 2;
    if (x + w > SHEET_W) {
      x = 0;
      y += shelf + GAP;
      shelf = 0;
    }
    placed.push({
      ch,
      code: ch.codePointAt(0) ?? 0,
      font: found.font,
      glyph: found.glyph,
      x,
      y,
      w,
      h,
      ox: pad - left,
      oy: pad + top,
      advance: Math.round((found.glyph.advanceWidth ?? 0) * s),
      blank,
      synthStem,
    });
    x += w + GAP;
    shelf = Math.max(shelf, h);
  }
  const sheetH = Math.ceil((y + shelf + GAP) / 4) * 4;

  const unexpected = missing.filter((c) => !(c in KNOWN_MISSING));
  if (unexpected.length > 0) {
    throw new Error(`${key}: Lilita One has no glyph for ${JSON.stringify(unexpected.join(''))}`);
  }

  const paths = placed
    .filter((p) => !p.blank && p.synthStem === 0)
    .map((p) => p.glyph.getPath(p.x + p.ox, p.y + p.oy, px).toPathData(2))
    .join(' ');
  // Drawn glyphs are stroked centre lines; the stroke layer widens them by
  // the same amount as the font glyphs (OVR-005).
  const drawn = (stroke: boolean) =>
    placed
      .filter((p) => !p.blank && p.synthStem > 0)
      .map((p) => {
        const w = p.synthStem * scale + (stroke ? strokePx * 2 : 0);
        const d = p.glyph.getPath(p.x + p.ox, p.y + p.oy, px).toPathData(2);
        return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
      })
      .join('');
  const sheet = (stroke: boolean) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${sheetH}">` +
    `<path d="${paths}" fill="#fff"${
      stroke ? ` stroke="#fff" stroke-width="${strokePx * 2}" stroke-linejoin="round"` : ''
    }/>${drawn(stroke)}</svg>`;

  const kern: string[] = [];
  for (const a of placed) {
    for (const b of placed) {
      if (a.font !== b.font || a.font === synthFont) continue;
      const k = Math.round(a.font.getKerningValue(a.glyph, b.glyph) * (px / a.font.unitsPerEm));
      if (k !== 0) kern.push(`<kerning first="${a.code}" second="${b.code}" amount="${k}"/>`);
    }
  }

  const name = key;
  const charNodes = placed.map(
    (p) =>
      `<char id="${p.code}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ` +
      `xoffset="${-p.ox}" yoffset="${ascent - p.oy}" xadvance="${p.advance}" page="0" chnl="15"/>`,
  );
  const xml =
    '<?xml version="1.0"?>\n<font>\n' +
    `<info face="Lilita One" size="${px}" bold="0" italic="0" unicode="1" padding="${pad},${pad},${pad},${pad}" spacing="${GAP},${GAP}"/>\n` +
    `<common lineHeight="${ascent + descent}" base="${ascent}" scaleW="${SHEET_W}" scaleH="${sheetH}" pages="1" packed="0"/>\n` +
    `<pages><page id="0" file="${name}.png"/></pages>\n` +
    `<chars count="${charNodes.length}">\n${charNodes.join('\n')}\n</chars>\n` +
    `<kernings count="${kern.length}">\n${kern.join('\n')}\n</kernings>\n</font>\n`;

  const base = join(outDir, spec.path);
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(`${base}.xml`, xml);
  writeFileSync(`${base}.png`, new Resvg(sheet(false)).render().asPng());
  if (spec.stroke > 0) writeFileSync(`${base}-stroke.png`, new Resvg(sheet(true)).render().asPng());

  return {
    key,
    chars: placed.length,
    missing,
    sheet: { w: SHEET_W, h: sheetH },
    kernings: kern.length,
  };
}

export async function bakeAll(outDir = join(root, 'public')): Promise<BakeResult[]> {
  const fonts = await loadFonts();
  const sets = bakeCharsets();
  const out: BakeResult[] = [];
  for (const key of Object.keys(FONTS) as FontKey[])
    out.push(await bake(key, sets[key], fonts, outDir));
  return out;
}

async function main(): Promise<void> {
  for (const r of await bakeAll()) {
    const miss = r.missing.length
      ? `, missing ${r.missing.join('')} (${r.missing.map((c) => KNOWN_MISSING[c]).join(', ')})`
      : '';
    console.log(
      `${r.key}: ${r.chars} glyphs, ${r.kernings} kernings, ${r.sheet.w}x${r.sheet.h}${miss}`,
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
