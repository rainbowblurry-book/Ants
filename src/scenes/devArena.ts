/**
 * DEV ARENA, not a level. Stage 4 needs a battle to draw before the level
 * pipeline exists (stage 8). It shows every solid material once so the
 * placeholder palette and the outline can be reviewed. Built with the sim's
 * trig table, so the grid is the same on every device.
 */
import { type Ant, createAnt } from '../sim/movement';
import { Material, TerrainGrid } from '../sim/terrain';
import { sinDeci } from '../sim/trig';

const W = 960;
const H = 540;

function surface(x: number): number {
  return Math.round(
    340 +
      34 * sinDeci((x * 4) % 3600) +
      16 * sinDeci((x * 11 + 900) % 3600) -
      30 * sinDeci((x * 2 + 2700) % 3600),
  );
}

function blob(g: TerrainGrid, cx: number, cy: number, rx: number, ry: number, m: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.set(x, y, m);
    }
  }
}

export function devArenaGrid(): TerrainGrid {
  const g = new TerrainGrid(W, H, 'void');
  for (let x = 0; x < W; x++) {
    const top = surface(x);
    for (let y = top; y < H; y++) g.set(x, y, Material.SOIL);
  }
  // SOFT sawdust patch, a HARD stump, a ROCK pebble, a BOUNCY cushion, SLICK tiles.
  for (let x = 560; x < 680; x++)
    for (let y = surface(x); y < surface(x) + 40; y++) g.set(x, y, Material.SOFT);
  blob(g, 410, surface(410) - 6, 26, 34, Material.HARD);
  blob(g, 480, surface(480) + 4, 30, 20, Material.ROCK);
  blob(g, 740, surface(740) + 6, 36, 18, Material.BOUNCY);
  for (let x = 40; x < 110; x++)
    for (let y = surface(x); y < surface(x) + 8; y++) g.set(x, y, Material.SLICK);
  // A small WATER pool in a cut under the middle.
  for (let x = 250; x < 330; x++) {
    const top = surface(x) + 30;
    for (let y = top; y < top + 22; y++) g.set(x, y, Material.WATER);
  }
  return g;
}

/** First solid cell from the top at x (the feet line), or the bottom. */
export function groundAt(g: TerrainGrid, x: number): number {
  for (let y = 0; y < g.h; y++) if (g.solidAt(x, y)) return y;
  return g.h;
}

export function devArenaAnts(g: TerrainGrid): Ant[] {
  const spots: [number, number, 1 | -1][] = [
    [150, 0, 1],
    [840, 1, -1],
    [300, 0, 1],
    [660, 1, -1],
  ];
  return spots.map(([x, team, facing], id) => createAnt(id, team, x, groundAt(g, x), facing));
}
