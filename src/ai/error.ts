/**
 * The human-like error model (DR-061, DR-067).
 * STUB from the orchestrator: zero error. The error-model work replaces the
 * bodies; the signatures are the contract the solver and bot.ts use.
 *
 * Per shot, `drawErrors` takes every draw from the `ai` stream up front, in
 * the DR-061 order, whatever the target turns out to be (so the stream use
 * never depends on the search). Then:
 *   1. `perceivedWind` gives the wind the solver plans against.
 *   2. The solver picks the candidates on that wind.
 *   3. `pickCandidate` applies the brain-fart rule (L ≤ 30).
 *   4. `fireValues` applies E_n (first-shot bias, bracketing) and execution
 *      noise, and returns the integer command values plus the next memory.
 *   5. After the shot resolves, `afterShot` records the miss for bracketing
 *      and the DR-067 rattled trigger.
 */
import type { Rng } from '../sim/rng.ts';
import type { WindField } from '../sim/wind.ts';
import type { BotMemory, BotParams, Candidate } from './types.ts';

export interface ShotErrors {
  /** Perceived wind = true·windScale + windOffset levels (1 + k; b·s_w + σ_w·z3). */
  windScale: number;
  windOffset: number;
  /** Raw draws, kept for fireValues: s (first-shot sign), z1, z2. */
  s: 1 | -1;
  z1: number;
  z2: number;
  /** Brain-fart roll result and which runner-up (1 = 2nd best, 2 = 3rd best). */
  brainFart: boolean;
  bfRank: 1 | 2;
}

export function drawErrors(_rng: Rng, _p: BotParams): ShotErrors {
  return { windScale: 1, windOffset: 0, s: 1, z1: 0, z2: 0, brainFart: false, bfRank: 1 };
}

export function perceivedWind(trueWind: WindField, _e: ShotErrors): WindField {
  return trueWind;
}

/** Candidates arrive best first. Returns the one the bot actually goes for. */
export function pickCandidate(ranked: readonly Candidate[], _e: ShotErrors): Candidate | null {
  return ranked[0] ?? null;
}

export function fireValues(
  c: Candidate,
  _e: ShotErrors,
  _p: BotParams,
  mem: BotMemory,
): { angleDeci: number; powerMille: number; memory: BotMemory } {
  return { angleDeci: c.angleDeci, powerMille: c.powerMille, memory: { ...mem } };
}

export interface ShotOutcome {
  /** Ant aimed at. */
  target: number;
  /** Damage dealt to the player's ants, and their max HP. */
  damageToEnemy: number;
  enemyMaxHp: number;
  /** DR-062 hit on the target. */
  hit: boolean;
  /** Enemy ants still active after the shot. */
  enemyAntsLeft: number;
  /** Signed miss along the shot direction, relative power and degrees (for bracketing). */
  missPower: number;
  missAngle: number;
}

export function afterShot(mem: BotMemory, _p: BotParams, _o: ShotOutcome): BotMemory {
  return { ...mem };
}
