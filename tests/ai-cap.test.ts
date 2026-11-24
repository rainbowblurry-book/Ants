/**
 * The bot cap (DR-065, PLAN §10) and the error model's unit rules (DR-061,
 * DR-063, DR-064, DR-066, DR-067, DR-071).
 *
 * Suite: 144 scenarios (tests/helpers/aiCapSuite.ts), Seed Spitter, DR-062
 * hit metric, every trial a fresh first shot (B in, brain-fart and rattled
 * out). 30 trials per scenario at L90 and L100, 10 at L0, L1, 10, …, 80 and
 * at the boss-effective levels 95–100. AI seed = hash(level, scenario, trial).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ANCHORS,
  botParams,
  brainFartChance,
  curveAt,
  detExp,
  detLn,
  FLOOR,
  LEVEL0,
  thinkSeconds,
} from '../src/ai/botParams.ts';
import {
  afterShot,
  DRAWS_PER_SHOT,
  drawErrors,
  drawNormal,
  fireValues,
  isLethalBlast,
  missFromImpact,
  normalInv,
  perceivedWind,
  pickCandidate,
  type ShotErrors,
  type ShotOutcome,
} from '../src/ai/error.ts';
import { type Candidate, freshMemory } from '../src/ai/types.ts';
import { Rng } from '../src/sim/rng.ts';
import { LevelWind } from '../src/sim/wind.ts';
import { buildScenarios, DISTANCES, type LevelRun, runLevel } from './helpers/aiCapSuite.ts';

const CAP_TRIALS = 30;
const LOW_TRIALS = 10;
const LOW_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80] as const;
/** Campaign boss levels whose effective level is 95..100. */
const BOSS_LEVELS = [90, 91, 92, 93, 94, 95] as const;
const SUITE_TIMEOUT = 120_000;

describe('ai-cap: the DR-065 benchmark suite', () => {
  const scenarios = buildScenarios();
  const runs = new Map<string, LevelRun>();
  const rate = (key: string) => (runs.get(key) as LevelRun).rate;

  beforeAll(() => {
    runs.set('L0', runLevel(scenarios, botParams(0), 'L0', LOW_TRIALS));
    for (const L of LOW_LEVELS) {
      runs.set(`L${L}`, runLevel(scenarios, botParams(L), `L${L}`, LOW_TRIALS));
    }
    for (const L of [90, 100]) {
      runs.set(`L${L}`, runLevel(scenarios, botParams(L), `L${L}`, CAP_TRIALS));
    }
    for (const L of BOSS_LEVELS) {
      const p = botParams(L, { boss: true });
      runs.set(`B${p.level}`, runLevel(scenarios, p, `B${p.level}`, LOW_TRIALS));
    }
    const table = [...runs.entries()].map(([k, r]) => {
      const far = r.byDistance[DISTANCES.length - 1] as { hits: number; trials: number };
      return `${k} ${(100 * r.rate).toFixed(1)}% (700 px ${((100 * far.hits) / far.trials).toFixed(1)}%)`;
    });
    console.info(`ai-cap hit rates: ${table.join(', ')}`);
  }, SUITE_TIMEOUT);

  it('runs 144 scenarios with the DR-065 trial counts', () => {
    expect(scenarios).toHaveLength(144);
    expect((runs.get('L90') as LevelRun).trials).toBe(4320);
    expect((runs.get('L100') as LevelRun).trials).toBe(4320);
    for (const L of LOW_LEVELS) expect((runs.get(`L${L}`) as LevelRun).trials).toBe(1440);
  });

  it('1. L90 and L100 land within [0.93, 0.97]', () => {
    for (const k of ['L90', 'L100']) {
      expect(rate(k)).toBeGreaterThanOrEqual(0.93);
      expect(rate(k)).toBeLessThanOrEqual(0.97);
    }
  });

  it('2. |hit(L90) − hit(L100)| ≤ 0.02', () => {
    expect(Math.abs(rate('L90') - rate('L100'))).toBeLessThanOrEqual(0.02);
  });

  it('3. boss-effective levels 95–100 stay ≤ 0.97', () => {
    for (const L of BOSS_LEVELS) {
      const p = botParams(L, { boss: true });
      expect(p.level).toBe(L + 5);
      expect(rate(`B${p.level}`)).toBeLessThanOrEqual(0.97);
    }
  });

  it('4. L1, L10 and L20 land within [0.18, 0.48]', () => {
    for (const k of ['L1', 'L10', 'L20']) {
      expect(rate(k)).toBeGreaterThanOrEqual(0.18);
      expect(rate(k)).toBeLessThanOrEqual(0.48);
    }
  });

  it('5. monotonic: hit(L+10) ≥ hit(L) − 0.02', () => {
    const chain = [...LOW_LEVELS, 90, 100].map((L) => `L${L}`);
    for (let i = 1; i < chain.length; i++) {
      expect(rate(chain[i] as string)).toBeGreaterThanOrEqual(rate(chain[i - 1] as string) - 0.02);
    }
  });

  it('6. the 700 px bucket at L ≥ 90 is ≥ 0.80', () => {
    for (const k of ['L90', 'L100']) {
      const far = (runs.get(k) as LevelRun).byDistance[DISTANCES.indexOf(700)] as {
        hits: number;
        trials: number;
      };
      expect(far.trials).toBe(720);
      expect(far.hits / far.trials).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('7. determinism: the same seeds give identical counts and first 100 impacts', () => {
    const a = runs.get('L1') as LevelRun;
    const b = runLevel(scenarios, botParams(1), 'L1', LOW_TRIALS);
    expect(b.hits).toBe(a.hits);
    expect(b.byDistance).toEqual(a.byDistance);
    expect(b.firstImpacts).toHaveLength(100);
    expect(b.firstImpacts).toEqual(a.firstImpacts);
    // Other seeds really do differ (the check is not vacuous).
    const c = runLevel(scenarios.slice(0, 100), botParams(1), 'L1-other', 1);
    expect(c.firstImpacts).not.toEqual(a.firstImpacts);
  });

  it('8. AI index 0 (Level 0) lands within [0.06, 0.16] (DR-058)', () => {
    expect(rate('L0')).toBeGreaterThanOrEqual(0.06);
    expect(rate('L0')).toBeLessThanOrEqual(0.16);
  });

  // 9. Level 70 Preview (DR-070): an AI-25 stand-in for a new player wins
  // 35–60% of 200 seeds against botParams(70); if not, tune the rival HP
  // (50–70), never the bot. It needs full matches with the solver
  // (src/ai/solver.ts, src/ai/bot.ts) and the L64 Porch level file with the
  // Preview kit, none of which exist yet in this stage's error-model part.
  it.todo('9. Level 70 Preview: an AI-25 stand-in wins 35–60% of 200 seeds (DR-070)');
});

describe('botParams: the DR-063 curve', () => {
  it('reproduces every anchor and the Level 0 row', () => {
    for (const a of ANCHORS) {
      const p = botParams(a.level);
      expect(p.sigmaP).toBeCloseTo(a.sigmaP, 12);
      expect(p.sigmaA).toBeCloseTo(a.sigmaA, 12);
      expect(p.sigmaW).toBeCloseTo(a.sigmaW, 12);
      expect(p.k).toBeCloseTo(a.k, 12);
      expect(p.b).toBeCloseTo(a.b, 12);
      expect(p.B).toBeCloseTo(a.B, 12);
    }
    const p0 = botParams(0);
    expect([p0.sigmaP, p0.sigmaA, p0.sigmaW, p0.k, p0.b, p0.B, p0.pBf]).toEqual([
      LEVEL0.sigmaP,
      LEVEL0.sigmaA,
      LEVEL0.sigmaW,
      LEVEL0.k,
      LEVEL0.b,
      LEVEL0.B,
      0.12,
    ]);
  });

  it('log-interpolates the σs and linearly interpolates k, b and B', () => {
    for (let i = 0; i + 1 < ANCHORS.length; i++) {
      const a = ANCHORS[i] as (typeof ANCHORS)[number];
      const c = ANCHORS[i + 1] as (typeof ANCHORS)[number];
      const L = Math.floor((a.level + c.level) / 2);
      const t = (L - a.level) / (c.level - a.level);
      const geo = (x: number, y: number) => Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t);
      const p = curveAt(L);
      expect(p.sigmaP).toBeCloseTo(geo(a.sigmaP, c.sigmaP), 12);
      expect(p.sigmaA).toBeCloseTo(geo(a.sigmaA, c.sigmaA), 12);
      expect(p.sigmaW).toBeCloseTo(geo(a.sigmaW, c.sigmaW), 12);
      expect(p.k).toBeCloseTo(a.k + (c.k - a.k) * t, 12);
      expect(p.b).toBeCloseTo(a.b + (c.b - a.b) * t, 12);
      expect(p.B).toBeCloseTo(a.B + (c.B - a.B) * t, 12);
    }
  });

  it('is monotone from L0 to L100 and never goes below the DR-064 floor', () => {
    let prev = botParams(0);
    for (let L = 1; L <= 100; L++) {
      const p = botParams(L);
      expect(p.sigmaP).toBeLessThanOrEqual(prev.sigmaP);
      expect(p.sigmaA).toBeLessThanOrEqual(prev.sigmaA);
      expect(p.sigmaW).toBeLessThanOrEqual(prev.sigmaW);
      expect(Math.abs(p.k)).toBeLessThanOrEqual(Math.abs(prev.k));
      expect(p.b).toBeLessThanOrEqual(prev.b);
      expect(p.B).toBeLessThanOrEqual(prev.B);
      expect(p.pBf).toBeLessThanOrEqual(prev.pBf);
      expect(p.sigmaP).toBeGreaterThanOrEqual(FLOOR.sigmaP);
      expect(p.sigmaA).toBeGreaterThanOrEqual(FLOOR.sigmaA);
      expect(p.sigmaW).toBeGreaterThanOrEqual(FLOOR.sigmaW);
      prev = p;
    }
  });

  it('holds exactly the floor at every level ≥ 90 (bosses too)', () => {
    for (let L = 90; L <= 100; L++) {
      for (const boss of [false, true]) {
        const p = botParams(L, { boss });
        expect([p.sigmaP, p.sigmaA, p.sigmaW, p.k, p.b, p.B, p.pBf]).toEqual([
          FLOOR.sigmaP,
          FLOOR.sigmaA,
          FLOOR.sigmaW,
          0,
          0,
          0,
          0,
        ]);
      }
    }
    expect(botParams(89).sigmaP).toBeGreaterThan(FLOOR.sigmaP);
  });

  it('bosses play at min(100, L + 5) and read the true wind', () => {
    const b = botParams(10, { boss: true });
    const n = botParams(15);
    expect(b.level).toBe(15);
    expect(b.boss).toBe(true);
    expect([b.sigmaP, b.sigmaA, b.sigmaW, b.B, b.pBf]).toEqual([
      n.sigmaP,
      n.sigmaA,
      n.sigmaW,
      n.B,
      n.pBf,
    ]);
    expect([b.k, b.b]).toEqual([0, 0]);
    expect(botParams(98, { boss: true }).level).toBe(100);
  });

  it('p_bf falls linearly from 0.12 at L1 to 0 at L30', () => {
    expect(brainFartChance(1)).toBeCloseTo(0.12, 12);
    expect(brainFartChance(10)).toBeCloseTo(0.12 * (20 / 29), 12);
    expect(brainFartChance(20)).toBeCloseTo(0.12 * (10 / 29), 12);
    expect(brainFartChance(30)).toBe(0);
    expect(brainFartChance(60)).toBe(0);
  });

  it('think time: 1.0 s through L10 (DR-071), then 1.8 s − 1.0 s·u down to 0.8 s at L100', () => {
    for (let L = 0; L <= 10; L++) expect(thinkSeconds(L)).toBe(1.0);
    expect(thinkSeconds(11)).toBeCloseTo(1.8 - 10 / 99, 12);
    expect(thinkSeconds(100)).toBeCloseTo(0.8, 12);
    for (let L = 12; L <= 100; L++) expect(thinkSeconds(L)).toBeLessThan(thinkSeconds(L - 1));
    // Bosses think at their campaign level's pace.
    expect(botParams(10, { boss: true }).thinkS).toBe(1.0);
  });
});

describe('DR-067 rattled', () => {
  const outcome = (o: Partial<ShotOutcome>): ShotOutcome => ({
    target: 2,
    damageToEnemy: 0,
    enemyMaxHp: 100,
    hit: false,
    enemyAntsLeft: 3,
    missPower: 0,
    missAngle: 0,
    ...o,
  });

  it('multiplies σ_p, σ_a and B by 1.5 at L1–20 only', () => {
    for (const L of [1, 7, 20]) {
      const calm = botParams(L);
      const r = botParams(L, { rattled: true });
      expect(r.sigmaP).toBeCloseTo(calm.sigmaP * 1.5, 12);
      expect(r.sigmaA).toBeCloseTo(calm.sigmaA * 1.5, 12);
      expect(r.B).toBeCloseTo(calm.B * 1.5, 12);
      expect([r.sigmaW, r.k, r.b, r.pBf]).toEqual([calm.sigmaW, calm.k, calm.b, calm.pBf]);
    }
    for (const L of [0, 21, 50, 100]) expect(botParams(L, { rattled: true })).toEqual(botParams(L));
  });

  it('toggles on from the stated trigger and off again', () => {
    const p = botParams(5);
    const mem = { ...freshMemory(), target: 2 };
    // ≥ 50% of the player ant's max HP.
    expect(afterShot(mem, p, outcome({ damageToEnemy: 50 })).rattled).toBe(true);
    expect(afterShot(mem, p, outcome({ damageToEnemy: 49 })).rattled).toBe(false);
    expect(afterShot(mem, p, outcome({ damageToEnemy: 40, enemyMaxHp: 80 })).rattled).toBe(true);
    // A DR-062 hit while the player has ≤ 1 ant left.
    expect(
      afterShot(mem, p, outcome({ hit: true, damageToEnemy: 25, enemyAntsLeft: 1 })).rattled,
    ).toBe(true);
    expect(
      afterShot(mem, p, outcome({ hit: true, damageToEnemy: 25, enemyAntsLeft: 0 })).rattled,
    ).toBe(true);
    expect(
      afterShot(mem, p, outcome({ hit: true, damageToEnemy: 25, enemyAntsLeft: 2 })).rattled,
    ).toBe(false);
    expect(afterShot(mem, p, outcome({ hit: false, enemyAntsLeft: 1 })).rattled).toBe(false);
    // The next quiet shot clears it.
    const r = afterShot(mem, p, outcome({ damageToEnemy: 60 }));
    expect(afterShot(r, p, outcome({ damageToEnemy: 10 })).rattled).toBe(false);
    // Never above L20; a boss counts by its campaign level.
    expect(afterShot(mem, botParams(21), outcome({ damageToEnemy: 60 })).rattled).toBe(false);
    expect(
      afterShot(mem, botParams(20, { boss: true }), outcome({ damageToEnemy: 60 })).rattled,
    ).toBe(true);
    // The flag feeds botParams for the next turn.
    const next = botParams(5, { rattled: r.rattled });
    expect(next.sigmaP).toBeCloseTo(p.sigmaP * 1.5, 12);
  });
});

describe('error model (DR-061)', () => {
  it('DR-062 hit metric: d ≤ 0.5·r to the hurtbox surface (Seed R_L = 14 px)', () => {
    const ant = { x: 500, y: 400 };
    // Capsule centre 22 px above the feet, radius 16: the top surface is at y 362.
    expect(isLethalBlast({ x: 500, y: 348, r: 28, direct: -1 }, 1, ant)).toBe(true);
    expect(isLethalBlast({ x: 500, y: 347, r: 28, direct: -1 }, 1, ant)).toBe(false);
    // Beside the segment end (x 512): 16 + 14 px out.
    expect(isLethalBlast({ x: 542, y: 378, r: 28, direct: -1 }, 1, ant)).toBe(true);
    expect(isLethalBlast({ x: 542.5, y: 378, r: 28, direct: -1 }, 1, ant)).toBe(false);
    // A direct hit is d = 0, wherever the blast point is.
    expect(isLethalBlast({ x: 600, y: 300, r: 28, direct: 1 }, 1, ant)).toBe(true);
  });

  it('detLn and detExp match Math.log and Math.exp', () => {
    for (const x of [1e-9, 0.0135, 0.05, 0.3, 0.5, 1, 1.2, Math.SQRT2, 2, 9, 12, 1234.5]) {
      expect(Math.abs(detLn(x) - Math.log(x))).toBeLessThan(
        1e-14 * Math.max(1, Math.abs(Math.log(x))),
      );
    }
    for (const x of [-20, -3.3, -0.5, 0, 0.1, 1, 2.5, 7]) {
      expect(Math.abs(detExp(x) / Math.exp(x) - 1)).toBeLessThan(1e-14);
    }
  });

  it('normalInv is the N(0, 1) quantile', () => {
    expect(normalInv(0.5)).toBeCloseTo(0, 9);
    expect(normalInv(0.975)).toBeCloseTo(1.959963985, 7);
    expect(normalInv(0.025)).toBeCloseTo(-1.959963985, 7);
    expect(normalInv(0.8413447461)).toBeCloseTo(1, 7);
    expect(normalInv(0.001)).toBeCloseTo(-3.090232306, 6);
    expect(normalInv(1e-9)).toBeCloseTo(-5.997807015, 5);
    const rng = Rng.fromString('normal-check');
    let s1 = 0;
    let s2 = 0;
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      const z = drawNormal(rng);
      s1 += z;
      s2 += z * z;
    }
    expect(Math.abs(s1 / N)).toBeLessThan(0.01);
    expect(Math.abs(s2 / N - 1)).toBeLessThan(0.02);
  });

  it('drawErrors always takes the same 7 draws, in order, whatever the level', () => {
    for (const L of [0, 1, 25, 60, 100]) {
      const a = Rng.fromString('draws');
      const b = Rng.fromString('draws');
      const e = drawErrors(a, botParams(L));
      for (let i = 0; i < DRAWS_PER_SHOT; i++) b.nextU32();
      expect(a.getState()).toEqual(b.getState());
      // Same stream, same raw draws at every level.
      const e1 = drawErrors(Rng.fromString('draws'), botParams(1));
      expect([e.sw, e.z3, e.s, e.z1, e.z2, e.bfRank]).toEqual([
        e1.sw,
        e1.z3,
        e1.s,
        e1.z1,
        e1.z2,
        e1.bfRank,
      ]);
    }
  });

  it('perceives the wind as W·(1 + k) + b·s_w + σ_w·z3', () => {
    const p = botParams(1);
    const e = drawErrors(Rng.fromString('wind'), p);
    const trueWind = new LevelWind({ maxAbs: 5, maxStep: 0, everyNTurns: 1, start: 4 });
    const w = perceivedWind(trueWind, e);
    const expected = 4 * (1 + p.k) + p.b * e.sw + p.sigmaW * e.z3;
    expect(w.gauge().level).toBeCloseTo(expected, 12);
    expect(w.accel(0, 0, 0).x).toBeCloseTo(expected * 25, 9);
    // Planning never steps the true field.
    w.onTurnStart(5, Rng.fromString('x'));
    expect(trueWind.current).toBe(4);
  });

  it('brain-farts to the 2nd or 3rd candidate only when the roll says so', () => {
    const cand = (score: number): Candidate => ({
      weapon: 'seed',
      target: 1,
      facing: 1,
      angleDeci: 450,
      powerMille: 600,
      score,
      selfDamage: 0,
    });
    const ranked = [cand(30), cand(20), cand(10)];
    const base = drawErrors(Rng.fromString('bf'), botParams(1));
    const e = (brainFart: boolean, bfRank: 1 | 2): ShotErrors => ({ ...base, brainFart, bfRank });
    expect(pickCandidate(ranked, e(false, 2))?.score).toBe(30);
    expect(pickCandidate(ranked, e(true, 1))?.score).toBe(20);
    expect(pickCandidate(ranked, e(true, 2))?.score).toBe(10);
    expect(pickCandidate(ranked.slice(0, 2), e(true, 2))?.score).toBe(20);
    expect(pickCandidate([], e(true, 1))).toBeNull();
    // p_bf = 0 above L30: never.
    const rng = Rng.fromString('bf-roll');
    for (let i = 0; i < 200; i++) expect(drawErrors(rng, botParams(31)).brainFart).toBe(false);
  });

  it('fires p*·(1 + σ_p·z1 + E_n) and θ* + σ_a·z2, with E_n = B·s·0.5ⁿ at one target', () => {
    const p = botParams(10);
    const c: Candidate = {
      weapon: 'seed',
      target: 1,
      facing: 1,
      angleDeci: 450,
      powerMille: 600,
      score: 1,
      selfDamage: 0,
    };
    const e: ShotErrors = { ...drawErrors(Rng.fromString('fv'), p), z1: 0, z2: 0, s: 1 };
    let mem = freshMemory();
    const powers: number[] = [];
    for (let n = 0; n < 3; n++) {
      const fv = fireValues(c, e, p, mem);
      powers.push(fv.powerMille);
      expect(fv.memory.target).toBe(1);
      expect(fv.memory.shotsAtTarget).toBe(n + 1);
      expect(fv.memory.e0).toBeCloseTo(p.B, 12);
      mem = fv.memory;
    }
    expect(powers).toEqual([
      Math.round(600 * (1 + p.B)),
      Math.round(600 * (1 + p.B / 2)),
      Math.round(600 * (1 + p.B / 4)),
    ]);
    // A new target re-rolls E0 with this shot's sign.
    const other = fireValues({ ...c, target: 2 }, { ...e, s: -1 }, p, mem);
    expect(other.powerMille).toBe(Math.round(600 * (1 - p.B)));
    expect(other.memory.shotsAtTarget).toBe(1);
    // Noise in the angle, integers, clamped to the command limits.
    const noisy = fireValues(c, { ...e, z1: 1, z2: -1 }, p, freshMemory());
    expect(noisy.angleDeci).toBe(Math.round(450 - 10 * p.sigmaA));
    expect(noisy.powerMille).toBe(Math.round(600 * (1 + p.sigmaP + p.B)));
    const wild = fireValues(
      { ...c, powerMille: 990, angleDeci: 895 },
      { ...e, z1: 5, z2: 5 },
      p,
      mem,
    );
    expect(wild.powerMille).toBe(1000);
    expect(wild.angleDeci).toBe(900);
  });

  it('brackets: leans 0.5× against the last miss at the same target', () => {
    const p = botParams(90);
    const c: Candidate = {
      weapon: 'seed',
      target: 1,
      facing: 1,
      angleDeci: 450,
      powerMille: 600,
      score: 1,
      selfDamage: 0,
    };
    const e: ShotErrors = { ...drawErrors(Rng.fromString('br'), p), z1: 0, z2: 0 };
    const first = fireValues(c, e, p, freshMemory());
    const long = missFromImpact(100, 500, 540, 600);
    expect(long).toBeGreaterThan(0);
    expect(missFromImpact(500, 100, 60, 600)).toBeCloseTo(long, 12);
    const out: ShotOutcome = {
      target: 1,
      damageToEnemy: 0,
      enemyMaxHp: 100,
      hit: false,
      enemyAntsLeft: 2,
      missPower: long,
      missAngle: 0,
    };
    const mem = afterShot(first.memory, p, out);
    expect(mem.lastMissPower).toBe(long);
    const second = fireValues(c, e, p, mem);
    expect(second.powerMille).toBe(Math.round(600 * (1 - 0.5 * long)));
    // A hit clears the correction.
    expect(afterShot(first.memory, p, { ...out, hit: true }).lastMissPower).toBe(0);
  });
});
