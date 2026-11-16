import * as Phaser from 'phaser';
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
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: LOGICAL_W * s,
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
  camera.setBounds(0, 0, LOGICAL_W, LOGICAL_H);
  camera.setZoom(s * gameZoom);
  camera.centerOn(LOGICAL_W / 2, LOGICAL_H / 2);
}
