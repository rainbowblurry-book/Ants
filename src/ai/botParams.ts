/**
 * botParams(level) (DR-063 curve, DR-064 floor, DR-066 / DR-071 think time,
 * DR-067 rattled, PLAN §9).
 *
 * - Level 0 (AI index 0, DR-058) is its own row, not interpolated.
 * - L1..90: σ_p, σ_a and σ_w are log-interpolated between the anchors; k, b
 *   and B are linear. p_bf is linear from 0.12 at L1 to 0 at L30.
 * - The DR-064 floor (σ_p 1.35%, σ_a 0.8°, σ_w 0.05, k = b = B = 0) holds at
 *   every level ≥ 90 and is never reduced: every σ is max(σ, floor).
 * - Bosses: effective level min(100, L + 5) and the true wind (k = b = 0).
 * - Rattled (DR-067): σ_p, σ_a and B × 1.5, campaign levels 1–20 only.
 *
 * Log-interpolation without Math.exp / Math.log (banned in src/ai, DR-011):
 * `detLn` and `detExp` below use only + − × ÷ in a fixed order (range
 * reduction by exact halving / doubling and a fixed-length series), so every
 * JS engine gives the same bits. The anchors stay the single source of truth
 * here; refits edit ANCHORS only (logged as `DR-063 tuning` lines).
 */
import type { BotParams } from './types.ts';

export interface BotParamOpts {
  /** Boss: effective level min(100, L + 5), true wind (k = b = 0). */
  boss?: boolean;
  /** DR-067 rattled: σ_p, σ_a and B × 1.5 (L1–20 only). */
  rattled?: boolean;
}

/** One row of the DR-063 table. σ_p and B are relative (0.15 = 15%). */
export interface CurveAnchor {
  level: number;
  sigmaP: number;
  sigmaA: number;
  sigmaW: number;
  k: number;
  b: number;
  B: number;
}

/** DR-064: the error floor at L ≥ 90, never reduced. */
export const FLOOR = { sigmaP: 0.0135, sigmaA: 0.8, sigmaW: 0.05 } as const;
/** Level at which the floor is reached and held. */
export const FLOOR_LEVEL = 90;

/** AI index 0, Level 0 practice only (DR-058, PLAN §9). */
export const LEVEL0: CurveAnchor = {
  level: 0,
  sigmaP: 0.4,
  sigmaA: 12,
  sigmaW: 3,
  k: -0.8,
  b: 3,
  B: 0.3,
};

/**
 * DR-063 anchors, ascending by level; the last row is the floor at L90.
 * Stage 6 ran tests/ai-cap.test.ts on the real simulateShot with the
 * planner's Python-fitted values: every assert passed, so they are unchanged
 * (L1 24.2%, L10 31.2%, L20 37.1%, L40 55.8%, L60 73.1%, L80 88.0%,
 * L90 95.6%, L100 95.3%, 700 px at L90 89.3%). A refit edits this table and
 * adds a `DR-063 tuning` line.
 */
export const ANCHORS: readonly CurveAnchor[] = [
  { level: 1, sigmaP: 0.15, sigmaA: 9, sigmaW: 1.2, k: -0.5, b: 1.5, B: 0.12 },
  { level: 10, sigmaP: 0.115, sigmaA: 6.2, sigmaW: 1.0, k: -0.3, b: 1.0, B: 0.095 },
  { level: 20, sigmaP: 0.09, sigmaA: 5, sigmaW: 0.8, k: -0.2, b: 0.6, B: 0.07 },
  { level: 40, sigmaP: 0.06, sigmaA: 3.6, sigmaW: 0.48, k: -0.1, b: 0.3, B: 0.036 },
  { level: 60, sigmaP: 0.036, sigmaA: 2.1, sigmaW: 0.25, k: -0.05, b: 0.1, B: 0.017 },
  { level: 80, sigmaP: 0.0205, sigmaA: 1.25, sigmaW: 0.12, k: 0, b: 0, B: 0.006 },
  { level: FLOOR_LEVEL, ...FLOOR, k: 0, b: 0, B: 0 },
];

/** Brain-fart chance: 0.12 at L1 falling linearly to 0 at L30 (DR-061). */
export const PBF_L1 = 0.12;
export const PBF_ZERO_LEVEL = 30;
/** DR-067 rattled multiplier and its level range. */
export const RATTLED_MULT = 1.5;
export const RATTLED_MAX_LEVEL = 20;
/** DR-066 think time: 1.8 s at L1 to 0.8 s at L100; DR-071 caps it at 1.0 s through L10. */
export const THINK_L1_S = 1.8;
export const THINK_L100_S = 0.8;
export const THINK_CAP_S = 1.0;
export const THINK_CAP_LEVEL = 10;
/** Boss bonus levels (DR-063). */
export const BOSS_BONUS = 5;

// Deterministic ln / exp (see the file comment).

const LN2 = Math.LN2;
const SQRT2 = Math.SQRT2;

/** Natural log for x > 0, using only + − × ÷ (bit-identical everywhere). */
export function detLn(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) throw new RangeError(`detLn: bad ${x}`);
  let m = x;
  let e = 0;
  while (m >= 2) {
    m /= 2;
    e++;
  }
  while (m < 1) {
    m *= 2;
    e--;
  }
  if (m > SQRT2) {
    m /= 2;
    e++;
  }
  // ln m = 2·atanh(y), y = (m − 1)/(m + 1), |y| ≤ 0.1716.
  const y = (m - 1) / (m + 1);
  const y2 = y * y;
  let term = y;
  let sum = 0;
  for (let n = 1; n <= 25; n += 2) {
    sum += term / n;
    term *= y2;
  }
  return e * LN2 + 2 * sum;
}

/** e^x, using only + − × ÷ (bit-identical everywhere). */
export function detExp(x: number): number {
  if (!Number.isFinite(x)) throw new RangeError(`detExp: bad ${x}`);
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  // Taylor series on |r| ≤ 0.35: 20 terms is far below float precision.
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 20; n++) {
    term = (term * r) / n;
    sum += term;
  }
  let out = sum;
  if (k > 0) for (let i = 0; i < k; i++) out *= 2;
  else for (let i = 0; i < -k; i++) out /= 2;
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Geometric interpolation a·(b/a)^t, deterministic (see the file comment). */
function logLerp(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const la = detLn(a);
  return detExp(la + (detLn(b) - la) * t);
}

/** The raw curve at an effective level, before the boss and rattled rules. */
export function curveAt(level: number, anchors: readonly CurveAnchor[] = ANCHORS): CurveAnchor {
  if (level <= 0) return { ...LEVEL0 };
  const first = anchors[0] as CurveAnchor;
  const last = anchors[anchors.length - 1] as CurveAnchor;
  let row: CurveAnchor;
  if (level <= first.level) row = { ...first, level };
  else if (level >= last.level) row = { ...last, level };
  else {
    let i = 0;
    while ((anchors[i + 1] as CurveAnchor).level < level) i++;
    const a = anchors[i] as CurveAnchor;
    const c = anchors[i + 1] as CurveAnchor;
    const t = (level - a.level) / (c.level - a.level);
    row = {
      level,
      sigmaP: logLerp(a.sigmaP, c.sigmaP, t),
      sigmaA: logLerp(a.sigmaA, c.sigmaA, t),
      sigmaW: logLerp(a.sigmaW, c.sigmaW, t),
      k: lerp(a.k, c.k, t),
      b: lerp(a.b, c.b, t),
      B: lerp(a.B, c.B, t),
    };
  }
  // DR-064: the floor applies after interpolation and is never reduced.
  row.sigmaP = Math.max(row.sigmaP, FLOOR.sigmaP);
  row.sigmaA = Math.max(row.sigmaA, FLOOR.sigmaA);
  row.sigmaW = Math.max(row.sigmaW, FLOOR.sigmaW);
  if (level >= FLOOR_LEVEL) {
    row.sigmaP = FLOOR.sigmaP;
    row.sigmaA = FLOOR.sigmaA;
    row.sigmaW = FLOOR.sigmaW;
    row.k = 0;
    row.b = 0;
    row.B = 0;
  }
  return row;
}

/** p_bf at an effective level (Level 0 uses the L1 value, DR-058). */
export function brainFartChance(level: number): number {
  if (level <= 1) return PBF_L1;
  if (level >= PBF_ZERO_LEVEL) return 0;
  return (PBF_L1 * (PBF_ZERO_LEVEL - level)) / (PBF_ZERO_LEVEL - 1);
}

/** Think time in seconds at a campaign level (DR-066, DR-071 cap through L10). */
export function thinkSeconds(level: number): number {
  const l = level < 1 ? 1 : Math.min(level, 100);
  const s = THINK_L1_S - ((THINK_L1_S - THINK_L100_S) * (l - 1)) / 99;
  return level <= THINK_CAP_LEVEL ? Math.min(s, THINK_CAP_S) : s;
}

/** Effective level for a campaign level (DR-063 bosses: min(100, L + 5)). */
export function effectiveLevel(level: number, boss = false): number {
  const l = level < 0 ? 0 : Math.min(level, 100);
  return boss ? Math.min(100, l + BOSS_BONUS) : l;
}

/** Campaign level behind a BotParams (undoes the boss bonus for levels ≤ 95). */
export function campaignLevel(p: BotParams): number {
  return p.boss ? p.level - BOSS_BONUS : p.level;
}

/** True if DR-067 can make a bot of this campaign level rattled. */
export function canBeRattled(level: number): boolean {
  return level >= 1 && level <= RATTLED_MAX_LEVEL;
}

/** botParams over a given anchor set (the calibration uses this). */
export function curveParams(
  level: number,
  opts: BotParamOpts,
  anchors: readonly CurveAnchor[],
): BotParams {
  const boss = opts.boss ?? false;
  const eff = effectiveLevel(level, boss);
  const row = curveAt(eff, anchors);
  const m = opts.rattled && canBeRattled(level) ? RATTLED_MULT : 1;
  return {
    level: eff,
    sigmaP: row.sigmaP * m,
    sigmaA: row.sigmaA * m,
    sigmaW: row.sigmaW,
    k: boss ? 0 : row.k,
    b: boss ? 0 : row.b,
    B: row.B * m,
    pBf: brainFartChance(eff),
    thinkS: thinkSeconds(level),
    boss,
  };
}

export function botParams(level: number, opts: BotParamOpts = {}): BotParams {
  return curveParams(level, opts, ANCHORS);
}
