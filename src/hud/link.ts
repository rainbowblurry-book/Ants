/**
 * What the Battle scene shares with the Hud and Pause scenes (DR-120, DR-171).
 *
 * The Hud only reads sim state and sends commands through `push` (which is
 * `match.push`), so replays stay exact (DR-010, DR-015). Aim memory and the
 * picked weapon live here, not in the Hud, so a Hud rebuild on resize keeps
 * them. Camera access is render only.
 */

import type { AimMemory } from '../input/aim';
import type { CameraDirector, CamView } from '../render/camera';
import type { CommandBody } from '../sim/commands';
import type { Match } from '../sim/match';
import type { WeaponId } from '../sim/weapons/types';
import { screenSize } from '../ui/layout';
import type { Handed } from './layout';

export interface AimPreview {
  ant: number;
  weapon: WeaponId;
  angleDeci: number;
  powerMille: number;
}

/** A `?bot` match (proposed OVR-020): what the HUD needs about the bot team. */
export interface BotView {
  team: number;
  level: number;
  /** It is the bot's turn: the player's input is ignored and the controls are inactive. */
  turn: boolean;
  /** The bot's aim as shown now, for the dial and slider mirror at 55% (DR-129), or null. */
  aim: { angleDeci: number; powerMille: number } | null;
}

export interface BattleLink {
  match: Match;
  /** Team names (J45). */
  names: [string, string];
  /** Two-player hot seat: gate, team frame, coin-flip pop (DR-183). */
  versus: boolean;
  handed: Handed;
  /** Assist aim preview, 1.0 s (DR-033). */
  assist: boolean;
  aims: AimMemory;
  /** Per team: the weapon picked last. */
  weapon: WeaponId[];
  /** Set by the Hud each frame; the Battle draws the dots in the world (DR-129). */
  preview: AimPreview | null;
  /** Set by the Battle each frame in a bot match; null in the hot seat. */
  bot: BotView | null;
  /** The view the Battle camera drew last (gameplay zoom, logical px). */
  view(): CamView;
  cam: CameraDirector;
  push(cmd: CommandBody): boolean;
  /** True while the Pause overlay is open. */
  paused: boolean;
  openPause(): void;
  /** Called by Pause after the ready delay: clears buffers and lets play run (DR-171). */
  resumePlay(): void;
  /** Restart: a new match with the same setup and a fresh match seed (DR-182). */
  restart(): void;
  /** "Match saved" or "Saving is off" (DR-173). */
  saving(): boolean;
}

/** Logical screen position of a world point under a camera view. */
/** World → Hud screen px. The world camera's centre is the screen's centre (OVR-013). */
export function worldToScreen(v: CamView, x: number, y: number): { x: number; y: number } {
  return { x: (x - v.cx) * v.zoom + screenSize.w / 2, y: (y - v.cy) * v.zoom + 270 };
}

export function screenToWorld(v: CamView, x: number, y: number): { x: number; y: number } {
  return { x: (x - screenSize.w / 2) / v.zoom + v.cx, y: (y - 270) / v.zoom + v.cy };
}
