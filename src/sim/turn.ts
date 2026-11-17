/**
 * Turn state machine (DR-041 to DR-044, DR-038, DR-015, J5, J6, J8).
 *
 *   TurnStart ─► Move/Aim ─► Fire ─► Resolve ─► TurnEnd ─► TurnStart | MatchEnd
 *
 * Every gate is counted in sim ticks, never wall time, so the machine is the
 * same for players, bots and replays. Banners and the camera are render-only.
 * This file holds the rules and the transitions; `match.ts` owns the world
 * and calls `TurnMachine.step` once per tick.
 */
import { type Command, type CommandBody, CommandRing, type Verdict } from './commands.ts';
import {
  type Ant,
  antSpeed,
  backflip,
  FEET,
  FLIP_COST,
  HOP_COST,
  hop,
  isActive,
  resetBudget,
  stepAnt,
  walkStep,
} from './movement.ts';
import { ANT_CAPSULE, SIM_HZ } from './physics.ts';
import { type Ammo, collectPickups, type Pickup, type PickupKind } from './pickups.ts';
import type { Rng } from './rng.ts';
import type { TerrainGrid } from './terrain.ts';
import { fire, type Shot, stepShot, WEAPON_IDS, type World } from './weapons/index.ts';

export type Phase = 'turnStart' | 'aim' | 'fire' | 'resolve' | 'turnEnd' | 'matchEnd';

const ms = (n: number) => (n * SIM_HZ) / 1000;

/** TurnStart: 900 ms, or 600 ms through L10 (DR-042, DR-071). */
export const TURN_START_TICKS = ms(900);
export const TURN_START_TICKS_EARLY = ms(600);
/** Two-player gate: it shows after the 500 ms pan and is locked for 400 ms (DR-183, J46). */
export const GATE_PAN_TICKS = ms(500);
export const GATE_LOCKOUT_TICKS = ms(400);
/** Fire: 300 ms of input lock; the shot spawns at tick 18 (DR-042). */
export const FIRE_LOCK_TICKS = ms(300);
/** Retreat window after the shot (J6). */
export const RETREAT_TICKS = ms(3000);
/** Settle rule and hard cap (DR-038, J5). */
export const SETTLE_SPEED = 8;
export const SETTLE_TICKS = 30;
export const RESOLVE_CAP_TICKS = ms(12000);
/** Turn timer (DR-043): 30 s, or 60 s relaxed. */
export const TURN_TICKS = 30 * SIM_HZ;
export const TURN_TICKS_RELAXED = 60 * SIM_HZ;
/** TurnEnd lasts 700 to 1800 ms; the parts are from PLAN §3. */
export const TURN_END_MIN_TICKS = ms(700);
export const TURN_END_MAX_TICKS = ms(1800);
export const TURN_END_KO_TICKS = ms(1200);
export const TURN_END_DEW_TICKS = ms(800);
export const TURN_END_DROP_TICKS = ms(700);
/** Sudden death (DR-044). */
export const SD_WARN_ROUND = 18;
export const SD_DEW_ROUND = 21;
export const SD_DEW_ROUND_BOSS = 30;
export const SD_DEW_STEP_PX = 24;
export const SD_ROUND_CAP = 40;

/** A pickup that falls in at the TurnEnd closing `round` (DR-048, J11). */
export interface Drop {
  round: number;
  kind: PickupKind;
  x: number;
}

export interface TurnRules {
  /** TurnStart length in ticks. */
  turnStartTicks: number;
  /** A tap skips TurnStart (L1–10, DR-071). */
  skippableStart: boolean;
  /** Two-player: every TurnStart waits for a tap (DR-045). */
  gate: boolean;
  /** Move/Aim timer in ticks, or null for no timer (Level 0 practice). */
  turnTicks: number | null;
  /** Which team moves first: the player (0) in the campaign, a coin flip in two-player (DR-041). */
  firstTeam: 0 | 1 | 'coin';
  warnRound: number;
  dewFromRound: number;
  capRound: number;
  /** The y the dew rises from: the world bottom, or the water line (J20). */
  dewBaseY: number;
  drops: Drop[];
}

export function defaultRules(grid: TerrainGrid): TurnRules {
  return {
    turnStartTicks: TURN_START_TICKS,
    skippableStart: false,
    gate: false,
    turnTicks: TURN_TICKS,
    firstTeam: 0,
    warnRound: SD_WARN_ROUND,
    dewFromRound: SD_DEW_ROUND,
    capRound: SD_ROUND_CAP,
    dewBaseY: grid.h,
    drops: [],
  };
}

/** Rounds count from 1; a round is one turn each (DR-044). */
export function roundOfTurn(turn: number): number {
  return Math.floor(turn / 2) + 1;
}

export interface MatchResult {
  /** Winning team, or null for a draw (DR-044). */
  winner: number | null;
  /** `eliminated`: a team has no active ants. `cap`: the round cap, decided on total HP. */
  reason: 'eliminated' | 'cap';
  /** Total HP of each team's active ants at the end. */
  hp: number[];
  /** The round the match ended in. */
  round: number;
}

export type MatchEvent =
  | { tick: number; kind: 'phase'; phase: Phase; turn: number; team: number; ant: number }
  | { tick: number; kind: 'timeout'; ant: number }
  | { tick: number; kind: 'turnLost'; ant: number }
  | { tick: number; kind: 'reject'; command: CommandBody['kind']; why: RejectWhy }
  | { tick: number; kind: 'ko'; ant: number; by: NonNullable<Ant['koBy']> }
  | { tick: number; kind: 'dewWarning'; round: number }
  | { tick: number; kind: 'dew'; y: number }
  | { tick: number; kind: 'drop'; pickup: PickupKind; x: number; y: number | null }
  | { tick: number; kind: 'pickup'; ant: number; pickup: PickupKind }
  | { tick: number; kind: 'forceSettle' }
  | { tick: number; kind: 'end'; result: MatchResult };

export type RejectWhy = 'phase' | 'ammo' | 'budget' | 'late' | 'overflow';

/** What the machine needs from the match. */
export interface TurnHost {
  world: World;
  /** Ammo pool per team. */
  ammo: Ammo[];
  /** The `wind` stream: the coin flip and every wind roll (DR-031, DR-182). */
  windRng: Rng;
  /** The live shot, if any; the machine creates and retires it. */
  shot: Shot | null;
  /** Finished shots, newest last. */
  shots: Shot[];
  events: MatchEvent[];
}

/** The team's next ant in fixed order after `last`, skipping knocked-out ants (DR-041). */
export function nextAnt(ants: readonly Ant[], team: number, last: number): number {
  const n = ants.length;
  for (let k = 1; k <= n; k++) {
    const i = (((last + k) % n) + n) % n;
    const a = ants[i] as Ant;
    if (a.team === team && isActive(a)) return i;
  }
  return -1;
}

/**
 * TurnEnd length (PLAN §3: 700 to 1800 ms). The knock-out beat runs alongside
 * the others; the dew rise and the pickup drop run one after the other.
 */
export function turnEndTicks(ko: boolean, dew: boolean, drop: boolean): number {
  const serial = (dew ? TURN_END_DEW_TICKS : 0) + (drop ? TURN_END_DROP_TICKS : 0);
  const want = Math.max(ko ? TURN_END_KO_TICKS : 0, serial);
  return Math.min(TURN_END_MAX_TICKS, Math.max(TURN_END_MIN_TICKS, want));
}

/** The first solid cell from the top of the world in column x, or null (void or water). */
export function dropLandingY(grid: TerrainGrid, x: number): number | null {
  for (let y = 0; y < grid.h; y++) if (grid.solidAt(x, y)) return y;
  return null;
}

export class TurnMachine {
  readonly rules: TurnRules;
  readonly ring = new CommandRing();
  phase: Phase = 'turnStart';
  /** Ticks completed in the current phase. */
  phaseTick = 0;
  /** Global turn index from 0. */
  turn = 0;
  /** The team to move and its active ant. */
  team: number;
  ant: number;
  /** Move/Aim ticks left, or null with no timer. */
  timerLeft: number | null;
  /** Held walk direction of the active ant. */
  heldDir: -1 | 0 | 1 = 0;
  /** Consecutive ticks every body has been at rest (DR-038). */
  restTicks = 0;
  /** The retreat window of this Resolve, in ticks (0 when nothing was fired). */
  retreatLen = 0;
  /** The fire command waiting out the 18-tick lock. */
  private pendingFire: Extract<CommandBody, { kind: 'fire' }> | null = null;
  /** This turn is forfeited: the ant swam back from water (DR-026). */
  turnLost = false;
  private gateOpen = false;
  private hurry = false;
  turnEndLen = 0;
  /** How far the dew has risen, in px (DR-044). */
  dewRise = 0;
  private koThisTurn = 0;
  /** Per team: the ant that moved last, or −1. */
  readonly lastAnt: number[];
  /** Per team: turns started, for par (DR-055). */
  readonly turnsTaken: number[];
  /** Per team: ants knocked out so far. */
  readonly koCount: number[];
  result: MatchResult | null = null;
  private wasActive: boolean[];

  constructor(host: TurnHost, rules: TurnRules) {
    this.rules = rules;
    const ants = host.world.ants;
    const teams = host.ammo.length;
    this.lastAnt = new Array(teams).fill(-1);
    this.turnsTaken = new Array(teams).fill(0);
    this.koCount = new Array(teams).fill(0);
    this.wasActive = ants.map(isActive);
    // The coin flip is the first draw on the wind stream (the match seed, DR-182).
    this.team = rules.firstTeam === 'coin' ? host.windRng.int(0, 1) : rules.firstTeam;
    this.ant = -1;
    this.timerLeft = rules.turnTicks;
    host.world.wind.onTurnStart(0, host.windRng);
    this.beginTurn(host);
  }

  /** Round number of the current turn, from 1. */
  get round(): number {
    return roundOfTurn(this.turn);
  }

  /** The dew line: ants with feet below it are knocked out. Infinity until it rises. */
  get dewY(): number {
    return this.dewRise > 0 ? this.rules.dewBaseY - this.dewRise : Number.POSITIVE_INFINITY;
  }

  /** Ticks left in the retreat window, 0 outside it. */
  get retreatLeft(): number {
    if (this.phase !== 'resolve') return 0;
    return Math.max(0, this.retreatLen - this.phaseTick);
  }

  /** True while the active ant may walk, hop and flip. */
  get canMove(): boolean {
    return this.phase === 'aim' || (this.phase === 'resolve' && this.phaseTick < this.retreatLen);
  }

  /** Every number that is sim state here, for the replay hash (DR-011). */
  stateNumbers(): number[] {
    const f = this.pendingFire;
    return [
      this.phaseTick,
      this.turn,
      this.team,
      this.ant,
      this.timerLeft ?? -1,
      this.heldDir,
      this.restTicks,
      this.retreatLen,
      this.turnEndLen,
      this.dewRise,
      this.koThisTurn,
      this.turnLost ? 1 : 0,
      this.gateOpen ? 1 : 0,
      this.hurry ? 1 : 0,
      f ? f.angleDeci : -1,
      f ? f.powerMille : -1,
      f ? WEAPON_IDS.indexOf(f.weapon) : -1,
      ...this.lastAnt,
      ...this.turnsTaken,
      ...this.koCount,
    ];
  }

  /** Queues a command that reached the sim on `tick`. */
  push(host: TurnHost, c: Command): void {
    if (c.kind === 'cancel') this.ring.clear();
    const lost = this.ring.push(c);
    if (lost) this.reject(host, lost.kind, 'overflow');
  }

  /** One 60 Hz tick. The caller has already advanced `world.tick`. */
  step(host: TurnHost): void {
    if (this.phase === 'matchEnd') return;
    const tick = host.world.tick;
    for (const c of this.ring.drain(tick, (c, age) => this.apply(host, c, age))) {
      this.reject(host, c.kind, 'late');
    }
    this.physics(host);
    this.advance(host);
  }

  // ------------------------------------------------------------ commands

  private reject(host: TurnHost, command: CommandBody['kind'], why: RejectWhy): void {
    host.events.push({ tick: host.world.tick, kind: 'reject', command, why });
  }

  private apply(host: TurnHost, c: Command, _age: number): Verdict {
    const ant = host.world.ants[this.ant];
    switch (c.kind) {
      case 'walk':
        this.heldDir = c.dir;
        return 'done';
      case 'cancel':
        this.heldDir = 0;
        return 'done';
      case 'ready':
        if (this.phase === 'turnStart') {
          if (this.rules.gate) {
            if (this.phaseTick < GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) return 'drop';
            this.gateOpen = true;
            return 'done';
          }
          if (!this.rules.skippableStart) return 'drop';
          this.gateOpen = true;
          return 'done';
        }
        if (this.phase === 'turnEnd') {
          this.hurry = true;
          return 'done';
        }
        return 'drop';
      case 'face':
        if (!ant || this.phase !== 'aim' || ant.state !== 'ground') return 'drop';
        ant.facing = c.dir;
        return 'done';
      case 'hop':
      case 'flip': {
        if (!ant || !isActive(ant)) return 'drop';
        // A jump waits out TurnStart and a landing; it is never kept past the turn.
        if (this.phase === 'turnStart') return this.turnLost ? 'drop' : 'keep';
        if (!this.canMove) return 'drop';
        if (ant.state !== 'ground') return 'keep';
        if (ant.budget < (c.kind === 'hop' ? HOP_COST : FLIP_COST)) {
          this.reject(host, c.kind, 'budget');
          return 'done';
        }
        if (c.kind === 'hop') hop(ant);
        else backflip(ant);
        return 'done';
      }
      case 'fire': {
        if (!ant || !isActive(ant)) return 'drop';
        if (this.phase === 'turnStart') return this.turnLost ? 'drop' : 'keep';
        if (this.phase !== 'aim') return 'drop';
        // Fire waits until the ant is grounded and settled (DR-015).
        if (ant.state !== 'ground' || antSpeed(ant) >= SETTLE_SPEED) return 'keep';
        const pool = host.ammo[ant.team] as Ammo;
        if (!(pool[c.weapon] > 0)) {
          this.reject(host, 'fire', 'ammo');
          return 'done';
        }
        pool[c.weapon] -= 1;
        this.pendingFire = {
          kind: 'fire',
          weapon: c.weapon,
          angleDeci: c.angleDeci,
          powerMille: c.powerMille,
        };
        this.enter(host, 'fire');
        return 'done';
      }
    }
  }

  // ------------------------------------------------------------- physics

  private physics(host: TurnHost): void {
    const world = host.world;
    if (host.shot) {
      stepShot(world, host.shot);
      if (host.shot.bodies.length === 0) {
        host.shots.push(host.shot);
        host.shot = null;
      }
    }
    const ants = world.ants;
    let moving = host.shot !== null;
    for (let i = 0; i < ants.length; i++) {
      const a = ants[i] as Ant;
      if (!isActive(a)) continue;
      const walk = i === this.ant && this.canMove && this.heldDir !== 0 && a.state === 'ground';
      if (walk) {
        if (walkStep(a, world.grid, this.heldDir as 1 | -1) > 0) moving = true;
      } else {
        stepAnt(a, world.grid);
      }
      if (isActive(a) && a.y > this.dewY) {
        a.state = 'ko';
        a.koBy = 'dew';
        a.vx = 0;
        a.vy = 0;
      }
      if (!isActive(a)) continue;
      for (const kind of collectPickups(a, world.pickups, host.ammo[a.team] as Ammo)) {
        host.events.push({ tick: world.tick, kind: 'pickup', ant: i, pickup: kind });
      }
      if (a.state !== 'ground' || antSpeed(a) >= SETTLE_SPEED) moving = true;
    }
    this.noteKnockOuts(host);
    this.restTicks = moving ? 0 : this.restTicks + 1;
  }

  private noteKnockOuts(host: TurnHost): void {
    const ants = host.world.ants;
    for (let i = 0; i < ants.length; i++) {
      const a = ants[i] as Ant;
      if (this.wasActive[i] && !isActive(a)) {
        this.wasActive[i] = false;
        this.koThisTurn++;
        this.koCount[a.team] = (this.koCount[a.team] ?? 0) + 1;
        host.events.push({ tick: host.world.tick, kind: 'ko', ant: i, by: a.koBy ?? 'hp' });
      }
    }
  }

  // --------------------------------------------------------- transitions

  private enter(host: TurnHost, phase: Phase): void {
    this.phase = phase;
    this.phaseTick = 0;
    host.events.push({
      tick: host.world.tick,
      kind: 'phase',
      phase,
      turn: this.turn,
      team: this.team,
      ant: this.ant,
    });
  }

  private beginTurn(host: TurnHost): void {
    const ants = host.world.ants;
    this.ant = nextAnt(ants, this.team, this.lastAnt[this.team] ?? -1);
    this.lastAnt[this.team] = this.ant;
    this.turnsTaken[this.team] = (this.turnsTaken[this.team] ?? 0) + 1;
    this.timerLeft = this.rules.turnTicks;
    this.heldDir = 0;
    this.gateOpen = false;
    this.hurry = false;
    this.koThisTurn = 0;
    this.pendingFire = null;
    this.retreatLen = 0;
    this.ring.clear();
    const a = ants[this.ant];
    this.turnLost = false;
    if (a) {
      resetBudget(a);
      if (a.skipNextTurn) {
        a.skipNextTurn = false;
        this.turnLost = true;
      }
    }
    this.enter(host, 'turnStart');
  }

  private advance(host: TurnHost): void {
    this.phaseTick += this.phase === 'turnEnd' && this.hurry ? 2 : 1;
    const ant = host.world.ants[this.ant];
    const antGone = !ant || !isActive(ant);
    switch (this.phase) {
      case 'turnStart': {
        const timeUp = this.phaseTick >= this.rules.turnStartTicks;
        if (this.turnLost) {
          if (!timeUp) return;
          host.events.push({ tick: host.world.tick, kind: 'turnLost', ant: this.ant });
          this.endTurn(host);
          return;
        }
        if (this.rules.gate ? !this.gateOpen : !(timeUp || this.gateOpen)) return;
        this.enter(host, 'aim');
        return;
      }
      case 'aim': {
        if (antGone) {
          this.settleThenEnd(host);
          return;
        }
        if (this.timerLeft === null) return;
        this.timerLeft -= 1;
        if (this.timerLeft > 0) return;
        // At 0 the turn is skipped and nothing fires (DR-043).
        host.events.push({ tick: host.world.tick, kind: 'timeout', ant: this.ant });
        this.settleThenEnd(host);
        return;
      }
      case 'fire': {
        if (this.phaseTick < FIRE_LOCK_TICKS) return;
        const f = this.pendingFire;
        this.pendingFire = null;
        if (f && !antGone) {
          host.shot = fire(host.world, this.ant, f.weapon, f.angleDeci, f.powerMille);
          this.retreatLen = RETREAT_TICKS;
        }
        this.restTicks = 0;
        this.enter(host, 'resolve');
        return;
      }
      case 'resolve': {
        if (this.phaseTick >= RESOLVE_CAP_TICKS) {
          this.forceSettle(host);
          this.endTurn(host);
          return;
        }
        if (this.phaseTick < this.retreatLen) return;
        if (host.shot !== null || this.restTicks < SETTLE_TICKS) return;
        this.endTurn(host);
        return;
      }
      case 'turnEnd': {
        if (this.phaseTick < this.turnEndLen) return;
        if (this.result) {
          this.enter(host, 'matchEnd');
          host.events.push({ tick: host.world.tick, kind: 'end', result: this.result });
          return;
        }
        this.turn += 1;
        this.team = (this.team + 1) % host.ammo.length;
        host.world.wind.onTurnStart(this.turn, host.windRng);
        this.beginTurn(host);
        return;
      }
    }
  }

  /** A turn with no shot ends once every body is at rest (timeout, or the ant is gone). */
  private settleThenEnd(host: TurnHost): void {
    this.heldDir = 0;
    if (host.shot === null && this.restTicks >= SETTLE_TICKS) {
      this.endTurn(host);
      return;
    }
    this.retreatLen = 0;
    this.enter(host, 'resolve');
  }

  /** The 12 s cap (DR-038): snap every body to the ground and end. */
  private forceSettle(host: TurnHost): void {
    const world = host.world;
    host.events.push({ tick: world.tick, kind: 'forceSettle' });
    if (host.shot) {
      for (const b of host.shot.bodies) {
        host.shot.events.push({
          tick: world.tick,
          kind: 'fizzle',
          weapon: host.shot.weapon,
          x: b.p.x,
          y: b.p.y,
          why: 'cap',
        });
      }
      host.shot.bodies = [];
      host.shots.push(host.shot);
      host.shot = null;
    }
    for (const a of world.ants) {
      if (!isActive(a)) continue;
      a.vx = 0;
      a.vy = 0;
      if (a.state !== 'air') continue;
      let ground: number | null = null;
      for (let y = Math.floor(a.y); y < world.grid.h && ground === null; y++) {
        for (const f of FEET) if (world.grid.solidAt(a.x + f, y)) ground = y;
      }
      if (ground === null) {
        // Nothing below: let the hazard rules decide (void or water, DR-026).
        a.y = world.grid.h + 1;
        for (let k = 0; k < SIM_HZ && a.state === 'air'; k++) stepAnt(a, world.grid);
        if (a.state === 'air') {
          a.state = 'ko';
          a.koBy = 'void';
        }
      } else {
        a.y = ground;
        a.state = 'ground';
        a.bounced = false;
      }
    }
    this.noteKnockOuts(host);
  }

  /** Enters TurnEnd: dew, drops, the win check, and how long the beat lasts. */
  private endTurn(host: TurnHost): void {
    const world = host.world;
    this.heldDir = 0;
    this.ring.clear();
    const closesRound = this.turn % 2 === 1;
    const round = this.round;
    let dew = false;
    let drop = false;
    if (closesRound) {
      if (round + 1 === this.rules.warnRound) {
        host.events.push({ tick: world.tick, kind: 'dewWarning', round: round + 1 });
      }
      if (round + 1 >= this.rules.dewFromRound) {
        dew = true;
        this.dewRise += SD_DEW_STEP_PX;
        host.events.push({ tick: world.tick, kind: 'dew', y: this.dewY });
        for (const a of world.ants) {
          if (isActive(a) && a.y > this.dewY) {
            a.state = 'ko';
            a.koBy = 'dew';
            a.vx = 0;
            a.vy = 0;
          }
        }
        // A drop into the dew is lost (DR-048).
        const kept: Pickup[] = world.pickups.filter((p) => p.y <= this.dewY);
        world.pickups.length = 0;
        world.pickups.push(...kept);
        this.noteKnockOuts(host);
      }
      for (const d of this.rules.drops) {
        if (d.round !== round) continue;
        drop = true;
        const y = dropLandingY(world.grid, d.x);
        const lost = y === null || y > this.dewY;
        // It rests at hurtbox height, so an ant walking over it touches it.
        const restY = lost ? null : (y as number) - ANT_CAPSULE.centreUp;
        if (restY !== null) world.pickups.push({ kind: d.kind, x: d.x, y: restY });
        host.events.push({ tick: world.tick, kind: 'drop', pickup: d.kind, x: d.x, y: restY });
      }
    }
    this.result = this.judge(host, closesRound && round >= this.rules.capRound);
    this.turnEndLen = turnEndTicks(this.koThisTurn > 0, dew, drop);
    this.enter(host, 'turnEnd');
  }

  /** Win, draw or play on (DR-044). */
  private judge(host: TurnHost, atCap: boolean): MatchResult | null {
    const teams = host.ammo.length;
    const hp: number[] = new Array(teams).fill(0);
    const alive: number[] = new Array(teams).fill(0);
    for (const a of host.world.ants) {
      if (!isActive(a)) continue;
      hp[a.team] = (hp[a.team] ?? 0) + a.hp;
      alive[a.team] = (alive[a.team] ?? 0) + 1;
    }
    const standing: number[] = [];
    for (let t = 0; t < teams; t++) if ((alive[t] ?? 0) > 0) standing.push(t);
    const round = this.round;
    if (standing.length <= 1) {
      return { winner: standing[0] ?? null, reason: 'eliminated', hp, round };
    }
    if (!atCap) return null;
    let best = -1;
    let tie = false;
    for (const t of standing) {
      if (best < 0 || (hp[t] ?? 0) > (hp[best] ?? 0)) {
        best = t;
        tie = false;
      } else if (hp[t] === hp[best]) tie = true;
    }
    return { winner: tie ? null : best, reason: 'cap', hp, round };
  }
}
