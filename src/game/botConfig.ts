/**
 * A bot match before the stage 7 menus (proposed OVR-020).
 *
 * `?bot=N` on the M1 hot-seat battle makes team 1 (Amber) a bot at AI level
 * N (0..100, clamped); `&boss=1` makes it a boss (DR-063: level + 5, true
 * wind). Anything that is not a whole number means no bot, and without the
 * parameter the hot seat is unchanged. The stage 7 Setup and level screens
 * replace this switch. Pure: no Phaser.
 */
import type { TwoPlayerSetup } from '../save/schema.ts';

export interface BotConfig {
  /** The bot's team (Amber). */
  team: number;
  /** AI level 0..100 (DR-063). */
  level: number;
  boss: boolean;
}

/** The team a `?bot` match hands to the bot. */
export const BOT_TEAM = 1;

/** Reads `?bot=N[&boss=1]`; null when there is no bot or the value is not a whole number. */
export function parseBotConfig(search: string): BotConfig | null {
  const params = new URLSearchParams(search);
  const raw = params.get('bot');
  if (raw === null || !/^[+-]?\d{1,6}$/.test(raw.trim())) return null;
  const level = Math.max(0, Math.min(100, Number(raw.trim())));
  return { team: BOT_TEAM, level, boss: params.get('boss') === '1' };
}

/**
 * The hot-seat setup for a bot match: no "Pass the phone" gate, which only
 * makes sense for two people on one phone (DR-183). The rest is unchanged.
 */
export function botSetup(setup: TwoPlayerSetup, bot: BotConfig | null): TwoPlayerSetup {
  return bot ? { ...setup, passPhone: false } : setup;
}
