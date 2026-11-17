/**
 * Jelly components (UI.md §2, DR-003, DR-082, DR-083, DR-084, DR-086).
 *
 *   JellyBox   shadow + outline + fill + band nine-slices from the atlas
 *   Panel      a JellyBox in `panel` with no band
 *   Button     md 64 / lg 72 / xl 96; primary, secondary, info, destructive, disabled
 *   IconButton visual 56 in a 64 hit, `secondary`, 32 icon
 *   FocusRing  4 px white, 2 px gap, 2 px ink, following the radius
 *
 * Menu buttons act on pointer-up inside the rect; moving more than 16 px out
 * cancels (DR-082). Keyboard: Enter or Space press on keydown, act on keyup
 * (FocusManager). Input never waits for an animation (DR-084).
 */
import * as Phaser from 'phaser';
import {
  asset,
  RASTER,
  SLICES,
  type SliceLayer,
  type SliceSet,
  sliceKey,
} from '../assets/manifest';
import type { Focusable, FocusManager } from './focus';
import { motionEase, motionMs, motionPx, reducedMotion } from './motion';
import { BitmapLabel } from './text';
import { type ColorToken, color, tokens } from './theme';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SHAPE = tokens.shape;
const MOTION = tokens.motion;
const TOUCH = tokens.touch;

/** The slice set whose radius matches. */
export function sliceFor(radius: number): SliceSet {
  if (radius >= SLICES.r24.radius) return 'r24';
  if (radius >= SLICES.r16.radius) return 'r16';
  return 'r8';
}

function slice(
  scene: Phaser.Scene,
  set: SliceSet,
  layer: SliceLayer,
  w: number,
  h: number,
  tint: number,
): Phaser.GameObjects.NineSlice {
  const e = asset(sliceKey(set, layer));
  const corner = SLICES[set].radius * RASTER;
  return scene.add
    .nineslice(0, 0, e.atlas, e.frame, w * RASTER, h * RASTER, corner, corner, corner, corner)
    .setOrigin(0, 0)
    .setScale(1 / RASTER)
    .setTint(tint);
}

export interface JellyStyle {
  fill: ColorToken;
  shade: ColorToken | null;
  radius: number;
  shadowY: number;
}

/**
 * A jelly shape. The container sits at the rect's top-left; `face` is centred
 * so the pressed squash scales about the middle.
 */
export class JellyBox extends Phaser.GameObjects.Container {
  readonly face: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.NineSlice;
  private fillLayer: Phaser.GameObjects.NineSlice;
  private bandLayer: Phaser.GameObjects.NineSlice | null;
  private pressTween: Phaser.Tweens.Tween | null = null;
  readonly small: boolean;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    private style: JellyStyle,
  ) {
    super(scene, rect.x, rect.y);
    const set = sliceFor(style.radius);
    const { w, h } = rect;
    this.small = h < 40;
    this.shadow = slice(scene, set, 'outline', w, h, color.ink).setPosition(0, style.shadowY);
    this.face = scene.add.container(w / 2, h / 2);
    const outline = slice(scene, set, 'outline', w, h, color.ink).setPosition(-w / 2, -h / 2);
    this.fillLayer = slice(scene, set, 'fill', w, h, color[style.fill]).setPosition(-w / 2, -h / 2);
    this.bandLayer = style.shade
      ? slice(scene, set, 'band', w, h, color[style.shade]).setPosition(-w / 2, -h / 2)
      : null;
    this.face.add([outline, this.fillLayer, ...(this.bandLayer ? [this.bandLayer] : [])]);
    this.add([this.shadow, this.face]);
    scene.add.existing(this);
  }

  setStyle(fill: ColorToken, shade: ColorToken | null): this {
    this.style = { ...this.style, fill, shade };
    this.fillLayer.setTint(color[fill]);
    if (this.bandLayer) {
      this.bandLayer.setVisible(shade !== null);
      if (shade) this.bandLayer.setTint(color[shade]);
    }
    return this;
  }

  /** DR-083 pressed: face down 4 (2 small), shadow 2, squash 1.03 x 0.95. */
  setPressed(pressed: boolean): this {
    const reduced = reducedMotion();
    const dy = pressed ? (this.small ? SHAPE.pressed.dySmall : SHAPE.pressed.dy) : 0;
    const shadowY = pressed ? SHAPE.pressed.dy + SHAPE.pressed.shadowY : this.style.shadowY;
    const sx = pressed && !reduced ? SHAPE.pressed.scaleX : 1;
    const sy = pressed && !reduced ? SHAPE.pressed.scaleY : 1;
    const m = pressed ? MOTION.press : MOTION.release;
    this.pressTween?.stop();
    this.shadow.setY(Math.min(shadowY, this.style.shadowY));
    this.pressTween = this.scene.tweens.add({
      targets: this.face,
      y: this.rect.h / 2 + dy,
      scaleX: sx,
      scaleY: sy,
      duration: motionMs(m.ms, reduced),
      ease: motionEase(m.ease, reduced),
    });
    return this;
  }

  /** DR-084 deny nudge: ±4 px, 160 ms. */
  deny(): void {
    const px = motionPx(MOTION.deny.px);
    this.scene.tweens.add({
      targets: this.face,
      x: { from: this.rect.w / 2 - px, to: this.rect.w / 2 + px },
      duration: motionMs(MOTION.deny.ms) / 4,
      ease: MOTION.deny.ease,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.face.setX(this.rect.w / 2),
    });
  }
}

export class Panel extends JellyBox {
  constructor(scene: Phaser.Scene, rect: Rect, shadowY: number = tokens.component.panel.shadowY) {
    const p = tokens.component.panel;
    super(scene, rect, { fill: p.fill as ColorToken, shade: null, radius: p.radius, shadowY });
  }
}

// ------------------------------------------------------------- pressable

export interface PressOptions {
  id: string;
  /** The hit rect (logical px). At least 64x64 (DR-082). */
  hit: Rect;
  radius: number;
  focus?: FocusManager | null;
  onActivate: () => void;
  enabled?: () => boolean;
}

/**
 * Pointer and keyboard behaviour shared by Button and IconButton.
 * Pointer-up inside acts; a move of more than 16 px outside cancels.
 */
export abstract class Pressable extends Phaser.GameObjects.Container implements Focusable {
  readonly id: string;
  readonly radius: number;
  readonly hitRect: Rect;
  protected box!: JellyBox;
  private zone: Phaser.GameObjects.Zone;
  private down: Phaser.Input.Pointer | null = null;
  private isEnabled = true;
  activations = 0;

  constructor(
    scene: Phaser.Scene,
    protected readonly opts: PressOptions,
  ) {
    super(scene, 0, 0);
    this.id = opts.id;
    this.radius = opts.radius;
    this.hitRect = opts.hit;
    const h = opts.hit;
    this.zone = scene.add.zone(h.x, h.y, h.w, h.h).setOrigin(0, 0).setInteractive();
    this.zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.zone.on('pointerover', (p: Phaser.Input.Pointer) => this.onHover(p, true));
    this.zone.on('pointerout', (p: Phaser.Input.Pointer) => this.onHover(p, false));
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      this.zone.destroy();
      opts.focus?.unregister(this.id);
    });
    opts.focus?.register(this);
    scene.add.existing(this);
  }

  rect(): Rect {
    return this.box.rect;
  }

  enabled(): boolean {
    return this.isEnabled && (this.opts.enabled?.() ?? true) && this.visible;
  }

  /** A hidden control takes no pointer: its scene-level zone follows the visibility. */
  override setVisible(value: boolean): this {
    super.setVisible(value);
    if (this.zone?.input) this.zone.input.enabled = value;
    return this;
  }

  setEnabled(on: boolean): this {
    this.isEnabled = on;
    this.applyEnabled(on);
    return this;
  }

  protected abstract applyEnabled(on: boolean): void;

  /** Keeps the hit zone just above the visuals, so overlays stack correctly. */
  override setDepth(value: number): this {
    super.setDepth(value);
    this.zone.setDepth(value + 0.5);
    return this;
  }

  private local(p: Phaser.Input.Pointer): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const v = cam.getWorldPoint(p.x, p.y);
    return { x: v.x, y: v.y };
  }

  private onDown(p: Phaser.Input.Pointer): void {
    this.opts.focus?.pointerDown();
    if (!this.enabled()) {
      this.box.deny();
      return;
    }
    this.down = p;
    this.box.setPressed(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.down !== p) return;
    const { x, y } = this.local(p);
    const h = this.hitRect;
    const slop = TOUCH.cancelSlop;
    if (x < h.x - slop || x > h.x + h.w + slop || y < h.y - slop || y > h.y + h.h + slop) {
      this.down = null;
      this.box.setPressed(false);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.down !== p) return;
    this.down = null;
    this.box.setPressed(false);
    const { x, y } = this.local(p);
    const h = this.hitRect;
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h && this.enabled()) this.fire();
  }

  private onHover(p: Phaser.Input.Pointer, over: boolean): void {
    // Hover is desktop only (UI.md §2): mouse pointers, never touch.
    if (p.wasTouch || this.down || reducedMotion() || !this.enabled()) return;
    const m = MOTION.hover;
    this.scene.tweens.add({
      targets: this.box.face,
      scale: over ? m.scale : 1,
      duration: m.ms,
      ease: m.ease,
    });
  }

  private fire(): void {
    this.activations++;
    this.opts.onActivate();
  }

  // Focusable (keyboard)
  press(): void {
    this.box.setPressed(true);
  }

  release(): void {
    this.box.setPressed(false);
  }

  activate(): void {
    this.box.setPressed(false);
    if (this.enabled()) this.fire();
  }
}

export type ButtonVariant = 'primary' | 'secondary' | 'info' | 'destructive' | 'disabled';
export type ButtonSize = keyof typeof tokens.component.button.sizes;

export interface ButtonOptions extends Omit<PressOptions, 'hit' | 'radius'> {
  rect: Rect;
  label: string;
  variant?: ButtonVariant;
}

export class Button extends Pressable {
  readonly label: BitmapLabel;
  private icon: Phaser.GameObjects.Image | null = null;
  private variant: ButtonVariant;

  constructor(scene: Phaser.Scene, o: ButtonOptions) {
    const b = tokens.component.button;
    super(scene, { ...o, hit: o.rect, radius: b.radius });
    this.variant = o.variant ?? 'primary';
    const v = b.variants[this.variant];
    this.box = new JellyBox(scene, o.rect, {
      fill: v.fill as ColorToken,
      shade: v.shade as ColorToken,
      radius: b.radius,
      shadowY: b.shadowY,
    });
    this.add(this.box);
    const face = this.box.face;
    // The label sits above the shade band.
    const labelY = -b.shadeBand / 2;
    this.label = new BitmapLabel(scene, 0, labelY, o.label, 'label', color[v.text as ColorToken]);
    this.label.setTextOrigin(0.5, 0.5);
    let maxW = o.rect.w - 2 * tokens.space['6'];
    if (this.variant === 'destructive') {
      // DR-172: destructive gets a 28 px bin icon beside white text.
      const e = asset('ui.icon.bin');
      this.icon = scene.add
        .image(0, labelY, e.atlas, e.frame)
        .setDisplaySize(28, 28)
        .setTint(color[v.text as ColorToken]);
      maxW -= 28 + tokens.space['2'];
    }
    const fit = this.label.fitTo(o.label, maxW);
    if (this.icon) {
      const textW = this.label.measure(fit.lines.join(' '), fit.size);
      const total = 28 + tokens.space['2'] + textW;
      this.icon.setX(-total / 2 + 14);
      this.label.setX(-total / 2 + 28 + tokens.space['2'] + textW / 2);
      face.add(this.icon);
    }
    face.add(this.label);
    if (this.variant === 'disabled') this.setEnabled(false);
  }

  protected applyEnabled(on: boolean): void {
    const b = tokens.component.button;
    const v =
      b.variants[on ? (this.variant === 'disabled' ? 'primary' : this.variant) : 'disabled'];
    this.box.setStyle(v.fill as ColorToken, v.shade as ColorToken);
    this.label.setTint(color[v.text as ColorToken]);
    this.icon?.setTint(color[v.text as ColorToken]);
  }
}

export interface IconButtonOptions extends Omit<PressOptions, 'hit' | 'radius'> {
  /** The 64x64 hit rect (DR-082); the 56 visual is centred inside. */
  hit: Rect;
  icon: string;
}

export class IconButton extends Pressable {
  readonly glyph: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, o: IconButtonOptions) {
    const c = tokens.component.iconButton;
    const inset = (c.hit - c.visual) / 2;
    const visual = { x: o.hit.x + inset, y: o.hit.y + inset, w: c.visual, h: c.visual };
    super(scene, { ...o, radius: tokens.radius.lg });
    this.box = new JellyBox(scene, visual, {
      fill: c.fill as ColorToken,
      shade: `${c.fill}-shade` as ColorToken,
      radius: tokens.radius.lg,
      shadowY: tokens.shadowY.sm,
    });
    this.add(this.box);
    const e = asset(o.icon);
    this.glyph = scene.add
      .image(0, -SHAPE.shadeBand.base / 2, e.atlas, e.frame)
      .setDisplaySize(c.icon, c.icon)
      .setTint(color.ink);
    this.box.face.add(this.glyph);
  }

  /** The visual rect; the focus ring follows it. */
  override rect(): Rect {
    return this.box.rect;
  }

  protected applyEnabled(on: boolean): void {
    this.box.setStyle(on ? 'secondary' : 'disabled', on ? 'secondary-shade' : 'disabled-shade');
    this.glyph.setTint(on ? color.ink : color['ink-soft']);
  }
}

// ------------------------------------------------------------ focus ring

/** DR-086: 4 px white outside a 2 px gap, then 2 px ink; static, no pulse. */
export class FocusRing extends Phaser.GameObjects.Graphics {
  private unsubscribe: () => void;

  constructor(
    scene: Phaser.Scene,
    private readonly focus: FocusManager,
  ) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(10_000);
    this.unsubscribe = focus.onChange(() => this.redraw());
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.unsubscribe());
    this.redraw();
  }

  redraw(): void {
    this.clear();
    const cur = this.focus.current;
    if (!this.focus.ringVisible || !this.focus.enabled || !cur) return;
    const f = tokens.focus;
    const r = cur.rect();
    const ring = (grow: number, width: number, tint: number) => {
      this.lineStyle(width, tint, 1);
      this.strokeRoundedRect(
        r.x - grow,
        r.y - grow,
        r.w + grow * 2,
        r.h + grow * 2,
        cur.radius + grow,
      );
    };
    ring(f.gap + f.inner.width / 2, f.inner.width, color[f.inner.color as ColorToken]);
    ring(
      f.gap + f.inner.width + f.outer.width / 2,
      f.outer.width,
      color[f.outer.color as ColorToken],
    );
  }
}

/**
 * Routes the DOM keyboard to a FocusManager (menus only; Battle keeps DR-121).
 * Listens on `window` directly: Phaser's key queue is read once per game step,
 * which is too late for `preventDefault` on Tab, and it can hand one event to
 * a listener twice when two keys land in the same frame (seen in stage 4 e2e).
 */
export function bindFocusKeys(scene: Phaser.Scene, focus: FocusManager): void {
  const name = (e: KeyboardEvent) => (e.key === ' ' ? 'Space' : e.key);
  const down = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (focus.keyDown(name(e), e.shiftKey) && (e.key === 'Tab' || e.key === ' '))
      e.preventDefault();
  };
  const up = (e: KeyboardEvent) => focus.keyUp(name(e));
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  scene.input.on('pointerdown', () => focus.pointerDown());
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  });
}
