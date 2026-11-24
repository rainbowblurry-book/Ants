/**
 * Shot solver and bot turn (DR-060, DR-066, J9, J22; DR-009 bot notes).
 * Headless: the real sim, flat test grids and the M1 stand-in arena.
 * performance.now is used here only, to report the budget (never in src/ai).
 */
import { describe, expect, it } from 'vitest';
import { BOT_SIMS_PER_FRAME, BotDriver, botScript, startBotTurn } from '../src/ai/bot.ts';
import { botParams } from '../src/ai/botParams.ts';
import { isLethalHit } from '../src/ai/error.ts';
import { simulateShot } from '../src/ai/shotSim.ts';
import {
  MANY_WEAPONS,
  rankCandidates,
  SIMS_PER_PAIR,
  SIMS_PER_PAIR_MANY,
  SIMS_PER_TURN,
  scoreShot,
  simulateOnScratch,
  simulateWalk,
  solve,
  startSolver,
  TARGETS,
} from '../src/ai/solver.ts';
import { type Candidate, freshMemory } from '../src/ai/types.ts';
import { versusMatch } from '../src/game/twoPlayer.ts';
import type { TwoPlayerSetup } from '../src/save/schema.ts';
import { defaultAmmo, Match, type MatchConfig } from '../src/sim/match.ts';
import { type Ant, createAnt } from '../src/sim/movement.ts';
import type { Ammo } from '../src/sim/pickups.ts';
import { Rng } from '../src/sim/rng.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';
import type { WeaponId, World } from '../src/sim/weapons/index.ts';
import { CALM } from '../src/sim/wind.ts';

const GROUND = 400;

function flatGrid(): TerrainGrid {
  const g = new TerrainGrid(960, 540, 'void');
  g.fillRect(0, GROUND, 960, 540 - GROUND, Material.SOIL);
  return g;
}

function worldOf(grid: TerrainGrid, ants: Ant[]): World {
  return {
    grid,
    ants,
    wind: CALM,
    tick: 0,
    spread: Rng.fromString('solver:spread'),
    pickups: [],
    friendlyFire: true,
  };
}

const SETUP = {
  names: ['A', 'B'],
  ants: 2,
  arena: 0,
  timer: 30,
  starter: false,
  pickups: false,
  passPhone: false,
  hitOwnTeam: true,
} as unknown as TwoPlayerSetup;

function arenaMatch(seed: number | string = 1): Match {
  return new Match(versusMatch(SETUP, seed));
}

const ONLY = (w: WeaponId): Ammo => {
  const a: Ammo = { seed: 0, dewdrop: 0, pollen: 0, grub: 0, roller: 0, plop: 0 };
  a[w] = Number.POSITIVE_INFINITY;
  return a;
};

/** The wall arena: a 30 px ROCK wall 200 px tall just in front of the bot. */
function wallGrid(): TerrainGrid {
  const g = flatGrid();
  g.fillRect(235, GROUND - 200, 30, 200, Material.ROCK);
  return g;
}

describe('solver: finding shots (DR-060)', () => {
  it('finds a DR-062 hit with the Seed on flat ground at several distances (zero error)', () => {
    for (const d of [150, 300, 450, 600, 750]) {
      const ants = [createAnt(0, 0, 100, GROUND, -1), createAnt(1, 1, 100 + d, GROUND, -1)];
      const world = worldOf(flatGrid(), ants);
      const r = solve({ world, shooter: 0, ammo: ONLY('seed'), wind: CALM });
      const best = r.ranked[0] as Candidate;
      expect(best.weapon).toBe('seed');
      expect(best.target).toBe(1);
      expect(best.facing).toBe(1); // turned toward the target
      expect(r.move).toBeNull();
      const shooter = { ...(ants[0] as Ant), facing: best.facing };
      const sim = simulateShot({
        world: { ...world, ants: [shooter, ants[1] as Ant] },
        shooter: 0,
        weapon: 'seed',
        angleDeci: best.angleDeci,
        powerMille: best.powerMille,
      });
      expect(isLethalHit(sim, 1, ants[1] as Ant), `d=${d}`).toBe(true);
      expect(sim.damage[1]).toBeGreaterThanOrEqual(19);
      expect(best.score).toBeCloseTo(sim.damage[1] as number, 6);
    }
  });

  it('shoots toward a target on the left too', () => {
    const ants = [createAnt(0, 0, 700, GROUND, 1), createAnt(1, 1, 350, GROUND, 1)];
    const r = solve({
      world: worldOf(flatGrid(), ants),
      shooter: 0,
      ammo: ONLY('seed'),
      wind: CALM,
    });
    expect(r.ranked[0]?.facing).toBe(-1);
    expect(r.ranked[0]?.score).toBeGreaterThanOrEqual(19);
  });

  it('never picks the Plop, even with Plop ammo and nothing else', () => {
    const m = arenaMatch();
    const r = solve({ world: m.world, shooter: 0, ammo: defaultAmmo(), wind: CALM });
    expect(r.simsByWeapon.plop).toBe(0);
    expect(r.ranked.every((c) => c.weapon !== 'plop')).toBe(true);
    const plopOnly = solve({ world: m.world, shooter: 0, ammo: ONLY('plop'), wind: CALM });
    expect(plopOnly.ranked).toEqual([]);
    expect(plopOnly.sims).toBe(0);
  });

  it('prefers 40°–65° within 2 points of the best (J22)', () => {
    const c = (angleDeci: number, score: number): Candidate => ({
      weapon: 'seed',
      target: 1,
      facing: 1,
      angleDeci,
      powerMille: 600,
      score,
      selfDamage: 0,
    });
    expect(rankCandidates([c(300, 36), c(500, 34.5)])[0]?.angleDeci).toBe(500);
    expect(rankCandidates([c(300, 36), c(500, 33.9)])[0]?.angleDeci).toBe(300);
    expect(rankCandidates([c(700, 36), c(650, 36), c(400, 35)])[0]?.angleDeci).toBe(650);
    // On flat ground many angles hit directly: the pick is in the band.
    for (const d of [250, 400, 550]) {
      const ants = [createAnt(0, 0, 100, GROUND, 1), createAnt(1, 1, 100 + d, GROUND, -1)];
      const r = solve({
        world: worldOf(flatGrid(), ants),
        shooter: 0,
        ammo: ONLY('seed'),
        wind: CALM,
      });
      const best = r.ranked[0] as Candidate;
      expect(best.angleDeci).toBeGreaterThanOrEqual(400);
      expect(best.angleDeci).toBeLessThanOrEqual(650);
    }
  });

  it('scores enemy damage, KOs, the HP tie-break, self and ally damage (DR-060)', () => {
    const ants = [
      createAnt(0, 0, 100, GROUND, 1),
      createAnt(1, 0, 300, GROUND, 1),
      createAnt(2, 1, 500, GROUND, -1),
    ];
    (ants[2] as Ant).hp = 50;
    const res = { damage: [4, 10, 50], kos: [2] } as unknown as Parameters<typeof scoreShot>[0];
    const s = scoreShot(res, ants, 0, 2);
    expect(s.score).toBeCloseTo(50 + 20 + 0.2 * 0.5 - 1.5 * 4 - 10, 9);
  });

  it('the scratch-grid sim equals simulateShot for Pollen and Grub, and restores the grid', () => {
    const m = arenaMatch();
    const scratch = m.world.grid.clone();
    const before = m.world.grid.hash();
    for (const weapon of ['pollen', 'grub'] as const) {
      for (const [angleDeci, powerMille] of [
        [450, 600],
        [300, 800],
        [650, 700],
        [200, 400],
      ] as const) {
        const input = { world: m.world, shooter: 0, weapon, angleDeci, powerMille };
        const a = simulateOnScratch(input, scratch);
        const b = simulateShot(input);
        expect(a.blasts).toEqual(b.blasts);
        expect(a.damage).toEqual(b.damage);
        expect(a.kos).toEqual(b.kos);
        expect(a.ticks).toBe(b.ticks);
        expect(scratch.hash()).toBe(before);
      }
    }
    expect(m.world.grid.hash()).toBe(before);
  });
});

describe('solver: budget (DR-060, DR-009)', () => {
  it('respects the per-pair and per-turn sim caps', () => {
    const m = arenaMatch();
    for (const shooter of [0, 1, 2, 3]) {
      const team = (m.world.ants[shooter] as Ant).team;
      const ammo = m.ammo[team] as Ammo;
      const r = solve({ world: m.world, shooter, ammo, wind: m.world.wind });
      expect(r.sims).toBeLessThanOrEqual(SIMS_PER_TURN);
      // 5 weapons (Plop excluded): ≤ 120 per (weapon, target).
      for (const w of ['seed', 'dewdrop', 'pollen', 'grub', 'roller'] as const) {
        expect(r.simsByWeapon[w]).toBeGreaterThan(0);
        expect(r.simsByWeapon[w]).toBeLessThanOrEqual(SIMS_PER_PAIR_MANY * TARGETS + 10);
      }
      const total = Object.values(r.simsByWeapon).reduce((a, b) => a + b, 0);
      expect(total).toBe(r.sims);
    }
    const few = solve({
      world: m.world,
      shooter: 0,
      ammo: { ...defaultAmmo(), grub: 0, roller: 0 },
      wind: m.world.wind,
    });
    expect(MANY_WEAPONS).toBe(5);
    for (const w of ['seed', 'dewdrop', 'pollen'] as const) {
      expect(few.simsByWeapon[w]).toBeLessThanOrEqual(SIMS_PER_PAIR * TARGETS);
    }
    const capped = solve({
      world: m.world,
      shooter: 0,
      ammo: defaultAmmo(),
      wind: CALM,
      maxSims: 150,
    });
    expect(capped.sims).toBeLessThanOrEqual(150);
    expect(capped.sims).toBeGreaterThan(50);
    expect(capped.ranked.length).toBeGreaterThan(0);
  });

  it('a step never runs more sims than asked, and the slicing does not change the result', () => {
    const m = arenaMatch();
    const input = { world: m.world, shooter: 0, ammo: m.ammo[0] as Ammo, wind: m.world.wind };
    const job = startSolver(input);
    let last = 0;
    while (!job.done) {
      job.step(7);
      expect(job.sims - last).toBeLessThanOrEqual(7);
      last = job.sims;
    }
    expect(job.result).toEqual(solve(input));
  });

  it(`a bot turn finishes in ≤ 25 steps at ${BOT_SIMS_PER_FRAME} sims a step (stand-in arena, 5 weapons)`, () => {
    const lines: string[] = [];
    for (const seed of [1, 2, 3]) {
      const m = arenaMatch(seed);
      for (const ant of [0, 1, 2, 3]) {
        const t0 = performance.now();
        const job = startBotTurn({ match: m, ant, params: botParams(100), memory: freshMemory() });
        let steps = 0;
        while (!job.done) {
          job.step(BOT_SIMS_PER_FRAME);
          steps++;
        }
        const ms = performance.now() - t0;
        expect(steps).toBeLessThanOrEqual(25);
        expect(job.simsUsed).toBeLessThanOrEqual(SIMS_PER_TURN);
        lines.push(
          `seed ${seed} ant ${ant}: ${job.simsUsed} sims, ${steps} steps, ${ms.toFixed(1)} ms`,
        );
      }
    }
    console.log(`DR-060 budget (desktop node):\n${lines.join('\n')}`);
  });
});

describe('solver: move first (DR-060)', () => {
  it('walks out from behind a wall when no shot scores 12, and the walk is simulated exactly', () => {
    const ants = [createAnt(0, 0, 200, GROUND, 1), createAnt(1, 1, 500, GROUND, -1)];
    const world = worldOf(wallGrid(), ants);
    const r = solve({ world, shooter: 0, ammo: ONLY('seed'), wind: CALM });
    expect(r.standScore).toBeLessThan(12);
    expect(r.move).not.toBeNull();
    const mv = r.move as NonNullable<typeof r.move>;
    expect(mv.dir).toBe(-1);
    expect(mv.px).toBeLessThanOrEqual(120);
    expect(r.ranked[0]?.score).toBeGreaterThan(r.standScore);
    // The ant itself is untouched.
    expect(ants[0]?.x).toBe(200);

    // Play the plan in a real match: the ant must end exactly where the solver walked it.
    const cfg: MatchConfig = {
      seed: 'wall',
      levelId: 'wall',
      terrain: wallGrid(),
      wind: CALM,
      ants: [createAnt(0, 0, 200, GROUND, 1), createAnt(1, 1, 500, GROUND, -1)],
      ammo: [ONLY('seed'), ONLY('seed')],
    };
    const match = new Match(cfg);
    while (match.phase !== 'aim') match.step();
    const job = startBotTurn({ match, ant: 0, params: botParams(100), memory: freshMemory() });
    job.step(SIMS_PER_TURN);
    const plan = job.plan;
    expect(plan?.move).toEqual(mv);
    const driver = new BotDriver(plan as NonNullable<typeof plan>);
    let firedAt = -1;
    while (match.phase === 'aim' && match.tick < 2000) {
      driver.beforeStep(match);
      match.step();
      if ((match.phase as string) === 'fire') firedAt = match.tick;
    }
    expect(firedAt).toBeGreaterThan(0);
    const me = match.world.ants[0] as Ant;
    expect(me.x).toBe(mv.x);
    expect(me.y).toBe(mv.y);
    expect(me.facing).toBe(plan?.facing);
    expect(match.events.some((e) => e.kind === 'reject')).toBe(false);
  });

  it('simulateWalk stops at a wall and returns null when it goes nowhere', () => {
    const ant = createAnt(0, 0, 200, GROUND, 1);
    const stopped = simulateWalk(wallGrid(), ant, 1, 40);
    expect(stopped?.move.px).toBeLessThan(40);
    expect(stopped?.move.x).toBeLessThan(235 - 16);
    const pinned = { ...(stopped?.ant as Ant), budget: 160 };
    expect(simulateWalk(wallGrid(), pinned, 1, 40)).toBeNull();
    const w = simulateWalk(flatGrid(), ant, 1, 40);
    expect(w?.move.x).toBeCloseTo(240, 6);
    expect(w?.move.ticks).toBe(30);
    expect(ant.x).toBe(200);
  });
});

describe('bot turn (DR-061, DR-066)', () => {
  it('is deterministic: the same match gives the same plan, whatever the slicing', () => {
    const a = arenaMatch(7);
    const b = arenaMatch(7);
    const ja = startBotTurn({ match: a, ant: 1, params: botParams(40), memory: freshMemory() });
    const jb = startBotTurn({ match: b, ant: 1, params: botParams(40), memory: freshMemory() });
    while (!ja.done) ja.step(1);
    jb.step(SIMS_PER_TURN);
    expect(ja.plan).toEqual(jb.plan);
    expect(a.streams.ai.getState()).toEqual(b.streams.ai.getState());
  });

  it('plans DR-066 timing: think ticks, wobble 3·σ_a capped at 12°, settle 36..72', () => {
    const m = arenaMatch();
    for (const level of [1, 30, 70, 100]) {
      const p = botParams(level);
      const job = startBotTurn({ match: m, ant: 0, params: p, memory: freshMemory() });
      job.step(SIMS_PER_TURN);
      const plan = job.plan as NonNullable<typeof job.plan>;
      expect(plan.thinkTicks).toBe(Math.round(p.thinkS * 60));
      expect(plan.wobbleDeci).toBe(Math.min(120, Math.round(30 * p.sigmaA)));
      expect(plan.settleTicks).toBeGreaterThanOrEqual(36);
      expect(plan.settleTicks).toBeLessThanOrEqual(72);
      if (level >= 90) expect(plan.overshoot).toBe(0);
      else expect(plan.overshoot).toBeGreaterThan(0);
      expect(Number.isInteger(plan.angleDeci) && Number.isInteger(plan.powerMille)).toBe(true);
      const script = botScript(plan);
      expect(script.map((s) => s.cmd.kind)).toEqual(['face', 'fire']);
      expect(script[1]?.at).toBe(plan.thinkTicks + plan.settleTicks);
    }
  });

  it('never shoots its own team on purpose', () => {
    // Stand-in arena with friendly fire on: every candidate aims at an enemy,
    // and the best shot does more to the enemy than to the shooter's side.
    const m = arenaMatch(3);
    for (const shooter of [0, 1, 2, 3]) {
      const me = m.world.ants[shooter] as Ant;
      const r = solve({ world: m.world, shooter, ammo: m.ammo[me.team] as Ammo, wind: CALM });
      for (const c of r.ranked) expect((m.world.ants[c.target] as Ant).team).not.toBe(me.team);
      expect(r.ranked[0]?.score).toBeGreaterThan(0);
    }
    // An ally hugging the enemy: the bot still picks a shot that spares the ally.
    const ants = [
      createAnt(0, 0, 150, GROUND, 1),
      createAnt(1, 0, 470, GROUND, 1),
      createAnt(2, 1, 520, GROUND, -1),
    ];
    const world = worldOf(flatGrid(), ants);
    const r = solve({ world, shooter: 0, ammo: ONLY('seed'), wind: CALM, allowMove: false });
    const best = r.ranked[0] as Candidate;
    expect(best.target).toBe(2);
    const sim = simulateShot({
      world,
      shooter: 0,
      weapon: best.weapon,
      angleDeci: best.angleDeci,
      powerMille: best.powerMille,
    });
    expect(sim.damage[2]).toBeGreaterThan((sim.damage[1] as number) + (sim.damage[0] as number));
    // With the enemy out of reach behind ROCK, it does not settle for hitting the ally.
    const g = flatGrid();
    g.fillRect(500, 0, 460, GROUND, Material.ROCK);
    g.fillRect(560, GROUND - 60, 400, 60, Material.EMPTY);
    const hidden = [
      createAnt(0, 0, 150, GROUND, 1),
      createAnt(1, 0, 420, GROUND, 1),
      createAnt(2, 1, 700, GROUND, -1),
    ];
    const r2 = solve({ world: worldOf(g, hidden), shooter: 0, ammo: ONLY('seed'), wind: CALM });
    const b2 = r2.ranked[0] as Candidate;
    const s2 = simulateShot({
      world: worldOf(g, hidden),
      shooter: 0,
      weapon: 'seed',
      angleDeci: b2.angleDeci,
      powerMille: b2.powerMille,
    });
    expect(s2.damage[1]).toBe(0);
  });
});
