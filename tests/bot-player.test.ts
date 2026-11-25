/**
 * Stage 6, part 3: the `?bot` switch (proposed OVR-020), the Battle's bot
 * player (DR-066 phase order through the player's command path, played by the
 * AI's own `BotDriver` script) and the DR-129 aim curves. A fake solver job stands in for `startBotTurn`.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BotPlan, BotPlanJob } from '../src/ai/bot.ts';
import type { ShotOutcome } from '../src/ai/error.ts';
import type { BotMove } from '../src/ai/solver.ts';
import { type BotMemory, type BotParams, freshMemory } from '../src/ai/types.ts';
import { settleProgress, shownAim, WOBBLE_CAP_DECI } from '../src/game/botAim.ts';
import { BOT_TEAM, botSetup, parseBotConfig } from '../src/game/botConfig.ts';
import { type BotPhase, BotPlayer, SimBudget } from '../src/game/botPlayer.ts';
import { versusMatch } from '../src/game/twoPlayer.ts';
import { defaultTwoPlayer } from '../src/save/schema.ts';
import { Match } from '../src/sim/match.ts';

describe('parseBotConfig (?bot=N, proposed OVR-020)', () => {
  it('reads the level and the boss flag, team 1 is the bot', () => {
    expect(parseBotConfig('?bot=40')).toEqual({ team: 1, level: 40, boss: false });
    expect(parseBotConfig('?seed=3&bot=7&boss=1')).toEqual({ team: 1, level: 7, boss: true });
    expect(BOT_TEAM).toBe(1);
  });
  it('clamps to 0..100', () => {
    expect(parseBotConfig('?bot=150')?.level).toBe(100);
    expect(parseBotConfig('?bot=-3')?.level).toBe(0);
    expect(parseBotConfig('?bot=0')?.level).toBe(0);
  });
  it('a bad value or no parameter means no bot', () => {
    for (const q of [
      '',
      '?seed=1',
      '?bot',
      '?bot=',
      '?bot=abc',
      '?bot=4.5',
      '?bot=1e3',
      '?bot=NaN',
    ])
      expect(parseBotConfig(q), q).toBeNull();
  });
  it('a bot match has no pass-the-phone gate; the hot seat is unchanged', () => {
    const s = { ...defaultTwoPlayer(), passPhone: true };
    expect(botSetup(s, null)).toBe(s);
    expect(botSetup(s, { team: 1, level: 40, boss: false }).passPhone).toBe(false);
  });
});

function plan(over: Partial<BotPlan> = {}): BotPlan {
  return {
    move: null,
    weapon: 'seed',
    facing: -1,
    angleDeci: 400,
    powerMille: 550,
    target: 0,
    thinkTicks: 30,
    wobbleDeci: 60,
    settleTicks: 40,
    overshoot: 0.1,
    debug: { best: null, brainFart: false, sims: 0 },
    memory: { ...freshMemory(), target: 0, shotsAtTarget: 1 },
    chosen: null,
    ranked: [],
    ...over,
  };
}

/** A job that is done after `steps` calls to `step`. */
function fakeJob(p: BotPlan, steps: number): BotPlanJob {
  let n = 0;
  let sims = 0;
  return {
    step(max: number) {
      if (n >= steps) return;
      n++;
      sims += max;
    },
    get done() {
      return n >= steps;
    },
    get plan() {
      return n >= steps ? p : null;
    },
    get simsUsed() {
      return sims;
    },
  };
}

function setup(p: BotPlan, jobSteps = 1) {
  const cfg = { team: 1, level: 40, boss: false };
  const m = new Match(versusMatch(botSetup(defaultTwoPlayer(), cfg), 42));
  const start = vi.fn(() => fakeJob(p, jobSteps));
  const after = vi.fn((mem: BotMemory, _p: BotParams, _o: ShotOutcome) => ({
    ...mem,
    rattled: true,
  }));
  const bot = new BotPlayer(cfg, { start, after });
  /** One frame-tick: the scene's tick, a frame of thinking, the sim step. */
  const step = () => {
    bot.tick(m);
    bot.think(10);
    m.step();
  };
  const until = (pred: () => boolean, max = 5000) => {
    for (let i = 0; i < max && !pred(); i++) step();
    return pred();
  };
  return { m, bot, start, after, step, until };
}

/** Plays the human's turn (team 0) with one shot, if the coin gave team 0 the start. */
function humanTurnIfFirst(s: ReturnType<typeof setup>): void {
  const { m, until } = s;
  if (m.turns.team === BOT_TEAM) return;
  expect(until(() => m.phase === 'aim')).toBe(true);
  m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 300 });
  expect(until(() => m.turns.team === BOT_TEAM)).toBe(true);
}

const fireOf = (m: Match) => m.log.filter((c) => c.kind === 'fire').pop();

describe('BotPlayer (DR-066 timing through the player command path)', () => {
  it('plays think → aim → fire with the plan values, after think and settle ticks', () => {
    // Amber starts facing left; a plan facing right turns with a `face`.
    const p = plan({ facing: 1 });
    const s = setup(p);
    humanTurnIfFirst(s);
    const { m, bot, until } = s;
    expect(bot.controls(m)).toBe(true);
    expect(until(() => m.phase === 'aim')).toBe(true);
    const aimTick = m.tick;
    const phases: (BotPhase | null)[] = [];
    let settled = false;
    expect(
      until(() => {
        if (phases[phases.length - 1] !== bot.phase) phases.push(bot.phase);
        if (bot.phase === 'aim' && bot.aimTicks === p.settleTicks) settled = true;
        return m.phase === 'fire';
      }),
    ).toBe(true);
    expect(bot.history).toEqual(['think', 'aim', 'fire']);
    expect(phases).toEqual([null, 'think', 'aim', 'fire']);
    expect(settled || bot.aimTicks === p.settleTicks).toBe(true);
    const fire = fireOf(m);
    expect(fire).toMatchObject({ weapon: 'seed', angleDeci: 400, powerMille: 550 });
    // Think (solver time included) then the visible aim, then the shot.
    const gap = (fire?.tick ?? 0) - aimTick;
    expect(gap).toBeGreaterThanOrEqual(p.thinkTicks + p.settleTicks);
    expect(gap).toBeLessThanOrEqual(p.thinkTicks + p.settleTicks + 2);
    const kinds = m.log.filter((c) => c.tick > aimTick).map((c) => c.kind);
    expect(kinds).toEqual(['face', 'fire']);
    expect(m.activeAnt?.facing).toBe(1);
    expect(m.turns.timerStarted).toBe(true);
    expect(s.start).toHaveBeenCalledTimes(1);
  });

  it('updates the memory from the plan after the shot and keeps it for the next turn', () => {
    const s = setup(plan());
    humanTurnIfFirst(s);
    const { m, bot, until, after } = s;
    expect(until(() => m.phase === 'turnEnd' && m.turns.team === BOT_TEAM)).toBe(true);
    s.step();
    expect(after).toHaveBeenCalledTimes(1);
    // afterShot gets the memory the plan's fire values left (E_n, bracketing).
    expect(after.mock.calls[0]?.[0]).toMatchObject({ target: 0, shotsAtTarget: 1 });
    const outcome = after.mock.calls[0]?.[2] as ShotOutcome;
    expect(outcome.target).toBe(0);
    expect(outcome.enemyMaxHp).toBe(100);
    expect(outcome.enemyAntsLeft).toBeGreaterThan(0);
    expect(typeof outcome.hit).toBe('boolean');
    expect(Number.isFinite(outcome.missPower)).toBe(true);
    expect(outcome.missAngle).toBe(0);
    expect(bot.lastOutcome).toEqual(outcome);
    expect(bot.memory.rattled).toBe(true);
    // Back to the human; the player lets go and keeps the memory.
    expect(until(() => m.turns.team !== BOT_TEAM)).toBe(true);
    s.step();
    expect(bot.controls(m)).toBe(false);
    expect(bot.phase).toBeNull();
    expect(bot.memory).toMatchObject({ rattled: true, shotsAtTarget: 1 });
  });

  it('a solve past thinkTicks keeps the rest of the spacing', () => {
    const p = plan({ thinkTicks: 5 });
    const s = setup(p, 40);
    humanTurnIfFirst(s);
    const { m, until } = s;
    expect(until(() => m.phase === 'aim')).toBe(true);
    const aimTick = m.tick;
    expect(until(() => m.phase === 'fire')).toBe(true);
    expect((fireOf(m)?.tick ?? 0) - aimTick).toBeGreaterThanOrEqual(40 + p.settleTicks);
  });

  it('walks with walk, then walk 0 after move.ticks, then faces and aims', () => {
    const move: BotMove = { dir: -1, px: 30, ticks: 20, restTicks: 6, x: 0, y: 0 };
    const p = plan({ move, facing: 1 });
    const s = setup(p);
    humanTurnIfFirst(s);
    const { m, bot, until } = s;
    expect(until(() => m.phase === 'aim')).toBe(true);
    const x0 = m.activeAnt?.x ?? 0;
    const budget0 = m.activeAnt?.budget ?? 0;
    const aimTick = m.tick;
    expect(until(() => m.phase === 'fire')).toBe(true);
    expect(bot.history).toEqual(['think', 'move', 'aim', 'fire']);
    const cmds = m.log.filter((c) => c.tick > aimTick);
    expect(cmds.map((c) => c.kind)).toEqual(['walk', 'walk', 'face', 'fire']);
    const [w1, w0, face] = cmds;
    expect(w1).toMatchObject({ dir: -1 });
    expect(w0).toMatchObject({ dir: 0 });
    expect((w0?.tick ?? 0) - (w1?.tick ?? 0)).toBe(move.ticks);
    expect((face?.tick ?? 0) - (w0?.tick ?? 0)).toBe(move.restTicks);
    expect(m.activeAnt?.x).toBeLessThan(x0);
    expect(m.activeAnt?.budget).toBeLessThan(budget0);
  });

  it('a Pause cancel mid-walk is held again', () => {
    const move: BotMove = { dir: -1, px: 30, ticks: 30, restTicks: 6, x: 0, y: 0 };
    const s = setup(plan({ move }));
    humanTurnIfFirst(s);
    const { m, bot, until, step } = s;
    expect(until(() => bot.phase === 'move')).toBe(true);
    step();
    step();
    m.push({ kind: 'cancel' });
    step();
    expect(m.turns.heldDir).toBe(0);
    step();
    expect(m.turns.heldDir).toBe(-1);
    expect(until(() => m.phase === 'fire')).toBe(true);
    expect(bot.history).toEqual(['think', 'move', 'aim', 'fire']);
  });
});

describe('bot aim curves (DR-129, cosmetic)', () => {
  const p = plan({
    angleDeci: 300,
    powerMille: 600,
    wobbleDeci: 90,
    settleTicks: 60,
    overshoot: 0.1,
  });

  it('ends exactly on the fired values', () => {
    for (const reduced of [false, true]) {
      expect(shownAim(p, 60, reduced)).toEqual({ angleDeci: 300, powerMille: 600 });
      expect(shownAim(p, 1000, reduced)).toEqual({ angleDeci: 300, powerMille: 600 });
    }
  });

  it('wobbles within ±wobbleDeci, capped at 12°, and overshoots the power a little', () => {
    let maxA = 0;
    let maxP = 0;
    for (let t = 0; t < 60; t++) {
      const s = shownAim(p, t, false);
      maxA = Math.max(maxA, Math.abs(s.angleDeci - 300));
      maxP = Math.max(maxP, s.powerMille);
    }
    expect(maxA).toBeGreaterThan(60);
    expect(maxA).toBeLessThanOrEqual(90);
    expect(maxP).toBeGreaterThan(600);
    expect(maxP).toBeLessThanOrEqual(660);
    const big = plan({ wobbleDeci: 400 });
    expect(Math.abs(shownAim(big, 0, false).angleDeci - big.angleDeci)).toBeLessThanOrEqual(
      WOBBLE_CAP_DECI,
    );
  });

  it('reduced motion: half the wobble, a shorter settle, no overshoot', () => {
    expect(Math.abs(shownAim(p, 0, true).angleDeci - 300)).toBeLessThanOrEqual(45);
    expect(settleProgress(p, 36, true)).toBe(1);
    expect(settleProgress(p, 36, false)).toBeLessThan(1);
    for (let t = 0; t < 60; t++) expect(shownAim(p, t, true).powerMille).toBeLessThanOrEqual(600);
  });
});

describe('SimBudget (DR-060: ≤ 4 ms a frame)', () => {
  it('fits the measured cost into the frame budget', () => {
    const b = new SimBudget(4, 0.25, 400);
    expect(b.next()).toBe(16);
    b.record(16, 16); // 1 ms a sim: the next frame gets 4
    expect(b.next()).toBe(4);
    b.record(4, 0.4); // cheaper: it recovers slowly
    expect(b.next()).toBeGreaterThan(4);
    b.record(10, 1000);
    expect(b.next()).toBe(1);
    const fast = new SimBudget(4, 0.0001, 50);
    expect(fast.next()).toBe(50);
  });
});
