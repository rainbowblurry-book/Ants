/**
 * Sprites for ants, projectiles and pickups, drawn from manifest keys
 * (DR-195). Positions are interpolated between the last two sim states
 * (PLAN §1). Placeholder art only (DR-007a): every ant pose maps to the same
 * cut-out until the final rig exists.
 */
import * as Phaser from 'phaser';
import { ANT_SIDE, antSideKey, asset, RASTER } from '../assets/manifest';
import type { Ant } from '../sim/movement';
import type { Pickup } from '../sim/pickups';
import type { Body } from '../sim/weapons/index';
import { landSquash } from './juice';

export interface Snapshot {
  ants: { x: number; y: number }[];
  bodies: WeakMap<Body, { x: number; y: number }>;
}

export function snapshot(ants: readonly Ant[], bodies: readonly Body[]): Snapshot {
  const map = new WeakMap<Body, { x: number; y: number }>();
  for (const b of bodies) map.set(b, { x: b.p.x, y: b.p.y });
  return { ants: ants.map((a) => ({ x: a.x, y: a.y })), bodies: map };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Pose = 'idle' | 'aim' | 'hop' | 'ko' | 'walk' | 'flip';

export class AntSprite {
  readonly image: Phaser.GameObjects.Image;
  private pose: Pose | null = null;
  private wasAir = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly index: number,
    private readonly team: number,
  ) {
    const e = asset(antSideKey(team, 'idle'));
    this.image = scene.add.image(0, 0, e.atlas, e.frame).setOrigin(e.originX, e.originY);
    this.image.setDisplaySize(ANT_SIDE.w, ANT_SIDE.h);
    this.setPose('idle');
  }

  private setPose(pose: Pose): void {
    if (pose === this.pose) return;
    this.pose = pose;
    const e = asset(antSideKey(this.team, pose));
    this.image.setFrame(e.frame);
    this.image.setDisplaySize(ANT_SIDE.w, ANT_SIDE.h);
  }

  update(a: Ant, prev: { x: number; y: number } | undefined, alpha: number, aiming: boolean): void {
    const x = prev ? lerp(prev.x, a.x, alpha) : a.x;
    const y = prev ? lerp(prev.y, a.y, alpha) : a.y;
    this.image.setPosition(x, y);
    // The cut-out faces right; mirror for left (DR-027).
    this.image.setFlipX(a.facing < 0);
    this.setPose(a.state === 'ko' ? 'ko' : a.state === 'air' ? 'hop' : aiming ? 'aim' : 'idle');
    if (this.wasAir && a.state === 'ground') landSquash(this.scene, this.image);
    this.wasAir = a.state === 'air';
    // Knocked-out ants leave the field (the stretcher animation is a later stage).
    this.image.setVisible(a.state !== 'ko');
  }

  destroy(): void {
    this.image.destroy();
  }
}

/** Projectile art per body kind (Pollen's puffs use the Pollen art). */
function projectileKey(b: Body): string {
  return b.kind === 'puff' ? 'projectile.pollen' : `projectile.${b.kind}`;
}

/** Drawn diameter: the collision ring plus the 4 px centre margin, at least 16 px. */
function projectileSize(b: Body): number {
  return Math.max(16, (b.p.ringR + 4) * 2);
}

export class ShotSprites {
  private pool = new Map<Body, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(bodies: readonly Body[], prev: Snapshot | null, alpha: number): void {
    const live = new Set(bodies);
    for (const [b, img] of this.pool) {
      if (!live.has(b)) {
        img.destroy();
        this.pool.delete(b);
      }
    }
    for (const b of bodies) {
      let img = this.pool.get(b);
      if (!img) {
        const e = asset(projectileKey(b));
        img = this.scene.add.image(b.p.x, b.p.y, e.atlas, e.frame).setOrigin(e.originX, e.originY);
        const d = projectileSize(b);
        img.setDisplaySize(d, d);
        this.pool.set(b, img);
      }
      const p = prev?.bodies.get(b);
      img.setPosition(p ? lerp(p.x, b.p.x, alpha) : b.p.x, p ? lerp(p.y, b.p.y, alpha) : b.p.y);
    }
  }

  get count(): number {
    return this.pool.size;
  }
}

export class PickupSprites {
  private images: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  update(pickups: readonly Pickup[]): void {
    while (this.images.length > pickups.length) this.images.pop()?.destroy();
    pickups.forEach((p, i) => {
      const key = p.kind === 'honey' ? 'pickup.honey' : 'pickup.seeds';
      const e = asset(key);
      let img = this.images[i];
      if (!img) {
        img = this.scene.add.image(0, 0, e.atlas, e.frame).setOrigin(e.originX, e.originY);
        img.setScale(1 / RASTER);
        this.images.push(img);
      } else if (img.frame.name !== e.frame) {
        img.setFrame(e.frame);
      }
      img.setPosition(p.x, p.y);
    });
  }
}

/** Phaser's GameObject destroy event, re-exported so scenes need one import. */
export const DESTROY = Phaser.GameObjects.Events.DESTROY;
