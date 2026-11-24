/**
 * The human-like error model (DR-061, DR-062, DR-067).
 *
 * Per shot, `drawErrors` takes every draw from the `ai` stream up front, in
 * the DR-061 order, whatever the target turns out to be (so the stream use
 * never depends on the search). Seven u32 draws, always:
 *   1. s_w (wind bias sign), z3 (wind jitter)       → perceived wind
 *   2. s (first-shot bias sign)                      → E0 = B·s on a new target
 *   3. z1 (power noise), z2 (angle noise)            → execution noise
 *   4. brain-fart roll, then the runner-up rank      → pickCandidate
 * Then:
 *   1. `perceivedWind` gives the wind the solver plans against.
 *   2. The solver picks the candidates on that wind.
 *   3. `pickCandidate` applies the brain-fart rule (L ≤ 30).
 *   4. `fireValues` applies E_n (first-shot bias, bracketing) and execution
 *      noise, and returns the integer command values plus the next memory.
 *   5. After the shot resolves, `afterShot` records the miss for bracketing
 *      and the DR-067 rattled trigger.
 *
 * Normal draws without Math.log (banned in src/ai, DR-011): z = Φ⁻¹(u) by
 * Acklam's rational approximation (relative error < 1.2e-9), whose tails need
 * ln. `detLn` / `detExp` (botParams.ts) use + − × ÷ only, in a fixed
 * order, so they are bit-identical on every engine (IEEE 754 rounds those
 * exactly). This was chosen over a literal inverse-CDF table: no generator
 * to keep in sync, no tail truncation, and one u32 per normal draw.
 */
import { AIM_MAX_DECI, AIM_MIN_DECI, POWER_MAX_MILLE } from '../sim/commands.ts';
import { blastDistance } from '../sim/damage.ts';
import { WIND_K } from '../sim/physics.ts';
import type { Rng } from '../sim/rng.ts';
import type { WindField } from '../sim/wind.ts';
import { campaignLevel, canBeRattled, detLn } from './botParams.ts';
import type { ShotSimResult } from './shotSim.ts';
import type { BotMemory, BotParams, Candidate } from './types.ts';

// ---------------------------------------------------------------------------
// The normal inverse CDF (detLn lives in botParams.ts).

const A = [
  -39.69683028665376, 220.9460984245205, -275.928510446969, 138.357751867269, -30.66479806614716,
  2.506628277459239,
] as const;
const B = [
  -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572,
] as const;
const C = [
  -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
  4.374664141464968, 2.938163982698783,
] as const;
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416] as const;
const P_LOW = 0.02425;

function tail(q: number): number {
  return (
    (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
    ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  );
}

/** Φ⁻¹(u) for u in (0, 1) (Acklam). */
export function normalInv(u: number): number {
  if (!(u > 0 && u < 1)) throw new RangeError(`normalInv: bad ${u}`);
  if (u < P_LOW) return tail(Math.sqrt(-2 * detLn(u)));
  if (u > 1 - P_LOW) return -tail(Math.sqrt(-2 * detLn(1 - u)));
  const q = u - 0.5;
  const r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}

/** One N(0, 1) draw: exactly one u32 from the stream, mapped into (0, 1). */
export function drawNormal(rng: Rng): number {
  return normalInv((rng.nextU32() + 0.5) / 4294967296);
}

/** One ±1 draw: exactly one u32. */
function drawSign(rng: Rng): 1 | -1 {
  return rng.next() < 0.5 ? 1 : -1;
}

// ---------------------------------------------------------------------------
// The per-shot draws.

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
  /** Raw wind draws, for logs and tests: s_w and z3. */
  sw: 1 | -1;
  z3: number;
}

/** Number of u32s `drawErrors` takes from the stream, always. */
export const DRAWS_PER_SHOT = 7;

export function drawErrors(rng: Rng, p: BotParams): ShotErrors {
  // DR-061 order: wind (s_w, z3), first-shot sign s, z1, z2, brain-fart.
  const sw = drawSign(rng);
  const z3 = drawNormal(rng);
  const s = drawSign(rng);
  const z1 = drawNormal(rng);
  const z2 = drawNormal(rng);
  const brainFart = rng.next() < p.pBf;
  const bfRank: 1 | 2 = rng.next() < 0.5 ? 1 : 2;
  return {
    windScale: 1 + p.k,
    windOffset: p.b * sw + p.sigmaW * z3,
    s,
    z1,
    z2,
    brainFart,
    bfRank,
    sw,
    z3,
  };
}

/**
 * The wind the bot believes in: the horizontal part scaled by (1 + k) plus an
 * offset in levels; the vertical part (Column fields) is read exactly. Never
 * steps the true field (onTurnStart is a no-op), so the solver cannot touch
 * the `wind` stream.
 */
export function perceivedWind(trueWind: WindField, e: ShotErrors): WindField {
  const scale = e.windScale;
  const offset = e.windOffset;
  if (scale === 1 && offset === 0) return trueWind;
  const ax = offset * WIND_K;
  return {
    onTurnStart() {},
    accel(x, y, tick) {
      const a = trueWind.accel(x, y, tick);
      return { x: a.x * scale + ax, y: a.y };
    },
    gauge(tick) {
      const g = trueWind.gauge(tick);
      const out = { ...g, level: g.level * scale + offset };
      if (g.next !== undefined) out.next = g.next * scale + offset;
      return out;
    },
  };
}

/** Candidates arrive best first. Returns the one the bot actually goes for. */
export function pickCandidate(ranked: readonly Candidate[], e: ShotErrors): Candidate | null {
  if (ranked.length === 0) return null;
  if (!e.brainFart || ranked.length === 1) return ranked[0] ?? null;
  return ranked[Math.min(e.bfRank, ranked.length - 1)] ?? null;
}

/** Largest bracketing correction carried from one miss (relative power / degrees). */
export const MAX_MISS_POWER = 0.5;
export const MAX_MISS_ANGLE = 15;
/** DR-061: lean toward the last impact by this fraction of the last miss. */
export const BRACKET_GAIN = 0.5;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : Math.min(v, hi);
}

/** E_n for the shot about to be fired at `target` (E0·0.5ⁿ; a new target re-rolls E0 = B·s). */
export function shotBias(
  target: number,
  e: ShotErrors,
  p: BotParams,
  mem: BotMemory,
): { en: number; e0: number; n: number; fresh: boolean } {
  const fresh = target !== mem.target;
  const e0 = fresh ? p.B * e.s : mem.e0;
  const n = fresh ? 0 : mem.shotsAtTarget;
  let en = e0;
  for (let i = 0; i < n; i++) en *= 0.5;
  return { en, e0, n, fresh };
}

/**
 * The command values actually fired (DR-061 step 3):
 *   power = p*·(1 + σ_p·z1 + E_n − 0.5·lastMissPower)
 *   angle = θ* + σ_a·z2 − 0.5·lastMissAngle
 * The last-miss terms only apply on a repeat shot at the same target. Values
 * are rounded to integers and clamped to the DR-033 command limits. The
 * returned memory has `target`, `shotsAtTarget` (+1) and `e0` updated; the
 * miss fields and `rattled` are left for afterShot.
 */
export function fireValues(
  c: Candidate,
  e: ShotErrors,
  p: BotParams,
  mem: BotMemory,
): { angleDeci: number; powerMille: number; memory: BotMemory } {
  const { en, e0, n, fresh } = shotBias(c.target, e, p, mem);
  const missP = fresh ? 0 : clamp(mem.lastMissPower, -MAX_MISS_POWER, MAX_MISS_POWER);
  const missA = fresh ? 0 : clamp(mem.lastMissAngle, -MAX_MISS_ANGLE, MAX_MISS_ANGLE);
  const power = c.powerMille * (1 + p.sigmaP * e.z1 + en - BRACKET_GAIN * missP);
  const angle = c.angleDeci + 10 * (p.sigmaA * e.z2 - BRACKET_GAIN * missA);
  const powerMille = clamp(Math.round(power), 0, POWER_MAX_MILLE);
  const angleDeci = clamp(Math.round(angle), AIM_MIN_DECI, AIM_MAX_DECI);
  const memory: BotMemory = {
    ...mem,
    target: c.target,
    shotsAtTarget: n + 1,
    e0,
    lastMissPower: fresh ? 0 : mem.lastMissPower,
    lastMissAngle: fresh ? 0 : mem.lastMissAngle,
  };
  return { angleDeci, powerMille, memory };
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

/** DR-067 trigger: ≥ 50% of the player ant's max HP dealt, or a hit with ≤ 1 player ant left. */
export function rattledTrigger(o: ShotOutcome): boolean {
  return o.damageToEnemy * 2 >= o.enemyMaxHp || (o.hit && o.enemyAntsLeft <= 1);
}

/**
 * Records the shot for the next turn: the miss for bracketing (0 after a hit)
 * and the DR-067 rattled flag (campaign levels 1–20 only; cleared otherwise).
 */
export function afterShot(mem: BotMemory, p: BotParams, o: ShotOutcome): BotMemory {
  const same = o.target === mem.target;
  return {
    ...mem,
    lastMissPower: same && !o.hit ? o.missPower : 0,
    lastMissAngle: same && !o.hit ? o.missAngle : 0,
    rattled: canBeRattled(campaignLevel(p)) && rattledTrigger(o),
  };
}

// ---------------------------------------------------------------------------
// The DR-062 hit metric and the miss estimate, shared with bot.ts and Battle.

/** DR-062: R_L = 0.5·r_blast (Seed 14 px, Dewdrop 24 px). */
export const LETHAL_FRACTION = 0.5;

/** A blast as the hit metric reads it (a ShotSimResult blast or a live ShotEvent blast). */
export interface HitBlast {
  x: number;
  y: number;
  r: number;
  /** Ant index the projectile touched, or −1. */
  direct: number;
}

/** DR-062 d: blast to the target's hurtbox surface, the DR-035 d (0 for a direct hit). */
export function blastHitDistance(
  b: HitBlast,
  target: number,
  ant: { x: number; y: number },
): number {
  if (b.direct === target) return 0;
  return blastDistance(b.x, b.y, ant);
}

/** DR-062 hit ⇔ d ≤ 0.5·r_blast, for one blast (use the shot's first blast). */
export function isLethalBlast(b: HitBlast, target: number, ant: { x: number; y: number }): boolean {
  return blastHitDistance(b, target, ant) <= LETHAL_FRACTION * b.r;
}

/** d from the first blast of a simulated shot; Infinity if it fizzled first. */
export function impactDistance(
  sim: ShotSimResult,
  target: number,
  ant: { x: number; y: number },
): number {
  const b = sim.blasts[0];
  if (!b || sim.fizzled) return Number.POSITIVE_INFINITY;
  return blastHitDistance(b, target, ant);
}

/** DR-062 hit for a simulated shot (its first blast; a fizzle is a miss). */
export function isLethalHit(
  sim: ShotSimResult,
  target: number,
  ant: { x: number; y: number },
): boolean {
  const b = sim.blasts[0];
  if (!b || sim.fizzled) return false;
  return isLethalBlast(b, target, ant);
}

/**
 * A signed miss in relative power for `ShotOutcome.missPower`: how much too
 * strong (> 0) or too weak (< 0) the shot was, from where it landed. Range
 * grows about like v², v = 100 + 620·p (DR-030), so
 * Δp/p ≈ (ΔR/R) · (100 + 620p) / (2·620p). missAngle is left at 0: the bot
 * brackets with power, as a person does at a fixed angle.
 */
export function missFromImpact(
  shooterX: number,
  targetX: number,
  impactX: number,
  powerMille: number,
): number {
  const r = Math.abs(targetX - shooterX);
  if (r < 1 || powerMille <= 0) return 0;
  const dir = targetX >= shooterX ? 1 : -1;
  const dr = (impactX - targetX) * dir;
  const pv = 0.62 * powerMille;
  const rel = ((dr / r) * (100 + pv)) / (2 * pv);
  return clamp(rel, -MAX_MISS_POWER, MAX_MISS_POWER);
}
