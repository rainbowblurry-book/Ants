/** One ballistic tick for any weapon body, with the shared limits (DR-023, DR-038). */
import { MAX_FLIGHT_TICKS, type StepResult, stepProjectile } from '../physics.ts';
import type { BodyBase, StepCtx } from './types.ts';

export type FlyResult = Exclude<StepResult, { kind: 'out' }> | { kind: 'out' } | { kind: 'cap' };

/**
 * Wind × factor plus gravity, collision steps, despawn. Reports `cap` when the
 * body has flown 480 ticks without resolving (the "pffft" fizzle).
 */
export function flyStep(b: BodyBase, ctx: StepCtx, windFactor: number): FlyResult {
  const w = ctx.world.wind.accel(b.p.x, b.p.y, ctx.world.tick);
  const r = stepProjectile(b.p, ctx.world.grid, w.x * windFactor, w.y * windFactor, ctx.targets);
  if (r.kind === 'flying' && b.age >= MAX_FLIGHT_TICKS) return { kind: 'cap' };
  return r;
}
