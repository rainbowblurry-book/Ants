/**
 * Replay (DR-011, DR-047): a match is (seed, level, [(tick, command)]).
 * Feeding the same log into a fresh match with the same config gives the same
 * state on every tick. Mid-match saves and resume use this instead of a
 * snapshot.
 */
import type { Command } from './commands.ts';
import type { Match } from './match.ts';

function pushLogged(match: Match, log: readonly Command[], i: number): void {
  const { tick, ...body } = log[i] as Command;
  if (!match.push(body)) throw new Error(`replay: command ${i} was refused at tick ${tick}`);
}

/**
 * Advances `match` to `untilTick`. Each logged command is pushed on the tick
 * before the one it is stamped with, so it gets the same stamp again.
 *
 * `log` must be the match's own log continued: the commands the match already
 * holds are skipped, so the call can be repeated in slices. With
 * `withPending`, commands pressed on the final tick (stamped untilTick + 1,
 * still waiting in the ring) are pushed as well; a resume needs that.
 *
 * Throws if the log and the match disagree, which means the build or the
 * level changed.
 */
export function runLog(
  match: Match,
  log: readonly Command[],
  untilTick: number,
  withPending = false,
): void {
  let i = match.log.length;
  const next = () => (i < log.length ? (log[i] as Command).tick : Number.POSITIVE_INFINITY);
  while (match.tick < untilTick && !match.over) {
    if (next() <= match.tick) throw new Error(`replay: command ${i} is out of order`);
    while (next() === match.tick + 1) pushLogged(match, log, i++);
    match.step();
  }
  if (!withPending || match.over) return;
  if (next() <= match.tick) throw new Error(`replay: command ${i} is out of order`);
  while (next() === match.tick + 1) pushLogged(match, log, i++);
}

/** Last tick a log reaches: the stamp of its final command, or 0. */
export function lastLogTick(log: readonly Command[]): number {
  return log.length > 0 ? (log[log.length - 1] as Command).tick : 0;
}
