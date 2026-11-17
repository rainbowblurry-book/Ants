/**
 * Damage model (DR-035 with J1) and fall damage (DR-026, J3).
 *
 * Pure functions on numbers; `applyBlast` applies one explosion to the ants.
 * HP are integers. Only + - * /, Math.sqrt, Math.round/ceil/min/max.
 */
import { ANT_CAPSULE, distToCapsuleSegment } from './physics.ts';
import { Material } from './terrain.ts';
import { cosDeci, sinDeci } from './trig.ts';

export const ANT_MAX_HP = 100;
/** Direct-hit multiplier (DR-035). */
export const DIRECT_MULT = 1.2;
/** Most damage one ant can take from one shot (DR-035). */
export const PER_ANT_SHOT_CAP = 60;
/** Self-damage multiplier; never lethal (DR-035). */
export const SELF_MULT = 0.5;
/** Falloff reaches this fraction of base damage at the blast edge (DR-035). */
export const EDGE_FRACTION = 0.25;
/** Knockback: px/s per HP dealt, the cap, and the lowest launch angle (DR-035). */
export const KNOCKBACK_PER_HP = 8;
export const KNOCKBACK_MAX = 600;
export const KNOCKBACK_MIN_UP_DECI = 250;
/** Fall damage (DR-026): free height, px per HP, cap. */
export const FALL_FREE_PX = 90;
export const FALL_PX_PER_HP = 9;
export const FALL_CAP = 20;

export interface DamageTarget {
  x: number;
  y: number;
}

/** Distance from the blast to the hurtbox surface: max(0, dist(blast, segment) − 16) (J1). */
export function blastDistance(bx: number, by: number, ant: DamageTarget): number {
  const d = distToCapsuleSegment(bx, by, ant) - ANT_CAPSULE.radius;
  return Math.max(d, 0);
}

/**
 * Raw damage of one blast to one ant before the per-shot cap (DR-035):
 * round(base · lerp(1, 0.25, d/r)) when d < r, at least 1. A direct hit is
 * ×1.2 and self-damage is ×0.5, both applied before rounding.
 */
export function blastDamage(
  base: number,
  r: number,
  bx: number,
  by: number,
  ant: DamageTarget,
  direct: boolean,
  self: boolean,
): number {
  const d = direct ? 0 : blastDistance(bx, by, ant);
  if (d >= r) return 0;
  const t = d / r;
  let dmg = base * (1 + (EDGE_FRACTION - 1) * t);
  if (direct) dmg *= DIRECT_MULT;
  if (self) dmg *= SELF_MULT;
  const out = Math.round(dmg);
  return Math.max(out, 1);
}

/** Knockback speed for the HP dealt: min(600, 8·dmg) px/s (DR-035). */
export function knockbackSpeed(dmg: number): number {
  return Math.min(KNOCKBACK_MAX, KNOCKBACK_PER_HP * dmg);
}

/**
 * Knockback velocity: away from the blast (blast → hurtbox centre), raised to
 * at least 25° above horizontal (DR-035). A blast straight below or at the
 * centre launches at 25° toward +x if there is no horizontal part.
 */
export function knockbackVelocity(
  bx: number,
  by: number,
  ant: DamageTarget,
  dmg: number,
): { x: number; y: number } {
  const speed = knockbackSpeed(dmg);
  if (speed === 0) return { x: 0, y: 0 };
  let ux = ant.x - bx;
  let uy = ant.y - ANT_CAPSULE.centreUp - by;
  const len = Math.sqrt(ux * ux + uy * uy);
  if (len === 0) {
    ux = 0;
    uy = -1;
  } else {
    ux /= len;
    uy /= len;
  }
  const minUp = sinDeci(KNOCKBACK_MIN_UP_DECI);
  if (-uy < minUp) {
    uy = -minUp;
    ux = (ux < 0 ? -1 : 1) * cosDeci(KNOCKBACK_MIN_UP_DECI);
  }
  return { x: ux * speed, y: uy * speed };
}

/** Fall damage for a free fall of h px onto `material` (DR-026). */
export function fallDamage(h: number, material: number): number {
  if (h <= FALL_FREE_PX) return 0;
  if (material === Material.BOUNCY || material === Material.WATER) return 0;
  let d = Math.min(FALL_CAP, Math.ceil((h - FALL_FREE_PX) / FALL_PX_PER_HP));
  // Halving rounds like DR-035 damage (Math.round). See PROGRESS stage 2.
  if (material === Material.SOFT) d = Math.round(d / 2);
  return d;
}

/** HP after non-lethal damage: never below 1 (fall and self-damage). */
export function nonLethal(hp: number, dmg: number): number {
  const out = hp - dmg;
  return out < 1 ? Math.min(hp, 1) : out;
}

export interface BlastAnt extends DamageTarget {
  hp: number;
  team: number;
  /** False once knocked out; KO'd ants are not hit. */
  active: boolean;
}

export interface BlastSpec {
  x: number;
  y: number;
  r: number;
  base: number;
  /** Index of the ant the projectile touched, or −1. */
  direct: number;
  /** Index of the ant that fired, or −1. */
  shooter: number;
}

export interface BlastHit {
  ant: number;
  dmg: number;
  vx: number;
  vy: number;
}

/**
 * Applies one blast to every active ant (DR-035). `dealt[i]` is the damage ant
 * i already took from this shot; it is updated, and the 60 cap is enforced.
 * Friendly fire is on. Self-damage can never knock the shooter out. Returns
 * the hits with their knockback velocities; the caller launches the ants.
 */
export function applyBlast(blast: BlastSpec, ants: BlastAnt[], dealt: number[]): BlastHit[] {
  const hits: BlastHit[] = [];
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i] as BlastAnt;
    if (!a.active) continue;
    const self = i === blast.shooter;
    let dmg = blastDamage(blast.base, blast.r, blast.x, blast.y, a, i === blast.direct, self);
    if (dmg === 0) continue;
    const room = PER_ANT_SHOT_CAP - (dealt[i] ?? 0);
    if (dmg > room) dmg = Math.max(room, 0);
    if (dmg === 0) continue;
    dealt[i] = (dealt[i] ?? 0) + dmg;
    const before = a.hp;
    a.hp = self ? nonLethal(a.hp, dmg) : Math.max(0, a.hp - dmg);
    const v = knockbackVelocity(blast.x, blast.y, a, dmg);
    hits.push({ ant: i, dmg: before - a.hp, vx: v.x, vy: v.y });
  }
  return hits;
}
