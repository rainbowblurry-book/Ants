/**
 * Camera rules (DR-046 as amended by J7 and J49, DR-038). Render only: the
 * camera never touches sim state. Pure, so node tests can drive it.
 *
 * - TurnStart: pan and zoom to the active ant, 500 ms ease-out cubic, zoom 1.15.
 * - Move/Aim: steady. A world drag pans, clamped to the world (stage 5 input).
 * - Fire: snap to the ant, then follow the projectile with a 180 ms time
 *   constant and a 40 px look-ahead, zoom easing to 1.2.
 * - Retreat (J49): while the retreat window runs, zoom eases to 1.0 (the whole
 *   world), so the ant and the shot both stay visible.
 * - Impact: hit-stop 75 ms, shake = blast radius × 0.15, capped at 6 px, over
 *   220 ms (logical px). Hold 400 ms on the blast (J7), follow the largest
 *   knockback until it lands, then return to the full view.
 * - Zoom never exceeds 1.25 (DR-020, J7).
 * - Reduced motion: no shake, no zoom (1.0), no hit-stop; pans become 150 ms cuts.
 */
import type { Phase } from '../sim/turn';

export const CAM = {
  turnStartMs: 500,
  turnStartZoom: 1.15,
  followTauMs: 180,
  lookAhead: 40,
  followZoom: 1.2,
  retreatZoom: 1,
  maxZoom: 1.25,
  hitStopMs: 75,
  shakePerRadius: 0.15,
  shakeMax: 6,
  shakeMs: 220,
  holdMs: 400,
  reducedCutMs: 150,
  returnMs: 500,
} as const;

const WORLD = { w: 960, h: 540 };
const CENTRE = { x: WORLD.w / 2, y: WORLD.h / 2 };

export interface Point {
  x: number;
  y: number;
}

export interface CamView {
  cx: number;
  cy: number;
  zoom: number;
}

export interface CamFrame {
  /** True while the blast hit-stop runs: the scene holds the sim. */
  hitStop: boolean;
  /** Projectile in flight (the first live body), with velocity. */
  projectile: (Point & { vx: number; vy: number }) | null;
  /** True during the retreat window (J6, J49). */
  retreating: boolean;
  /** The airborne ant with the largest knockback, if any. */
  knockback: Point | null;
}

export interface CamOutput extends CamView {
  shakeX: number;
  shakeY: number;
}

type Mode = 'static' | 'follow' | 'hold' | 'knock';

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Clamp a centre so the view at `zoom` stays inside the world. */
export function clampCentre(cx: number, cy: number, zoom: number): Point {
  const hw = WORLD.w / (2 * zoom);
  const hh = WORLD.h / (2 * zoom);
  return {
    x: Math.min(WORLD.w - hw, Math.max(hw, cx)),
    y: Math.min(WORLD.h - hh, Math.max(hh, cy)),
  };
}

export class CameraDirector {
  view: CamView = { cx: CENTRE.x, cy: CENTRE.y, zoom: 1 };
  private mode: Mode = 'static';
  private tween: { from: CamView; to: CamView; t0: number; ms: number; cubic: boolean } | null =
    null;
  private holdUntil = 0;
  private hitStopUntil = 0;
  private shake = { amp: 0, t0: 0 };
  private blastAt: Point | null = null;
  private wasRetreating = false;

  constructor(public reduced = false) {}

  private goTo(to: CamView, now: number, ms: number, cubic = true): void {
    const zoom = this.reduced ? 1 : Math.min(CAM.maxZoom, to.zoom);
    const c = clampCentre(to.cx, to.cy, zoom);
    const target = { cx: c.x, cy: c.y, zoom };
    this.tween = {
      from: { ...this.view },
      to: target,
      t0: now,
      ms: this.reduced ? CAM.reducedCutMs : ms,
      cubic: cubic && !this.reduced,
    };
  }

  private snap(to: CamView): void {
    const zoom = this.reduced ? 1 : Math.min(CAM.maxZoom, to.zoom);
    const c = clampCentre(to.cx, to.cy, zoom);
    this.view = { cx: c.x, cy: c.y, zoom };
    this.tween = null;
  }

  /** Call on every phase event. */
  onPhase(phase: Phase, ant: Point | null, now: number): void {
    if (phase === 'turnStart' && ant) {
      this.mode = 'static';
      this.goTo({ cx: ant.x, cy: ant.y, zoom: CAM.turnStartZoom }, now, CAM.turnStartMs);
    } else if (phase === 'fire' && ant) {
      this.mode = 'follow';
      this.snap({ cx: ant.x, cy: ant.y, zoom: this.view.zoom });
    } else if (phase === 'turnEnd' || phase === 'matchEnd') {
      this.mode = 'static';
      this.goTo({ cx: CENTRE.x, cy: CENTRE.y, zoom: 1 }, now, CAM.returnMs);
    }
  }

  /** Call on every blast (hit-stop, shake, hold). */
  onBlast(at: Point, radius: number, now: number): void {
    if (!this.reduced) {
      this.hitStopUntil = now + CAM.hitStopMs;
      this.shake = { amp: Math.min(CAM.shakeMax, radius * CAM.shakePerRadius), t0: now };
    }
    this.blastAt = at;
    this.mode = 'hold';
    this.holdUntil = now + CAM.holdMs;
    if (!this.wasRetreating)
      this.goTo({ cx: at.x, cy: at.y, zoom: this.view.zoom }, now, CAM.holdMs);
  }

  /** A world drag in Move/Aim (stage 5). Logical px. */
  panBy(dx: number, dy: number): void {
    this.tween = null;
    const c = clampCentre(this.view.cx + dx, this.view.cy + dy, this.view.zoom);
    this.view = { ...this.view, cx: c.x, cy: c.y };
  }

  hitStopping(now: number): boolean {
    return now < this.hitStopUntil;
  }

  /** Advances the camera by `dtMs` of real time. */
  update(now: number, dtMs: number, f: CamFrame): CamOutput {
    if (f.retreating !== this.wasRetreating) {
      this.wasRetreating = f.retreating;
      if (f.retreating)
        this.goTo(
          { ...CENTRE, cx: CENTRE.x, cy: CENTRE.y, zoom: CAM.retreatZoom },
          now,
          CAM.turnStartMs,
        );
    }

    if (this.mode === 'hold' && now >= this.holdUntil) {
      this.mode = f.knockback ? 'knock' : 'static';
      if (!f.knockback && !f.retreating) {
        this.goTo({ cx: CENTRE.x, cy: CENTRE.y, zoom: 1 }, now, CAM.returnMs);
      }
    }
    if (this.mode === 'knock' && !f.knockback) {
      this.mode = 'static';
      this.goTo({ cx: CENTRE.x, cy: CENTRE.y, zoom: 1 }, now, CAM.returnMs);
    }

    if (this.tween) {
      const tw = this.tween;
      const t = tw.ms <= 0 ? 1 : Math.min(1, (now - tw.t0) / tw.ms);
      const k = tw.cubic ? easeOutCubic(t) : t;
      this.view = {
        cx: tw.from.cx + (tw.to.cx - tw.from.cx) * k,
        cy: tw.from.cy + (tw.to.cy - tw.from.cy) * k,
        zoom: tw.from.zoom + (tw.to.zoom - tw.from.zoom) * k,
      };
      if (t >= 1) this.tween = null;
    }

    // Follow modes smooth towards a moving target.
    let target: (Point & { zoom: number }) | null = null;
    if (this.mode === 'follow' && f.projectile && !f.retreating) {
      const p = f.projectile;
      const sp = Math.hypot(p.vx, p.vy);
      const la = sp > 1 ? CAM.lookAhead / sp : 0;
      target = { x: p.x + p.vx * la, y: p.y + p.vy * la, zoom: CAM.followZoom };
    } else if (this.mode === 'knock' && f.knockback && !f.retreating) {
      target = { ...f.knockback, zoom: this.view.zoom };
    }
    if (target && !this.tween) {
      const a = 1 - Math.exp(-dtMs / CAM.followTauMs);
      const zoom = this.reduced
        ? 1
        : Math.min(CAM.maxZoom, this.view.zoom + (target.zoom - this.view.zoom) * a);
      const c = clampCentre(
        this.view.cx + (target.x - this.view.cx) * a,
        this.view.cy + (target.y - this.view.cy) * a,
        zoom,
      );
      this.view = { cx: c.x, cy: c.y, zoom };
    }

    const c = clampCentre(this.view.cx, this.view.cy, this.view.zoom);
    this.view.cx = c.x;
    this.view.cy = c.y;

    let shakeX = 0;
    let shakeY = 0;
    const st = now - this.shake.t0;
    if (!this.reduced && this.shake.amp > 0 && st < CAM.shakeMs) {
      const decay = 1 - st / CAM.shakeMs;
      shakeX = this.shake.amp * decay * Math.sin(st * 0.37);
      shakeY = this.shake.amp * decay * Math.cos(st * 0.29);
    }
    return { ...this.view, shakeX, shakeY };
  }

  /** The last blast point (for tests and the knockback rule). */
  get lastBlast(): Point | null {
    return this.blastAt;
  }
}
