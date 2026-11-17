/**
 * Strings (DR-087, DR-196). All UI copy comes from the locale file, with
 * `{name}` placeholders. The `en-XA` pseudo-locale arrives with stage 7.
 */
import en from './en.json';

export type StringKey = Exclude<keyof typeof en, '_note'>;

const table: Record<string, string> = en;

export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  const raw = table[key];
  if (raw === undefined) throw new Error(`i18n: no string "${key}"`);
  return raw.replace(/\{([a-zA-Z]+)\}/g, (_m, name: string) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

/** Every string, for the font bake charset and tests. */
export function allStrings(): string[] {
  return Object.entries(table)
    .filter(([k]) => !k.startsWith('_'))
    .map(([, v]) => v);
}
