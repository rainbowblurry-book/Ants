/**
 * Render scale S (DR-013). The canvas is 960*S x 540*S and every camera is
 * zoomed by S, so the game world and the UI stay in 960x540 logical px.
 * This module has no Phaser import, so node tests can use it.
 */
import { logical } from '../ui/theme';

export const LOGICAL_W = logical.width;
export const LOGICAL_H = logical.height;

export type RenderScale = 1 | 2;

/** DR-013: S = 2 when the screen has at least this device pixel ratio. */
export const HIDPI_THRESHOLD = 1.5;

/**
 * S is chosen once at boot. Changing it needs a reload (DR-013).
 * Performance mode forces 1.
 */
export function pickRenderScale(devicePixelRatio: number, performanceMode: boolean): RenderScale {
  return devicePixelRatio >= HIDPI_THRESHOLD && !performanceMode ? 2 : 1;
}

/**
 * Dev and test hook: `?s=1` or `?s=2` forces S, so the stage-0 spike can
 * compare both paths on one device. Any other value is ignored.
 */
export function parseScaleOverride(search: string): RenderScale | null {
  const value = new URLSearchParams(search).get('s');
  if (value === '1') return 1;
  if (value === '2') return 2;
  return null;
}
