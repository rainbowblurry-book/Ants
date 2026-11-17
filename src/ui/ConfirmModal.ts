/**
 * Confirm dialog (DR-172, J30, J31, UI.md §2).
 *
 * Scrim 70% over everything. Card x 220, w 520, padding 32, radius 24,
 * outline 4, shadow 8, vertically centred, with
 *   h = 32 + title 40 + 16 + body (22, max 3 lines, 456 wide, line 29) + 24 + 72 + 32.
 * Buttons 216x72, gap 24, one row: Cancel (safe) left, confirm right.
 * Focus starts on the confirm button, or on Cancel when destructive. Esc,
 * Android back and B cancel. A scrim tap cancels non-destructive modals only.
 * At most one modal is open. It owns a focus scope, so focus is trapped.
 */
import * as Phaser from 'phaser';
import { t } from '../i18n';
import { Button, FocusRing, Panel } from './components';
import { fitText } from './fitText';
import type { FocusManager } from './focus';
import { motionMs, reducedMotion } from './motion';
import type { Nav } from './nav';
import { BitmapLabel, bodyText } from './text';
import { alpha, color, logical, tokens } from './theme';

const M = tokens.component.modal;
const TITLE_H = tokens.type.title.size;
const BODY = tokens.type.body;
/** DR-172: body line height 29 (22 × 1.3, rounded). */
const BODY_LINE = Math.round(BODY.size * BODY.lineHeight);
const BODY_MAX_LINES = 3;
const GAP_TITLE = 16;
const GAP_BUTTONS = 24;
/** DR-172 open and close timings (more specific than UI.md §1.5's panel tokens). */
const SCRIM_IN_MS = 120;
const CARD_POP_MS = 160;
const REDUCED_FADE_MS = 80;
/** Depth of every modal (above HUD and world). */
export const MODAL_DEPTH = 20_000;

export type ConfirmStyle = 'primary' | 'secondary' | 'destructive';

export interface ConfirmOptions {
  title: string;
  body: string;
  confirm: string;
  cancel?: string;
  style?: ConfirmStyle;
  focus: FocusManager;
  nav?: Nav | null;
  onConfirm: () => void;
  onCancel?: () => void;
}

let openModal: ConfirmModal | null = null;

export function modalOpen(): boolean {
  return openModal !== null;
}

export class ConfirmModal extends Phaser.GameObjects.Container {
  readonly card: Panel;
  readonly cancelButton: Button;
  readonly confirmButton: Button;
  readonly cardRect: { x: number; y: number; w: number; h: number };
  private ring: FocusRing;
  private closed = false;
  private keyB: ((e: KeyboardEvent) => void) | null = null;

  static open(scene: Phaser.Scene, o: ConfirmOptions): ConfirmModal | null {
    if (openModal) return null;
    return new ConfirmModal(scene, o);
  }

  private constructor(
    scene: Phaser.Scene,
    private readonly o: ConfirmOptions,
  ) {
    super(scene, 0, 0);
    openModal = this;
    const style = o.style ?? 'primary';
    const destructive = style === 'destructive';
    this.setDepth(MODAL_DEPTH);
    scene.add.existing(this);

    const scrim = scene.add
      .rectangle(0, 0, logical.width, logical.height, color.scrim, alpha.scrim)
      .setOrigin(0, 0)
      .setInteractive();
    scrim.on('pointerup', () => {
      if (!destructive) this.cancel();
    });
    this.add(scrim);

    // Body first: its line count sets the card height.
    const innerW = M.w - M.padding * 2;
    const body = bodyText(scene, 0, 0, '', 'body', undefined, undefined);
    const measure = (text: string, size: number) => {
      body.setFontSize(size).setText(text);
      return body.width;
    };
    const fit = fitText(o.body, {
      role: 'body',
      maxWidth: innerW,
      maxLines: BODY_MAX_LINES,
      measure,
      strict: import.meta.env.DEV,
    });
    body.setFontSize(fit.size).setText(fit.lines.join('\n'));
    const bodyH = fit.lines.length * BODY_LINE;
    const h = M.padding + TITLE_H + GAP_TITLE + bodyH + GAP_BUTTONS + M.button.h + M.padding;
    const y = Math.round((logical.height - h) / 2);
    this.cardRect = { x: M.x, y, w: M.w, h };

    this.card = new Panel(scene, this.cardRect, M.shadowY);
    const title = new BitmapLabel(scene, 0, 0, o.title, 'title', color.ink);
    title.setTextOrigin(0.5, 0);
    title.fitTo(o.title, innerW);
    title.setPosition(M.x + M.w / 2, y + M.padding);
    body.setPosition(M.x + M.padding, y + M.padding + TITLE_H + GAP_TITLE);
    body.setLineSpacing(BODY_LINE - fit.size);

    // Explicit stacking: Phaser's zones live on the scene list, so each piece
    // gets its own depth above the scrim.
    const by = y + h - M.padding - M.button.h;
    const bx0 = M.x + M.padding;
    const bx1 = bx0 + M.button.w + M.button.gap;
    o.focus.pushScope(() => this.cancel());
    this.cancelButton = new Button(scene, {
      id: 'modal-cancel',
      rect: { x: bx0, y: by, w: M.button.w, h: M.button.h },
      label: o.cancel ?? t('modal.cancel'),
      variant: 'secondary',
      focus: o.focus,
      onActivate: () => this.cancel(),
    });
    this.confirmButton = new Button(scene, {
      id: 'modal-confirm',
      rect: { x: bx1, y: by, w: M.button.w, h: M.button.h },
      label: o.confirm,
      variant: style,
      focus: o.focus,
      onActivate: () => this.confirm(),
    });
    o.focus.focus(destructive ? 'modal-cancel' : 'modal-confirm');

    this.card.setDepth(MODAL_DEPTH + 1);
    title.setDepth(MODAL_DEPTH + 2);
    body.setDepth(MODAL_DEPTH + 2);
    this.cancelButton.setDepth(MODAL_DEPTH + 2);
    this.confirmButton.setDepth(MODAL_DEPTH + 2);
    this.ring = new FocusRing(scene, o.focus);
    this.ring.setDepth(MODAL_DEPTH + 3);
    const parts = [this.card, title, body, this.cancelButton, this.confirmButton, this.ring];
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      for (const p of parts) p.destroy();
    });

    // B cancels too (DR-172).
    this.keyB = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') this.cancel();
    };
    window.addEventListener('keydown', this.keyB);
    o.nav?.pushLayer('confirm', () => this.cancel());

    // Open: scrim fade 120 ms + card pop 0.9 -> 1 in 160 ms; reduced: 80 ms fade only.
    const reduced = reducedMotion();
    scrim.setAlpha(0);
    scene.tweens.add({
      targets: scrim,
      alpha: 1,
      duration: reduced ? REDUCED_FADE_MS : SCRIM_IN_MS,
    });
    const cardParts = [this.card, title, body, this.cancelButton, this.confirmButton];
    if (reduced) {
      for (const p of cardParts) p.setAlpha(0);
      scene.tweens.add({ targets: cardParts, alpha: 1, duration: REDUCED_FADE_MS });
    } else {
      const cx = M.x + M.w / 2;
      const cy = y + h / 2;
      for (const p of cardParts) {
        const sx = p.x;
        const sy = p.y;
        p.setScale(0.9).setPosition(cx + (sx - cx) * 0.9, cy + (sy - cy) * 0.9);
        scene.tweens.add({
          targets: p,
          scale: 1,
          x: sx,
          y: sy,
          duration: motionMs(CARD_POP_MS),
          ease: tokens.motion.panelOpen.ease,
        });
      }
    }
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    openModal = null;
    if (this.keyB) window.removeEventListener('keydown', this.keyB);
    this.o.nav?.removeLayer('confirm');
    this.o.focus.popScope();
    this.destroy();
  }

  cancel(): void {
    if (this.closed) return;
    this.close();
    this.o.onCancel?.();
  }

  confirm(): void {
    if (this.closed) return;
    this.close();
    this.o.onConfirm();
  }
}
