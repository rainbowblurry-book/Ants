/**
 * Text helpers (DR-081, DR-087, UI.md §1.3).
 *
 * Lilita roles (display, title, label, numeral) use the baked bitmap fonts;
 * display and numeral draw a stroke layer under the fill with the same
 * metrics. Body and caption are Nunito runtime `Text` at resolution S.
 */
import * as Phaser from 'phaser';
import { type FontKey, fontLayerKey } from '../assets/manifest';
import { REG_RENDER_SCALE } from '../boot/config';
import { type FitResult, fitText, type Role, roleSize } from './fitText';
import { cssColor, font, tokens } from './theme';

type BitmapRole = 'display' | 'title' | 'label' | 'numeral';

export function bakeOf(role: BitmapRole): FontKey {
  return tokens.type[role].bake as FontKey;
}

/** A bitmap label: fill layer, plus a stroke layer for display and numeral. */
export class BitmapLabel extends Phaser.GameObjects.Container {
  readonly fill: Phaser.GameObjects.BitmapText;
  readonly stroke: Phaser.GameObjects.BitmapText | null;
  fit: FitResult | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    readonly role: BitmapRole,
    tint: number,
    strokeTint: number | null = null,
  ) {
    super(scene, x, y);
    const bake = bakeOf(role);
    const size = roleSize(role);
    const spacing = tokens.type[role].letterSpacing;
    const wantsStroke = role === 'display' || role === 'numeral';
    this.stroke =
      wantsStroke && strokeTint !== null
        ? scene.add
            .bitmapText(0, 0, fontLayerKey(bake, 'stroke'), text, size)
            .setTint(strokeTint)
            .setLetterSpacing(spacing)
        : null;
    this.fill = scene.add
      .bitmapText(0, 0, bake, text, size)
      .setTint(tint)
      .setLetterSpacing(spacing);
    if (this.stroke) this.add(this.stroke);
    this.add(this.fill);
    scene.add.existing(this);
  }

  /** Origin of both layers. */
  setTextOrigin(x: number, y: number): this {
    this.stroke?.setOrigin(x, y);
    this.fill.setOrigin(x, y);
    return this;
  }

  setText(text: string): this {
    this.stroke?.setText(text);
    this.fill.setText(text);
    return this;
  }

  setFontSize(size: number): this {
    this.stroke?.setFontSize(size);
    this.fill.setFontSize(size);
    return this;
  }

  setTint(tint: number): this {
    this.fill.setTint(tint);
    return this;
  }

  /** Width of `text` at `size`, in logical px. */
  measure(text: string, size: number): number {
    const prevText = this.fill.text;
    const prevSize = this.fill.fontSize;
    this.fill.setFontSize(size).setText(text);
    const w = this.fill.width;
    this.fill.setFontSize(prevSize).setText(prevText);
    return w;
  }

  /** Shrink, wrap, then ellipsis (DR-087). Bitmap labels are one line. */
  fitTo(text: string, maxWidth: number, ellipsisAllowed = false): FitResult {
    const r = fitText(text, {
      role: this.role,
      maxWidth,
      maxLines: 1,
      ellipsisAllowed,
      measure: (t, s) => this.measure(t, s),
      strict: import.meta.env.DEV,
    });
    this.setFontSize(r.size).setText(r.lines.join(' '));
    this.fit = r;
    return r;
  }
}

/** Nunito runtime text (body or caption) at resolution S. */
export function bodyText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  role: Extract<Role, 'body' | 'caption'>,
  colorCss: string = cssColor.ink,
  wrapWidth?: number,
): Phaser.GameObjects.Text {
  const t = tokens.type[role];
  const s = (scene.registry.get(REG_RENDER_SCALE) as number | undefined) ?? 1;
  return scene.add.text(x, y, text, {
    fontFamily: `"${font.body}", ${font.fallback}`,
    fontStyle: String(t.weight),
    fontSize: `${t.size}px`,
    color: colorCss,
    resolution: s,
    lineSpacing: Math.round(t.size * t.lineHeight - t.size),
    ...(wrapWidth ? { wordWrap: { width: wrapWidth, useAdvancedWrap: true } } : {}),
  });
}
