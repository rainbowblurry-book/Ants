/**
 * Shared weapon types (DR-002, DR-009, DR-034, PLAN §5).
 */
import type { Ant } from '../movement.ts';
import type { Projectile } from '../physics.ts';
import type { Pickup } from '../pickups.ts';
import type { Rng } from '../rng.ts';
import type { TerrainGrid } from '../terrain.ts';
import type { WindField } from '../wind.ts';

export const WEAPON_IDS = ['seed', 'dewdrop', 'pollen', 'grub', 'roller', 'plop'] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

export interface WeaponDef {
  id: WeaponId;
  /** Base damage (per puff for Pollen). */
  damage: number;
  /** Blast radius in px (fill radius for Mound Plop). */
  blastR: number;
  /** Wind factor in flight. */
  windFactor: number;
  /** Launch speed multiplier (DR-030). */
  wMul: number;
  /** Two-player default ammo (DR-034, J12, J24). */
  ammo2p: number;
  /** Collision ring radius (DR-023). */
  ringR: number;
  /** Campaign unlock level (DR-009), 0 for starters. */
  unlockLevel: number;
}

/** What a body is doing; each weapon file owns its own fields. */
export interface BodyBase {
  p: Projectile;
  /** Ant index the body ignores until it has left that ant's capsule (the shooter), or −1. */
  ignore: number;
  /** Ticks since spawn. */
  age: number;
}

export interface World {
  grid: TerrainGrid;
  ants: Ant[];
  wind: WindField;
  /** Global sim tick (Oscillate wind reads it). */
  tick: number;
  /** The `spread` stream (Pollen jitter). */
  spread: Rng;
  pickups: Pickup[];
}

export interface Blast {
  x: number;
  y: number;
  r: number;
  base: number;
  /** Ant index touched by the projectile, or −1. */
  direct: number;
  /** Mound Plop fills instead of erasing. */
  fill: boolean;
}

export type ShotEvent =
  | {
      tick: number;
      kind: 'blast';
      weapon: WeaponId;
      blast: Blast;
      hits: { ant: number; dmg: number }[];
    }
  | {
      tick: number;
      kind: 'fizzle';
      weapon: WeaponId;
      x: number;
      y: number;
      why: 'water' | 'out' | 'cap';
    }
  | { tick: number; kind: 'burst'; x: number; y: number }
  | { tick: number; kind: 'bounce'; weapon: WeaponId; x: number; y: number }
  | { tick: number; kind: 'land'; weapon: WeaponId; x: number; y: number };

/** What a weapon step may do to the shot. */
export interface StepCtx {
  world: World;
  /** Ants as the projectile sees them: null when knocked out or ignored. */
  targets: (Ant | null)[];
  explode(b: BodyBase, base: number, r: number, direct: number, fill?: boolean): void;
  fizzle(b: BodyBase, why: 'water' | 'out' | 'cap'): void;
  spawn(b: Body): void;
  event(e: ShotEvent): void;
}

// Body unions are declared here so index.ts can switch on `kind`.
export interface SeedBody extends BodyBase {
  kind: 'seed';
}
export interface DewBody extends BodyBase {
  kind: 'dewdrop';
  bounces: number;
  resting: boolean;
}
export interface PodBody extends BodyBase {
  kind: 'pollen';
}
export interface PuffBody extends BodyBase {
  kind: 'puff';
}
export interface GrubBody extends BodyBase {
  kind: 'grub';
  digging: boolean;
  hx: number;
  hy: number;
  digTicks: number;
}
export interface RollerBody extends BodyBase {
  kind: 'roller';
  mode: 'air' | 'roll';
  /** Signed speed along the surface; + is toward +x. */
  u: number;
  /** Ticks left on the fuse once landed; −1 before the first landing. */
  fuse: number;
  wallBounced: boolean;
  /** Launch direction, used if the landing has no horizontal speed. */
  dir: 1 | -1;
}
export interface PlopBody extends BodyBase {
  kind: 'plop';
}
export type Body = SeedBody | DewBody | PodBody | PuffBody | GrubBody | RollerBody | PlopBody;
