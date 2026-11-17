/**
 * Pollen Pod (DR-034, PLAN §5): bursts at the apex if it is at least 30 px
 * above the terrain below, else on impact. Five puffs fan at −36..+36° in
 * 18° steps about the parent direction, at 0.7× speed (apex) or 0.5× the
 * reflected velocity (impact), with seeded jitter of ±4° and ±8% speed.
 */
import { rotateDeci } from '../angle.ts';
import { ANT_CAPSULE, RING_R_SMALL, type Vec2 } from '../physics.ts';
import { flyStep } from './fly.ts';
import type { PodBody, PuffBody, StepCtx, WeaponDef } from './types.ts';

export const POLLEN: WeaponDef = {
  id: 'pollen',
  damage: 12,
  blastR: 18,
  windFactor: 0.8,
  wMul: 1.0,
  ammo2p: 1,
  ringR: RING_R_SMALL,
  unlockLevel: 0,
};
export const PUFF_COUNT = 5;
export const PUFF_FAN_DECI = [-360, -180, 0, 180, 360] as const;
export const PUFF_APEX_SPEED = 0.7;
export const PUFF_IMPACT_SPEED = 0.5;
export const PUFF_JITTER_DECI = 40;
export const PUFF_JITTER_MILLE = 80;
export const APEX_MIN_HEIGHT = 30;

/** Height of (x, y) above the first solid cell straight below; Infinity over a void. */
export function heightAboveTerrain(ctx: StepCtx, x: number, y: number): number {
  const g = ctx.world.grid;
  for (let yy = Math.floor(y); yy < g.h; yy++) if (g.solidAt(x, yy)) return yy - y;
  return g.bottom === 'floor' ? g.h - y : Number.POSITIVE_INFINITY;
}

function burst(b: PodBody, ctx: StepCtx, base: Vec2): void {
  ctx.event({ tick: ctx.world.tick, kind: 'burst', x: b.p.x, y: b.p.y });
  const rng = ctx.world.spread;
  for (const off of PUFF_FAN_DECI) {
    const jitter = rng.int(-PUFF_JITTER_DECI, PUFF_JITTER_DECI);
    const speedMille = 1000 + rng.int(-PUFF_JITTER_MILLE, PUFF_JITTER_MILLE);
    const v = rotateDeci(base.x, base.y, off + jitter);
    const k = speedMille / 1000;
    const puff: PuffBody = {
      kind: 'puff',
      p: { x: b.p.x, y: b.p.y, vx: v.x * k, vy: v.y * k, ringR: POLLEN.ringR },
      ignore: b.ignore,
      age: b.age,
    };
    ctx.spawn(puff);
  }
}

export function stepPollen(b: PodBody, ctx: StepCtx): boolean {
  const vyBefore = b.p.vy;
  const r = flyStep(b, ctx, POLLEN.windFactor);
  if (r.kind === 'flying') {
    if (vyBefore < 0 && b.p.vy >= 0 && heightAboveTerrain(ctx, b.p.x, b.p.y) >= APEX_MIN_HEIGHT) {
      burst(b, ctx, { x: b.p.vx * PUFF_APEX_SPEED, y: b.p.vy * PUFF_APEX_SPEED });
      return false;
    }
    return true;
  }
  if (r.kind === 'terrain' || r.kind === 'ant') {
    let n: Vec2;
    if (r.kind === 'terrain') n = r.normal;
    else {
      // Normal from the capsule's nearest point toward the pod.
      const a = ctx.world.ants[r.ant] as { x: number; y: number };
      const sx0 = a.x - ANT_CAPSULE.halfSeg;
      const sx1 = a.x + ANT_CAPSULE.halfSeg;
      const qx = b.p.x < sx0 ? sx0 : Math.min(b.p.x, sx1);
      const dx = b.p.x - qx;
      const dy = b.p.y - (a.y - ANT_CAPSULE.centreUp);
      const len = Math.sqrt(dx * dx + dy * dy);
      n = len === 0 ? { x: 0, y: -1 } : { x: dx / len, y: dy / len };
    }
    const vn = b.p.vx * n.x + b.p.vy * n.y;
    const rx = b.p.vx - 2 * vn * n.x;
    const ry = b.p.vy - 2 * vn * n.y;
    burst(b, ctx, { x: rx * PUFF_IMPACT_SPEED, y: ry * PUFF_IMPACT_SPEED });
    return false;
  }
  ctx.fizzle(b, r.kind);
  return false;
}

/** A puff explodes on first contact (12 dmg, r 18). */
export function stepPuff(b: PuffBody, ctx: StepCtx): boolean {
  const r = flyStep(b, ctx, POLLEN.windFactor);
  if (r.kind === 'flying') return true;
  if (r.kind === 'terrain') ctx.explode(b, POLLEN.damage, POLLEN.blastR, -1);
  else if (r.kind === 'ant') ctx.explode(b, POLLEN.damage, POLLEN.blastR, r.ant);
  else ctx.fizzle(b, r.kind);
  return false;
}
