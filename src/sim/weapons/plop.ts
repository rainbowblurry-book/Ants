/**
 * Mound Plop (DR-009, J25, PLAN §5): sticks on first contact and fills EMPTY
 * and WATER within 34 px with SOIL. Cells within 18 px of any ant's body
 * stay empty. No crater. 6 damage (7 direct).
 */
import { RING_R_SMALL } from '../physics.ts';
import { flyStep } from './fly.ts';
import type { PlopBody, StepCtx, WeaponDef } from './types.ts';

export const PLOP: WeaponDef = {
  id: 'plop',
  damage: 6,
  blastR: 34,
  windFactor: 0.4,
  wMul: 0.9,
  ammo2p: 2,
  ringR: RING_R_SMALL,
  unlockLevel: 34,
};
/** Keep-out distance from an ant's hurtbox surface (DR-009). */
export const PLOP_KEEP_OUT = 18;

export function stepPlop(b: PlopBody, ctx: StepCtx): boolean {
  const r = flyStep(b, ctx, PLOP.windFactor);
  if (r.kind === 'flying') return true;
  if (r.kind === 'terrain') ctx.explode(b, PLOP.damage, PLOP.blastR, -1, true);
  else if (r.kind === 'ant') ctx.explode(b, PLOP.damage, PLOP.blastR, r.ant, true);
  else ctx.fizzle(b, r.kind);
  return false;
}
