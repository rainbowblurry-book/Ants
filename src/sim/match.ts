/**
 * Match skeleton (DR-010, DR-011, DR-015).
 *
 * Holds the seed, the streams, the terrain, the wind, the ants, the live shot
 * and the tick-stamped command log. The turn state machine, timer and win
 * check arrive in stage 3; until then commands apply on the tick they name.
 *
 * A match is fully described by (seed, levelId, [(tick, command)]), so it can
 * be re-simulated exactly.
 */
import { type Ant, backflip, hop, isActive, stepAnt, walkStep } from './movement.ts';
import { type Ammo, collectPickups, type Pickup } from './pickups.ts';
import { createStreams, SIM_STREAMS, type Streams } from './rng.ts';
import type { TerrainGrid } from './terrain.ts';
import { fire, type Shot, stepShot, WEAPONS, type WeaponId, type World } from './weapons/index.ts';
import type { WindField } from './wind.ts';

/** Commands are stamped with the sim tick they apply on (DR-015). */
export type Command =
  | {
      tick: number;
      kind: 'fire';
      ant: number;
      weapon: WeaponId;
      angleDeci: number;
      powerMille: number;
    }
  | { tick: number; kind: 'walk'; ant: number; dir: -1 | 0 | 1 }
  | { tick: number; kind: 'hop'; ant: number }
  | { tick: number; kind: 'flip'; ant: number };

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'tick'> : never) : never;

export interface MatchConfig {
  seed: number | string;
  levelId: string;
  terrain: TerrainGrid;
  wind: WindField;
  ants: Ant[];
  pickups?: Pickup[];
  /** Ammo per team; defaults to the two-player row (DR-034, J24). */
  ammo?: Ammo[];
}

export function defaultAmmo(): Ammo {
  return {
    seed: WEAPONS.seed.ammo2p,
    dewdrop: WEAPONS.dewdrop.ammo2p,
    pollen: WEAPONS.pollen.ammo2p,
    grub: WEAPONS.grub.ammo2p,
    roller: WEAPONS.roller.ammo2p,
    plop: WEAPONS.plop.ammo2p,
  };
}

export class Match {
  readonly seed: number | string;
  readonly levelId: string;
  readonly streams: Streams;
  readonly world: World;
  readonly ammo: Ammo[];
  tick = 0;
  turn = 0;
  readonly log: Command[] = [];
  shot: Shot | null = null;
  /** Finished shots, newest last (events for tests and the renderer). */
  readonly shots: Shot[] = [];
  private pending: Command[] = [];
  private walking: (-1 | 0 | 1)[];

  constructor(cfg: MatchConfig) {
    this.seed = cfg.seed;
    this.levelId = cfg.levelId;
    this.streams = createStreams(cfg.seed, cfg.levelId);
    this.world = {
      grid: cfg.terrain,
      ants: cfg.ants,
      wind: cfg.wind,
      tick: 0,
      spread: this.streams.spread,
      pickups: cfg.pickups ?? [],
    };
    this.ammo = cfg.ammo ?? [defaultAmmo(), defaultAmmo()];
    this.walking = cfg.ants.map(() => 0);
    cfg.wind.onTurnStart(0, this.streams.wind);
  }

  get terrain(): TerrainGrid {
    return this.world.grid;
  }

  get ants(): Ant[] {
    return this.world.ants;
  }

  /** Queues a command for the next tick and records it in the log. */
  push(cmd: CommandBody): void {
    const full = { ...cmd, tick: this.tick + 1 } as Command;
    this.pending.push(full);
    this.log.push(full);
  }

  /** Advances one fixed 60 Hz step. */
  step(): void {
    this.tick++;
    this.world.tick = this.tick;
    for (const c of this.pending) this.apply(c);
    this.pending = [];
    if (this.shot) {
      stepShot(this.world, this.shot);
      if (this.shot.bodies.length === 0) {
        this.shots.push(this.shot);
        this.shot = null;
      }
    }
    const ants = this.world.ants;
    for (let i = 0; i < ants.length; i++) {
      const a = ants[i] as Ant;
      if (!isActive(a)) continue;
      const dir = this.walking[i] ?? 0;
      if (dir !== 0 && a.state === 'ground') walkStep(a, this.world.grid, dir);
      else stepAnt(a, this.world.grid);
      collectPickups(a, this.world.pickups, this.ammo[a.team] as Ammo);
    }
  }

  private apply(c: Command): void {
    const ant = this.world.ants[c.ant];
    if (!ant || !isActive(ant)) return;
    switch (c.kind) {
      case 'fire': {
        if (this.shot) return;
        const pool = this.ammo[ant.team] as Ammo;
        if (!(pool[c.weapon] > 0)) return;
        pool[c.weapon] -= 1;
        this.shot = fire(this.world, c.ant, c.weapon, c.angleDeci, c.powerMille);
        return;
      }
      case 'walk':
        this.walking[c.ant] = c.dir;
        return;
      case 'hop':
        hop(ant);
        return;
      case 'flip':
        backflip(ant);
        return;
    }
  }

  /** Hash of everything that is sim state, for replay checks (DR-011). */
  stateHash(): number {
    let h = this.world.grid.hash() ^ Math.imul(this.tick, 0x9e3779b1);
    const mix = (v: number) => {
      h ^= v >>> 0;
      h = Math.imul(h, 0x01000193);
    };
    const f = new Float64Array(1);
    const u = new Uint32Array(f.buffer);
    const mixF = (v: number) => {
      f[0] = v;
      mix(u[0] as number);
      mix(u[1] as number);
    };
    for (const name of SIM_STREAMS) for (const s of this.streams[name].getState()) mix(s);
    for (const a of this.world.ants) {
      for (const v of [a.x, a.y, a.vx, a.vy, a.hp, a.budget, a.apexY]) mixF(v);
      mix(a.state === 'ground' ? 1 : a.state === 'air' ? 2 : 3);
    }
    for (const b of this.shot?.bodies ?? [])
      for (const v of [b.p.x, b.p.y, b.p.vx, b.p.vy]) mixF(v);
    for (const p of this.world.pickups) {
      mixF(p.x);
      mixF(p.y);
    }
    for (const pool of this.ammo) for (const v of Object.values(pool)) mixF(v);
    return h >>> 0;
  }
}
