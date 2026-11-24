/**
 * Power bisection at a fixed angle (DR-060: range is monotone in power at a
 * fixed angle, so bisect power, about 10 sims). Shared by the solver and the
 * ai-cap test (DR-065 "test mode with a fixed angle").
 */

import type { WeaponId, World } from '../sim/weapons/index.ts';
import type { WindField } from '../sim/wind.ts';
import { type ShotSimResult, simulateShot } from './shotSim.ts';

export interface BisectInput {
  world: World;
  shooter: number;
  weapon: WeaponId;
  angleDeci: number;
  /** Target point (the target ant's hurtbox centre or feet, caller's choice). */
  tx: number;
  ty: number;
  wind?: WindField;
  /** Sim budget (default 11). */
  maxSims?: number;
}

export interface BisectResult {
  powerMille: number;
  /** The best shot found (closest impact x to tx). */
  sim: ShotSimResult;
  sims: number;
}

/**
 * Finds the power ‰ (integer) whose impact x is closest to tx, assuming
 * impact distance grows with power. Short shots raise lo, long ones lower hi.
 * Deterministic. The caller faces the shooter toward the target first.
 */
export function bisectPower(input: BisectInput): BisectResult {
  const max = input.maxSims ?? 11;
  const shooter = input.world.ants[input.shooter];
  if (!shooter) throw new RangeError('bisectPower: no shooter');
  const dir = shooter.facing;
  let lo = 0;
  let hi = 1000;
  let best: BisectResult | null = null;
  let bestErr = Number.POSITIVE_INFINITY;
  let sims = 0;
  while (sims < max && hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const sim = simulateShot({
      world: input.world,
      shooter: input.shooter,
      weapon: input.weapon,
      angleDeci: input.angleDeci,
      powerMille: mid,
      wind: input.wind,
    });
    sims++;
    const ix = sim.impact ? sim.impact.x : shooter.x + dir * 4000;
    const err = Math.abs(ix - input.tx);
    if (err < bestErr) {
      bestErr = err;
      best = { powerMille: mid, sim, sims };
    }
    // Signed distance past the target along the facing direction.
    const past = (ix - input.tx) * dir;
    if (past > 0) hi = mid;
    else lo = mid;
  }
  if (!best) throw new RangeError('bisectPower: zero budget');
  return { ...best, sims };
}
