/**
 * Text fitting (DR-087, UI.md §1.3).
 *
 * Order: shrink in 1 px steps to the role's floor, then wrap to the
 * component's max lines, then add an ellipsis. Ellipsis is allowed only on
 * names and level titles, never on verbs, numbers, wind or cost. A dev build
 * throws on a forbidden ellipsis; production marks the result `overflow`.
 *
 * Pure: the caller passes `measure(text, size)` (bitmap or canvas width).
 */
import { tokens } from './theme.ts';

export type Role = 'display' | 'title' | 'label' | 'numeral' | 'body' | 'caption';

export function roleSize(role: Role): number {
  return tokens.type[role].size;
}

/** The smallest size a role may shrink to. Numerals never shrink. */
export function roleFloor(role: Role): number {
  const floors = tokens.type.shrinkFloor as Record<string, number>;
  return floors[role] ?? roleSize(role);
}

export interface FitOptions {
  role: Role;
  maxWidth: number;
  maxLines?: number;
  /** Only names and level titles (DR-087). */
  ellipsisAllowed?: boolean;
  /** Start size; defaults to the role size (text size Large scales body and caption, J34). */
  size?: number;
  measure: (text: string, size: number) => number;
  /** Throw instead of marking overflow (dev builds). */
  strict?: boolean;
}

export interface FitResult {
  size: number;
  lines: string[];
  ellipsis: boolean;
  /** True when the text could not fit without a forbidden ellipsis. */
  overflow: boolean;
}

export class ForbiddenEllipsisError extends Error {}

const ELLIPSIS = '…';

/** Greedy word wrap. A single word longer than the width stays on its own line. */
export function wrap(
  text: string,
  size: number,
  maxWidth: number,
  measure: FitOptions['measure'],
): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line === '' ? word : `${line} ${word}`;
      if (line !== '' && measure(next, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

function ellipsize(
  line: string,
  size: number,
  maxWidth: number,
  measure: FitOptions['measure'],
): string {
  let s = line;
  while (s.length > 0 && measure(`${s}${ELLIPSIS}`, size) > maxWidth) s = s.slice(0, -1).trimEnd();
  return `${s}${ELLIPSIS}`;
}

export function fitText(text: string, o: FitOptions): FitResult {
  const maxLines = o.maxLines ?? 1;
  const start = o.size ?? roleSize(o.role);
  const floor = Math.min(start, roleFloor(o.role));

  // 1. Shrink on one line.
  for (let size = start; size >= floor; size--) {
    if (!text.includes('\n') && o.measure(text, size) <= o.maxWidth) {
      return { size, lines: [text], ellipsis: false, overflow: false };
    }
  }

  // 2. Wrap at the floor.
  const lines = wrap(text, floor, o.maxWidth, o.measure);
  const widest = Math.max(...lines.map((l) => o.measure(l, floor)));
  if (lines.length <= maxLines && widest <= o.maxWidth) {
    return { size: floor, lines, ellipsis: false, overflow: false };
  }

  // 3. Ellipsis, names and titles only.
  if (o.ellipsisAllowed) {
    const kept = lines.slice(0, maxLines);
    const last = kept.length - 1;
    const rest = lines.slice(last).join(' ');
    kept[last] = ellipsize(rest, floor, o.maxWidth, o.measure);
    return { size: floor, lines: kept, ellipsis: true, overflow: false };
  }
  if (o.strict)
    throw new ForbiddenEllipsisError(`fitText: "${text}" does not fit ${o.maxWidth} px`);
  return { size: floor, lines, ellipsis: false, overflow: true };
}
