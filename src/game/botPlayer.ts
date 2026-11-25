/**
 * Plays a bot's turns in the Battle scene (stage 6; DR-060, DR-066, DR-067,
 * DR-129).
 *
 * The scene calls `tick(match)` before every `match.step()` and
 * `think(maxSims)` once a frame with a budget it picks from its own timing
 * (≤ 4 ms a frame, DR-060). Nothing here reads a clock: every wait is counted
 * in sim ticks, so Pause stops it and a test can step it.
 *
 * One bot turn: at the first Move/Aim tick `startBotTurn` plans it (the solver
 * job is stepped a slice a frame). When the plan is ready, the AI's own
 * scheduler (`BotDriver` in src/ai/bot.ts, the one the headless runner uses)
 * pushes `walk`, `walk 0`, `face` and `fire` at their ticks through
 * `match.push`, the path a player's input takes, so the bot obeys the timer,
 * the walk budget, ammo and the buffers, and the command log replays it.
 * The phases shown to the player follow that schedule:
 *   think  until the first scripted command (thinkTicks, solver time included)
 *   move   from `walk` until `face`
 *   aim    from `face` for `settleTicks` (the DR-129 wobble clock is `aimTicks`)
 *   fire   from `fire` until the turn passes
 * After the shot, `shotOutcome` + `afterShot` update the team's BotMemory,
 * which is kept across turns.
 *
 * Pure: no Phaser, no wall clock.
 */
import {
  type BotPlan,
  type BotPlanJob,
  BotDriver as BotScript,
  type ScriptedCommand,
  startBotTurn,
} from '../ai/bot.ts';
import { shotOutcome } from '../ai/botMatch.ts';
import { botParams } from '../ai/botParams.ts';
import { afterShot, type ShotOutcome } from '../ai/error.ts';
import { type BotMemory, freshMemory } from '../ai/types.ts';
import type { Match } from '../sim/match.ts';
import { GATE_LOCKOUT_TICKS, GATE_PAN_TICKS } from '../sim/turn.ts';
import type { BotConfig } from './botConfig.ts';

export type BotPhase = 'think' | 'move' | 'aim' | 'fire';

export interface BotDeps {
  start: typeof startBotTurn;
  params: typeof botParams;
  after: typeof afterShot;
}

const DEFAULT_DEPS: BotDeps = { start: startBotTurn, params: botParams, after: afterShot };

/** When each scripted command goes out, in Move/Aim ticks (the AI scheduler's own rule). */
interface Schedule {
  walk: number | null;
  stop: number | null;
  dir: -1 | 0 | 1;
  face: number;
  fire: number;
}

function schedule(script: readonly ScriptedCommand[], shift: number): Schedule {
  const s: Schedule = { walk: null, stop: null, dir: 0, face: 0, fire: 0 };
  for (const c of script) {
    const at = c.at + shift;
    if (c.cmd.kind === 'walk' && c.cmd.dir !== 0) {
      s.walk = at;
      s.dir = c.cmd.dir;
    } else if (c.cmd.kind === 'walk') s.stop = at;
    else if (c.cmd.kind === 'face') s.face = at;
    else if (c.cmd.kind === 'fire') s.fire = at;
  }
  return s;
}

export class BotPlayer {
  readonly team: number;
  readonly level: number;
  readonly boss: boolean;
  /** The team's memory across turns (DR-061 bracketing, DR-067 rattled). */
  memory: BotMemory = freshMemory();
  phase: BotPhase | null = null;
  plan: BotPlan | null = null;
  /** The phases of the current (or last) bot turn, in order (tests). */
  history: BotPhase[] = [];
  /** Ticks into the aim phase: the clock of the wobble and the power bar (DR-129). */
  aimTicks = 0;
  /** The outcome sent to `afterShot` last (tests). */
  lastOutcome: ShotOutcome | null = null;
  private readonly deps: BotDeps;
  private job: BotPlanJob | null = null;
  private script: BotScript | null = null;
  private when: Schedule | null = null;
  private turnKey = -1;
  private gateSent = false;
  private pending: {
    plan: BotPlan;
    x: number;
    target: { x: number; y: number } | null;
    shotsBefore: number;
  } | null = null;

  constructor(cfg: BotConfig, deps: Partial<BotDeps> = {}) {
    this.team = cfg.team;
    this.level = cfg.level;
    this.boss = cfg.boss;
    this.deps = { ...DEFAULT_DEPS, ...deps };
  }

  /** True while it is the bot's turn: the player's input is ignored then. */
  controls(m: Match): boolean {
    return !m.over && m.turns.team === this.team;
  }

  /** True while a solver job waits for frames. */
  get thinking(): boolean {
    return this.job !== null && !this.job.done;
  }

  /** Steps the solver job by at most `maxSims` shot sims; returns the sims used. */
  think(maxSims: number): number {
    const job = this.job;
    if (!job || job.done) return 0;
    const before = job.simsUsed;
    job.step(Math.max(1, Math.floor(maxSims)));
    return Math.max(0, job.simsUsed - before);
  }

  /** Call before every `match.step()`. Commands pushed here reach that step. */
  tick(m: Match): void {
    const t = m.turns;
    if (this.turnKey >= 0 && (t.turn !== this.turnKey || m.over)) this.endTurn(m);
    if (m.over || t.team !== this.team) return;
    if (this.turnKey !== t.turn) this.beginTurn(t.turn);
    if (t.phase === 'turnEnd') this.report(m);
    if (t.phase === 'turnStart') {
      // A bot passes its own gate when the sim allows it (DR-183; `?bot` turns the gate off anyway).
      if (t.rules.gate && !this.gateSent && t.phaseTick >= GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) {
        this.gateSent = true;
        m.push({ kind: 'ready' });
      }
      return;
    }
    if (t.phase !== 'aim') return;

    if (!this.job) {
      const params = this.deps.params(this.level, {
        boss: this.boss,
        rattled: this.memory.rattled,
      });
      this.job = this.deps.start({ match: m, ant: t.ant, params, memory: this.memory });
      this.enter('think');
    }
    const script = this.script ?? this.startScript(m);
    const w = this.when;
    if (!script || !w) return;
    const e = script.ticks;
    // A Pause clears the held walk (DR-171 `cancel`): hold it again inside the walk window.
    const walking = w.walk !== null && w.stop !== null && e > w.walk && e < w.stop;
    if (walking && w.dir !== 0 && t.heldDir !== w.dir) m.push({ kind: 'walk', dir: w.dir });
    script.beforeStep(m);
    const next: BotPhase =
      e >= w.fire
        ? 'fire'
        : e >= w.face
          ? 'aim'
          : w.walk !== null && e >= w.walk
            ? 'move'
            : 'think';
    if (next !== this.phase) this.enter(next);
    this.aimTicks = Math.max(0, Math.min(e + 1, w.fire) - w.face);
    if (next === 'fire' && !this.pending) {
      const plan = this.plan as BotPlan;
      const me = m.ants[t.ant];
      const tgt = plan.target >= 0 ? m.ants[plan.target] : undefined;
      this.pending = {
        plan,
        x: plan.move ? plan.move.x : (me?.x ?? 0),
        target: tgt ? { x: tgt.x, y: tgt.y } : null,
        shotsBefore: m.shots.length,
      };
    }
  }

  private startScript(m: Match): BotScript | null {
    const job = this.job;
    if (!job?.done || !job.plan) return null;
    const plan = job.plan;
    // Move/Aim ticks already gone (the solver can run past the think time).
    const late = m.turns.phaseTick;
    const script = new BotScript(plan, late);
    this.plan = plan;
    this.script = script;
    this.when = schedule(script.script, Math.max(0, late - plan.thinkTicks));
    return script;
  }

  private beginTurn(turn: number): void {
    this.turnKey = turn;
    this.phase = null;
    this.plan = null;
    this.job = null;
    this.script = null;
    this.when = null;
    this.history = [];
    this.aimTicks = 0;
    this.gateSent = false;
    this.pending = null;
  }

  private endTurn(m: Match): void {
    this.report(m);
    this.turnKey = -1;
    this.phase = null;
    this.job = null;
    this.script = null;
  }

  private enter(p: BotPhase): void {
    this.phase = p;
    this.history.push(p);
  }

  private report(m: Match): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    const shot = m.shots.length > p.shotsBefore ? m.shots[p.shotsBefore] : undefined;
    const { outcome } = shotOutcome(m, p.plan, this.team, p.x, p.target, shot);
    this.lastOutcome = outcome;
    this.memory = this.deps.after(
      p.plan.memory,
      this.deps.params(this.level, { boss: this.boss }),
      outcome,
    );
  }
}

/**
 * Picks a frame's solver budget from measured cost (DR-060: ≤ 4 ms a frame).
 * The scene times each `think` with `performance.now()` and reports it here.
 */
export class SimBudget {
  private msPerSim: number;

  constructor(
    readonly frameMs = 4,
    guessMsPerSim = 0.1,
    readonly maxSims = 48,
  ) {
    this.msPerSim = guessMsPerSim;
  }

  /** Sims to allow this frame. */
  next(): number {
    return Math.max(1, Math.min(this.maxSims, Math.floor(this.frameMs / this.msPerSim)));
  }

  /** Records what a frame's sims cost; a slow frame lowers the next budget at once. */
  record(sims: number, ms: number): void {
    if (sims <= 0 || !(ms >= 0)) return;
    const per = Math.max(0.001, ms / sims);
    this.msPerSim = per > this.msPerSim ? per : this.msPerSim * 0.7 + per * 0.3;
  }
}
