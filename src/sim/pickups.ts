/**
 * Pickups (DR-048, J11): Honey Drop and Seed Bundle.
 *
 * Placement (level data, or the two-player drop every 3rd round) belongs to
 * stages 3 and 8. Here: the effects, collection and popping.
 */
import { ANT_MAX_HP } from './damage.ts';
import type { Ant } from './movement.ts';
import { circleHitsCapsule } from './physics.ts';

export type PickupKind = 'honey' | 'seeds';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
}

/** Honey Drop heals 25, capped at 100 (DR-048). */
export const HONEY_HEAL = 25;
/** Seed Bundle: +2 Dewdrop, +1 Pollen (J11). */
export const SEED_BUNDLE = { dewdrop: 2, pollen: 1 } as const;

/** Team ammo pool; Infinity means unlimited. */
export type Ammo = Record<'seed' | 'dewdrop' | 'pollen' | 'grub' | 'roller' | 'plop', number>;

export function applyPickup(kind: PickupKind, ant: Ant, ammo: Ammo): void {
  if (kind === 'honey') {
    ant.hp = Math.min(ANT_MAX_HP, ant.hp + HONEY_HEAL);
  } else {
    ammo.dewdrop += SEED_BUNDLE.dewdrop;
    ammo.pollen += SEED_BUNDLE.pollen;
  }
}

/**
 * Collects pickups an ant on the ground is touching (walking onto it,
 * DR-048). The pickup is a point tested against the hurtbox capsule.
 * Returns the kinds collected, in list order.
 */
export function collectPickups(ant: Ant, pickups: Pickup[], ammo: Ammo): PickupKind[] {
  if (ant.state !== 'ground') return [];
  const got: PickupKind[] = [];
  for (let i = 0; i < pickups.length; ) {
    const p = pickups[i] as Pickup;
    if (circleHitsCapsule(p.x, p.y, 0, ant)) {
      applyPickup(p.kind, ant, ammo);
      got.push(p.kind);
      pickups.splice(i, 1);
    } else i++;
  }
  return got;
}

/** A blast pops every pickup within its radius, with no effect (DR-048). */
export function popPickups(pickups: Pickup[], x: number, y: number, r: number): number {
  let n = 0;
  for (let i = 0; i < pickups.length; ) {
    const p = pickups[i] as Pickup;
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy <= r * r) {
      pickups.splice(i, 1);
      n++;
    } else i++;
  }
  return n;
}
