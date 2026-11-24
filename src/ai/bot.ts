/**
 * One bot turn (DR-060 to DR-067): error draws → solver on the perceived wind
 * → brain-fart pick → fire values → think/wobble timing. Returns a BotJob the
 * Battle scene steps once a frame.
 * STUB from the orchestrator: plans an instant 45°/50% Seed shot at the
 * nearest enemy. The solver work replaces the body; the signature is the
 * contract the Battle scene uses.
 */
import type { Match } from '../sim/match.ts';
import { isActive } from '../sim/movement.ts';
import type { BotJob, BotMemory, BotParams, BotTurnPlan } from './types.ts';

export interface BotTurnInput {
  match: Match;
  /** Ant index whose turn it is (a bot ant). */
  ant: number;
  params: BotParams;
  memory: BotMemory;
}

export function startBotTurn(input: BotTurnInput): BotJob {
  const ants = input.match.world.ants;
  const me = ants[input.ant];
  if (!me) throw new RangeError('startBotTurn: no ant');
  let target = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i];
    if (!a || a.team === me.team || !isActive(a)) continue;
    const d = Math.abs(a.x - me.x);
    if (d < bestD) {
      bestD = d;
      target = i;
    }
  }
  const tx = ants[target]?.x ?? me.x + me.facing;
  const plan: BotTurnPlan = {
    move: null,
    weapon: 'seed',
    facing: tx >= me.x ? 1 : -1,
    angleDeci: 450,
    powerMille: 500,
    target,
    thinkTicks: Math.round(input.params.thinkS * 60),
    wobbleDeci: Math.min(120, Math.round(30 * input.params.sigmaA)),
    settleTicks: 54,
    overshoot: 0,
    debug: { best: null, brainFart: false, sims: 0 },
  };
  return { step() {}, done: true, plan, simsUsed: 0 };
}
