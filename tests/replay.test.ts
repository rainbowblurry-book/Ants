import { describe, expect, it } from 'vitest';
import type { CommandBody } from '../src/sim/commands.ts';
import { Match } from '../src/sim/match.ts';
import { lastLogTick, runLog } from '../src/sim/replay.ts';
import { Rng } from '../src/sim/rng.ts';
import { Material } from '../src/sim/terrain.ts';
import { WEAPON_IDS } from '../src/sim/weapons/index.ts';
import { ColumnWind, CompositeWind, LevelWind, OscillateWind } from '../src/sim/wind.ts';
import { type ArenaOpts, arenaConfig, flatGrid } from '../tools/match-fixture.ts';

/** A busy arena: every material, water at the bottom, three wind fields, drops. */
function busy(seed: number): ArenaOpts {
  const grid = flatGrid('water');
  grid.fillRect(0, 520, 960, 20, Material.WATER);
  grid.fillRect(300, 330, 40, 70, Material.HARD);
  grid.fillRect(420, 380, 60, 20, Material.SOFT);
  grid.fillRect(520, 360, 70, 40, Material.BOUNCY);
  grid.fillRect(620, 390, 60, 10, Material.SLICK);
  grid.fillRect(700, 340, 20, 60, Material.ROCK);
  grid.fillRect(350, 400, 50, 120, Material.EMPTY);
  grid.fillRect(350, 500, 50, 20, Material.WATER);
  return {
    seed,
    grid,
    perTeam: 3,
    wind: new CompositeWind([
      new LevelWind({ maxAbs: 4, maxStep: 3, everyNTurns: 2 }),
      new ColumnWind({ x: 480, halfWidth: 70, strength: 500, dir: -1 }),
      new OscillateWind({ amplitude: 1, periodTicks: 360 }),
    ]),
    rules: {
      turnTicks: 240,
      firstTeam: 'coin',
      warnRound: 3,
      dewFromRound: 5,
      capRound: 9,
      dewBaseY: 520,
      drops: [
        { round: 1, kind: 'honey', x: 200 },
        { round: 2, kind: 'seeds', x: 760 },
      ],
    },
  };
}

/** Plays a match with seeded pseudo-random inputs. The script RNG is not sim state. */
function play(m: Match, scriptSeed: string, untilTick: number, hashes?: number[]): void {
  const r = Rng.fromString(scriptSeed);
  // Re-derive the script position from the tick, so a resumed match continues it.
  for (let t = 0; t < m.tick; t++) scriptStep(r, null);
  while (m.tick < untilTick && !m.over) {
    scriptStep(r, m);
    m.step();
    if (hashes && m.tick % 25 === 0) hashes.push(m.stateHash());
  }
}

function scriptStep(r: Rng, m: Match | null): void {
  const roll = r.int(0, 199);
  let cmd: CommandBody | null = null;
  if (roll < 2) {
    cmd = {
      kind: 'fire',
      weapon: WEAPON_IDS[r.int(0, 5)] ?? 'seed',
      angleDeci: r.int(-200, 900),
      powerMille: r.int(100, 1000),
    };
  } else if (roll < 6) cmd = { kind: 'walk', dir: (r.int(0, 2) - 1) as -1 | 0 | 1 };
  else if (roll < 8) cmd = { kind: 'hop' };
  else if (roll < 9) cmd = { kind: 'flip' };
  else if (roll < 10) cmd = { kind: 'face', dir: r.int(0, 1) === 0 ? -1 : 1 };
  else if (roll < 11) cmd = { kind: 'ready' };
  if (cmd && m) m.push(cmd);
}

describe('replay (DR-011, DR-047)', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: the seed plus the input log re-simulates to the same state on every checkpoint`, () => {
      const live = new Match(arenaConfig(busy(seed)));
      const liveHashes: number[] = [];
      play(live, `script-${seed}`, 9000, liveHashes);

      // The match did things worth replaying.
      expect(live.log.length).toBeGreaterThan(100);
      expect(live.shots.length).toBeGreaterThan(5);
      expect(live.turns.turn).toBeGreaterThan(6);

      const again = new Match(arenaConfig(busy(seed)));
      const replayHashes: number[] = [];
      while (again.tick < live.tick && !again.over) {
        runLog(again, live.log, Math.min(live.tick, again.tick + 25 - (again.tick % 25)));
        if (again.tick % 25 === 0) replayHashes.push(again.stateHash());
      }
      expect(again.tick).toBe(live.tick);
      expect(replayHashes).toEqual(liveHashes);
      expect(again.stateHash()).toBe(live.stateHash());
      expect(again.log).toEqual(live.log);
      expect(again.events).toEqual(live.events);
      expect(again.shots.map((s) => s.events)).toEqual(live.shots.map((s) => s.events));
      expect(again.result).toEqual(live.result);
    });
  }

  it('resumes from a saved log: replay to the saved tick, then play on identically', () => {
    const live = new Match(arenaConfig(busy(11)));
    play(live, 'resume', 2500);
    const saved = { log: live.log.slice(), tick: live.tick };
    play(live, 'resume', 6000);

    const resumed = new Match(arenaConfig(busy(11)));
    runLog(resumed, saved.log, saved.tick);
    expect(resumed.tick).toBe(saved.tick);
    play(resumed, 'resume', 6000);
    expect(resumed.stateHash()).toBe(live.stateHash());
    expect(resumed.log).toEqual(live.log);
  });

  it('a different seed, or one changed command, gives a different match', () => {
    const base = new Match(arenaConfig(busy(5)));
    play(base, 'diff', 3000);

    const otherSeed = new Match(arenaConfig(busy(6)));
    runLog(otherSeed, base.log, base.tick);
    expect(otherSeed.stateHash()).not.toBe(base.stateHash());

    // Edit the FIRE the sim actually took (others were pressed at the wrong time).
    const taken = base.events.find((e) => e.kind === 'phase' && e.phase === 'fire');
    let i = -1;
    base.log.forEach((c, k) => {
      if (c.kind === 'fire' && c.tick <= (taken?.tick ?? 0)) i = k;
    });
    const first = base.log[i];
    if (first?.kind !== 'fire') throw new Error('the script never fired');
    const edited = base.log.slice();
    edited[i] = { ...first, powerMille: first.powerMille === 1000 ? 999 : first.powerMille + 1 };
    const changed = new Match(arenaConfig(busy(5)));
    runLog(changed, edited, base.tick);
    expect(changed.stateHash()).not.toBe(base.stateHash());
  });

  it('the hash sees turn-machine state, not just positions', () => {
    const a = new Match(arenaConfig(busy(9)));
    const b = new Match(arenaConfig(busy(9)));
    for (let i = 0; i < 80; i++) {
      a.step();
      b.step();
    }
    expect(a.stateHash()).toBe(b.stateHash());
    // A held walk direction with no budget spent yet is still state.
    a.push({ kind: 'walk', dir: 0 });
    b.push({ kind: 'walk', dir: 1 });
    a.step();
    b.step();
    b.push({ kind: 'walk', dir: 0 });
    expect(a.stateHash()).not.toBe(b.stateHash());
  });

  it('refuses a log that does not fit', () => {
    const m = new Match(arenaConfig(busy(4)));
    expect(() =>
      runLog(m, [{ tick: 3, kind: 'fire', weapon: 'seed', angleDeci: 9999, powerMille: 5 }], 10),
    ).toThrow(/refused/);
    expect(lastLogTick([])).toBe(0);
    expect(lastLogTick([{ tick: 7, kind: 'hop' }])).toBe(7);
  });
});
