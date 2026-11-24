/**
 * One bot turn (DR-060 to DR-067, DR-129): error draws → solver on the
 * perceived wind → brain-fart pick → fire values → think/wobble timing.
 * Returns a BotJob the Battle scene steps once a frame.
 *
 * Order of work (DR-061): `drawErrors` takes every `ai`-stream draw up front,
 * so the stream use never depends on the search. The solver then runs in
 * slices of `maxSims` simulated shots per `step` (no clock: the scene picks
 * maxSims). When it is done, `pickCandidate` and `fireValues` turn the ranked
 * candidates into the integer command values.
 *
 * Playing a plan (see `botScript` and `BotDriver`): count ticks from the
 * first Move/Aim tick. Think for `thinkTicks` (the solver runs inside it),
 * then hold `walk` for `move.ticks` ticks and release it, wait
 * `move.restTicks`, `face` the target, show the aim wobble for `settleTicks`,
 * then `fire`. Everything after the think is exact: the walk was simulated
 * tick by tick on a copy of the ant.
 */

import type { CommandBody } from '../sim/commands.ts';
import type { Match } from '../sim/match.ts';
import { WALK_SPEED } from '../sim/movement.ts';
import { SIM_HZ } from '../sim/physics.ts';
import { FIRE_LOCK_TICKS } from '../sim/turn.ts';
import { drawErrors, fireValues, perceivedWind, pickCandidate, type ShotErrors } from './error.ts';
import { type BotMove, type SolverJob, type SolverResult, startSolver } from './solver.ts';
import type { BotJob, BotMemory, BotParams, BotTurnPlan, Candidate, MovePlan } from './types.ts';

export interface BotTurnInput {
  match: Match;
  /** Ant index whose turn it is (a bot ant). */
  ant: number;
  params: BotParams;
  memory: BotMemory;
  /** Allow the move-first check (default true). */
  allowMove?: boolean;
}

/** A BotTurnPlan with what Battle needs to play it and to remember the turn. */
export interface BotPlan extends BotTurnPlan {
  move: BotMove | null;
  /** Memory after this shot's fire values; pass it to `afterShot` once the shot resolves. */
  memory: BotMemory;
  /** The candidate the bot went for (after the brain-fart rule). */
  chosen: Candidate | null;
  /** Every ranked candidate (best first). */
  ranked: Candidate[];
}

export interface BotPlanJob extends BotJob {
  readonly plan: BotPlan | null;
}

/** Recommended sims per `step` call (one call a frame): see tests/solver.test.ts. */
export const BOT_SIMS_PER_FRAME = 48;

/** Aim settle (DR-066 aim phase 0.6–1.2 s): 72 ticks at L0 down to 36 at L100. */
export const SETTLE_MAX_TICKS = 72;
export const SETTLE_MIN_TICKS = 36;
/** Wobble amplitude 3·σ_a, in 0.1°, capped at 12° (DR-066). */
export const WOBBLE_MAX_DECI = 120;
/** Power bar overshoot at L0, falling to 0 at the cap level (DR-066). */
export const OVERSHOOT_MAX = 0.08;
export const OVERSHOOT_CAP_LEVEL = 90;

function clampInt(v: number, lo: number, hi: number): number {
  const r = Math.round(v);
  return r < lo ? lo : Math.min(r, hi);
}

/** The DR-066 timing of a turn for a level. */
export function botTiming(p: BotParams): {
  thinkTicks: number;
  settleTicks: number;
  wobbleDeci: number;
  overshoot: number;
} {
  const u = p.level <= 0 ? 0 : Math.min(p.level / 100, 1);
  const settle = Math.round(SETTLE_MAX_TICKS - (SETTLE_MAX_TICKS - SETTLE_MIN_TICKS) * u);
  const os =
    p.level >= OVERSHOOT_CAP_LEVEL
      ? 0
      : (OVERSHOOT_MAX * (OVERSHOOT_CAP_LEVEL - Math.max(p.level, 0))) / OVERSHOOT_CAP_LEVEL;
  return {
    thinkTicks: Math.round(p.thinkS * SIM_HZ),
    settleTicks: settle,
    wobbleDeci: Math.min(WOBBLE_MAX_DECI, Math.round(30 * p.sigmaA)),
    overshoot: Math.round(os * 1000) / 1000,
  };
}

function buildPlan(
  input: BotTurnInput,
  e: ShotErrors,
  res: SolverResult,
  timing: ReturnType<typeof botTiming>,
): BotPlan {
  const me = input.match.world.ants[input.ant];
  if (!me) throw new RangeError('startBotTurn: no ant');
  const best = res.ranked[0] ?? null;
  const chosen = pickCandidate(res.ranked, e);
  const base = {
    thinkTicks: timing.thinkTicks,
    wobbleDeci: timing.wobbleDeci,
    settleTicks: timing.settleTicks,
    overshoot: timing.overshoot,
    ranked: res.ranked,
  };
  if (!chosen) {
    // Nothing to shoot at (no enemy or no weapon): a harmless lob, never a walk.
    return {
      ...base,
      move: null,
      weapon: 'seed',
      facing: me.facing,
      angleDeci: 450,
      powerMille: 500,
      target: -1,
      memory: { ...input.memory },
      chosen: null,
      debug: { best, brainFart: false, sims: res.sims },
    };
  }
  const fv = fireValues(chosen, e, input.params, input.memory);
  return {
    ...base,
    move: res.move,
    weapon: chosen.weapon,
    facing: chosen.facing,
    angleDeci: clampInt(fv.angleDeci, -200, 900),
    powerMille: clampInt(fv.powerMille, 0, 1000),
    target: chosen.target,
    memory: fv.memory,
    chosen,
    debug: { best, brainFart: e.brainFart && chosen !== best, sims: res.sims },
  };
}

export function startBotTurn(input: BotTurnInput): BotPlanJob {
  const match = input.match;
  const me = match.world.ants[input.ant];
  if (!me) throw new RangeError('startBotTurn: no ant');
  // DR-061: every ai-stream draw of this shot, up front.
  const errors = drawErrors(match.streams.ai, input.params);
  const wind = perceivedWind(match.world.wind, errors);
  const timing = botTiming(input.params);
  const ammo = match.ammo[me.team];
  if (!ammo) throw new RangeError('startBotTurn: no ammo pool for the team');
  const solver: SolverJob = startSolver({
    world: match.world,
    shooter: input.ant,
    ammo,
    wind,
    trueWind: match.world.wind,
    // The shot spawns after the think, the aim settle and the fire lock (+ any walk).
    fireDelay: timing.thinkTicks + timing.settleTicks + FIRE_LOCK_TICKS + 1,
    allowMove: input.allowMove,
  });
  let plan: BotPlan | null = null;
  return {
    step(maxSims: number) {
      if (plan) return;
      solver.step(maxSims);
      if (solver.done && solver.result) plan = buildPlan(input, errors, solver.result, timing);
    },
    get done() {
      return plan !== null;
    },
    get plan() {
      return plan;
    },
    get simsUsed() {
      return solver.sims;
    },
  };
}

// ------------------------------------------------------------- playing a plan

export interface ScriptedCommand {
  /** Push before the Move/Aim tick with this index (0 = the first Move/Aim tick). */
  at: number;
  cmd: CommandBody;
}

/** The commands of a plan, in order, timed from the first Move/Aim tick. */
export function botScript(plan: BotTurnPlan): ScriptedCommand[] {
  const out: ScriptedCommand[] = [];
  let t = plan.thinkTicks;
  const mv = plan.move as (MovePlan & Partial<BotMove>) | null;
  if (mv && mv.px > 0) {
    // A plain MovePlan (no simulated hold length) walks at full speed.
    const ticks = mv.ticks ?? Math.ceil((mv.px * SIM_HZ) / WALK_SPEED);
    out.push({ at: t, cmd: { kind: 'walk', dir: mv.dir } });
    t += ticks;
    out.push({ at: t, cmd: { kind: 'walk', dir: 0 } });
    t += mv.restTicks ?? 0;
  }
  out.push({ at: t, cmd: { kind: 'face', dir: plan.facing } });
  t += plan.settleTicks;
  out.push({
    at: t,
    cmd: {
      kind: 'fire',
      weapon: plan.weapon,
      angleDeci: plan.angleDeci,
      powerMille: plan.powerMille,
    },
  });
  return out;
}

/**
 * Plays a plan into a match: call `beforeStep(match)` once before every
 * `match.step()` while it is this bot's Move/Aim phase. `lateBy` is how many
 * Move/Aim ticks had already passed when the plan arrived; if the solver ran
 * past the think time, the rest of the script keeps its gaps.
 */
export class BotDriver {
  readonly script: ScriptedCommand[];
  private next = 0;
  private elapsed: number;
  private readonly shift: number;

  constructor(plan: BotPlan | BotTurnPlan, lateBy = 0) {
    this.script = botScript(plan);
    this.elapsed = lateBy;
    this.shift = Math.max(0, lateBy - plan.thinkTicks);
  }

  get finished(): boolean {
    return this.next >= this.script.length;
  }

  /** Move/Aim ticks seen so far. */
  get ticks(): number {
    return this.elapsed;
  }

  beforeStep(match: Match): void {
    if (match.phase !== 'aim') return;
    while (this.next < this.script.length) {
      const s = this.script[this.next] as ScriptedCommand;
      if (s.at + this.shift > this.elapsed) break;
      match.push(s.cmd);
      this.next++;
    }
    this.elapsed++;
  }
}
