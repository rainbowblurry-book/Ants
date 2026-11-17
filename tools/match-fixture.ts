/**
 * Shared helpers for the turn, replay and save tests: a small flat arena and
 * loops that run a match to a phase. Not shipped with the game.
 */
import { Match, type MatchConfig } from '../src/sim/match.ts';
import { type Ant, createAnt } from '../src/sim/movement.ts';
import type { Ammo } from '../src/sim/pickups.ts';
import { Material, TerrainGrid } from '../src/sim/terrain.ts';
import type { MatchEvent, Phase, TurnRules } from '../src/sim/turn.ts';
import { CALM, type WindField } from '../src/sim/wind.ts';

export const GROUND_Y = 400;

export function flatGrid(bottom: 'void' | 'water' | 'floor' = 'void'): TerrainGrid {
  const g = new TerrainGrid(960, 540, bottom);
  g.fillRect(0, GROUND_Y, 960, 540 - GROUND_Y, Material.SOIL);
  return g;
}

export function plentyAmmo(): Ammo {
  return { seed: Number.POSITIVE_INFINITY, dewdrop: 9, pollen: 9, grub: 9, roller: 9, plop: 9 };
}

export interface ArenaOpts {
  seed?: number | string;
  grid?: TerrainGrid;
  wind?: WindField;
  rules?: Partial<TurnRules>;
  /** Ants per team (default 2). Team 0 stands on the left facing right. */
  perTeam?: number;
  ants?: Ant[];
  ammo?: Ammo[];
}

/** Team 0 at x 150, 250, …; team 1 at x 800, 700, …; ids interleave 0,1,2,3 by team. */
export function arenaAnts(perTeam: number): Ant[] {
  const ants: Ant[] = [];
  for (let i = 0; i < perTeam; i++) {
    ants.push(createAnt(ants.length, 0, 150 + 100 * i, GROUND_Y, 1));
    ants.push(createAnt(ants.length, 1, 800 - 100 * i, GROUND_Y, -1));
  }
  return ants;
}

export function arenaConfig(o: ArenaOpts = {}): MatchConfig {
  return {
    seed: o.seed ?? 7,
    levelId: 'T',
    terrain: o.grid ?? flatGrid(),
    wind: o.wind ?? CALM,
    ants: o.ants ?? arenaAnts(o.perTeam ?? 2),
    ammo: o.ammo ?? [plentyAmmo(), plentyAmmo()],
    ...(o.rules ? { rules: o.rules } : {}),
  };
}

export function arena(o: ArenaOpts = {}): Match {
  return new Match(arenaConfig(o));
}

/** Steps until the match is in `phase` (or over). Returns the ticks stepped. */
export function runTo(m: Match, phase: Phase, max = 20000): number {
  let n = 0;
  while (m.phase !== phase && !m.over && n < max) {
    m.step();
    n++;
  }
  if (m.phase !== phase) throw new Error(`runTo: never reached ${phase} (at ${m.phase})`);
  return n;
}

/** Steps until the global turn index is `turn` and its Move/Aim phase has begun. */
export function runToAim(m: Match, turn: number, max = 200000): void {
  let n = 0;
  while (!(m.turns.turn === turn && m.phase === 'aim') && !m.over && n < max) {
    m.step();
    n++;
  }
  if (m.over || n >= max) throw new Error(`runToAim: never reached turn ${turn}`);
}

export function steps(m: Match, n: number): void {
  for (let i = 0; i < n; i++) m.step();
}

export function eventsOf<K extends MatchEvent['kind']>(
  m: Match,
  kind: K,
): Extract<MatchEvent, { kind: K }>[] {
  return m.events.filter((e): e is Extract<MatchEvent, { kind: K }> => e.kind === kind);
}

/** The tick each phase was entered, in order, as "phase@tick". */
export function phaseTrail(m: Match): string[] {
  return eventsOf(m, 'phase').map((e) => `${e.phase}@${e.tick}`);
}
