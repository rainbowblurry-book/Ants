/**
 * Stage 5 gate (HANDOFF §3): the M1 hot-seat slice.
 *   - a full turn by touch (pointer on desktop) and by keyboard
 *   - the 667x375 readability screenshot (pillar 2, UI.md §6 check 5)
 *   - DR-015 fire buffering through the real input path
 *   - the live HUD rects pass UI.md §6 check 3 in both hands
 *   - Pause freezes the match and resumes after the ready delay (DR-171)
 * Runs at the three target viewports (playwright.config.ts).
 */
import { expect, type Page, test } from '@playwright/test';
import type { BattleHook } from '../src/scenes/Battle';
import type { HudHook } from '../src/scenes/Hud';
import type { PauseHook } from '../src/scenes/Pause';
import { cssPoint, openGame, saveShot } from './helpers';

declare global {
  interface Window {
    __battle?: BattleHook;
    __hud?: HudHook;
    __pause?: PauseHook;
  }
}

type R = { x: number; y: number; w: number; h: number };

async function openHud(page: Page, query: string): Promise<string[]> {
  const errors = await openGame(page, query, '__battle');
  await page.waitForFunction(() => window.__hud?.ready === true);
  return errors;
}

const state = (page: Page) => page.evaluate(() => (window.__hud as HudHook).state());
const rect = (page: Page, id: string) =>
  page.evaluate((k) => (window.__hud as HudHook).rects()[k] as R, id);

/** Tap a logical point: touch on phones, a mouse click on desktop. */
async function tap(page: Page, x: number, y: number, touch: boolean): Promise<void> {
  const p = await cssPoint(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

async function tapRect(page: Page, id: string, touch: boolean): Promise<void> {
  const r = await rect(page, id);
  await tap(page, r.x + r.w / 2, r.y + r.h / 2, touch);
}

/** A drag in logical px: CDP touch events on phones, the mouse on desktop. */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  touch: boolean,
): Promise<void> {
  const a = await cssPoint(page, from.x, from.y);
  const b = await cssPoint(page, to.x, to.y);
  const steps = 8;
  if (touch) {
    const c = await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x, y: a.y }],
    });
    for (let i = 1; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps;
      const y = a.y + ((b.y - a.y) * i) / steps;
      await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await c.detach();
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps });
    await page.mouse.up();
  }
}

async function waitGateOpen(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const s = (window.__hud as HudHook).state();
      return s.gate && !s.gateLocked && !s.coin;
    },
    null,
    { timeout: 20_000 },
  );
}

async function waitPhase(page: Page, phases: string[], timeout = 30_000): Promise<void> {
  await page.waitForFunction((ps) => ps.includes((window.__hud as HudHook).state().phase), phases, {
    timeout,
  });
}

/** Waits for the next team's TurnStart after the current turn. */
async function waitHandover(page: Page, fromTeam: number): Promise<void> {
  await page.waitForFunction(
    (t) => {
      const s = (window.__hud as HudHook).state();
      return s.phase === 'turnStart' && s.team !== t;
    },
    fromTeam,
    { timeout: 40_000 },
  );
}

function lastFire(log: { kind: string }[]) {
  return log.filter((c) => c.kind === 'fire').pop() as
    | { kind: 'fire'; weapon: string; angleDeci: number; powerMille: number; tick: number }
    | undefined;
}

test('a full turn by touch: gate, stepper, tray, slingshot, FIRE, handover', async ({
  page,
}, info) => {
  const touch = info.project.use.hasTouch === true;
  const errors = await openHud(page, '?seed=42');
  await waitGateOpen(page);
  const team = (await state(page)).team;
  await tapRect(page, 'gate', touch);
  await waitPhase(page, ['aim']);

  const before = (await state(page)).aim;
  await tapRect(page, 'angleUp', touch);
  await tapRect(page, 'angleUp', touch);
  expect((await state(page)).aim.angleDeci).toBe(before.angleDeci + 20);

  await tapRect(page, 'slot1', touch);
  expect((await state(page)).weapon).toBe('dewdrop');

  // Slingshot from the active ant: pull 100 px down and back, the shot goes up and forward.
  const s = await state(page);
  const antAt = await page.evaluate((i) => (window.__hud as HudHook).antScreen(i), s.ant);
  expect(antAt).not.toBeNull();
  const start = antAt as { x: number; y: number };
  const back = s.facing > 0 ? -1 : 1;
  await drag(page, start, { x: start.x + back * 71, y: start.y + 71 }, touch);
  const slung = (await state(page)).aim;
  expect(slung.angleDeci).toBe(450);
  expect(slung.powerMille).toBeGreaterThanOrEqual(600);
  expect(slung.powerMille).toBeLessThanOrEqual(720);

  await tapRect(page, 'fire', touch);
  await waitPhase(page, ['fire', 'resolve', 'turnEnd']);
  const fired = lastFire(await page.evaluate(() => (window.__battle as BattleHook).log()));
  expect(fired).toMatchObject({ weapon: 'dewdrop', angleDeci: 450, powerMille: slung.powerMille });

  await waitHandover(page, team);
  await saveShot(page, info, 'stage5-touch-handover');
  expect(await page.evaluate(() => (window.__battle as BattleHook).shots())).toBe(1);
  expect(errors).toEqual([]);
});

test('a full turn by keyboard: Space, W, =, Tab, Space, handover', async ({ page }) => {
  const errors = await openHud(page, '?seed=42');
  await waitGateOpen(page);
  const team = (await state(page)).team;
  await page.keyboard.press('Space');
  await waitPhase(page, ['aim']);
  const before = (await state(page)).aim;
  for (let i = 0; i < 3; i++) await page.keyboard.press('w');
  await page.keyboard.press('=');
  await page.keyboard.press('=');
  const aimed = (await state(page)).aim;
  expect(aimed).toEqual({
    angleDeci: before.angleDeci + 30,
    powerMille: before.powerMille + 20,
  });
  // Seed keeps its aim; Tab moves to the next weapon, which starts at 45° and 60%.
  await page.keyboard.press('Tab');
  expect((await state(page)).weapon).toBe('dewdrop');
  await page.keyboard.press('e');
  await page.keyboard.press('q');
  await page.keyboard.press('1');
  expect((await state(page)).aim).toEqual(aimed);
  await page.keyboard.press('Space');
  await waitPhase(page, ['fire', 'resolve', 'turnEnd']);
  const fired = lastFire(await page.evaluate(() => (window.__battle as BattleHook).log()));
  expect(fired).toMatchObject({ weapon: 'seed', ...aimed });
  await waitHandover(page, team);
  expect(errors).toEqual([]);
});

test('667x375: one screenshot shows who is up, the wind and the aim', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-667x375', 'the readability check is the small phone');
  const errors = await openHud(page, '?seed=42');
  await waitGateOpen(page);
  await page.keyboard.press('Space');
  await waitPhase(page, ['aim']);
  await page.waitForTimeout(700); // the TurnStart pan has settled
  await saveShot(page, info, 'stage5-readability');
  const s = await state(page);
  const name = s.team === 0 ? 'Blue Caps' : 'Amber Caps';
  expect(s.plate).toContain(name);
  expect(Math.abs(s.wind)).toBeLessThanOrEqual(2);
  expect(s.preview).toBe(true);
  expect(s.fire).toBe('ready');
  // The plate, wind gauge, dial and slider are on the canvas and drawn at full strength.
  for (const id of ['plate', 'wind', 'dial', 'power']) {
    const r = await rect(page, id);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(960);
  }
  expect(s.alpha.dial).toBe(1);
  expect(s.alpha.power).toBe(1);
  // At 667 CSS px the 28 logical px label is still at least 19 CSS px (DR-080 floor 18).
  const box = await page.locator('#game canvas').boundingBox();
  expect(((box?.width ?? 0) / 960) * 28).toBeGreaterThanOrEqual(18);
  expect(errors).toEqual([]);
});

test('DR-015: fire pressed in the air is buffered and taken on landing; too early is dropped', async ({
  page,
}) => {
  const errors = await openHud(page, '?seed=7');
  await waitGateOpen(page);
  await page.keyboard.press('Space');
  await waitPhase(page, ['aim']);
  await page.waitForTimeout(300);

  // Too early: Space right after the hop is older than 12 ticks by the landing.
  await page.keyboard.press('z');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const b = window.__battle as BattleHook;
    return b.events().some((e) => e.kind === 'reject' && e.command === 'fire' && e.why === 'late');
  });
  expect((await state(page)).phase).toBe('aim');
  await page.waitForTimeout(300);

  // Just before landing: pressed while airborne and falling, it fires on the landing.
  const pressedAt = await page.evaluate(
    () =>
      new Promise<{ tick: number; state: string }>((resolve) => {
        const b = window.__battle as BattleHook;
        const h = window.__hud as HudHook;
        const i = h.state().ant;
        const key = (type: 'keydown' | 'keyup', k: string) =>
          window.dispatchEvent(new KeyboardEvent(type, { key: k }));
        key('keydown', 'z');
        key('keyup', 'z');
        const loop = () => {
          const a = b.ant(i);
          if (a && a.state === 'air' && a.vy > 250) {
            key('keydown', ' ');
            key('keyup', ' ');
            resolve({ tick: b.tick(), state: a.state });
          } else requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }),
  );
  expect(pressedAt.state).toBe('air');
  await waitPhase(page, ['fire', 'resolve', 'turnEnd'], 5_000);
  const ev = await page.evaluate(() => (window.__battle as BattleHook).events());
  const firePhase = ev.find((e) => e.kind === 'phase' && e.phase === 'fire');
  expect(firePhase).toBeDefined();
  const fired = lastFire(await page.evaluate(() => (window.__battle as BattleHook).log()));
  expect(fired).toBeDefined();
  const f = fired as { tick: number };
  // It waited for the landing, and no longer than the 12-tick window.
  expect((firePhase?.tick ?? 0) - f.tick).toBeGreaterThan(0);
  expect((firePhase?.tick ?? 0) - f.tick).toBeLessThanOrEqual(12);
  expect(errors).toEqual([]);
});

for (const hand of ['right', 'left'] as const) {
  test(`live HUD rects pass UI.md §6 check 3 (${hand}-handed)`, async ({ page }, info) => {
    const errors = await openHud(page, `?seed=1&hand=${hand}`);
    const { rects, controls } = await page.evaluate(() => ({
      rects: (window.__hud as HudHook).rects(),
      controls: (window.__hud as HudHook).controls(),
    }));
    const margins = await page.evaluate(() => window.__ants?.layout.margins);
    const m = margins ?? { top: 16, right: 16, bottom: 16, left: 16 };
    for (const id of controls) {
      const r = rects[id] as R;
      expect(r.w, id).toBeGreaterThanOrEqual(64);
      expect(r.h, id).toBeGreaterThanOrEqual(64);
      expect(r.x, id).toBeGreaterThanOrEqual(m.left - 1e-6);
      expect(r.y, id).toBeGreaterThanOrEqual(m.top - 1e-6);
      expect(r.x + r.w, id).toBeLessThanOrEqual(960 - m.right + 1e-6);
      expect(r.y + r.h, id).toBeLessThanOrEqual(540 - m.bottom + 1e-6);
    }
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = rects[controls[i] as string] as R;
        const b = rects[controls[j] as string] as R;
        const gap = Math.max(
          b.x - (a.x + a.w),
          a.x - (b.x + b.w),
          b.y - (a.y + a.h),
          a.y - (b.y + b.h),
        );
        expect(gap, `${controls[i]} / ${controls[j]}`).toBeGreaterThanOrEqual(8);
      }
    }
    if (hand === 'left') {
      expect((rects.fire as R).x).toBeLessThan(480);
      await waitGateOpen(page);
      await saveShot(page, info, 'stage5-left-handed');
    }
    expect(errors).toEqual([]);
  });
}

test('Pause freezes the match; Resume waits the ready delay and clears buffers', async ({
  page,
}, info) => {
  const touch = info.project.use.hasTouch === true;
  const errors = await openHud(page, '?seed=3');
  await waitGateOpen(page);
  await page.keyboard.press('Space');
  await waitPhase(page, ['aim']);
  await tapRect(page, 'pause', touch);
  await page.waitForFunction(() => window.__pause?.ready === true);
  expect(await page.evaluate(() => (window.__pause as PauseHook).focused())).toBe('resume');
  const t1 = await page.evaluate(() => (window.__battle as BattleHook).tick());
  const timer1 = (await state(page)).timer;
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window.__battle as BattleHook).tick())).toBe(t1);
  expect((await state(page)).timer).toBe(timer1);
  await saveShot(page, info, 'stage5-pause');

  const r = await page.evaluate(() => (window.__pause as PauseHook).rect('resume'));
  const resume = r as R;
  const tappedAt = Date.now();
  await tap(page, resume.x + resume.w / 2, resume.y + resume.h / 2, touch);
  await page.waitForFunction(() => window.__pause === undefined, null, { timeout: 5_000 });
  expect(Date.now() - tappedAt).toBeGreaterThanOrEqual(600);
  await page.waitForFunction((t) => (window.__battle as BattleHook).tick() > t, t1);
  const log = await page.evaluate(() => (window.__battle as BattleHook).log());
  expect(log.some((c) => c.kind === 'cancel')).toBe(true);
  expect(errors).toEqual([]);
});

test('DR-183: the gate is locked for its first 400 ms on screen, even after the coin pop', async ({
  page,
}) => {
  const errors = await openHud(page, '?seed=42');
  const first = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const loop = () => {
          const s = (window.__hud as HudHook).state();
          if (s.gate) resolve(s.gateLocked);
          else requestAnimationFrame(loop);
        };
        loop();
      }),
  );
  expect(first).toBe(true);
  await waitGateOpen(page);
  expect(errors).toEqual([]);
});

test('a resize mid-turn rebuilds the HUD with the same turn, plate and aim', async ({ page }) => {
  const errors = await openHud(page, '?seed=42');
  await waitGateOpen(page);
  await page.keyboard.press('Space');
  await waitPhase(page, ['aim']);
  await page.keyboard.press('w');
  const before = await state(page);
  const vp = page.viewportSize() ?? { width: 844, height: 390 };
  await page.setViewportSize({ width: vp.width - 40, height: vp.height });
  await page.waitForFunction((p) => {
    const s = (window.__hud as HudHook | undefined)?.state();
    return !!s && s.plate === p;
  }, before.plate);
  const after = await state(page);
  expect(after.team).toBe(before.team);
  expect(after.aim).toEqual(before.aim);
  expect(after.plate.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
