/**
 * Progress save `ants.save.v1` (DR-018, DR-047, DR-055, DR-070, DR-071,
 * DR-161, DR-170, DR-182, J18, J48).
 *
 * Plain data only. `normalise` turns anything into a valid save: missing or
 * bad values fall back to defaults (DR-182), so the game never reads a field
 * it has not checked.
 */
import { WEAPON_IDS, type WeaponId } from '../sim/weapons/types.ts';

export const SAVE_VERSION = 1;

/** The three goals of a level, one bit each (J48). */
export const Goal = { WON: 1, NO_KO: 2, PAR: 4 } as const;
export const ALL_GOALS = Goal.WON | Goal.NO_KO | Goal.PAR;

export interface LevelProgress {
  /** Cleared at least once. */
  done: boolean;
  /** Goal bits ever earned on this level (`Goal`). */
  goals: number;
  /** Skipped with "Skip for now" (DR-055). Cleared again by a win. */
  skipped: boolean;
  /** Losses in a row, for the tip (2) and the skip offer (3, or 5 on bosses). */
  losses: number;
}

export type PreviewResult = '' | 'win' | 'lose';

export interface Level0Progress {
  /** Part 1 (practice) finished. */
  p1Done: boolean;
  /** Sneak Shot trial weapons already tried (DR-070). */
  trialsUsed: WeaponId[];
  /** The one-try Level 70 Preview: not played, won or lost. */
  previewResult: PreviewResult;
}

export interface WardrobeSlot {
  trinket: string | null;
  dance: string | null;
  nickname: string | null;
}

export type ReducedMotion = 'auto' | 'on' | 'off';
export type TextSize = 'normal' | 'large';

export interface TwoPlayerSetup {
  /** Team names, from the preset list (J44). */
  names: [string, string];
  /** Ants per team, 2 to 4. */
  ants: number;
  /** Arena index: 0 to 9 are the biomes, 10 is Random (DR-181). */
  arena: number;
  /** Turn timer in seconds. */
  timer: 30 | 60;
  /** "Starter kit only". */
  starter: boolean;
  pickups: boolean;
  /** "Pass the phone": a tap gate at every TurnStart (DR-045). Off by default (OVR-014). */
  passPhone: boolean;
  /** "Hit own team": blasts hurt the shooter's team (DR-035). Off by default (OVR-015). */
  hitOwnTeam: boolean;
}

export interface Settings {
  /** 0 to 100. */
  music: number;
  sfx: number;
  /** Assist aim preview, 1.0 s (DR-033). */
  assist: boolean;
  /** Relaxed turns, 60 s (DR-043). */
  relaxedTurns: boolean;
  showTips: boolean;
  leftHanded: boolean;
  reducedMotion: ReducedMotion;
  textSize: TextSize;
  performanceMode: boolean;
  language: string;
  twoPlayer: TwoPlayerSetup;
}

export interface SaveV1 {
  v: 1;
  /** Keyed by level id ("1" to "100"). */
  progress: Record<string, LevelProgress>;
  level0: Level0Progress;
  /** Biome numbers as strings, plus "epilogue" (DR-113). */
  comicsSeen: string[];
  /** Ids of everything earned: weapons, trinkets, stickers, dances, nicknames. */
  unlocks: string[];
  /** Keyed by ant slot ("0" to "3"); both teams read the same slots (DR-161). */
  wardrobe: Record<string, WardrobeSlot>;
  settings: Settings;
}

export function defaultTwoPlayer(): TwoPlayerSetup {
  return {
    names: ['Blue Caps', 'Amber Caps'],
    ants: 3,
    arena: 0,
    timer: 30,
    starter: false,
    pickups: false,
    passPhone: false,
    hitOwnTeam: false,
  };
}

export function defaultSettings(): Settings {
  return {
    music: 70,
    sfx: 80,
    assist: false,
    relaxedTurns: false,
    showTips: true,
    leftHanded: false,
    reducedMotion: 'auto',
    textSize: 'normal',
    performanceMode: false,
    language: 'en',
    twoPlayer: defaultTwoPlayer(),
  };
}

export function freshSave(): SaveV1 {
  return {
    v: 1,
    progress: {},
    level0: { p1Done: false, trialsUsed: [], previewResult: '' },
    comicsSeen: [],
    unlocks: [],
    wardrobe: {},
    settings: defaultSettings(),
  };
}

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}

function int(v: unknown, lo: number, hi: number, d: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : d;
}

function oneOf<T extends string | number>(v: unknown, allowed: readonly T[], d: T): T {
  return allowed.includes(v as T) ? (v as T) : d;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null;
}

function strings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const s of v) if (typeof s === 'string' && s.length <= 64 && !out.includes(s)) out.push(s);
  return out;
}

function normaliseTwoPlayer(v: unknown): TwoPlayerSetup {
  const d = defaultTwoPlayer();
  if (!isDict(v)) return d;
  const names = Array.isArray(v.names) ? v.names : [];
  return {
    names: [strOrNull(names[0]) ?? d.names[0], strOrNull(names[1]) ?? d.names[1]],
    ants: int(v.ants, 2, 4, d.ants),
    arena: int(v.arena, 0, 10, d.arena),
    timer: oneOf(v.timer, [30, 60] as const, d.timer),
    starter: bool(v.starter, d.starter),
    pickups: bool(v.pickups, d.pickups),
    passPhone: bool(v.passPhone, d.passPhone),
    hitOwnTeam: bool(v.hitOwnTeam, d.hitOwnTeam),
  };
}

function normaliseSettings(v: unknown): Settings {
  const d = defaultSettings();
  if (!isDict(v)) return d;
  return {
    music: int(v.music, 0, 100, d.music),
    sfx: int(v.sfx, 0, 100, d.sfx),
    assist: bool(v.assist, d.assist),
    relaxedTurns: bool(v.relaxedTurns, d.relaxedTurns),
    showTips: bool(v.showTips, d.showTips),
    leftHanded: bool(v.leftHanded, d.leftHanded),
    reducedMotion: oneOf(v.reducedMotion, ['auto', 'on', 'off'] as const, d.reducedMotion),
    textSize: oneOf(v.textSize, ['normal', 'large'] as const, d.textSize),
    performanceMode: bool(v.performanceMode, d.performanceMode),
    language: strOrNull(v.language) ?? d.language,
    twoPlayer: normaliseTwoPlayer(v.twoPlayer),
  };
}

/** Level ids are "1" to "100". */
function isLevelId(k: string): boolean {
  return /^[1-9][0-9]{0,2}$/.test(k) && Number(k) <= 100;
}

/** Builds a valid save from any object. Unknown keys are dropped. */
export function normalise(v: unknown): SaveV1 {
  const out = freshSave();
  if (!isDict(v)) return out;
  if (isDict(v.progress)) {
    for (const [k, p] of Object.entries(v.progress)) {
      if (!isLevelId(k) || !isDict(p)) continue;
      out.progress[k] = {
        done: bool(p.done, false),
        goals: int(p.goals, 0, ALL_GOALS, 0),
        skipped: bool(p.skipped, false),
        losses: int(p.losses, 0, 9999, 0),
      };
    }
  }
  if (isDict(v.level0)) {
    out.level0 = {
      p1Done: bool(v.level0.p1Done, false),
      trialsUsed: strings(v.level0.trialsUsed).filter((s): s is WeaponId =>
        (WEAPON_IDS as readonly string[]).includes(s),
      ),
      previewResult: oneOf(v.level0.previewResult, ['', 'win', 'lose'] as const, ''),
    };
  }
  out.comicsSeen = strings(v.comicsSeen);
  out.unlocks = strings(v.unlocks);
  if (isDict(v.wardrobe)) {
    for (const [k, w] of Object.entries(v.wardrobe)) {
      if (!/^[0-3]$/.test(k) || !isDict(w)) continue;
      out.wardrobe[k] = {
        trinket: strOrNull(w.trinket),
        dance: strOrNull(w.dance),
        nickname: strOrNull(w.nickname),
      };
    }
  }
  out.settings = normaliseSettings(v.settings);
  return out;
}

// --------------------------------------------------------------- progress

/**
 * Acorns for a set of goal bits, by DR-055's cumulative rule (J48): 1 for the
 * win, 2 if no own ant was knocked out as well, 3 if it was also within par.
 */
export function acornCount(goals: number): number {
  if ((goals & Goal.WON) === 0) return 0;
  if ((goals & Goal.NO_KO) === 0) return 1;
  return (goals & Goal.PAR) === 0 ? 2 : 3;
}

/** Goal bits for one finished match (DR-040, DR-055). */
export function goalBits(r: { won: boolean; ownKnockOuts: number; ownTurns: number; par: number }) {
  if (!r.won) return 0;
  return Goal.WON | (r.ownKnockOuts === 0 ? Goal.NO_KO : 0) | (r.ownTurns <= r.par ? Goal.PAR : 0);
}

function entry(save: SaveV1, levelId: number): LevelProgress {
  const k = String(levelId);
  let p = save.progress[k];
  if (!p) {
    p = { done: false, goals: 0, skipped: false, losses: 0 };
    save.progress[k] = p;
  }
  return p;
}

/** A win: the level is done, its goals are added, and the loss run ends. */
export function recordWin(save: SaveV1, levelId: number, goals: number): void {
  const p = entry(save, levelId);
  p.done = true;
  p.goals |= goals & ALL_GOALS;
  p.skipped = false;
  p.losses = 0;
}

/** A loss (or a draw, DR-044): one more in a row. */
export function recordLoss(save: SaveV1, levelId: number): void {
  entry(save, levelId).losses += 1;
}

/** "Skip for now" (DR-055): the next level opens; this one stays replayable. */
export function recordSkip(save: SaveV1, levelId: number): void {
  const p = entry(save, levelId);
  if (!p.done) p.skipped = true;
}

/** Linear unlocking (DR-055): L1 is open; the rest open when the one before is cleared or skipped. */
export function isUnlocked(save: SaveV1, levelId: number): boolean {
  if (levelId <= 1) return true;
  const prev = save.progress[String(levelId - 1)];
  return !!prev && (prev.done || prev.skipped);
}

export function totalAcorns(save: SaveV1): number {
  let n = 0;
  for (const p of Object.values(save.progress)) n += acornCount(p.goals);
  return n;
}
