/**
 * Ant bodies and movement (DR-023, DR-026, DR-027, DR-036, J2, J3, J6).
 *
 * The ant position is its feet (centre-bottom). Probes: feet at −16, 0, +16;
 * walls at ±26 at heights 10 and 28; head at 44. Walking uses a 160 px budget
 * of horizontal distance per turn; hop and back-flip spend from it.
 */
import { slopeDeci } from './angle.ts';
import { ANT_MAX_HP, fallDamage, nonLethal } from './damage.ts';
import { GRAVITY, SIM_DT } from './physics.ts';
import { isSolidMaterial, Material, type TerrainGrid } from './terrain.ts';
import { sinDeci } from './trig.ts';

export const WALK_SPEED = 80;
export const WALK_BUDGET = 160;
/** Full speed up to 30°, falling linearly to 40 px/s at 45°; steeper is blocked (DR-036). */
export const WALK_FULL_DECI = 300;
export const WALK_MAX_DECI = 450;
export const WALK_SPEED_AT_MAX = 40;
export const STEP_UP = 8;
export const HOP_V = { x: 150, y: -300 } as const;
export const HOP_COST = 50;
export const FLIP_V = { x: -110, y: -420 } as const;
export const FLIP_COST = 80;
/** Stand without sliding up to 60°; on SLICK slide above 10° (DR-023, J2). */
export const STAND_MAX_DECI = 600;
export const SLICK_SLIDE_DECI = 100;
export const SLICK_DECEL = 90;
export const TERMINAL_SPEED = 700;
export const MAX_FALL_STEP = 2;
export const EMBED_PUSH_MAX = 24;
/** BOUNCY landings rebound once at e 0.6 (DR-022). */
export const BOUNCY_LANDING_E = 0.6;
/** Invisible side walls for ants (DR-026). */
export const WALL_MIN_X = 24;
export const WALL_MAX_X = 936;
/** Void bottom: feet below this y are knocked out (DR-026). */
export const VOID_Y = 580;
/** Water bottom: ticks in water before swimming back, and the search reach (DR-026). */
export const WATER_TICKS = 6;
export const SWIM_REACH = 200;

export const FEET = [-16, 0, 16] as const;
export const WALL_PROBE_X = 26;
export const WALL_PROBE_H = [10, 28] as const;
export const HEAD_PROBE = 44;
/** Window for finding a foot's ground contact: up to the head probe (44 px), and as far down. */
const CONTACT_UP = HEAD_PROBE;
const CONTACT_DOWN = HEAD_PROBE;

export type AntState = 'ground' | 'air' | 'ko';

export interface Ant {
  id: number;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  facing: 1 | -1;
  state: AntState;
  /** Walk budget left this turn, px. */
  budget: number;
  /** Highest point (smallest y) of the current fall, for fall damage. */
  apexY: number;
  /** True after one BOUNCY rebound in this fall. */
  bounced: boolean;
  waterTicks: number;
  /** Set when the ant swam back from water: it loses its next turn (DR-026). */
  skipNextTurn: boolean;
  /** Why the ant was knocked out, if it was. */
  koBy?: 'hp' | 'void';
}

/** BlastAnt view used by damage.ts. */
export function isActive(a: Ant): boolean {
  return a.state !== 'ko';
}

export function createAnt(id: number, team: number, x: number, y: number, facing: 1 | -1): Ant {
  return {
    id,
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: ANT_MAX_HP,
    facing,
    state: 'ground',
    budget: WALK_BUDGET,
    apexY: y,
    bounced: false,
    waterTicks: 0,
    skipNextTurn: false,
  };
}

/**
 * Ground contact for one foot column: the surface nearest the feet. If the
 * cell at the feet is solid, scan up (at most 44 px, the head probe) to the
 * first empty cell; otherwise scan down (at most 44 px) to the first solid
 * cell. Returns the y of the top solid cell, or null (buried or no ground).
 */
export function footContact(grid: TerrainGrid, x: number, y: number): number | null {
  const fy = Math.floor(y);
  if (grid.solidAt(x, fy)) {
    for (let k = 1; k <= CONTACT_UP; k++) if (!grid.solidAt(x, fy - k)) return fy - k + 1;
    return null;
  }
  for (let k = 1; k <= CONTACT_DOWN; k++) if (grid.solidAt(x, fy + k)) return fy + k;
  return null;
}

/** Contacts for the three feet at (x, y). */
function contacts(grid: TerrainGrid, x: number, y: number): (number | null)[] {
  return FEET.map((f) => footContact(grid, x + f, y));
}

/** Ground height: the average of the left and right foot contacts (DR-023). */
function groundFrom(c: (number | null)[]): number | null {
  const l = c[0] ?? null;
  const r = c[2] ?? null;
  if (l !== null && r !== null) return (l + r) / 2;
  if (l !== null) return l;
  if (r !== null) return r;
  return c[1] ?? null;
}

/** True if any foot has solid within 2 px below the feet (DR-023). */
export function isSupported(grid: TerrainGrid, ant: { x: number; y: number }): boolean {
  for (const f of FEET) {
    for (let k = 0; k < 2; k++) if (grid.solidAt(ant.x + f, ant.y + k)) return true;
  }
  return false;
}

/** Signed slope (deci, + means the ground rises toward +x) under the ant, or 0. */
export function slopeUnder(grid: TerrainGrid, ant: { x: number; y: number }): number {
  const l = footContact(grid, ant.x - 16, ant.y);
  const r = footContact(grid, ant.x + 16, ant.y);
  if (l === null || r === null) return 0;
  const rise = l - r; // screen y grows downward
  const deg = slopeDeci(rise, 32);
  return rise < 0 ? -deg : deg;
}

/** Material the ant stands on (centre foot first). */
export function materialUnder(grid: TerrainGrid, ant: { x: number; y: number }): number {
  for (const f of [0, -16, 16]) {
    for (let k = 0; k < 2; k++) {
      const m = grid.materialAt(ant.x + f, ant.y + k);
      if (isSolidMaterial(m)) return m;
    }
  }
  return Material.EMPTY;
}

/** Walk speed on a slope climbed at `deci` (uphill only; DR-036). */
export function walkSpeedFor(deci: number): number {
  if (deci <= WALK_FULL_DECI) return WALK_SPEED;
  if (deci > WALK_MAX_DECI) return 0;
  return (
    WALK_SPEED -
    ((WALK_SPEED - WALK_SPEED_AT_MAX) * (deci - WALK_FULL_DECI)) / (WALK_MAX_DECI - WALK_FULL_DECI)
  );
}

function clampX(x: number): number {
  return x < WALL_MIN_X ? WALL_MIN_X : Math.min(x, WALL_MAX_X);
}

/** Starts a fall or a launch. */
export function launchAnt(ant: Ant, vx: number, vy: number): void {
  if (ant.state === 'ko') return;
  ant.state = 'air';
  ant.vx = vx;
  ant.vy = vy;
  ant.apexY = ant.y;
  ant.bounced = false;
}

/** Hop forward: v (150, −300) toward facing, costs 50 (DR-036). */
export function hop(ant: Ant): boolean {
  if (ant.state !== 'ground' || ant.budget < HOP_COST) return false;
  ant.budget -= HOP_COST;
  launchAnt(ant, ant.facing * HOP_V.x, HOP_V.y);
  return true;
}

/** Back-flip: v (−110, −420) away from facing, costs 80 (DR-036). */
export function backflip(ant: Ant): boolean {
  if (ant.state !== 'ground' || ant.budget < FLIP_COST) return false;
  ant.budget -= FLIP_COST;
  launchAnt(ant, ant.facing * FLIP_V.x, FLIP_V.y);
  return true;
}

/**
 * One tick of walking in `dir` (DR-036). Returns the horizontal distance
 * moved. The move is blocked by a foot rising more than 8 px, an uphill
 * slope over 45°, a ceiling at the head probe, or the side walls. If the
 * ground drops more than 8 px, the ant steps off and falls.
 */
export function walkStep(ant: Ant, grid: TerrainGrid, dir: 1 | -1): number {
  if (ant.state !== 'ground') return 0;
  ant.facing = dir;
  if (ant.budget <= 0) return 0;
  const climb = slopeUnder(grid, ant) * dir;
  const speed = walkSpeedFor(Math.max(climb, 0));
  if (speed === 0) return 0;
  let step = speed * SIM_DT;
  if (step > ant.budget) step = ant.budget;
  const nx = clampX(ant.x + dir * step);
  const moved = nx - ant.x;
  if (moved === 0) return 0;
  const before = contacts(grid, ant.x, ant.y);
  const after = contacts(grid, nx, ant.y);
  for (let i = 0; i < 3; i++) {
    const b = before[i] ?? null;
    const a = after[i] ?? null;
    if (b !== null && a !== null && b - a > STEP_UP) return 0;
    if (a === null && grid.solidAt(nx + (FEET[i] as number), ant.y)) return 0; // buried: a wall
  }
  const ground = groundFrom(after);
  if (ground !== null) {
    const l = after[0] ?? null;
    const r = after[2] ?? null;
    if (l !== null && r !== null) {
      const rise = (dir > 0 ? l - r : r - l) as number;
      if (rise > 0 && slopeDeci(rise, 32) > WALK_MAX_DECI) return 0;
    }
    if (grid.solidAt(nx, ground - HEAD_PROBE)) return 0;
  }
  const dist = moved < 0 ? -moved : moved;
  ant.budget -= dist;
  ant.x = nx;
  if (ground === null || ground - ant.y > STEP_UP) {
    launchAnt(ant, 0, 0);
  } else {
    ant.y = ground;
  }
  return dist;
}

function wallAhead(grid: TerrainGrid, x: number, y: number, dir: number): boolean {
  for (const h of WALL_PROBE_H) if (grid.solidAt(x + dir * WALL_PROBE_X, y - h)) return true;
  return false;
}

/** Top of the solid under the feet after landing: the highest foot contact. */
function landingY(grid: TerrainGrid, x: number, y: number): number {
  let best = y;
  for (const f of FEET) {
    // Move up while this foot is inside solid.
    let yy = Math.floor(y);
    let k = 0;
    while (k < EMBED_PUSH_MAX && grid.solidAt(x + f, yy - 1)) {
      yy--;
      k++;
    }
    if (grid.solidAt(x + f, yy) && yy < best) best = yy;
  }
  return best;
}

export interface AntStepEvents {
  landed?: { fall: number; dmg: number; material: number };
  ko?: 'void';
  swam?: boolean;
}

/**
 * One tick of ant physics when it is not walking (DR-023, DR-026, DR-036):
 * flight under gravity with 2 px vertical steps, landing, fall damage,
 * BOUNCY rebound, slides, SLICK momentum, embedding, void and water.
 */
export function stepAnt(ant: Ant, grid: TerrainGrid): AntStepEvents {
  const ev: AntStepEvents = {};
  if (ant.state === 'ko') return ev;
  if (ant.state === 'ground') {
    groundTick(ant, grid);
  } else {
    airTick(ant, grid, ev);
  }
  hazards(ant, grid, ev);
  return ev;
}

function groundTick(ant: Ant, grid: TerrainGrid): void {
  // Pushed up if terrain was filled into the feet (DR-023).
  if (grid.solidAt(ant.x, ant.y - 1)) {
    let k = 0;
    while (k < EMBED_PUSH_MAX && grid.solidAt(ant.x, ant.y - 1)) {
      ant.y -= 1;
      k++;
    }
  }
  if (!isSupported(grid, ant)) {
    launchAnt(ant, ant.vx, 0);
    return;
  }
  const mat = materialUnder(grid, ant);
  const slope = slopeUnder(grid, ant); // + rises toward +x
  const abs = slope < 0 ? -slope : slope;
  const limit = mat === Material.SLICK ? SLICK_SLIDE_DECI : STAND_MAX_DECI;
  let ax = 0;
  if (abs > limit) {
    // Slide downhill at 0.5·g·sinθ (DR-036; used for any over-limit slope).
    const downhill = slope > 0 ? -1 : 1;
    ax = downhill * 0.5 * GRAVITY * sinDeci(abs);
  }
  if (ax === 0 && ant.vx === 0) return;
  ant.vx += ax * SIM_DT;
  if (mat === Material.SLICK) {
    if (ax === 0) {
      const f = SLICK_DECEL * SIM_DT;
      const s = ant.vx < 0 ? -ant.vx : ant.vx;
      ant.vx = s <= f ? 0 : ant.vx - (ant.vx < 0 ? -f : f);
    }
  } else if (ax === 0) {
    ant.vx = 0; // normal surfaces stop the ant at once
    return;
  }
  const nx = clampX(ant.x + ant.vx * SIM_DT);
  if (nx === ant.x) {
    ant.vx = 0;
    return;
  }
  const after = contacts(grid, nx, ant.y);
  const before = contacts(grid, ant.x, ant.y);
  for (let i = 0; i < 3; i++) {
    const b = before[i] ?? null;
    const a = after[i] ?? null;
    if (b !== null && a !== null && b - a > STEP_UP) {
      ant.vx = 0;
      return;
    }
  }
  const g = groundFrom(after);
  if (g !== null && grid.solidAt(nx, g - HEAD_PROBE)) {
    ant.vx = 0;
    return;
  }
  ant.x = nx;
  if (g === null || g - ant.y > STEP_UP) launchAnt(ant, ant.vx, 0);
  else ant.y = g;
}

function airTick(ant: Ant, grid: TerrainGrid, ev: AntStepEvents): void {
  ant.vy += GRAVITY * SIM_DT;
  if (ant.vy > TERMINAL_SPEED) ant.vy = TERMINAL_SPEED;
  // Horizontal: blocked by wall probes and the side walls; no air steering.
  if (ant.vx !== 0) {
    const nx = clampX(ant.x + ant.vx * SIM_DT);
    const dir = ant.vx > 0 ? 1 : -1;
    if (wallAhead(grid, nx, ant.y, dir)) ant.vx = 0;
    else {
      if (nx !== ant.x + ant.vx * SIM_DT) ant.vx = 0;
      ant.x = nx;
    }
  }
  // Vertical in steps of at most 2 px.
  const dy = ant.vy * SIM_DT;
  const n = Math.max(1, Math.ceil((dy < 0 ? -dy : dy) / MAX_FALL_STEP));
  const sy = dy / n;
  for (let i = 0; i < n; i++) {
    const ny = ant.y + sy;
    if (sy < 0) {
      if (grid.solidAt(ant.x, ny - HEAD_PROBE)) {
        ant.vy = 0;
        break;
      }
      ant.y = ny;
      if (ant.y < ant.apexY) ant.apexY = ant.y;
      continue;
    }
    let hit = false;
    for (const f of FEET) if (grid.solidAt(ant.x + f, ny)) hit = true;
    if (!hit) {
      ant.y = ny;
      continue;
    }
    land(ant, grid, landingY(grid, ant.x, ny), ev);
    return;
  }
}

function land(ant: Ant, grid: TerrainGrid, y: number, ev: AntStepEvents): void {
  ant.y = y;
  const mat = materialUnder(grid, ant);
  if (mat === Material.BOUNCY && !ant.bounced && ant.vy > 0) {
    ant.bounced = true;
    ant.vy = -BOUNCY_LANDING_E * ant.vy;
    ant.apexY = ant.y;
    ev.landed = { fall: 0, dmg: 0, material: mat };
    return;
  }
  const fall = ant.y - ant.apexY;
  const dmg = fallDamage(fall, mat);
  if (dmg > 0) ant.hp = nonLethal(ant.hp, dmg);
  ev.landed = { fall, dmg, material: mat };
  ant.state = 'ground';
  ant.vy = 0;
  if (mat !== Material.SLICK) ant.vx = 0;
  ant.bounced = false;
}

function hazards(ant: Ant, grid: TerrainGrid, ev: AntStepEvents): void {
  if (grid.bottom === 'void' && ant.y > VOID_Y) {
    ant.state = 'ko';
    ant.koBy = 'void';
    ant.vx = 0;
    ant.vy = 0;
    ev.ko = 'void';
    return;
  }
  if (grid.bottom !== 'water') return;
  const inWater = ant.y >= grid.h || grid.materialAt(ant.x, ant.y - 1) === Material.WATER;
  ant.waterTicks = inWater ? ant.waterTicks + 1 : 0;
  if (ant.waterTicks < WATER_TICKS) return;
  const spot = dryStandingPoint(grid, ant.x);
  ant.waterTicks = 0;
  ant.vx = 0;
  ant.vy = 0;
  ant.skipNextTurn = true;
  ev.swam = true;
  if (spot) {
    ant.x = spot.x;
    ant.y = spot.y;
    ant.state = 'ground';
  } else {
    // No dry ground within reach: see PROGRESS stage 2 (open question).
    ant.state = 'ko';
    ant.koBy = 'void';
    ev.ko = 'void';
  }
}

/**
 * Nearest dry standing point within 200 px (DR-026): scans x0, x0+1, x0−1,
 * x0+2, … and takes the first column whose topmost cell, from the top of the
 * world down, is solid ground (not WATER). Returns the feet position.
 */
export function dryStandingPoint(grid: TerrainGrid, x0: number): { x: number; y: number } | null {
  const cx = Math.floor(x0);
  for (let d = 0; d <= SWIM_REACH; d++) {
    for (const s of d === 0 ? [0] : [d, -d]) {
      const x = cx + s;
      if (x < WALL_MIN_X || x > WALL_MAX_X) continue;
      for (let y = 0; y < grid.h; y++) {
        const m = grid.materialAt(x, y);
        if (m === Material.WATER) break;
        if (isSolidMaterial(m)) {
          if (y - HEAD_PROBE >= 0 && !grid.solidAt(x, y - HEAD_PROBE)) return { x: x + 0.5, y };
          break;
        }
      }
    }
  }
  return null;
}

/** Resets the walk budget at the start of the ant's turn. */
export function resetBudget(ant: Ant): void {
  ant.budget = WALK_BUDGET;
}

/** Speed of a body, for the settle rule (DR-038). */
export function antSpeed(ant: Ant): number {
  return Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
}
