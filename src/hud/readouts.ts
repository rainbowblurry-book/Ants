/**
 * Battle HUD readouts (UI.md §2 and §4.5; DR-123, DR-125, DR-127, DR-128,
 * DR-130, DR-131, DR-183, J38, J46). They draw state; they never change it.
 */
import * as Phaser from 'phaser';
import { asset, badgeKey, RASTER } from '../assets/manifest';
import { FLIP_COST, HOP_COST, WALK_BUDGET } from '../sim/movement';
import { JellyBox, Panel } from '../ui/components';
import { fitText } from '../ui/fitText';
import { type Rect, worldOffset } from '../ui/layout';
import { motionMs, reducedMotion } from '../ui/motion';
import { BitmapLabel, bodyText } from '../ui/text';
import { type ColorToken, color, cssColor, cssOnColor, onColor, tokens } from '../ui/theme';

const teamFill = (team: number): ColorToken => (team === 0 ? 'team-a' : 'team-b');
const teamShade = (team: number): ColorToken => (team === 0 ? 'team-a-shade' : 'team-b-shade');

function badge(scene: Phaser.Scene, x: number, y: number, team: number, size: number) {
  const e = asset(badgeKey(team));
  return scene.add.image(x, y, e.atlas, e.frame).setDisplaySize(size, size);
}

// -------------------------------------------------------------- team pill

/**
 * TeamPill (DR-128): 232x48, badge 32, a 100x16 team bar with a shade band,
 * numeral 32. The active team rises 4 with a ▸ notch. The bar drains over
 * 400 ms after the number changes.
 */
export class TeamPill extends Phaser.GameObjects.Container {
  private bar: Phaser.GameObjects.Graphics;
  private num: BitmapLabel;
  private notch: Phaser.GameObjects.Graphics;
  private shown = -1;
  private drawn = -1;
  private tween: Phaser.Tweens.Tween | null = null;
  private isActive = false;
  readonly box: JellyBox;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    readonly team: number,
    private readonly maxHp: number,
  ) {
    super(scene, 0, 0);
    this.box = new Panel(scene, rect, tokens.shadowY.sm);
    const cy = rect.h / 2;
    const b = badge(scene, 12 + 16 - rect.w / 2, cy - rect.h / 2, team, 32);
    this.bar = scene.add.graphics();
    this.num = new BitmapLabel(scene, rect.w / 2 - 14, 0, '0', 'numeral', color.ink);
    this.num.setTextOrigin(1, 0.5);
    this.notch = scene.add.graphics();
    this.notch
      .fillStyle(color.ink, 1)
      .fillTriangle(rect.w / 2 + 6, -8, rect.w / 2 + 6, 8, rect.w / 2 + 16, 0);
    this.notch.setVisible(false);
    this.box.face.add([b, this.bar, this.num, this.notch]);
    this.add(this.box);
    scene.add.existing(this);
  }

  private drawBar(hp: number): void {
    this.drawn = hp;
    const x = 52 - this.rect.w / 2;
    // DR-128's 100, shorter in a narrow pill so the HP number never covers it (OVR-019).
    const w = Math.min(100, this.rect.w - 132);
    const h = 16;
    const y = -h / 2;
    const f = Math.max(0, Math.min(1, hp / this.maxHp));
    this.bar.clear();
    this.bar.fillStyle(color.ink, 1).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 8);
    this.bar.fillStyle(color.disabled, 1).fillRoundedRect(x, y, w, h, 6);
    if (f > 0) {
      const fw = Math.max(12, w * f);
      this.bar.fillStyle(color[teamShade(this.team)], 1).fillRoundedRect(x, y, fw, h, 6);
      this.bar
        .fillStyle(color[teamFill(this.team)], 1)
        .fillRoundedRect(x, y, fw, h - 4, { tl: 6, tr: 6, bl: 0, br: 0 });
    }
  }

  sync(hp: number, active: boolean): void {
    if (hp !== this.shown) {
      const from = this.shown < 0 ? hp : this.drawn;
      this.shown = hp;
      this.num.setText(String(hp));
      this.tween?.stop();
      if (from === hp || reducedMotion()) this.drawBar(hp);
      else {
        const o = { v: from };
        this.tween = this.scene.tweens.add({
          targets: o,
          v: hp,
          duration: 400,
          onUpdate: () => this.drawBar(Math.round(o.v)),
        });
      }
    }
    if (active !== this.isActive) {
      this.isActive = active;
      this.notch.setVisible(active);
      this.box.setY(this.rect.y - (active ? 4 : 0));
    }
  }
}

// ------------------------------------------------------- turn plate, timer

export type TimerMode = 'hidden' | 'turn' | 'retreat';

/**
 * Turn plate (DR-127, J46): 420x56, badge 40, name 28 (shrinks to 22) and a
 * 48 timer disc. Normal: butter disc. ≤ 10 s: `action` ring. ≤ 5 s: an
 * `action` rounded square with an ink numeral and a pulse. Retreat: "Run for
 * cover!" with a butter 3-2-1 disc and a runner icon.
 */
export class TurnPlate extends Phaser.GameObjects.Container {
  private panel: Panel;
  private badgeImg: Phaser.GameObjects.Image;
  private nameLabel: BitmapLabel;
  private disc: Phaser.GameObjects.Graphics;
  private discNum: BitmapLabel;
  private runner: Phaser.GameObjects.Image;
  private discBox: Phaser.GameObjects.Container;
  private key = '';
  private pulse: Phaser.Tweens.Tween | null = null;
  private nameW: number;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    readonly timerRect: Rect,
  ) {
    super(scene, 0, 0);
    this.panel = new Panel(scene, rect, tokens.shadowY.sm);
    const e = asset(badgeKey(0));
    this.badgeImg = scene.add
      .image(rect.x + 8 + 20, rect.y + 8 + 20, e.atlas, e.frame)
      .setDisplaySize(40, 40);
    this.nameW = timerRect.x - 8 - (rect.x + 56);
    this.nameLabel = new BitmapLabel(
      scene,
      rect.x + 56 + this.nameW / 2,
      rect.y + rect.h / 2,
      '',
      'label',
      color.ink,
    );
    this.nameLabel.setTextOrigin(0.5, 0.5);
    this.discBox = scene.add.container(timerRect.x + 24, timerRect.y + 24);
    this.disc = scene.add.graphics();
    this.discNum = new BitmapLabel(scene, 0, 0, '', 'numeral', color.ink);
    this.discNum.setTextOrigin(0.5, 0.5);
    const r = asset('ui.icon.runner');
    this.runner = scene.add
      .image(0, 0, r.atlas, r.frame)
      .setDisplaySize(20, 20)
      .setTint(color.ink)
      .setVisible(false);
    this.discBox.add([this.disc, this.discNum, this.runner]);
    this.add([this.panel, this.badgeImg, this.nameLabel, this.discBox]);
    scene.add.existing(this);
  }

  setTeam(team: number, text: string): void {
    const e = asset(badgeKey(team));
    this.badgeImg.setFrame(e.frame).setDisplaySize(40, 40);
    // Names may shrink to 22 and then take an ellipsis (DR-087, DR-127).
    this.nameLabel.fitTo(text, this.nameW, true);
  }

  /** TurnStart: the plate drops in, 300 ms (a fade with reduced motion). */
  dropIn(): void {
    if (reducedMotion()) {
      this.setAlpha(0);
      this.scene.tweens.add({ targets: this, alpha: 1, duration: motionMs(300) });
      return;
    }
    this.setY(-this.rect.y - this.rect.h);
    this.scene.tweens.add({ targets: this, y: 0, duration: 300, ease: 'Back.easeOut' });
  }

  /** `secs` is whole seconds left (turn) or the 3-2-1 count (retreat). */
  setTimer(mode: TimerMode, secs: number): void {
    const level = mode === 'turn' ? (secs <= 5 ? 2 : secs <= 10 ? 1 : 0) : 0;
    const key = `${mode}:${secs}:${level}`;
    if (key === this.key) return;
    const prevLevel = this.key.split(':')[2];
    this.key = key;
    this.discBox.setVisible(mode !== 'hidden');
    this.runner.setVisible(mode === 'retreat');
    this.discNum.setText(mode === 'hidden' ? '' : String(secs));
    this.discNum.setY(mode === 'retreat' ? -6 : 0);
    this.runner.setY(14);
    if (mode === 'retreat') this.discNum.setFontSize(22);
    else this.discNum.setFontSize(tokens.type.numeral.size);
    const g = this.disc;
    g.clear();
    g.fillStyle(color.ink, 1);
    if (level === 2) {
      g.fillRoundedRect(-24, -24, 48, 48, 12);
      g.fillStyle(color.action, 1).fillRoundedRect(-20, -20, 40, 40, 9);
    } else {
      g.fillCircle(0, 0, 24);
      g.fillStyle(color.secondary, 1).fillCircle(0, 0, 20);
      if (level === 1) g.lineStyle(4, color.action, 1).strokeCircle(0, 0, 18);
    }
    if (String(level) !== prevLevel) {
      this.pulse?.stop();
      this.pulse = null;
      this.discBox.setScale(1);
      if (level === 2 && !reducedMotion()) {
        this.pulse = this.scene.tweens.add({
          targets: this.discBox,
          scale: 1.2,
          duration: 250,
          yoyo: true,
          repeat: -1,
          repeatDelay: 500,
        });
      }
    }
  }
}

// -------------------------------------------------------------- wind gauge

/**
 * Wind gauge (DR-125): `info` pill 360x48 with five 28 px slots each side of
 * a 64 hub. Lit chevrons are white and point away from the hub on the wind's
 * side; unlit ones are `info-shade`. The hub shows "+3" / "−3" or "Calm".
 * On a change the chevrons pop outward at 40 ms each.
 */
export class WindGauge extends Phaser.GameObjects.Container {
  private chevrons: Phaser.GameObjects.Image[] = [];
  private hubNum: BitmapLabel;
  private calm: Phaser.GameObjects.Text;
  private level = Number.NaN;
  private box: JellyBox;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    calmText: string,
  ) {
    super(scene, 0, 0);
    const box = new JellyBox(scene, rect, {
      fill: 'info',
      shade: 'info-shade',
      radius: tokens.radius.lg,
      shadowY: tokens.shadowY.sm,
    });
    this.box = box;
    this.add(box);
    const cx = rect.w / 2;
    const cy = rect.h / 2 - tokens.shape.shadeBand.base / 2;
    const slot = tokens.component.windGauge.slotW;
    const hub = tokens.component.windGauge.hubW;
    const ch = asset('ui.wind.chevron');
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 5; i++) {
        const x = cx + side * (hub / 2 + slot / 2 + i * slot) - rect.w / 2;
        const img = scene.add.image(x, cy - rect.h / 2, ch.atlas, ch.frame).setScale(0.8 / RASTER);
        img.setFlipX(side < 0);
        img.setData('side', side).setData('i', i);
        this.chevrons.push(img);
        box.face.add(img);
      }
    }
    const h = asset('ui.wind.hub');
    const hubImg = scene.add
      .image(0, cy - rect.h / 2, h.atlas, h.frame)
      .setScale(1 / RASTER)
      .setTint(color.panel);
    hubImg.setDisplaySize(hub, 40);
    this.hubNum = new BitmapLabel(scene, 0, cy - rect.h / 2 + 1, '', 'numeral', color.ink);
    this.hubNum.setTextOrigin(0.5, 0.5);
    this.calm = bodyText(scene, 0, cy - rect.h / 2, calmText, 'body', cssOnColor.panel).setOrigin(
      0.5,
      0.5,
    );
    box.face.add([hubImg, this.hubNum, this.calm]);
    scene.add.existing(this);
  }

  show(level: number): void {
    const lv = Math.round(level);
    if (lv === this.level) return;
    const first = Number.isNaN(this.level);
    this.level = lv;
    this.calm.setVisible(lv === 0);
    this.hubNum.setText(lv === 0 ? '' : lv > 0 ? `+${lv}` : `−${-lv}`);
    // A change pops the gauge, as a notice pops in (OVR-018, D10).
    if (!first && !reducedMotion()) {
      this.box.setScale(0.9);
      this.scene.tweens.add({ targets: this.box, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }
    const side = Math.sign(lv);
    for (const img of this.chevrons) {
      const lit = side !== 0 && img.getData('side') === side && img.getData('i') < Math.abs(lv);
      img.setTint(lit ? color['meaning-white'] : color['info-shade']);
      if (lit && !first && !reducedMotion()) {
        img.setScale(0.4 / RASTER);
        this.scene.tweens.add({
          targets: img,
          scale: 0.8 / RASTER,
          delay: (img.getData('i') as number) * 40,
          duration: 120,
          ease: 'Back.easeOut',
        });
      }
    }
  }
}

/** One chip of the effects row (DR-125, DR-127): 40 tall, body 22. */
export class EffectsRow extends Phaser.GameObjects.Container {
  private texts: string[] = [];

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
  }

  show(chips: string[]): void {
    if (chips.join('|') === this.texts.join('|')) return;
    this.texts = chips.slice(0, 4);
    this.removeAll(true);
    const widths = this.texts.map((t) => {
      const probe = bodyText(this.scene, 0, 0, t, 'body');
      const w = Math.ceil(probe.width) + 32;
      probe.destroy();
      return w;
    });
    const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * 8;
    let x = this.rect.x + (this.rect.w - total) / 2;
    this.texts.forEach((t, i) => {
      const w = widths[i] as number;
      const chip = new Panel(
        this.scene,
        { x, y: this.rect.y, w, h: this.rect.h },
        tokens.shadowY.sm,
      );
      const label = bodyText(this.scene, 0, -1, t, 'body', cssOnColor.panel).setOrigin(0.5, 0.5);
      chip.face.add(label);
      this.add(chip);
      x += w + 8;
    });
  }
}

// --------------------------------------------------------------- move bar

/**
 * Move bar (DR-123): 152x24 butter track, `move-fill` = remaining / 160, ink
 * ticks at 50 and 80, a foot icon; pulses at 0. In the retreat a 6 px teal
 * line drains over 3000 ms.
 */
export class MoveBar extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private key = '';
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
  ) {
    super(scene, 0, 0);
    this.g = scene.add.graphics();
    const f = asset('ui.icon.foot');
    const foot = scene.add
      .image(rect.x + 14, rect.y + rect.h / 2, f.atlas, f.frame)
      .setDisplaySize(18, 18)
      .setTint(color.ink);
    this.add([this.g, foot]);
    scene.add.existing(this);
  }

  show(budget: number, retreat: number | null): void {
    const key = `${Math.round(budget)}:${retreat === null ? '' : retreat.toFixed(2)}`;
    if (key === this.key) return;
    this.key = key;
    const r = this.rect;
    const inner = { x: r.x + 28, y: r.y + 2, w: r.w - 30, h: r.h - 4 };
    const g = this.g;
    g.clear();
    g.fillStyle(color.ink, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 12);
    g.fillStyle(color.secondary, 1).fillRoundedRect(inner.x, inner.y, inner.w, inner.h, 9);
    const f = Math.max(0, Math.min(1, budget / WALK_BUDGET));
    if (f > 0)
      g.fillStyle(color['move-fill'], 1).fillRoundedRect(
        inner.x,
        inner.y,
        Math.max(10, inner.w * f),
        inner.h,
        9,
      );
    g.fillStyle(color.ink, 1);
    for (const cost of [HOP_COST, FLIP_COST]) {
      const x = inner.x + inner.w * (cost / WALK_BUDGET);
      g.fillRect(x - 1, inner.y, 2, inner.h);
    }
    if (retreat !== null) {
      g.fillStyle(color.info, 1).fillRect(inner.x, inner.y + inner.h - 6, inner.w * retreat, 6);
    }
    const empty = budget <= 0;
    if (empty && !this.pulse && !reducedMotion()) {
      this.pulse = this.scene.tweens.add({
        targets: this,
        alpha: 0.5,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    } else if (!empty && this.pulse) {
      this.pulse.stop();
      this.pulse = null;
      this.setAlpha(1);
    }
  }
}

// --------------------------------------------------------------- ant tags

export interface TagView {
  x: number;
  y: number;
  team: number;
  hp: number;
  active: boolean;
  ko: boolean;
}

/**
 * Ant tag (DR-128): 76x32 panel, ink outline 3, badge 24, HP 22; 12 px above
 * the ant. Active: 96x40 with an `action` outline 4 and a bobbing `action`
 * arrow (8 px, 1.2 s). Low HP (≤ 25): `danger` numeral and a ±3° wobble. KO:
 * stone with a dizzy star, then it shrinks out after 1200 ms.
 * Drawn with Graphics so the 3 px outline is exact (the r8 slice has 4).
 */
export class AntTag extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private badgeImg: Phaser.GameObjects.Image;
  private num: BitmapLabel;
  private arrow: Phaser.GameObjects.Graphics;
  private star: Phaser.GameObjects.Image;
  private key = '';
  private wobble: Phaser.Tweens.Tween | null = null;
  private koAt = -1;
  private gone = false;

  constructor(scene: Phaser.Scene, team: number) {
    super(scene, 0, 0);
    this.g = scene.add.graphics();
    this.badgeImg = badge(scene, 0, 0, team, 24);
    this.num = new BitmapLabel(scene, 0, 0, '', 'numeral', color.ink);
    this.num.setTextOrigin(0.5, 0.5).setFontSize(22);
    this.arrow = scene.add.graphics();
    this.arrow.fillStyle(color.ink, 1).fillTriangle(-22, -48, 22, -48, 0, -4);
    this.arrow.fillStyle(color.action, 1).fillTriangle(-16, -44, 16, -44, 0, -10);
    const s = asset('ui.icon.star-round');
    this.star = scene.add
      .image(0, 0, s.atlas, s.frame)
      .setDisplaySize(20, 20)
      .setTint(color.ink)
      .setVisible(false);
    this.add([this.arrow, this.g, this.badgeImg, this.num, this.star]);
    scene.add.existing(this);
    if (!reducedMotion()) {
      scene.tweens.add({
        targets: this.arrow,
        y: -8,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  get size(): { w: number; h: number } {
    return this.key.startsWith('a') ? { w: 96, h: 40 } : { w: 76, h: 32 };
  }

  /** True once a knock-out tag has shrunk away. */
  get finished(): boolean {
    return this.gone;
  }

  show(v: TagView, now: number): void {
    if (this.gone) return;
    const low = v.hp <= 25 && !v.ko;
    const key = `${v.active ? 'a' : 'n'}:${v.hp}:${v.ko ? 1 : 0}:${low ? 1 : 0}`;
    if (key !== this.key) {
      this.key = key;
      const { w, h } = this.size;
      const g = this.g;
      g.clear();
      const ol = v.active ? 4 : 3;
      g.fillStyle(v.active ? color.action : color.ink, 1).fillRoundedRect(-w / 2, -h, w, h, 8);
      g.fillStyle(v.ko ? color.disabled : color.panel, 1).fillRoundedRect(
        -w / 2 + ol,
        -h + ol,
        w - 2 * ol,
        h - 2 * ol,
        8 - ol / 2,
      );
      const bs = v.active ? 28 : 24;
      this.badgeImg.setDisplaySize(bs, bs).setPosition(-w / 2 + 6 + bs / 2, -h / 2);
      this.num.setText(String(v.hp)).setPosition(10, -h / 2);
      this.num.setTint(low ? color.danger : v.ko ? color['ink-soft'] : color.ink);
      this.num.setVisible(!v.ko);
      this.star.setVisible(v.ko).setPosition(10, -h / 2);
      this.arrow.setVisible(v.active && !v.ko);
      this.arrow.setX(0);
      this.wobble?.stop();
      this.wobble = null;
      this.setAngle(0);
      if (low && !reducedMotion()) {
        this.wobble = this.scene.tweens.add({
          targets: this,
          angle: { from: -3, to: 3 },
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      }
      if (v.ko && this.koAt < 0) this.koAt = now;
    }
    this.setPosition(Math.round(v.x * 2) / 2, Math.round(v.y * 2) / 2);
    if (this.koAt >= 0 && now - this.koAt >= 1200) {
      this.gone = true;
      this.scene.tweens.add({
        targets: this,
        scale: 0,
        duration: motionMs(200),
        onComplete: () => this.setVisible(false),
      });
    }
  }
}

// ---------------------------------------------------------- damage numbers

/**
 * Damage numbers (DR-128): Lilita 40, white with a 4 px ink stroke, "−30",
 * rising 56 px over 900 ms. A direct hit is 56 with "!". A heal is "+25" in
 * leaf-200 (`heal`). Reduced motion: no rise.
 */
export class DamagePop extends Phaser.GameObjects.Container {
  readonly label: BitmapLabel;
  rise = 0;

  constructor(
    scene: Phaser.Scene,
    readonly worldX: number,
    readonly worldY: number,
    text: string,
    size: number,
    tint: number,
  ) {
    super(scene, 0, 0);
    this.label = new BitmapLabel(scene, 0, 0, text, 'numeral', tint, color.ink);
    this.label.setTextOrigin(0.5, 1).setFontSize(size);
    this.add(this.label);
    scene.add.existing(this);
    scene.tweens.add({
      targets: this,
      rise: reducedMotion() ? 0 : 56,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 700,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}

// ------------------------------------------------------- edge indicators

/**
 * Edge indicator (DR-130): a 48 px circle, not interactive, clamped to
 * x 24..936, y 188..350 and turned toward the target. A projectile is white
 * with an ink outline; an ant shows its team badge. The distance is shown at 22.
 */
export class EdgeIndicator extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private badgeImg: Phaser.GameObjects.Image | null;
  private dist: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, team: number | null) {
    super(scene, 0, 0);
    this.g = scene.add.graphics();
    this.badgeImg = team === null ? null : badge(scene, 0, 0, team, 28);
    this.dist = bodyText(scene, 0, 30, '', 'body', cssColor.ink).setOrigin(0.5, 0);
    this.dist.setStroke(cssColor.panel, 4);
    this.add([this.g, ...(this.badgeImg ? [this.badgeImg] : []), this.dist]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Target in logical screen px; distance in world px. Hidden when on screen. */
  point(tx: number, ty: number, distance: number): void {
    const on = tx >= worldOffset() && tx <= worldOffset() + 960 && ty >= 0 && ty <= 540;
    this.setVisible(!on);
    if (on) return;
    const x = Math.min(936, Math.max(24, tx));
    const y = Math.min(350, Math.max(188, ty));
    this.setPosition(x, y);
    const a = Math.atan2(ty - y, tx - x);
    const g = this.g;
    g.clear();
    g.fillStyle(color.ink, 1).fillCircle(0, 0, 24);
    g.fillStyle(this.badgeImg ? color.panel : color['meaning-white'], 1).fillCircle(0, 0, 21);
    // The arrow sits on the rim, pointing out.
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    const px = -ay;
    const py = ax;
    g.fillStyle(color.ink, 1).fillTriangle(
      ax * 34,
      ay * 34,
      ax * 20 + px * 10,
      ay * 20 + py * 10,
      ax * 20 - px * 10,
      ay * 20 - py * 10,
    );
    this.dist.setText(String(Math.round(distance)));
  }
}

// ------------------------------------------------------------ notice view

/** The notice slot (DR-131): a banner (label 28) or a toast (body 22). */
export class NoticeView extends Phaser.GameObjects.Container {
  private text = '';

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
  ) {
    super(scene, 0, 0);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(text: string | null, kind: 'banner' | 'toast' = 'banner', fill: ColorToken = 'panel'): void {
    const key = text === null ? '' : `${kind}:${fill}:${text}`;
    if (key === this.text) return;
    this.text = key;
    this.removeAll(true);
    if (text === null) {
      this.setVisible(false);
      return;
    }
    this.setVisible(true);
    const r = this.rect;
    const shaded = fill !== 'panel';
    const box = new JellyBox(this.scene, r, {
      fill,
      shade: shaded ? (`${fill}-shade` as ColorToken) : null,
      radius: tokens.radius.lg,
      shadowY: tokens.shadowY.lg,
    });
    const tint = onColor[fill as keyof typeof onColor] ?? color.ink;
    if (kind === 'banner') {
      const l = new BitmapLabel(this.scene, 0, shaded ? -4 : 0, text, 'label', tint);
      l.setTextOrigin(0.5, 0.5);
      l.fitTo(text, r.w - 32, true);
      box.face.add(l);
    } else {
      const css = cssOnColor[fill as keyof typeof cssOnColor] ?? cssColor.ink;
      box.face.add(bodyText(this.scene, 0, 0, text, 'body', css, r.w - 32).setOrigin(0.5, 0.5));
    }
    this.add(box);
    if (!reducedMotion()) {
      box.setScale(0.9);
      this.scene.tweens.add({ targets: box, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }
  }
}

// -------------------------------------------------------------- 2P gate

/**
 * The two-player gate (DR-183, J46): a team-colour jelly button at
 * 300,212,360,96 with a 48 badge and "Tap to start" (40). White text on
 * Blue, ink on Amber. Locked (60%) for its first 400 ms; idle bob 4 px.
 */
export class GateButton extends Phaser.GameObjects.Container {
  private box: JellyBox;
  private badgeImg: Phaser.GameObjects.Image;
  private label: BitmapLabel;
  private team = -1;
  private bob: Phaser.Tweens.Tween | null = null;
  readonly zone: Phaser.GameObjects.Zone;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    text: string,
    onTap: () => void,
  ) {
    super(scene, 0, 0);
    this.box = new JellyBox(scene, rect, {
      fill: 'team-a',
      shade: 'team-a-shade',
      radius: tokens.radius.lg,
      shadowY: tokens.shadowY.md,
    });
    const bandUp = -tokens.shape.shadeBand.base / 2;
    this.badgeImg = badge(scene, -rect.w / 2 + 24 + 24, bandUp, 0, 48);
    const textW = rect.w - 48 - 24 - 32;
    this.label = new BitmapLabel(
      scene,
      -rect.w / 2 + 96 + textW / 2,
      bandUp,
      text,
      'title',
      color['meaning-white'],
    );
    this.label.setTextOrigin(0.5, 0.5);
    this.label.fitTo(text, textW);
    this.box.face.add([this.badgeImg, this.label]);
    this.add(this.box);
    this.zone = scene.add.zone(rect.x, rect.y, rect.w, rect.h).setOrigin(0, 0).setInteractive();
    this.zone.on('pointerdown', () => {
      if (this.visible && this.alpha >= 1) {
        this.box.setPressed(true);
        onTap();
      }
    });
    this.zone.on('pointerup', () => this.box.setPressed(false));
    this.add(this.zone);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(on: boolean, team: number, locked: boolean): void {
    if (this.zone.input) this.zone.input.enabled = on;
    if (!on) {
      if (this.visible) {
        this.setVisible(false);
        this.bob?.stop();
        this.bob = null;
        this.box.setPressed(false);
      }
      return;
    }
    if (team !== this.team) {
      this.team = team;
      this.box.setStyle(teamFill(team), teamShade(team));
      const e = asset(badgeKey(team));
      this.badgeImg.setFrame(e.frame).setDisplaySize(48, 48);
      this.label.setTint(onColor[teamFill(team) as keyof typeof onColor]);
    }
    if (!this.visible) {
      this.setVisible(true);
      if (!reducedMotion()) {
        this.box.setScale(0.8);
        this.scene.tweens.add({ targets: this.box, scale: 1, duration: 180, ease: 'Back.easeOut' });
        this.bob = this.scene.tweens.add({
          targets: this.box.face,
          y: this.rect.h / 2 - 4,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
    this.setAlpha(locked ? 0.6 : 1);
  }
}

// ------------------------------------------------------------ team frame

/**
 * Team frame (DR-183, J46): an 8 px team-colour stroke around the safe rect,
 * radius 24, two-player only. Crossfades in 150 ms (instant with reduced motion).
 */
export class TeamFrame extends Phaser.GameObjects.Container {
  private layers: Phaser.GameObjects.Graphics[];
  private team = -1;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
  ) {
    super(scene, 0, 0);
    const w = tokens.component.teamFrame.width;
    const r = tokens.component.teamFrame.radius;
    this.layers = [0, 1].map((t) => {
      const g = scene.add.graphics();
      g.lineStyle(w, color[teamFill(t)], 1);
      g.strokeRoundedRect(rect.x - w / 2, rect.y - w / 2, rect.w + w, rect.h + w, r);
      g.setAlpha(0);
      return g;
    });
    this.add(this.layers);
    scene.add.existing(this);
  }

  show(team: number): void {
    if (team === this.team) return;
    this.team = team;
    this.layers.forEach((g, i) => {
      const a = i === team ? 1 : 0;
      if (reducedMotion()) g.setAlpha(a);
      else this.scene.tweens.add({ targets: g, alpha: a, duration: 150 });
    });
  }
}

// ------------------------------------------------------------- Dot bubble

/**
 * Dot bubble (DR-131, J38): 392x112 panel at 16,180 (or 552,180 when the
 * active ant is on the left), Dot avatar 64, body 22, at most 3 lines, and a
 * tail. Tap to close; it collapses to a 64 Dot chip when a banner shows.
 */
export class DotBubble extends Phaser.GameObjects.Container {
  private bodyTxt: Phaser.GameObjects.Text;
  private panel: Panel;
  private chip: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    readonly rect: Rect,
    text: string,
    onClose: () => void,
  ) {
    super(scene, 0, 0);
    this.panel = new Panel(scene, rect, tokens.shadowY.md);
    const a = asset('dot.avatar');
    const avatar = scene.add
      .image(-rect.w / 2 + 16 + 32, 0, a.atlas, a.frame)
      .setDisplaySize(64, 64);
    const maxW = rect.w - 16 - 64 - 16 - 16;
    const fit = fitText(text, {
      role: 'body',
      maxWidth: maxW,
      maxLines: 3,
      ellipsisAllowed: false,
      measure: (t, size) => {
        const p = bodyText(scene, 0, 0, t, 'body');
        p.setFontSize(size);
        const w = p.width;
        p.destroy();
        return w;
      },
    });
    this.bodyTxt = bodyText(
      scene,
      -rect.w / 2 + 16 + 64 + 16,
      0,
      fit.lines.join('\n'),
      'body',
      cssOnColor.panel,
    );
    this.bodyTxt.setFontSize(fit.size).setOrigin(0, 0.5);
    const tail = scene.add.graphics();
    tail
      .fillStyle(color.ink, 1)
      .fillTriangle(-20, rect.h / 2 - 2, 4, rect.h / 2 - 2, -14, rect.h / 2 + 18);
    tail
      .fillStyle(color.panel, 1)
      .fillTriangle(-16, rect.h / 2 - 4, 0, rect.h / 2 - 4, -13, rect.h / 2 + 11);
    this.panel.face.add([tail, avatar, this.bodyTxt]);
    this.chip = scene.add.container(rect.x + 32, rect.y + 32);
    const cg = scene.add.graphics();
    cg.fillStyle(color.ink, 1).fillCircle(0, 0, 32);
    cg.fillStyle(color.panel, 1).fillCircle(0, 0, 28);
    const ca = scene.add.image(0, 0, a.atlas, a.frame).setDisplaySize(52, 52);
    this.chip.add([cg, ca]).setVisible(false);
    const zone = scene.add.zone(rect.x, rect.y, rect.w, rect.h).setOrigin(0, 0).setInteractive();
    zone.on('pointerdown', onClose);
    this.add([this.panel, this.chip, zone]);
    scene.add.existing(this);
  }

  collapse(on: boolean): void {
    this.panel.setVisible(!on);
    this.chip.setVisible(on);
  }
}

/** "Oops, too slow!" (DR-127) and other short pops over an ant: a panel chip. */
export class AntPop extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    readonly worldX: number,
    readonly worldY: number,
    text: string,
  ) {
    super(scene, 0, 0);
    const probe = bodyText(scene, 0, 0, text, 'body');
    const w = Math.ceil(probe.width) + 32;
    probe.destroy();
    const chip = new Panel(scene, { x: -w / 2, y: -40, w, h: 40 }, tokens.shadowY.sm);
    chip.face.add(bodyText(scene, 0, -1, text, 'body', cssOnColor.panel).setOrigin(0.5, 0.5));
    this.add(chip);
    scene.add.existing(this);
    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 1400,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}

/** Team colour token of a team index. */
export { teamFill, teamShade };
