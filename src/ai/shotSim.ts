/**
 * Headless shot simulation for the bot (DR-060, PLAN §9 "same physics").
 *
 * `simulateShot` fires one shot on a throw-away copy of the world with the
 * real `fire` + `stepShot`, and reports where it went and whom it hurt. The
 * match itself is never touched. No Phaser, no wall clock (DR-010, DR-011).
 *
 * Cost: weapons whose single blast ends the shot (Seed, Dewdrop, Roller) run
 * "dry" on the live grid (no terrain change, no copy). Pollen, Grub and Plop
 * change the terrain during the shot, so they get a grid copy.
 */
import type { Ant } from '../sim/movement.ts';
import { Rng } from '../sim/rng.ts';
import {
  fire,
  type ShotEvent,
  shotLive,
  stepShot,
  type WeaponId,
  type World,
} from '../sim/weapons/index.ts';
import type { WindField } from '../sim/wind.ts';

/** Ticks after which a dry run gives up (flight cap 480 + fuse and roll time). */
export const SHOT_SIM_MAX_TICKS = 900;

const MUTATES: Readonly<Record<WeaponId, boolean>> = {
  seed: false,
  dewdrop: false,
  roller: false,
  pollen: true,
  grub: true,
  plop: true,
};

export interface ShotSimInput {
  world: World;
  shooter: number;
  weapon: WeaponId;
  angleDeci: number;
  powerMille: number;
  /** Wind to fly in (the perceived wind for the error model); default the world's. */
  wind?: WindField;
}

export interface ShotSimResult {
  /** Blast centres in order (one per puff for Pollen). Empty if the shot fizzled. */
  blasts: { x: number; y: number; r: number; direct: number }[];
  /** First blast or fizzle point, the "impact" for the hit metric (DR-062). */
  impact: { x: number; y: number } | null;
  fizzled: boolean;
  /** Damage per ant index, after the DR-035 cap. */
  damage: number[];
  /** Ant indices knocked out by this shot (HP reached 0). */
  kos: number[];
  ticks: number;
  events: ShotEvent[];
}

function copyAnt(a: Ant): Ant {
  return { ...a };
}

/** Runs one shot to the end on a copy of `input.world`. Deterministic. */
export function simulateShot(input: ShotSimInput): ShotSimResult {
  const src = input.world;
  const spread = new Rng(src.spread.getState());
  const world: World = {
    grid: MUTATES[input.weapon] ? src.grid.clone() : src.grid,
    ants: src.ants.map(copyAnt),
    wind: input.wind ?? src.wind,
    tick: src.tick,
    spread,
    pickups: [],
    friendlyFire: src.friendlyFire,
    dry: !MUTATES[input.weapon],
  };
  const shot = fire(world, input.shooter, input.weapon, input.angleDeci, input.powerMille);
  let ticks = 0;
  while (shotLive(shot) && ticks < SHOT_SIM_MAX_TICKS) {
    world.tick++;
    ticks++;
    stepShot(world, shot);
  }
  const blasts: ShotSimResult['blasts'] = [];
  let impact: ShotSimResult['impact'] = null;
  let fizzled = false;
  for (const e of shot.events) {
    if (e.kind === 'blast') {
      blasts.push({ x: e.blast.x, y: e.blast.y, r: e.blast.r, direct: e.blast.direct });
      if (!impact) impact = { x: e.blast.x, y: e.blast.y };
    } else if (e.kind === 'fizzle') {
      if (!impact) {
        impact = { x: e.x, y: e.y };
        fizzled = true;
      }
    }
  }
  const kos: number[] = [];
  for (let i = 0; i < world.ants.length; i++) {
    const before = src.ants[i] as Ant;
    const after = world.ants[i] as Ant;
    if (before.state !== 'ko' && after.hp <= 0) kos.push(i);
  }
  return {
    blasts,
    impact,
    fizzled,
    damage: shot.dealt.slice(),
    kos,
    ticks,
    events: shot.events,
  };
}
