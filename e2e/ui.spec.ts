/**
 * Stage 4 UI foundation in the browser (DR-082, DR-086, DR-172), on the
 * `?scene=uilab` gallery: taps act on pointer-up inside, a drag out cancels,
 * disabled buttons never act, keyboard focus and the confirm dialog work.
 */
import { expect, type Page, test } from '@playwright/test';
import type { UiLabHook } from '../src/scenes/UiLab';
import { cssPoint, openGame, saveShot } from './helpers';

declare global {
  interface Window {
    __uilab?: UiLabHook;
  }
}

async function centre(page: Page, id: string): Promise<{ x: number; y: number }> {
  const r = await page.evaluate((i) => window.__uilab?.rect(i) ?? null, id);
  if (!r) throw new Error(`no rect ${id}`);
  return cssPoint(page, r.x + r.w / 2, r.y + r.h / 2, true);
}

const count = (page: Page, id: string) =>
  page.evaluate((i) => window.__uilab?.activations[i] ?? 0, id);

test('gallery renders without errors (screenshot saved)', async ({ page }, info) => {
  const errors = await openGame(page, '?scene=uilab', '__uilab');
  await page.waitForTimeout(300);
  await saveShot(page, info, 'uilab');
  expect(errors).toEqual([]);
});

test('a tap acts once, on release inside the button', async ({ page }, info) => {
  await openGame(page, '?scene=uilab', '__uilab');
  const p = await centre(page, 'btn-primary');
  if (info.project.use.hasTouch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
  await expect.poll(() => count(page, 'btn-primary')).toBe(1);
  // Icon button too.
  const q = await centre(page, 'icon-1');
  await page.mouse.click(q.x, q.y);
  await expect.poll(() => count(page, 'icon-1')).toBe(1);
});

test('dragging more than 16 px out cancels; a disabled button never acts', async ({ page }) => {
  await openGame(page, '?scene=uilab', '__uilab');
  const p = await centre(page, 'btn-secondary');
  const box = await page.locator('#game canvas').boundingBox();
  const perLogical = (box?.height ?? 540) / 540;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  // 32 + 30 logical px below the centre: past the bottom edge plus the 16 px slop.
  await page.mouse.move(p.x, p.y + 62 * perLogical, { steps: 4 });
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.mouse.up();
  expect(await count(page, 'btn-secondary')).toBe(0);
  const d = await centre(page, 'btn-disabled');
  await page.mouse.click(d.x, d.y);
  await page.waitForTimeout(100);
  expect(await count(page, 'btn-disabled')).toBe(0);
});

test('keyboard: the ring shows after keys, Tab moves, Enter acts on key-up', async ({ page }) => {
  await openGame(page, '?scene=uilab', '__uilab');
  expect(await page.evaluate(() => window.__uilab?.ringVisible())).toBe(false);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => window.__uilab?.ringVisible())).toBe(true);
  const first = await page.evaluate(() => window.__uilab?.focused());
  expect(first).toBe('btn-secondary'); // registration order after btn-primary
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('btn-primary');
  await page.keyboard.down('Enter');
  expect(await count(page, 'btn-primary')).toBe(0);
  await page.keyboard.up('Enter');
  await expect.poll(() => count(page, 'btn-primary')).toBe(1);
  // A pointer press hides the ring again.
  const p = await centre(page, 'icon-0');
  await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.__uilab?.ringVisible())).toBe(false);
});

test('confirm modal: safe default focus, focus trap, Esc and B cancel, scrim rule', async ({
  page,
}, info) => {
  await openGame(page, '?scene=uilab', '__uilab');
  const open = await centre(page, 'open-modal');
  await page.mouse.click(open.x, open.y);
  await expect.poll(() => page.evaluate(() => window.__uilab?.modalOpen())).toBe(true);
  // Non-destructive: focus starts on the confirm button.
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('modal-confirm');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('modal-cancel');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('modal-confirm');
  await saveShot(page, info, 'uilab-modal');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__uilab?.modalOpen())).toBe(false);
  expect(await page.evaluate(() => window.__uilab?.lastModalResult)).toBe('cancel');
  // Focus is back on the button that opened it.
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('btn-primary');

  // Destructive: focus starts on Cancel, a scrim tap does nothing, B cancels.
  const destructive = await centre(page, 'open-destructive');
  await page.mouse.click(destructive.x, destructive.y);
  await expect.poll(() => page.evaluate(() => window.__uilab?.modalOpen())).toBe(true);
  expect(await page.evaluate(() => window.__uilab?.focused())).toBe('modal-cancel');
  const corner = await cssPoint(page, 40, 40, true);
  await page.mouse.click(corner.x, corner.y);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__uilab?.modalOpen())).toBe(true);
  await page.keyboard.press('b');
  await expect.poll(() => page.evaluate(() => window.__uilab?.modalOpen())).toBe(false);
  // Buttons behind the scrim were never reached.
  expect(await count(page, 'icon-0')).toBe(0);
});
