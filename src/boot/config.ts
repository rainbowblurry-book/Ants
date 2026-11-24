import * as Phaser from 'phaser';
import { screenSize, worldOffset } from '../ui/layout';
import { cssColor } from '../ui/theme';
import { LOGICAL_H, LOGICAL_W, type RenderScale } from './renderScale';

/** Registry key that holds the render scale S for every scene. */
export const REG_RENDER_SCALE = 'renderScale';

/**
 * The Phaser game config from DR-013 (as amended by DR-085: the canvas parent
 * has no safe-area padding). There is no physics block: the sim does its own
 * physics (DR-010).
 */
export function buildGameConfig(
  s: RenderScale,
  scenes: Phaser.Types.Scenes.SceneType[],
  width: number = LOGICAL_W,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    // OVR-013: W x 540 logical, W from the viewport's shape.
    width: width * s,
    height: LOGICAL_H * s,
    backgroundColor: cssColor.letterbox,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: {
      touch: { capture: true },
      activePointers: 3,
    },
    disableContextMenu: true,
    banner: false,
    scene: scenes,
  };
}

/**
 * Point a camera at the logical 960x540 world at render scale S.
 *
 * Phaser zooms a camera around its centre, and the camera viewport is the
 * whole S-scaled canvas. Bounds of exactly the logical world make Phaser clamp
 * the scroll so that zoom S shows the world edge to edge, and any extra
 * gameplay zoom (DR-046, at most 1.25) pans inside it and never shows beyond
 * the world (DR-020). Always move the camera with centerOn / pan / follow,
 * which work in logical px. Do not write scrollX / scrollY directly.
 */
export function applyLogicalCamera(
  camera: Phaser.Cameras.Scene2D.Camera,
  s: RenderScale,
  gameZoom = 1,
): void {
  // OVR-013: the world camera draws only the middle 960 x 540 strip of a wider screen.
  camera.setViewport(worldOffset() * s, 0, LOGICAL_W * s, LOGICAL_H * s);
  camera.setBounds(0, 0, LOGICAL_W, LOGICAL_H);
  camera.setZoom(s * gameZoom);
  camera.centerOn(LOGICAL_W / 2, LOGICAL_H / 2);
}

/**
 * A full-screen UI camera (OVR-013). `screen`: logical x runs 0..W (the Hud,
 * whose rects reach the side strips). `centred`: logical x 0..960 is the
 * middle of the screen and the strips are x < 0 and x > 960 (Pause, UiLab).
 */
export function applyScreenCamera(
  camera: Phaser.Cameras.Scene2D.Camera,
  s: RenderScale,
  frame: 'screen' | 'centred',
): void {
  const w = screenSize.w;
  const x0 = frame === 'screen' ? 0 : -worldOffset(w);
  camera.setViewport(0, 0, w * s, LOGICAL_H * s);
  camera.setBounds(x0, 0, w, LOGICAL_H);
  camera.setZoom(s);
  camera.centerOn(x0 + w / 2, LOGICAL_H / 2);
}
