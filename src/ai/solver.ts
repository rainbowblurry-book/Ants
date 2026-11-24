/**
 * The shot solver (DR-060, J9, J22; DR-009 bot notes), run as a time-sliced
 * job.
 *
 * Search, per (target, weapon) pair:
 *   1. Sweep 15 angles, 15°..85° in 5° steps. At each, find the power that
 *      lands on the target: a power search seeded by a vacuum-ballistics
 *      guess, kept inside a [short, long] bracket and finished by
 *      interpolation (a safeguarded bisection, so it always converges).
 *      Score every sim.
 *   2. Keep the 3 best angles and refine each on a 3×3 grid at ±0.3° and
 *      ±3‰ (the nearest integer steps to 0.25° and 0.25%, DR-011 units).
 *      The Roller gets an extra ±2% power refine, because landing is not
 *      monotonic in power on slopes (DR-009).
 * Targets: the 2 best enemies by a cheap pre-score (distance and HP).
 * Weapons: every weapon with ammo, never the Plop (DR-009).
 * Score = Σ enemy damage + 20 per enemy KO − 20 per ally KO
 *       + 0.2·(100 − targetHP)/100 − 1.5·self − 1.0·ally   (DR-060).
 * Tie-break (J22): within 2 points of the best, 40°..65° shots rank first.
 * Move first (DR-060): if the best score is < 12 or its self-damage > 5,
 * try up to 3 walk strides of 40 px (the walk is simulated with the real
 * movement code on a copy of the ant), each with an 8-angle grid.
 *
 * Budget: ≤ 250 sims per pair (≤ 120 with 5 or more weapons), ≤ 1,200 per
 * turn. A share of the turn cap is held back for the move-first check.
 *
 * Slicing: the job yields after every simulated shot, so `step(maxSims)` runs
 * exactly that many sims. The AI never reads a clock; the scene picks
 * maxSims. Pollen and Grub change the terrain during a shot, so they run on
 * one scratch grid reset from the live grid before each sim (a plain copy of
 * the cells) instead of a fresh clone per sim; that is the same physics as
 * `simulateShot`, at a fraction of the cost (tests/solver.test.ts checks
 * they agree).
 *
 * Never mutates the live world. Pure TS: no Phaser, no clock, no banned Math.
 */

import { WALK_BUDGET } from '../sim/movement.ts';
import { type Ant, antSpeed, isActive, stepAnt, walkStep } from '../sim/movement.ts';
import { ANT_CAPSULE, GRAVITY, LAUNCH_BASE, LAUNCH_RANGE } from '../sim/physics.ts';
import type { Ammo } from '../sim/pickups.ts';
import { Rng } from '../sim/rng.ts';
import type { TerrainGrid } from '../sim/terrain.ts';
import { cosDeci, sinDeci } from '../sim/trig.ts';
import { SETTLE_SPEED } from '../sim/turn.ts';
import {
  fire,
  shotLive,
  stepShot,
  WEAPON_IDS,
  WEAPONS,
  type WeaponId,
  type World,
} from '../sim/weapons/index.ts';
import type { WindField } from '../sim/wind.ts';
import {
  SHOT_SIM_MAX_TICKS,
  type ShotSimInput,
  type ShotSimResult,
  simulateShot,
} from './shotSim.ts';
import type { Candidate, MovePlan } from './types.ts';

// ------------------------------------------------------------- constants

/** DR-060 angle sweep: 15°..85° in 5° steps (0.1° units). */
export const SWEEP_ANGLES: readonly number[] = [
  150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850,
];
/** DR-060 move-first: a reduced 8-angle grid, 15°..85° in 10° steps. */
export const STRIDE_ANGLES: readonly number[] = [150, 250, 350, 450, 550, 650, 750, 850];
/** Refine steps: 0.25° and 0.25% rounded to the integer units (0.1°, ‰). */
export const REFINE_DECI = 3;
export const REFINE_MILLE = 3;
/** DR-009: the Roller's extra power refine, ±2%. */
export const ROLLER_REFINE_MILLE = 20;
/** Top angles kept for the refine. */
export const TOP_N = 3;
/** DR-060 caps. */
export const SIMS_PER_PAIR = 250;
export const SIMS_PER_PAIR_MANY = 120;
export const MANY_WEAPONS = 5;
export const SIMS_PER_TURN = 1200;
/** Targets searched (DR-060). */
export const TARGETS = 2;
/** Move-first trigger (DR-060). */
export const MOVE_BELOW_SCORE = 12;
export const MOVE_SELF_DAMAGE = 5;
export const STRIDE_PX = 40;
export const STRIDES = 3;
/** (weapon, target) pairs re-searched at each stride. */
export const STRIDE_PAIRS = 2;
/** Power-search sims per angle: the most in the sweep, and at a stride. */
export const SIMS_PER_ANGLE = 8;
export const SIMS_PER_STRIDE_ANGLE = 5;
/** Sims held back from the main search for the move-first check. */
export const MOVE_RESERVE =
  STRIDES * STRIDE_PAIRS * STRIDE_ANGLES.length * SIMS_PER_STRIDE_ANGLE + TOP_N * 8;
/** Landing within this many px of the target x ends a power search. */
export const LAND_TOL_PX = 1;
/** Tie-break band (J22). */
export const TIE_POINTS = 2;
export const PREFER_MIN_DECI = 400;
export const PREFER_MAX_DECI = 650;
/** Score weights (DR-060). */
export const KO_POINTS = 20;
export const SELF_WEIGHT = 1.5;
export const ALLY_WEIGHT = 1.0;
export const HP_TIE_WEIGHT = 0.2;
/** Pre-score: px of distance one HP is worth. */
export const PRE_HP_PX = 3;
/** Walk simulation limits (ticks). */
const WALK_MAX_TICKS = 240;
const REST_MAX_TICKS = 300;
const AIM_MIN = -200;
const AIM_MAX = 900;

// ------------------------------------------------------------- types

export interface SolverInput {
  /** The live world. Never mutated. */
  world: World;
  shooter: number;
  /** The shooter's team ammo. */
  ammo: Readonly<Ammo>;
  /** The wind the bot plans against (the error model's perceived wind). */
  wind: WindField;
  /** The true wind, used for the Grub (DR-009: bots ignore wind error for it). Default `wind`. */
  trueWind?: WindField;
  /** Ticks from now until the shot fires, so tick-based wind is read at the right phase. */
  fireDelay?: number;
  /** Allow the move-first check (default true). */
  allowMove?: boolean;
  /** Restrict the weapons searched (tests); still filtered by ammo and the Plop rule. */
  weapons?: readonly WeaponId[];
  /** Per-turn sim cap (default 1,200; DR-060). */
  maxSims?: number;
}

/** A walk the bot makes before shooting, with the hold length the Battle scene plays. */
export interface BotMove extends MovePlan {
  /** Ticks to hold the walk. */
  ticks: number;
  /** Ticks after the walk until the ant is at rest (ground, speed < 8). */
  restTicks: number;
  /** Where the ant ends up (feet). */
  x: number;
  y: number;
}

export interface SolverResult {
  /** Best first, distinct shots (one per refined top angle per pair). */
  ranked: Candidate[];
  move: BotMove | null;
  sims: number;
  /** Sims per weapon (for tests and logs). */
  simsByWeapon: Record<WeaponId, number>;
  /** Best score before the move check (from where the ant stands). */
  standScore: number;
}

export interface SolverJob {
  step(maxSims: number): void;
  readonly done: boolean;
  readonly result: SolverResult | null;
  readonly sims: number;
}

/** Internal: one scored sim. */
interface Eval {
  angleDeci: number;
  powerMille: number;
  score: number;
  self: number;
  /** Signed landing error past the target along the facing (px). */
  past: number;
}

/** A shooting position: the original stand or a stride. */
interface Stand {
  ants: Ant[];
  /** Extra ticks before the shot (walking). */
  delay: number;
  /** Score penalty of getting here (fall damage). */
  penalty: number;
}

// ------------------------------------------------------------- scoring

export interface ShotScore {
  score: number;
  enemy: number;
  self: number;
  ally: number;
}

/** DR-060 score of one simulated shot by `shooter` aimed at `target`. */
export function scoreShot(
  res: ShotSimResult,
  ants: readonly Ant[],
  shooter: number,
  target: number,
): ShotScore {
  const me = ants[shooter] as Ant;
  let enemy = 0;
  let self = 0;
  let ally = 0;
  for (let i = 0; i < ants.length; i++) {
    const d = res.damage[i] ?? 0;
    if (d === 0) continue;
    const a = ants[i] as Ant;
    if (i === shooter) self += d;
    else if (a.team === me.team) ally += d;
    else enemy += d;
  }
  let ko = 0;
  for (const i of res.kos) {
    const a = ants[i] as Ant;
    if (a.team === me.team) ko -= KO_POINTS;
    else ko += KO_POINTS;
  }
  const thp = ants[target]?.hp ?? 100;
  const score =
    enemy + ko + (HP_TIE_WEIGHT * (100 - thp)) / 100 - SELF_WEIGHT * self - ALLY_WEIGHT * ally;
  return { score, enemy, self, ally };
}

function inBand(angleDeci: number): boolean {
  return angleDeci >= PREFER_MIN_DECI && angleDeci <= PREFER_MAX_DECI;
}

/**
 * Ranks candidates best first: within TIE_POINTS of the best score, 40°–65°
 * shots come first (J22); then score, less self-damage, weapon order,
 * target, angle, power (all deterministic).
 */
export function rankCandidates(list: readonly Candidate[]): Candidate[] {
  let best = Number.NEGATIVE_INFINITY;
  for (const c of list) if (c.score > best) best = c.score;
  const group = (c: Candidate) =>
    c.score >= best - TIE_POINTS ? (inBand(c.angleDeci) ? 0 : 1) : 2;
  return list.slice().sort((a, b) => {
    const g = group(a) - group(b);
    if (g !== 0) return g;
    if (a.score !== b.score) return b.score - a.score;
    if (a.selfDamage !== b.selfDamage) return a.selfDamage - b.selfDamage;
    const w = WEAPON_IDS.indexOf(a.weapon) - WEAPON_IDS.indexOf(b.weapon);
    if (w !== 0) return w;
    if (a.target !== b.target) return a.target - b.target;
    if (a.angleDeci !== b.angleDeci) return a.angleDeci - b.angleDeci;
    return a.powerMille - b.powerMille;
  });
}

/** Better-than for evals of one pair: score, then landing error, then band, then angle. */
function better(a: Eval, b: Eval | null): boolean {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  const ea = a.past < 0 ? -a.past : a.past;
  const eb = b.past < 0 ? -b.past : b.past;
  if (ea !== eb) return ea < eb;
  if (inBand(a.angleDeci) !== inBand(b.angleDeci)) return inBand(a.angleDeci);
  if (a.angleDeci !== b.angleDeci) return a.angleDeci < b.angleDeci;
  return a.powerMille < b.powerMille;
}

// ------------------------------------------------------------- targets, weapons

/** The active enemies of `shooter`, best first by pre-score (distance + 3·HP). */
export function pickTargets(ants: readonly Ant[], shooter: number, n = TARGETS): number[] {
  const me = ants[shooter] as Ant;
  const out: { i: number; cost: number }[] = [];
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i] as Ant;
    if (a.team === me.team || !isActive(a)) continue;
    const dx = a.x - me.x;
    out.push({ i, cost: (dx < 0 ? -dx : dx) + PRE_HP_PX * a.hp });
  }
  out.sort((a, b) => (a.cost !== b.cost ? a.cost - b.cost : a.i - b.i));
  return out.slice(0, n).map((o) => o.i);
}

/** Weapons with ammo, in tray order, never the Plop (DR-009). */
export function usableWeapons(ammo: Readonly<Ammo>, only?: readonly WeaponId[]): WeaponId[] {
  return WEAPON_IDS.filter(
    (w) => w !== 'plop' && ammo[w] > 0 && (only === undefined || only.includes(w)),
  );
}

// ------------------------------------------------------------- ballistics guess

/**
 * Vacuum-ballistics power (‰) to cover `dist` px horizontally and rise `h` px
 * (up positive) at `angleDeci`. Only a starting guess for the power search.
 */
export function guessPower(angleDeci: number, dist: number, h: number, wMul: number): number {
  const d = dist < 1 ? 1 : dist;
  const c = cosDeci(angleDeci);
  const s = sinDeci(angleDeci);
  const denom = 2 * c * (d * s - h * c);
  if (!(denom > 0)) return 1000;
  const v = d * Math.sqrt(GRAVITY / denom);
  const p = ((v / wMul - LAUNCH_BASE) / LAUNCH_RANGE) * 1000;
  if (!(p > 0)) return 0;
  return p > 1000 ? 1000 : Math.round(p);
}

// ------------------------------------------------------------- walking

/**
 * Simulates the bot holding a walk for `px` px on a copy of the ant, tick by
 * tick, exactly as the turn machine does (walkStep while grounded, stepAnt
 * otherwise), then lets it come to rest. Returns null if the walk goes
 * nowhere or ends badly (knocked out, in water).
 */
export function simulateWalk(
  grid: TerrainGrid,
  ant: Ant,
  dir: 1 | -1,
  px: number,
): { ant: Ant; move: BotMove; fallDamage: number } | null {
  if (ant.state !== 'ground' || px <= 0) return null;
  const a: Ant = { ...ant };
  let walked = 0;
  let ticks = 0;
  let stuck = 0;
  while (walked < px && ticks < WALK_MAX_TICKS && a.state !== 'ko') {
    ticks++;
    if (a.state === 'ground') {
      const d = walkStep(a, grid, dir);
      walked += d;
      stuck = d === 0 ? stuck + 1 : 0;
      if (stuck >= 2 || a.budget <= 0) break;
    } else {
      stepAnt(a, grid);
    }
  }
  if (stuck >= 2) ticks -= stuck; // the stuck ticks did nothing
  let rest = 0;
  while (
    rest < REST_MAX_TICKS &&
    a.state !== 'ko' &&
    (a.state !== 'ground' || antSpeed(a) >= SETTLE_SPEED)
  ) {
    rest++;
    stepAnt(a, grid);
  }
  if (a.state !== 'ground' || a.waterTicks > 0 || a.skipNextTurn) return null;
  const moved = a.x - ant.x;
  if ((moved < 0 ? -moved : moved) < 1 || ticks <= 0) return null;
  return {
    ant: a,
    move: { dir, px: Math.round(walked), ticks, restTicks: rest, x: a.x, y: a.y },
    fallDamage: ant.hp - a.hp,
  };
}

// ------------------------------------------------------------- the search

/**
 * Puts back every cell the shot changed on the scratch grid: each terrain
 * change (erase, fill, fragment removal) pushes a dirty rect, so copying
 * those rects from the live grid restores it exactly.
 */
function restoreDirty(scratch: TerrainGrid, live: TerrainGrid): void {
  const w = scratch.w;
  for (const r of scratch.drainDirty()) {
    for (let y = r.y; y < r.y + r.h; y++) {
      const i = y * w + r.x;
      scratch.cells.set(live.cells.subarray(i, i + r.w), i);
    }
  }
}

const MUTATES: Readonly<Record<WeaponId, boolean>> = {
  seed: false,
  dewdrop: false,
  roller: false,
  pollen: true,
  grub: true,
  plop: true,
};

/**
 * `simulateShot` for the terrain-changing weapons (Pollen, Grub), on a scratch
 * copy of the live grid instead of a fresh clone per sim: the same `fire` +
 * `stepShot` loop, then the changed cells are copied back from the live grid.
 * `scratch` must equal `input.world.grid` on entry, and does again on return.
 */
export function simulateOnScratch(input: ShotSimInput, scratch: TerrainGrid): ShotSimResult {
  const src = input.world;
  const world: World = {
    grid: scratch,
    ants: src.ants.map((a) => ({ ...a })),
    wind: input.wind ?? src.wind,
    tick: src.tick,
    spread: new Rng(src.spread.getState()),
    pickups: [],
    friendlyFire: src.friendlyFire,
    dry: false,
  };
  scratch.drainDirty();
  const shot = fire(world, input.shooter, input.weapon, input.angleDeci, input.powerMille);
  let ticks = 0;
  while (shotLive(shot) && ticks < SHOT_SIM_MAX_TICKS) {
    world.tick++;
    ticks++;
    stepShot(world, shot);
  }
  restoreDirty(scratch, src.grid);
  const blasts: ShotSimResult['blasts'] = [];
  let impact: ShotSimResult['impact'] = null;
  let fizzled = false;
  for (const e of shot.events) {
    if (e.kind === 'blast') {
      blasts.push({ x: e.blast.x, y: e.blast.y, r: e.blast.r, direct: e.blast.direct });
      if (!impact) impact = { x: e.blast.x, y: e.blast.y };
    } else if (e.kind === 'fizzle' && !impact) {
      impact = { x: e.x, y: e.y };
      fizzled = true;
    }
  }
  const kos: number[] = [];
  for (let i = 0; i < world.ants.length; i++) {
    const before = src.ants[i] as Ant;
    const after = world.ants[i] as Ant;
    if (before.state !== 'ko' && after.hp <= 0) kos.push(i);
  }
  return { blasts, impact, fizzled, damage: shot.dealt.slice(), kos, ticks, events: shot.events };
}

class Search {
  readonly input: SolverInput;
  readonly world: World;
  readonly shooter: number;
  readonly team: number;
  sims = 0;
  readonly simsByWeapon: Record<WeaponId, number> = {
    seed: 0,
    dewdrop: 0,
    pollen: 0,
    grub: 0,
    roller: 0,
    plop: 0,
  };
  readonly cap: number;
  private scratch: TerrainGrid | null = null;

  constructor(input: SolverInput) {
    this.input = input;
    this.world = input.world;
    this.shooter = input.shooter;
    const me = input.world.ants[input.shooter];
    if (!me) throw new RangeError('solver: no shooter');
    this.team = me.team;
    this.cap = input.maxSims ?? SIMS_PER_TURN;
  }

  private scratchGrid(): TerrainGrid {
    if (!this.scratch) this.scratch = this.world.grid.clone();
    return this.scratch;
  }

  get left(): number {
    return this.cap - this.sims;
  }

  /** One shot from `stand` at `target`; counts one sim. */
  shoot(stand: Stand, weapon: WeaponId, target: number, angleDeci: number, powerMille: number) {
    const src = this.world;
    const ants = stand.ants;
    const me = ants[this.shooter] as Ant;
    const tgt = ants[target] as Ant;
    const wind = weapon === 'grub' ? (this.input.trueWind ?? this.input.wind) : this.input.wind;
    const tick = src.tick + (this.input.fireDelay ?? 0) + stand.delay;
    const a = angleDeci < AIM_MIN ? AIM_MIN : Math.min(angleDeci, AIM_MAX);
    const p = powerMille < 0 ? 0 : Math.min(powerMille, 1000);
    const res = MUTATES[weapon]
      ? simulateOnScratch(
          {
            world: { ...src, ants, tick },
            shooter: this.shooter,
            weapon,
            angleDeci: a,
            powerMille: p,
            wind,
          },
          this.scratchGrid(),
        )
      : simulateShot({
          world: { ...src, ants, tick },
          shooter: this.shooter,
          weapon,
          angleDeci: a,
          powerMille: p,
          wind,
        });
    this.sims++;
    this.simsByWeapon[weapon]++;
    const s = scoreShot(res, ants, this.shooter, target);
    let ix: number;
    if (res.blasts.length > 0) {
      let sum = 0;
      for (const b of res.blasts) sum += b.x;
      ix = sum / res.blasts.length;
    } else if (res.impact) ix = res.impact.x;
    else ix = me.x + me.facing * 4000;
    const ev: Eval = {
      angleDeci: a,
      powerMille: p,
      score: s.score - stand.penalty,
      self: s.self,
      past: (ix - tgt.x) * me.facing,
    };
    return ev;
  }

  /** The stand's ant array with the shooter facing the target. */
  facingStand(stand: Stand, target: number): Stand {
    const me = stand.ants[this.shooter] as Ant;
    const tx = (stand.ants[target] as Ant).x;
    const facing: 1 | -1 = tx > me.x ? 1 : tx < me.x ? -1 : me.facing;
    if (facing === me.facing) return stand;
    const ants = stand.ants.slice();
    ants[this.shooter] = { ...me, facing };
    return { ...stand, ants };
  }

  /**
   * Power search at one angle: up to `k` sims, best eval kept. Seeded by the
   * vacuum guess; aim-off correction until the target is bracketed, then
   * interpolation clamped inside the bracket.
   */
  *powerSearch(
    stand: Stand,
    weapon: WeaponId,
    target: number,
    angleDeci: number,
    k: number,
  ): Generator<void, Eval | null, void> {
    const me = stand.ants[this.shooter] as Ant;
    const tgt = stand.ants[target] as Ant;
    const wMul = WEAPONS[weapon].wMul;
    const mx = me.x;
    const my = me.y - ANT_CAPSULE.centreUp;
    const dist0 = (tgt.x - mx) * me.facing;
    const h = my - (tgt.y - ANT_CAPSULE.centreUp);
    let aimDist = dist0;
    let lo = -1;
    let hi = 1001;
    let fLo = 0;
    let fHi = 0;
    let p = guessPower(angleDeci, aimDist, h, wMul);
    let best: Eval | null = null;
    for (let n = 0; n < k && this.left > 0; n++) {
      const ev = this.shoot(stand, weapon, target, angleDeci, p);
      yield;
      if (better(ev, best)) best = ev;
      const f = ev.past;
      if ((f < 0 ? -f : f) <= LAND_TOL_PX) break;
      if (f > 0) {
        hi = p;
        fHi = f;
      } else {
        lo = p;
        fLo = f;
      }
      if (hi - lo <= 1) break;
      let next: number;
      if (lo >= 0 && hi <= 1000) {
        // Bracketed: interpolate, kept off the ends so the bracket shrinks.
        const t = -fLo / (fHi - fLo);
        const tc = t < 0.1 ? 0.1 : Math.min(t, 0.9);
        next = Math.round(lo + (hi - lo) * tc);
      } else {
        aimDist -= f;
        next = guessPower(angleDeci, aimDist, h, wMul);
      }
      if (!(next > lo && next < hi) || next === p) {
        const l = lo < 0 ? 0 : lo;
        const u = hi > 1000 ? 1000 : hi;
        next = (l + u) >> 1;
        if (next <= lo) next = lo + 1;
        if (next >= hi) next = hi - 1;
      }
      p = next;
    }
    return best;
  }

  /** 3×3 refine around an eval (8 new sims), plus the Roller's ±2% power refine. */
  *refine(stand: Stand, weapon: WeaponId, target: number, e: Eval): Generator<void, Eval, void> {
    let best = e;
    for (const da of [-REFINE_DECI, 0, REFINE_DECI]) {
      for (const dp of [-REFINE_MILLE, 0, REFINE_MILLE]) {
        if ((da === 0 && dp === 0) || this.left <= 0) continue;
        const ev = this.shoot(stand, weapon, target, e.angleDeci + da, e.powerMille + dp);
        yield;
        if (better(ev, best)) best = ev;
      }
    }
    if (weapon === 'roller') {
      const c = best;
      for (const dp of [-ROLLER_REFINE_MILLE, ROLLER_REFINE_MILLE]) {
        if (this.left <= 0) break;
        const ev = this.shoot(stand, weapon, target, c.angleDeci, c.powerMille + dp);
        yield;
        if (better(ev, best)) best = ev;
      }
    }
    return best;
  }

  /**
   * Full search of one (weapon, target) pair from a stand within `budget`
   * sims. Returns its refined top candidates (distinct angles).
   */
  *pair(
    stand0: Stand,
    weapon: WeaponId,
    target: number,
    angles: readonly number[],
    perAngle: number,
    budget: number,
    refineTop: number,
  ): Generator<void, Candidate[], void> {
    const stand = this.facingStand(stand0, target);
    const start = this.sims;
    const reserve = refineTop * (8 + (weapon === 'roller' ? 2 : 0));
    const sweep = budget - reserve;
    const evals: Eval[] = [];
    for (let i = 0; i < angles.length; i++) {
      const used = this.sims - start;
      const share = Math.floor((sweep - used) / (angles.length - i));
      const k = share < 2 ? 2 : Math.min(share, perAngle);
      if (used + k > budget || this.left <= 0) break;
      const e = yield* this.powerSearch(stand, weapon, target, angles[i] as number, k);
      if (e) evals.push(e);
    }
    evals.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
    const top = evals.slice(0, TOP_N);
    const out: Candidate[] = [];
    const facing = (stand.ants[this.shooter] as Ant).facing;
    for (let i = 0; i < top.length; i++) {
      let e = top[i] as Eval;
      const need = 8 + (weapon === 'roller' ? 2 : 0);
      if (i < refineTop && this.sims - start + need <= budget && this.left >= need) {
        e = yield* this.refine(stand, weapon, target, e);
      }
      out.push({
        weapon,
        target,
        facing,
        angleDeci: e.angleDeci,
        powerMille: e.powerMille,
        score: e.score,
        selfDamage: e.self,
      });
    }
    return out;
  }

  *run(): Generator<void, SolverResult, void> {
    const src = this.world;
    const me = src.ants[this.shooter] as Ant;
    const targets = pickTargets(src.ants, this.shooter);
    const weapons = usableWeapons(this.input.ammo, this.input.weapons);
    const finish = (ranked: Candidate[], move: BotMove | null, standScore: number) => ({
      ranked,
      move,
      sims: this.sims,
      simsByWeapon: { ...this.simsByWeapon },
      standScore,
    });
    if (targets.length === 0 || weapons.length === 0 || !isActive(me)) {
      return finish([], null, Number.NEGATIVE_INFINITY);
    }
    const allowMove = this.input.allowMove !== false && me.state === 'ground';
    const pairs: { weapon: WeaponId; target: number }[] = [];
    for (const weapon of weapons) for (const target of targets) pairs.push({ weapon, target });
    const perPairCap = weapons.length >= MANY_WEAPONS ? SIMS_PER_PAIR_MANY : SIMS_PER_PAIR;
    const mainBudget = this.cap - (allowMove ? MOVE_RESERVE : 0);
    const perPair = Math.min(perPairCap, Math.floor(mainBudget / pairs.length));
    const stand: Stand = { ants: src.ants, delay: 0, penalty: 0 };

    let all: Candidate[] = [];
    for (const pr of pairs) {
      const got = yield* this.pair(
        stand,
        pr.weapon,
        pr.target,
        SWEEP_ANGLES,
        SIMS_PER_ANGLE,
        perPair,
        TOP_N,
      );
      all = all.concat(got);
    }
    const ranked = rankCandidates(all);
    const best = ranked[0];
    const standScore = best ? best.score : Number.NEGATIVE_INFINITY;
    const needMove =
      !best || best.score < MOVE_BELOW_SCORE || best.selfDamage > MOVE_SELF_DAMAGE;
    if (!allowMove || !needMove) return finish(ranked, null, standScore);

    // Move first: up to 3 strides, each with an 8-angle grid for the 2 best pairs.
    const stridePairs: { weapon: WeaponId; target: number }[] = [];
    for (const c of ranked) {
      if (stridePairs.length >= STRIDE_PAIRS) break;
      if (!stridePairs.some((s) => s.weapon === c.weapon && s.target === c.target)) {
        stridePairs.push({ weapon: c.weapon, target: c.target });
      }
    }
    const towardTarget: 1 | -1 = (src.ants[best?.target ?? 0] as Ant).x >= me.x ? 1 : -1;
    const tried: { move: BotMove; score: number; ranked: Candidate[]; stand: Stand }[] = [];
    const tryStride = function* (
      this: Search,
      dir: 1 | -1,
      px: number,
    ): Generator<void, void, void> {
      if (px > me.budget || px > WALK_BUDGET) return;
      const w = simulateWalk(src.grid, me, dir, px);
      if (!w) return;
      if (tried.some((t) => Math.abs(t.move.x - w.move.x) < 1)) return;
      const ants = src.ants.slice();
      ants[this.shooter] = w.ant;
      const st: Stand = {
        ants,
        delay: w.move.ticks + w.move.restTicks,
        penalty: SELF_WEIGHT * w.fallDamage,
      };
      let got: Candidate[] = [];
      const budget = STRIDE_ANGLES.length * SIMS_PER_STRIDE_ANGLE;
      for (const sp of stridePairs) {
        const c = yield* this.pair(
          st,
          sp.weapon,
          sp.target,
          STRIDE_ANGLES,
          SIMS_PER_STRIDE_ANGLE,
          budget,
          0,
        );
        got = got.concat(c);
      }
      const r = rankCandidates(got);
      tried.push({ move: w.move, score: r[0]?.score ?? Number.NEGATIVE_INFINITY, ranked: r, stand: st });
    };
    yield* tryStride.call(this, towardTarget, STRIDE_PX);
    yield* tryStride.call(this, (-towardTarget) as 1 | -1, STRIDE_PX);
    // Third stride: two strides in the better direction so far.
    let dir3: 1 | -1 = towardTarget;
    if (tried.length > 0) {
      let b = tried[0] as (typeof tried)[number];
      for (const t of tried) if (t.score > b.score) b = t;
      dir3 = b.move.dir;
    }
    yield* tryStride.call(this, dir3, 2 * STRIDE_PX);

    let pick: (typeof tried)[number] | null = null;
    for (const t of tried) if (!pick || t.score > pick.score) pick = t;
    if (!pick || !(pick.score > standScore)) return finish(ranked, null, standScore);

    // Refine the chosen stride's top shots with what is left of the budget.
    const refined: Candidate[] = [];
    for (const c of pick.ranked) {
      const need = 8 + (c.weapon === 'roller' ? 2 : 0);
      if (refined.length >= TOP_N || this.left < need) {
        refined.push(c);
        continue;
      }
      const st = this.facingStand(pick.stand, c.target);
      const e: Eval = {
        angleDeci: c.angleDeci,
        powerMille: c.powerMille,
        score: c.score,
        self: c.selfDamage,
        past: 0,
      };
      const r = yield* this.refine(st, c.weapon, c.target, e);
      refined.push({
        ...c,
        angleDeci: r.angleDeci,
        powerMille: r.powerMille,
        score: r.score,
        selfDamage: r.self,
      });
    }
    return finish(rankCandidates(refined), pick.move, standScore);
  }
}

/** Starts a solver job. Each `step(maxSims)` runs at most maxSims simulated shots. */
export function startSolver(input: SolverInput): SolverJob {
  const search = new Search(input);
  const gen = search.run();
  let result: SolverResult | null = null;
  return {
    step(maxSims: number) {
      if (result) return;
      const stop = search.sims + (maxSims > 0 ? maxSims : 1);
      while (!result && search.sims < stop) {
        const it = gen.next();
        if (it.done) result = it.value;
      }
    },
    get done() {
      return result !== null;
    },
    get result() {
      return result;
    },
    get sims() {
      return search.sims;
    },
  };
}

/** Runs the whole search at once (tests, headless matches). */
export function solve(input: SolverInput): SolverResult {
  const job = startSolver(input);
  while (!job.done) job.step(SIMS_PER_TURN);
  return job.result as SolverResult;
}
