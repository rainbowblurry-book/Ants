/**
 * Match skeleton (DR-010, DR-011, DR-015).
 *
 * Stage 1 holds only what the sim core needs: the seed, the streams, the
 * terrain, the wind, the tick counter, the command log and live projectiles.
 * Weapons, ants, damage and the turn FSM arrive in stages 2 and 3.
 *
 * A match is fully described by (seed, levelId, [(tick, command)]), so it can
 * be re-simulated exactly.
 */
import { type Projectile, type StepResult, stepProjectile } from './physics.ts';
import { createStreams, SIM_STREAMS, type Streams } from './rng.ts';
import type { TerrainGrid } from './terrain.ts';
import type { WindField } from './wind.ts';

/** Commands are stamped with the sim tick they apply on (DR-015). */
export type Command = {
  tick: number;
  /** Stage 1 only knows a raw test launch; weapons replace it in stage 2. */
  kind: 'launch';
  x: number;
  y: number;
  vx: number;
  vy: number;
  ringR: number;
  windFactor: number;
};

export interface LiveProjectile extends Projectile {
  windFactor: number;
  age: number;
}

export interface MatchConfig {
  seed: number | string;
  levelId: string;
  terrain: TerrainGrid;
  wind: WindField;
}

export interface MatchEvent {
  tick: number;
  result: StepResult;
  x: number;
  y: number;
}

export class Match {
  readonly seed: number | string;
  readonly levelId: string;
  readonly streams: Streams;
  readonly terrain: TerrainGrid;
  readonly wind: WindField;
  tick = 0;
  turn = 0;
  readonly log: Command[] = [];
  projectiles: LiveProjectile[] = [];
  events: MatchEvent[] = [];
  private pending: Command[] = [];

  constructor(cfg: MatchConfig) {
    this.seed = cfg.seed;
    this.levelId = cfg.levelId;
    this.streams = createStreams(cfg.seed, cfg.levelId);
    this.terrain = cfg.terrain;
    this.wind = cfg.wind;
    this.wind.onTurnStart(0, this.streams.wind);
  }

  /** Queues a command for the next tick and records it in the log. */
  push(cmd: Omit<Command, 'tick'>): void {
    const full = { ...cmd, tick: this.tick + 1 } as Command;
    this.pending.push(full);
    this.log.push(full);
  }

  /** Advances one fixed 60 Hz step. */
  step(): void {
    this.tick++;
    for (const c of this.pending) this.apply(c);
    this.pending = [];
    const alive: LiveProjectile[] = [];
    for (const p of this.projectiles) {
      const w = this.wind.accel(p.x, p.y, this.tick);
      const r = stepProjectile(p, this.terrain, w.x * p.windFactor, w.y * p.windFactor);
      p.age++;
      if (r.kind === 'flying') {
        alive.push(p);
      } else {
        this.events.push({ tick: this.tick, result: r, x: p.x, y: p.y });
      }
    }
    this.projectiles = alive;
  }

  private apply(c: Command): void {
    if (c.kind === 'launch') {
      this.projectiles.push({
        x: c.x,
        y: c.y,
        vx: c.vx,
        vy: c.vy,
        ringR: c.ringR,
        windFactor: c.windFactor,
        age: 0,
      });
    }
  }

  /** Hash of everything that is sim state, for replay checks (DR-011). */
  stateHash(): number {
    let h = this.terrain.hash() ^ Math.imul(this.tick, 0x9e3779b1);
    const mix = (v: number) => {
      h ^= v >>> 0;
      h = Math.imul(h, 0x01000193);
    };
    for (const name of SIM_STREAMS) for (const s of this.streams[name].getState()) mix(s);
    const f = new Float64Array(1);
    const u = new Uint32Array(f.buffer);
    for (const p of this.projectiles) {
      for (const v of [p.x, p.y, p.vx, p.vy]) {
        f[0] = v;
        mix(u[0] as number);
        mix(u[1] as number);
      }
    }
    return h >>> 0;
  }
}
