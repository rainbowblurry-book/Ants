/**
 * A match (DR-010, DR-011, DR-015, DR-041 to DR-044, DR-047).
 *
 * Holds the seed, the streams, the terrain, the wind, the ants, the live shot,
 * the turn machine and the tick-stamped command log. Scenes only read state
 * and call `push` and `step`.
 *
 * A match is fully described by (seed, levelId, [(tick, command)]), so it can
 * be re-simulated exactly: see `replay.ts`.
 */
import { type Command, type CommandBody, isValidCommand } from './commands.ts';
import type { Ant } from './movement.ts';
import type { Ammo, Pickup } from './pickups.ts';
import { createStreams, SIM_STREAMS, type Streams } from './rng.ts';
import type { TerrainGrid } from './terrain.ts';
import {
  defaultRules,
  type MatchEvent,
  type MatchResult,
  type Phase,
  SD_WARN_BEFORE,
  TurnMachine,
  type TurnRules,
} from './turn.ts';
import { type Body, type Shot, WEAPON_IDS, WEAPONS, type World } from './weapons/index.ts';
import type { WindField } from './wind.ts';

export type { Command, CommandBody } from './commands.ts';

export interface MatchConfig {
  seed: number | string;
  levelId: string;
  terrain: TerrainGrid;
  wind: WindField;
  ants: Ant[];
  pickups?: Pickup[];
  /** Ammo per team; defaults to the two-player row (DR-034, J24). */
  ammo?: Ammo[];
  /** Turn rules; anything left out takes the DR-042 to DR-044 defaults. */
  rules?: Partial<TurnRules>;
  /** Blasts hurt the shooter's own team (DR-035). Two-player can turn it off (OVR-015). */
  friendlyFire?: boolean;
}

/** Fills in the turn rules; the dew warning follows the dew round unless given (OVR-012). */
export function matchRules(terrain: TerrainGrid, rules: Partial<TurnRules> = {}): TurnRules {
  const out = { ...defaultRules(terrain), ...rules };
  if (rules.warnRound === undefined) out.warnRound = out.dewFromRound - SD_WARN_BEFORE;
  return out;
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

const PHASE_CODE: Record<Phase, number> = {
  turnStart: 1,
  aim: 2,
  fire: 3,
  resolve: 4,
  turnEnd: 5,
  matchEnd: 6,
};

export class Match {
  readonly seed: number | string;
  readonly levelId: string;
  readonly streams: Streams;
  readonly world: World;
  readonly ammo: Ammo[];
  readonly turns: TurnMachine;
  tick = 0;
  /** Every command accepted by `push`, in order (the replay input). */
  readonly log: Command[] = [];
  shot: Shot | null = null;
  /** Finished shots, newest last (events for tests and the renderer). */
  readonly shots: Shot[] = [];
  /** Turn and match events, oldest first. Not sim state. */
  readonly events: MatchEvent[] = [];

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
      friendlyFire: cfg.friendlyFire ?? true,
    };
    this.ammo = cfg.ammo ?? [defaultAmmo(), defaultAmmo()];
    this.turns = new TurnMachine(this, matchRules(cfg.terrain, cfg.rules));
  }

  /** The `wind` stream: the coin flip and the wind rolls. */
  get windRng() {
    return this.streams.wind;
  }

  get terrain(): TerrainGrid {
    return this.world.grid;
  }

  get ants(): Ant[] {
    return this.world.ants;
  }

  get phase(): Phase {
    return this.turns.phase;
  }

  /** The ant whose turn it is. */
  get activeAnt(): Ant | undefined {
    return this.world.ants[this.turns.ant];
  }

  /** Set once the match has been decided (it is announced when TurnEnd finishes). */
  get result(): MatchResult | null {
    return this.turns.result;
  }

  get over(): boolean {
    return this.turns.phase === 'matchEnd';
  }

  /**
   * Queues a command for the next tick and records it in the log. Commands
   * address the ant whose turn it is. Returns false, and logs nothing, if the
   * command is malformed or the match is over.
   */
  push(cmd: CommandBody): boolean {
    if (this.over || !isValidCommand(cmd)) return false;
    const full = { ...cmd, tick: this.tick + 1 } as Command;
    this.log.push(full);
    this.turns.push(this, full);
    return true;
  }

  /** Advances one fixed 60 Hz step. Does nothing once the match is over. */
  step(): void {
    if (this.over) return;
    this.tick++;
    this.world.tick = this.tick;
    this.turns.step(this);
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
    const mixS = (s: string) => {
      mix(s.length);
      for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i));
    };
    const mixB = (b: boolean) => mix(b ? 1 : 0);

    for (const name of SIM_STREAMS) for (const s of this.streams[name].getState()) mix(s);

    for (const a of this.world.ants) {
      for (const v of [a.x, a.y, a.vx, a.vy, a.hp, a.budget, a.apexY, a.facing, a.waterTicks]) {
        mixF(v);
      }
      mixS(a.state);
      mixS(a.koBy ?? '');
      mixB(a.bounced);
      mixB(a.skipNextTurn);
    }

    mixB(this.shot !== null);
    if (this.shot) {
      mixS(this.shot.weapon);
      mix(this.shot.shooter);
      for (const d of this.shot.dealt) mixF(d);
      for (const b of this.shot.bodies) hashBody(b, mixF, mixS, mixB);
    }

    for (const p of this.world.pickups) {
      mixS(p.kind);
      mixF(p.x);
      mixF(p.y);
    }
    for (const pool of this.ammo) for (const id of WEAPON_IDS) mixF(pool[id]);

    const g = this.world.wind.gauge(this.tick);
    mixF(g.level);
    mixF(g.vertical);
    mixF(g.next ?? Number.NaN);

    const t = this.turns;
    mix(PHASE_CODE[t.phase]);
    for (const v of t.stateNumbers()) mixF(v);
    for (const c of t.ring.pending) {
      mixS(c.kind);
      mix(c.tick);
    }
    mixB(t.result !== null);
    if (t.result) {
      mixF(t.result.winner ?? -1);
      mixS(t.result.reason);
    }
    return h >>> 0;
  }
}

function hashBody(
  b: Body,
  mixF: (v: number) => void,
  mixS: (s: string) => void,
  mixB: (b: boolean) => void,
): void {
  mixS(b.kind);
  for (const v of [b.p.x, b.p.y, b.p.vx, b.p.vy, b.p.ringR, b.ignore, b.age]) mixF(v);
  switch (b.kind) {
    case 'dewdrop':
      mixF(b.bounces);
      mixB(b.resting);
      break;
    case 'grub':
      mixB(b.digging);
      for (const v of [b.hx, b.hy, b.digTicks]) mixF(v);
      break;
    case 'roller':
      mixS(b.mode);
      for (const v of [b.u, b.fuse, b.dir]) mixF(v);
      mixB(b.wallBounced);
      break;
    default:
      break;
  }
}
