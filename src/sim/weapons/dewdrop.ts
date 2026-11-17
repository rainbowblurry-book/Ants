/**
 * Dewdrop Bounce (DR-034, PLAN §5): 180-tick fuse, restitution 0.55,
 * tangential ×0.85 per bounce, at most 3 bounces, rests below 60 px/s normal
 * speed, pops at fuse end or on ant contact. Skips on water at e 0.5 (DR-026).
 */
import { circleHitsCapsule, RING_R_DEW, ringSolid } from '../physics.ts';
import { flyStep } from './fly.ts';
import type { DewBody, StepCtx, WeaponDef } from './types.ts';

export const DEWDROP: WeaponDef = {
  id: 'dewdrop',
  damage: 45,
  blastR: 48,
  windFactor: 0.3,
  wMul: 0.95,
  ammo2p: 3,
  ringR: RING_R_DEW,
  unlockLevel: 0,
};
export const DEW_FUSE_TICKS = 180;
export const DEW_RESTITUTION = 0.55;
export const DEW_TANGENT_KEEP = 0.85;
export const DEW_MAX_BOUNCES = 3;
export const DEW_REST_SPEED = 60;
export const DEW_WATER_E = 0.5;

export function stepDewdrop(b: DewBody, ctx: StepCtx): boolean {
  if (b.age >= DEW_FUSE_TICKS) {
    ctx.explode(b, DEWDROP.damage, DEWDROP.blastR, -1);
    return false;
  }
  if (b.resting) {
    for (let i = 0; i < ctx.targets.length; i++) {
      const a = ctx.targets[i];
      if (a && circleHitsCapsule(b.p.x, b.p.y, b.p.ringR, a)) {
        ctx.explode(b, DEWDROP.damage, DEWDROP.blastR, i);
        return false;
      }
    }
    // Ground blasted away: fall again.
    if (ringSolid(ctx.world.grid, b.p.x, b.p.y + 1, b.p.ringR)) return true;
    b.resting = false;
  }
  const r = flyStep(b, ctx, DEWDROP.windFactor);
  switch (r.kind) {
    case 'flying':
      return true;
    case 'ant':
      ctx.explode(b, DEWDROP.damage, DEWDROP.blastR, r.ant);
      return false;
    case 'water':
      if (b.p.vy > 0) b.p.vy = -DEW_WATER_E * b.p.vy;
      ctx.event({ tick: ctx.world.tick, kind: 'bounce', weapon: 'dewdrop', x: b.p.x, y: b.p.y });
      return true;
    case 'terrain': {
      const n = r.normal;
      const vn = b.p.vx * n.x + b.p.vy * n.y;
      if (b.bounces >= DEW_MAX_BOUNCES || -vn < DEW_REST_SPEED) {
        b.p.vx = 0;
        b.p.vy = 0;
        b.resting = true;
        return true;
      }
      const tx = b.p.vx - vn * n.x;
      const ty = b.p.vy - vn * n.y;
      b.p.vx = tx * DEW_TANGENT_KEEP - DEW_RESTITUTION * vn * n.x;
      b.p.vy = ty * DEW_TANGENT_KEEP - DEW_RESTITUTION * vn * n.y;
      b.bounces++;
      ctx.event({ tick: ctx.world.tick, kind: 'bounce', weapon: 'dewdrop', x: b.p.x, y: b.p.y });
      return true;
    }
    default:
      ctx.fizzle(b, r.kind);
      return false;
  }
}
