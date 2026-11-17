/**
 * Stage 4 gate (HANDOFF §3): the Battle scene draws the sim with placeholder
 * art. Runs at the three target viewports (playwright.config.ts).
 */
import { expect, test } from '@playwright/test';
import { TERRAIN_PALETTE_PLACEHOLDER } from '../src/assets/manifest';
import type { BattleHook } from '../src/scenes/Battle';
import { Material } from '../src/sim/terrain';
import { openGame, saveShot } from './helpers';

declare global {
  interface Window {
    __battle?: BattleHook;
  }
}

const SOIL = TERRAIN_PALETTE_PLACEHOLDER.fill[Material.SOIL] as number;
/** Below this line the dev arena is plain soil (no band, no other material). */
const SOLID_ZONE = { x: 0, y: 456, w: 960, h: 84 };

test('boots: splash leaves, canvas is labelled, nothing crashes', async ({ page }) => {
  const errors = await openGame(page, '?static=1', '__battle');
  await expect(page.locator('#splash')).toBeHidden();
  await expect(page.locator('#fatal')).toBeHidden();
  await expect(page.locator('#game canvas')).toHaveAttribute('aria-label', 'ANTS! game');
  expect(errors).toEqual([]);
});

test('static battle: screenshot, 12 terrain chunks, at most 3 atlas pages, texture budget', async ({
  page,
}, info) => {
  const errors = await openGame(page, '?static=1', '__battle');
  await page.waitForTimeout(300);
  await saveShot(page, info, 'battle');
  const r = await page.evaluate(() => {
    const b = window.__battle as BattleHook;
    return {
      chunks: b.chunkCount(),
      pages: b.residentAtlasPages(),
      max: b.maxResidentPages,
      mb: b.textureMB(),
      tick: b.tick(),
    };
  });
  expect(r.chunks).toBe(12);
  expect(r.pages).toBeGreaterThan(0);
  expect(r.pages).toBeLessThanOrEqual(r.max);
  expect(r.max).toBe(3);
  // DR-014: 96 MB soft cap for textures (canvas backing not included here).
  expect(r.mb).toBeLessThan(96);
  expect(r.tick).toBe(0); // static means the sim never stepped
  expect(errors).toEqual([]);
});

test('a shot through match.push makes a crater with an inked rim, redrawn in under 4 chunks', async ({
  page,
}) => {
  const errors = await openGame(page, '?static=1', '__battle');
  const result = await page.evaluate(() => {
    const b = window.__battle as BattleHook;
    for (let i = 0; i < 400 && b.phase() !== 'aim'; i++) b.stepTicks(5);
    const pushed = b.push({ kind: 'fire', weapon: 'seed', angleDeci: 450, powerMille: 550 });
    for (let i = 0; i < 400 && b.blasts() === 0; i++) b.stepTicks(5);
    const blast = b.lastBlast();
    if (!blast) return { pushed, blast: null, centreAlpha: -1, rim: null, costs: b.terrainCosts() };
    const centreAlpha = b.terrainPixel(blast.x, blast.y)[3];
    // Walk down from the centre to the first drawn pixel: it must be ink.
    let rim: number[] | null = null;
    for (let y = Math.floor(blast.y); y < 540; y++) {
      const px = b.terrainPixel(blast.x, y);
      if (px[3] > 200) {
        rim = px;
        break;
      }
    }
    return { pushed, blast, centreAlpha, rim, costs: b.terrainCosts() };
  });
  expect(result.pushed).toBe(true);
  expect(result.blast).not.toBeNull();
  expect(result.centreAlpha).toBe(0);
  // Ink is plum: dark and blue-ish (R and G under 80).
  expect(result.rim).not.toBeNull();
  const [r, g] = result.rim ?? [255, 255];
  expect(r).toBeLessThan(80);
  expect(g).toBeLessThan(80);
  for (const c of result.costs) expect(c.chunks).toBeLessThanOrEqual(4);
  console.log(`terrain refresh costs (ms): ${result.costs.map((c) => c.ms.toFixed(2)).join(', ')}`);
  expect(errors).toEqual([]);
});

/** Camera poses: [centre x, centre y, gameplay zoom]. Fractions on purpose (spike rule 5). */
const POSES: [number, number, number][] = [
  [480, 270, 1],
  [437.3, 251.7, 1.2],
  [523.25, 288.5, 1.2],
  [471.9, 262.4, 1.15],
  [489.6, 281.3, 1.25],
];

for (const s of [1, 2] as const) {
  test(`no seams between terrain chunks at S=${s}`, async ({ page }) => {
    await openGame(page, `?static=1&s=${s}`, '__battle');
    for (const [cx, cy, zoom] of POSES) {
      const res = await page.evaluate(
        async ([view, zone, rgb]) => {
          const b = window.__battle as BattleHook;
          b.freezeCamera(view as { cx: number; cy: number; zoom: number });
          return b.seamCheck(zone as typeof SOLID_ZONE, rgb as number);
        },
        [{ cx, cy, zoom }, SOLID_ZONE, SOIL] as const,
      );
      expect(res.checked, `pose ${cx},${cy},${zoom}`).toBeGreaterThan(1000);
      expect(res.bad, `pose ${cx},${cy},${zoom}: ${JSON.stringify(res.samples)}`).toBe(0);
    }
  });
}

test('?mem shows S, frame time, texture memory and atlas pages', async ({ page }) => {
  await openGame(page, '?mem', '__battle');
  await expect(page.locator('#mem')).toContainText(
    /S=\d · [\d.]+ ms · textures [\d.]+ MB · atlas pages 1/,
  );
});
