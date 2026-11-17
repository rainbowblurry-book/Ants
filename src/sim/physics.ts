/**
 * Projectile physics (DR-023, DR-026, DR-030, DR-031, DR-038, J4).
 *
 * Semi-implicit Euler at 60 Hz: v += a·dt, then x += v·dt. Motion is cut into
 * steps of at most 2 px so nothing tunnels through a 6 px feature. Only
 * + - * / and Math.sqrt are used on floats (DR-011).
 */
import { FRICTION, RESTITUTION, type TerrainGrid } from './terrain.ts';
import { cosDeci, sinDeci } from './trig.ts';

export const SIM_HZ = 60;
export const SIM_DT = 1 / 60;
/** Gravity in px/s² (DR-030). */
export const GRAVITY = 600;
/** Launch speed is wMul·(LAUNCH_BASE + LAUNCH_RANGE·p) (DR-030). */
export const LAUNCH_BASE = 100;
export const LAUNCH_RANGE = 620;
/** Projectile speed cap in px/s (DR-023, J4). */
export const MAX_SPEED = 1500;
/** Longest move per collision step in px (DR-023, J4). */
export const MAX_STEP_PX = 2;
/** Wind acceleration per level in px/s² (DR-031). */
export const WIND_K = 25;
/** Flight cap: after this many ticks the shot fizzles (DR-038). */
export const MAX_FLIGHT_TICKS = 480;
/** Projectile removal bounds (DR-026, J4). */
export const DESPAWN_MIN_X = -150;
export const DESPAWN_MAX_X = 1110;
export const DESPAWN_MIN_Y = -2000;
/** Half-size of the surface-normal window: 9x9 cells (DR-023). */
export const NORMAL_HALF = 4;
/** Ring radius for Seed and Pollen, and for Dewdrop (DR-023). */
export const RING_R_SMALL = 4;
export const RING_R_DEW = 8;

/** Ant hurtbox capsule, relative to the feet (DR-027). */
export const ANT_CAPSULE = { halfSeg: 12, radius: 16, centreUp: 22 } as const;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Collision ring radius: centre plus 4 cardinal points at this distance. */
  ringR: number;
}

/** Launch speed in px/s for an integer per-mille power (J9). */
export function launchSpeed(powerMille: number, wMul: number): number {
  return wMul * (LAUNCH_BASE + LAUNCH_RANGE * (powerMille / 1000));
}

/**
 * Launch velocity. `angleDeci` is integer tenths of a degree above the
 * horizontal, toward `facing` (+1 right, −1 left). Screen y points down.
 */
export function launchVelocity(
  angleDeci: number,
  powerMille: number,
  wMul: number,
  facing: 1 | -1,
): Vec2 {
  const v = launchSpeed(powerMille, wMul);
  return { x: facing * v * cosDeci(angleDeci), y: -v * sinDeci(angleDeci) };
}

/** Feet position of an ant, for the hurtbox test. */
export interface AntBody {
  x: number;
  y: number;
}

/** True if a circle at (px, py) with radius r touches the ant's capsule (DR-027). */
export function circleHitsCapsule(px: number, py: number, r: number, ant: AntBody): boolean {
  const cy = ant.y - ANT_CAPSULE.centreUp;
  const sx0 = ant.x - ANT_CAPSULE.halfSeg;
  const sx1 = ant.x + ANT_CAPSULE.halfSeg;
  const qx = px < sx0 ? sx0 : Math.min(px, sx1);
  const dx = px - qx;
  const dy = py - cy;
  const lim = ANT_CAPSULE.radius + r;
  return dx * dx + dy * dy <= lim * lim;
}

/** Distance from a point to the ant's capsule segment (DR-035 uses this, J1). */
export function distToCapsuleSegment(px: number, py: number, ant: AntBody): number {
  const cy = ant.y - ANT_CAPSULE.centreUp;
  const sx0 = ant.x - ANT_CAPSULE.halfSeg;
  const sx1 = ant.x + ANT_CAPSULE.halfSeg;
  const qx = px < sx0 ? sx0 : Math.min(px, sx1);
  const dx = px - qx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

/** True if the centre or any of the 4 cardinal ring points is solid (DR-023). */
export function ringSolid(grid: TerrainGrid, x: number, y: number, r: number): boolean {
  return (
    grid.solidAt(x, y) ||
    grid.solidAt(x + r, y) ||
    grid.solidAt(x - r, y) ||
    grid.solidAt(x, y + r) ||
    grid.solidAt(x, y - r)
  );
}

/**
 * Surface normal at (x, y) from a 9x9 window (DR-023): the sum of (dx, dy)
 * over solid cells, negated and normalised. If the sum is zero (fully
 * embedded or no solid nearby), the reversed velocity is used.
 */
export function surfaceNormal(
  grid: TerrainGrid,
  x: number,
  y: number,
  vx: number,
  vy: number,
): Vec2 {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let sx = 0;
  let sy = 0;
  for (let dy = -NORMAL_HALF; dy <= NORMAL_HALF; dy++) {
    for (let dx = -NORMAL_HALF; dx <= NORMAL_HALF; dx++) {
      if (grid.solidAt(cx + dx + 0.5, cy + dy + 0.5)) {
        sx += dx;
        sy += dy;
      }
    }
  }
  if (sx === 0 && sy === 0) {
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len === 0) return { x: 0, y: -1 };
    return { x: -vx / len, y: -vy / len };
  }
  const len = Math.sqrt(sx * sx + sy * sy);
  return { x: -sx / len, y: -sy / len };
}

/**
 * Bounce (DR-023): v' = v − (1+e)(v·n)n, then the tangential part is
 * multiplied by (1 − 0.2·mu). A body already moving away from the surface
 * keeps its velocity.
 */
export function bounce(v: Vec2, n: Vec2, e: number, mu: number): Vec2 {
  const vn = v.x * n.x + v.y * n.y;
  if (vn >= 0) return { x: v.x, y: v.y };
  const rx = v.x - (1 + e) * vn * n.x;
  const ry = v.y - (1 + e) * vn * n.y;
  const rn = rx * n.x + ry * n.y;
  const tx = rx - rn * n.x;
  const ty = ry - rn * n.y;
  const k = 1 - 0.2 * mu;
  return { x: rn * n.x + tx * k, y: rn * n.y + ty * k };
}

/** Bounce off the material at the contact point, using DR-022's e and mu. */
export function bounceOnMaterial(v: Vec2, n: Vec2, material: number): Vec2 {
  return bounce(v, n, RESTITUTION[material] ?? 0, FRICTION[material] ?? 0);
}

export type StepResult =
  | { kind: 'flying' }
  | { kind: 'terrain'; normal: Vec2; material: number; cx: number; cy: number }
  | { kind: 'ant'; ant: number }
  | { kind: 'out' };

/**
 * Advances a projectile by one 60 Hz tick (DR-023, DR-030).
 *
 * - `ax`, `ay`: extra acceleration in px/s² (wind already × weapon factor).
 *   Gravity is added here.
 * - The move is split into ceil(|v|·dt / 2) steps. Each step tests the ants'
 *   capsules, then the ring against the grid. On terrain contact the
 *   projectile is backed up to the last free step and the contact point and
 *   normal are returned. The caller decides what the weapon does.
 */
export function stepProjectile(
  p: Projectile,
  grid: TerrainGrid,
  ax: number,
  ay: number,
  ants: readonly AntBody[] = [],
): StepResult {
  p.vx += ax * SIM_DT;
  p.vy += (GRAVITY + ay) * SIM_DT;
  let speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > MAX_SPEED) {
    const k = MAX_SPEED / speed;
    p.vx *= k;
    p.vy *= k;
    speed = MAX_SPEED;
  }
  const dist = speed * SIM_DT;
  let n = Math.ceil(dist / MAX_STEP_PX);
  if (n < 1) n = 1;
  const sx = (p.vx * SIM_DT) / n;
  const sy = (p.vy * SIM_DT) / n;
  for (let i = 0; i < n; i++) {
    const nx = p.x + sx;
    const ny = p.y + sy;
    for (let a = 0; a < ants.length; a++) {
      if (circleHitsCapsule(nx, ny, p.ringR, ants[a] as AntBody)) {
        p.x = nx;
        p.y = ny;
        return { kind: 'ant', ant: a };
      }
    }
    if (ringSolid(grid, nx, ny, p.ringR)) {
      const normal = surfaceNormal(grid, nx, ny, p.vx, p.vy);
      const material = contactMaterial(grid, nx, ny, p.ringR);
      return { kind: 'terrain', normal, material, cx: nx, cy: ny };
    }
    p.x = nx;
    p.y = ny;
  }
  if (p.x < DESPAWN_MIN_X || p.x > DESPAWN_MAX_X || p.y < DESPAWN_MIN_Y) return { kind: 'out' };
  return { kind: 'flying' };
}

/** The material the ring touched (centre first, then right, left, down, up). */
function contactMaterial(grid: TerrainGrid, x: number, y: number, r: number): number {
  if (grid.solidAt(x, y)) return grid.materialAt(x, y);
  if (grid.solidAt(x + r, y)) return grid.materialAt(x + r, y);
  if (grid.solidAt(x - r, y)) return grid.materialAt(x - r, y);
  if (grid.solidAt(x, y + r)) return grid.materialAt(x, y + r);
  return grid.materialAt(x, y - r);
}

export interface FlightResult {
  result: StepResult;
  ticks: number;
  x: number;
  y: number;
  path: Vec2[];
}

/**
 * Flies a projectile until it hits something, leaves the world or reaches the
 * flight cap. Used by tests and later by the aim preview and the bot.
 * `accel(x, y, tick)` gives the extra acceleration (wind × weapon factor).
 */
export function simulateFlight(
  p: Projectile,
  grid: TerrainGrid,
  accel: (x: number, y: number, tick: number) => Vec2 = () => ({ x: 0, y: 0 }),
  opts: { ants?: readonly AntBody[]; startTick?: number; maxTicks?: number; record?: boolean } = {},
): FlightResult {
  const maxTicks = opts.maxTicks ?? MAX_FLIGHT_TICKS;
  const start = opts.startTick ?? 0;
  const path: Vec2[] = [];
  for (let t = 1; t <= maxTicks; t++) {
    const a = accel(p.x, p.y, start + t);
    const r = stepProjectile(p, grid, a.x, a.y, opts.ants);
    if (opts.record) path.push({ x: p.x, y: p.y });
    if (r.kind !== 'flying') return { result: r, ticks: t, x: p.x, y: p.y, path };
  }
  return { result: { kind: 'flying' }, ticks: maxTicks, x: p.x, y: p.y, path };
}
