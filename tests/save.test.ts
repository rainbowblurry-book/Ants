import { describe, expect, it } from 'vitest';
import {
  clearSlot,
  MATCH_KEY,
  readSlots,
  resumeMatch,
  slotOf,
  writeSlot,
} from '../src/save/matchSlot.ts';
import {
  acornCount,
  defaultTwoPlayer,
  freshSave,
  Goal,
  goalBits,
  isUnlocked,
  normalise,
  recordLoss,
  recordSkip,
  recordWin,
  totalAcorns,
} from '../src/save/schema.ts';
import {
  type KeyValueStore,
  MemoryStore,
  migrate,
  SAVE_BAK_KEY,
  SAVE_KEY,
  SaveStore,
} from '../src/save/store.ts';
import { Match } from '../src/sim/match.ts';
import { arenaConfig, runToAim, steps } from '../tools/match-fixture.ts';

/** A storage that throws on every write, like Safari private mode. */
class BlockedStore implements KeyValueStore {
  getItem(): string | null {
    return null;
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
  removeItem(): void {}
}

function filledSave() {
  const s = freshSave();
  recordWin(s, 1, Goal.WON | Goal.NO_KO | Goal.PAR);
  recordWin(s, 2, Goal.WON);
  recordLoss(s, 3);
  recordLoss(s, 3);
  recordSkip(s, 3);
  s.level0 = { p1Done: true, trialsUsed: ['grub', 'plop'], previewResult: 'lose' };
  s.comicsSeen = ['1', '2', 'epilogue'];
  s.unlocks = ['weapon.dewdrop', 'trinket.leaf-feather', 'sticker.brave-scout'];
  s.wardrobe = { '0': { trinket: 'trinket.leaf-feather', dance: null, nickname: 'nick.06' } };
  s.settings = {
    ...s.settings,
    music: 10,
    sfx: 0,
    assist: true,
    relaxedTurns: true,
    leftHanded: true,
    reducedMotion: 'on',
    textSize: 'large',
    twoPlayer: {
      names: ['Blue Caps', 'Amber Caps'],
      ants: 4,
      arena: 10,
      timer: 60,
      starter: true,
      pickups: true,
      passPhone: true,
      hitOwnTeam: true,
    },
  };
  return s;
}

describe('ants.save.v1 (DR-018, J18, J48)', () => {
  it('a fresh save has the documented shape and defaults', () => {
    const s = freshSave();
    expect(s).toEqual({
      v: 1,
      progress: {},
      level0: { p1Done: false, trialsUsed: [], previewResult: '' },
      comicsSeen: [],
      unlocks: [],
      wardrobe: {},
      settings: {
        music: 70, // DR-170
        sfx: 80,
        assist: false,
        relaxedTurns: false,
        showTips: true,
        leftHanded: false,
        reducedMotion: 'auto',
        textSize: 'normal',
        performanceMode: false,
        language: 'en',
        twoPlayer: {
          names: ['Blue Caps', 'Amber Caps'], // J45
          ants: 3, // J10
          arena: 0,
          timer: 30,
          starter: false,
          pickups: false,
          passPhone: false,
          hitOwnTeam: false,
        },
      },
    });
  });

  it('round-trips through storage unchanged', () => {
    const mem = new MemoryStore();
    const store = new SaveStore(mem);
    expect(store.persistent).toBe(true);
    expect(store.load()).toEqual({ save: freshSave(), status: 'fresh' });
    const s = filledSave();
    expect(store.save(s)).toBe(true);
    // A second store on the same storage is a new session.
    const again = new SaveStore(mem).load();
    expect(again.status).toBe('loaded');
    expect(again.save).toEqual(s);
    expect(again.save.progress['3']).toEqual({ done: false, goals: 0, skipped: true, losses: 2 });
    expect(mem.getItem(SAVE_BAK_KEY)).toBeNull();
  });

  it('moves a corrupt save to ants.save.bak and starts fresh', () => {
    for (const bad of [
      '{"v":1,"progress":{"1":{"done":tr', // cut off mid-write
      'not json at all',
      '[1,2,3]',
      '{"progress":{}}', // no version
      '{"v":2,"progress":{}}', // from a newer build
      '{"v":"1"}',
      'null',
    ]) {
      const mem = new MemoryStore();
      mem.setItem(SAVE_KEY, bad);
      const store = new SaveStore(mem);
      const { save, status } = store.load();
      expect(status, bad).toBe('recovered');
      expect(save, bad).toEqual(freshSave());
      expect(mem.getItem(SAVE_BAK_KEY), bad).toBe(bad);
      expect(mem.getItem(SAVE_KEY), bad).toBeNull();
      // The next load is a plain fresh start, and the backup is untouched.
      expect(store.load().status).toBe('fresh');
      store.save(save);
      expect(new SaveStore(mem).load().status).toBe('loaded');
      expect(mem.getItem(SAVE_BAK_KEY)).toBe(bad);
    }
  });

  it('falls back to defaults for bad or missing values, and drops unknown keys', () => {
    const s = normalise({
      v: 1,
      progress: {
        '5': { done: true, goals: 99, skipped: 'yes', losses: -3 },
        '0': { done: true },
        '101': { done: true },
        abc: { done: true },
        '7': 'done',
      },
      level0: { p1Done: 1, trialsUsed: ['grub', 'laser', 'grub'], previewResult: 'draw' },
      comicsSeen: ['1', 2, '1'],
      unlocks: 'everything',
      wardrobe: { '2': { trinket: 5, dance: 'dance.wiggle' }, '9': { trinket: 'x' } },
      settings: {
        music: 250,
        sfx: 33.5,
        reducedMotion: 'sometimes',
        textSize: 'huge',
        twoPlayer: { names: ['', 7], ants: 9, arena: -1, timer: 45, starter: 'no' },
      },
      extra: 'dropped',
    });
    expect(s.progress).toEqual({ '5': { done: true, goals: 0, skipped: false, losses: 0 } });
    expect(s.level0).toEqual({ p1Done: false, trialsUsed: ['grub'], previewResult: '' });
    expect(s.comicsSeen).toEqual(['1']);
    expect(s.unlocks).toEqual([]);
    expect(s.wardrobe).toEqual({ '2': { trinket: null, dance: 'dance.wiggle', nickname: null } });
    expect(s.settings).toEqual(freshSave().settings);
    expect(s.settings.twoPlayer).toEqual(defaultTwoPlayer());
    expect('extra' in s).toBe(false);
  });

  it('runs from memory when storage is blocked, and says so', () => {
    for (const storage of [new BlockedStore(), null, () => null]) {
      const store = new SaveStore(storage);
      expect(store.persistent).toBe(false);
      const s = filledSave();
      expect(store.save(s)).toBe(true);
      expect(store.load()).toEqual({ save: s, status: 'loaded' });
    }
    // Reading `localStorage` itself can throw (a blocked iframe).
    const store = new SaveStore(() => {
      throw new Error('SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(store.load().status).toBe('fresh');
  });

  it('migrate() walks the chain one version at a time', () => {
    expect(migrate({ v: 1 })).toEqual(freshSave());
    expect(migrate({ v: 0 })).toBeNull();
    expect(migrate({ v: 2 })).toBeNull();
    expect(migrate('{"v":1}')).toBeNull();
    // A future build at version 3, with two steps.
    const calls: number[] = [];
    const steps3 = {
      1: (old: Record<string, unknown>) => {
        calls.push(1);
        return { ...old, comicsSeen: ['1'] };
      },
      2: (old: Record<string, unknown>) => {
        calls.push(2);
        return { ...old, unlocks: ['weapon.pollen'] };
      },
    };
    const up = migrate({ v: 1, progress: { '1': { done: true, goals: 1 } } }, 3, steps3);
    expect(calls).toEqual([1, 2]);
    expect(up?.comicsSeen).toEqual(['1']);
    expect(up?.unlocks).toEqual(['weapon.pollen']);
    expect(up?.progress['1']?.done).toBe(true);
    expect(migrate({ v: 2 }, 3, steps3)?.unlocks).toEqual(['weapon.pollen']);
    // A missing step is a broken chain, not a silent pass.
    expect(migrate({ v: 1 }, 3, { 2: steps3[2] })).toBeNull();
  });
});

describe('progress rules (DR-040, DR-055, J17, J48)', () => {
  it('goal bits: won, no own ant knocked out, within par', () => {
    expect(goalBits({ won: false, ownKnockOuts: 0, ownTurns: 1, par: 6 })).toBe(0);
    expect(goalBits({ won: true, ownKnockOuts: 1, ownTurns: 9, par: 6 })).toBe(Goal.WON);
    expect(goalBits({ won: true, ownKnockOuts: 0, ownTurns: 9, par: 6 })).toBe(3);
    expect(goalBits({ won: true, ownKnockOuts: 1, ownTurns: 6, par: 6 })).toBe(5);
    expect(goalBits({ won: true, ownKnockOuts: 0, ownTurns: 6, par: 6 })).toBe(7);
  });

  it('acorns follow the cumulative rule: 1 win, 2 with every ant, 3 also within par', () => {
    expect([0, 1, 3, 7].map(acornCount)).toEqual([0, 1, 2, 3]);
    // Par without keeping every ant is still 1.
    expect(acornCount(Goal.WON | Goal.PAR)).toBe(1);
    expect(acornCount(Goal.NO_KO | Goal.PAR)).toBe(0);
  });

  it('wins, losses and skips: linear unlocking, losses in a row, skip stays replayable', () => {
    const s = freshSave();
    expect([1, 2].map((l) => isUnlocked(s, l))).toEqual([true, false]);
    recordLoss(s, 1);
    recordLoss(s, 1);
    recordLoss(s, 1);
    expect(s.progress['1']?.losses).toBe(3);
    recordSkip(s, 1);
    expect(isUnlocked(s, 2)).toBe(true);
    expect(isUnlocked(s, 3)).toBe(false);
    // Clearing a skipped level peels the sticky note off, and ends the loss run.
    recordWin(s, 1, Goal.WON);
    expect(s.progress['1']).toEqual({ done: true, goals: 1, skipped: false, losses: 0 });
    // A better run adds goals; a worse one never takes them away.
    recordWin(s, 1, Goal.WON | Goal.NO_KO | Goal.PAR);
    recordWin(s, 1, Goal.WON);
    expect(s.progress['1']?.goals).toBe(7);
    recordWin(s, 2, Goal.WON | Goal.NO_KO);
    expect(totalAcorns(s)).toBe(5);
    // Skipping a cleared level changes nothing.
    recordSkip(s, 2);
    expect(s.progress['2']?.skipped).toBe(false);
  });
});

describe('ants.match.v1 (DR-047, DR-173)', () => {
  const make = (seed: number | string) => new Match(arenaConfig({ seed, perTeam: 3 }));

  function played(): Match {
    const m = make(21);
    runToAim(m, 0);
    m.push({ kind: 'walk', dir: 1 });
    steps(m, 25);
    m.push({ kind: 'walk', dir: 0 });
    m.push({ kind: 'fire', weapon: 'dewdrop', angleDeci: 520, powerMille: 700 });
    runToAim(m, 1);
    m.push({ kind: 'fire', weapon: 'pollen', angleDeci: 600, powerMille: 650 });
    while (m.phase !== 'turnEnd') m.step();
    return m;
  }

  it('one slot per mode, written at TurnEnd, read back intact', () => {
    const store = new SaveStore(new MemoryStore());
    expect(readSlots(store)).toEqual({ v: 1 });
    const m = played();
    const campaign = slotOf(m, 'build-a', { mode: 'campaign', levelId: '12' });
    expect(writeSlot(store, campaign)).toBe(true);
    const versus = slotOf(m, 'build-a', {
      mode: 'versus',
      setup: defaultTwoPlayer(),
      terrainSeed: 99,
    });
    writeSlot(store, versus);
    expect(readSlots(store)).toEqual({ v: 1, campaign, versus });
    expect(campaign.inputLog).toEqual(m.log);
    expect(campaign.tick).toBe(m.tick);
    clearSlot(store, 'campaign');
    expect(readSlots(store)).toEqual({ v: 1, versus });
    clearSlot(store, 'versus');
    expect(store.read(MATCH_KEY)).toBeNull();
  });

  it('resume re-simulates the match to the saved tick, and play continues identically', () => {
    const store = new SaveStore(new MemoryStore());
    const live = played();
    writeSlot(store, slotOf(live, 'build-a', { mode: 'campaign', levelId: '12' }));

    const slot = readSlots(store).campaign;
    if (!slot) throw new Error('no slot');
    const r = resumeMatch(slot, 'build-a', (s) => make(s.seed));
    if (!r.ok) throw new Error(r.reason);
    expect(r.match.tick).toBe(live.tick);
    expect(r.match.stateHash()).toBe(live.stateHash());
    for (const m of [live, r.match]) {
      runToAim(m, 2);
      m.push({ kind: 'fire', weapon: 'roller', angleDeci: 400, powerMille: 800 });
      steps(m, 400);
    }
    expect(r.match.stateHash()).toBe(live.stateHash());
  });

  it('keeps commands that were pressed on the tick of the save', () => {
    const m = make(21);
    runToAim(m, 0);
    m.push({ kind: 'hop' });
    const slot = slotOf(m, 'b', { mode: 'campaign', levelId: '1' });
    const r = resumeMatch(slot, 'b', (s) => make(s.seed));
    expect(r.ok).toBe(true);
    if (r.ok) {
      r.match.step();
      expect(r.match.activeAnt?.state).toBe('air');
    }
  });

  it('offers Restart instead: another build, a changed level, or a tampered log', () => {
    const live = played();
    const slot = slotOf(live, 'build-a', { mode: 'campaign', levelId: '12' });
    expect(resumeMatch(slot, 'build-b', (s) => make(s.seed))).toEqual({
      ok: false,
      reason: 'build',
    });
    // The level changed under the save: the replay no longer matches.
    expect(resumeMatch(slot, 'build-a', () => make('another seed'))).toEqual({
      ok: false,
      reason: 'failed',
    });
    const cut = { ...slot, inputLog: slot.inputLog.slice(0, -1) };
    expect(resumeMatch(cut, 'build-a', (s) => make(s.seed))).toEqual({
      ok: false,
      reason: 'failed',
    });
    expect(
      resumeMatch(slot, 'build-a', () => {
        throw new Error('level file missing');
      }),
    ).toEqual({ ok: false, reason: 'failed' });
  });

  it('ignores a damaged slot and keeps the other', () => {
    const mem = new MemoryStore();
    const store = new SaveStore(mem);
    const live = played();
    const versus = slotOf(live, 'b', { mode: 'versus', setup: defaultTwoPlayer(), terrainSeed: 1 });
    const bad = [
      { ...versus, mode: 'campaign', tick: -1 },
      { ...versus, mode: 'campaign', inputLog: [{ tick: 5, kind: 'explode' }] },
      {
        ...versus,
        mode: 'campaign',
        inputLog: [
          { tick: 9, kind: 'hop' },
          { tick: 3, kind: 'hop' },
        ],
      },
      { ...versus, mode: 'campaign', buildId: 7 },
      'campaign',
    ];
    for (const campaign of bad) {
      mem.setItem(MATCH_KEY, JSON.stringify({ v: 1, campaign, versus }));
      expect(readSlots(store)).toEqual({ v: 1, versus });
    }
    mem.setItem(MATCH_KEY, '{"v":1,"campaign":');
    expect(readSlots(store)).toEqual({ v: 1 });
    mem.setItem(MATCH_KEY, '{"v":2}');
    expect(readSlots(store)).toEqual({ v: 1 });
  });
});
