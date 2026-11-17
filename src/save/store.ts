/**
 * Storage for the progress save (DR-018, DR-047, DR-173, J18).
 *
 * - One versioned key, `ants.save.v1`, read and written inside try/catch.
 * - If storage is blocked (Safari private mode throws), the game runs from
 *   memory and `persistent` is false, so the UI can say "Saving is off".
 * - A blob that cannot be parsed or migrated is moved to `ants.save.bak` and
 *   a fresh save is used. The bad data is kept, never silently deleted.
 */
import { freshSave, normalise, SAVE_VERSION, type SaveV1 } from './schema.ts';

export const SAVE_KEY = 'ants.save.v1';
export const SAVE_BAK_KEY = 'ants.save.bak';
const PROBE_KEY = 'ants.probe';

/** The part of `Storage` the game uses. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** One step of the chain: takes a save at version n and returns version n + 1. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** Index n upgrades version n to n + 1. v1 is the first shipped version, so there are none yet. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

/**
 * Upgrades a parsed blob to the current version, then validates it.
 * Returns null if it is not a save, or comes from a newer build.
 */
export function migrate(
  raw: unknown,
  current: number = SAVE_VERSION,
  steps: Readonly<Record<number, Migration>> = MIGRATIONS,
): SaveV1 | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  let blob = raw as Record<string, unknown>;
  let v = blob.v;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > current) return null;
  while (v < current) {
    const step = steps[v];
    if (!step) return null;
    blob = step(blob);
    v += 1;
    blob.v = v;
  }
  return normalise(blob);
}

export type LoadStatus =
  /** Nothing was stored. */
  | 'fresh'
  | 'loaded'
  /** The stored blob was bad; it is now in `ants.save.bak`. */
  | 'recovered';

/** An in-memory stand-in for blocked storage. */
export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export class SaveStore {
  /** False when the device will not keep saves (DR-173). */
  readonly persistent: boolean;
  private readonly store: KeyValueStore;

  /** Pass `window.localStorage`, or null where there is none. Access may throw; that is handled. */
  constructor(storage: (() => KeyValueStore | null | undefined) | KeyValueStore | null) {
    let real: KeyValueStore | null = null;
    try {
      real = (typeof storage === 'function' ? storage() : storage) ?? null;
      if (real) {
        real.setItem(PROBE_KEY, '1');
        if (real.getItem(PROBE_KEY) !== '1') real = null;
        else real.removeItem(PROBE_KEY);
      }
    } catch {
      real = null;
    }
    this.persistent = real !== null;
    this.store = real ?? new MemoryStore();
  }

  /** Raw read, null on any failure. */
  read(key: string): string | null {
    try {
      return this.store.getItem(key);
    } catch {
      return null;
    }
  }

  /** Raw write. Returns false if the device refused (full or blocked). */
  write(key: string, value: string): boolean {
    try {
      this.store.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.store.removeItem(key);
    } catch {
      // Nothing to do: the key stays, and the next read handles it.
    }
  }

  /** Loads the progress save. Never throws. */
  load(): { save: SaveV1; status: LoadStatus } {
    const text = this.read(SAVE_KEY);
    if (text === null) return { save: freshSave(), status: 'fresh' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const save = migrate(parsed);
    if (save) return { save, status: 'loaded' };
    // Corrupt, or from a newer build: keep the blob aside and start fresh.
    this.write(SAVE_BAK_KEY, text);
    this.remove(SAVE_KEY);
    return { save: freshSave(), status: 'recovered' };
  }

  /** Writes the progress save. Returns false if it could not be stored. */
  save(save: SaveV1): boolean {
    return this.write(SAVE_KEY, JSON.stringify(save));
  }
}
