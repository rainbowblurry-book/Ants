/**
 * Mid-match save `ants.match.v1` (DR-047, DR-173, J18): one slot per mode,
 * holding what is needed to re-simulate the match, not a snapshot.
 *
 * The slot is written at every TurnEnd. Resume builds the same match again
 * and replays the input log. A different build id, a log that no longer
 * fits, or a state hash that differs all mean "offer Restart instead".
 *
 * OVR-004: the slot also stores the tick it was saved on and the state hash
 * at that tick. PLAN §1 lists only {levelId|setup, seed, buildId, inputLog}.
 */
import { type Command, isValidCommand } from '../sim/commands.ts';
import type { Match } from '../sim/match.ts';
import { runLog } from '../sim/replay.ts';
import type { TwoPlayerSetup } from './schema.ts';
import type { SaveStore } from './store.ts';

export const MATCH_KEY = 'ants.match.v1';

export type MatchMode = 'campaign' | 'versus';

export interface MatchSlot {
  mode: MatchMode;
  /** Campaign: the level id ("0a", "0b", "1" to "100"). */
  levelId?: string;
  /** Two-player: the setup the match was started with, and its terrain seed. */
  setup?: TwoPlayerSetup;
  terrainSeed?: number;
  /** The match seed (coin flip, wind, spread). */
  seed: number | string;
  buildId: string;
  /** The tick the slot was saved on, and the sim state hash there. */
  tick: number;
  hash: number;
  inputLog: Command[];
}

export interface MatchSlots {
  v: 1;
  campaign?: MatchSlot;
  versus?: MatchSlot;
}

function parseSlot(v: unknown, mode: MatchMode): MatchSlot | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const s = v as Partial<MatchSlot>;
  if (s.mode !== mode || typeof s.buildId !== 'string') return undefined;
  if (typeof s.seed !== 'number' && typeof s.seed !== 'string') return undefined;
  if (!Number.isInteger(s.tick) || (s.tick as number) < 0) return undefined;
  if (!Number.isInteger(s.hash) || !Array.isArray(s.inputLog)) return undefined;
  let last = 0;
  for (const c of s.inputLog) {
    if (typeof c !== 'object' || c === null) return undefined;
    if (!Number.isInteger(c.tick) || c.tick < last || c.tick > (s.tick as number) + 1) {
      return undefined;
    }
    if (!isValidCommand(c)) return undefined;
    last = c.tick;
  }
  return s as MatchSlot;
}

/** Reads both slots. A missing or damaged slot is simply absent. */
export function readSlots(store: SaveStore): MatchSlots {
  const out: MatchSlots = { v: 1 };
  const text = store.read(MATCH_KEY);
  if (text === null) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return out;
  }
  if (typeof parsed !== 'object' || parsed === null || (parsed as MatchSlots).v !== 1) return out;
  const campaign = parseSlot((parsed as MatchSlots).campaign, 'campaign');
  const versus = parseSlot((parsed as MatchSlots).versus, 'versus');
  if (campaign) out.campaign = campaign;
  if (versus) out.versus = versus;
  return out;
}

/** Replaces the slot of `slot.mode`; the other mode's slot is kept. */
export function writeSlot(store: SaveStore, slot: MatchSlot): boolean {
  const slots = readSlots(store);
  slots[slot.mode] = slot;
  return store.write(MATCH_KEY, JSON.stringify(slots));
}

/** Removes one mode's slot (match finished, Restart, or the crash-loop breaker). */
export function clearSlot(store: SaveStore, mode: MatchMode): void {
  const slots = readSlots(store);
  delete slots[mode];
  if (!slots.campaign && !slots.versus) store.remove(MATCH_KEY);
  else store.write(MATCH_KEY, JSON.stringify(slots));
}

/** What to store for a running match. Call it at TurnEnd (DR-047). */
export function slotOf(
  match: Match,
  buildId: string,
  what:
    | { mode: 'campaign'; levelId: string }
    | { mode: 'versus'; setup: TwoPlayerSetup; terrainSeed: number },
): MatchSlot {
  return {
    ...what,
    seed: match.seed,
    buildId,
    tick: match.tick,
    hash: match.stateHash(),
    inputLog: match.log.slice(),
  };
}

export type Resume =
  | { ok: true; match: Match }
  /** `build`: saved by another build. `failed`: the replay did not reproduce the match. */
  | { ok: false; reason: 'build' | 'failed' };

/**
 * Rebuilds a saved match (DR-047). `make` creates the match exactly as it was
 * created the first time, from the slot's level or setup and its seed.
 */
export function resumeMatch(
  slot: MatchSlot,
  buildId: string,
  make: (s: MatchSlot) => Match,
): Resume {
  if (slot.buildId !== buildId) return { ok: false, reason: 'build' };
  try {
    const match = make(slot);
    runLog(match, slot.inputLog, slot.tick, true);
    if (match.tick !== slot.tick || match.stateHash() !== slot.hash) {
      return { ok: false, reason: 'failed' };
    }
    return { ok: true, match };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
