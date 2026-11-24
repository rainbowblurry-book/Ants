import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

/** Opens the game with a query and collects page errors. */
export async function openGame(
  page: Page,
  query: string,
  hook: '__battle' | '__uilab',
): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`./${query}`);
  await page.waitForFunction(
    (h) => (window as unknown as Record<string, { ready?: boolean }>)[h]?.ready === true,
    hook,
    {
      timeout: 30_000,
    },
  );
  // The splash fades out over the canvas; input reaches the game after it.
  await expect(page.locator('#splash')).toBeHidden();
  return errors;
}

/**
 * CSS position of a logical point on the FIT canvas (W x 540, OVR-013). With
 * `centred`, x is in a scene whose 0..960 sits in the middle (Pause, UiLab).
 */
export async function cssPoint(
  page: Page,
  x: number,
  y: number,
  centred = false,
): Promise<{ x: number; y: number }> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const per = box.height / 540;
  const off = centred ? (box.width / per - 960) / 2 : 0;
  return { x: box.x + (x + off) * per, y: box.y + y * per };
}

/** The screen width W in logical px (OVR-013). */
export async function screenW(page: Page): Promise<number> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return Math.round((box.width / box.height) * 540);
}

/** Saves a screenshot into test-results, and into SHOTS_OUT (or STAGE4_OUT) when set. */
export async function saveShot(page: Page, info: TestInfo, name: string): Promise<void> {
  const file = `${name}-${info.project.name}.png`;
  const buf = await page.screenshot({ path: info.outputPath(file) });
  const out = process.env.SHOTS_OUT ?? process.env.STAGE4_OUT;
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, file), buf);
  }
}
