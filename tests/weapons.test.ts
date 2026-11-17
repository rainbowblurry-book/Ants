import { describe, expect, it } from 'vitest';
import { defaultAmmo, Match } from '../src/sim/match.ts';
import { type Ant, createAnt } from '../src/sim/movement.ts';
import {
  launchVelocity,
  type Projectile,
  RING_R_SMALL,
  stepProjectile,
} from '../src/sim/physics.ts';
import { applyPickup, collectPickups, popPickups } from '../src/sim/pickups.ts';
import { Rng } from '../src/sim/rng.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';
import {
  type Body,
  DEWDROP,
  fire,
  GRUB,
  PLOP,
  ROLLER,
  type RollerBody,
  SEED,
  type Shot,
  stepShot,
  WEAPONS,
  type World,
} from '../src/sim/weapons/index.ts';
import { CALM, LevelWind, type WindField } from '../src/sim/wind.ts';

const M = Material;

function world(grid: TerrainGrid, ants: Ant[] = [], wind: WindField = CALM, seed = 'w'): World {
  return { grid, ants, wind, tick: 0, spread: Rng.fromString(`${seed}:spread`), pickups: [] };
}

function run(w: World, shot: Shot, maxTicks = 2000): number {
  let t = 0;
  while (shot.bodies.length > 0 && t < maxTicks) {
    w.tick++;
    stepShot(w, shot);
    t++;
  }
  return t;
}

/** A shot made of one hand-placed body (no shooter). */
function shotOf(weapon: Shot['weapon'], body: Body, ants = 0): Shot {
  return { weapon, shooter: -1, bodies: [body], dealt: new Array(ants).fill(0), events: [] };
}

function blasts(shot: Shot) {
  return shot.events.filter((e) => e.kind === 'blast');
}

/** Closed-form-style range check: full power, 45°, over open air, back through launch height. */
function range(wMul: number): number {
  const g = new TerrainGrid(4000, 10);
  const v = launchVelocity(450, 1000, wMul, 1);
  const p: Projectile = { x: 0, y: 0, vx: v.x, vy: v.y, ringR: RING_R_SMALL };
  for (let t = 1; t < 2000; t++) {
    const px = p.x;
    const py = p.y;
    stepProjectile(p, g, 0, 0);
    if (t > 1 && p.y >= 0) return px + ((p.x - px) * py) / (py - p.y);
  }
  throw new Error('never landed');
}

describe('weapon table (PLAN §5, DR-009, DR-034)', () => {
  it('has the six weapons with the planned numbers', () => {
    const row = (id: keyof typeof WEAPONS) => {
      const w = WEAPONS[id];
      return [w.damage, w.blastR, w.windFactor, w.wMul, w.ammo2p, w.unlockLevel];
    };
    expect(row('seed')).toEqual([30, 28, 0.6, 1.15, Number.POSITIVE_INFINITY, 0]);
    expect(row('dewdrop')).toEqual([45, 48, 0.3, 0.95, 3, 0]);
    expect(row('pollen')).toEqual([12, 18, 0.8, 1.0, 1, 0]);
    expect(row('grub')).toEqual([40, 30, 0.15, 1.0, 1, 14]);
    expect(row('roller')).toEqual([38, 40, 0.5, 0.85, 2, 24]);
    expect(row('plop')).toEqual([6, 34, 0.4, 0.9, 2, 34]);
    expect(DEWDROP.ringR).toBe(8);
    expect(SEED.ringR).toBe(4);
  });
});

describe('DR-009 sanity numbers', () => {
  it('full-power 45° ranges: Grub 864, Roller 624, Plop 700 px (and Seed 1143, Dewdrop 780)', () => {
    // Semi-implicit Euler lands about one tick short of v²/g (see PROGRESS stage 1).
    const cases: [number, number][] = [
      [GRUB.wMul, 864],
      [ROLLER.wMul, 624],
      [PLOP.wMul, 700],
      [SEED.wMul, 1143],
      [DEWDROP.wMul, 780],
    ];
    for (const [wMul, want] of cases)
      expect(Math.abs(range(wMul) - want) / want).toBeLessThan(0.012);
  });

  it('Grub digs a 150 px tunnel: 60 ticks at 150 px/s', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(300, 100, 600, 300, M.SOIL);
    const w = world(g);
    const shot = shotOf('grub', {
      kind: 'grub',
      p: { x: 290, y: 250, vx: 600, vy: 0, ringR: GRUB.ringR },
      ignore: -1,
      age: 0,
      digging: false,
      hx: 0,
      hy: 0,
      digTicks: 0,
    });
    // Gravity bends the approach a little; it touches the face near x 296.
    run(w, shot);
    const b = blasts(shot)[0];
    expect(b?.blast.base).toBe(40);
    const entry = 300 - GRUB.ringR;
    expect(Math.abs((b?.blast.x ?? 0) - entry - 150)).toBeLessThan(4);
    // The tunnel is open air all along its length.
    for (let x = 310; x < 440; x += 10) expect(g.solidAt(x, b?.blast.y ?? 0)).toBe(false);
  });

  it('Grub pops when it breaks out of a thin wall, and at once on ROCK', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(300, 100, 40, 300, M.SOIL);
    const w = world(g);
    const mk = (): Body => ({
      kind: 'grub',
      p: { x: 290, y: 250, vx: 600, vy: 0, ringR: GRUB.ringR },
      ignore: -1,
      age: 0,
      digging: false,
      hx: 0,
      hy: 0,
      digTicks: 0,
    });
    const s1 = shotOf('grub', mk());
    run(w, s1);
    const x1 = blasts(s1)[0]?.blast.x ?? 0;
    // The r 11 dig circle opens the far face (x 340) first; the next tick digs nothing.
    expect(x1).toBeGreaterThan(320);
    expect(x1).toBeLessThan(350);
    expect(g.solidAt(345, blasts(s1)[0]?.blast.y ?? 0)).toBe(false);
    const r = new TerrainGrid(960, 540);
    r.fillRect(300, 100, 100, 300, M.ROCK);
    const s2 = shotOf('grub', mk());
    run(world(r), s2);
    expect(blasts(s2)[0]?.blast.x).toBeLessThan(300);
  });

  const rollBody = (u: number, x = 100): RollerBody => ({
    kind: 'roller',
    p: { x, y: 400 - ROLLER.ringR, vx: 0, vy: 0, ringR: ROLLER.ringR },
    ignore: -1,
    age: 0,
    mode: 'roll',
    u,
    fuse: 150,
    wallBounced: false,
    dir: 1,
  });

  it('Roller on SOIL: 158 px/s rolls about 130 px, then pops at the 150-tick fuse', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    const shot = shotOf('roller', rollBody(158));
    const ticks = run(world(g), shot);
    expect(ticks).toBe(151);
    const b = blasts(shot)[0];
    expect(Math.abs((b?.blast.x ?? 0) - 100 - 130)).toBeLessThan(4);
  });

  it('Roller on SLICK slides much further before the fuse', () => {
    const g = new TerrainGrid(2000, 540);
    g.fillRect(0, 400, 2000, 140, M.SLICK);
    const shot = shotOf('roller', rollBody(158));
    run(world(g), shot);
    // 158·2.5 − ½·6·2.5² ≈ 376 px in 150 ticks (DR-009's 490 assumes 200 px/s; see PROGRESS).
    const dist = (blasts(shot)[0]?.blast.x ?? 0) - 100;
    expect(Math.abs(dist - 376)).toBeLessThan(6);
  });

  it('Roller runs away down a 20° slope (0.5·g·sin20° beats SOIL friction)', () => {
    const g = new TerrainGrid(960, 540);
    // y = 200 + 0.364·x (tan 20°), solid below.
    for (let x = 0; x < 960; x++) g.fillRect(x, Math.floor(200 + 0.36397 * x), 1, 540, M.SOIL);
    const shot = shotOf('roller', {
      ...rollBody(20, 100),
      p: { x: 100, y: Math.floor(200 + 36.397) - ROLLER.ringR, vx: 0, vy: 0, ringR: 4 },
    });
    const w = world(g);
    for (let i = 0; i < 60; i++) {
      w.tick++;
      stepShot(w, shot);
    }
    const b = shot.bodies[0] as RollerBody;
    // 0.5·600·sin20° = 102.6 > 96 (SOIL friction), so it speeds up (DR-009).
    expect(b.u).toBeGreaterThan(20);
  });

  it('Roller bounces once off a wall taller than 8 px at half speed, then stops at a second', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    g.fillRect(160, 380, 20, 20, M.ROCK); // 20 px wall
    const body = rollBody(190);
    const shot = shotOf('roller', body);
    const w = world(g);
    let reversed = 0;
    for (let i = 0; i < 40 && shot.bodies.length; i++) {
      w.tick++;
      const before = body.u;
      stepShot(w, shot);
      if (before > 0 && body.u < 0) {
        reversed++;
        // Half speed, less one tick of friction (120·0.8/60 = 1.6 px/s).
        expect(Math.abs(body.u + before / 2)).toBeLessThanOrEqual(1.6 + 1e-9);
      }
    }
    expect(reversed).toBe(1);
    expect(body.wallBounced).toBe(true);
    // An 8 px step is climbed, not bounced.
    const g2 = new TerrainGrid(960, 540);
    g2.fillRect(0, 400, 960, 140, M.SOIL);
    g2.fillRect(160, 392, 400, 8, M.SOIL);
    const b2 = rollBody(190);
    const s2 = shotOf('roller', b2);
    run(world(g2), s2, 60);
    expect(b2.wallBounced).toBe(false);
    expect(b2.p.x).toBeGreaterThan(170);
  });

  it('Roller pops on touching an ant (direct, 46)', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    const ant = createAnt(0, 1, 200, 400, -1);
    const shot = shotOf('roller', rollBody(150), 1);
    run(world(g, [ant]), shot);
    const b = blasts(shot)[0];
    expect(b?.blast.direct).toBe(0);
    expect(b?.hits[0]?.dmg).toBe(46);
  });

  it('Mound Plop fills EMPTY and WATER with SOIL, keeps 18 px clear of ants, makes no crater', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    g.fillRect(400, 380, 200, 20, M.WATER); // a puddle on top of the ground
    const ant = createAnt(0, 1, 430, 380, -1); // standing at the puddle's edge
    const solidBefore = g.cells.reduce((n, m) => n + (m >= 1 && m <= 6 ? 1 : 0), 0);
    const shot = shotOf(
      'plop',
      {
        kind: 'plop',
        p: { x: 380, y: 300, vx: 0, vy: 300, ringR: PLOP.ringR },
        ignore: -1,
        age: 0,
      },
      1,
    );
    run(world(g, [ant]), shot);
    const b = blasts(shot)[0];
    expect(b?.blast.fill).toBe(true);
    expect(g.materialAt(402, 398)).toBe(M.SOIL); // was WATER
    let filled = 0;
    let keptOut = 0;
    for (let y = 0; y < 400; y++) {
      for (let x = 0; x < 960; x++) {
        const qx = Math.max(418, Math.min(442, x + 0.5));
        const d = Math.hypot(x + 0.5 - qx, y + 0.5 - 358) - 16;
        const inFill = Math.hypot(x + 0.5 - (b?.blast.x ?? 0), y + 0.5 - (b?.blast.y ?? 0)) <= 34;
        if (g.solidAt(x + 0.5, y + 0.5)) {
          filled++;
          expect(d).toBeGreaterThanOrEqual(18);
        } else if (inFill && d < 18) keptOut++;
      }
    }
    expect(filled).toBeGreaterThan(500);
    expect(keptOut).toBeGreaterThan(0); // the keep-out actually bit
    const solidAfter = g.cells.reduce((n, m) => n + (m >= 1 && m <= 6 ? 1 : 0), 0);
    expect(solidAfter).toBe(solidBefore + filled); // nothing erased
    expect(b?.blast.base).toBe(6);
  });
});

describe('Seed, Dewdrop and Pollen behaviour (DR-034)', () => {
  const flat = () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    return g;
  };

  it('Seed explodes on first contact with a 28 px crater', () => {
    const g = flat();
    const shot = shotOf('seed', {
      kind: 'seed',
      p: { x: 480, y: 300, vx: 0, vy: 200, ringR: 4 },
      ignore: -1,
      age: 0,
    });
    run(world(g), shot);
    expect(blasts(shot)).toHaveLength(1);
    expect(g.solidAt(480, 410)).toBe(false);
    expect(g.solidAt(480, 440)).toBe(true);
  });

  it('Dewdrop bounces at most 3 times and pops at the 180-tick fuse', () => {
    const g = flat();
    const shot = shotOf('dewdrop', {
      kind: 'dewdrop',
      p: { x: 200, y: 300, vx: 150, vy: 400, ringR: 8 },
      ignore: -1,
      age: 0,
      bounces: 0,
      resting: false,
    });
    const ticks = run(world(g), shot);
    expect(ticks).toBe(180);
    expect(shot.events.filter((e) => e.kind === 'bounce').length).toBeLessThanOrEqual(3);
    expect(blasts(shot)[0]?.blast.base).toBe(45);
  });

  it('Dewdrop pops at once on an ant', () => {
    const g = flat();
    const ant = createAnt(0, 1, 300, 400, -1);
    const shot = shotOf(
      'dewdrop',
      {
        kind: 'dewdrop',
        p: { x: 200, y: 370, vx: 400, vy: 0, ringR: 8 },
        ignore: -1,
        age: 0,
        bounces: 0,
        resting: false,
      },
      1,
    );
    const ticks = run(world(g, [ant]), shot);
    expect(ticks).toBeLessThan(30);
    expect(blasts(shot)[0]?.hits[0]?.dmg).toBe(54);
  });

  it('Pollen bursts at the apex into 5 seeded puffs; same seed, same puffs', () => {
    const go = (seed: string) => {
      const g = flat();
      const shot = shotOf('pollen', {
        kind: 'pollen',
        p: { x: 100, y: 380, vx: 300, vy: -400, ringR: 4 },
        ignore: -1,
        age: 0,
      });
      const w = world(g, [], CALM, seed);
      run(w, shot);
      return shot.events;
    };
    const a = go('s1');
    expect(a.filter((e) => e.kind === 'burst')).toHaveLength(1);
    expect(a.filter((e) => e.kind === 'blast')).toHaveLength(5);
    expect(go('s1')).toEqual(a);
    expect(go('s2')).not.toEqual(a);
    const xs = a.filter((e) => e.kind === 'blast').map((e) => (e.kind === 'blast' ? e.blast.x : 0));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40);
  });

  it('Pollen with a low apex bursts on impact instead', () => {
    const g = flat();
    const shot = shotOf('pollen', {
      kind: 'pollen',
      p: { x: 100, y: 390, vx: 300, vy: -60, ringR: 4 },
      ignore: -1,
      age: 0,
    });
    run(world(g), shot);
    const burst = shot.events.find((e) => e.kind === 'burst');
    expect(burst && burst.kind === 'burst' ? burst.y : 0).toBeGreaterThan(390);
  });

  it('water fizzles every projectile except Dewdrop, which skips', () => {
    const g = new TerrainGrid(960, 540, 'water');
    g.fillRect(0, 400, 960, 140, M.WATER);
    const seed = shotOf('seed', {
      kind: 'seed',
      p: { x: 100, y: 300, vx: 100, vy: 200, ringR: 4 },
      ignore: -1,
      age: 0,
    });
    run(world(g), seed);
    expect(seed.events[0]?.kind).toBe('fizzle');
    // PLAN §4: Mound Plop fizzles on water too (see PROGRESS stage 2, open question).
    const plop = shotOf('plop', {
      kind: 'plop',
      p: { x: 100, y: 300, vx: 0, vy: 200, ringR: 4 },
      ignore: -1,
      age: 0,
    });
    run(world(g), plop);
    expect(plop.events[0]?.kind).toBe('fizzle');
    const dew = shotOf('dewdrop', {
      kind: 'dewdrop',
      p: { x: 100, y: 300, vx: 100, vy: 300, ringR: 8 },
      ignore: -1,
      age: 0,
      bounces: 0,
      resting: false,
    });
    run(world(g), dew);
    expect(dew.events.some((e) => e.kind === 'bounce')).toBe(true);
    expect(dew.events.at(-1)?.kind).toBe('blast');
  });

  it('a shot fired from an ant does not hit its own shooter', () => {
    const g = flat();
    const ant = createAnt(0, 0, 200, 400, 1);
    const w = world(g, [ant]);
    const shot = fire(w, 0, 'seed', 450, 600);
    run(w, shot);
    expect(blasts(shot)[0]?.blast.direct).toBe(-1);
    expect(blasts(shot)[0]?.blast.x).toBeGreaterThan(300);
  });
});

describe('pickups (DR-048, J11)', () => {
  it('Honey heals 25 up to 100; Seed Bundle adds 2 Dewdrop and 1 Pollen', () => {
    const ant = createAnt(0, 0, 100, 400, 1);
    const ammo = defaultAmmo();
    ant.hp = 60;
    applyPickup('honey', ant, ammo);
    expect(ant.hp).toBe(85);
    applyPickup('honey', ant, ammo);
    expect(ant.hp).toBe(100);
    applyPickup('seeds', ant, ammo);
    expect([ammo.dewdrop, ammo.pollen]).toEqual([5, 2]);
  });

  it('is collected by an ant on the ground touching it, and popped by a blast', () => {
    const ant = createAnt(0, 0, 100, 400, 1);
    const ammo = defaultAmmo();
    const list = [
      { kind: 'honey' as const, x: 110, y: 390 },
      { kind: 'seeds' as const, x: 300, y: 390 },
    ];
    expect(collectPickups(ant, list, ammo)).toEqual(['honey']);
    expect(list).toHaveLength(1);
    expect(popPickups(list, 310, 395, 28)).toBe(1);
    expect(list).toHaveLength(0);
  });
});

describe('physics replays are stable', () => {
  const play = (weapon: keyof typeof WEAPONS) => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    g.fillRect(450, 300, 60, 100, M.HARD);
    g.fillRect(600, 380, 80, 20, M.BOUNCY);
    const m = new Match({
      seed: 77,
      levelId: 'T01',
      terrain: g,
      wind: new LevelWind({ maxAbs: 3, maxStep: 2, everyNTurns: 1 }),
      ants: [
        createAnt(0, 0, 150, 400, 1),
        createAnt(1, 1, 700, 380, -1),
        createAnt(2, 1, 820, 400, -1),
      ],
      ammo: [
        { seed: 9, dewdrop: 9, pollen: 9, grub: 9, roller: 9, plop: 9 },
        { seed: 9, dewdrop: 9, pollen: 9, grub: 9, roller: 9, plop: 9 },
      ],
    });
    m.push({ kind: 'walk', ant: 0, dir: 1 });
    for (let i = 0; i < 30; i++) m.step();
    m.push({ kind: 'walk', ant: 0, dir: 0 });
    m.push({ kind: 'fire', ant: 0, weapon, angleDeci: 520, powerMille: 760 });
    for (let i = 0; i < 600; i++) m.step();
    m.push({ kind: 'hop', ant: 1 });
    for (let i = 0; i < 120; i++) m.step();
    return {
      hash: m.stateHash(),
      events: m.shots.map((s) => s.events),
      hp: m.ants.map((a) => a.hp),
    };
  };

  for (const w of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) {
    it(`${w}: the same inputs give the same state hash and events`, () => {
      const a = play(w);
      expect(play(w)).toEqual(a);
      expect(a.events).toHaveLength(1);
    });
  }

  it('different weapons give different results', () => {
    expect(
      new Set(Object.keys(WEAPONS).map((w) => play(w as keyof typeof WEAPONS).hash)).size,
    ).toBe(6);
  });
});
