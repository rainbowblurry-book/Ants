/**
 * Pill Roller (DR-009, PLAN §5): lands, then rolls along the surface.
 * Start speed min(200, 0.35 × landing speed); along-slope acceleration
 * 0.5·g·sinθ downhill, minus 120·mu friction. One wall bounce at half speed.
 * Rolls off ledges and falls on. Pops on an ant or 150 ticks after landing.
 * Wind factor 0.5 in the air, 0 while rolling.
 */
import { circleHitsCapsule, GRAVITY, MAX_STEP_PX, RING_R_SMALL, SIM_DT } from '../physics.ts';
import { FRICTION, isSolidMaterial } from '../terrain.ts';
import { flyStep } from './fly.ts';
import type { RollerBody, StepCtx, WeaponDef } from './types.ts';

export const ROLLER: WeaponDef = {
  id: 'roller',
  damage: 38,
  blastR: 40,
  windFactor: 0.5,
  wMul: 0.85,
  ammo2p: 2,
  ringR: RING_R_SMALL,
  unlockLevel: 24,
};
export const ROLL_START_MAX = 200;
export const ROLL_START_FRACTION = 0.35;
export const ROLL_FRICTION_K = 120;
export const ROLL_FUSE_TICKS = 150;
/** A rise over this is a wall; a drop over this is a ledge (see PROGRESS stage 2). */
export const ROLL_STEP = 8;
/** Half-span of the 7 integer height samples used for the slope (DR-009). */
export const ROLL_SLOPE_HALF = 3;

type Surface = { top: number } | 'wall' | 'ledge';

/** Surface top near the ball's bottom yRef at column x. */
function surfaceAt(ctx: StepCtx, x: number, yRef: number): Surface {
  const g = ctx.world.grid;
  const y = Math.floor(yRef);
  if (g.solidAt(x, y)) {
    // Rise of k − 1 px: a step of up to 8 px is climbed.
    for (let k = 1; k <= ROLL_STEP + 1; k++) if (!g.solidAt(x, y - k)) return { top: y - k + 1 };
    return 'wall';
  }
  for (let k = 1; k <= ROLL_STEP; k++) if (g.solidAt(x, y + k)) return { top: y + k };
  return 'ledge';
}

/** sinθ of the ground along +x (positive = going down toward +x), from 7 samples. */
function slopeSin(ctx: StepCtx, x: number, yRef: number): number {
  const a = surfaceAt(ctx, x - ROLL_SLOPE_HALF, yRef);
  const b = surfaceAt(ctx, x + ROLL_SLOPE_HALF, yRef);
  if (typeof a !== 'object' || typeof b !== 'object') return 0;
  const dy = b.top - a.top;
  const dx = 2 * ROLL_SLOPE_HALF;
  return dy / Math.sqrt(dx * dx + dy * dy);
}

function land(b: RollerBody, ctx: StepCtx): void {
  const speed = Math.sqrt(b.p.vx * b.p.vx + b.p.vy * b.p.vy);
  const dir = b.p.vx > 0 ? 1 : b.p.vx < 0 ? -1 : b.dir;
  b.u = dir * Math.min(ROLL_START_MAX, ROLL_START_FRACTION * speed);
  b.mode = 'roll';
  b.p.vx = 0;
  b.p.vy = 0;
  if (b.fuse < 0) b.fuse = ROLL_FUSE_TICKS;
  ctx.event({ tick: ctx.world.tick, kind: 'land', weapon: 'roller', x: b.p.x, y: b.p.y });
}

export function stepRoller(b: RollerBody, ctx: StepCtx): boolean {
  if (b.fuse >= 0) {
    b.fuse--;
    if (b.fuse < 0) {
      ctx.explode(b, ROLLER.damage, ROLLER.blastR, -1);
      return false;
    }
  }
  if (b.mode === 'air') {
    const r = flyStep(b, ctx, ROLLER.windFactor);
    switch (r.kind) {
      case 'flying':
        return true;
      case 'ant':
        ctx.explode(b, ROLLER.damage, ROLLER.blastR, r.ant);
        return false;
      case 'terrain':
        land(b, ctx);
        return true;
      default:
        ctx.fizzle(b, r.kind);
        return false;
    }
  }
  return rollTick(b, ctx);
}

function rollTick(b: RollerBody, ctx: StepCtx): boolean {
  const g = ctx.world.grid;
  const ring = b.p.ringR;
  let bottom = b.p.y + ring;
  const here = surfaceAt(ctx, b.p.x, bottom);
  if (here === 'ledge') {
    b.mode = 'air';
    b.p.vx = b.u;
    b.p.vy = 0;
    return true;
  }
  // Friction from the material under the ball (DR-022 mu).
  const top = typeof here === 'object' ? here.top : Math.floor(bottom);
  const mat = g.materialAt(b.p.x, top);
  const mu = isSolidMaterial(mat) ? (FRICTION[mat] as number) : 0;
  const sin = slopeSin(ctx, b.p.x, bottom);
  b.u += 0.5 * GRAVITY * sin * SIM_DT;
  const f = ROLL_FRICTION_K * mu * SIM_DT;
  const au = b.u < 0 ? -b.u : b.u;
  b.u = au <= f ? 0 : b.u - (b.u < 0 ? -f : f);
  if (b.u === 0) return true;
  const cos = Math.sqrt(1 - sin * sin);
  const dx = b.u * SIM_DT * cos;
  const adx = dx < 0 ? -dx : dx;
  const n = Math.max(1, Math.ceil(adx / MAX_STEP_PX));
  const sx = dx / n;
  for (let i = 0; i < n; i++) {
    const nx = b.p.x + sx;
    const s = surfaceAt(ctx, nx, bottom);
    if (s === 'wall') {
      if (b.wallBounced) b.u = 0;
      else {
        b.u = -b.u / 2;
        b.wallBounced = true;
        ctx.event({ tick: ctx.world.tick, kind: 'bounce', weapon: 'roller', x: b.p.x, y: b.p.y });
      }
      return true;
    }
    if (s === 'ledge') {
      b.p.x = nx;
      b.mode = 'air';
      b.p.vx = b.u * cos;
      b.p.vy = 0;
      return true;
    }
    const ny = s.top - ring;
    for (let a = 0; a < ctx.targets.length; a++) {
      const ant = ctx.targets[a];
      if (ant && circleHitsCapsule(nx, ny, ring, ant)) {
        b.p.x = nx;
        b.p.y = ny;
        ctx.explode(b, ROLLER.damage, ROLLER.blastR, a);
        return false;
      }
    }
    b.p.x = nx;
    b.p.y = ny;
    bottom = s.top;
  }
  return true;
}
