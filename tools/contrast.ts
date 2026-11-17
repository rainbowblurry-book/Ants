/**
 * WCAG 2.x contrast (DR-080, DR-088). Used by the contrast test (UI.md §6
 * check 1). Colours are #RRGGBB strings.
 */
function channel(v8: number): number {
  const c = v8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `top` at `alpha` over `under`, as #RRGGBB (rounded like a browser). */
export function blend(top: string, alpha: number, under: string): string {
  const t = rgb(top);
  const u = rgb(under);
  const mix = t.map((v, i) => Math.round(v * alpha + (u[i] as number) * (1 - alpha)));
  return `#${mix
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}
