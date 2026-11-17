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

/** CSS position of a logical (960x540) point on the FIT canvas. */
export async function cssPoint(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + (x * box.width) / 960, y: box.y + (y * box.height) / 540 };
}

/** Saves a screenshot into test-results, and into STAGE4_OUT when set. */
export async function saveShot(page: Page, info: TestInfo, name: string): Promise<void> {
  const file = `${name}-${info.project.name}.png`;
  const buf = await page.screenshot({ path: info.outputPath(file) });
  const out = process.env.STAGE4_OUT;
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, file), buf);
  }
}
