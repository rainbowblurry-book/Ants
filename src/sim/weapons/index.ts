/**
 * Weapon table and shot stepping (DR-002, DR-009, DR-034, DR-035, PLAN §5).
 *
 * A Shot owns every body one FIRE creates (Pollen puffs included) and the
 * per-ant damage ledger for the 60 cap. `stepShot` advances it one tick.
 */
import { applyBlast, type BlastAnt } from '../damage.ts';
import { type Ant, isActive, launchAnt } from '../movement.ts';
import {
  ANT_CAPSULE,
  circleHitsCapsule,
  distToCapsuleSegment,
  launchVelocity,
} from '../physics.ts';
import { popPickups } from '../pickups.ts';
import { Material } from '../terrain.ts';
import { DEWDROP, stepDewdrop } from './dewdrop.ts';
import { GRUB, stepGrub } from './grub.ts';
import { PLOP, PLOP_KEEP_OUT, stepPlop } from './plop.ts';
import { POLLEN, stepPollen, stepPuff } from './pollen.ts';
import { ROLLER, stepRoller } from './roller.ts';
import { SEED, stepSeed } from './seed.ts';
import type {
  Blast,
  Body,
  BodyBase,
  ShotEvent,
  StepCtx,
  WeaponDef,
  WeaponId,
  World,
} from './types.ts';

export * from './types.ts';
export { DEWDROP, GRUB, PLOP, POLLEN, ROLLER, SEED };

export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = {
  seed: SEED,
  dewdrop: DEWDROP,
  pollen: POLLEN,
  grub: GRUB,
  roller: ROLLER,
  plop: PLOP,
};

export interface Shot {
  weapon: WeaponId;
  shooter: number;
  bodies: Body[];
  /** Damage each ant has taken from this shot (DR-035 cap). */
  dealt: number[];
  events: ShotEvent[];
}

/** Where a shot spawns: the shooter's hurtbox centre (see PROGRESS stage 2). */
export function muzzle(ant: Ant): { x: number; y: number } {
  return { x: ant.x, y: ant.y - ANT_CAPSULE.centreUp };
}

/** Creates the shot for one FIRE. Angle in 0.1° above horizontal toward facing; power ‰. */
export function fire(
  world: World,
  shooter: number,
  weapon: WeaponId,
  angleDeci: number,
  powerMille: number,
): Shot {
  const ant = world.ants[shooter] as Ant;
  const def = WEAPONS[weapon];
  const v = launchVelocity(angleDeci, powerMille, def.wMul, ant.facing);
  const m = muzzle(ant);
  const p = { x: m.x, y: m.y, vx: v.x, vy: v.y, ringR: def.ringR };
  const base: BodyBase = { p, ignore: shooter, age: 0 };
  let body: Body;
  switch (weapon) {
    case 'seed':
      body = { ...base, kind: 'seed' };
      break;
    case 'dewdrop':
      body = { ...base, kind: 'dewdrop', bounces: 0, resting: false };
      break;
    case 'pollen':
      body = { ...base, kind: 'pollen' };
      break;
    case 'grub':
      body = { ...base, kind: 'grub', digging: false, hx: 0, hy: 0, digTicks: 0 };
      break;
    case 'roller':
      body = {
        ...base,
        kind: 'roller',
        mode: 'air',
        u: 0,
        fuse: -1,
        wallBounced: false,
        dir: ant.facing,
      };
      break;
    case 'plop':
      body = { ...base, kind: 'plop' };
      break;
  }
  return {
    weapon,
    shooter,
    bodies: [body],
    dealt: world.ants.map(() => 0),
    events: [],
  };
}

/** True while any body of the shot is alive. */
export function shotLive(shot: Shot): boolean {
  return shot.bodies.length > 0;
}

function explodeAt(world: World, shot: Shot, blast: Blast): void {
  const g = world.grid;
  if (blast.fill) {
    const active = world.ants.filter(isActive);
    g.fill(blast.x, blast.y, blast.r, Material.SOIL, (x, y) => {
      for (const a of active) {
        if (distToCapsuleSegment(x, y, a) - ANT_CAPSULE.radius < PLOP_KEEP_OUT) return true;
      }
      return false;
    });
  } else {
    g.erase(blast.x, blast.y, blast.r);
    popPickups(world.pickups, blast.x, blast.y, blast.r);
  }
  const views: BlastAnt[] = world.ants.map((a) => ({
    x: a.x,
    y: a.y,
    hp: a.hp,
    team: a.team,
    active: isActive(a),
  }));
  const hits = applyBlast(
    {
      x: blast.x,
      y: blast.y,
      r: blast.r,
      base: blast.base,
      direct: blast.direct,
      shooter: shot.shooter,
    },
    views,
    shot.dealt,
  );
  for (const h of hits) {
    const a = world.ants[h.ant] as Ant;
    a.hp = (views[h.ant] as BlastAnt).hp;
    launchAnt(a, h.vx, h.vy);
    if (a.hp <= 0) {
      a.state = 'ko';
      a.koBy = 'hp';
    }
  }
  shot.events.push({
    tick: world.tick,
    kind: 'blast',
    weapon: shot.weapon,
    blast,
    hits: hits.map((h) => ({ ant: h.ant, dmg: h.dmg })),
  });
}

/** Advances every body of the shot by one tick. Bodies spawned this tick start next tick. */
export function stepShot(world: World, shot: Shot): void {
  const next: Body[] = [];
  const spawned: Body[] = [];
  for (const b of shot.bodies) {
    // The shooter is ignored until the body has left its capsule.
    if (b.ignore >= 0) {
      const s = world.ants[b.ignore];
      if (!s || !isActive(s) || !circleHitsCapsule(b.p.x, b.p.y, b.p.ringR, s)) b.ignore = -1;
    }
    const targets = world.ants.map((a, i) => (isActive(a) && i !== b.ignore ? a : null));
    const ctx: StepCtx = {
      world,
      targets,
      explode(body, base, r, direct, fill = false) {
        explodeAt(world, shot, { x: body.p.x, y: body.p.y, r, base, direct, fill });
      },
      fizzle(body, why) {
        shot.events.push({
          tick: world.tick,
          kind: 'fizzle',
          weapon: shot.weapon,
          x: body.p.x,
          y: body.p.y,
          why,
        });
      },
      spawn(body) {
        spawned.push(body);
      },
      event(e) {
        shot.events.push(e);
      },
    };
    b.age++;
    let alive: boolean;
    switch (b.kind) {
      case 'seed':
        alive = stepSeed(b, ctx);
        break;
      case 'dewdrop':
        alive = stepDewdrop(b, ctx);
        break;
      case 'pollen':
        alive = stepPollen(b, ctx);
        break;
      case 'puff':
        alive = stepPuff(b, ctx);
        break;
      case 'grub':
        alive = stepGrub(b, ctx);
        break;
      case 'roller':
        alive = stepRoller(b, ctx);
        break;
      case 'plop':
        alive = stepPlop(b, ctx);
        break;
    }
    if (alive) next.push(b);
  }
  shot.bodies = next.concat(spawned);
}
