/**
 * Juice (CREATIVE §4, DR-084, DR-046). The camera owns shake and hit-stop
 * (camera.ts), sized in logical px. This file holds the sprite moments:
 * a landing squash. Stage 11 adds the rest of the motion pass.
 * Reduced motion: no squash (DR-084: no scale).
 */
import type * as Phaser from 'phaser';
import { reducedMotion } from '../ui/motion';
import { tokens } from '../ui/theme';

/** Squash on landing: the pressed-state shape (1.03 x 0.95) and back, press then release timing. */
export function landSquash(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  if (reducedMotion()) return;
  const sx = img.scaleX;
  const sy = img.scaleY;
  const p = tokens.shape.pressed;
  scene.tweens.add({
    targets: img,
    scaleX: sx * p.scaleX,
    scaleY: sy * p.scaleY,
    duration: tokens.motion.press.ms,
    ease: tokens.motion.press.ease,
    yoyo: true,
    hold: 0,
    completeDelay: 0,
    onComplete: () => img.setScale(sx, sy),
  });
}
