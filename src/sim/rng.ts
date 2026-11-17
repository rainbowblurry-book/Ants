/**
 * Seeded random streams for the sim (DR-011, J9).
 *
 * - Generator: sfc32 (128-bit state).
 * - Seed: cyrb128 of the string "{matchSeed}:{levelId}:{purpose}".
 * - Five independent streams. Sim code never reads `cosmetic`, so extra
 *   particles can never change a shot.
 *
 * Only 32-bit integer ops (`Math.imul`, shifts, `| 0`) and one exact division
 * by 2^32 are used, so every JS engine gives the same numbers.
 */

export const STREAM_NAMES = ['terrain', 'wind', 'spread', 'ai', 'cosmetic'] as const;
export type StreamName = (typeof STREAM_NAMES)[number];

/** cyrb128: hashes a string to four 32-bit words. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Saved form of a stream, for replays and snapshots. */
export type RngState = [number, number, number, number];

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(state: RngState) {
    this.a = state[0] >>> 0;
    this.b = state[1] >>> 0;
    this.c = state[2] >>> 0;
    this.d = state[3] >>> 0;
  }

  static fromString(seed: string): Rng {
    return new Rng(cyrb128(seed));
  }

  /**
   * Next raw 32-bit unsigned integer. This is sfc32 exactly as published
   * (PractRand): the output adds the counter *before* it is incremented.
   */
  nextU32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Integer in [lo, hi], both inclusive. */
  int(lo: number, hi: number): number {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
      throw new RangeError(`Rng.int: bad range [${lo}, ${hi}]`);
    }
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  getState(): RngState {
    return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
  }

  setState(state: RngState): void {
    this.a = state[0] >>> 0;
    this.b = state[1] >>> 0;
    this.c = state[2] >>> 0;
    this.d = state[3] >>> 0;
  }
}

export type Streams = Record<StreamName, Rng>;

/** The seed string for one stream (DR-011). */
export function streamSeed(
  matchSeed: number | string,
  levelId: string,
  purpose: StreamName,
): string {
  return `${matchSeed}:${levelId}:${purpose}`;
}

/** Creates the five streams for a match. */
export function createStreams(matchSeed: number | string, levelId: string): Streams {
  return {
    terrain: Rng.fromString(streamSeed(matchSeed, levelId, 'terrain')),
    wind: Rng.fromString(streamSeed(matchSeed, levelId, 'wind')),
    spread: Rng.fromString(streamSeed(matchSeed, levelId, 'spread')),
    ai: Rng.fromString(streamSeed(matchSeed, levelId, 'ai')),
    cosmetic: Rng.fromString(streamSeed(matchSeed, levelId, 'cosmetic')),
  };
}

/** The sim-state streams (everything but `cosmetic`), in a fixed order. */
export const SIM_STREAMS: readonly StreamName[] = ['terrain', 'wind', 'spread', 'ai'];
