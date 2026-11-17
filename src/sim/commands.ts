/**
 * Player and bot commands (DR-015, DR-033, J8, J9).
 *
 * Every input becomes a Command stamped with the sim tick it reaches the sim
 * on. A match is (seed, level, [command]), so it replays exactly (DR-011).
 *
 * Commands always address the ant whose turn it is. Pending commands sit in a
 * 4-slot ring. Fire is kept for 12 ticks and a jump for 9 ticks while the sim
 * cannot take them yet; everything else applies at once or is dropped. The
 * windows count sim ticks, never wall time, so the buffer is deterministic.
 */
import { WEAPON_IDS, type WeaponId } from './weapons/types.ts';

export type CommandBody =
  /** Set-then-fire (DR-033): angle in 0.1° above the horizontal toward facing, power in ‰. */
  | { kind: 'fire'; weapon: WeaponId; angleDeci: number; powerMille: number }
  /** Held walk direction; 0 stops. A held state, never buffered. */
  | { kind: 'walk'; dir: -1 | 0 | 1 }
  /** Turn to face a direction without walking. */
  | { kind: 'face'; dir: -1 | 1 }
  | { kind: 'hop' }
  | { kind: 'flip' }
  /**
   * The one "tap": passes the two-player gate, skips a skippable TurnStart,
   * and fast-forwards TurnEnd at 2x (DR-042, DR-045, DR-071).
   */
  | { kind: 'ready' }
  /**
   * Drops everything still waiting in the ring and releases the held walk.
   * Sent when play resumes after Pause (DR-171: "clears input buffers"). It is
   * a logged command, so a replay clears the same inputs.
   */
  | { kind: 'cancel' };

export type Command = CommandBody & { tick: number };

/** DR-015 buffer windows, in ticks at 60 Hz. */
export const FIRE_BUFFER_TICKS = 12;
export const JUMP_BUFFER_TICKS = 9;
/** DR-015: the ring holds 4 pending commands. */
export const RING_SLOTS = 4;

/** Aim limits (DR-033): −20° to +90° relative to facing; power 0 to 100%. */
export const AIM_MIN_DECI = -200;
export const AIM_MAX_DECI = 900;
export const POWER_MAX_MILLE = 1000;

/** How long a command may wait for the sim to become ready for it. */
export function bufferTicks(kind: CommandBody['kind']): number {
  if (kind === 'fire') return FIRE_BUFFER_TICKS;
  if (kind === 'hop' || kind === 'flip') return JUMP_BUFFER_TICKS;
  return 0;
}

/** True if the command is well-formed: integers in range, a real weapon (J9). */
export function isValidCommand(c: CommandBody): boolean {
  switch (c.kind) {
    case 'fire':
      return (
        WEAPON_IDS.includes(c.weapon) &&
        Number.isInteger(c.angleDeci) &&
        c.angleDeci >= AIM_MIN_DECI &&
        c.angleDeci <= AIM_MAX_DECI &&
        Number.isInteger(c.powerMille) &&
        c.powerMille >= 0 &&
        c.powerMille <= POWER_MAX_MILLE
      );
    case 'walk':
      return c.dir === -1 || c.dir === 0 || c.dir === 1;
    case 'face':
      return c.dir === -1 || c.dir === 1;
    case 'hop':
    case 'flip':
    case 'ready':
    case 'cancel':
      return true;
    default:
      return false;
  }
}

/** What the sim did with a pending command this tick. */
export type Verdict = 'done' | 'keep' | 'drop';

/** The 4-slot ring of pending commands, oldest first. */
export class CommandRing {
  private slots: Command[] = [];

  /** Adds a command. If the ring is full the oldest is dropped and returned. */
  push(c: Command): Command | null {
    this.slots.push(c);
    return this.slots.length > RING_SLOTS ? (this.slots.shift() ?? null) : null;
  }

  /**
   * Offers every pending command to the sim, oldest first. `visit` gets the
   * command and its age in ticks (0 on the tick it arrives) and says whether
   * it was applied, should wait, or is dropped. A command that asks to wait
   * past its buffer window is dropped.
   */
  drain(tick: number, visit: (c: Command, age: number) => Verdict): Command[] {
    const kept: Command[] = [];
    const dropped: Command[] = [];
    for (const c of this.slots) {
      const age = tick - c.tick;
      const v = visit(c, age);
      if (v === 'keep' && age < bufferTicks(c.kind)) kept.push(c);
      else if (v !== 'done') dropped.push(c);
    }
    this.slots = kept;
    return dropped;
  }

  /** Buffered commands are cleared on turn change (DR-015). */
  clear(): void {
    this.slots = [];
  }

  get pending(): readonly Command[] {
    return this.slots;
  }
}
