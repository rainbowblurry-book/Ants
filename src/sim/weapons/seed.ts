/** Seed Spitter: explodes on first contact (DR-002, DR-034). */
import { RING_R_SMALL } from '../physics.ts';
import { flyStep } from './fly.ts';
import type { SeedBody, StepCtx, WeaponDef } from './types.ts';

export const SEED: WeaponDef = {
  id: 'seed',
  damage: 30,
  blastR: 28,
  windFactor: 0.6,
  wMul: 1.15,
  ammo2p: Number.POSITIVE_INFINITY,
  ringR: RING_R_SMALL,
  unlockLevel: 0,
};

export function stepSeed(b: SeedBody, ctx: StepCtx): boolean {
  const r = flyStep(b, ctx, SEED.windFactor);
  if (r.kind === 'flying') return true;
  if (r.kind === 'terrain') ctx.explode(b, SEED.damage, SEED.blastR, -1);
  else if (r.kind === 'ant') ctx.explode(b, SEED.damage, SEED.blastR, r.ant);
  else ctx.fizzle(b, r.kind);
  return false;
}
