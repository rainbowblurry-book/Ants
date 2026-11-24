/**
 * The DR-065 benchmark suite, shared by tests/ai-cap.test.ts and the
 * calibration runs: 144 scenarios (distance × target height × stable wind ×
 * angle), Seed Spitter, the DR-062 hit metric.
 *
 * One trial = one fresh first shot: draw the errors, bisect power at the
 * fixed angle on the PERCEIVED wind, apply E0 and the execution noise, fire
 * on the TRUE wind and measure d. The brain-fart and rattled rules are out
 * (DR-063: the hit % excludes them).
 */
import { bisectPower } from '../../src/ai/bisect.ts';
import { drawErrors, fireValues, isLethalHit, perceivedWind } from '../../src/ai/error.ts';
import { simulateShot } from '../../src/ai/shotSim.ts';
import { type BotParams, type Candidate, freshMemory } from '../../src/ai/types.ts';
import { type Ant, createAnt } from '../../src/sim/movement.ts';
import { Rng } from '../../src/sim/rng.ts';
import { Material, TerrainGrid } from '../../src/sim/terrain.ts';
import type { World } from '../../src/sim/weapons/index.ts';
import { LevelWind } from '../../src/sim/wind.ts';

export const DISTANCES = [200, 300, 400, 500, 600, 700] as const;
export const HEIGHTS = [-60, 0, 60] as const;
export const WINDS = [-3, 0, 3, 5] as const;
export const ANGLES_DECI = [450, 600] as const;

/** Ground top, shooter x, plateau / pit width (DR-065 "140 px plateau or pit"). */
const GROUND_Y = 400;
const SHOOTER_X = 120;
const PLATEAU_W = 140;

export interface Scenario {
  index: number;
  distance: number;
  height: number;
  wind: number;
  angleDeci: number;
  world: World;
  /** Index of the target ant in world.ants. */
  target: number;
}

function buildWorld(distance: number, height: number, wind: number): World {
  const grid = new TerrainGrid(960, 540, 'void');
  grid.fillRect(0, GROUND_Y, 960, 540 - GROUND_Y, Material.SOIL);
  const tx = SHOOTER_X + distance;
  const x0 = tx - PLATEAU_W / 2;
  if (height > 0) grid.fillRect(x0, GROUND_Y - height, PLATEAU_W, height, Material.SOIL);
  else if (height < 0) grid.fillRect(x0, GROUND_Y, PLATEAU_W, -height, Material.EMPTY);
  const ants: Ant[] = [
    createAnt(0, 0, SHOOTER_X, GROUND_Y, 1),
    createAnt(1, 1, tx, GROUND_Y - height, -1),
  ];
  return {
    grid,
    ants,
    // A constant level: no roll ever happens (maxStep 0), no Column/Oscillate.
    wind: new LevelWind({ maxAbs: 5, maxStep: 0, everyNTurns: 1, start: wind }),
    tick: 0,
    spread: Rng.fromString('ai-cap:spread'),
    pickups: [],
    friendlyFire: true,
  };
}

/** The 144 scenarios in a fixed order. Worlds are shared; trials never mutate them. */
export function buildScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const distance of DISTANCES) {
    for (const height of HEIGHTS) {
      for (const wind of WINDS) {
        const world = buildWorld(distance, height, wind);
        for (const angleDeci of ANGLES_DECI) {
          out.push({ index: out.length, distance, height, wind, angleDeci, world, target: 1 });
        }
      }
    }
  }
  return out;
}

export interface TrialResult {
  hit: boolean;
  /** First blast or fizzle point, null if none. */
  impact: { x: number; y: number } | null;
  angleDeci: number;
  powerMille: number;
  sims: number;
}

/** AI seed = hash(level, scenario, trial) (DR-065). */
export function trialSeed(levelKey: string, scenario: number, trial: number): string {
  return `ai-cap:${levelKey}:${scenario}:${trial}`;
}

export function runTrial(s: Scenario, p: BotParams, seed: string): TrialResult {
  const rng = Rng.fromString(seed);
  const e = drawErrors(rng, p);
  const target = s.world.ants[s.target] as Ant;
  const bis = bisectPower({
    world: s.world,
    shooter: 0,
    weapon: 'seed',
    angleDeci: s.angleDeci,
    tx: target.x,
    ty: target.y,
    wind: perceivedWind(s.world.wind, e),
  });
  const c: Candidate = {
    weapon: 'seed',
    target: s.target,
    facing: 1,
    angleDeci: s.angleDeci,
    powerMille: bis.powerMille,
    score: 0,
    selfDamage: 0,
  };
  const fv = fireValues(c, e, p, freshMemory());
  const sim = simulateShot({
    world: s.world,
    shooter: 0,
    weapon: 'seed',
    angleDeci: fv.angleDeci,
    powerMille: fv.powerMille,
  });
  return {
    hit: isLethalHit(sim, s.target, target),
    impact: sim.impact,
    angleDeci: fv.angleDeci,
    powerMille: fv.powerMille,
    sims: bis.sims + 1,
  };
}

export interface LevelRun {
  hits: number;
  trials: number;
  rate: number;
  /** Hits and trials per distance (index into DISTANCES). */
  byDistance: { hits: number; trials: number }[];
  /** The first 100 impacts, in trial order (determinism assert). */
  firstImpacts: ({ x: number; y: number } | null)[];
  sims: number;
}

/** Runs `trials` per scenario for one parameter set, trial-major order. */
export function runLevel(
  scenarios: readonly Scenario[],
  p: BotParams,
  levelKey: string,
  trials: number,
): LevelRun {
  const byDistance = DISTANCES.map(() => ({ hits: 0, trials: 0 }));
  const firstImpacts: LevelRun['firstImpacts'] = [];
  let hits = 0;
  let n = 0;
  let sims = 0;
  for (let t = 0; t < trials; t++) {
    for (const s of scenarios) {
      const r = runTrial(s, p, trialSeed(levelKey, s.index, t));
      const bucket = byDistance[DISTANCES.indexOf(s.distance as (typeof DISTANCES)[number])];
      if (bucket) {
        bucket.trials++;
        if (r.hit) bucket.hits++;
      }
      if (r.hit) hits++;
      n++;
      sims += r.sims;
      if (firstImpacts.length < 100) firstImpacts.push(r.impact);
    }
  }
  return { hits, trials: n, rate: hits / n, byDistance, firstImpacts, sims };
}
