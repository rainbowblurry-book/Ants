/**
 * Headless bot-vs-bot match runner (stage 6 tests, PLAN §10 assert 9).
 *
 * Drives a real `Match` with `Match.push` / `step` exactly as the Battle
 * scene would: at each Move/Aim start the side's bot plans a turn
 * (`startBotTurn`, stepped `simsPerFrame` sims per tick to stand in for
 * frames), then a `BotDriver` pushes the walk / face / fire commands at their
 * ticks. After each shot resolves, `afterShot` updates the side's memory
 * (bracketing, DR-067 rattled). Pure: no clock, no Phaser.
 */

import { ANT_MAX_HP } from '../sim/damage.ts';
import { Match, type MatchConfig } from '../sim/match.ts';
import { type Ant, isActive } from '../sim/movement.ts';
import type { MatchResult } from '../sim/turn.ts';
import {
  BOT_SIMS_PER_FRAME,
  BotDriver,
  type BotPlan,
  type BotPlanJob,
  startBotTurn,
} from './bot.ts';
import { botParams } from './botParams.ts';
import {
  afterShot,
  type HitBlast,
  isLethalBlast,
  missFromImpact,
  type ShotOutcome,
} from './error.ts';
import { type BotMemory, freshMemory } from './types.ts';

export interface BotSide {
  level: number;
  boss?: boolean;
}

export interface BotShotLog {
  team: number;
  ant: number;
  turn: number;
  plan: BotPlan;
  outcome: ShotOutcome;
  /** DR-062 hit on the aimed target. */
  hit: boolean;
}

export interface BotMatchOptions {
  config: MatchConfig;
  /** One bot per team, in team order. */
  sides: BotSide[];
  /** Solver sims per tick while planning (default BOT_SIMS_PER_FRAME). */
  simsPerFrame?: number;
  /** Stop after this many ticks (default 60 000, about 17 minutes of play). */
  maxTicks?: number;
  /** Called after each shot resolves. */
  onShot?: (log: BotShotLog) => void;
}

export interface BotMatchResult {
  result: MatchResult | null;
  ticks: number;
  shots: BotShotLog[];
  /** Solver sims per bot turn, in order. */
  sims: number[];
  stateHash: number;
  /** Turn timeouts and rejected commands (both should stay 0 for bots). */
  timeouts: number;
  rejects: number;
}

/** The DR-061 / DR-067 outcome of one bot shot, for `afterShot`. */
export function shotOutcome(
  match: Match,
  plan: BotPlan,
  shooterTeam: number,
  shooterX: number,
  targetAt: { x: number; y: number } | null,
  shot: Match['shots'][number] | undefined,
): { outcome: ShotOutcome; hit: boolean } {
  const ants = match.world.ants;
  let dmg = 0;
  let enemyMax = 0;
  let left = 0;
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i] as Ant;
    if (a.team === shooterTeam) continue;
    dmg += shot?.dealt[i] ?? 0;
    enemyMax = Math.max(enemyMax, ANT_MAX_HP);
    if (isActive(a)) left++;
  }
  // DR-062 on the shot's first blast (a fizzle first is a miss), as the cap suite does.
  let first: HitBlast | null = null;
  let fizzled = false;
  for (const e of shot?.events ?? []) {
    if (e.kind === 'blast') {
      first = { x: e.blast.x, y: e.blast.y, r: e.blast.r, direct: e.blast.direct };
      break;
    }
    if (e.kind === 'fizzle') {
      fizzled = true;
      break;
    }
  }
  const hit =
    targetAt !== null && first !== null && !fizzled && isLethalBlast(first, plan.target, targetAt);
  const missPower =
    targetAt && first ? missFromImpact(shooterX, targetAt.x, first.x, plan.powerMille) : 0;
  return {
    outcome: {
      target: plan.target,
      damageToEnemy: dmg,
      enemyMaxHp: enemyMax,
      hit,
      enemyAntsLeft: left,
      missPower,
      missAngle: 0,
    },
    hit,
  };
}

/** Plays a whole bot-vs-bot match. Deterministic for a given config. */
export function runBotMatch(opts: BotMatchOptions): BotMatchResult {
  const match = new Match(opts.config);
  const per = opts.simsPerFrame ?? BOT_SIMS_PER_FRAME;
  const maxTicks = opts.maxTicks ?? 60000;
  const memory: BotMemory[] = opts.sides.map(() => freshMemory());
  const shots: BotShotLog[] = [];
  const sims: number[] = [];
  let turn = -1;
  let job: BotPlanJob | null = null;
  let driver: BotDriver | null = null;
  let aimTicks = 0;
  let pending: {
    plan: BotPlan;
    team: number;
    ant: number;
    turn: number;
    x: number;
    target: { x: number; y: number } | null;
    shotsBefore: number;
  } | null = null;

  const settle = () => {
    if (!pending) return;
    const shot =
      match.shots.length > pending.shotsBefore ? match.shots[pending.shotsBefore] : undefined;
    const { outcome, hit } = shotOutcome(
      match,
      pending.plan,
      pending.team,
      pending.x,
      pending.target,
      shot,
    );
    const side = opts.sides[pending.team] as BotSide;
    memory[pending.team] = afterShot(
      pending.plan.memory,
      botParams(side.level, { boss: side.boss }),
      outcome,
    );
    const log: BotShotLog = {
      team: pending.team,
      ant: pending.ant,
      turn: pending.turn,
      plan: pending.plan,
      outcome,
      hit,
    };
    shots.push(log);
    opts.onShot?.(log);
    pending = null;
  };

  while (!match.over && match.tick < maxTicks) {
    const t = match.turns;
    if (t.turn !== turn) {
      settle();
      turn = t.turn;
      job = null;
      driver = null;
      aimTicks = 0;
    }
    if (match.phase === 'turnEnd') settle();
    if (match.phase === 'aim') {
      const team = t.team;
      const side = opts.sides[team] as BotSide;
      if (!job) {
        const mem = memory[team] as BotMemory;
        job = startBotTurn({
          match,
          ant: t.ant,
          params: botParams(side.level, { boss: side.boss, rattled: mem.rattled }),
          memory: mem,
        });
      }
      if (!job.done) job.step(per);
      if (job.done && !driver && job.plan) {
        const plan = job.plan;
        sims.push(job.simsUsed);
        driver = new BotDriver(plan, aimTicks);
        const me = match.world.ants[t.ant] as Ant;
        const tgt = plan.target >= 0 ? match.world.ants[plan.target] : undefined;
        pending = {
          plan,
          team,
          ant: t.ant,
          turn,
          x: plan.move ? plan.move.x : me.x,
          target: tgt ? { x: tgt.x, y: tgt.y } : null,
          shotsBefore: match.shots.length,
        };
      }
      if (driver) driver.beforeStep(match);
      aimTicks++;
    }
    match.step();
  }
  settle();
  let timeouts = 0;
  let rejects = 0;
  for (const e of match.events) {
    if (e.kind === 'timeout') timeouts++;
    else if (e.kind === 'reject') rejects++;
  }
  return {
    result: match.result,
    ticks: match.tick,
    shots,
    sims,
    stateHash: match.stateHash(),
    timeouts,
    rejects,
  };
}
