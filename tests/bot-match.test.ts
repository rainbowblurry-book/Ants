/**
 * Headless bot-vs-bot matches on the M1 stand-in arena (src/ai/botMatch.ts).
 * The runner drives Match.push / step with the plans' walk, face and fire
 * commands, as the Battle scene will.
 */
import { describe, expect, it } from 'vitest';
import { runBotMatch } from '../src/ai/botMatch.ts';
import { versusMatch } from '../src/game/twoPlayer.ts';
import type { TwoPlayerSetup } from '../src/save/schema.ts';

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

describe('headless bot match', () => {
  it('plays a full match to a result, every shot fired, deterministically', () => {
    const run = () =>
      runBotMatch({ config: versusMatch(SETUP, 'bots-1'), sides: [{ level: 90 }, { level: 30 }] });
    const a = run();
    expect(a.result).not.toBeNull();
    expect(a.result?.reason).toBe('eliminated');
    expect(a.shots.length).toBeGreaterThan(1);
    // Every planned turn fired (no timeouts, no rejected commands).
    expect(a.timeouts).toBe(0);
    expect(a.rejects).toBe(0);
    for (const s of a.shots) expect(s.plan.debug.sims).toBeGreaterThan(0);
    expect(a.shots.length).toBe(a.sims.length);
    for (const n of a.sims) expect(n).toBeLessThanOrEqual(1200);
    const b = run();
    expect(b.stateHash).toBe(a.stateHash);
    expect(b.ticks).toBe(a.ticks);
  });
});
