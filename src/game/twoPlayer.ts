/**
 * Minimal two-player setup for the M1 hot-seat slice (HANDOFF §3 stage 5).
 *
 * Builds a versus `MatchConfig` from a `TwoPlayerSetup` (DR-182 defaults with
 * J45 names): coin flip for the first team, the tap gate every TurnStart
 * (DR-045, DR-183), the 30 s or 60 s timer (DR-043), the two-player ammo row
 * (DR-034, J24) and the Jungle Home wind field (PLAN §4: Level max 2, step 1,
 * every turn). The full Setup screen is stage 7.
 *
 * ARENA (OVR-009): the real Jungle Home arena comes out of the level pipeline
 * (stage 8 and 9). Until then this is a STAND-IN: the dev arena's left half,
 * raised 80 px so the ants stand in the clear zone, mirrored so both sides are
 * the same (DR-057 arenas are mirrored). Pure: no Phaser.
 */

import type { TwoPlayerSetup } from '../save/schema.ts';
import { devArenaGrid } from '../scenes/devArena.ts';
import { defaultAmmo, type MatchConfig } from '../sim/match.ts';
import { type Ant, createAnt } from '../sim/movement.ts';
import { Material, TerrainGrid } from '../sim/terrain.ts';
import { LevelWind } from '../sim/wind.ts';

export const ARENA_LEVEL_ID = 'arena-1';
/** How far the stand-in raises the dev arena (OVR-009). */
const RAISE = 80;
/** Spawn x for team 0 (team 1 is mirrored), in the order ants are added. */
export const SPAWN_X = [100, 330, 210, 450] as const;

export function standInArena(): TerrainGrid {
  const src = devArenaGrid();
  const g = new TerrainGrid(src.w, src.h, 'void');
  const half = src.w / 2;
  for (let x = 0; x < half; x++) {
    for (let y = 0; y < g.h; y++) {
      const sy = y + RAISE;
      const m = sy < src.h ? src.materialAt(x, sy) : Material.SOIL;
      if (m === Material.EMPTY) continue;
      g.set(x, y, m);
      g.set(src.w - 1 - x, y, m);
    }
  }
  g.drainDirty();
  return g;
}

/** First solid cell from the top at x (the feet line). */
export function feetAt(g: TerrainGrid, x: number): number {
  for (let y = 0; y < g.h; y++) if (g.solidAt(x, y)) return y;
  return g.h;
}

export function arenaAnts(g: TerrainGrid, perTeam: number): Ant[] {
  const n = Math.max(2, Math.min(4, perTeam));
  const ants: Ant[] = [];
  for (let i = 0; i < n; i++) {
    const x = SPAWN_X[i] as number;
    ants.push(createAnt(ants.length, 0, x, feetAt(g, x), 1));
  }
  for (let i = 0; i < n; i++) {
    const x = g.w - 1 - (SPAWN_X[i] as number);
    ants.push(createAnt(ants.length, 1, x, feetAt(g, x), -1));
  }
  return ants;
}

/** Jungle Home wind (PLAN §4, DR-032): Level max 2, step 1, every turn. */
export function jungleHomeWind(): LevelWind {
  return new LevelWind({ maxAbs: 2, maxStep: 1, everyNTurns: 1 });
}

/** A versus match from a setup and a fresh match seed (DR-182). */
export function versusMatch(setup: TwoPlayerSetup, seed: number | string): MatchConfig {
  const terrain = standInArena();
  const ammo = [defaultAmmo(), defaultAmmo()];
  if (setup.starter) {
    // "Starter kit only" greys out slots 4-6 (DR-180, UI.md §4.11).
    for (const a of ammo) {
      a.grub = 0;
      a.roller = 0;
      a.plop = 0;
    }
  }
  return {
    seed,
    levelId: ARENA_LEVEL_ID,
    terrain,
    wind: jungleHomeWind(),
    ants: arenaAnts(terrain, setup.ants),
    ammo,
    rules: {
      gate: true,
      firstTeam: 'coin',
      turnTicks: setup.timer * 60,
    },
  };
}
