/**
 * Pause overlay (DR-171 as amended by J30, J40; UI.md §4.6).
 *
 * Scrim 70% over the frozen battle. Panel 400 wide at x 280; with n = 4
 * buttons h = 88 + n·72 + (n − 1)·12 + 32 = 444 at y 48. Title "Paused" 40
 * at panel y + 30, caption 18 at y + 66. Buttons 320x72 at x 320 from panel
 * y + 88, gap 12: Resume (primary, default focus), Restart (destructive
 * confirm), Settings, Quit to map. Footer "Match saved" or "Saving is off".
 *
 * The Battle and Hud scenes are paused while this runs, which freezes the
 * sim, the turn timer, the camera and ambient animation. Resume fades the
 * scrim for 150 ms, then waits a 600 ms ready delay (300 ms and no fade with
 * reduced motion), clears the input buffers (a logged `cancel`, DR-015) and
 * only then lets play run.
 *
 * Stage 5: Settings (an HTML dialog) and Quit to map (the map) arrive in
 * stage 7, so those two buttons show the disabled state until then.
 */
import * as Phaser from 'phaser';
import { applyLogicalCamera, REG_RENDER_SCALE } from '../boot/config';
import type { RenderScale } from '../boot/renderScale';
import type { BattleLink } from '../hud/link';
import { t } from '../i18n';
import { ConfirmModal, modalOpen } from '../ui/ConfirmModal';
import { Button, bindFocusKeys, FocusRing, Panel } from '../ui/components';
import { FocusManager } from '../ui/focus';
import { reducedMotion } from '../ui/motion';
import { BitmapLabel, bodyText } from '../ui/text';
import { alpha, color, cssOnColor, tokens } from '../ui/theme';

export const PAUSE_KEY = 'pause';

const PANEL = { x: 280, w: 400 } as const;
const BTN = { x: 320, w: 320, h: 72, gap: 12 } as const;
const READY_MS = 600;
const READY_MS_REDUCED = 300;
const SCRIM_OUT_MS = 150;

export interface PauseHook {
  ready: boolean;
  resuming(): boolean;
  focused(): string | null;
  rect(id: string): { x: number; y: number; w: number; h: number } | null;
  footer: string;
}

declare global {
  interface Window {
    __pause?: PauseHook;
  }
}

export class Pause extends Phaser.Scene {
  private link!: BattleLink;
  private focus = new FocusManager();
  private resumingNow = false;
  private root!: Phaser.GameObjects.Container;
  private scrim!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(PAUSE_KEY);
  }

  init(link: BattleLink): void {
    this.link = link;
    this.resumingNow = false;
  }

  create(): void {
    const s = this.registry.get(REG_RENDER_SCALE) as RenderScale;
    applyLogicalCamera(this.cameras.main, s, 1);
    this.focus = new FocusManager();
    this.focus.setBack(() => this.resume());

    this.scrim = this.add
      .rectangle(0, 0, 960, 540, color.scrim, alpha.scrim)
      .setOrigin(0, 0)
      .setInteractive();
    this.root = this.add.container(0, 0);
    const n = 4;
    const h = 88 + n * BTN.h + (n - 1) * BTN.gap + 32;
    const y = Math.round((540 - h) / 2);
    const panel = new Panel(this, { x: PANEL.x, y, w: PANEL.w, h }, tokens.shadowY.lg);
    // DR-171 gives the lines at panel y + 30 and y + 66: read as line centres.
    const title = new BitmapLabel(this, 480, y + 30, t('pause.title'), 'title', color.ink);
    title.setTextOrigin(0.5, 0.5);
    const m = this.link.match;
    const caption = bodyText(
      this,
      480,
      y + 66,
      t('pause.round', { round: m.turns.round }),
      'caption',
      cssOnColor.panel,
    );
    caption.setOrigin(0.5, 0.5);
    this.root.add([panel, title, caption]);

    const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const add = (
      id: string,
      label: string,
      variant: 'primary' | 'secondary',
      act: () => void,
      enabled = true,
    ) => {
      const i = Object.keys(rects).length;
      const r = { x: BTN.x, y: y + 88 + i * (BTN.h + BTN.gap), w: BTN.w, h: BTN.h };
      rects[id] = r;
      const b = new Button(this, {
        id,
        rect: r,
        label,
        variant,
        focus: this.focus,
        onActivate: act,
      });
      if (!enabled) b.setEnabled(false);
      this.root.add(b);
      return b;
    };
    add('resume', t('pause.resume'), 'primary', () => this.resume());
    add('restart', t('pause.restart'), 'secondary', () => this.confirmRestart());
    add('settings', t('pause.settings'), 'secondary', () => {}, false);
    add('quit', t('pause.quit'), 'secondary', () => {}, false);
    const footerText = this.link.saving() ? t('pause.saved') : t('pause.savingOff');
    const footer = bodyText(
      this,
      480,
      y + h - 16,
      footerText,
      'caption',
      cssOnColor.panel,
    ).setOrigin(0.5, 0.5);
    this.root.add(footer);

    new FocusRing(this, this.focus);
    bindFocusKeys(this, this.focus);
    this.focus.focus('resume');

    if (!reducedMotion()) {
      this.scrim.setAlpha(0);
      this.tweens.add({ targets: this.scrim, alpha: 1, duration: tokens.motion.scrim.ms });
      this.root.setScale(0.9).setAlpha(0);
      this.root.setPosition(480 * 0.1, 270 * 0.1);
      this.tweens.add({
        targets: this.root,
        scale: 1,
        x: 0,
        y: 0,
        alpha: 1,
        duration: tokens.motion.panelOpen.ms,
        ease: tokens.motion.panelOpen.ease,
      });
    }

    window.__pause = {
      ready: true,
      resuming: () => this.resumingNow,
      focused: () => this.focus.current?.id ?? null,
      rect: (id) => rects[id] ?? null,
      footer: footerText,
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.__pause = undefined;
    });
  }

  private confirmRestart(): void {
    if (this.resumingNow || modalOpen()) return;
    ConfirmModal.open(this, {
      title: t('pause.restart'),
      body: t('save.startNew'),
      confirm: t('pause.restart'),
      cancel: t('modal.cancel'),
      style: 'destructive',
      focus: this.focus,
      onConfirm: () => this.link.restart(),
    });
  }

  /** DR-171 resume: scrim out, then the ready delay; input is ignored meanwhile. */
  resume(): void {
    if (this.resumingNow || modalOpen()) return;
    this.resumingNow = true;
    this.focus.enabled = false;
    const reduced = reducedMotion();
    this.root.setVisible(false);
    if (!reduced) this.tweens.add({ targets: this.scrim, alpha: 0, duration: SCRIM_OUT_MS });
    else this.scrim.setVisible(false);
    const wait = (reduced ? 0 : SCRIM_OUT_MS) + (reduced ? READY_MS_REDUCED : READY_MS);
    // DR-171: the ready delay is real time, not scene time (which slows on slow frames).
    const id = window.setTimeout(() => this.link.resumePlay(), wait);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.clearTimeout(id));
  }
}
