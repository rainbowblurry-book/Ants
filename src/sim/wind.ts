/**
 * Wind fields (DR-031, DR-032, J9, J21).
 *
 * A field sets its state at turn start (the only place it uses RNG) and is a
 * pure function of (x, y, tick) after that. `accel` returns px/s² at weapon
 * wind factor 1; the projectile multiplies by its weapon's factor. Wind never
 * pushes ants.
 */
import { WIND_K } from './physics.ts';
import type { Rng } from './rng.ts';
import { sinDeci } from './trig.ts';

/** The horizontal wind level is clamped to ±5 (DR-031, DR-032). */
export const WIND_MAX_LEVEL = 5;
/** Wind values are quantised to 1/64 of a level (DR-011). */
export const WIND_QUANT = 64;

export interface Vec2 {
  x: number;
  y: number;
}

export interface WindGauge {
  /** Horizontal level, −5..+5 (positive blows right). */
  level: number;
  /** Vertical chevron level (positive is up). */
  vertical: number;
  gust: boolean;
  /** Next turn's horizontal level, when known (exact telegraph). */
  next?: number;
}

export interface WindField {
  onTurnStart(turn: number, rng: Rng): void;
  accel(x: number, y: number, tick: number): Vec2;
  gauge(tick?: number): WindGauge;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : Math.min(v, hi);
}

function quantise(level: number): number {
  return Math.round(level * WIND_QUANT) / WIND_QUANT;
}

export interface LevelWindSpec {
  /** Largest |level|. */
  maxAbs: number;
  /** Largest change per roll: W' = clamp(W + int in [−maxStep, +maxStep]). */
  maxStep: number;
  /** Roll every N turns (1 = every turn). */
  everyNTurns: number;
  /** Smallest |level| (for a fixed-sign biome). Default 0. */
  minAbs?: number;
  /** Fix the sign: +1 always right, −1 always left. Default: either. */
  sign?: 1 | -1;
  /**
   * Level the first roll starts from. Default 0. Not set by the DRs; level
   * data may override it (see PROGRESS, stage 1 notes).
   */
  start?: number;
}

/**
 * Level field (DR-031): an integer level on a seeded schedule, rolled one turn
 * ahead on the `wind` stream so the telegraph is exact.
 */
export class LevelWind implements WindField {
  readonly spec: Required<Omit<LevelWindSpec, 'sign'>> & { sign?: 1 | -1 };
  current = 0;
  nextLevel = 0;
  private lastTurn = -1;

  constructor(spec: LevelWindSpec) {
    for (const k of ['maxAbs', 'maxStep', 'everyNTurns'] as const) {
      if (!Number.isInteger(spec[k]) || spec[k] < 0) throw new RangeError(`LevelWind: bad ${k}`);
    }
    if (spec.everyNTurns < 1) throw new RangeError('LevelWind: everyNTurns must be ≥ 1');
    if (spec.maxAbs > WIND_MAX_LEVEL) throw new RangeError('LevelWind: maxAbs over 5');
    if ((spec.minAbs ?? 0) > 0 && !spec.sign)
      throw new RangeError('LevelWind: minAbs needs a sign');
    this.spec = {
      maxAbs: spec.maxAbs,
      maxStep: spec.maxStep,
      everyNTurns: spec.everyNTurns,
      minAbs: spec.minAbs ?? 0,
      start: spec.start ?? 0,
      ...(spec.sign ? { sign: spec.sign } : {}),
    };
    this.current = this.limit(this.spec.start);
    this.nextLevel = this.current;
  }

  private limit(v: number): number {
    const { maxAbs, minAbs, sign } = this.spec;
    if (sign === 1) return clamp(v, minAbs, maxAbs);
    if (sign === -1) return clamp(v, -maxAbs, -minAbs);
    return clamp(v, -maxAbs, maxAbs);
  }

  private roll(from: number, rng: Rng): number {
    const s = this.spec.maxStep;
    return this.limit(from + (s > 0 ? rng.int(-s, s) : 0));
  }

  /**
   * Turn 0 rolls the opening level from `start`, then pre-rolls turn 1.
   * Later turns take the pre-rolled value, then pre-roll the next turn when
   * (turn + 1) is a multiple of everyNTurns.
   */
  onTurnStart(turn: number, rng: Rng): void {
    if (turn <= this.lastTurn) throw new RangeError('LevelWind: turns must increase');
    if (this.lastTurn < 0) {
      this.current = this.roll(this.spec.start, rng);
    } else {
      this.current = this.nextLevel;
    }
    this.nextLevel =
      (turn + 1) % this.spec.everyNTurns === 0 ? this.roll(this.current, rng) : this.current;
    this.lastTurn = turn;
  }

  accel(): Vec2 {
    return { x: this.current * WIND_K, y: 0 };
  }

  gauge(): WindGauge {
    return { level: this.current, vertical: 0, gust: false, next: this.nextLevel };
  }
}

export interface ColumnSpec {
  /** Centre x of the column in px. */
  x: number;
  /** Half-width in px; the pull falls to 0 at |dx| = halfWidth. */
  halfWidth: number;
  /** Strength at the centre in px/s² at weapon factor 1. */
  strength: number;
  /** −1 pulls up (updraft, hood), +1 pulls down. */
  dir: -1 | 1;
  /** Active on 1 turn in N (DR-032 vent: 1 in 3). Default 1 = always. */
  everyNTurns?: number;
  /** Which turn in the cycle is active. Default 0. */
  phase?: number;
}

/**
 * Column field (DR-032, J9): a vertical pull zone with smoothstep falloff,
 * t = 1 − |x − cx| / halfWidth, f = t²(3 − 2t).
 */
export class ColumnWind implements WindField {
  readonly spec: Required<ColumnSpec>;
  active = true;

  constructor(spec: ColumnSpec) {
    if (!(spec.halfWidth > 0)) throw new RangeError('ColumnWind: halfWidth must be > 0');
    this.spec = { everyNTurns: 1, phase: 0, ...spec };
    this.active = this.spec.everyNTurns === 1;
  }

  onTurnStart(turn: number): void {
    this.active = turn % this.spec.everyNTurns === this.spec.phase;
  }

  /** 0..1 smoothstep weight at x. */
  weight(x: number): number {
    const dx = x - this.spec.x;
    const ad = dx < 0 ? -dx : dx;
    const t = 1 - ad / this.spec.halfWidth;
    if (t <= 0) return 0;
    return t * t * (3 - 2 * t);
  }

  accel(x: number): Vec2 {
    const w = this.active ? this.weight(x) : 0;
    if (w === 0) return { x: 0, y: 0 };
    return { x: 0, y: this.spec.dir * this.spec.strength * w };
  }

  gauge(): WindGauge {
    return { level: 0, vertical: 0, gust: false, next: 0 };
  }
}

export interface OscillateSpec {
  /** Amplitude in wind levels. */
  amplitude: number;
  /** Period in sim ticks (6 s = 360 ticks at 60 Hz). */
  periodTicks: number;
}

/**
 * Oscillate field (DR-032, J9): level = A·sin(2π·tick/P) on the global tick,
 * read from the trig table at the nearest 0.1° and quantised to 1/64.
 */
export class OscillateWind implements WindField {
  readonly spec: OscillateSpec;

  constructor(spec: OscillateSpec) {
    if (!Number.isInteger(spec.periodTicks) || spec.periodTicks < 1) {
      throw new RangeError('OscillateWind: periodTicks must be a positive integer');
    }
    this.spec = spec;
  }

  onTurnStart(): void {}

  level(tick: number): number {
    const P = this.spec.periodTicks;
    const phase = ((tick % P) + P) % P;
    const deci = Math.round((phase * 3600) / P);
    return quantise(this.spec.amplitude * sinDeci(deci));
  }

  accel(_x: number, _y: number, tick: number): Vec2 {
    return { x: this.level(tick) * WIND_K, y: 0 };
  }

  gauge(tick = 0): WindGauge {
    return { level: this.level(tick), vertical: 0, gust: false };
  }
}

/**
 * Sums child fields (DR-032). The horizontal part is clamped to ±5 levels.
 * Children get onTurnStart in array order, sharing the `wind` stream.
 */
export class CompositeWind implements WindField {
  readonly children: readonly WindField[];

  constructor(children: readonly WindField[]) {
    this.children = children;
  }

  onTurnStart(turn: number, rng: Rng): void {
    for (const c of this.children) c.onTurnStart(turn, rng);
  }

  accel(x: number, y: number, tick: number): Vec2 {
    let ax = 0;
    let ay = 0;
    for (const c of this.children) {
      const a = c.accel(x, y, tick);
      ax += a.x;
      ay += a.y;
    }
    const lim = WIND_MAX_LEVEL * WIND_K;
    return { x: clamp(ax, -lim, lim), y: ay };
  }

  gauge(tick?: number): WindGauge {
    let level = 0;
    let vertical = 0;
    let gust = false;
    let next: number | undefined = 0;
    for (const c of this.children) {
      const g = c.gauge(tick);
      level += g.level;
      vertical += g.vertical;
      gust ||= g.gust;
      if (next !== undefined) next = g.next === undefined ? undefined : next + g.next;
    }
    const out: WindGauge = {
      level: clamp(level, -WIND_MAX_LEVEL, WIND_MAX_LEVEL),
      vertical,
      gust,
    };
    if (next !== undefined) out.next = clamp(next, -WIND_MAX_LEVEL, WIND_MAX_LEVEL);
    return out;
  }
}

/** No wind at all (tests, floor tutorials). */
export const CALM: WindField = {
  onTurnStart() {},
  accel: () => ({ x: 0, y: 0 }),
  gauge: () => ({ level: 0, vertical: 0, gust: false, next: 0 }),
};
