/**
 * Loads the shared atlas and the bitmap fonts named in the manifest
 * (DR-195, DR-081). Paths come from the manifest only. Stage 7's Preload
 * scene will call this once; until then each scene calls it in `preload()`
 * (Phaser skips keys that are already loaded).
 */
import type * as Phaser from 'phaser';
import {
  ATLASES,
  type AtlasId,
  asset,
  FONTS,
  type FontKey,
  fontLayerKey,
  RASTER,
} from '../assets/manifest';

export function loadSharedAssets(scene: Phaser.Scene): void {
  const load = scene.load;
  load.setBaseURL(import.meta.env.BASE_URL);
  for (const [id, a] of Object.entries(ATLASES) as [AtlasId, (typeof ATLASES)[AtlasId]][]) {
    if (!scene.textures.exists(id)) {
      const dir = a.path.slice(0, a.path.lastIndexOf('/') + 1);
      load.multiatlas(id, `${a.path}.json`, dir);
    }
  }
  for (const [key, f] of Object.entries(FONTS) as [FontKey, (typeof FONTS)[FontKey]][]) {
    if (!scene.cache.bitmapFont.exists(key)) load.bitmapFont(key, `${f.path}.png`, `${f.path}.xml`);
    const strokeKey = fontLayerKey(key, 'stroke');
    if (f.stroke > 0 && !scene.cache.bitmapFont.exists(strokeKey)) {
      load.bitmapFont(strokeKey, `${f.path}-stroke.png`, `${f.path}.xml`);
    }
  }
}

/** Texture key and frame name of an asset key. */
export function tex(key: string): [string, string] {
  const e = asset(key);
  return [e.atlas, e.frame];
}

/** An image of an asset key, with its manifest origin, drawn at logical size. */
export function image(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
): Phaser.GameObjects.Image {
  const e = asset(key);
  return scene.add
    .image(x, y, e.atlas, e.frame)
    .setOrigin(e.originX, e.originY)
    .setScale(1 / RASTER);
}

/** Texture keys that are atlas pages (for the resident-page check, DR-014). */
export function atlasTextureKeys(): string[] {
  return Object.keys(ATLASES);
}
