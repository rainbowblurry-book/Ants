/**
 * Bot AI contract (stage 6; DR-060 to DR-067, DR-129, PLAN §9).
 *
 * Shared by `botParams.ts` + `error.ts` (the error model), `solver.ts` (the
 * search) and `bot.ts` (one turn's plan, read by the Battle scene).
 * Pure TS: no Phaser, no wall clock, no Math.random / log / exp / pow (DR-010,
 * DR-011, tools/ban-scan.ts). Only the `ai` stream draws numbers.
 */
import type { WeaponId } from '../sim/weapons/index.ts';

/** Error parameters for one bot level (DR-063 table, DR-064 floor). */
export interface BotParams {
  /** Effective level 0..100 (bosses: min(100, L + 5)). */
  level: number;
  /** Power noise, relative (0.0135 = 1.35%). */
  sigmaP: number;
  /** Angle noise, degrees. */
  sigmaA: number;
  /** Wind jitter, wind levels. */
  sigmaW: number;
  /** Wind gain error (negative = under-correct). */
  k: number;
  /** Wind bias, wind levels. */
  b: number;
  /** First-shot power bias, relative (0.12 = 12%). */
  B: number;
  /** Brain-fart chance (L ≤ 30). */
  pBf: number;
  /** Think time in seconds (DR-066, capped 1.0 s through L10, PLAN §9). */
  thinkS: number;
  /** Bosses read the true wind (k = b = 0, DR-063). */
  boss: boolean;
}

/** What a bot remembers between its turns (DR-061 bracketing, DR-067 rattled). */
export interface BotMemory {
  /** Ant index of the last target, or −1. */
  target: number;
  /** Shots already fired at `target` (n in E_n = E0·0.5ⁿ). */
  shotsAtTarget: number;
  /** Signed first-shot bias E0 for the current target (relative power). */
  e0: number;
  /** Last miss at this target: power error (relative) and angle error (°) to correct by 0.5×. */
  lastMissPower: number;
  lastMissAngle: number;
  /** DR-067: the next turn is "rattled" (σ_p, σ_a, B × 1.5), L1–20 only. */
  rattled: boolean;
}

export function freshMemory(): BotMemory {
  return {
    target: -1,
    shotsAtTarget: 0,
    e0: 0,
    lastMissPower: 0,
    lastMissAngle: 0,
    rattled: false,
  };
}

/** One scored shot the solver found (DR-060). Angle/power are the sim units. */
export interface Candidate {
  weapon: WeaponId;
  /** Ant index aimed at. */
  target: number;
  /** Facing the shot is fired with. */
  facing: 1 | -1;
  /** 0.1° above horizontal toward facing (integer, DR-033). */
  angleDeci: number;
  /** Power ‰ (integer, DR-011 per-mille). */
  powerMille: number;
  score: number;
  selfDamage: number;
}

/** Where the bot walks first (DR-060 move-first), in the ant's own walk. */
export interface MovePlan {
  dir: -1 | 1;
  /** Px to walk (≤ 3 strides of 40 px, and within the walk budget). */
  px: number;
}

/** A finished plan for one bot turn: what Battle plays out (DR-066, DR-129). */
export interface BotTurnPlan {
  move: MovePlan | null;
  /** The command values actually fired (after the error model). */
  weapon: WeaponId;
  facing: 1 | -1;
  angleDeci: number;
  powerMille: number;
  /** The ant aimed at, for the crosshair and the memory update. */
  target: number;
  /** DR-066 think time in sim ticks (60 Hz), solver time included. */
  thinkTicks: number;
  /** DR-066 / DR-129 aim wobble: amplitude in 0.1° (3·σ_a, ≤ 120) and settle ticks (36..72). */
  wobbleDeci: number;
  settleTicks: number;
  /** Power bar overshoot at low levels, relative (0 at the cap). */
  overshoot: number;
  /** For logs and tests. */
  debug: { best: Candidate | null; brainFart: boolean; sims: number };
}

/**
 * A time-sliced job (DR-060: ≤ 4 ms a frame, done in ≤ 25 frames). The scene
 * calls `step(maxSims)` once per frame; the AI never reads a clock, so the
 * scene picks maxSims from its own timing. `done` turns true once; `plan` is
 * then set.
 */
export interface BotJob {
  step(maxSims: number): void;
  readonly done: boolean;
  readonly plan: BotTurnPlan | null;
  readonly simsUsed: number;
}
