/**
 * Stage 0 gate (HANDOFF §3): the game boots, and the S=2 render path has no
 * seams, no misaligned UI and working input. The same checks run at S=1, the
 * DR-013 fallback, so both paths stay proven.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import type { SpikeHook, SpikeProbe } from '../src/scenes/Spike';

declare global {
  interface Window {
    __spike?: SpikeHook;
  }
}

const SCALES = [1, 2] as const;

/** Set SPIKE_OUT to also write the screenshots and timings to that folder. */
const outDir = process.env.SPIKE_OUT;

/** Camera poses: [centre x, centre y, gameplay zoom]. Fractions on purpose. */
const POSES: [number, number, number][] = [
  [480, 270, 1],
  [437.3, 251.7, 1.2],
  [523.25, 288.5, 1.2],
  [400, 225, 1.2],
  [560, 315, 1.2],
  [471.9, 262.4, 1.15],
  [489.6, 281.3, 1.25],
];

async function openSpike(page: Page, query = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`./${query}`);
  await page.waitForFunction(() => window.__spike !== undefined);
  return errors;
}

async function freeze(page: Page, pose: [number, number, number]): Promise<void> {
  await page.evaluate(([cx, cy, zoom]) => window.__spike?.freeze(cx, cy, zoom), pose);
}

async function probe(page: Page): Promise<SpikeProbe> {
  return page.evaluate(() => (window.__spike as SpikeHook).probe());
}

test('boots: splash leaves, canvas is labelled, nothing crashes', async ({ page }) => {
  const errors = await openSpike(page);
  await expect(page.locator('#splash')).toBeHidden();
  await expect(page.locator('#fatal')).toBeHidden();
  await expect(page.locator('#rotate')).toBeHidden();
  await expect(page.locator('#game canvas')).toHaveAttribute('aria-label', 'ANTS! game');
  expect(errors).toEqual([]);
});

test('render scale follows DR-013, and ?s= overrides it', async ({ page }, testInfo) => {
  await openSpike(page);
  const dpr = testInfo.project.use.deviceScaleFactor ?? 1;
  const auto = await probe(page);
  expect(auto.renderScale).toBe(dpr >= 1.5 ? 2 : 1);
  expect(auto.canvas).toEqual({ w: 960 * auto.renderScale, h: 540 * auto.renderScale });

  // The game ran on WebGL, not the Canvas fallback.
  expect(await page.evaluate(() => window.__ants?.game.renderer.type)).toBe(2);
});

for (const s of SCALES) {
  test(`S=${s}: no seams and no misalignment while the camera pans`, async ({ page }) => {
    await openSpike(page, `?s=${s}`);
    for (const pose of POSES) {
      await freeze(page, pose);
      const p = await probe(page);
      const where = `pose ${pose.join(', ')}`;
      expect(p.renderScale, where).toBe(s);

      // Seams: every pixel of the solid soil and of the panel strips is flat.
      expect(p.worldSeamChecked, where).toBeGreaterThan(10_000);
      expect(p.worldSeamPixels, where).toBe(0);
      expect(p.uiSeamChecked, where).toBeGreaterThan(1_000);
      expect(p.uiSeamPixels, where).toBe(0);

      // UI alignment: the button face sits on its logical rect exactly.
      expect(p.buttonFace, where).toEqual(p.buttonFaceExpected);

      // World alignment: the badge is where the camera maths says, to the
      // nearest canvas px on each edge (edges are antialiased).
      expect(p.badge, where).not.toBeNull();
      const tol = 1.5 / s + 0.01;
      for (const k of ['x', 'y', 'w', 'h'] as const) {
        expect(
          Math.abs((p.badge?.[k] ?? 0) - p.badgeExpected[k]),
          `${where} badge.${k}`,
        ).toBeLessThanOrEqual(k === 'w' || k === 'h' ? tol * 2 : tol);
      }
    }
  });

  test(`S=${s}: a tap on the button's logical rect reaches it`, async ({ page }, testInfo) => {
    await openSpike(page, `?s=${s}`);
    const box = await page.locator('#game canvas').boundingBox();
    if (!box) throw new Error('no canvas');
    const scale = box.width / 960;
    // Centre of the Play rect 608,252,320,72 and a point just inside a corner.
    const points: [number, number][] = [
      [768, 288],
      [612, 256],
    ];
    for (const [lx, ly] of points) {
      const x = box.x + lx * scale;
      const y = box.y + ly * scale;
      if (testInfo.project.use.hasTouch) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    // A tap just outside the rect must miss.
    const missX = box.x + 600 * scale;
    const missY = box.y + 288 * scale;
    if (testInfo.project.use.hasTouch) await page.touchscreen.tap(missX, missY);
    else await page.mouse.click(missX, missY);

    await expect.poll(() => page.evaluate(() => window.__spike?.taps)).toBe(2);
  });

  test(`S=${s}: screenshots and frame time`, async ({ page }, testInfo) => {
    await openSpike(page, `?s=${s}`);
    const name = `${testInfo.project.name}-s${s}`;
    const shots: [string, Buffer][] = [];

    await freeze(page, [480, 270, 1]);
    await page.waitForTimeout(700);
    shots.push([`${name}.png`, await page.screenshot()]);

    // A close crop of the text and outlines (logical rect 16,16,400,290).
    const box = await page.locator('#game canvas').boundingBox();
    if (!box) throw new Error('no canvas');
    const k = box.width / 960;
    const clip = { x: box.x + 16 * k, y: box.y + 16 * k, width: 400 * k, height: 290 * k };
    shots.push([`${name}-crop.png`, await page.screenshot({ clip })]);

    await freeze(page, [437.3, 251.7, 1.2]);
    await page.waitForTimeout(700);
    shots.push([`${name}-pan.png`, await page.screenshot()]);

    // Frame time while the camera pans. Phones get a 4x CPU slowdown, as a
    // stand-in for a mid-range phone. The GPU here is software (SwiftShader),
    // so these numbers compare S=1 with S=2. They are not device numbers.
    const throttled = testInfo.project.use.isMobile === true;
    const cdp = await page.context().newCDPSession(page);
    if (throttled) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      window.__spike?.resume();
      window.__spike?.resetFrameStats();
    });
    await page.waitForTimeout(4000);
    const stats = await page.evaluate(() => (window.__spike as SpikeHook).frameStats());
    if (throttled) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(stats.frames).toBeGreaterThan(10);

    const report = {
      project: testInfo.project.name,
      renderScale: s,
      cpuThrottle: throttled ? 4 : 1,
      ...stats,
    };
    console.log(`frame-time ${JSON.stringify(report)}`);
    await testInfo.attach(`${name}-frame-time.json`, {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    for (const [file, body] of shots) {
      await testInfo.attach(file, { body, contentType: 'image/png' });
    }
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      for (const [file, body] of shots) writeFileSync(join(outDir, file), body);
      writeFileSync(
        join(outDir, `${name}-frame-time.json`),
        `${JSON.stringify(report, null, 2)}\n`,
      );
    }
  });
}

test('rotate overlay shows on a phone in portrait only (DR-094)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch !== true, 'the overlay is for touch devices');
  await openSpike(page);
  const size = page.viewportSize();
  if (!size) throw new Error('no viewport');
  await expect(page.locator('#rotate')).toBeHidden();
  await page.setViewportSize({ width: size.height, height: size.width });
  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#rotate')).toContainText('Turn your phone sideways');
  await page.setViewportSize(size);
  await expect(page.locator('#rotate')).toBeHidden();
});
