/**
 * The asset manifest (DR-195, DR-088, DR-014).
 *
 * This file is the only place that names atlas frames, atlas paths, anchors
 * and hurtbox offsets. Code asks for an asset by key (`ant.side.blue.idle`)
 * and never names a frame. `tools/build-ui.ts` reads SOURCES to rasterise the
 * atlas, so the frames and the keys cannot drift apart (tests/manifest.test.ts).
 *
 * Final art arrives in stage 12 under the same keys. Every entry made from a
 * placeholder carries `placeholder: true`, and the release build (stage 13)
 * fails while one remains.
 *
 * No Phaser import: the build tools and the node tests read this file.
 */
import { color } from '../ui/theme.ts';

/** Raster scale of every atlas frame: art is drawn at 2x and shown at 0.5 (DR-088). */
export const RASTER = 2;

/** Atlas pages are at most 2048x2048 (DR-014). */
export const ATLAS_PAGE_MAX = 2048;

/**
 * Atlases. `resident` is how many pages the plan lets it keep in memory.
 * The shared atlas is always resident (2 pages); a biome atlas adds 1 (DR-014).
 */
export const ATLASES = {
  shared: { path: 'assets/gen/shared', resident: 2 },
} as const;
export type AtlasId = keyof typeof ATLASES;

/** At most this many atlas pages may be resident at once (DR-014, CI check). */
export const MAX_RESIDENT_PAGES = 3;

/** One rasterised frame. Sizes are logical px; the frame is RASTER times larger. */
export interface SourceDef {
  frame: string;
  atlas: AtlasId;
  /** Repo-relative SVG or PNG. */
  src: string;
  w: number;
  h: number;
  /** PNG sources are fitted inside w x h, keeping their aspect, against the bottom centre. */
  placeholder: boolean;
  /** Pixels of transparent padding around the frame in the page. */
  pad?: number;
}

/** A key code asks for. */
export interface AssetEntry {
  frame: string;
  atlas: AtlasId;
  /** Display origin, 0..1 of the frame. */
  originX: number;
  originY: number;
  placeholder: boolean;
  /** DR-162: where a trinket attaches, frame px from the origin. null until final art. */
  trinketAnchor?: { x: number; y: number } | null;
  /** DR-027 hurtbox, logical px from the feet: capsule centre above the feet, half segment, radius. */
  hurtbox?: { centreUp: number; halfSeg: number; r: number };
}

const UI_ICONS = [
  'back',
  'pause',
  'play',
  'sound-on',
  'sound-off',
  'fullscreen-enter',
  'fullscreen-exit',
  'phone-plus',
  'gear',
  'people',
  'book',
  'wardrobe',
  'sticker',
  'lock',
  'padlock-badge',
  'check',
  'cross',
  'bin',
  'clock',
  'bolt',
  'updraft',
  'wave',
  'die',
  'hammock',
  'crown',
  'sticky-note',
  'hand',
  'target',
  'runner',
  'foot',
  'chevron-l',
  'chevron-r',
  'chevron-u',
  'chevron-d',
  'star-round',
  'acorn-check',
  // Stage 5b (OVR-018, D07): the Hop and Flip buttons.
  'hop',
  'flip',
] as const;
export type IconName = (typeof UI_ICONS)[number];

/** Nine-slice sets: radius, logical size (2r + 8), layers (DR-083, DR-088). */
export const SLICES = {
  r24: { radius: 24, size: 56, band: 8 },
  r16: { radius: 16, size: 40, band: 6 },
  r8: { radius: 8, size: 24, band: 6 },
} as const;
export type SliceSet = keyof typeof SLICES;
export type SliceLayer = 'outline' | 'fill' | 'band';
const SLICE_LAYERS: readonly SliceLayer[] = ['outline', 'fill', 'band'];

export const WEAPON_ART = ['seed', 'dewdrop', 'pollen', 'grub', 'roller', 'plop'] as const;
export type WeaponArt = (typeof WEAPON_ART)[number];

/** Team names used in keys. Team 0 is blue (circle), team 1 amber (rounded triangle). */
export const TEAM_NAMES = ['blue', 'amber'] as const;
export type TeamName = (typeof TEAM_NAMES)[number];

/** Ant poses and faces (CREATIVE §2). tools/draw-ants.ts draws one SVG per entry. */
export const SIDE_POSES = ['walk', 'idle', 'aim', 'hop', 'flip', 'ko'] as const;
export type SidePose = (typeof SIDE_POSES)[number];
export const HERO_POSES = ['idle', 'cocky', 'win', 'lose'] as const;
export const FACES = ['cocky', 'aim', 'oops', 'dizzy'] as const;

/**
 * DR-027: the ant is drawn 88x63 (the 140x100 side art frame at 0.63); the
 * hurtbox is a capsule 22 px above the feet.
 */
export const ANT_SIDE = { w: 88, h: 63 } as const;
const ANT_HURTBOX = { centreUp: 22, halfSeg: 12, r: 16 } as const;
/** Results shows the hero at 160 tall (UI.md §5); the 120x150 art frame keeps its 4:5 aspect. */
export const ANT_HERO = { w: 128, h: 160 } as const;
/** Head-only faces: square for the 64 px Dot avatar (UI.md §4). */
export const ANT_FACE = { w: 64, h: 64 } as const;

/** Final ant art (R-03): original flat SVG drawn by tools/draw-ants.ts. */
const ANTS = 'art/ants';

function buildSources(): SourceDef[] {
  const out: SourceDef[] = [];
  const add = (frame: string, src: string, w: number, h: number, placeholder = false) =>
    out.push({ frame, atlas: 'shared', src, w, h, placeholder });
  for (const n of UI_ICONS) add(`ui/icon-${n}`, `art/ui/icon-${n}.svg`, 32, 32);
  for (const [set, s] of Object.entries(SLICES)) {
    for (const layer of SLICE_LAYERS) {
      add(`ui/slice-${set}-${layer}`, `art/ui/slice-${set}-${layer}.svg`, s.size, s.size);
    }
  }
  add('ui/badge-team-a', 'art/ui/badge-team-a.svg', 48, 48);
  add('ui/badge-team-b', 'art/ui/badge-team-b.svg', 48, 48);
  add('ui/badge-boss-segment', 'art/ui/badge-boss-segment.svg', 24, 12);
  for (const a of ['filled', 'empty', 'gold'])
    add(`ui/acorn-${a}`, `art/ui/acorn-${a}.svg`, 64, 64);
  add('ui/acorn-twinkle-dot', 'art/ui/acorn-twinkle-dot.svg', 12, 12);
  add('ui/wind-chevron', 'art/ui/wind-chevron.svg', 28, 40);
  add('ui/wind-chevron-ghost', 'art/ui/wind-chevron-ghost.svg', 28, 40);
  add('ui/wind-hub', 'art/ui/wind-hub.svg', 64, 44);
  add('ui/aim-dot', 'art/ui/aim-dot.svg', 16, 16);
  add('ui/aim-ring', 'art/ui/aim-ring.svg', 44, 44);
  // Placeholders (DR-195): flat token shapes and the concept cut-outs.
  for (const w of WEAPON_ART) {
    add(`ph/weapon-${w}-40`, `art/placeholder/weapon-${w}.svg`, 40, 40, true);
    add(`ph/weapon-${w}-120`, `art/placeholder/weapon-${w}.svg`, 120, 120, true);
  }
  add('ph/pickup-honey', 'art/placeholder/pickup-honey.svg', 32, 32, true);
  add('ph/pickup-seeds', 'art/placeholder/pickup-seeds.svg', 32, 32, true);
  // The ants (R-03, CREATIVE §2): one frame per team and pose, faces once.
  for (const team of TEAM_NAMES) {
    for (const pose of SIDE_POSES) {
      add(`ant/side-${pose}-${team}`, `${ANTS}/side-${pose}-${team}.svg`, ANT_SIDE.w, ANT_SIDE.h);
    }
    for (const pose of HERO_POSES) {
      add(`ant/hero-${pose}-${team}`, `${ANTS}/hero-${pose}-${team}.svg`, ANT_HERO.w, ANT_HERO.h);
    }
  }
  for (const f of FACES) add(`ant/face-${f}`, `${ANTS}/face-${f}.svg`, ANT_FACE.w, ANT_FACE.h);
  return out;
}

export const SOURCES: readonly SourceDef[] = buildSources();

function buildAssets(): Record<string, AssetEntry> {
  const out: Record<string, AssetEntry> = {};
  const ui = (key: string, frame: string, originX = 0.5, originY = 0.5) => {
    out[key] = { frame, atlas: 'shared', originX, originY, placeholder: false };
  };
  for (const n of UI_ICONS) ui(`ui.icon.${n}`, `ui/icon-${n}`);
  for (const set of Object.keys(SLICES)) {
    for (const layer of SLICE_LAYERS)
      ui(`ui.slice.${set}.${layer}`, `ui/slice-${set}-${layer}`, 0, 0);
  }
  ui('ui.badge.blue', 'ui/badge-team-a');
  ui('ui.badge.amber', 'ui/badge-team-b');
  ui('ui.badge.bossSegment', 'ui/badge-boss-segment');
  for (const a of ['filled', 'empty', 'gold']) ui(`ui.acorn.${a}`, `ui/acorn-${a}`);
  ui('ui.acorn.twinkle', 'ui/acorn-twinkle-dot');
  ui('ui.wind.chevron', 'ui/wind-chevron');
  ui('ui.wind.ghost', 'ui/wind-chevron-ghost');
  ui('ui.wind.hub', 'ui/wind-hub');
  ui('fx.aim.dot', 'ui/aim-dot');
  ui('fx.aim.ring', 'ui/aim-ring');

  const ph = (key: string, frame: string, originX = 0.5, originY = 0.5) => {
    out[key] = { frame, atlas: 'shared', originX, originY, placeholder: true };
  };
  for (const w of WEAPON_ART) {
    ph(`weapon.icon.${w}`, `ph/weapon-${w}-40`);
    ph(`weapon.art.${w}`, `ph/weapon-${w}-120`);
    // In flight the projectile uses the icon frame, scaled by the renderer.
    ph(`projectile.${w}`, `ph/weapon-${w}-40`);
  }
  ph('pickup.honey', 'ph/pickup-honey');
  ph('pickup.seeds', 'ph/pickup-seeds');
  for (const team of TEAM_NAMES) {
    for (const pose of SIDE_POSES) {
      out[`ant.side.${team}.${pose}`] = {
        frame: `ant/side-${pose}-${team}`,
        atlas: 'shared',
        // Feet at the bottom centre (the sim's ant y is the feet line, DR-027).
        originX: 0.5,
        originY: 1,
        placeholder: false,
        trinketAnchor: null,
        hurtbox: ANT_HURTBOX,
      };
    }
    for (const pose of HERO_POSES) {
      out[`ant.hero.${team}.${pose}`] = {
        frame: `ant/hero-${pose}-${team}`,
        atlas: 'shared',
        originX: 0.5,
        originY: 1,
        placeholder: false,
        trinketAnchor: null,
      };
    }
  }
  for (const f of FACES) ui(`ant.face.${f}`, `ant/face-${f}`);
  // Dot squints at everything (STORY.md), so her avatar is the aim face.
  ui('dot.avatar', 'ant/face-aim');
  return out;
}

export const ASSETS: Readonly<Record<string, AssetEntry>> = buildAssets();
export type AssetKey = string;

export function asset(key: AssetKey): AssetEntry {
  const e = ASSETS[key];
  if (!e) throw new Error(`manifest: no asset "${key}"`);
  return e;
}

export function sliceKey(set: SliceSet, layer: SliceLayer): AssetKey {
  return `ui.slice.${set}.${layer}`;
}

export function antSideKey(team: number, pose: SidePose): AssetKey {
  return `ant.side.${TEAM_NAMES[team] ?? 'blue'}.${pose}`;
}

export function badgeKey(team: number): AssetKey {
  return `ui.badge.${TEAM_NAMES[team] ?? 'blue'}`;
}

// ------------------------------------------------------------------ fonts

/** DR-081 bakes. `px` is the bake size (2x the role size); stroke is logical px outside the glyph. */
export const FONTS = {
  F56: { path: 'assets/gen/fonts/F56', px: 56, stroke: 0 },
  F64: { path: 'assets/gen/fonts/F64', px: 64, stroke: 4 },
  F80: { path: 'assets/gen/fonts/F80', px: 80, stroke: 0 },
  F128: { path: 'assets/gen/fonts/F128', px: 128, stroke: 6 },
} as const;
export type FontKey = keyof typeof FONTS;

/** Texture key of a font layer. */
export function fontLayerKey(font: FontKey, layer: 'fill' | 'stroke'): string {
  return layer === 'fill' ? font : `${font}-stroke`;
}

// -------------------------------------------------------- terrain palette

/** Per-material fill: index = material id (DR-022). `null` = not drawn. */
export interface TerrainPalette {
  placeholder: boolean;
  sky: number;
  fill: readonly (number | null)[];
  /** The surface band along the top of the initial terrain (DR-021, 10 px). */
  band: number;
  ink: number;
}

/**
 * PLACEHOLDER (DR-195). No biome palette is decided yet: each biome kit
 * brings its own in stage 8 (DR-021 "biome palette", CREATIVE §1). Until then
 * the materials use existing theme tokens so they read apart. Logged in
 * PROGRESS "Open items".
 */
export const TERRAIN_PALETTE_PLACEHOLDER: TerrainPalette = {
  placeholder: true,
  sky: color.panel,
  fill: [
    null, // EMPTY
    color.acorn, // SOIL
    color.secondary, // SOFT
    color['acorn-cap'], // HARD
    color.disabled, // ROCK
    color.action, // BOUNCY
    color['meaning-white'], // SLICK
    color.info, // WATER
  ],
  band: color.success,
  ink: color.ink,
};

/** Every placeholder still in the manifest (the stage 13 release gate reads this). */
export function placeholders(): string[] {
  const keys = Object.entries(ASSETS)
    .filter(([, e]) => e.placeholder)
    .map(([k]) => k);
  if (TERRAIN_PALETTE_PLACEHOLDER.placeholder) keys.push('terrain.palette');
  return keys;
}
