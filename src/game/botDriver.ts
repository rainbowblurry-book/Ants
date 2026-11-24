/**
 * Plays a bot's turns in a match (stage 6; DR-060, DR-066, DR-067, DR-129).
 *
 * The Battle scene calls `tick(match)` before every `match.step()` and
 * `think(maxSims)` once a frame with a budget it picks from its own timing
 * (≤ 4 ms a frame, DR-060). The driver never reads a clock: every wait is
 * counted in sim ticks, so Pause stops it and a test can step it.
 *
 * One bot turn, after TurnStart:
 *   think  `startBotTurn` at the first Move/Aim tick; the solver job is stepped
 *          each frame; the phase lasts `plan.thinkTicks`, solver time included
 *          (longer only if the job is not done yet).
 *   move   `walk` toward `plan.move.dir` until `move.px` is walked (or the walk
 *          budget, a wall or 4 s stops it), then `walk 0`.
 *   aim    `face` if needed, then `settleTicks` of visible aim (DR-129).
 *   fire   `fire` with the plan's weapon, angle and power.
 * Every command goes through `match.push`, the path a player's input takes, so
 * the bot obeys the timer, the walk budget, ammo and the buffers, and the
 * command log replays it. After the shot, `afterShot` updates the team's
 * BotMemory, which is kept across turns.
 *
 * Pure: no Phaser, no wall clock.
 */
import { startBotTurn } from '../ai/bot.ts';
import { botParams } from '../ai/botParams.ts';
import { afterShot, type ShotOutcome } from '../ai/error.ts';
import {
  type BotJob,
  type BotMemory,
  type BotParams,
  type BotTurnPlan,
  freshMemory,
} from '../ai/types.ts';
import { ANT_MAX_HP, blastDistance } from '../sim/damage.ts';
import type { Match } from '../sim/match.ts';
import { antSpeed, isActive } from '../sim/movement.ts';
import { GATE_LOCKOUT_TICKS, GATE_PAN_TICKS, SETTLE_SPEED } from '../sim/turn.ts';
import type { Shot } from '../sim/weapons/index.ts';
import type { BotConfig } from './botConfig.ts';

export type BotPhase = 'think' | 'move' | 'aim' | 'fire';

/** A walk that has not moved the ant for this many ticks has hit a wall or run out of budget. */
const STUCK_TICKS = 8;
/** The longest walk a bot turn takes (3 strides of 40 px at 80 px/s is 1.5 s). */
const MOVE_CAP_TICKS = 240;
/** A fire command the sim dropped (a Pause cleared the ring) is sent again, at most this often. */
const FIRE_TRIES = 3;
/** The settle used when the plan has none (DR-066 aim phase 0.6–1.2 s). */
const FALLBACK_SETTLE = 36;

export interface BotDeps {
  start: typeof startBotTurn;
  params: typeof botParams;
  after: typeof afterShot;
}

const DEFAULT_DEPS: BotDeps = { start: startBotTurn, params: botParams, after: afterShot };

export class BotDriver {
  readonly team: number;
  readonly level: number;
  readonly boss: boolean;
  /** The team's memory across turns (DR-061 bracketing, DR-067 rattled). */
  memory: BotMemory = freshMemory();
  phase: BotPhase | null = null;
  plan: BotTurnPlan | null = null;
  /** The phases of the current (or last) bot turn, in order (tests). */
  history: BotPhase[] = [];
  /** Ticks into the aim phase: the clock of the wobble and the power bar (DR-129). */
  aimTicks = 0;
  /** The outcome sent to `afterShot` last (tests). */
  lastOutcome: ShotOutcome | null = null;
  private readonly deps: BotDeps;
  private job: BotJob | null = null;
  private turnKey = -1;
  private paramsUsed: BotParams | null = null;
  private thinkTicks = 0;
  private moveTicks = 0;
  private moveFrom = 0;
  private lastX = 0;
  private stillTicks = 0;
  private fireTries = 0;
  private gateSent = false;
  private fired = false;
  private reported = false;
  private shotsBefore = 0;
  private shotAnt = -1;
  private hit: boolean | null = null;

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

    if (this.fired) {
      this.watchShot(m);
      if (t.phase === 'turnEnd') this.report(m);
      if (this.phase === 'fire' && t.phase === 'aim') this.retryFire(m);
      return;
    }
    if (t.phase === 'turnStart') {
      // A bot passes its own gate when the sim allows it (DR-183; `?bot` turns the gate off anyway).
      if (t.rules.gate && !this.gateSent && t.phaseTick >= GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) {
        this.gateSent = true;
        m.push({ kind: 'ready' });
      }
      return;
    }
    if (t.phase !== 'aim') return;
    const ant = m.activeAnt;
    if (!ant || !isActive(ant)) return;

    if (this.phase === null) {
      this.startThinking(m);
      return;
    }
    switch (this.phase) {
      case 'think': {
        this.thinkTicks++;
        const job = this.job;
        if (!job?.done || this.thinkTicks < (job.plan?.thinkTicks ?? 0)) return;
        const plan = job.plan ?? this.fallbackPlan(m);
        this.plan = plan;
        this.job = null;
        const mv = plan.move;
        if (mv && mv.px > 0) {
          this.enter('move');
          this.moveFrom = ant.x;
          this.lastX = ant.x;
          m.push({ kind: 'walk', dir: mv.dir });
        } else {
          this.enter('aim');
        }
        return;
      }
      case 'move': {
        const mv = this.plan?.move;
        this.moveTicks++;
        this.stillTicks = Math.abs(ant.x - this.lastX) < 0.01 ? this.stillTicks + 1 : 0;
        this.lastX = ant.x;
        const walked = Math.abs(ant.x - this.moveFrom);
        const done =
          !mv ||
          walked >= mv.px - 0.5 ||
          this.stillTicks >= STUCK_TICKS ||
          this.moveTicks >= MOVE_CAP_TICKS;
        if (done) {
          m.push({ kind: 'walk', dir: 0 });
          this.enter('aim');
        } else if (t.heldDir !== mv.dir) {
          // A Pause cleared the held walk (DR-171 `cancel`): hold it again.
          m.push({ kind: 'walk', dir: mv.dir });
        }
        return;
      }
      case 'aim': {
        const plan = this.plan as BotTurnPlan;
        if (t.heldDir !== 0) m.push({ kind: 'walk', dir: 0 });
        const grounded = ant.state === 'ground' && antSpeed(ant) < SETTLE_SPEED;
        if (!grounded) return;
        if (ant.facing !== plan.facing) {
          m.push({ kind: 'face', dir: plan.facing });
          return;
        }
        this.aimTicks++;
        if (this.aimTicks < Math.max(1, plan.settleTicks)) return;
        this.pushFire(m);
        this.enter('fire');
        return;
      }
      default:
        return;
    }
  }

  // ---------------------------------------------------------------- steps

  private beginTurn(turn: number): void {
    this.turnKey = turn;
    this.phase = null;
    this.plan = null;
    this.job = null;
    this.history = [];
    this.aimTicks = 0;
    this.thinkTicks = 0;
    this.moveTicks = 0;
    this.stillTicks = 0;
    this.fireTries = 0;
    this.gateSent = false;
    this.fired = false;
    this.reported = false;
    this.hit = null;
    this.paramsUsed = null;
  }

  private endTurn(m: Match): void {
    if (this.fired && !this.reported) this.report(m);
    this.turnKey = -1;
    this.phase = null;
    this.job = null;
  }

  private enter(p: BotPhase): void {
    this.phase = p;
    this.history.push(p);
  }

  private startThinking(m: Match): void {
    const t = m.turns;
    // A bot is at the controls at once: its timer runs from the start of Move/Aim (OVR-014).
    if (!t.timerStarted) m.push({ kind: 'ready' });
    const params = this.deps.params(this.level, { boss: this.boss, rattled: this.memory.rattled });
    this.paramsUsed = params;
    this.job = this.deps.start({ match: m, ant: t.ant, params, memory: this.memory });
    this.thinkTicks = 0;
    this.enter('think');
  }

  private pushFire(m: Match): void {
    const plan = this.plan as BotTurnPlan;
    const pool = m.ammo[this.team];
    // The bot obeys ammo like a player; a plan for an empty weapon falls back to the Seed (∞).
    const weapon = pool && pool[plan.weapon] > 0 ? plan.weapon : 'seed';
    this.shotsBefore = m.shots.length;
    this.shotAnt = m.turns.ant;
    this.fired = true;
    this.fireTries++;
    m.push({ kind: 'fire', weapon, angleDeci: plan.angleDeci, powerMille: plan.powerMille });
  }

  private retryFire(m: Match): void {
    const pending = m.turns.ring.pending.some((c) => c.kind === 'fire');
    if (pending || this.fireTries >= FIRE_TRIES) return;
    this.pushFire(m);
  }

  private fallbackPlan(m: Match): BotTurnPlan {
    const ant = m.activeAnt;
    return {
      move: null,
      weapon: 'seed',
      facing: (ant?.facing ?? 1) as 1 | -1,
      angleDeci: 450,
      powerMille: 500,
      target: -1,
      thinkTicks: 0,
      wobbleDeci: 0,
      settleTicks: FALLBACK_SETTLE,
      overshoot: 0,
      debug: { best: null, brainFart: false, sims: 0 },
    };
  }

  private shot(m: Match): Shot | null {
    if (m.shot && m.shot.shooter === this.shotAnt) return m.shot;
    const s = m.shots[this.shotsBefore];
    return s && s.shooter === this.shotAnt ? s : null;
  }

  /** DR-062: the first blast or fizzle is the impact; a hit is d ≤ 0.5·r to the target's hurtbox. */
  private watchShot(m: Match): void {
    if (this.hit !== null) return;
    const shot = this.shot(m);
    if (!shot) return;
    const first = shot.events.find((e) => e.kind === 'blast' || e.kind === 'fizzle');
    if (!first) return;
    const target = m.ants[this.plan?.target ?? -1];
    if (first.kind !== 'blast' || !target) {
      this.hit = false;
      return;
    }
    const d = blastDistance(first.blast.x, first.blast.y, target);
    this.hit = d <= 0.5 * first.blast.r;
  }

  private report(m: Match): void {
    if (this.reported) return;
    this.reported = true;
    this.watchShot(m);
    const shot = this.shot(m);
    let damage = 0;
    let left = 0;
    m.ants.forEach((a, i) => {
      if (a.team === this.team) return;
      damage += shot?.dealt[i] ?? 0;
      if (isActive(a)) left++;
    });
    // TODO(stage 6): missPower / missAngle (the signed miss along the shot, for DR-061
    // bracketing) are 0 here: the scene cannot measure them cheaply. The solver can fill
    // them from its own shot sim of the fired values, or `afterShot` can work without them.
    const outcome: ShotOutcome = {
      target: this.plan?.target ?? -1,
      damageToEnemy: damage,
      enemyMaxHp: ANT_MAX_HP,
      hit: this.hit ?? false,
      enemyAntsLeft: left,
      missPower: 0,
      missAngle: 0,
    };
    this.lastOutcome = outcome;
    const params =
      this.paramsUsed ??
      this.deps.params(this.level, { boss: this.boss, rattled: this.memory.rattled });
    // The plan may carry the memory `fireValues` returned (E_n, bracketing); take it first.
    const planned = (this.plan as (BotTurnPlan & { memory?: BotMemory }) | null)?.memory;
    this.memory = this.deps.after(planned ?? this.memory, params, outcome);
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
    guessMsPerSim = 0.25,
    readonly maxSims = 400,
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
