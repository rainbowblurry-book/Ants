import { describe, expect, it } from 'vitest';
import { CommandRing, isValidCommand } from '../src/sim/commands.ts';
import { createAnt, launchAnt, WALK_BUDGET } from '../src/sim/movement.ts';
import { Material } from '../src/sim/terrain.ts';
import {
  FIRE_LOCK_TICKS,
  nextAnt,
  RESOLVE_CAP_TICKS,
  RETREAT_TICKS,
  roundOfTurn,
  SETTLE_TICKS,
  TURN_END_KO_TICKS,
  TURN_END_MIN_TICKS,
  TURN_START_TICKS,
  TURN_START_TICKS_EARLY,
  TURN_TICKS,
  TURN_TICKS_RELAXED,
  turnEndTicks,
} from '../src/sim/turn.ts';
import { LevelWind } from '../src/sim/wind.ts';
import {
  arena,
  arenaAnts,
  eventsOf,
  flatGrid,
  GROUND_Y,
  phaseTrail,
  runTo,
  runToAim,
  steps,
} from '../tools/match-fixture.ts';

describe('turn constants (DR-042, DR-043, DR-038)', () => {
  it('are the documented durations in ticks', () => {
    expect(TURN_START_TICKS).toBe(54); // 900 ms
    expect(TURN_START_TICKS_EARLY).toBe(36); // 600 ms through L10
    expect(FIRE_LOCK_TICKS).toBe(18); // 300 ms
    expect(RETREAT_TICKS).toBe(180); // 3 s
    expect(SETTLE_TICKS).toBe(30);
    expect(RESOLVE_CAP_TICKS).toBe(720); // 12 s
    expect(TURN_TICKS).toBe(1800); // 30 s
    expect(TURN_TICKS_RELAXED).toBe(3600); // 60 s
  });

  it('TurnEnd lasts 700 to 1800 ms', () => {
    expect(turnEndTicks(false, false, false)).toBe(42); // 700 ms
    expect(turnEndTicks(true, false, false)).toBe(72); // knock-out 1200 ms
    expect(turnEndTicks(false, true, false)).toBe(48); // dew 800 ms
    expect(turnEndTicks(false, false, true)).toBe(42); // drop 700 ms
    expect(turnEndTicks(false, true, true)).toBe(90); // dew then drop
    expect(turnEndTicks(true, true, true)).toBe(90); // the knock-out runs alongside
    expect(turnEndTicks(true, true, true)).toBeLessThanOrEqual(108); // 1800 ms
  });

  it('a round is one turn each', () => {
    expect([0, 1, 2, 3, 4].map(roundOfTurn)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe('FSM order (DR-042)', () => {
  it('TurnStart → Move/Aim → Fire → Resolve → TurnEnd → next TurnStart, on the documented ticks', () => {
    const m = arena();
    expect(m.phase).toBe('turnStart');
    expect(runTo(m, 'aim')).toBe(54);
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    runToAim(m, 1);
    expect(phaseTrail(m)).toEqual([
      'turnStart@0',
      'aim@54',
      'fire@55', // the command reaches the sim on the next tick
      'resolve@72', // 18 ticks of input lock, counting tick 55
      'turnEnd@252', // the 3 s retreat window is the long pole here
      'turnStart@294', // 700 ms with nothing to show
      'aim@348',
    ]);
    // The shot spawned when Resolve began, and was the only one.
    expect(m.shots).toHaveLength(1);
    expect(m.shots[0]?.events[0]?.kind).toBe('blast');
  });

  it('the shot does not exist during the 18-tick lock, and exists right after it', () => {
    const m = arena();
    runTo(m, 'aim');
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    m.step();
    expect(m.phase).toBe('fire');
    steps(m, FIRE_LOCK_TICKS - 2);
    expect(m.phase).toBe('fire');
    expect(m.shot).toBeNull();
    m.step();
    expect(m.phase).toBe('resolve');
    expect(m.shot).not.toBeNull();
    // Ammo is spent when FIRE is taken.
    expect(m.ammo[0]?.dewdrop).toBe(9);
  });

  it('teams alternate, and ants rotate in fixed order, skipping knocked-out ants (DR-041)', () => {
    const m = arena({ perTeam: 3, rules: { turnTicks: 5 } });
    const order: string[] = [];
    for (let t = 0; t < 8; t++) {
      runToAim(m, t);
      order.push(`${m.turns.team}:${m.turns.ant}`);
      if (t === 3) {
        // Knock out the ant that would move next for team 0 (ant 4).
        const a = m.ants[4];
        if (a) a.state = 'ko';
      }
    }
    expect(order).toEqual(['0:0', '1:1', '0:2', '1:3', '0:0', '1:5', '0:2', '1:1']);
    expect(nextAnt(m.ants, 0, 2)).toBe(0);
    expect(nextAnt(m.ants, 1, 5)).toBe(1);
  });

  it('the player moves first by default; a coin flip is seeded (DR-041)', () => {
    expect(arena().turns.team).toBe(0);
    const flips = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (seed) => arena({ seed, rules: { firstTeam: 'coin' } }).turns.team,
    );
    expect(flips).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => arena({ seed, rules: { firstTeam: 'coin' } }).turns.team,
      ),
    );
    expect(new Set(flips).size).toBe(2);
    // Each turn resets the 160 px budget and counts toward par.
    const m = arena({ rules: { turnTicks: 5 } });
    runToAim(m, 2);
    expect(m.turns.turnsTaken).toEqual([2, 1]);
    expect(m.activeAnt?.budget).toBe(WALK_BUDGET);
  });

  it('rolls the wind at every turn change, one turn ahead (DR-031)', () => {
    const m = arena({
      wind: new LevelWind({ maxAbs: 5, maxStep: 3, everyNTurns: 1 }),
      rules: { turnTicks: 5 },
    });
    const seen: number[] = [];
    for (let t = 0; t < 12; t++) {
      runToAim(m, t);
      const g = m.world.wind.gauge();
      if (t > 0) expect(g.level).toBe(seen[seen.length - 1]);
      seen.push(g.next as number);
    }
    expect(new Set(seen).size).toBeGreaterThan(2);
  });
});

describe('turn timer (DR-043)', () => {
  it('skips the turn at 0, fires nothing, and only runs during Move/Aim', () => {
    const m = arena();
    runToAim(m, 1);
    const [timeout] = eventsOf(m, 'timeout');
    expect(timeout?.tick).toBe(54 + 1800);
    expect(timeout?.ant).toBe(0);
    expect(m.shots).toHaveLength(0);
    expect(m.ammo[0]?.dewdrop).toBe(9);
    // Everything was at rest, so TurnEnd follows at once.
    expect(phaseTrail(m).slice(0, 4)).toEqual([
      'turnStart@0',
      'aim@54',
      'turnEnd@1854',
      'turnStart@1896',
    ]);
  });

  it('gives 60 s when relaxed, and no limit when off', () => {
    const relaxed = arena({ rules: { turnTicks: TURN_TICKS_RELAXED } });
    runToAim(relaxed, 1);
    expect(eventsOf(relaxed, 'timeout')[0]?.tick).toBe(54 + 3600);

    const untimed = arena({ rules: { turnTicks: null } });
    steps(untimed, 8000);
    expect(untimed.phase).toBe('aim');
    expect(untimed.turns.timerLeft).toBeNull();
  });

  it('a shot already fired stays fired: the timer stops at FIRE', () => {
    const m = arena({ rules: { turnTicks: 60 } });
    runTo(m, 'aim');
    steps(m, 50);
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    runToAim(m, 1);
    expect(eventsOf(m, 'timeout')).toHaveLength(0);
    expect(m.shots).toHaveLength(1);
  });

  it('waits for a moving ant before ending a timed-out turn', () => {
    const m = arena({ rules: { turnTicks: 20 } });
    runTo(m, 'aim');
    steps(m, 12);
    m.push({ kind: 'hop' });
    runTo(m, 'turnEnd');
    const trail = phaseTrail(m);
    expect(trail[2]).toBe('resolve@74'); // timed out in the air: wait, with no retreat window
    expect(m.activeAnt?.state).toBe('ground');
    const end = eventsOf(m, 'phase').find((e) => e.phase === 'turnEnd');
    expect((end?.tick ?? 0) - 74).toBeGreaterThanOrEqual(SETTLE_TICKS);
  });
});

describe('commands and buffers (DR-015, J8)', () => {
  it('validates commands: integer tenths of a degree in −20°..90°, power 0..1000‰', () => {
    const fire = { kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 600 } as const;
    expect(isValidCommand(fire)).toBe(true);
    expect(isValidCommand({ ...fire, angleDeci: 45.5 })).toBe(false);
    expect(isValidCommand({ ...fire, angleDeci: -201 })).toBe(false);
    expect(isValidCommand({ ...fire, angleDeci: 901 })).toBe(false);
    expect(isValidCommand({ ...fire, powerMille: 1001 })).toBe(false);
    expect(isValidCommand({ ...fire, powerMille: -1 })).toBe(false);
    const m = arena();
    expect(m.push({ ...fire, powerMille: 1001 })).toBe(false);
    expect(m.log).toHaveLength(0);
  });

  it('keeps a FIRE pressed up to 12 ticks before the turn opens, and drops an earlier one', () => {
    for (const [early, fires] of [
      [12, true],
      [13, false],
    ] as const) {
      const m = arena();
      // The command reaches the sim one tick after the push.
      steps(m, 54 - early);
      m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
      steps(m, early + 8);
      expect(m.phase, `pressed ${early} ticks early`).toBe(fires ? 'fire' : 'aim');
      expect(eventsOf(m, 'reject').some((e) => e.why === 'late')).toBe(!fires);
    }
  });

  it('keeps a jump for 9 ticks while the ant is in the air', () => {
    const land = (m: ReturnType<typeof arena>) => {
      let n = 0;
      while (m.activeAnt?.state !== 'air') m.step();
      while (m.activeAnt?.state === 'air') {
        m.step();
        n++;
      }
      return n;
    };
    for (const [early, jumps] of [
      [9, true],
      [10, false],
    ] as const) {
      const m = arena();
      runTo(m, 'aim');
      m.push({ kind: 'hop' });
      const air = land(m);
      // Replay the same hop, then press the second hop `early` ticks before landing.
      const n = arena();
      runTo(n, 'aim');
      n.push({ kind: 'hop' });
      steps(n, 1 + air - early);
      n.push({ kind: 'hop' });
      steps(n, early + 4);
      expect(n.activeAnt?.state, `pressed ${early} ticks early`).toBe(jumps ? 'air' : 'ground');
      expect(n.activeAnt?.budget).toBe(jumps ? WALK_BUDGET - 100 : WALK_BUDGET - 50);
    }
  });

  it('the ring holds 4 commands and drops the oldest', () => {
    const ring = new CommandRing();
    for (let i = 0; i < 5; i++) ring.push({ kind: 'hop', tick: i });
    expect(ring.pending.map((c) => c.tick)).toEqual([1, 2, 3, 4]);
    const m = arena();
    for (let i = 0; i < 5; i++) m.push({ kind: 'hop' });
    expect(eventsOf(m, 'reject').map((e) => e.why)).toEqual(['overflow']);
  });

  it('clears buffered commands on turn change', () => {
    const m = arena({ rules: { turnTicks: 100 } });
    runTo(m, 'turnEnd');
    // Pressed 3 ticks before the next turn: inside the 12-tick window, but
    // the turn changes first and the buffer is cleared.
    steps(m, TURN_END_MIN_TICKS - 3);
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    runToAim(m, 1);
    steps(m, 30);
    expect(m.phase).toBe('aim');
    expect(m.shots).toHaveLength(0);
  });

  it('cancel drops waiting commands and releases the held walk (Pause resume, DR-171)', () => {
    const m = arena();
    steps(m, 50);
    m.push({ kind: 'walk', dir: 1 });
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    m.push({ kind: 'cancel' });
    runTo(m, 'aim');
    steps(m, 30);
    expect(m.phase).toBe('aim');
    expect(m.activeAnt?.x).toBe(150);
    expect(m.log.map((c) => c.kind)).toEqual(['walk', 'fire', 'cancel']);
  });

  it('rejects FIRE with no ammo, and a jump the budget cannot pay for', () => {
    const m = arena();
    const pool = m.ammo[0];
    if (pool) pool.pollen = 0;
    runTo(m, 'aim');
    m.push({ kind: 'fire', weapon: 'pollen', angleDeci: 450, powerMille: 500 });
    steps(m, 3);
    expect(m.phase).toBe('aim');
    expect(eventsOf(m, 'reject').at(-1)).toMatchObject({ command: 'fire', why: 'ammo' });
    // Hop 50 + flip 80 leaves 30: the next hop is refused.
    for (const kind of ['hop', 'flip', 'hop'] as const) {
      while (m.activeAnt?.state !== 'ground') m.step();
      m.push({ kind });
      steps(m, 2);
    }
    while (m.activeAnt?.state !== 'ground') m.step();
    expect(m.activeAnt?.budget).toBe(WALK_BUDGET - 130);
    expect(eventsOf(m, 'reject').at(-1)).toMatchObject({ command: 'hop', why: 'budget' });
  });

  it('walking is a held state, only for the active ant, only while it may move', () => {
    const m = arena();
    const x0 = m.activeAnt?.x ?? 0;
    m.push({ kind: 'walk', dir: 1 });
    runTo(m, 'aim');
    expect(m.activeAnt?.x).toBe(x0); // TurnStart is not interactive
    steps(m, 30);
    expect(m.activeAnt?.x).toBeCloseTo(x0 + 40, 6); // 80 px/s
    m.push({ kind: 'walk', dir: 0 });
    m.push({ kind: 'face', dir: -1 });
    steps(m, 10);
    expect(m.activeAnt?.x).toBeCloseTo(x0 + 40, 6);
    expect(m.activeAnt?.facing).toBe(-1);
    // No other ant moved.
    expect(m.ants.slice(1).map((a) => a.x)).toEqual([800, 250, 700]);
  });
});

describe('retreat window (J6, DR-123)', () => {
  it('lets the ant use leftover budget for 3 s after the shot, and not after', () => {
    const m = arena();
    runTo(m, 'aim');
    m.push({ kind: 'fire', weapon: 'dewdrop', angleDeci: 700, powerMille: 400 });
    m.push({ kind: 'walk', dir: -1 });
    steps(m, FIRE_LOCK_TICKS);
    // Held through the input lock, but the ant did not move during it.
    expect(m.phase).toBe('resolve');
    expect(m.activeAnt?.x).toBe(150);
    expect(m.turns.retreatLeft).toBe(RETREAT_TICKS);
    steps(m, 60);
    expect(m.activeAnt?.x).toBeCloseTo(150 - 80, 6);
    expect(m.turns.retreatLeft).toBe(RETREAT_TICKS - 60);
    // Aiming is over: a second FIRE is dropped.
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 });
    steps(m, RETREAT_TICKS - 60);
    expect(m.turns.retreatLeft).toBe(0);
    const x = m.activeAnt?.x ?? 0;
    expect(x).toBeCloseTo(24, 6); // the side wall, with budget to spare
    steps(m, 20);
    expect(m.activeAnt?.x).toBe(x);
    expect(m.shots.length + (m.shot ? 1 : 0)).toBe(1);
  });
});

describe('settle rule and the 12 s cap (DR-038, J5)', () => {
  it('ends Resolve only after every body has rested for 30 ticks', () => {
    const m = arena();
    runTo(m, 'aim');
    // A Dewdrop lob that lands on the rival and throws it a long way.
    m.push({ kind: 'fire', weapon: 'dewdrop', angleDeci: 450, powerMille: 836 });
    let lastMotion = 0;
    while (m.phase !== 'turnEnd') {
      m.step();
      if (m.shot || m.ants.some((a) => a.state === 'air')) lastMotion = m.tick;
    }
    expect(eventsOf(m, 'ko').length + m.ants.filter((a) => a.hp < 100).length).toBeGreaterThan(0);
    expect(m.tick - lastMotion).toBeGreaterThanOrEqual(SETTLE_TICKS);
    expect(m.ants.every((a) => a.state !== 'air')).toBe(true);
    expect(m.shot).toBeNull();
  });

  it('force-settles 12 s after the shot: bodies snap to the ground and the turn ends', () => {
    const m = arena();
    runTo(m, 'aim');
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 300 });
    runTo(m, 'resolve');
    const start = m.tick;
    const far = m.ants[3];
    if (!far) throw new Error('no ant');
    // Keep one ant in the air for ever.
    while (m.phase === 'resolve') {
      if (far.state === 'ground') launchAnt(far, 0, -300);
      m.step();
    }
    expect(m.tick - start).toBe(RESOLVE_CAP_TICKS);
    expect(eventsOf(m, 'forceSettle')).toHaveLength(1);
    expect(m.phase).toBe('turnEnd');
    expect(far.state).toBe('ground');
    expect(far.y).toBe(GROUND_Y);
    expect(far.vy).toBe(0);
  });

  it('a force-settled ant over a void is knocked out, and a live shot fizzles', () => {
    const grid = flatGrid();
    grid.fillRect(600, 0, 200, 540, Material.EMPTY);
    const ants = arenaAnts(2);
    const m = arena({ grid, ants });
    runTo(m, 'aim');
    m.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 300 });
    runTo(m, 'resolve');
    const over = ants[3];
    if (!over) throw new Error('no ant');
    while (m.phase === 'resolve') {
      // Hold the ant high above the gap, and keep a shot alive.
      over.state = 'air';
      over.y = 100;
      over.vy = 0;
      if (m.shot === null && m.shots[0]) {
        m.shot = { ...m.shots[0], events: [], bodies: [] };
      }
      const s = m.shot;
      if (s && s.bodies.length === 0) {
        s.bodies.push({
          kind: 'seed',
          p: { x: 400, y: 50, vx: 0, vy: 0, ringR: 4 },
          ignore: -1,
          age: 0,
        });
      }
      const body = m.shot?.bodies[0];
      if (body) {
        body.p.y = 50;
        body.p.vy = 0;
        body.age = 0;
      }
      m.step();
    }
    expect(over.state).toBe('ko');
    expect(over.koBy).toBe('void');
    expect(m.shot).toBeNull();
    expect(m.shots.at(-1)?.events.at(-1)).toMatchObject({ kind: 'fizzle', why: 'cap' });
  });
});

describe('match end (DR-044)', () => {
  it('a team with no active ants loses at TurnEnd; the match then stops', () => {
    const m = arena({ rules: { turnTicks: 5 } });
    runTo(m, 'aim');
    for (const a of m.ants) if (a.team === 1) a.state = 'ko';
    runTo(m, 'turnEnd');
    expect(m.result).toMatchObject({ winner: 0, reason: 'eliminated', round: 1 });
    expect(m.over).toBe(false);
    // Two knock-outs: the 1200 ms beat.
    const t0 = m.tick;
    runTo(m, 'matchEnd');
    expect(m.tick - t0).toBe(TURN_END_KO_TICKS);
    expect(eventsOf(m, 'end')).toHaveLength(1);
    expect(eventsOf(m, 'ko').map((e) => e.ant)).toEqual([1, 3]);
    expect(m.turns.koCount).toEqual([0, 2]);
    const tick = m.tick;
    const hash = m.stateHash();
    m.step();
    expect(m.push({ kind: 'hop' })).toBe(false);
    expect([m.tick, m.stateHash()]).toEqual([tick, hash]);
  });

  it('both teams wiped on the same TurnEnd is a draw', () => {
    const m = arena({ rules: { turnTicks: 5 } });
    runTo(m, 'aim');
    for (const a of m.ants) a.state = 'ko';
    runTo(m, 'matchEnd');
    expect(m.result).toMatchObject({ winner: null, reason: 'eliminated' });
  });

  it('a real knock-out: the last rival is hit until it is dizzy', () => {
    const ants = [createAnt(0, 0, 150, GROUND_Y, 1), createAnt(1, 1, 800, GROUND_Y, -1)];
    const rival = ants[1];
    if (rival) rival.hp = 20;
    const m = arena({ ants });
    runTo(m, 'aim');
    // Seed at 45°: 650 px needs about 76% (wMul 1.15).
    for (const power of [740, 750, 760, 770, 780, 790]) {
      const t = arena({ ants: ants.map((a) => ({ ...a })) });
      runTo(t, 'aim');
      t.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: power });
      runTo(t, 'turnEnd');
      if (t.result) {
        expect(t.result).toMatchObject({ winner: 0, reason: 'eliminated' });
        expect(eventsOf(t, 'ko')[0]).toMatchObject({ ant: 1, by: 'hp' });
        return;
      }
    }
    throw new Error('no power in the sweep knocked the rival out');
  });

  it('the active ant walking off into the void ends its turn', () => {
    const grid = flatGrid();
    grid.fillRect(0, 0, 130, 540, Material.EMPTY);
    const m = arena({ grid });
    runTo(m, 'aim');
    m.push({ kind: 'walk', dir: -1 });
    runTo(m, 'turnEnd');
    expect(m.ants[0]?.koBy).toBe('void');
    expect(m.shots).toHaveLength(0);
    runToAim(m, 2);
    expect(m.turns.ant).toBe(2); // team 0's other ant
  });
});

describe('sudden death (DR-044)', () => {
  it('warns, then raises the dew 24 px per round and knocks out ants under it', () => {
    // Team 1 stands in a pit, 100 px lower.
    const grid = flatGrid();
    grid.fillRect(600, GROUND_Y, 360, 100, Material.EMPTY);
    const ants = arenaAnts(2);
    for (const a of ants) if (a.team === 1) a.y = GROUND_Y + 100;
    const m = arena({
      grid,
      ants,
      rules: { turnTicks: 5, warnRound: 2, dewFromRound: 3, capRound: 99 },
    });
    runTo(m, 'matchEnd');
    expect(eventsOf(m, 'dewWarning').map((e) => e.round)).toEqual([2]);
    // Round 3 starts at 516, round 4 at 492: under the pit floor at 500.
    expect(eventsOf(m, 'dew').map((e) => e.y)).toEqual([516, 492]);
    expect(eventsOf(m, 'ko').map((e) => [e.ant, e.by])).toEqual([
      [1, 'dew'],
      [3, 'dew'],
    ]);
    expect(m.result).toMatchObject({ winner: 0, reason: 'eliminated', round: 3 });
    expect(m.turns.dewY).toBe(492);
  });

  it('the dew also takes an ant that falls under the line during a turn', () => {
    const grid = flatGrid();
    grid.fillRect(300, GROUND_Y, 100, 120, Material.EMPTY);
    const m = arena({ grid, rules: { turnTicks: 5, warnRound: 1, dewFromRound: 2, capRound: 99 } });
    runToAim(m, 2);
    expect(m.turns.dewY).toBe(516);
    const a = m.ants[2];
    if (!a) throw new Error('no ant');
    a.x = 350;
    launchAnt(a, 0, 0);
    runTo(m, 'turnEnd');
    expect(a.koBy).toBe('dew');
  });

  it('at the round cap the team with more total HP wins, and a tie is a draw', () => {
    const play = (hp0: number, hp1: number) => {
      const m = arena({ rules: { turnTicks: 5, dewFromRound: 99, capRound: 3 } });
      const [a, b] = m.ants;
      if (a && b) {
        a.hp = hp0;
        b.hp = hp1;
      }
      runTo(m, 'matchEnd');
      return m;
    };
    const win = play(40, 90);
    expect(win.result).toEqual({ winner: 1, reason: 'cap', hp: [140, 190], round: 3 });
    // Six turns were played: three rounds.
    expect(win.turns.turn).toBe(5);
    expect(play(55, 55).result).toMatchObject({ winner: null, reason: 'cap' });
  });

  it('defaults: warning at round 18, dew from round 21, cap at round 40', () => {
    const m = arena({ rules: { turnTicks: 1 } });
    runTo(m, 'matchEnd', 400000);
    expect(eventsOf(m, 'dewWarning').map((e) => e.round)).toEqual([18]);
    const dew = eventsOf(m, 'dew');
    // The ants stand at y 400; the dew passes them when it has risen 144 px.
    expect(dew[0]?.y).toBe(516);
    expect(dew.length).toBe(6);
    expect(m.result).toMatchObject({ winner: null, reason: 'eliminated', round: 25 });
  });
});

describe('two-player gate and skippable starts (DR-045, DR-071, DR-183)', () => {
  it('waits for a tap after TurnStart; a tap in the first 900 ms does nothing', () => {
    const m = arena({ rules: { gate: true } });
    steps(m, 40);
    m.push({ kind: 'ready' }); // inside the 500 ms pan + 400 ms lockout
    steps(m, 400);
    expect(m.phase).toBe('turnStart');
    m.push({ kind: 'ready' });
    m.step();
    expect(m.phase).toBe('aim');
    // The timer starts on the tap.
    expect(m.turns.timerLeft).toBe(TURN_TICKS);
  });

  it('a tap skips TurnStart only where that is allowed', () => {
    const fast = arena({
      rules: { skippableStart: true, turnStartTicks: TURN_START_TICKS_EARLY },
    });
    steps(fast, 5);
    fast.push({ kind: 'ready' });
    fast.step();
    expect(fast.phase).toBe('aim');

    const fixed = arena();
    steps(fixed, 5);
    fixed.push({ kind: 'ready' });
    fixed.step();
    expect(fixed.phase).toBe('turnStart');
    expect(runTo(arena({ rules: { turnStartTicks: TURN_START_TICKS_EARLY } }), 'aim')).toBe(36);
  });

  it('a tap plays TurnEnd at 2x', () => {
    const m = arena({ rules: { turnTicks: 5 } });
    runTo(m, 'turnEnd');
    m.push({ kind: 'ready' });
    const t0 = m.tick;
    runTo(m, 'turnStart');
    expect(m.tick - t0).toBe(TURN_END_MIN_TICKS / 2);
  });
});

describe('lost turns and drops (DR-026, DR-048)', () => {
  it('an ant that swam back loses its next turn', () => {
    const m = arena({ rules: { turnTicks: 5 } });
    const a = m.ants[2];
    if (a) a.skipNextTurn = true;
    runToAim(m, 3);
    const turn2 = eventsOf(m, 'phase').filter((e) => e.turn === 2);
    expect(turn2.map((e) => e.phase)).toEqual(['turnStart', 'turnEnd']);
    expect(eventsOf(m, 'turnLost').map((e) => e.ant)).toEqual([2]);
    expect(a?.skipNextTurn).toBe(false);
    // The turn still counts for par, and the ant plays again next time round.
    runToAim(m, 6);
    expect(m.turns.ant).toBe(2);
  });

  it('a pickup drops at the TurnEnd that closes its round, and a walking ant collects it', () => {
    const m = arena({
      rules: { turnTicks: 400, drops: [{ round: 1, kind: 'honey', x: 180 }] },
    });
    const a = m.ants[0];
    if (a) a.hp = 50;
    runToAim(m, 2);
    expect(eventsOf(m, 'drop')).toEqual([
      { tick: expect.any(Number), kind: 'drop', pickup: 'honey', x: 180, y: GROUND_Y - 22 },
    ]);
    expect(m.world.pickups).toHaveLength(1);
    // Turn 2 is ant 2's (x 250); turn 4 is ant 0's (x 150), which walks into it.
    runToAim(m, 4);
    m.push({ kind: 'walk', dir: 1 });
    steps(m, 20);
    expect(a?.hp).toBe(75);
    expect(eventsOf(m, 'pickup')).toMatchObject([{ ant: 0, pickup: 'honey' }]);
    expect(m.world.pickups).toHaveLength(0);
  });

  it('a drop over a void is lost', () => {
    const grid = flatGrid();
    grid.fillRect(500, 0, 60, 540, Material.EMPTY);
    const m = arena({
      grid,
      rules: { turnTicks: 5, drops: [{ round: 1, kind: 'seeds', x: 530 }] },
    });
    runToAim(m, 2);
    expect(eventsOf(m, 'drop')[0]?.y).toBeNull();
    expect(m.world.pickups).toHaveLength(0);
  });
});
