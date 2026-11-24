/**
 * Stage 5 input (DR-015, DR-121, J8, J53), the notice queue (DR-131) and the
 * two-player slice (DR-182, DR-183, J50).
 */
import { describe, expect, it } from 'vitest';
import { arenaAnts, standInArena, versusMatch } from '../src/game/twoPlayer.ts';
import { hudLayout } from '../src/hud/layout.ts';
import { NOTICE, NoticeQueue } from '../src/hud/notices.ts';
import {
  AimMemory,
  DEFAULT_AIM,
  dialAim,
  Repeater,
  sliderPower,
  slingAim,
} from '../src/input/aim.ts';
import { actionOf, pickIndex } from '../src/input/keys.ts';
import { defaultTwoPlayer } from '../src/save/schema.ts';
import { FIRE_BUFFER_TICKS } from '../src/sim/commands.ts';
import { Match } from '../src/sim/match.ts';
import { isActive } from '../src/sim/movement.ts';
import { runLog } from '../src/sim/replay.ts';
import { GATE_LOCKOUT_TICKS, GATE_PAN_TICKS } from '../src/sim/turn.ts';

/** The two-player setup with "Pass the phone" on (the gate, OVR-014). */
const PASS = { ...defaultTwoPlayer(), passPhone: true };

describe('key map (DR-121)', () => {
  it('maps every DR-121 key', () => {
    const k = (key: string, code?: string) => actionOf({ key, code });
    expect([k('a'), k('A'), k('ArrowLeft')]).toEqual(['walkLeft', 'walkLeft', 'walkLeft']);
    expect([k('d'), k('ArrowRight')]).toEqual(['walkRight', 'walkRight']);
    expect([k('w'), k('ArrowUp'), k('s'), k('ArrowDown')]).toEqual([
      'angleUp',
      'angleUp',
      'angleDown',
      'angleDown',
    ]);
    expect([k('='), k('+'), k('+', 'NumpadAdd'), k('PageUp')]).toEqual(
      new Array(4).fill('powerUp'),
    );
    expect([k('-'), k('-', 'NumpadSubtract'), k('PageDown')]).toEqual(
      new Array(3).fill('powerDown'),
    );
    expect([k(' '), k('Enter')]).toEqual(['fire', 'fire']);
    expect([k('Shift'), k('z'), k('x'), k('t')]).toEqual(['hop', 'hop', 'flip', 'turn']);
    expect([k('q'), k('e'), k('Tab')]).toEqual(['prevWeapon', 'nextWeapon', 'nextWeapon']);
    expect(['1', '2', '3', '4', '5', '6'].map((d) => pickIndex(k(d) ?? 'fire'))).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect([k('c'), k('Escape'), k('p'), k('f')]).toEqual([
      'recentre',
      'pause',
      'pause',
      'fullscreen',
    ]);
    expect(k('7')).toBeNull();
    expect(actionOf({ key: 'r', ctrlKey: true })).toBeNull();
    expect(actionOf({ key: 'a', metaKey: true })).toBeNull();
  });
});

describe('aim (DR-033, DR-121)', () => {
  it('remembers one angle and power per ant, kept across weapons, 45° and 60% at first (OVR-017)', () => {
    const m = new AimMemory();
    expect(m.get(0, 'seed')).toEqual(DEFAULT_AIM);
    m.set(0, 'seed', { angleDeci: 300, powerMille: 800 });
    expect(m.get(0, 'seed')).toEqual({ angleDeci: 300, powerMille: 800 });
    expect(m.get(0, 'dewdrop')).toEqual({ angleDeci: 300, powerMille: 800 });
    expect(m.get(1, 'seed')).toEqual(DEFAULT_AIM);
    m.set(0, 'pollen', { angleDeci: 2000, powerMille: -5 });
    expect(m.get(0, 'pollen')).toEqual({ angleDeci: 900, powerMille: 0 });
  });

  it('stepper: tap 1 step; hold 15/s for 0.3 s, then coarse at 10/s', () => {
    const steps: boolean[] = [];
    const r = new Repeater((coarse) => steps.push(coarse));
    r.down(0);
    expect(steps).toEqual([false]);
    r.update(299);
    // 66.7, 133.3, 200, 266.7 -> 4 fine repeats inside the first 0.3 s.
    expect(steps.filter((c) => !c)).toHaveLength(5);
    r.update(1000);
    const coarse = steps.filter((c) => c).length;
    expect(coarse).toBeGreaterThanOrEqual(6);
    expect(coarse).toBeLessThanOrEqual(8);
    r.up();
    const n = steps.length;
    r.update(5000);
    expect(steps).toHaveLength(n);
  });

  it('dial: the half sets facing, the angle clamps to −20..90 and snaps to 1°', () => {
    expect(dialAim(0, 0, 10, -10, 600, 1)).toEqual({ angleDeci: 450, powerMille: 600, facing: 1 });
    expect(dialAim(0, 0, -10, -10, 600, 1).facing).toBe(-1);
    expect(dialAim(0, 0, -10, -10, 600, 1).angleDeci).toBe(450);
    expect(dialAim(0, 0, 10, 30, 600, 1).angleDeci).toBe(-200);
    expect(dialAim(0, 0, 0, -10, 600, -1)).toMatchObject({ angleDeci: 900, facing: -1 });
    expect(dialAim(0, 0, 100, -17.6, 600, 1).angleDeci % 10).toBe(0);
  });

  it('slider: 160 px track, bottom 0%, top 100%, 1% snap', () => {
    expect(sliderPower(100, 160, 260)).toBe(0);
    expect(sliderPower(100, 160, 100)).toBe(1000);
    expect(sliderPower(100, 160, 180)).toBe(500);
    expect(sliderPower(100, 160, 50)).toBe(1000);
    expect(sliderPower(100, 160, 181) % 10).toBe(0);
  });

  it('slingshot: pull back opposite the shot; power = pull / 150; 20 px dead zone', () => {
    expect(slingAim(0, 0, 10, 10, 1)).toBeNull();
    // Pull down-left 150 px at 45° -> shoot up-right at 100%.
    const a = slingAim(0, 0, -106.07, 106.07, -1);
    expect(a).toEqual({ angleDeci: 450, powerMille: 1000, facing: 1 });
    // Pull right 75 px -> shoot left, flat, 50%.
    expect(slingAim(0, 0, 75, 0, 1)).toEqual({ angleDeci: 0, powerMille: 500, facing: -1 });
    // A pull longer than 150 caps at 100%.
    expect(slingAim(0, 0, -300, 0, 1)?.powerMille).toBe(1000);
  });
});

describe('notice queue (DR-131)', () => {
  const n = (text: string, priority: 'phase' | 'info' | 'suddenDeath', ms = 1600) =>
    ({ text, priority, kind: 'toast', ms }) as const;

  it('orders by priority, collapses duplicates and keeps 3', () => {
    const q = new NoticeQueue();
    q.push(n('a', 'info'));
    q.push(n('a', 'info'));
    q.push(n('b', 'suddenDeath'));
    q.push(n('c', 'info'));
    q.push(n('d', 'info'));
    expect(q.pending.map((p) => p.text)).toEqual(['b', 'a', 'c']);
    expect(q.update(0, false)?.text).toBe('b');
  });

  it('a higher notice preempts after 600 ms; nothing moves while held', () => {
    const q = new NoticeQueue();
    q.push(n('low', 'info'));
    q.update(0, false);
    q.push(n('high', 'phase'));
    expect(q.update(NOTICE.preemptAfterMs - 1, false)?.text).toBe('low');
    expect(q.update(NOTICE.preemptAfterMs, true)?.text).toBe('low');
    expect(q.update(NOTICE.preemptAfterMs, false)?.text).toBe('high');
    expect(q.update(NOTICE.preemptAfterMs + 1600, false)).toBeNull();
  });
});

describe('two-player slice (DR-182, DR-183, OVR-009)', () => {
  it('builds a coin-flip match with the 2P ammo and Jungle Home wind; no gate by default (OVR-014)', () => {
    const cfg = versusMatch(defaultTwoPlayer(), 1234);
    const m = new Match(cfg);
    expect(m.turns.rules.gate).toBe(false);
    expect(m.turns.rules.timerOnInput).toBe(true);
    expect(m.world.friendlyFire).toBe(false);
    const gated = new Match(
      versusMatch({ ...defaultTwoPlayer(), passPhone: true, hitOwnTeam: true }, 1234),
    );
    expect(gated.turns.rules.gate).toBe(true);
    expect(gated.turns.rules.timerOnInput).toBe(false);
    expect(gated.world.friendlyFire).toBe(true);
    expect(m.turns.rules.turnTicks).toBe(30 * 60);
    expect(m.ants).toHaveLength(6);
    expect(m.ants.filter((a) => a.team === 0)).toHaveLength(3);
    expect(m.ammo[0]).toEqual({
      seed: Number.POSITIVE_INFINITY,
      dewdrop: 3,
      pollen: 1,
      grub: 1,
      roller: 2,
      plop: 2,
    });
    const g = m.world.wind.gauge(0);
    expect(Math.abs(g.level)).toBeLessThanOrEqual(2);
    // The coin flip differs between seeds (DR-182).
    const firsts = new Set<number>();
    for (let s = 0; s < 16; s++)
      firsts.add(new Match(versusMatch(defaultTwoPlayer(), s)).turns.team);
    expect(firsts.size).toBe(2);
  });

  it('the arena is mirrored and no spawn lands in a HUD hit rect (J50)', () => {
    const g = standInArena();
    for (let x = 0; x < g.w; x += 7) {
      for (let y = 0; y < g.h; y += 5)
        expect(g.materialAt(x, y)).toBe(g.materialAt(g.w - 1 - x, y));
    }
    const margins = { top: 16, right: 16, bottom: 16, left: 16 };
    for (const per of [2, 3, 4]) {
      const ants = arenaAnts(g, per);
      for (const hand of ['right', 'left'] as const) {
        const l = hudLayout(margins, hand, { weapons: 6 });
        for (const a of ants) {
          for (const id of l.controls) {
            const r = l.rects[id];
            if (!r) continue;
            const inRect = a.x >= r.x && a.x <= r.x + r.w && a.y >= r.y && a.y <= r.y + r.h;
            expect(inRect, `ant ${a.id} at ${a.x},${a.y} in ${id} (${hand})`).toBe(false);
          }
          // Feet stand in the clear band, under the top HUD.
          expect(a.y).toBeGreaterThan(176);
          expect(a.y).toBeLessThan(328);
        }
      }
    }
  });

  it('with "Pass the phone" the gate holds the turn: ready is refused for 500 + 400 ms, then opens Move/Aim', () => {
    const m = new Match(versusMatch(PASS, 7));
    m.push({ kind: 'ready' });
    for (let i = 0; i < 120; i++) m.step();
    expect(m.phase).toBe('turnStart');
    while (m.turns.phaseTick < GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) m.step();
    m.push({ kind: 'ready' });
    m.step();
    m.step();
    expect(m.phase).toBe('aim');
    // The timer only runs from the tap.
    expect(m.turns.timerLeft).toBeGreaterThan(30 * 60 - 5);
  });

  it('without the gate, Move/Aim opens after TurnStart and the timer waits for the first input (OVR-014)', () => {
    const m = new Match(versusMatch(defaultTwoPlayer(), 7));
    while (m.phase !== 'aim') m.step();
    for (let i = 0; i < 600; i++) m.step();
    expect(m.phase).toBe('aim');
    expect(m.turns.timerStarted).toBe(false);
    expect(m.turns.timerLeft).toBe(30 * 60);
    // walk 0 and cancel are not inputs; ready is.
    m.push({ kind: 'walk', dir: 0 });
    m.push({ kind: 'cancel' });
    for (let i = 0; i < 10; i++) m.step();
    expect(m.turns.timerLeft).toBe(30 * 60);
    m.push({ kind: 'ready' });
    for (let i = 0; i < 11; i++) m.step();
    expect(m.turns.timerStarted).toBe(true);
    // The ready lands on the first of the 11 ticks, and that tick counts.
    expect(m.turns.timerLeft).toBe(30 * 60 - 11);
    // Each turn waits again.
    const turn = m.turns.turn;
    while (m.turns.turn === turn || m.phase !== 'aim') m.step();
    for (let i = 0; i < 30; i++) m.step();
    expect(m.turns.timerLeft).toBe(30 * 60);
  });

  it('a walk held through TurnStart starts the timer when Move/Aim opens (OVR-014)', () => {
    const m = new Match(versusMatch(defaultTwoPlayer(), 7));
    m.push({ kind: 'walk', dir: 1 });
    while (m.phase !== 'aim') m.step();
    for (let i = 0; i < 30; i++) m.step();
    expect(m.turns.timerStarted).toBe(true);
    expect(m.turns.timerLeft).toBeLessThan(30 * 60);
  });

  it('a walk also starts the waiting timer, and a replay gives the same state (OVR-014)', () => {
    const m = new Match(versusMatch(defaultTwoPlayer(), 9));
    while (m.phase !== 'aim') m.step();
    m.push({ kind: 'walk', dir: 1 });
    for (let i = 0; i < 20; i++) m.step();
    m.push({ kind: 'walk', dir: 0 });
    for (let i = 0; i < 20; i++) m.step();
    expect(m.turns.timerStarted).toBe(true);
    const r = new Match(versusMatch(defaultTwoPlayer(), 9));
    runLog(r, m.log, m.tick);
    expect(r.stateHash()).toBe(m.stateHash());
  });

  const toAim = (seed: number) => {
    const m = new Match(versusMatch(PASS, seed));
    while (m.turns.phaseTick < GATE_PAN_TICKS + GATE_LOCKOUT_TICKS) m.step();
    m.push({ kind: 'ready' });
    while (m.phase !== 'aim') m.step();
    for (let i = 0; i < 40; i++) m.step();
    return m;
  };
  const fireCmd = { kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 500 } as const;

  it('fire pressed just before landing is buffered and fires on landing (DR-015)', () => {
    const m = toAim(11);
    expect(isActive(m.activeAnt as never)).toBe(true);
    m.push({ kind: 'hop' });
    m.step();
    expect(m.activeAnt?.state).toBe('air');
    // Falling at 250 px/s: about 5 ticks from landing at the hop's speed.
    while ((m.activeAnt?.vy ?? 0) <= 250) m.step();
    expect(m.activeAnt?.state).toBe('air');
    m.push(fireCmd);
    let t = 0;
    while (m.phase === 'aim' && t < FIRE_BUFFER_TICKS) {
      m.step();
      t++;
    }
    expect(m.phase).toBe('fire');
    expect(t).toBeGreaterThan(1);
    expect(m.events.some((e) => e.kind === 'reject')).toBe(false);
  });

  it('fire pressed at the start of a hop runs out of buffer and is dropped as late', () => {
    const m = toAim(11);
    m.push({ kind: 'hop' });
    m.step();
    m.push(fireCmd);
    while (m.activeAnt?.state === 'air') m.step();
    for (let i = 0; i < 30; i++) m.step();
    expect(m.phase).toBe('aim');
    expect(
      m.events.some((e) => e.kind === 'reject' && e.command === 'fire' && e.why === 'late'),
    ).toBe(true);
  });
});
