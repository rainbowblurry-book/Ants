import { describe, expect, it } from 'vitest';
import {
  type Ant,
  backflip,
  createAnt,
  dryStandingPoint,
  hop,
  launchAnt,
  stepAnt,
  WALK_BUDGET,
  walkSpeedFor,
  walkStep,
} from '../src/sim/movement.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';

const M = Material;

function flat(top = 400, mat: number = M.SOIL, w = 960): TerrainGrid {
  const g = new TerrainGrid(w, 540);
  g.fillRect(0, top, w, 540 - top, mat);
  return g;
}

/** Steps an airborne ant until it lands (or 600 ticks). Returns ticks and the highest point. */
function flight(a: Ant, g: TerrainGrid) {
  let t = 0;
  let minY = a.y;
  let landed: ReturnType<typeof stepAnt>['landed'];
  while (a.state === 'air' && t < 600) {
    const ev = stepAnt(a, g);
    if (a.y < minY) minY = a.y;
    if (ev.landed) landed = ev.landed;
    t++;
  }
  return { t, apex: minY, landed };
}

describe('walking (DR-036, J2)', () => {
  it('walks at 80 px/s and stops when the 160 px budget is spent', () => {
    const g = flat();
    const a = createAnt(0, 0, 200, 400, 1);
    for (let i = 0; i < 60; i++) walkStep(a, g, 1);
    expect(a.x).toBeCloseTo(280, 9);
    expect(a.budget).toBeCloseTo(80, 9);
    for (let i = 0; i < 200; i++) walkStep(a, g, 1);
    expect(a.x).toBeCloseTo(200 + WALK_BUDGET, 9);
    expect(a.budget).toBe(0);
    expect(walkStep(a, g, 1)).toBe(0);
  });

  it('turning to walk sets facing', () => {
    const g = flat();
    const a = createAnt(0, 0, 200, 400, 1);
    walkStep(a, g, -1);
    expect(a.facing).toBe(-1);
    expect(a.x).toBeLessThan(200);
  });

  it('steps up 8 px but is blocked by 9 px', () => {
    const go = (h: number) => {
      const g = flat();
      g.fillRect(300, 400 - h, 300, h, M.SOIL);
      const a = createAnt(0, 0, 250, 400, 1);
      for (let i = 0; i < 120; i++) walkStep(a, g, 1);
      return a;
    };
    const ok = go(8);
    expect(ok.x).toBeGreaterThan(320);
    expect(ok.y).toBe(392);
    const no = go(9);
    expect(no.x).toBeLessThan(300 - 16 + 1);
    expect(no.y).toBe(400);
  });

  it('speed is full to 30°, falls linearly to 40 px/s at 45°, and steeper is blocked', () => {
    expect(walkSpeedFor(0)).toBe(80);
    expect(walkSpeedFor(300)).toBe(80);
    expect(walkSpeedFor(375)).toBe(60);
    expect(walkSpeedFor(450)).toBe(40);
    expect(walkSpeedFor(451)).toBe(0);
  });

  const ramp = (deg: number) => {
    const g = flat(500);
    const t = Math.tan((deg * Math.PI) / 180);
    // Uphill to the right from x 300.
    for (let x = 300; x < 960; x++) g.fillRect(x, Math.round(500 - (x - 300) * t), 1, 540, M.SOIL);
    return g;
  };

  it('climbs a 40° ramp and stops at a 55° one', () => {
    const climb = (deg: number) => {
      const g = ramp(deg);
      const a = createAnt(0, 0, 260, 500, 1);
      for (let i = 0; i < 180; i++) walkStep(a, g, 1);
      return a;
    };
    const ok = climb(40);
    expect(ok.x).toBeGreaterThan(340);
    expect(ok.y).toBeLessThan(470);
    const no = climb(55);
    expect(no.x).toBeLessThan(310);
  });

  it('is held inside the side walls at x 24 and 936 (DR-026)', () => {
    const g = flat();
    const a = createAnt(0, 0, 40, 400, -1);
    for (let i = 0; i < 100; i++) walkStep(a, g, -1);
    expect(a.x).toBe(24);
    const b = createAnt(1, 0, 920, 400, 1);
    for (let i = 0; i < 100; i++) walkStep(b, g, 1);
    expect(b.x).toBe(936);
  });

  it('walking off a ledge starts a fall', () => {
    const g = new TerrainGrid(960, 540);
    g.fillRect(0, 300, 400, 240, M.SOIL);
    g.fillRect(400, 450, 560, 90, M.SOIL);
    const a = createAnt(0, 0, 370, 300, 1);
    for (let i = 0; i < 60 && a.state === 'ground'; i++) walkStep(a, g, 1);
    expect(a.state).toBe('air');
    const f = flight(a, g);
    expect(a.state).toBe('ground');
    expect(a.y).toBe(450);
    expect(f.landed?.fall).toBeCloseTo(150, 0);
    expect(a.hp).toBe(100 - Math.ceil((150 - 90) / 9));
  });
});

describe('hop and back-flip (DR-036)', () => {
  it('hop: v (150, −300), apex 75 px, range 150 px, about 1 s, costs 50', () => {
    const g = flat();
    const a = createAnt(0, 0, 200, 400, 1);
    expect(hop(a)).toBe(true);
    expect(a.budget).toBe(110);
    const f = flight(a, g);
    expect(Math.abs(400 - f.apex - 75)).toBeLessThan(3);
    expect(Math.abs(a.x - 200 - 150)).toBeLessThan(4);
    expect(Math.abs(f.t - 60)).toBeLessThanOrEqual(2);
    expect(a.hp).toBe(100);
  });

  it('back-flip: v (−110, −420) away from facing, apex 147 px, range 154 px, costs 80', () => {
    const g = flat();
    const a = createAnt(0, 0, 500, 400, 1);
    expect(backflip(a)).toBe(true);
    expect(a.budget).toBe(80);
    const f = flight(a, g);
    expect(Math.abs(400 - f.apex - 147)).toBeLessThan(4);
    expect(Math.abs(500 - a.x - 154)).toBeLessThan(5);
    // DR-026 counts the drop from the apex as free fall, so a flip on flat
    // ground costs fall damage: ceil((h − 90) / 9) for h ≈ 145 (PROGRESS stage 2).
    const h = (f.landed?.fall ?? 0) as number;
    expect(h).toBeGreaterThan(140);
    expect(a.hp).toBe(100 - Math.ceil((h - 90) / 9));
  });

  it('needs enough budget and solid ground', () => {
    const g = flat();
    const a = createAnt(0, 0, 200, 400, 1);
    a.budget = 49;
    expect(hop(a)).toBe(false);
    a.budget = 79;
    expect(backflip(a)).toBe(false);
    a.budget = 160;
    launchAnt(a, 0, 0);
    expect(hop(a)).toBe(false);
    expect(g.solidAt(200, 400)).toBe(true);
  });
});

describe('falling, landing and hazards (DR-022, DR-023, DR-026)', () => {
  it('takes fall damage, halved on SOFT, none on BOUNCY (which rebounds once at e 0.6)', () => {
    const drop = (mat: number) => {
      const g = flat(400, mat);
      const a = createAnt(0, 0, 300, 200, 1);
      launchAnt(a, 0, 0);
      const f = flight(a, g);
      return { a, f };
    };
    expect(drop(M.SOIL).a.hp).toBe(100 - Math.ceil((200 - 90) / 9));
    expect(drop(M.SOFT).a.hp).toBe(100 - Math.round(Math.ceil((200 - 90) / 9) / 2));
    const b = drop(M.BOUNCY);
    expect(b.a.hp).toBe(100);
  });

  it('a BOUNCY landing rebounds once at 0.6 of the landing speed', () => {
    const g = flat(400, M.BOUNCY);
    const a = createAnt(0, 0, 300, 200, 1);
    launchAnt(a, 0, 0);
    let rebound = 0;
    let vIn = 0;
    for (let i = 0; i < 400; i++) {
      const vy = a.vy;
      const ev = stepAnt(a, g);
      if (ev.landed && a.state === 'air') {
        rebound++;
        vIn = vy + 10; // gravity added this tick before the landing
        expect(a.vy).toBeCloseTo(-0.6 * vIn, 6);
      }
    }
    expect(rebound).toBe(1);
    expect(a.state).toBe('ground');
  });

  it('fall damage never knocks an ant out', () => {
    const g = flat(500);
    const a = createAnt(0, 0, 300, 0, 1);
    a.hp = 3;
    launchAnt(a, 0, 0);
    flight(a, g);
    expect(a.hp).toBe(1);
    expect(a.state).toBe('ground');
  });

  it('caps falls at 700 px/s terminal speed', () => {
    const g = new TerrainGrid(960, 540, 'floor');
    const a = createAnt(0, 0, 300, -3000, 1);
    launchAnt(a, 0, 0);
    let max = 0;
    for (let i = 0; i < 400 && a.state === 'air'; i++) {
      stepAnt(a, g);
      if (a.vy > max) max = a.vy;
    }
    expect(max).toBe(700);
  });

  it('knocks out an ant whose feet pass y 580 over a void bottom', () => {
    const g = new TerrainGrid(960, 540);
    const a = createAnt(0, 0, 300, 400, 1);
    launchAnt(a, 0, 0);
    let ko: string | undefined;
    for (let i = 0; i < 200 && a.state !== 'ko'; i++) ko = stepAnt(a, g).ko ?? ko;
    expect(a.state).toBe('ko');
    expect(ko).toBe('void');
    expect(a.y).toBeGreaterThan(580);
  });

  it('an ant in bottom water for 6 ticks swims back to dry ground and loses its next turn', () => {
    const g = new TerrainGrid(960, 540, 'water');
    g.fillRect(0, 480, 960, 60, M.WATER);
    g.fillRect(0, 400, 300, 80, M.SOIL);
    const a = createAnt(0, 0, 420, 470, 1);
    launchAnt(a, 0, 0);
    let swam = false;
    for (let i = 0; i < 200 && !swam; i++) swam = stepAnt(a, g).swam ?? false;
    expect(swam).toBe(true);
    expect(a.state).toBe('ground');
    expect(a.y).toBe(400);
    expect(a.x).toBeLessThan(300);
    expect(a.x).toBeGreaterThan(220);
    expect(a.skipNextTurn).toBe(true);
    expect(a.hp).toBe(100);
    expect(dryStandingPoint(g, 420)?.x).toBe(299.5);
  });

  it('with no dry ground within 200 px it swims to the nearest dry ground anywhere (OVR-011)', () => {
    const g = new TerrainGrid(960, 540, 'water');
    g.fillRect(0, 480, 960, 60, M.WATER);
    g.fillRect(800, 400, 100, 80, M.SOIL);
    const a = createAnt(0, 0, 300, 470, 1);
    launchAnt(a, 0, 0);
    let swam = false;
    for (let i = 0; i < 200 && !swam; i++) swam = stepAnt(a, g).swam ?? false;
    expect(swam).toBe(true);
    expect(a.state).toBe('ground');
    expect(a.x).toBe(800.5);
    expect(a.y).toBe(400);
    expect(a.skipNextTurn).toBe(true);
    // No dry ground at all: knocked out.
    const none = new TerrainGrid(960, 540, 'water');
    none.fillRect(0, 480, 960, 60, M.WATER);
    const b = createAnt(1, 0, 300, 470, 1);
    launchAnt(b, 0, 0);
    for (let i = 0; i < 200 && b.state !== 'ko'; i++) stepAnt(b, none);
    expect(b.state).toBe('ko');
  });

  it('a blast cannot throw an ant above the top of the map (OVR-016)', () => {
    const g = flat();
    const a = createAnt(0, 0, 480, 400, 1);
    launchAnt(a, 0, -700);
    const { apex } = flight(a, g);
    expect(apex).toBeGreaterThanOrEqual(44);
    expect(a.state).toBe('ground');
  });

  it('the side walls hold an ant thrown sideways (DR-026)', () => {
    const g = flat();
    const l = createAnt(0, 0, 60, 400, 1);
    launchAnt(l, -600, -300);
    flight(l, g);
    expect(l.x).toBe(24);
    const r = createAnt(1, 0, 900, 400, 1);
    launchAnt(r, 600, -300);
    flight(r, g);
    expect(r.x).toBe(936);
  });

  it('falls when the ground under it is blasted away', () => {
    const g = flat();
    const a = createAnt(0, 0, 300, 400, 1);
    stepAnt(a, g);
    expect(a.state).toBe('ground');
    g.erase(300, 400, 40);
    stepAnt(a, g);
    expect(a.state).toBe('air');
    flight(a, g);
    expect(a.state).toBe('ground');
    expect(a.y).toBeGreaterThan(400);
  });

  it('is pushed up out of terrain filled into its feet (at most 24 px)', () => {
    const g = flat();
    g.fillRect(280, 390, 40, 10, M.SOIL);
    const a = createAnt(0, 0, 300, 400, 1);
    stepAnt(a, g);
    expect(a.y).toBe(390);
  });

  it('stands still on slopes up to 60° and slides on steeper ones', () => {
    const slope = (deg: number, mat: number = M.SOIL) => {
      const g = new TerrainGrid(960, 540);
      const t = Math.tan((deg * Math.PI) / 180);
      for (let x = 0; x < 960; x++) g.fillRect(x, Math.round(300 + (x - 480) * t), 1, 540, mat);
      const a = createAnt(0, 0, 480, 300, 1);
      for (let i = 0; i < 60; i++) stepAnt(a, g);
      return a;
    };
    expect(slope(40).x).toBe(480);
    expect(slope(55).x).toBe(480);
    expect(slope(65).x).toBeGreaterThan(480);
    // SLICK: slides above 10°.
    expect(slope(8, M.SLICK).x).toBe(480);
    expect(slope(15, M.SLICK).x).toBeGreaterThan(480); // downhill is +x here
  });

  it('on SLICK an ant keeps its momentum and decelerates at 90 px/s² (stops in about 35 px)', () => {
    const g = flat(400, M.SLICK);
    const a = createAnt(0, 0, 300, 400, 1);
    a.vx = 80;
    let t = 0;
    while (a.vx !== 0 && t < 200) {
      stepAnt(a, g);
      t++;
    }
    expect(Math.abs(a.x - 300 - 35.6)).toBeLessThan(2);
    // On SOIL, a ground ant with leftover speed stops at once.
    const s = flat();
    const b = createAnt(1, 0, 300, 400, 1);
    b.vx = 80;
    stepAnt(b, s);
    expect(b.vx).toBe(0);
    expect(b.x).toBe(300);
  });
});
