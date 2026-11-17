/**
 * DR-011 / DR-010 ban scanner, used by tests/ban-scan.test.ts.
 * Sim and AI code must be deterministic and engine-free. Comments and string
 * contents are stripped before scanning.
 *
 * `new Set` / `new Map` are allowed only with a `det-ok:` comment on the same
 * line, saying why iteration order cannot depend on timing.
 */
export const BANS: { name: string; re: RegExp }[] = [
  { name: 'Math.random', re: /\bMath\s*\.\s*random\b/ },
  { name: 'Date', re: /\bDate\b/ },
  { name: 'performance.now', re: /\bperformance\b/ },
  {
    name: 'non-exact Math function',
    re: /\bMath\s*\.\s*(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|pow|exp|expm1|log|log2|log10|log1p|cbrt|hypot)\b/,
  },
  { name: '** operator', re: /\*\*/ },
  { name: 'comparator-less sort', re: /\.\s*(sort|toSorted)\s*\(\s*\)/ },
  {
    name: 'phaser import',
    re: /from\s+['"]phaser['"]|import\s*\(\s*['"]phaser['"]|require\s*\(\s*['"]phaser['"]/,
  },
];
const SET_MAP = /\bnew\s+(Set|Map|WeakMap|WeakSet)\b/;

/** Replaces comments and string/template contents with spaces, keeping line breaks. */
export function stripCode(src: string): { code: string; comments: string[] } {
  let out = '';
  const comments: string[] = src.split('\n').map(() => '');
  let line = 0;
  let i = 0;
  const blank = (ch: string) => (ch === '\n' ? '\n' : ' ');
  while (i < src.length) {
    const c = src[i] as string;
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') {
        comments[line] = (comments[line] ?? '') + src[i];
        out += ' ';
        i++;
      }
    } else if (c === '/' && n === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        else comments[line] = (comments[line] ?? '') + src[i];
        out += blank(src[i] as string);
        i++;
      }
      out += '  ';
      i += 2;
    } else if (c === "'" || c === '"' || c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        if (src[i] === '\n') line++;
        out += blank(src[i] as string);
        i++;
      }
      out += c;
      i++;
    } else {
      if (c === '\n') line++;
      out += c;
      i++;
    }
  }
  return { code: out, comments };
}

export function scan(src: string): string[] {
  const hits: string[] = [];
  const { code, comments } = stripCode(src);
  const lines = code.split('\n');
  // The phaser import check reads the raw line (the specifier is a string).
  const raw = src.split('\n');
  lines.forEach((l, i) => {
    for (const b of BANS) {
      const text = b.name === 'phaser import' ? (raw[i] ?? '') : l;
      if (b.re.test(text)) hits.push(`${i + 1}: ${b.name}`);
    }
    if (SET_MAP.test(l) && !/det-ok:/.test(comments[i] ?? '')) {
      hits.push(`${i + 1}: Set/Map without det-ok comment`);
    }
  });
  return hits;
}
