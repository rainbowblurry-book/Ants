/**
 * Stage 6 (part 3): a bot plays Amber's turn in a `?bot=40` match (proposed
 * OVR-020). It thinks, aims with the DR-129 crosshair and power bar, fires
 * the plan's values through the command log, ignores the player's taps, and
 * hands the turn back. Sim time is stepped through `__battle.stepTicks()`,
 * never waited on. Runs at the three target viewports.
 */
import { expect, type Page, test } from '@playwright/test';
import type { BattleHook, BotHook } from '../src/scenes/Battle';
import type { HudHook } from '../src/scenes/Hud';
import { cssPoint, openGame, saveShot } from './helpers';

declare global {
  interface Window {
    __battle?: BattleHook;
    __hud?: HudHook;
  }
}

type R = { x: number; y: number; w: number; h: number };
const BOT = 1;

const state = (page: Page) => page.evaluate(() => (window.__hud as HudHook).state());
const bot = (page: Page) => page.evaluate(() => (window.__battle as BattleHook).bot() as BotHook);

async function tapRect(page: Page, id: string, touch: boolean): Promise<void> {
  const r = await page.evaluate((k) => (window.__hud as HudHook).rects()[k] as R, id);
  const p = await cssPoint(page, r.x + r.w / 2, r.y + r.h / 2);
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

/** Steps the sim until `team`'s TurnStart (or its Move/Aim with `aim`). */
async function stepTo(page: Page, team: number, phase: 'turnStart' | 'aim'): Promise<void> {
  const ok = await page.evaluate(
    ([t, ph]) => {
      const b = window.__battle as BattleHook;
      const h = window.__hud as HudHook;
      for (let i = 0; i < 1200; i++) {
        const s = h.state();
        if (s.team === t && s.phase === ph) return true;
        b.stepTicks(1);
      }
      return false;
    },
    [team, phase] as const,
  );
  expect(ok, `team ${team} reaches ${phase}`).toBe(true);
}

test('a Level 40 bot thinks, aims, fires its plan and hands the turn back', async ({
  page,
}, info) => {
  const touch = info.project.use.hasTouch === true;
  const errors = await openGame(page, '?bot=40&seed=42', '__battle');
  await page.waitForFunction(() => window.__hud?.ready === true);
  expect(await bot(page)).toMatchObject({ team: BOT, level: 40, boss: false });
  // The first-turn coin pop is waited out before any tap.
  await expect.poll(async () => (await state(page)).coin, { timeout: 10_000 }).toBe(false);

  // The coin flip: if the player starts, the player fires once.
  if ((await state(page)).team !== BOT) {
    await stepTo(page, 0, 'aim');
    await tapRect(page, 'fire', touch);
    await expect
      .poll(async () => (await page.evaluate(() => window.__battle?.log() ?? [])).length)
      .toBeGreaterThan(0);
  }
  await stepTo(page, BOT, 'turnStart');
  const turnFrom = await page.evaluate(() => (window.__battle as BattleHook).tick());
  const s0 = await state(page);
  expect(s0.bot?.turn).toBe(true);
  expect(s0.gate).toBe(false);

  // Into the think phase, then the player's FIRE and Space are ignored.
  const thinking = await page.evaluate(() => {
    const b = window.__battle as BattleHook;
    for (let i = 0; i < 300; i++) {
      if (b.bot()?.phase === 'think') return true;
      b.stepTicks(1);
    }
    return false;
  });
  expect(thinking).toBe(true);
  await tapRect(page, 'fire', touch);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).fire).toBe('disabled');

  // Step tick by tick into the aim phase: the DR-129 crosshair, power bar and wobble.
  const aim = await page.evaluate(() => {
    const b = window.__battle as BattleHook;
    const phases: string[] = [];
    let crosshair = false;
    let bar = false;
    let wobbled = false;
    let aimTicks = 0;
    for (let i = 0; i < 1200 && b.phase() !== 'fire'; i++) {
      const s = b.bot();
      const p = s?.phase ?? 'null';
      if (phases[phases.length - 1] !== p) phases.push(p);
      if (s?.phase === 'aim' && b.phase() === 'aim' && s.shown && s.plan) {
        aimTicks++;
        crosshair ||= s.crosshair;
        bar ||= s.bar;
        if (s.shown.angleDeci !== s.plan.angleDeci || s.shown.powerMille !== s.plan.powerMille)
          wobbled = true;
        if (aimTicks >= 12) break;
      }
      b.stepTicks(1);
    }
    return { phases, crosshair, bar, wobbled, wobbleDeci: b.bot()?.plan?.wobbleDeci ?? 0 };
  });
  expect(aim.phases).toContain('aim');
  expect(aim.crosshair).toBe(true);
  expect(aim.bar).toBe(true);
  if (aim.wobbleDeci > 0) expect(aim.wobbled).toBe(true);
  await saveShot(page, info, 'stage6-bot-aim');

  // On to the shot: the shown aim has settled exactly on the fired values (DR-066).
  const shot = await page.evaluate(() => {
    const b = window.__battle as BattleHook;
    for (let i = 0; i < 1200 && b.phase() === 'aim'; i++) b.stepTicks(1);
    const s = b.bot();
    return { phase: b.phase(), shown: s?.shown ?? null, plan: s?.plan ?? null };
  });
  expect(['fire', 'resolve']).toContain(shot.phase);
  expect(shot.shown).toEqual({
    angleDeci: shot.plan?.angleDeci,
    powerMille: shot.plan?.powerMille,
  });
  const b1 = await bot(page);
  expect(b1.history[0]).toBe('think');
  expect(b1.history.filter((p) => p !== 'move')).toEqual(['think', 'aim', 'fire']);
  const plan = b1.plan as NonNullable<BotHook['plan']>;

  // The shot in the log is the plan's, stamped in the bot's turn.
  const log = await page.evaluate(() => (window.__battle as BattleHook).log());
  const fires = log.filter((c) => c.kind === 'fire' && c.tick > turnFrom) as unknown as {
    weapon: string;
    angleDeci: number;
    powerMille: number;
    tick: number;
  }[];
  expect(fires).toHaveLength(1);
  expect(fires[0]).toMatchObject({
    angleDeci: plan.angleDeci,
    powerMille: plan.powerMille,
  });

  // During the retreat a player's Hop and walk would count; in the bot's turn they do not.
  await tapRect(page, 'hop', touch);
  await tapRect(page, 'walkR', touch);
  await page.keyboard.press('z');
  const s1 = await state(page);
  expect(s1.team).toBe(BOT);
  expect(s1.active.aim).toBe(false);
  expect(s1.active.move).toBe(false);
  // The HUD dial and slider mirror the bot's fired aim at 55%.
  await expect
    .poll(async () => (await state(page)).bot?.mirror)
    .toEqual({ angleDeci: plan.angleDeci, powerMille: plan.powerMille });
  expect((await state(page)).alpha.dial).toBeCloseTo(0.55, 2);
  expect((await state(page)).alpha.power).toBeCloseTo(0.55, 2);

  // The turn passes back to the player.
  await stepTo(page, 0, 'turnStart');
  const after = await page.evaluate(
    (from) =>
      (window.__battle as BattleHook)
        .log()
        .filter((c) => c.tick > from)
        .map((c) => c.kind),
    turnFrom,
  );
  expect(after).not.toContain('hop');
  expect(after).not.toContain('flip');
  expect(after.filter((k) => k === 'fire')).toHaveLength(1);
  // Nothing at all reached the sim after the bot's shot: the taps and keys were dropped.
  const fireTick = fires[0]?.tick ?? 0;
  const late = await page.evaluate(
    (t) => (window.__battle as BattleHook).log().filter((c) => c.tick > t),
    fireTick,
  );
  expect(late).toEqual([]);
  const s2 = await state(page);
  expect(s2.bot?.turn).toBe(false);
  expect((await bot(page)).phase).toBeNull();
  expect(await page.evaluate(() => (window.__battle as BattleHook).shots())).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('without ?bot the hot seat has no bot', async ({ page }) => {
  const errors = await openGame(page, '?seed=42', '__battle');
  await page.waitForFunction(() => window.__hud?.ready === true);
  expect(await page.evaluate(() => (window.__battle as BattleHook).bot())).toBeNull();
  expect((await state(page)).bot).toBeNull();
  expect(errors).toEqual([]);
});
