/**
 * The ant art (R-03, CREATIVE §2, DR-007, DR-027).
 *
 *   node tools/draw-ants.ts          writes art/ants/*.svg
 *   node tools/draw-ants.ts --check  fails when art/ants/*.svg is stale
 *
 * Original flat vector shapes, drawn by hand in code for this game: no image
 * is embedded or traced. The parts (head, acorn cap, antennae, thorax, waist,
 * striped gaster, six limbs, faces) are shared, so each pose is a short list
 * of differences and both teams come out identical but for the cap colour and
 * the badge shape. Colours are only `var(--token)` from theme.json (DR-088);
 * tools/build-ui.ts bakes the SVGs into the shared atlas.
 *
 * Art rules (CREATIVE §1, §2, DR-003a): flat fills, one flat shade tone, a
 * thick plum outline with round joins and caps, no gradients, no filters, no
 * white highlights (white only in eyes, teeth and the badge ring).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FACES, HERO_POSES, SIDE_POSES, TEAM_NAMES } from '../src/assets/manifest.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
export const ANT_ART_DIR = join(root, 'art', 'ants');

type AntTeam = (typeof TEAM_NAMES)[number];
type SidePoseArt = (typeof SIDE_POSES)[number];
type HeroPoseArt = (typeof HERO_POSES)[number];
type FaceArt = (typeof FACES)[number];

/** Art frames (CREATIVE §2). The face frame is square for the 64 px Dot avatar. */
export const SIDE_FRAME = { w: 140, h: 100 } as const;
export const HERO_FRAME = { w: 120, h: 150 } as const;
export const FACE_FRAME = { w: 100, h: 100 } as const;

const v = (token: string) => `var(--${token})`;
const INK = v('ink');
const BODY = v('ant-body');
const SHADE = v('ant-shade');
const MOUTH = v('ant-mouth');
const TONGUE = v('ant-tongue');
const WHITE = v('meaning-white');
const STEM = v('acorn-cap');
const STAR = v('secondary');
const SWEAT = v('ant-sweat');

interface TeamLook {
  cap: string;
  capShade: string;
  badge: 'circle' | 'triangle';
}
const TEAM: Record<AntTeam, TeamLook> = {
  blue: { cap: v('team-a'), capShade: v('team-a-shade'), badge: 'circle' },
  amber: { cap: v('team-b'), capShade: v('team-b-shade'), badge: 'triangle' },
};

type Pt = readonly [number, number];
const r1 = (n: number) => Math.round(n * 100) / 100;
const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L');

/** Common stroke attributes: plum ink, round joins and caps (CREATIVE §1). */
const inked = (w: number) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** A thin outlined limb: an ink stroke under a colour stroke. Knees are rounded joins. */
function limb(d: string, fill: string, w: number, o: number): string {
  return (
    `<path d="${d}" fill="none" ${inked(w + 2 * o)}/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`
  );
}

/** A limb through hip, knee and ankle with a softened knee. */
function legPath(hip: Pt, knee: Pt, ankle: Pt): string {
  return `M${r1(hip[0])} ${r1(hip[1])} Q${r1(knee[0])} ${r1(knee[1])} ${r1(ankle[0])} ${r1(ankle[1])}`;
}

/** A 5-point star with round joins (CREATIVE §1: stars have round joins). */
function star(cx: number, cy: number, r: number, o: number): string {
  const p: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return `<path d="M${pts(p)} Z" fill="${STAR}" ${inked(o)}/>`;
}

/** The team badge: blue circle or amber rounded triangle, white ring, plum keyline (DR-003). */
function badge(team: AntTeam, cx: number, cy: number, r: number): string {
  if (TEAM[team].badge === 'circle') {
    return (
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.84)}" fill="${WHITE}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.58)}" fill="${TEAM[team].cap}"/>`
    );
  }
  // Rounded triangle: the same path stroked thick then thinner, as in art/ui/badge-team-b.svg.
  const tri = (s: number) => {
    const p: Pt[] = [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return [cx + Math.cos(a) * s, cy + 0.12 * r + Math.sin(a) * s];
    });
    return `M${pts(p)} Z`;
  };
  return (
    `<path d="${tri(r * 0.62)}" fill="${INK}" stroke="${INK}" stroke-width="${r1(r * 0.75)}" stroke-linejoin="round"/>` +
    `<path d="${tri(r * 0.62)}" fill="${WHITE}" stroke="${WHITE}" stroke-width="${r1(r * 0.42)}" stroke-linejoin="round"/>` +
    `<path d="${tri(r * 0.46)}" fill="${TEAM[team].cap}" stroke="${TEAM[team].cap}" stroke-width="${r1(r * 0.12)}" stroke-linejoin="round"/>`
  );
}

/**
 * The large striped gaster: an egg with two darker bands (clipped) and the
 * team badge. `id` names the clip path (ids are made unique per atlas frame).
 */
function gaster(
  team: AntTeam,
  g: { cx: number; cy: number; rx: number; ry: number; rot: number },
  stripes: readonly string[],
  stripeW: number,
  badgeAt: Pt,
  badgeR: number,
  o: number,
): string {
  const ell = `<ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" transform="rotate(${g.rot} ${g.cx} ${g.cy})"`;
  return (
    `<clipPath id="gaster">${ell}/></clipPath>` +
    `${ell} fill="${BODY}"/>` +
    `<g clip-path="url(#gaster)">${stripes
      .map((d) => `<path d="${d}" fill="none" stroke="${SHADE}" stroke-width="${stripeW}"/>`)
      .join('')}</g>` +
    `${ell} fill="none" ${inked(o)}/>` +
    badge(team, badgeAt[0], badgeAt[1], badgeR)
  );
}

/**
 * The acorn-cap helmet in local head coordinates (head centre 0,0, radius
 * `hr`). A dome in team colour, a darker brim band, a few flat shade dots and
 * a curly stem. Tilted by the caller.
 */
function cap(team: AntTeam, hr: number, o: number, front: boolean): string {
  const t = TEAM[team];
  const w = hr * 1.12; // half width: the cap overhangs the head a little
  // The side head shows less face under the cap than the front head.
  const base = -hr * (front ? 0.32 : 0.42);
  const top = -hr * (front ? 1.36 : 1.42);
  // An acorn dome: round shoulders, a soft point at the top.
  const dome =
    `M${r1(-w)} ${r1(base)} C${r1(-w)} ${r1(base - hr * 0.72)} ${r1(-w * 0.45)} ${r1(top)} 0 ${r1(top)} ` +
    `C${r1(w * 0.45)} ${r1(top)} ${r1(w)} ${r1(base - hr * 0.72)} ${r1(w)} ${r1(base)} Z`;
  const bh = hr * 0.34; // brim band height
  const bo = o * 0.8;
  const brim = `<rect x="${r1(-w - bo * 0.4)}" y="${r1(base - bh * 0.6)}" width="${r1(2 * w + bo * 0.8)}" height="${r1(bh)}" rx="${r1(bh / 2)}" fill="${t.capShade}" ${inked(bo)}/>`;
  const dotR = hr * 0.085;
  const dots = (
    front
      ? [
          [-0.62, -0.74],
          [-0.2, -1.02],
          [0.3, -0.92],
          [0.7, -0.66],
          [0.06, -0.7],
        ]
      : [
          [-0.55, -0.74],
          [-0.08, -1.02],
          [0.4, -0.88],
          [0.74, -0.62],
        ]
  )
    .map(
      ([x, y]) =>
        `<circle cx="${r1((x ?? 0) * hr)}" cy="${r1((y ?? 0) * hr)}" r="${r1(dotR)}" fill="${t.capShade}"/>`,
    )
    .join('');
  const sx = front ? -hr * 0.06 : -hr * 0.08;
  const sy = top + hr * 0.12;
  // A curly stem: up, over to the right, and a small curl back down.
  const stem =
    `M${r1(sx)} ${r1(sy)} c${r1(-hr * 0.02)} ${r1(-hr * 0.22)} ${r1(hr * 0.06)} ${r1(-hr * 0.34)} ${r1(hr * 0.24)} ${r1(-hr * 0.34)} ` +
    `c${r1(hr * 0.14)} 0 ${r1(hr * 0.18)} ${r1(hr * 0.16)} ${r1(hr * 0.06)} ${r1(hr * 0.2)}`;
  return (
    limb(stem, STEM, hr * 0.13, o * 0.5) +
    `<path d="${dome}" fill="${t.cap}" ${inked(o)}/>` +
    dots +
    brim
  );
}

/** An elbowed antenna with a round tip, coming out of the cap. */
function antenna(base: Pt, elbow: Pt, tip: Pt, fill: string, w: number, o: number): string {
  return (
    limb(`M${pts([base, elbow, tip])}`, fill, w, o) +
    `<circle cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="${r1(w * 0.95)}" fill="${fill}" ${inked(o)}/>`
  );
}

// ------------------------------------------------------------------ faces

/** One open eye: white with a plum pupil looking at (lx, ly) (-1..1). */
function eye(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lx: number,
  ly: number,
  o: number,
  pupil = 0.5,
): string {
  return (
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${WHITE}" ${inked(o)}/>` +
    `<circle cx="${r1(cx + lx * rx * 0.38)}" cy="${r1(cy + ly * ry * 0.3)}" r="${r1(Math.min(rx, ry) * pupil)}" fill="${INK}"/>`
  );
}

/** An X eye (dizzy, no injury). */
function xEye(cx: number, cy: number, r: number, o: number): string {
  const k = r * 0.5;
  return (
    `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${WHITE}" ${inked(o)}/>` +
    `<path d="M${r1(cx - k)} ${r1(cy - k)} L${r1(cx + k)} ${r1(cy + k)} M${r1(cx + k)} ${r1(cy - k)} L${r1(cx - k)} ${r1(cy + k)}" fill="none" ${inked(o * 1.1)}/>`
  );
}

/** A heavy-lidded eye: the eye with a body-colour lid over its top and a plum lid line. */
function lidEye(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lid: number,
  slope: number,
  lx: number,
  o: number,
): string {
  const y0 = cy - ry + lid * 2 * ry;
  const lidPath = `M${r1(cx - rx - o)} ${r1(cy - ry - o * 2)} L${r1(cx + rx + o)} ${r1(cy - ry - o * 2)} L${r1(cx + rx + o)} ${r1(y0 - slope)} L${r1(cx - rx - o)} ${r1(y0 + slope)} Z`;
  return (
    eye(cx, cy, rx, ry, lx, 0.35, o) +
    `<path d="${lidPath}" fill="${BODY}"/>` +
    `<path d="M${r1(cx - rx - o * 0.2)} ${r1(y0 + slope)} L${r1(cx + rx + o * 0.2)} ${r1(y0 - slope)}" fill="none" ${inked(o)}/>`
  );
}

/** A squinted eye: a closed upward arc with a short lower lash. */
function squint(cx: number, cy: number, rx: number, o: number): string {
  return `<path d="M${r1(cx - rx)} ${r1(cy + rx * 0.15)} Q${r1(cx)} ${r1(cy - rx * 0.55)} ${r1(cx + rx)} ${r1(cy + rx * 0.15)}" fill="none" ${inked(o * 1.25)}/>`;
}

/** A wide grin: mouth shape, a white teeth band along the top, an optional tongue, clipped. */
function grin(
  top: readonly Pt[],
  low: Pt,
  o: number,
  teeth: number,
  tongue: Pt | null,
  id: string,
): string {
  const [a, mid, b] = top as [Pt, Pt, Pt];
  const d = `M${r1(a[0])} ${r1(a[1])} Q${r1(mid[0])} ${r1(mid[1])} ${r1(b[0])} ${r1(b[1])} Q${r1(low[0] + (b[0] - a[0]) * 0.28)} ${r1(low[1])} ${r1(low[0])} ${r1(low[1])} Q${r1(low[0] - (b[0] - a[0]) * 0.3)} ${r1(low[1])} ${r1(a[0])} ${r1(a[1])} Z`;
  const teethBand =
    teeth > 0
      ? `<path d="M${r1(a[0])} ${r1(a[1])} Q${r1(mid[0])} ${r1(mid[1])} ${r1(b[0])} ${r1(b[1])}" fill="none" stroke="${WHITE}" stroke-width="${r1(teeth * 2)}"/>`
      : '';
  const tongueShape = tongue
    ? `<ellipse cx="${r1(tongue[0])}" cy="${r1(tongue[1])}" rx="${r1((b[0] - a[0]) * 0.24)}" ry="${r1((low[1] - a[1]) * 0.42)}" fill="${TONGUE}"/>`
    : '';
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${MOUTH}"/>` +
    `<g clip-path="url(#${id})">${tongueShape}${teethBand}</g>` +
    `<path d="${d}" fill="none" ${inked(o)}/>`
  );
}

/** A tongue poking out below a point, with a centre crease. */
function tongueOut(x: number, y: number, w: number, h: number, o: number, tilt = 0): string {
  const d = `M${r1(x - w / 2)} ${r1(y)} L${r1(x - w / 2)} ${r1(y + h - w / 2)} A${r1(w / 2)} ${r1(w / 2)} 0 0 0 ${r1(x + w / 2)} ${r1(y + h - w / 2)} L${r1(x + w / 2)} ${r1(y)} Z`;
  return (
    `<g transform="rotate(${tilt} ${r1(x)} ${r1(y)})">` +
    `<path d="${d}" fill="${TONGUE}" ${inked(o)}/>` +
    `<path d="M${r1(x)} ${r1(y + w * 0.2)} L${r1(x)} ${r1(y + h * 0.55)}" fill="none" stroke="${MOUTH}" stroke-width="${r1(o * 0.6)}" stroke-linecap="round"/>` +
    `</g>`
  );
}

/** A sweat drop pointing up. */
function sweatDrop(x: number, y: number, s: number, o: number): string {
  const d = `M${r1(x)} ${r1(y - s * 1.5)} C${r1(x + s * 0.4)} ${r1(y - s * 0.7)} ${r1(x + s)} ${r1(y - s * 0.2)} ${r1(x + s)} ${r1(y + s * 0.3)} A${r1(s)} ${r1(s)} 0 0 1 ${r1(x - s)} ${r1(y + s * 0.3)} C${r1(x - s)} ${r1(y - s * 0.2)} ${r1(x - s * 0.4)} ${r1(y - s * 0.7)} ${r1(x)} ${r1(y - s * 1.5)} Z`;
  return `<path d="${d}" fill="${SWEAT}" ${inked(o)}/>`;
}

/** Orbiting dizzy stars: a broken plum orbit line and three stars. */
function dizzyStars(cx: number, cy: number, rx: number, ry: number, sr: number, o: number): string {
  const arc = (a0: number, a1: number) => {
    const p = (a: number): Pt => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `<path d="M${r1(x0)} ${r1(y0)} A${rx} ${ry} 0 0 1 ${r1(x1)} ${r1(y1)}" fill="none" stroke="${INK}" stroke-width="${r1(o * 0.6)}" stroke-linecap="round"/>`;
  };
  const at = (a: number): Pt => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  const s1 = at(Math.PI * 0.95);
  const s2 = at(Math.PI * 1.55);
  const s3 = at(Math.PI * 0.18);
  return (
    arc(Math.PI * 0.3, Math.PI * 0.8) +
    arc(Math.PI * 1.08, Math.PI * 1.42) +
    arc(Math.PI * 1.68, Math.PI * 2.05) +
    star(s1[0], s1[1], sr, o * 0.7) +
    star(s2[0], s2[1], sr * 0.85, o * 0.7) +
    star(s3[0], s3[1], sr * 0.9, o * 0.7)
  );
}

// -------------------------------------------------------- front head (3/4)

type HeadFace = FaceArt | 'smile';

/**
 * The big round head seen 3/4 from the front, with the acorn cap, both
 * antennae and a face. Local coordinates: head centre 0,0, radius 30.
 */
function frontHead(team: AntTeam, face: HeadFace, o: number): string {
  const hr = 30;
  const lw = 4.2; // antenna width
  const lo = o * 0.62;
  const droop = face === 'dizzy';
  const antL = droop
    ? antenna([-12, -36], [-19, -49], [-35, -38], BODY, lw, lo)
    : antenna([-12, -36], [-19, -50], [-37, -47], BODY, lw, lo);
  const antR = droop
    ? antenna([13, -35], [21, -48], [36, -36], BODY, lw, lo)
    : antenna([13, -35], [21, -50], [39, -45], BODY, lw, lo);
  const head = `<ellipse cx="0" cy="0" rx="${hr * 1.03}" ry="${hr}" fill="${BODY}" ${inked(o)}/>`;
  // Faces sit a little right of centre: the head is turned 3/4 to the right.
  const fx = 2;
  let f = '';
  const eo = o * 0.75;
  switch (face) {
    case 'smile':
      f =
        eye(fx - 11, 3, 7.6, 9, 0.5, 0.2, eo) +
        eye(fx + 10, 3, 7.2, 8.6, 0.5, 0.2, eo) +
        grin(
          [
            [fx - 15, 14],
            [fx, 20],
            [fx + 15, 13],
          ],
          [fx + 1, 25],
          eo,
          2.2,
          [fx + 2, 25],
          'mouth',
        );
      break;
    case 'cocky':
      f =
        lidEye(fx - 11, 4, 7.6, 8.4, 0.42, -1.2, 0.6, eo) +
        lidEye(fx + 10, 4, 7.2, 8, 0.38, 1.2, 0.6, eo) +
        // V-brows: inner ends low.
        `<path d="M${fx - 21} -5 L${fx - 5} -1" fill="none" ${inked(o * 1.05)}/>` +
        `<path d="M${fx + 4} -1 L${fx + 19} -6" fill="none" ${inked(o * 1.05)}/>` +
        grin(
          [
            [fx - 20, 12],
            [fx, 20],
            [fx + 19, 10],
          ],
          [fx + 1, 28],
          eo,
          3.2,
          [fx + 3, 28],
          'mouth',
        );
      break;
    case 'aim':
      f =
        eye(fx - 11, 4, 7.6, 8.6, 0.75, 0, eo, 0.56) +
        squint(fx + 10, 5, 7.6, eo) +
        `<path d="M${fx - 19} -4 L${fx - 4} -2" fill="none" ${inked(o)}/>` +
        `<path d="M${fx + 3} -2 L${fx + 18} -6" fill="none" ${inked(o)}/>` +
        tongueOut(fx + 10, 18.5, 7.5, 11, eo * 0.9, -20) +
        `<path d="M${fx - 9} 20 Q${fx} 22 ${fx + 11} 18" fill="none" ${inked(eo * 1.1)}/>`;
      break;
    case 'oops':
      f =
        `<path d="M${fx - 19} -7 Q${fx - 12} -12 ${fx - 5} -8" fill="none" ${inked(o)}/>` +
        `<path d="M${fx + 4} -8 Q${fx + 11} -12 ${fx + 18} -7" fill="none" ${inked(o)}/>` +
        eye(fx - 11, 4, 8.4, 9.4, 0, 0, eo, 0.34) +
        eye(fx + 10, 4, 8, 9, 0, 0, eo, 0.34) +
        `<clipPath id="omouth"><ellipse cx="${fx + 1}" cy="21" rx="5.5" ry="6.5"/></clipPath>` +
        `<ellipse cx="${fx + 1}" cy="21" rx="5.5" ry="6.5" fill="${MOUTH}"/>` +
        `<g clip-path="url(#omouth)"><ellipse cx="${fx + 2}" cy="27" rx="4.5" ry="3.4" fill="${TONGUE}"/></g>` +
        `<ellipse cx="${fx + 1}" cy="21" rx="5.5" ry="6.5" fill="none" ${inked(eo)}/>` +
        sweatDrop(hr * 1.04, 0, 5.2, eo);
      break;
    case 'dizzy':
      f =
        xEye(fx - 11, 3, 8, eo) +
        xEye(fx + 10, 3, 7.6, eo) +
        tongueOut(fx + 3, 18.5, 9, 12, eo * 0.9, 8) +
        `<path d="M${fx - 13} 18 q3.25 -3.5 6.5 0 t6.5 0 t6.5 0 t6.5 0" fill="none" ${inked(eo * 1.1)}/>`;
      break;
  }
  return (
    `<g transform="rotate(-10)">${antL}${antR}</g>` +
    head +
    f +
    `<g transform="rotate(-10)">${cap(team, hr, o, true)}</g>` +
    (face === 'dizzy' ? `<g transform="rotate(-6)">${dizzyStars(0, -48, 40, 10, 6.2, o)}</g>` : '')
  );
}

// ------------------------------------------------------------- side pose

interface Leg {
  hip: Pt;
  knee: Pt;
  ankle: Pt;
  /** Foot direction: +1 forward, -1 back. */
  toe: 1 | -1;
}

const SIDE_O = 6; // body outline, art px: 6 * 88/140 = 3.8 px in game (CREATIVE §1)
const LEG_W = 4.2;
const LEG_O = 2.6;
const FOOT_RY = 3.4;
/** Foot centre line: the bottom of the outlined foot touches the frame bottom (feet line, DR-027). */
const FOOT_Y = SIDE_FRAME.h - FOOT_RY - LEG_O / 2 - 0.2;

const STAND_NEAR: Leg[] = [
  { hip: [77, 66], knee: [62, 58], ankle: [50, FOOT_Y - 3], toe: -1 },
  { hip: [83, 68], knee: [85, 79], ankle: [76, FOOT_Y - 3], toe: 1 },
  { hip: [89, 65], knee: [104, 57], ankle: [115, FOOT_Y - 3], toe: 1 },
];
const STAND_FAR: Leg[] = [
  { hip: [80, 63], knee: [56, 54], ankle: [33, FOOT_Y - 3], toe: -1 },
  { hip: [86, 65], knee: [96, 73], ankle: [97, FOOT_Y - 3], toe: 1 },
  { hip: [92, 63], knee: [113, 55], ankle: [126, FOOT_Y - 3], toe: 1 },
];
// Walk: a tripod step: near front + near back + far middle swing forward.
const WALK_NEAR: Leg[] = [
  { hip: [77, 66], knee: [65, 57], ankle: [58, FOOT_Y - 3], toe: -1 },
  { hip: [83, 68], knee: [80, 79], ankle: [68, FOOT_Y - 3], toe: 1 },
  { hip: [89, 65], knee: [107, 57], ankle: [122, FOOT_Y - 3], toe: 1 },
];
const WALK_FAR: Leg[] = [
  { hip: [80, 63], knee: [54, 55], ankle: [27, FOOT_Y - 3], toe: -1 },
  { hip: [86, 65], knee: [100, 72], ankle: [105, FOOT_Y - 3], toe: 1 },
  { hip: [92, 63], knee: [110, 56], ankle: [118, FOOT_Y - 3], toe: 1 },
];
// Hop and flip: legs tucked under the body.
const TUCK_Y = FOOT_Y - 12;
const TUCK_NEAR: Leg[] = [
  { hip: [77, 66], knee: [62, 70], ankle: [56, TUCK_Y], toe: -1 },
  { hip: [83, 68], knee: [86, 80], ankle: [78, TUCK_Y + 3], toe: 1 },
  { hip: [89, 65], knee: [106, 68], ankle: [102, TUCK_Y + 1], toe: 1 },
];
const TUCK_FAR: Leg[] = [
  { hip: [80, 63], knee: [58, 66], ankle: [44, TUCK_Y - 2], toe: -1 },
  { hip: [86, 65], knee: [96, 78], ankle: [90, TUCK_Y + 3], toe: 1 },
  { hip: [92, 63], knee: [112, 64], ankle: [114, TUCK_Y], toe: 1 },
];

function sideLeg(l: Leg, fill: string, footFill: string): string {
  const fx = l.ankle[0] + l.toe * 3.2;
  const fy = l.ankle[1] + 3;
  return (
    limb(`M${pts([l.hip, l.knee, l.ankle])}`, fill, LEG_W, LEG_O) +
    `<ellipse cx="${r1(fx)}" cy="${r1(fy)}" rx="5.6" ry="${FOOT_RY}" fill="${footFill}" ${inked(LEG_O)}/>`
  );
}

type SideFace = 'smile' | 'aim' | 'hop' | 'dizzy';

/** The side head's face: one visible eye and a mouth near the front of the head. */
function sideFace(face: SideFace, o: number): string {
  const eo = o * 0.62;
  switch (face) {
    case 'smile':
      return (
        eye(120, 47, 7.4, 8.6, 0.75, 0.1, eo, 0.5) +
        grin(
          [
            [110, 57],
            [122, 61],
            [132, 51],
          ],
          [123, 65],
          eo,
          2.2,
          null,
          'mouth',
        )
      );
    case 'aim':
      return (
        squint(120, 49, 7.4, eo) +
        `<path d="M112 40 L127 44" fill="none" ${inked(o * 0.7)}/>` +
        `<path d="M112 59 Q121 61 130 55" fill="none" ${inked(eo * 1.1)}/>` +
        tongueOut(128, 56, 5, 8, eo * 0.9, -35)
      );
    case 'hop':
      return (
        eye(120, 46, 7.6, 9, 0.6, -0.2, eo, 0.44) +
        grin(
          [
            [110, 56],
            [122, 60],
            [132, 50],
          ],
          [122, 67],
          eo,
          2.2,
          [124, 67],
          'mouth',
        )
      );
    case 'dizzy':
      return (
        xEye(120, 47, 7.4, eo) +
        `<path d="M112 59 q2.5 -3 5 0 t5 0 t5 0" fill="none" ${inked(eo * 1.1)}/>` +
        tongueOut(124, 59, 5.5, 8, eo * 0.9, 10)
      );
  }
}

function sideSvg(team: AntTeam, pose: SidePoseArt): string {
  const o = SIDE_O;
  const legs =
    pose === 'walk'
      ? { near: WALK_NEAR, far: WALK_FAR }
      : pose === 'hop' || pose === 'flip'
        ? { near: TUCK_NEAR, far: TUCK_FAR }
        : { near: STAND_NEAR, far: STAND_FAR };
  const face: SideFace =
    pose === 'aim'
      ? 'aim'
      : pose === 'ko'
        ? 'dizzy'
        : pose === 'hop' || pose === 'flip'
          ? 'hop'
          : 'smile';
  const head = { x: 110, y: 47, r: 23 };
  const antW = 3.6;
  const antO = 2.6;
  const capT = `rotate(-10 ${head.x} ${head.y}) translate(${head.x} ${head.y})`;
  // Antenna points in head-local coordinates (cap tilt applied by the group).
  const farAnt =
    pose === 'ko'
      ? antenna([-5, -28], [-3, -38], [-16, -33], SHADE, antW, antO)
      : antenna([-5, -28], [0, -37], [13, -36], SHADE, antW, antO);
  const nearAnt =
    pose === 'ko'
      ? antenna([8, -26], [14, -36], [25, -27], BODY, antW, antO)
      : antenna([8, -26], [15, -35], [27, -29], BODY, antW, antO);
  const parts = [
    `<g transform="${capT}">${farAnt}</g>`,
    ...legs.far.map((l) => sideLeg(l, SHADE, SHADE)),
    gaster(
      team,
      { cx: 38, cy: 62, rx: 30, ry: 22.5, rot: -8 },
      ['M24 30 Q18 62 26 92', 'M47 28 Q41 62 49 94'],
      7,
      [35.5, 60],
      8.6,
      o,
    ),
    `<circle cx="67" cy="63" r="6.5" fill="${BODY}" ${inked(o)}/>`,
    `<ellipse cx="82" cy="59" rx="14.5" ry="11.5" transform="rotate(-20 82 59)" fill="${BODY}" ${inked(o)}/>`,
    ...legs.near.map((l) => sideLeg(l, BODY, SHADE)),
    `<circle cx="${head.x}" cy="${head.y}" r="${head.r}" fill="${BODY}" ${inked(o)}/>`,
    sideFace(face, o),
    `<g transform="${capT}">${nearAnt}${cap(team, head.r, o, false)}</g>`,
    pose === 'ko'
      ? `<g transform="rotate(-8 ${head.x} 20)">${dizzyStars(head.x - 2, 15, 26, 6, 5, o * 0.8)}</g>`
      : '',
  ];
  // Scaled about the bottom centre so the antennae clear the top edge; feet stay on the bottom.
  const fit = `translate(70 ${SIDE_FRAME.h}) scale(0.96) translate(-70 ${-SIDE_FRAME.h})`;
  return wrap(SIDE_FRAME, `side ${pose}, ${team}`, `<g transform="${fit}">${parts.join('')}</g>`);
}

// ------------------------------------------------------------- hero pose

const HERO_O = 4; // 4 art px at 120 -> 128 logical: about 4 px (CREATIVE §1)
const ARM_W = 4.6;
const ARM_O = 2.4;

function heroSvg(team: AntTeam, pose: HeroPoseArt): string {
  const o = HERO_O;
  const fy = HERO_FRAME.h - 3.4 - ARM_O / 2 - 0.4;
  const leg = (hip: Pt, knee: Pt, ankle: Pt, fill: string, toe: number) =>
    limb(legPath(hip, knee, ankle), fill, ARM_W, ARM_O) +
    `<ellipse cx="${r1(ankle[0] + toe * 3.6)}" cy="${r1(fy)}" rx="6.4" ry="3.4" fill="${SHADE}" ${inked(ARM_O)}/>`;
  const fist = (x: number, y: number, fill: string, r = 6.4) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${inked(ARM_O)}/>` +
    // Curled fingers: two short knuckle creases.
    `<path d="M${r1(x - r * 0.15)} ${r1(y - r * 0.75)} L${r1(x - r * 0.15)} ${r1(y - r * 0.1)} M${r1(x + r * 0.35)} ${r1(y - r * 0.65)} L${r1(x + r * 0.35)} ${r1(y - r * 0.05)}" fill="none" stroke="${INK}" stroke-width="${ARM_O * 0.7}" stroke-linecap="round"/>`;
  const hand = (x: number, y: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.4" fill="${BODY}" ${inked(ARM_O)}/>`;

  // Wide stance: two far legs (shade) and two near legs (body); the arms are the other two limbs.
  const farLegs =
    leg([46, 112], [26, 124], [19, fy - 3], SHADE, -1) +
    leg([72, 108], [92, 122], [101, fy - 3], SHADE, 1);
  const nearLegs =
    leg([54, 110], [42, 128], [34, fy - 3], BODY, -1) +
    leg([66, 110], [78, 128], [84, fy - 3], BODY, 1);

  // Left arm (viewer's left): hand on hip, or a second raised fist on a win.
  const leftArm =
    pose === 'win'
      ? limb(`M51 89 L30 84 L18 62`, BODY, ARM_W, ARM_O) + fist(16, 58, BODY)
      : limb(`M51 89 L32 93 L44 107`, BODY, ARM_W, ARM_O) + hand(45, 107);
  // Right arm (viewer's right): the raised fist, lowered on a loss.
  const rightArm =
    pose === 'lose'
      ? limb(legPath([70, 89], [82, 100], [84, 114]), BODY, ARM_W, ARM_O) + hand(84, 116)
      : pose === 'idle'
        ? limb(`M70 89 L92 86 L99 68`, BODY, ARM_W, ARM_O) + fist(100, 64, BODY)
        : limb(`M70 89 L93 82 L102 60`, BODY, ARM_W, ARM_O) + fist(103, 55, BODY);

  const face: HeadFace = pose === 'idle' ? 'smile' : pose === 'lose' ? 'oops' : 'cocky';
  const parts = [
    farLegs,
    gaster(
      team,
      { cx: 40, cy: 112, rx: 25, ry: 23, rot: 24 },
      ['M14 104 Q34 98 50 86', 'M18 126 Q42 118 60 100'],
      6,
      [33, 115],
      8,
      o,
    ),
    `<circle cx="52" cy="101" r="5.5" fill="${BODY}" ${inked(o)}/>`,
    nearLegs,
    `<ellipse cx="61" cy="98" rx="12" ry="13" fill="${BODY}" ${inked(o)}/>`,
    leftArm,
    rightArm,
    `<g transform="translate(58 58) scale(0.95)">${frontHead(team, face, o / 0.95)}</g>`,
  ];
  return wrap(HERO_FRAME, `hero ${pose}, ${team}`, parts.join(''));
}

// ------------------------------------------------------------- face tiles

function faceSvg(face: FaceArt): string {
  // Faces are team-neutral in use (Dot, comics): drawn with the player's blue cap.
  const o = 4.4;
  const body = `<g transform="translate(50 63)">${frontHead('blue', face, o)}</g>`;
  return wrap(FACE_FRAME, `face ${face}`, body);
}

function wrap(frame: { w: number; h: number }, what: string, body: string): string {
  return (
    `<!-- ANTS! ant art (${what}). Original flat vector drawn for this game by tools/draw-ants.ts; ` +
    `do not edit by hand. CREATIVE §2, DR-007, R-03. var(--token) comes from theme.json (DR-088). -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.w} ${frame.h}" width="${frame.w}" height="${frame.h}">` +
    `${body}</svg>\n`
  );
}

/** File name -> SVG text for every ant frame. */
export function antArt(): Map<string, string> {
  const out = new Map<string, string>();
  for (const team of TEAM_NAMES) {
    for (const pose of SIDE_POSES) out.set(`side-${pose}-${team}.svg`, sideSvg(team, pose));
    for (const pose of HERO_POSES) out.set(`hero-${pose}-${team}.svg`, heroSvg(team, pose));
  }
  for (const f of FACES) out.set(`face-${f}.svg`, faceSvg(f));
  return out;
}

function main(): void {
  const art = antArt();
  if (process.argv.includes('--check')) {
    const stale = [...art].filter(([name, text]) => {
      try {
        return readFileSync(join(ANT_ART_DIR, name), 'utf8') !== text;
      } catch {
        return true;
      }
    });
    if (stale.length > 0) {
      console.error(
        `stale ant art: ${stale.map(([n]) => n).join(', ')} (run node tools/draw-ants.ts)`,
      );
      process.exit(1);
    }
    return;
  }
  mkdirSync(ANT_ART_DIR, { recursive: true });
  for (const [name, text] of art) writeFileSync(join(ANT_ART_DIR, name), text);
  console.log(`ant art: ${art.size} SVGs in art/ants`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
