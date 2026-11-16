/**
 * Stage 0 spike (HANDOFF §3, DR-013): prove the S=2 render path.
 *
 * It draws the things the real game will draw, the way the real game will
 * draw them:
 *   - terrain as 12 chunk canvases at 1 px per logical px (DR-024)
 *   - art rasterised at 2x and shown at half scale (DR-088)
 *   - a vector Graphics shape with an ink outline
 *   - nine-slice jelly buttons from 2x white silhouettes, tinted (DR-088)
 *   - Lilita One bitmap text from 2x bakes, with a stroke layer (DR-081)
 *   - Nunito runtime Text at resolution S (DR-081)
 *   - a world camera that zooms and pans (DR-046) under a fixed HUD scene
 *
 * This file is throwaway. It is replaced by the real scenes from stage 4 on.
 * Fonts are baked in the browser here; stage 4 bakes them at build time.
 */
import * as Phaser from 'phaser';
import { applyLogicalCamera, REG_RENDER_SCALE } from '../boot/config';
import { LOGICAL_H, LOGICAL_W, type RenderScale } from '../boot/renderScale';
import { color, cssColor, font } from '../ui/theme';

const KEY_WORLD = 'spike';
const KEY_HUD = 'spike-hud';

/** DR-024: 4x3 chunks of 240x180. */
const CHUNK_W = 240;
const CHUNK_H = 180;
const CHUNK_COLS = 4;
const CHUNK_ROWS = 3;

/** Below this line the spike terrain is solid soil, so seams would show. */
const SOLID_Y = 352;

/** Follow zoom from DR-046 (PLAN §3: "at zoom 1.2"). */
const FOLLOW_ZOOM = 1.2;

/** Nine-slice source: radius 24, outline 4, shade band 8 (DR-083), drawn at 2x. */
const SLICE_R = 24;
const SLICE_OUTLINE = 4;
const SLICE_BAND = 8;
const SLICE_SIZE = SLICE_R * 2 + 8;
const RASTER = 2;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpikeProbe {
  renderScale: number;
  canvas: { w: number; h: number };
  /** Pixels in the solid soil zone that are not soil. Any is a seam. */
  worldSeamPixels: number;
  worldSeamChecked: number;
  /** Pixels inside the butter panel strips that are not butter. */
  uiSeamPixels: number;
  uiSeamChecked: number;
  /** Bounding box of the primary button face, in logical px. */
  buttonFace: Rect | null;
  buttonFaceExpected: Rect;
  /** Bounding box of the blue badge fill, in logical px. */
  badge: Rect | null;
  badgeExpected: Rect;
}

export interface SpikeHook {
  taps: number;
  freeze(cx: number, cy: number, gameZoom: number): void;
  resume(): void;
  probe(): Promise<SpikeProbe>;
  resetFrameStats(): void;
  frameStats(): {
    frames: number;
    medianMs: number;
    p95Ms: number;
    medianJsMs: number;
    p95JsMs: number;
  };
}

declare global {
  interface Window {
    __spike?: SpikeHook;
  }
}

function renderScaleOf(scene: Phaser.Scene): RenderScale {
  return scene.registry.get(REG_RENDER_SCALE) as RenderScale;
}

/** Render-only terrain shape. The real terrain comes from the sim grid. */
function surfaceY(x: number): number {
  return 290 + 26 * Math.sin(x / 97) + 14 * Math.sin(x / 41 + 1.3);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[i] ?? 0;
}

// ---------------------------------------------------------------- textures

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return ctx;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** Terrain chunks: one global path drawn into each 240x180 canvas. */
function makeTerrainChunks(scene: Phaser.Scene): void {
  for (let row = 0; row < CHUNK_ROWS; row++) {
    for (let col = 0; col < CHUNK_COLS; col++) {
      const canvas = makeCanvas(CHUNK_W, CHUNK_H);
      const ctx = context2d(canvas);
      ctx.translate(-col * CHUNK_W, -row * CHUNK_H);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const trace = (dy: number) => {
        ctx.beginPath();
        for (let x = -12; x <= LOGICAL_W + 12; x += 4) {
          const y = surfaceY(x) + dy;
          if (x === -12) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };

      trace(0);
      ctx.lineTo(LOGICAL_W + 12, LOGICAL_H + 12);
      ctx.lineTo(-12, LOGICAL_H + 12);
      ctx.closePath();
      ctx.fillStyle = cssColor.acorn;
      ctx.fill();

      trace(7);
      ctx.strokeStyle = cssColor['acorn-shade'];
      ctx.lineWidth = 10;
      ctx.stroke();

      trace(0);
      ctx.strokeStyle = cssColor.ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      scene.textures.addCanvas(`spike-chunk-${col}-${row}`, canvas);
    }
  }
}

/** A prop drawn at 2x, the way build-time art will be rasterised. */
function makePebble(scene: Phaser.Scene): void {
  const w = 80;
  const h = 60;
  const canvas = makeCanvas(w * RASTER, h * RASTER);
  const ctx = context2d(canvas);
  ctx.scale(RASTER, RASTER);
  const body = () => {
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
  };
  body();
  ctx.fillStyle = cssColor.disabled;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  ctx.fillStyle = cssColor['disabled-shade'];
  ctx.fillRect(0, h - 22, w, 22);
  ctx.restore();
  body();
  ctx.strokeStyle = cssColor.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  scene.textures.addCanvas('spike-pebble', canvas);
}

/** Team B badge: a rounded triangle with a white ring and an ink keyline (DR-003). */
function makeTriangleBadge(scene: Phaser.Scene): void {
  const size = 56;
  const canvas = makeCanvas(size * RASTER, size * RASTER);
  const ctx = context2d(canvas);
  ctx.scale(RASTER, RASTER);
  ctx.lineJoin = 'round';
  const tri = () => {
    ctx.beginPath();
    ctx.moveTo(size / 2, 14);
    ctx.lineTo(size - 12, size - 14);
    ctx.lineTo(12, size - 14);
    ctx.closePath();
  };
  tri();
  ctx.strokeStyle = cssColor.ink;
  ctx.lineWidth = 20;
  ctx.stroke();
  tri();
  ctx.strokeStyle = cssColor['meaning-white'];
  ctx.lineWidth = 16;
  ctx.stroke();
  tri();
  ctx.strokeStyle = cssColor['team-b'];
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = cssColor['team-b'];
  ctx.fill();
  scene.textures.addCanvas('spike-badge-b', canvas);
}

/** Three white silhouette layers per radius: outline, fill, band (DR-088). */
function makeSliceLayers(scene: Phaser.Scene): void {
  const px = SLICE_SIZE * RASTER;
  const inner = SLICE_SIZE - SLICE_OUTLINE * 2;
  const layer = (name: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = makeCanvas(px, px);
    const ctx = context2d(canvas);
    ctx.scale(RASTER, RASTER);
    ctx.fillStyle = cssColor['meaning-white'];
    draw(ctx);
    scene.textures.addCanvas(`spike-slice-${name}`, canvas);
  };
  const innerPath = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.roundRect(SLICE_OUTLINE, SLICE_OUTLINE, inner, inner, SLICE_R - SLICE_OUTLINE);
  };
  layer('outline', (ctx) => {
    ctx.beginPath();
    ctx.roundRect(0, 0, SLICE_SIZE, SLICE_SIZE, SLICE_R);
    ctx.fill();
  });
  layer('fill', (ctx) => {
    innerPath(ctx);
    ctx.fill();
  });
  layer('band', (ctx) => {
    innerPath(ctx);
    ctx.clip();
    ctx.fillRect(0, SLICE_SIZE - SLICE_OUTLINE - SLICE_BAND, SLICE_SIZE, SLICE_BAND);
  });
}

/**
 * Bake a bitmap font in the browser. `px` is the bake size, which is 2x the
 * logical size of the role that uses it (DR-081). With `strokeLogical`, a
 * second texture with the same metrics holds the stroke layer.
 */
function bakeFont(
  scene: Phaser.Scene,
  key: string,
  px: number,
  chars: string,
  strokeLogical = 0,
): void {
  const fontCss = `${px}px "${font.display}"`;
  const measure = context2d(makeCanvas(8, 8));
  measure.font = fontCss;
  const fm = measure.measureText('Hg');
  const ascent = Math.ceil(fm.fontBoundingBoxAscent);
  const descent = Math.ceil(fm.fontBoundingBoxDescent);
  const strokePx = strokeLogical * RASTER;
  const pad = Math.ceil(strokePx) + 2;
  const sheetW = 1024;

  interface Glyph {
    code: number;
    ch: string;
    x: number;
    y: number;
    w: number;
    h: number;
    left: number;
    up: number;
    advance: number;
  }
  const glyphs: Glyph[] = [];
  let penX = 0;
  let penY = 0;
  let rowH = 0;
  for (const ch of new Set(chars)) {
    const m = measure.measureText(ch);
    const left = Math.max(0, Math.ceil(m.actualBoundingBoxLeft));
    const right = Math.max(0, Math.ceil(m.actualBoundingBoxRight));
    const up = Math.max(0, Math.ceil(m.actualBoundingBoxAscent));
    const down = Math.max(0, Math.ceil(m.actualBoundingBoxDescent));
    const blank = ch.trim() === '';
    const w = blank ? 0 : left + right + pad * 2;
    const h = blank ? 0 : up + down + pad * 2;
    if (penX + w > sheetW) {
      penX = 0;
      penY += rowH + 2;
      rowH = 0;
    }
    glyphs.push({
      code: ch.codePointAt(0) ?? 0,
      ch,
      x: penX,
      y: penY,
      w,
      h,
      left,
      up,
      advance: Math.round(m.width),
    });
    penX += w + 2;
    rowH = Math.max(rowH, h);
  }
  const sheetH = penY + rowH + 2;

  const paint = (textureKey: string, withStroke: boolean) => {
    const canvas = makeCanvas(sheetW, sheetH);
    const ctx = context2d(canvas);
    ctx.font = fontCss;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = cssColor['meaning-white'];
    ctx.strokeStyle = cssColor['meaning-white'];
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokePx * 2;
    for (const g of glyphs) {
      if (g.w === 0) continue;
      const ox = g.x + pad + g.left;
      const oy = g.y + pad + g.up;
      if (withStroke) ctx.strokeText(g.ch, ox, oy);
      ctx.fillText(g.ch, ox, oy);
    }
    scene.textures.addCanvas(textureKey, canvas);

    const charNodes = glyphs
      .map(
        (g) =>
          `<char id="${g.code}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" ` +
          `xoffset="${-g.left - pad}" yoffset="${ascent - g.up - pad}" xadvance="${g.advance}"/>`,
      )
      .join('');
    const xml = new DOMParser().parseFromString(
      `<font><info face="${textureKey}" size="${px}"/>` +
        `<common lineHeight="${ascent + descent}" base="${ascent}"/>` +
        `<chars count="${glyphs.length}">${charNodes}</chars></font>`,
      'application/xml',
    );
    const frame = scene.textures.getFrame(textureKey);
    const data = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont(xml, frame);
    scene.cache.bitmapFont.add(textureKey, { data, texture: textureKey, frame: null });
  };

  paint(key, false);
  if (strokeLogical > 0) paint(`${key}-stroke`, true);
}

const ASCII = Array.from({ length: 95 }, (_v, i) => String.fromCharCode(32 + i)).join('');

// ------------------------------------------------------------------- world

export class SpikeWorld extends Phaser.Scene {
  private s: RenderScale = 1;
  private frozen = false;

  constructor() {
    super(KEY_WORLD);
  }

  create(): void {
    this.s = renderScaleOf(this);
    const cam = this.cameras.main;
    cam.setBackgroundColor(cssColor.panel);
    applyLogicalCamera(cam, this.s, FOLLOW_ZOOM);

    makeTerrainChunks(this);
    makePebble(this);
    makeTriangleBadge(this);

    for (let row = 0; row < CHUNK_ROWS; row++) {
      for (let col = 0; col < CHUNK_COLS; col++) {
        this.add.image(col * CHUNK_W, row * CHUNK_H, `spike-chunk-${col}-${row}`).setOrigin(0, 0);
      }
    }

    // 2x raster art at half scale.
    this.add
      .image(PEBBLE_X, surfaceY(PEBBLE_X) - 22, 'spike-pebble')
      .setScale(1 / RASTER)
      .setRotation(-0.08);
    this.add.image(700, BADGE_B_Y, 'spike-badge-b').setScale(1 / RASTER);

    // Vector art: the Team A badge as Graphics (ink keyline, white ring, blue fill).
    const g = this.add.graphics();
    g.fillStyle(color.ink, 1);
    g.fillCircle(BADGE_A.x, BADGE_A.y, BADGE_A.r + 6);
    g.fillStyle(color['meaning-white'], 1);
    g.fillCircle(BADGE_A.x, BADGE_A.y, BADGE_A.r + 4);
    g.fillStyle(color['team-a'], 1);
    g.fillCircle(BADGE_A.x, BADGE_A.y, BADGE_A.r);

    this.scene.launch(KEY_HUD);
  }

  update(time: number): void {
    if (this.frozen) return;
    // Slow pan across the whole world at the follow zoom.
    this.cameras.main.centerOn(
      LOGICAL_W / 2 + 80 * Math.sin(time / 1700),
      LOGICAL_H / 2 + 45 * Math.sin(time / 2300),
    );
  }

  freeze(cx: number, cy: number, gameZoom: number): void {
    this.frozen = true;
    this.cameras.main.setZoom(this.s * gameZoom);
    this.cameras.main.centerOn(cx, cy);
  }

  resume(): void {
    this.frozen = false;
    this.cameras.main.setZoom(this.s * FOLLOW_ZOOM);
  }

  /** Canvas px rect of a world rect, for the current camera. */
  projectRect(r: Rect): Rect {
    const cam = this.cameras.main;
    const px = (wx: number) => (wx - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
    const py = (wy: number) => (wy - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
    return { x: px(r.x), y: py(r.y), w: r.w * cam.zoom, h: r.h * cam.zoom };
  }
}

const BADGE_A = { x: 620, y: 200, r: 16 };
const BADGE_B_Y = 200;
const PEBBLE_X = 500;

// --------------------------------------------------------------------- HUD

const PLAY_RECT: Rect = { x: 608, y: 252, w: 320, h: 72 };
const PANEL_RECT: Rect = { x: 16, y: 180, w: 392, h: 112 };
const WIND_RECT: Rect = { x: 300, y: 80, w: 360, h: 48 };
const PAUSE_RECT: Rect = { x: 884, y: 20, w: 56, h: 56 };

export class SpikeHud extends Phaser.Scene {
  private s: RenderScale = 1;
  private taps = 0;
  private readout!: Phaser.GameObjects.Text;
  private frameMs: number[] = [];
  private jsMs: number[] = [];
  private stepStart = 0;
  private lastReadout = 0;

  constructor() {
    super(KEY_HUD);
  }

  create(): void {
    this.s = renderScaleOf(this);
    applyLogicalCamera(this.cameras.main, this.s);

    makeSliceLayers(this);
    bakeFont(this, 'F56', 56, ASCII);
    bakeFont(this, 'F80', 80, ASCII);
    bakeFont(this, 'F64', 64, '0123456789%°/:x+-−.∞ ', 4);
    bakeFont(this, 'F128', 128, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.' ", 6);

    // Display text with its stroke layer (DR-081: display 64, stroke 6).
    this.strokedText(24, 92, 'F128', 'ANTS!', 64, color.secondary);
    this.add.bitmapText(24, 28, 'F80', `S=${this.s} spike`, 40).setTint(color.ink);

    // Wind-gauge pill with a stroked numeral (DR-125).
    this.sliceBox(WIND_RECT, color.info, color['info-shade'], 4);
    const numeral = this.strokedText(0, 0, 'F64', '+3', 32, color['meaning-white']);
    for (const t of numeral) {
      t.setOrigin(0.5, 0.5).setPosition(
        WIND_RECT.x + WIND_RECT.w / 2,
        WIND_RECT.y + WIND_RECT.h / 2 - 2,
      );
    }

    // Dot-bubble panel with runtime Nunito text (DR-131, DR-081).
    this.sliceBox(PANEL_RECT, color.panel, null, 6);
    this.add.text(
      PANEL_RECT.x + 16,
      PANEL_RECT.y + 22,
      'Dot says: watch the wind, aim, and spit.',
      {
        fontFamily: `"${font.body}"`,
        fontStyle: '700',
        fontSize: '22px',
        color: cssColor.ink,
        resolution: this.s,
        wordWrap: { width: PANEL_RECT.w - 32 },
      },
    );

    // Primary button (Title "Play" rect, DR-093). It counts taps.
    const face = this.sliceBox(PLAY_RECT, color.action, color['action-shade'], 6);
    this.add
      .bitmapText(
        PLAY_RECT.x + PLAY_RECT.w / 2,
        PLAY_RECT.y + PLAY_RECT.h / 2 - 4,
        'F56',
        'Play',
        28,
      )
      .setOrigin(0.5, 0.5)
      .setTint(color.ink);
    face.setInteractive();
    face.on('pointerdown', () => {
      this.taps += 1;
    });

    // Info button on a half logical px at S=2 (DR-085 snap rule).
    const snap = this.s === 2 ? 0.5 : 0;
    const info: Rect = { x: 608 + snap, y: 336 + snap, w: 320, h: 72 };
    this.sliceBox(info, color.info, color['info-shade'], 6);
    this.add
      .bitmapText(info.x + info.w / 2, info.y + info.h / 2 - 4, 'F56', '2 Players', 28)
      .setOrigin(0.5, 0.5)
      .setTint(color.ink);

    // Icon button: visual 56 inside a 64 hit (DR-082), shadow 4.
    this.sliceBox(PAUSE_RECT, color.secondary, color['secondary-shade'], 4);
    const bars = this.add.graphics();
    bars.fillStyle(color.ink, 1);
    bars.fillRoundedRect(PAUSE_RECT.x + 17, PAUSE_RECT.y + 14, 8, 24, 4);
    bars.fillRoundedRect(PAUSE_RECT.x + 31, PAUSE_RECT.y + 14, 8, 24, 4);

    // Caption readout (DR-081: 18 is the floor).
    this.readout = this.add.text(16, 506, '', {
      fontFamily: `"${font.body}"`,
      fontStyle: '800',
      fontSize: '18px',
      color: cssColor.ink,
      resolution: this.s,
    });

    this.game.events.on(Phaser.Core.Events.PRE_STEP, this.onPreStep, this);
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.onPostRender, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.PRE_STEP, this.onPreStep, this);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.onPostRender, this);
    });

    this.installHook();
    this.game.events.emit('spike-ready');
  }

  /** Shadow, outline, fill and band nine-slices. Returns the fill layer. */
  private sliceBox(
    r: Rect,
    fill: number,
    shade: number | null,
    shadowY: number,
  ): Phaser.GameObjects.NineSlice {
    const corner = SLICE_R * RASTER;
    const layer = (name: string, tint: number, dy: number) =>
      this.add
        .nineslice(
          r.x,
          r.y + dy,
          `spike-slice-${name}`,
          undefined,
          r.w * RASTER,
          r.h * RASTER,
          corner,
          corner,
          corner,
          corner,
        )
        .setOrigin(0, 0)
        .setScale(1 / RASTER)
        .setTint(tint);
    layer('outline', color.ink, shadowY);
    layer('outline', color.ink, 0);
    const face = layer('fill', fill, 0);
    if (shade !== null) layer('band', shade, 0);
    return face;
  }

  /** Stroke layer under the fill layer, same metrics (DR-081). */
  private strokedText(
    x: number,
    y: number,
    fontKey: string,
    text: string,
    size: number,
    fill: number,
  ): Phaser.GameObjects.BitmapText[] {
    return [
      this.add.bitmapText(x, y, `${fontKey}-stroke`, text, size).setTint(color.ink),
      this.add.bitmapText(x, y, fontKey, text, size).setTint(fill),
    ];
  }

  private onPreStep(): void {
    this.stepStart = performance.now();
  }

  private onPostRender(): void {
    if (this.stepStart === 0) return;
    this.jsMs.push(performance.now() - this.stepStart);
    this.frameMs.push(this.game.loop.rawDelta);
    if (this.frameMs.length > 3600) {
      this.frameMs.shift();
      this.jsMs.shift();
    }
  }

  update(time: number): void {
    if (time - this.lastReadout < 500) return;
    this.lastReadout = time;
    const stats = this.frameStats();
    const canvas = this.game.canvas;
    this.readout.setText(
      `S=${this.s} · DPR ${window.devicePixelRatio} · canvas ${canvas.width}x${canvas.height} · ` +
        `${stats.medianMs.toFixed(1)} ms · taps ${this.taps}`,
    );
  }

  private frameStats(): ReturnType<SpikeHook['frameStats']> {
    const frame = [...this.frameMs].sort((a, b) => a - b);
    const js = [...this.jsMs].sort((a, b) => a - b);
    return {
      frames: frame.length,
      medianMs: percentile(frame, 0.5),
      p95Ms: percentile(frame, 0.95),
      medianJsMs: percentile(js, 0.5),
      p95JsMs: percentile(js, 0.95),
    };
  }

  private installHook(): void {
    const world = this.scene.get(KEY_WORLD) as SpikeWorld;
    const hud = this;
    window.__spike = {
      get taps() {
        return hud.taps;
      },
      freeze: (cx, cy, gameZoom) => world.freeze(cx, cy, gameZoom),
      resume: () => world.resume(),
      probe: () => this.probe(world),
      resetFrameStats: () => {
        this.frameMs.length = 0;
        this.jsMs.length = 0;
      },
      frameStats: () => this.frameStats(),
    };
  }

  /** The next rendered frame as RGBA pixels. */
  private async readFrame(): Promise<{ px: Uint8ClampedArray; w: number; h: number }> {
    const image = await new Promise<HTMLImageElement>((resolve) => {
      this.game.renderer.snapshot((snap) => resolve(snap as HTMLImageElement));
    });
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const ctx = context2d(makeCanvas(w, h));
    ctx.drawImage(image, 0, 0);
    return { px: ctx.getImageData(0, 0, w, h).data, w, h };
  }

  /** Read the rendered frame back and measure seams and alignment. */
  private async probe(world: SpikeWorld): Promise<SpikeProbe> {
    // The HUD covers part of the soil, so the world is read without it first.
    this.cameras.main.setVisible(false);
    const worldFrame = await this.readFrame();
    this.cameras.main.setVisible(true);
    const fullFrame = await this.readFrame();
    const { w, h } = fullFrame;
    let px = worldFrame.px;
    const s = this.s;

    const near = (i: number, rgb: number, tol: number) =>
      Math.abs((px[i] ?? 0) - ((rgb >> 16) & 255)) <= tol &&
      Math.abs((px[i + 1] ?? 0) - ((rgb >> 8) & 255)) <= tol &&
      Math.abs((px[i + 2] ?? 0) - (rgb & 255)) <= tol;

    /** Count pixels in a canvas-px rect that do not match `rgb`. */
    const mismatches = (r: Rect, rgb: number) => {
      const x0 = Math.max(0, Math.ceil(r.x));
      const y0 = Math.max(0, Math.ceil(r.y));
      const x1 = Math.min(w, Math.floor(r.x + r.w));
      const y1 = Math.min(h, Math.floor(r.y + r.h));
      let bad = 0;
      let checked = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          checked++;
          if (!near((y * w + x) * 4, rgb, 3)) bad++;
        }
      }
      return { bad, checked };
    };

    /** Bounding box, in logical px, of the pixels matching `rgb` inside a canvas-px rect. */
    const bbox = (within: Rect, rgb: number): Rect | null => {
      const x0 = Math.max(0, Math.floor(within.x));
      const y0 = Math.max(0, Math.floor(within.y));
      const x1 = Math.min(w, Math.ceil(within.x + within.w));
      const y1 = Math.min(h, Math.ceil(within.y + within.h));
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!near((y * w + x) * 4, rgb, 3)) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return null;
      return { x: minX / s, y: minY / s, w: (maxX - minX + 1) / s, h: (maxY - minY + 1) / s };
    };

    // World seams: the solid soil zone, clear of the terrain surface.
    const solid = world.projectRect({ x: 0, y: SOLID_Y, w: LOGICAL_W, h: LOGICAL_H - SOLID_Y });
    const worldSeam = mismatches(
      { x: solid.x + 2, y: solid.y + 2, w: solid.w - 4, h: solid.h - 4 },
      color.acorn,
    );

    const worldZoom = world.cameras.main.zoom;
    const badgeWorld: Rect = {
      x: BADGE_A.x - BADGE_A.r,
      y: BADGE_A.y - BADGE_A.r,
      w: BADGE_A.r * 2,
      h: BADGE_A.r * 2,
    };
    const badgeCanvas = world.projectRect(badgeWorld);
    const badgeFound = bbox(
      {
        x: badgeCanvas.x - 16,
        y: badgeCanvas.y - 16,
        w: badgeCanvas.w + 32,
        h: badgeCanvas.h + 32,
      },
      color['team-a'],
    );

    // Everything below reads the frame with the HUD on.
    px = fullFrame.px;

    // UI seams: strips of the butter panel that cross every slice edge.
    const strips: Rect[] = [
      { x: PANEL_RECT.x + 8, y: PANEL_RECT.y + 8, w: PANEL_RECT.w - 16, h: 8 },
      { x: PANEL_RECT.x + 8, y: PANEL_RECT.y + PANEL_RECT.h - 16, w: PANEL_RECT.w - 16, h: 8 },
    ];
    let uiBad = 0;
    let uiChecked = 0;
    for (const strip of strips) {
      // Keep clear of the rounded corners.
      const r = { x: (strip.x + 16) * s, y: strip.y * s, w: (strip.w - 32) * s, h: strip.h * s };
      const m = mismatches(r, color.panel);
      uiBad += m.bad;
      uiChecked += m.checked;
    }

    const pad = 12;
    const grow = (r: Rect): Rect => ({
      x: (r.x - pad) * s,
      y: (r.y - pad) * s,
      w: (r.w + pad * 2) * s,
      h: (r.h + pad * 2) * s,
    });
    const face: Rect = {
      x: PLAY_RECT.x + SLICE_OUTLINE,
      y: PLAY_RECT.y + SLICE_OUTLINE,
      w: PLAY_RECT.w - SLICE_OUTLINE * 2,
      h: PLAY_RECT.h - SLICE_OUTLINE * 2 - SLICE_BAND,
    };
    return {
      renderScale: s,
      canvas: { w, h },
      worldSeamPixels: worldSeam.bad,
      worldSeamChecked: worldSeam.checked,
      uiSeamPixels: uiBad,
      uiSeamChecked: uiChecked,
      buttonFace: bbox(grow(PLAY_RECT), color.action),
      buttonFaceExpected: face,
      badge: badgeFound,
      // Reported in logical screen px at the current camera, like `badge`.
      badgeExpected: {
        x: badgeCanvas.x / s,
        y: badgeCanvas.y / s,
        w: (badgeWorld.w * worldZoom) / s,
        h: (badgeWorld.h * worldZoom) / s,
      },
    };
  }
}
