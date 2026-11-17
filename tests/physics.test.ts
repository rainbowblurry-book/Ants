import { describe, expect, it } from 'vitest';
import { Match } from '../src/sim/match.ts';
import { createAnt } from '../src/sim/movement.ts';
import {
  bounce,
  bounceOnMaterial,
  circleHitsCapsule,
  contactNormal,
  GRAVITY,
  launchSpeed,
  launchVelocity,
  MAX_SPEED,
  type Projectile,
  RING_R_DEW,
  RING_R_SMALL,
  SIM_DT,
  simulateFlight,
  stepProjectile,
  surfaceNormal,
  WIND_K,
} from '../src/sim/physics.ts';
import { Rng } from '../src/sim/rng.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';
import {
  CALM,
  ColumnWind,
  CompositeWind,
  LevelWind,
  OscillateWind,
  WIND_MAX_LEVEL,
} from '../src/sim/wind.ts';

const M = Material;
/** Spitter's wind factor and speed multiplier (PLAN §5 weapon table). */
const SEED_WIND = 0.6;
const SEED_WMUL = 1.15;

/**
 * Flies a shot over open ground (no terrain) and returns where it comes back
 * down through the launch height, interpolated inside the last tick.
 */
function landingX(
  angleDeci: number,
  powerMille: number,
  wMul: number,
  windAx = 0,
): { x: number; ticks: number } {
  const g = new TerrainGrid(4000, 10); // the shot stays above it
  const v = launchVelocity(angleDeci, powerMille, wMul, 1);
  const p: Projectile = { x: 0, y: 0, vx: v.x, vy: v.y, ringR: RING_R_SMALL };
  for (let t = 1; t < 2000; t++) {
    const px = p.x;
    const py = p.y;
    stepProjectile(p, g, windAx, 0);
    if (t > 1 && p.y >= 0) {
      const f = py / (py - p.y);
      return { x: px + (p.x - px) * f, ticks: t };
    }
  }
  throw new Error('never landed');
}

describe('launch and integrator (DR-030)', () => {
  it('maps power per-mille to speed: v = wMul·(100 + 620·p)', () => {
    expect(launchSpeed(1000, 1)).toBe(720);
    expect(launchSpeed(500, 1)).toBe(410);
    expect(launchSpeed(0, 1)).toBe(100);
    expect(launchSpeed(1000, 1.15)).toBeCloseTo(828, 9);
  });

  it('aims by integer tenths of a degree toward the facing side', () => {
    const r = launchVelocity(450, 1000, 1, 1);
    expect(r.x).toBeCloseTo(509.1168824543142, 9);
    expect(r.y).toBeCloseTo(-509.1168824543142, 9);
    const l = launchVelocity(450, 1000, 1, -1);
    expect(l.x).toBeCloseTo(-r.x, 12);
    const up = launchVelocity(900, 500, 1, 1);
    expect(up.x).toBe(0);
    expect(up.y).toBe(-410);
  });

  it('a full-power 45° shot (wMul 1) goes about 864 px in about 1.70 s', () => {
    const { x, ticks } = landingX(450, 1000, 1);
    // Semi-implicit Euler at 60 Hz lands about one tick early versus the
    // closed form v²/g = 864 (see PROGRESS stage 1): 855.5 px, 101 ticks.
    expect(Math.abs(x - 864)).toBeLessThan(864 * 0.012);
    expect(Math.abs(ticks * SIM_DT - 1.7)).toBeLessThan(2 / 60);
  });

  it('mid powers land where DR-030 says (280 px at 50%, 475 px at 70%)', () => {
    expect(Math.abs(landingX(450, 500, 1).x - 280)).toBeLessThan(6);
    expect(Math.abs(landingX(450, 700, 1).x - 475)).toBeLessThan(8);
  });
});

describe('wind drift (DR-031)', () => {
  /** Power (per-mille) for a 45° Seed shot that lands at 500 px in calm air. */
  function power500(): number {
    let best = 0;
    let err = Number.POSITIVE_INFINITY;
    for (let pm = 300; pm <= 1000; pm++) {
      const e = Math.abs(landingX(450, pm, SEED_WMUL).x - 500);
      if (e < err) {
        err = e;
        best = pm;
      }
    }
    return best;
  }

  it('a 500 px Seed shot drifts 62 px at level 5 and 12 px at level 1', () => {
    const pm = power500();
    const calm = landingX(450, pm, SEED_WMUL).x;
    expect(Math.abs(calm - 500)).toBeLessThan(4);
    const drift5 = landingX(450, pm, SEED_WMUL, 5 * WIND_K * SEED_WIND).x - calm;
    const drift1 = landingX(450, pm, SEED_WMUL, 1 * WIND_K * SEED_WIND).x - calm;
    expect(Math.abs(drift5 - 62)).toBeLessThan(3);
    expect(Math.abs(drift1 - 12)).toBeLessThan(1);
    const left = landingX(450, pm, SEED_WMUL, -5 * WIND_K * SEED_WIND).x - calm;
    expect(left).toBeCloseTo(-drift5, 6);
  });
});

describe('collision stepping (DR-023, J4)', () => {
  it('caps speed at 1500 px/s', () => {
    const g = new TerrainGrid(100, 100);
    const p: Projectile = { x: 10, y: 10, vx: 5000, vy: 0, ringR: RING_R_SMALL };
    stepProjectile(p, g, 0, 0);
    expect(Math.sqrt(p.vx * p.vx + p.vy * p.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-9);
  });

  it('never tunnels through a 6 px wall at 1500 px/s, for any offset or angle', () => {
    let tests = 0;
    for (let wallX = 400; wallX < 402; wallX += 0.25) {
      for (let deg = -30; deg <= 30; deg += 5) {
        for (let off = 0; off < 1; off += 0.125) {
          const g = new TerrainGrid(960, 540);
          g.fillRect(Math.floor(wallX), 0, 6, 540, M.SOIL);
          const rad = (deg * Math.PI) / 180;
          const p: Projectile = {
            x: 100 + off,
            y: 270 + off,
            vx: 1500 * Math.cos(rad),
            vy: 1500 * Math.sin(rad),
            ringR: RING_R_SMALL,
          };
          const r = simulateFlight(p, g, undefined, { maxTicks: 60 });
          expect(r.result.kind).toBe('terrain');
          expect(p.x).toBeLessThan(Math.floor(wallX));
          tests++;
        }
      }
    }
    expect(tests).toBe(8 * 13 * 8);
  });

  it('never tunnels through a 6 px floor falling at full speed', () => {
    const g = new TerrainGrid(200, 540);
    g.fillRect(0, 300, 200, 6, M.HARD);
    const p: Projectile = { x: 100.3, y: 0, vx: 0, vy: 1500, ringR: RING_R_SMALL };
    const r = simulateFlight(p, g);
    expect(r.result.kind).toBe('terrain');
    expect(p.y).toBeLessThan(300);
    expect(p.y + RING_R_SMALL).toBeGreaterThan(300 - 2.01);
  });

  it('stops at the last free step, touching within 2 px', () => {
    const g = new TerrainGrid(400, 200);
    g.fillRect(300, 0, 10, 200, M.SOIL);
    const p: Projectile = { x: 10, y: 100, vx: 900, vy: 0, ringR: RING_R_DEW };
    const r = simulateFlight(p, g, () => ({ x: 0, y: -GRAVITY }));
    expect(r.result.kind).toBe('terrain');
    expect(p.x + RING_R_DEW).toBeLessThan(300);
    expect(p.x + RING_R_DEW).toBeGreaterThanOrEqual(298);
    if (r.result.kind === 'terrain') {
      expect(r.result.material).toBe(M.SOIL);
      expect(r.result.normal.x).toBeCloseTo(-1, 9);
      expect(r.result.normal.y).toBeCloseTo(0, 9);
    }
  });

  it('hits an ant capsule before the ground behind it', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    const ant = { x: 500, y: 400 };
    const p: Projectile = { x: 100, y: 378, vx: 1200, vy: 0, ringR: RING_R_SMALL };
    const r = simulateFlight(p, g, () => ({ x: 0, y: -GRAVITY }), { ants: [ant] });
    expect(r.result).toEqual({ kind: 'ant', ant: 0 });
    expect(circleHitsCapsule(p.x, p.y, RING_R_SMALL, ant)).toBe(true);
  });

  it('uses a 56x32 horizontal capsule centred 22 px above the feet (DR-027)', () => {
    const ant = { x: 0, y: 0 };
    expect(circleHitsCapsule(28, -22, 0, ant)).toBe(true);
    expect(circleHitsCapsule(28.01, -22, 0, ant)).toBe(false);
    expect(circleHitsCapsule(0, -38, 0, ant)).toBe(true);
    expect(circleHitsCapsule(0, -38.01, 0, ant)).toBe(false);
    expect(circleHitsCapsule(0, -6, 0, ant)).toBe(true);
    expect(circleHitsCapsule(0, -5.99, 0, ant)).toBe(false);
  });

  it('despawns beyond x −150, x 1110 or y −2000 (DR-026)', () => {
    const g = new TerrainGrid(960, 540);
    const out = (x: number, y: number, vx: number, vy: number) => {
      const p: Projectile = { x, y, vx, vy, ringR: RING_R_SMALL };
      return simulateFlight(p, g, () => ({ x: 0, y: -GRAVITY })).result.kind;
    };
    expect(out(0, 100, -600, 0)).toBe('out');
    expect(out(900, 100, 600, 0)).toBe('out');
    expect(out(480, 0, 0, -1500)).toBe('out');
  });

  it('fizzles at the 480-tick flight cap', () => {
    const g = new TerrainGrid(960, 540);
    const p: Projectile = { x: 480, y: 100, vx: 0, vy: 0, ringR: RING_R_SMALL };
    const r = simulateFlight(p, g, () => ({ x: 0, y: -GRAVITY }));
    expect(r.result.kind).toBe('flying');
    expect(r.ticks).toBe(480);
  });
});

describe('surface normal and bounce (DR-023)', () => {
  it('finds the normal from a 9x9 window', () => {
    const g = new TerrainGrid(100, 100);
    g.fillRect(0, 50, 100, 50, M.SOIL);
    const n = surfaceNormal(g, 50.5, 49.5, 0, 100);
    expect(n.x).toBeCloseTo(0, 12);
    expect(n.y).toBeCloseTo(-1, 12);
    // A 45° slope (solid below the line y = x) gives a diagonal normal.
    const s = new TerrainGrid(100, 100);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) if (y > x) s.set(x, y, M.SOIL);
    const d = surfaceNormal(s, 50.5, 50.5, 0, 0);
    expect(d.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(d.y).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it('finds the ground under a wide ring, whatever the flight direction', () => {
    // The Dewdrop ring is 8 px out, beyond a 9x9 window centred on the drop.
    // The window must sit on the ring point that touched (stage 3 review fix).
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 400, 960, 140, M.SOIL);
    for (const ringR of [RING_R_SMALL, RING_R_DEW]) {
      for (const vx of [-300, 0, 200, 600]) {
        const p: Projectile = { x: 480, y: 300, vx, vy: 0, ringR };
        const r = simulateFlight(p, g);
        expect(r.result.kind).toBe('terrain');
        if (r.result.kind !== 'terrain') continue;
        expect(r.result.normal.x, `ring ${ringR}, vx ${vx}`).toBeCloseTo(0, 12);
        expect(r.result.normal.y, `ring ${ringR}, vx ${vx}`).toBeCloseTo(-1, 12);
      }
    }
    // A 45° slope, hit by a drop falling straight down.
    const s = new TerrainGrid(400, 400);
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) if (y > x) s.set(x, y, M.SOIL);
    const d: Projectile = { x: 200.5, y: 100, vx: 0, vy: 0, ringR: RING_R_DEW };
    const hit = simulateFlight(d, s);
    expect(hit.result.kind).toBe('terrain');
    if (hit.result.kind === 'terrain') {
      expect(contactNormal(s, hit.result.cx, hit.result.cy, RING_R_DEW, 0, 100)).toEqual(
        hit.result.normal,
      );
      expect(hit.result.normal.x).toBeCloseTo(Math.SQRT1_2, 1);
      expect(hit.result.normal.y).toBeCloseTo(-Math.SQRT1_2, 1);
    }
  });

  it('falls back to the reversed velocity when embedded', () => {
    const g = new TerrainGrid(50, 50);
    g.fillRect(0, 0, 50, 50, M.SOIL);
    const n = surfaceNormal(g, 25.5, 25.5, 3, 4);
    expect(n).toEqual({ x: -0.6, y: -0.8 });
  });

  it("v' = v − (1+e)(v·n)n, then tangential × (1 − 0.2·mu)", () => {
    const v = bounce({ x: 100, y: 200 }, { x: 0, y: -1 }, 0.35, 0.8);
    expect(v.x).toBeCloseTo(84, 12);
    expect(v.y).toBeCloseTo(-70, 12);
    // Slanted surface: check the normal and tangential parts separately.
    const n = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
    const vin = { x: 300, y: 100 };
    const out = bounce(vin, n, 0.55, 0.5);
    const vn = vin.x * n.x + vin.y * n.y;
    const on = out.x * n.x + out.y * n.y;
    expect(on).toBeCloseTo(-0.55 * vn, 9);
    const tIn = vin.x * -n.y + vin.y * n.x;
    const tOut = out.x * -n.y + out.y * n.x;
    expect(tOut).toBeCloseTo(tIn * 0.9, 9);
    // Moving away from the surface: unchanged.
    expect(bounce({ x: 5, y: -5 }, { x: 0, y: -1 }, 0.5, 0.5)).toEqual({ x: 5, y: -5 });
  });

  it('bounces with the material table (BOUNCY e 0.85, mu 0.6)', () => {
    const v = bounceOnMaterial({ x: 0, y: 400 }, { x: 0, y: -1 }, M.BOUNCY);
    expect(v.y).toBeCloseTo(-340, 9);
  });
});

describe('wind fields (DR-032, J9)', () => {
  it('Level: rolls one turn ahead within max and step, deterministically', () => {
    const run = () => {
      const w = new LevelWind({ maxAbs: 4, maxStep: 3, everyNTurns: 2 });
      const rng = Rng.fromString('9:L11:wind');
      const seen: { level: number; next: number | undefined }[] = [];
      for (let t = 0; t < 200; t++) {
        w.onTurnStart(t, rng);
        seen.push({ level: w.gauge().level, next: w.gauge().next });
      }
      return seen;
    };
    const a = run();
    expect(run()).toEqual(a);
    for (let t = 0; t < a.length; t++) {
      const s = a[t] as { level: number; next: number };
      expect(Number.isInteger(s.level)).toBe(true);
      expect(Math.abs(s.level)).toBeLessThanOrEqual(4);
      if (t > 0) {
        const prev = a[t - 1] as { level: number; next: number };
        expect(s.level).toBe(prev.next); // the telegraph is exact
        expect(Math.abs(s.level - prev.level)).toBeLessThanOrEqual(3);
        if (t % 2 === 1) expect(s.level).toBe(prev.level); // changes every 2 turns
      }
    }
    expect(new Set(a.map((s) => s.level)).size).toBeGreaterThan(3);
  });

  it('Level: accel is level × 25 px/s² and a fixed sign holds', () => {
    const w = new LevelWind({ maxAbs: 4, maxStep: 1, everyNTurns: 1, minAbs: 3, sign: -1 });
    const rng = Rng.fromString('x');
    for (let t = 0; t < 50; t++) {
      w.onTurnStart(t, rng);
      expect(w.current).toBeGreaterThanOrEqual(-4);
      expect(w.current).toBeLessThanOrEqual(-3);
      expect(w.accel()).toEqual({ x: w.current * 25, y: 0 });
    }
    expect(() => new LevelWind({ maxAbs: 6, maxStep: 1, everyNTurns: 1 })).toThrow();
  });

  it('Column: smoothstep falloff, full at the centre, 0 at the half-width', () => {
    const c = new ColumnWind({ x: 480, halfWidth: 70, strength: 500, dir: -1 });
    expect(c.accel(480).y).toBe(-500);
    expect(c.accel(480 + 35).y).toBeCloseTo(-250, 9);
    expect(c.accel(480 - 70).y).toBe(0);
    expect(c.accel(480 + 100).y).toBe(0);
    expect(c.accel(480).x).toBe(0);
  });

  it('Column: active on 1 turn in N', () => {
    const c = new ColumnWind({ x: 0, halfWidth: 10, strength: 100, dir: -1, everyNTurns: 3 });
    const on: boolean[] = [];
    for (let t = 0; t < 6; t++) {
      c.onTurnStart(t);
      on.push(c.accel(0).y !== 0);
    }
    expect(on).toEqual([true, false, false, true, false, false]);
  });

  it('Oscillate: A·sin(2π·t/P) from the trig table, quantised to 1/64', () => {
    const o = new OscillateWind({ amplitude: 4, periodTicks: 360 });
    expect(o.level(0)).toBe(0);
    expect(o.level(90)).toBe(4);
    expect(o.level(180)).toBe(0);
    expect(o.level(270)).toBe(-4);
    expect(o.level(360 + 90)).toBe(4);
    for (let t = 0; t < 360; t++) {
      const l = o.level(t);
      expect(l * 64).toBe(Math.round(l * 64));
      expect(Math.abs(l - 4 * Math.sin((2 * Math.PI * t) / 360))).toBeLessThanOrEqual(1 / 128);
    }
    expect(o.accel(0, 0, 90)).toEqual({ x: 100, y: 0 });
  });

  it('Composite: sums fields and clamps the horizontal part to ±5', () => {
    const rng = Rng.fromString('comp');
    const w = new CompositeWind([
      new OscillateWind({ amplitude: 4, periodTicks: 360 }),
      new OscillateWind({ amplitude: 4, periodTicks: 360 }),
      new ColumnWind({ x: 100, halfWidth: 70, strength: 500, dir: -1 }),
    ]);
    w.onTurnStart(0, rng);
    const a = w.accel(100, 0, 90);
    expect(a.x).toBe(WIND_MAX_LEVEL * WIND_K);
    expect(a.y).toBe(-500);
    expect(w.gauge(90).level).toBe(5);
    expect(CALM.accel(0, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('match skeleton (DR-010, DR-011)', () => {
  const play = () => {
    const terrain = new TerrainGrid(960, 540);
    terrain.fillRect(0, 400, 960, 140, M.SOIL);
    const m = new Match({
      seed: 1234,
      levelId: 'L01',
      terrain,
      wind: new LevelWind({ maxAbs: 2, maxStep: 1, everyNTurns: 1 }),
      ants: [createAnt(0, 0, 100, 400, 1), createAnt(1, 1, 800, 400, -1)],
    });
    // The turn machine (stage 3) takes commands once TurnStart is over.
    while (m.phase === 'turnStart') m.step();
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 600, powerMille: 700 });
    for (let i = 0; i < 300; i++) m.step();
    return m;
  };

  it('re-runs to the same state hash, log and impact', () => {
    const a = play();
    const b = play();
    expect(a.stateHash()).toBe(b.stateHash());
    expect(a.log).toEqual(b.log);
    expect(a.shots).toHaveLength(1);
    expect(a.shots[0]?.events).toEqual(b.shots[0]?.events);
    expect(a.shots[0]?.events[0]?.kind).toBe('blast');
    expect(a.log[0]?.tick).toBe(55);
  });
});
