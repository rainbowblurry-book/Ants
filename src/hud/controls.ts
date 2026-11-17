/**
 * Battle HUD controls (UI.md §2 and §4.5; DR-121 to DR-124, DR-033, J8).
 *
 * Battle controls act on pointer-down (DR-082: FIRE and the steppers), and
 * every pointer is tracked on its own, so two thumbs never conflict (DR-015).
 * Each control owns a Zone over its hit rect; visuals follow the 48-in-64
 * and 56-in-72 rule (DR-082).
 *
 * States shared by the controls:
 *   active   false = visible but inactive (2P gate, other phases), no dimming
 *   dim      0.55 during the retreat (DR-123), 0.4 when over the active ant
 *   stone    the `disabled` look (budget 0, empty ammo)
 */
import * as Phaser from 'phaser';
import { asset, RASTER } from '../assets/manifest';
import { aimVector } from '../input/aim';
import { JellyBox } from '../ui/components';
import type { Rect } from '../ui/layout';
import { motionMs, reducedMotion } from '../ui/motion';
import { BitmapLabel, bodyText } from '../ui/text';
import { type ColorToken, color, cssColor, tokens } from '../ui/theme';

const SHAPE = tokens.shape;

/** Visual size inside a hit rect (DR-082): 48 in 64, 56 in 72. */
export function visualFor(hit: Rect): Rect {
  const v = hit.w >= 72 ? 56 : 48;
  return { x: hit.x + (hit.w - v) / 2, y: hit.y + (hit.h - v) / 2, w: v, h: v };
}

export interface Ctl {
  readonly id: string;
  readonly hit: Rect;
  setLive(on: boolean): this;
  setDim(alpha: number): this;
}

/** Tracks one pointer from pointer-down on a zone until it is released anywhere. */
class PointerTrack {
  id: number | null = null;
  constructor(
    scene: Phaser.Scene,
    zone: Phaser.GameObjects.Zone,
    onDown: (p: Phaser.Input.Pointer) => boolean,
    onUp: (p: Phaser.Input.Pointer) => void,
    onMove?: (p: Phaser.Input.Pointer) => void,
  ) {
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.id !== null) return;
      if (onDown(p)) this.id = p.id;
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.id) return;
      this.id = null;
      onUp(p);
    };
    const move = (p: Phaser.Input.Pointer) => {
      if (p.id === this.id && p.isDown) onMove?.(p);
    };
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    scene.input.on('pointermove', move);
    zone.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointerup', up);
      scene.input.off('pointerupoutside', up);
      scene.input.off('pointermove', move);
    });
  }

  release(): boolean {
    const was = this.id !== null;
    this.id = null;
    return was;
  }
}

/** Logical point of a pointer in a scene whose main camera shows 960x540. */
export function logicalPoint(
  scene: Phaser.Scene,
  p: Phaser.Input.Pointer,
): { x: number; y: number } {
  const v = scene.cameras.main.getWorldPoint(p.x, p.y);
  return { x: v.x, y: v.y };
}

function zoneFor(scene: Phaser.Scene, r: Rect): Phaser.GameObjects.Zone {
  return scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0, 0).setInteractive();
}

// ------------------------------------------------------------ hold button

export interface HoldOptions {
  id: string;
  hit: Rect;
  icon?: string;
  label?: string;
  /** Caption in the top-right corner (Hop and Flip costs, DR-122). */
  corner?: string;
  onDown: () => void;
  onUp?: () => void;
}

/**
 * Steppers, walk, Hop and Flip: act on pointer-down, held until the pointer
 * is released anywhere (DR-082, DR-121, DR-123).
 */
export class HoldButton extends Phaser.GameObjects.Container implements Ctl {
  readonly id: string;
  readonly hit: Rect;
  readonly box: JellyBox;
  private glyph: Phaser.GameObjects.Image | null = null;
  private text: BitmapLabel | null = null;
  private track: PointerTrack;
  private live = true;
  /** When set, asked at press time, so a press in the frame a turn opens is not lost. */
  liveCheck: (() => boolean) | null = null;

  isLive(): boolean {
    return this.liveCheck ? this.liveCheck() : this.live;
  }
  private stone = false;
  held = false;

  constructor(
    scene: Phaser.Scene,
    private readonly o: HoldOptions,
  ) {
    super(scene, 0, 0);
    this.id = o.id;
    this.hit = o.hit;
    const v = visualFor(o.hit);
    this.box = new JellyBox(scene, v, {
      fill: 'secondary',
      shade: 'secondary-shade',
      radius: v.w >= 56 ? tokens.radius.lg : tokens.radius.md,
      shadowY: tokens.shadowY.sm,
    });
    this.add(this.box);
    const bandUp = -SHAPE.shadeBand.small / 2;
    if (o.icon) {
      const e = asset(o.icon);
      this.glyph = scene.add.image(0, bandUp, e.atlas, e.frame).setDisplaySize(32, 32);
      this.glyph.setTint(color.ink);
      this.box.face.add(this.glyph);
    }
    if (o.label) {
      // With a cost in the corner the label sits lower and may shrink (DR-087).
      this.text = new BitmapLabel(
        scene,
        0,
        bandUp + (o.corner ? 6 : 0),
        o.label,
        'label',
        color.ink,
      );
      this.text.setTextOrigin(0.5, 0.5);
      this.text.fitTo(o.label, v.w - 12);
      this.box.face.add(this.text);
    }
    if (o.corner) {
      const c = bodyText(scene, v.w / 2 - 6, -v.h / 2 + 2, o.corner, 'caption', cssColor.ink);
      c.setOrigin(1, 0).setFontSize(tokens.type.caption.size);
      this.box.face.add(c);
    }
    const zone = zoneFor(scene, o.hit);
    this.add(zone);
    this.track = new PointerTrack(
      scene,
      zone,
      () => {
        if (!this.isLive() || this.stone) {
          this.box.deny();
          return false;
        }
        this.press();
        return true;
      },
      () => this.lift(),
    );
    scene.add.existing(this);
  }

  /** Keyboard and pointer share these. */
  press(): void {
    if (this.held) return;
    this.held = true;
    this.box.setPressed(true);
    this.o.onDown();
  }

  lift(): void {
    if (!this.held) return;
    this.held = false;
    this.box.setPressed(false);
    this.o.onUp?.();
  }

  setLive(on: boolean): this {
    if (on === this.live) return this;
    this.live = on;
    if (!on) {
      this.track.release();
      this.lift();
    }
    return this;
  }

  setStone(on: boolean): this {
    if (on === this.stone) return this;
    this.stone = on;
    this.box.setStyle(on ? 'disabled' : 'secondary', on ? 'disabled-shade' : 'secondary-shade');
    this.glyph?.setTint(on ? color['ink-soft'] : color.ink);
    this.text?.setTint(on ? color['ink-soft'] : color.ink);
    if (on) {
      this.track.release();
      this.lift();
    }
    return this;
  }

  setDim(alpha: number): this {
    this.setAlpha(alpha);
    return this;
  }
}

// ------------------------------------------------------------------ FIRE

export type FireState = 'ready' | 'queued' | 'disabled';

/**
 * FIRE (DR-122, J29): hit 120, visual 104, `action` with a shade band and an
 * ink label. Ready: the butter ring pulses over 1.6 s. Pressed: down 4, fires
 * at once. Queued: the ring sweeps in 200 ms. Rejected: 3 × 6 px shake in
 * 120 ms. Disabled: stone, ring off.
 */
export class FireButton extends Phaser.GameObjects.Container implements Ctl {
  readonly id = 'fire';
  readonly hit: Rect;
  private g: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Container;
  private label: BitmapLabel;
  private fstate: FireState = 'disabled';
  private live = true;
  /** When set, asked at press time, so a press in the frame a turn opens is not lost. */
  liveCheck: (() => boolean) | null = null;

  isLive(): boolean {
    return this.liveCheck ? this.liveCheck() : this.live;
  }
  private pulse: Phaser.Tweens.Tween | null = null;
  private sweepT0 = 0;
  private pressed = false;

  constructor(
    scene: Phaser.Scene,
    hit: Rect,
    visual: Rect,
    text: string,
    private readonly onFire: () => void,
  ) {
    super(scene, visual.x + visual.w / 2, visual.y + visual.h / 2);
    this.hit = hit;
    const r = visual.w / 2;
    const shadow = scene.add.graphics();
    shadow.fillStyle(color.ink, 1).fillCircle(0, tokens.shadowY.md, r);
    this.ring = scene.add.graphics();
    this.face = scene.add.container(0, 0);
    this.g = scene.add.graphics();
    this.label = new BitmapLabel(scene, 0, -SHAPE.shadeBand.base / 2, text, 'label', color.ink);
    this.label.setTextOrigin(0.5, 0.5);
    this.label.fitTo(text, visual.w - 24);
    this.face.add([this.g, this.label]);
    this.add([this.ring, shadow, this.face]);
    this.draw();
    const zone = zoneFor(scene, hit);
    zone.on('pointerdown', () => {
      if (!this.isLive()) {
        this.reject();
        return;
      }
      this.setPressed(true);
      this.onFire();
    });
    const up = () => this.setPressed(false);
    scene.input.on('pointerup', up);
    zone.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.off('pointerup', up));
    scene.add.existing(this);
    scene.add.existing(zone);
    this.once(Phaser.GameObjects.Events.DESTROY, () => zone.destroy());
  }

  private draw(): void {
    const r = this.hit.w === 120 ? 52 : this.hit.w / 2 - 8;
    const stone = this.fstate === 'disabled';
    const fill: ColorToken = stone ? 'disabled' : 'action';
    const shade: ColorToken = stone ? 'disabled-shade' : 'action-shade';
    const o = tokens.outline.base;
    this.g.clear();
    this.g.fillStyle(color.ink, 1).fillCircle(0, 0, r);
    this.g.fillStyle(color[shade], 1).fillCircle(0, 0, r - o);
    // The flat fill covers all but an 8 px band along the bottom (DR-083).
    this.g
      .fillStyle(color[fill], 1)
      .fillEllipse(0, -SHAPE.shadeBand.base / 2, (r - o) * 2, (r - o) * 2 - SHAPE.shadeBand.base);
    this.label.setTint(stone ? color['ink-soft'] : color.ink);
  }

  private drawRing(sweep: number): void {
    const r = 52 + 8;
    this.ring.clear();
    if (this.fstate === 'disabled') return;
    this.ring.lineStyle(6, color.ink, 1);
    this.ring.beginPath();
    this.ring.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sweep, false);
    this.ring.strokePath();
    this.ring.lineStyle(4, color.secondary, 1);
    this.ring.beginPath();
    this.ring.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sweep, false);
    this.ring.strokePath();
  }

  setFireState(s: FireState, now: number): void {
    if (s === this.fstate) {
      if (s === 'queued') this.drawRing(Math.min(1, (now - this.sweepT0) / 200));
      return;
    }
    this.fstate = s;
    this.draw();
    this.pulse?.stop();
    this.pulse = null;
    this.ring.setScale(1).setAlpha(1);
    if (s === 'ready') {
      this.drawRing(1);
      if (!reducedMotion()) {
        this.pulse = this.scene.tweens.add({
          targets: this.ring,
          scale: 1.06,
          alpha: 0.6,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (s === 'queued') {
      this.sweepT0 = now;
      this.drawRing(0);
    } else {
      this.drawRing(0);
    }
  }

  get fireState(): FireState {
    return this.fstate;
  }

  setPressed(on: boolean): void {
    if (on === this.pressed) return;
    this.pressed = on;
    this.face.setY(on ? SHAPE.pressed.dy : 0);
  }

  /** DR-122 rejected: 3 × 6 px shake in 120 ms (none with reduced motion). */
  reject(): void {
    if (reducedMotion()) return;
    this.scene.tweens.add({
      targets: this.face,
      x: { from: -6, to: 6 },
      duration: 20,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.face.setX(0),
    });
  }

  setLive(on: boolean): this {
    this.live = on;
    return this;
  }

  setDim(alpha: number): this {
    this.setAlpha(alpha);
    return this;
  }
}

// ------------------------------------------------------------------- dial

/**
 * The angle dial (DR-121): a full-circle needle with the two allowed arcs
 * (−20°..+90° on each side). The centre shows "52°" and a ◀/▶ facing glyph.
 * Dragging sets the angle (1° snap); dragging into the other half flips facing.
 */
export class Dial extends Phaser.GameObjects.Container implements Ctl {
  readonly id = 'dial';
  readonly hit: Rect;
  private g: Phaser.GameObjects.Graphics;
  private num: BitmapLabel;
  private facingIcon: Phaser.GameObjects.Image;
  private live = true;
  /** When set, asked at press time, so a press in the frame a turn opens is not lost. */
  liveCheck: (() => boolean) | null = null;

  isLive(): boolean {
    return this.liveCheck ? this.liveCheck() : this.live;
  }
  private shown = { angle: Number.NaN, facing: 0 };

  constructor(
    scene: Phaser.Scene,
    hit: Rect,
    private readonly onDrag: (px: number, py: number, start: boolean) => void,
    onWheel: (dir: 1 | -1) => void,
  ) {
    super(scene, hit.x + hit.w / 2, hit.y + hit.h / 2);
    this.hit = hit;
    const R = hit.w / 2;
    const shadow = scene.add.graphics();
    shadow.fillStyle(color.ink, 1).fillCircle(0, tokens.shadowY.sm, R - 2);
    const base = scene.add.graphics();
    base.fillStyle(color.ink, 1).fillCircle(0, 0, R - 2);
    base.fillStyle(color.panel, 1).fillCircle(0, 0, R - 2 - tokens.outline.base);
    // The allowed arcs, both sides (−20°..+90° from the horizontal).
    const arcR = R - 14;
    base.lineStyle(10, color.secondary, 1);
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    base.beginPath();
    base.arc(0, 0, arcR, toRad(-90), toRad(20), false);
    base.strokePath();
    base.beginPath();
    base.arc(0, 0, arcR, toRad(160), toRad(270), false);
    base.strokePath();
    this.g = scene.add.graphics();
    this.num = new BitmapLabel(scene, 0, 22, '45°', 'numeral', color.ink);
    this.num.setTextOrigin(0.5, 0.5);
    const e = asset('ui.icon.chevron-r');
    this.facingIcon = scene.add
      .image(0, 46, e.atlas, e.frame)
      .setDisplaySize(24, 24)
      .setTint(color.ink);
    this.add([shadow, base, this.g, this.num, this.facingIcon]);
    const zone = zoneFor(scene, hit);
    zone.on('wheel', (_p: unknown, _dx: number, dy: number) => {
      if (this.isLive()) onWheel(dy < 0 ? 1 : -1);
    });
    new PointerTrack(
      scene,
      zone,
      (p) => {
        if (!this.isLive()) return false;
        const q = logicalPoint(scene, p);
        this.onDrag(q.x, q.y, true);
        return true;
      },
      () => {},
      (p) => {
        const q = logicalPoint(scene, p);
        this.onDrag(q.x, q.y, false);
      },
    );
    scene.add.existing(this);
    scene.add.existing(zone);
    this.once(Phaser.GameObjects.Events.DESTROY, () => zone.destroy());
  }

  show(angleDeci: number, facing: 1 | -1): void {
    if (angleDeci === this.shown.angle && facing === this.shown.facing) return;
    this.shown = { angle: angleDeci, facing };
    const R = this.hit.w / 2 - 14;
    const v = aimVector(angleDeci, facing);
    this.g.clear();
    this.g.lineStyle(6, color.ink, 1);
    this.g.lineBetween(0, 0, v.x * R, v.y * R);
    this.g.fillStyle(color.ink, 1).fillCircle(v.x * R, v.y * R, 10);
    this.g.fillStyle(color.action, 1).fillCircle(v.x * R, v.y * R, 7);
    this.g.fillStyle(color.ink, 1).fillCircle(0, 0, 6);
    this.num.setText(`${Math.round(angleDeci / 10)}°`);
    const e = asset(facing > 0 ? 'ui.icon.chevron-r' : 'ui.icon.chevron-l');
    this.facingIcon.setFrame(e.frame).setDisplaySize(24, 24);
  }

  setLive(on: boolean): this {
    this.live = on;
    return this;
  }

  setDim(alpha: number): this {
    this.setAlpha(alpha);
    return this;
  }
}

// ------------------------------------------------------------ power slider

/** The power slider (DR-121): track 28x160, knob 56 showing the number. */
export class PowerSlider extends Phaser.GameObjects.Container implements Ctl {
  readonly id = 'power';
  readonly hit: Rect;
  readonly track: Rect;
  private fill: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Container;
  private num: BitmapLabel;
  private live = true;
  /** When set, asked at press time, so a press in the frame a turn opens is not lost. */
  liveCheck: (() => boolean) | null = null;

  isLive(): boolean {
    return this.liveCheck ? this.liveCheck() : this.live;
  }
  private shown = Number.NaN;

  constructor(
    scene: Phaser.Scene,
    hit: Rect,
    private readonly onDrag: (py: number) => void,
    onWheel: (dir: 1 | -1) => void,
  ) {
    super(scene, 0, 0);
    this.hit = hit;
    this.track = { x: hit.x + (hit.w - 28) / 2, y: hit.y + (hit.h - 160) / 2, w: 28, h: 160 };
    const t = this.track;
    const base = scene.add.graphics();
    base
      .fillStyle(color.ink, 1)
      .fillRoundedRect(t.x - 2, t.y - 2 + tokens.shadowY.sm, t.w + 4, t.h + 4, 16);
    base.fillStyle(color.ink, 1).fillRoundedRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 16);
    base.fillStyle(color.panel, 1).fillRoundedRect(t.x + 2, t.y + 2, t.w - 4, t.h - 4, 12);
    this.fill = scene.add.graphics();
    this.knob = scene.add.container(t.x + t.w / 2, t.y + t.h);
    const kg = scene.add.graphics();
    kg.fillStyle(color.ink, 1).fillCircle(0, tokens.shadowY.sm, 28);
    kg.fillStyle(color.ink, 1).fillCircle(0, 0, 28);
    kg.fillStyle(color['secondary-shade'], 1).fillCircle(0, 0, 24);
    kg.fillStyle(color.secondary, 1).fillEllipse(0, -3, 48, 42);
    this.num = new BitmapLabel(scene, 0, -3, '60', 'numeral', color.ink);
    this.num.setTextOrigin(0.5, 0.5);
    this.knob.add([kg, this.num]);
    this.add([base, this.fill, this.knob]);
    const zone = zoneFor(scene, hit);
    zone.on('wheel', (_p: unknown, _dx: number, dy: number) => {
      if (this.isLive()) onWheel(dy < 0 ? 1 : -1);
    });
    new PointerTrack(
      scene,
      zone,
      (p) => {
        if (!this.isLive()) return false;
        this.onDrag(logicalPoint(scene, p).y);
        this.knob.setScale(1.1);
        return true;
      },
      () => this.knob.setScale(1),
      (p) => this.onDrag(logicalPoint(scene, p).y),
    );
    scene.add.existing(this);
    scene.add.existing(zone);
    this.once(Phaser.GameObjects.Events.DESTROY, () => zone.destroy());
  }

  show(powerMille: number): void {
    if (powerMille === this.shown) return;
    this.shown = powerMille;
    const t = this.track;
    const h = (t.h - 4) * (powerMille / 1000);
    this.fill.clear();
    if (h > 0)
      this.fill
        .fillStyle(color.action, 1)
        .fillRoundedRect(t.x + 2, t.y + t.h - 2 - h, t.w - 4, h, Math.min(12, h / 2));
    this.knob.setY(t.y + t.h - (t.h * powerMille) / 1000);
    this.num.setText(String(Math.round(powerMille / 10)));
    this.num.setFontSize(powerMille >= 1000 ? 26 : tokens.type.numeral.size);
  }

  setLive(on: boolean): this {
    this.live = on;
    return this;
  }

  setDim(alpha: number): this {
    this.setAlpha(alpha);
    return this;
  }
}

// ------------------------------------------------------------ weapon tray

export interface SlotView {
  weapon: string;
  ammo: number;
  selected: boolean;
}

/**
 * One tray slot (DR-124): 64x64, icon 40, ammo badge 28 with numeral 22
 * ("∞" for Seed, OVR-005). Selected: raised 6, `secondary`. Empty: stone
 * with a crossed badge.
 */
export class WeaponSlot extends Phaser.GameObjects.Container implements Ctl {
  readonly id: string;
  readonly hit: Rect;
  private box: JellyBox;
  private icon: Phaser.GameObjects.Image;
  private badge: Phaser.GameObjects.Graphics;
  private num: BitmapLabel;
  private live = true;
  /** When set, asked at press time, so a press in the frame a turn opens is not lost. */
  liveCheck: (() => boolean) | null = null;

  isLive(): boolean {
    return this.liveCheck ? this.liveCheck() : this.live;
  }
  private view: SlotView | null = null;

  constructor(scene: Phaser.Scene, index: number, hit: Rect, weapon: string, onPick: () => void) {
    super(scene, 0, 0);
    this.id = `slot${index}`;
    this.hit = hit;
    this.box = new JellyBox(scene, hit, {
      fill: 'panel',
      shade: 'secondary-shade',
      radius: tokens.radius.md,
      shadowY: tokens.shadowY.sm,
    });
    const e = asset(`weapon.icon.${weapon}`);
    this.icon = scene.add.image(0, -3, e.atlas, e.frame).setScale(1 / RASTER);
    this.badge = scene.add.graphics();
    this.num = new BitmapLabel(scene, hit.w / 2 - 6, -hit.h / 2 + 6, '', 'numeral', color.ink);
    this.num.setTextOrigin(0.5, 0.5).setFontSize(22);
    this.box.face.add([this.icon, this.badge, this.num]);
    this.add(this.box);
    const zone = zoneFor(scene, hit);
    zone.on('pointerdown', () => {
      if (!this.isLive() || (this.view?.ammo ?? 0) <= 0) {
        this.box.deny();
        return;
      }
      onPick();
    });
    this.add(zone);
    scene.add.existing(this);
  }

  show(v: SlotView): void {
    const prev = this.view;
    if (prev && prev.ammo === v.ammo && prev.selected === v.selected) return;
    this.view = { ...v };
    const empty = v.ammo <= 0;
    // Panel cards carry no band (UI.md §1.2); selected and empty slots do.
    if (empty) this.box.setStyle('disabled', 'disabled-shade');
    else if (v.selected) this.box.setStyle('secondary', 'secondary-shade');
    else this.box.setStyle('panel', null);
    this.box.setY(this.hit.y - (v.selected ? tokens.component.weaponSlot.lift : 0));
    this.icon.setAlpha(empty ? 0.5 : 1);
    const bx = this.hit.w / 2 - 6;
    const by = -this.hit.h / 2 + 6;
    this.badge.clear();
    this.badge.fillStyle(color.ink, 1).fillCircle(bx, by, 14);
    this.badge.fillStyle(empty ? color.disabled : color.panel, 1).fillCircle(bx, by, 12);
    if (empty) {
      this.badge.lineStyle(3, color.ink, 1).lineBetween(bx - 7, by + 7, bx + 7, by - 7);
      this.num.setText('');
    } else {
      this.num.setText(Number.isFinite(v.ammo) ? String(v.ammo) : '∞');
    }
  }

  setLive(on: boolean): this {
    this.live = on;
    return this;
  }

  setDim(alpha: number): this {
    this.setAlpha(alpha);
    return this;
  }
}

/** A tween length with the reduced-motion cap (DR-084). */
export const ms = (v: number) => motionMs(v);
