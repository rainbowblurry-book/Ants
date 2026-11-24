/**
 * Aim state and the three aim skins (DR-033, DR-121, J8, J9).
 *
 * Angle and power are state, not pointer positions: the dial, the slider,
 * the steppers, the slingshot and the keys all write the same `Aim`, so the
 * HUD, the preview and the fire command agree (DR-015). Pure: no Phaser.
 *
 * Angle is in 0.1° above the horizontal toward the ant's facing (−20°..+90°),
 * power in ‰ (0..1000). Touch and drags snap to 1° and 1% (DR-121).
 */
import { AIM_MAX_DECI, AIM_MIN_DECI, POWER_MAX_MILLE } from '../sim/commands.ts';
import type { WeaponId } from '../sim/weapons/types.ts';

export interface Aim {
  angleDeci: number;
  powerMille: number;
}

/** DR-033: the first shot of each weapon defaults to 45° and 60%. */
export const DEFAULT_AIM: Readonly<Aim> = { angleDeci: 450, powerMille: 600 };

/** Steps: 1° / 5° and 1% / 5% (DR-033, DR-121). */
export const ANGLE_STEP = { fine: 10, coarse: 50 } as const;
export const POWER_STEP = { fine: 10, coarse: 50 } as const;

/** Stepper repeat (DR-121): tap 1 step; hold 15 steps/s for 0.3 s, then coarse at 10/s. */
export const REPEAT = { fineHz: 15, fineMs: 300, coarseHz: 10 } as const;

/** Slingshot (DR-121): grab radius 56 px, dead zone 20 px, power = pull / 150 px. */
export const SLING = { grabR: 56, deadZone: 20, fullPull: 150 } as const;

export const clampAngle = (d: number) => Math.min(AIM_MAX_DECI, Math.max(AIM_MIN_DECI, d));
export const clampPower = (p: number) => Math.min(POWER_MAX_MILLE, Math.max(0, p));
/** Snap to whole degrees / whole percent. */
export const snapTen = (v: number) => Math.round(v / 10) * 10;

/**
 * Each ant remembers one angle and power; switching weapon keeps them
 * (OVR-017, over DR-033's memory per weapon). The weapon argument stays so
 * callers need not change if the owner asks for the old rule back.
 */
export class AimMemory {
  private map = new Map<number, Aim>();

  get(ant: number, _weapon: WeaponId): Aim {
    return { ...(this.map.get(ant) ?? DEFAULT_AIM) };
  }

  set(ant: number, _weapon: WeaponId, aim: Aim): void {
    this.map.set(ant, {
      angleDeci: clampAngle(Math.round(aim.angleDeci)),
      powerMille: clampPower(Math.round(aim.powerMille)),
    });
  }
}

/**
 * Stepper hold repeat, driven by a clock in ms. `down` steps once (fine);
 * `update` emits the held repeats: fine at 15/s until 0.3 s, then coarse at
 * 10/s. The clock is real time: aiming is input, not sim state.
 */
export class Repeater {
  private t0 = 0;
  private nextAt = Number.POSITIVE_INFINITY;
  held = false;

  constructor(private readonly onStep: (coarse: boolean) => void) {}

  down(now: number): void {
    this.held = true;
    this.t0 = now;
    this.onStep(false);
    this.nextAt = now + 1000 / REPEAT.fineHz;
  }

  update(now: number): void {
    if (!this.held) return;
    let guard = 0;
    while (now >= this.nextAt && guard++ < 64) {
      const coarse = this.nextAt - this.t0 >= REPEAT.fineMs;
      this.onStep(coarse);
      this.nextAt += 1000 / (coarse ? REPEAT.coarseHz : REPEAT.fineHz);
    }
  }

  up(): void {
    this.held = false;
    this.nextAt = Number.POSITIVE_INFINITY;
  }
}

/** Degrees above the horizontal of a direction (screen y grows down), toward |dx|. */
function elevationDeci(dx: number, dy: number): number {
  return (Math.atan2(-dy, Math.abs(dx)) * 1800) / Math.PI;
}

export interface FacedAim extends Aim {
  facing: 1 | -1;
}

/**
 * The dial (DR-121): the needle points from the dial centre to the pointer.
 * The half it points into is the facing; the angle is clamped to −20°..+90°
 * and snapped to 1°.
 */
export function dialAim(
  cx: number,
  cy: number,
  px: number,
  py: number,
  power: number,
  facing: 1 | -1,
): FacedAim {
  const dx = px - cx;
  const dy = py - cy;
  const f: 1 | -1 = dx > 0 ? 1 : dx < 0 ? -1 : facing;
  return { angleDeci: clampAngle(snapTen(elevationDeci(dx, dy))), powerMille: power, facing: f };
}

/** The power slider (DR-121): a 160 px track, bottom = 0%, snapped to 1%. */
export function sliderPower(trackTop: number, trackH: number, py: number): number {
  const v = (trackTop + trackH - py) / trackH;
  return clampPower(snapTen(v * POWER_MAX_MILLE));
}

/**
 * The slingshot (DR-121): the pull runs from where the drag started to the
 * pointer; the shot goes the opposite way. Power = pull / 150 px. Inside the
 * 20 px dead zone nothing changes (null).
 */
export function slingAim(
  startX: number,
  startY: number,
  px: number,
  py: number,
  facing: 1 | -1,
): FacedAim | null {
  const pullX = px - startX;
  const pullY = py - startY;
  const pull = Math.hypot(pullX, pullY);
  if (pull < SLING.deadZone) return null;
  const sx = -pullX;
  const sy = -pullY;
  const f: 1 | -1 = sx > 0 ? 1 : sx < 0 ? -1 : facing;
  return {
    angleDeci: clampAngle(snapTen(elevationDeci(sx, sy))),
    powerMille: clampPower(snapTen((Math.min(pull, SLING.fullPull) / SLING.fullPull) * 1000)),
    facing: f,
  };
}

/** The aim direction as a unit vector in screen space (for the dial needle). */
export function aimVector(angleDeci: number, facing: 1 | -1): { x: number; y: number } {
  const a = (angleDeci * Math.PI) / 1800;
  return { x: Math.cos(a) * facing, y: -Math.sin(a) };
}
