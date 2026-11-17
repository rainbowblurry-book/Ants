/**
 * Tunnel Grub (DR-009, PLAN §5): ballistic until its first terrain contact.
 * Then it keeps its heading with gravity off at 150 px/s, erasing r 11
 * (× each cell's crater multiplier, via `erase`) every tick for 60 ticks.
 * It pops at the tunnel end, when a tick digs nothing (it broke out into
 * air), or on an ant. ROCK stops it at once. A direct hit in flight is ×1.2.
 */
import { circleHitsCapsule, RING_R_SMALL, SIM_DT } from '../physics.ts';
import { Material } from '../terrain.ts';
import { flyStep } from './fly.ts';
import type { GrubBody, StepCtx, WeaponDef } from './types.ts';

export const GRUB: WeaponDef = {
  id: 'grub',
  damage: 40,
  blastR: 30,
  windFactor: 0.15,
  wMul: 1.0,
  ammo2p: 1,
  ringR: RING_R_SMALL,
  unlockLevel: 14,
};
export const GRUB_DIG_R = 11;
export const GRUB_DIG_SPEED = 150;
export const GRUB_DIG_TICKS = 60;

export function stepGrub(b: GrubBody, ctx: StepCtx): boolean {
  if (!b.digging) {
    const r = flyStep(b, ctx, GRUB.windFactor);
    switch (r.kind) {
      case 'flying':
        return true;
      case 'ant':
        ctx.explode(b, GRUB.damage, GRUB.blastR, r.ant);
        return false;
      case 'terrain': {
        if (r.material === Material.ROCK) {
          ctx.explode(b, GRUB.damage, GRUB.blastR, -1);
          return false;
        }
        const len = Math.sqrt(b.p.vx * b.p.vx + b.p.vy * b.p.vy);
        b.hx = len === 0 ? 0 : b.p.vx / len;
        b.hy = len === 0 ? 1 : b.p.vy / len;
        b.digging = true;
        b.digTicks = 0;
        return true;
      }
      default:
        ctx.fizzle(b, r.kind);
        return false;
    }
  }
  // Digging: 2.5 px per tick, in two 1.25 px steps.
  const g = ctx.world.grid;
  const step = (GRUB_DIG_SPEED * SIM_DT) / 2;
  for (let s = 0; s < 2; s++) {
    const nx = b.p.x + b.hx * step;
    const ny = b.p.y + b.hy * step;
    for (let i = 0; i < ctx.targets.length; i++) {
      const a = ctx.targets[i];
      if (a && circleHitsCapsule(nx, ny, b.p.ringR, a)) {
        b.p.x = nx;
        b.p.y = ny;
        // Only a hit in flight is direct (DR-009).
        ctx.explode(b, GRUB.damage, GRUB.blastR, -1);
        return false;
      }
    }
    if (g.materialAt(nx + b.hx * b.p.ringR, ny + b.hy * b.p.ringR) === Material.ROCK) {
      ctx.explode(b, GRUB.damage, GRUB.blastR, -1);
      return false;
    }
    b.p.x = nx;
    b.p.y = ny;
  }
  b.digTicks++;
  const dug = g.erase(b.p.x, b.p.y, GRUB_DIG_R);
  if (dug === 0 || b.digTicks >= GRUB_DIG_TICKS) {
    ctx.explode(b, GRUB.damage, GRUB.blastR, -1);
    return false;
  }
  return true;
}
