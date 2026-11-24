/**
 * What the bot's aim looks like while it settles (DR-066, DR-129).
 *
 * Cosmetic only: the fired values are already fixed in the plan, and these
 * curves end exactly on them, so they cannot change the shot. The clock is
 * the sim tick count into the bot's aim phase (plus the render alpha), so it
 * pauses with the match and a test can step it. Pure: no Phaser.
 *
 * Reduced motion (DR-129, UI.md §1.5): half the wobble, a settle that ends
 * at 60% of the aim phase, and no power overshoot. The aim phase itself keeps
 * its length (`settleTicks` is when the bot fires, which is sim timing).
 */
import type { BotTurnPlan } from '../ai/types.ts';
import { AIM_MAX_DECI, AIM_MIN_DECI, POWER_MAX_MILLE } from '../sim/commands.ts';

/** DR-066: the wobble is capped at 12°. */
export const WOBBLE_CAP_DECI = 120;
/** Swings over the settle. */
const SWINGS = 2;
/** Reduced motion: the settle ends this far into the aim phase. */
const REDUCED_SETTLE = 0.6;
/** The power bar climbs for this share of the settle, then eases back from the overshoot. */
const CLIMB = 0.6;

export interface ShownAim {
  angleDeci: number;
  powerMille: number;
}

type AimPlan = Pick<
  BotTurnPlan,
  'angleDeci' | 'powerMille' | 'wobbleDeci' | 'settleTicks' | 'overshoot'
>;

/** How far the shown aim has settled, 0..1, after `ticks` sim ticks of the aim phase. */
export function settleProgress(plan: AimPlan, ticks: number, reduced: boolean): number {
  const len = Math.max(1, plan.settleTicks * (reduced ? REDUCED_SETTLE : 1));
  return Math.min(1, Math.max(0, ticks / len));
}

/**
 * The angle and power the crosshair, the power bar and the HUD mirror show
 * `ticks` into the aim phase. At progress 1 they are the fired values exactly.
 */
export function shownAim(plan: AimPlan, ticks: number, reduced: boolean): ShownAim {
  const u = settleProgress(plan, ticks, reduced);
  if (u >= 1) return { angleDeci: plan.angleDeci, powerMille: plan.powerMille };
  const amp = Math.min(WOBBLE_CAP_DECI, Math.max(0, plan.wobbleDeci)) * (reduced ? 0.5 : 1);
  const env = (1 - u) * (1 - u);
  const angle = plan.angleDeci + amp * env * Math.cos(2 * Math.PI * SWINGS * u);
  const os = reduced ? 0 : Math.max(0, plan.overshoot);
  const peak = plan.powerMille * (1 + os);
  let power: number;
  if (u < CLIMB) {
    const k = u / CLIMB;
    power = peak * (1 - (1 - k) * (1 - k));
  } else {
    const k = (u - CLIMB) / (1 - CLIMB);
    power = peak + (plan.powerMille - peak) * k * k * (3 - 2 * k);
  }
  return {
    angleDeci: Math.round(Math.min(AIM_MAX_DECI, Math.max(AIM_MIN_DECI, angle))),
    powerMille: Math.round(Math.min(POWER_MAX_MILLE, Math.max(0, power))),
  };
}
