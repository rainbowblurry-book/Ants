/**
 * UI atlas builder (DR-088, DR-014, DR-195).
 *
 *   node tools/build-ui.ts           writes public/assets/gen/shared.json + shared-N.png
 *   node tools/build-ui.ts --report  prints the page and area report only
 *
 * Sources come from SOURCES in src/assets/manifest.ts. For each SVG,
 * `var(--token)` is replaced from theme.json and `currentColor` becomes #fff
 * (so the frame can be tinted). PNG placeholders are embedded as data URIs and
 * fitted against the bottom centre. Every page is composed as one SVG and
 * rasterised once with resvg, so no other image library is needed. Output is
 * a Phaser multiatlas. It is generated, not committed (`npm run assets`).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATLAS_PAGE_MAX,
  ATLASES,
  type AtlasId,
  RASTER,
  SOURCES,
  type SourceDef,
} from '../src/assets/manifest.ts';
import { loadTheme, resolveSemanticColors } from './gen-theme.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
export const OUT_DIR = join(root, 'public');

/** Transparent gap around every frame, in page px (stops bilinear bleed). */
const PAD = 2;
/** UI frames (not placeholders) may use at most 2 MP of the shared pages (DR-088). */
export const UI_AREA_MAX_MP = 2;

export interface PlacedFrame {
  frame: string;
  src: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  placeholder: boolean;
}

export interface AtlasPlan {
  atlas: AtlasId;
  pages: { w: number; h: number }[];
  frames: PlacedFrame[];
}

export function pngSize(bytes: Uint8Array): { w: number; h: number } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => bytes[i] === b)) throw new Error('not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

/**
 * Shelf packing, tallest first then by name, so the layout is the same on
 * every machine. Width is the smallest of 512 / 1024 / 2048 that keeps the
 * fewest pages.
 */
export function planAtlas(atlas: AtlasId, sources: readonly SourceDef[] = SOURCES): AtlasPlan {
  const items = sources
    .filter((s) => s.atlas === atlas)
    .map((s) => ({ s, w: s.w * RASTER, h: s.h * RASTER }))
    .sort((a, b) => b.h - a.h || b.w - a.w || (a.s.frame < b.s.frame ? -1 : 1));
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.s.frame)) throw new Error(`duplicate frame ${it.s.frame}`);
    seen.add(it.s.frame);
    if (it.w + PAD * 2 > ATLAS_PAGE_MAX || it.h + PAD * 2 > ATLAS_PAGE_MAX) {
      throw new Error(`frame ${it.s.frame} is larger than a page`);
    }
  }

  const pack = (pageW: number) => {
    const frames: PlacedFrame[] = [];
    const pages: { w: number; h: number }[] = [];
    let page = 0;
    let x = 0;
    let y = 0;
    let shelf = 0;
    for (const it of items) {
      const fw = it.w + PAD * 2;
      const fh = it.h + PAD * 2;
      if (x + fw > pageW) {
        x = 0;
        y += shelf;
        shelf = 0;
      }
      if (y + fh > ATLAS_PAGE_MAX) {
        pages.push({ w: pageW, h: y });
        page++;
        x = 0;
        y = 0;
        shelf = 0;
      }
      frames.push({
        frame: it.s.frame,
        src: it.s.src,
        page,
        x: x + PAD,
        y: y + PAD,
        w: it.w,
        h: it.h,
        placeholder: it.s.placeholder,
      });
      x += fw;
      shelf = Math.max(shelf, fh);
    }
    pages.push({ w: pageW, h: y + shelf });
    // Round heights up to a multiple of 4.
    for (const p of pages) p.h = Math.ceil(p.h / 4) * 4;
    return { frames, pages };
  };

  let best = pack(512);
  for (const w of [1024, 2048]) {
    const next = pack(w);
    if (next.pages.length < best.pages.length) best = next;
  }
  return { atlas, pages: best.pages, frames: best.frames };
}

export function areaReport(plan: AtlasPlan): { totalMp: number; uiMp: number; pages: number } {
  let ui = 0;
  let total = 0;
  for (const f of plan.frames) {
    const a = (f.w + PAD * 2) * (f.h + PAD * 2);
    total += a;
    if (!f.placeholder) ui += a;
  }
  return { totalMp: total / 1e6, uiMp: ui / 1e6, pages: plan.pages.length };
}

/** `var(--name)` -> hex, currentColor -> #fff. Fails on an unknown token. */
export function substituteTokens(svg: string, where: string): string {
  const colors = resolveSemanticColors(loadTheme());
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/var\(--([a-z0-9-]+)\)/g, (_m, name: string) => {
      const c = colors[name];
      if (!c) throw new Error(`${where}: unknown token --${name}`);
      return c.hex;
    })
    .replace(/currentColor/g, '#fff');
}

/** The inside of an SVG file, with its viewBox, ids made unique per frame. */
function svgBody(text: string, idPrefix: string, where: string): { viewBox: string; body: string } {
  const noComments = text.replace(/<!--[\s\S]*?-->/g, '');
  const open = /<svg\b[^>]*>/.exec(noComments);
  if (!open) throw new Error(`${where}: no <svg>`);
  const vb = /viewBox="([^"]+)"/.exec(open[0]);
  if (!vb?.[1]) throw new Error(`${where}: no viewBox`);
  const end = noComments.lastIndexOf('</svg>');
  let body = noComments.slice(open.index + open[0].length, end);
  body = body
    .replace(/\bid="([^"]+)"/g, (_m, id: string) => `id="${idPrefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id: string) => `url(#${idPrefix}${id})`)
    .replace(/href="#([^"]+)"/g, (_m, id: string) => `href="#${idPrefix}${id}"`);
  return { viewBox: vb[1], body };
}

/** One page as an SVG document, page px. */
export function pageSvg(plan: AtlasPlan, page: number): string {
  const size = plan.pages[page];
  if (!size) throw new Error(`no page ${page}`);
  const parts: string[] = [];
  plan.frames
    .filter((f) => f.page === page)
    .forEach((f, i) => {
      const file = join(root, f.src);
      if (f.src.endsWith('.png')) {
        const bytes = readFileSync(file);
        const b64 = Buffer.from(bytes).toString('base64');
        parts.push(
          `<image x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" ` +
            `preserveAspectRatio="xMidYMax meet" href="data:image/png;base64,${b64}"/>`,
        );
      } else {
        const text = substituteTokens(readFileSync(file, 'utf8'), f.src);
        const { viewBox, body } = svgBody(text, `f${i}-`, f.src);
        parts.push(
          `<svg x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" viewBox="${viewBox}" ` +
            `preserveAspectRatio="none" overflow="hidden">${body}</svg>`,
        );
      }
    });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">${parts.join('')}</svg>`
  );
}

/** Phaser multiatlas JSON. */
export function atlasJson(plan: AtlasPlan, imageName: (page: number) => string): string {
  const textures = plan.pages.map((p, page) => ({
    image: imageName(page),
    format: 'RGBA8888',
    size: { w: p.w, h: p.h },
    scale: 1,
    frames: plan.frames
      .filter((f) => f.page === page)
      .map((f) => ({
        filename: f.frame,
        rotated: false,
        trimmed: false,
        frame: { x: f.x, y: f.y, w: f.w, h: f.h },
        spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
        sourceSize: { w: f.w, h: f.h },
      })),
  }));
  return `${JSON.stringify({ textures, meta: { app: 'tools/build-ui.ts', scale: RASTER } }, null, 1)}\n`;
}

export async function buildAtlas(atlas: AtlasId, outDir = OUT_DIR): Promise<AtlasPlan> {
  const { Resvg } = await import('@resvg/resvg-js');
  const plan = planAtlas(atlas);
  const base = join(outDir, ATLASES[atlas].path);
  mkdirSync(dirname(base), { recursive: true });
  const name = base.split('/').pop() ?? atlas;
  plan.pages.forEach((_p, page) => {
    const png = new Resvg(pageSvg(plan, page), { fitTo: { mode: 'original' } }).render().asPng();
    writeFileSync(`${base}-${page}.png`, png);
  });
  writeFileSync(
    `${base}.json`,
    atlasJson(plan, (page) => `${name}-${page}.png`),
  );
  return plan;
}

async function main(): Promise<void> {
  const plan = process.argv.includes('--report') ? planAtlas('shared') : await buildAtlas('shared');
  const r = areaReport(plan);
  const sizes = plan.pages.map((p) => `${p.w}x${p.h}`).join(', ');
  console.log(
    `shared atlas: ${r.pages} page(s) [${sizes}], ${plan.frames.length} frames, ` +
      `UI ${r.uiMp.toFixed(2)} MP (max ${UI_AREA_MAX_MP}), all ${r.totalMp.toFixed(2)} MP`,
  );
  if (r.uiMp > UI_AREA_MAX_MP) {
    console.error('UI atlas area is over budget (DR-088)');
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
