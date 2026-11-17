/**
 * DEV SCENE (`?scene=uilab`): the stage 4 UI foundation on one screen, for
 * review screenshots and the e2e checks. Not part of the game's screen map.
 * Every label here is a string from the locale file.
 */
import * as Phaser from 'phaser';
import { applyLogicalCamera, REG_RENDER_SCALE } from '../boot/config';
import type { RenderScale } from '../boot/renderScale';
import { t } from '../i18n';
import { image, loadSharedAssets } from '../ui/assets';
import { ConfirmModal, modalOpen } from '../ui/ConfirmModal';
import { Button, bindFocusKeys, FocusRing, IconButton, Panel } from '../ui/components';
import { FocusManager } from '../ui/focus';
import { BitmapLabel, bodyText } from '../ui/text';
import { color, cssColor } from '../ui/theme';

export const UILAB_KEY = 'uilab';

export interface UiLabHook {
  ready: boolean;
  activations: Record<string, number>;
  focused(): string | null;
  ringVisible(): boolean;
  modalOpen(): boolean;
  /** Logical rect of a component by id. */
  rect(id: string): { x: number; y: number; w: number; h: number } | null;
  lastModalResult: string | null;
}

declare global {
  interface Window {
    __uilab?: UiLabHook;
  }
}

export class UiLab extends Phaser.Scene {
  private focus = new FocusManager();

  constructor() {
    super(UILAB_KEY);
  }

  preload(): void {
    loadSharedAssets(this);
  }

  create(): void {
    const s = this.registry.get(REG_RENDER_SCALE) as RenderScale;
    const cam = this.cameras.main;
    cam.setBackgroundColor(cssColor['ink-soft']);
    applyLogicalCamera(cam, s, 1);
    this.focus = new FocusManager();

    const activations: Record<string, number> = {};
    const hook: UiLabHook = {
      ready: false,
      activations,
      focused: () => this.focus.current?.id ?? null,
      ringVisible: () => this.focus.ringVisible,
      modalOpen: () => modalOpen(),
      rect: (id) => rects[id] ?? null,
      lastModalResult: null,
    };
    const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const count = (id: string) => () => {
      activations[id] = (activations[id] ?? 0) + 1;
    };

    // Type samples (DR-081).
    new BitmapLabel(this, 16, 12, 'ANTS!', 'display', color.secondary, color.ink);
    new BitmapLabel(this, 210, 20, t('pause.title'), 'title', color.panel);
    new BitmapLabel(this, 210, 64, '+3 90° 100%', 'numeral', color['meaning-white'], color.ink);

    // Panel with body and caption text.
    const panel = { x: 16, y: 112, w: 392, h: 112 };
    new Panel(this, panel);
    bodyText(
      this,
      panel.x + 16,
      panel.y + 16,
      t('save.offTitle'),
      'body',
      cssColor.ink,
      panel.w - 32,
    );
    bodyText(
      this,
      panel.x + 16,
      panel.y + 72,
      t('save.offBody'),
      'caption',
      cssColor.ink,
      panel.w - 32,
    );

    // Buttons: every variant at md, plus lg and xl.
    const variants = ['primary', 'secondary', 'info', 'destructive', 'disabled'] as const;
    const labels = [
      t('pause.resume'),
      t('pause.settings'),
      t('save.back'),
      t('pause.restart'),
      t('pause.quit'),
    ];
    variants.forEach((variant, i) => {
      const id = `btn-${variant}`;
      const r = { x: 432 + (i % 2) * 248, y: 112 + Math.floor(i / 2) * 80, w: 232, h: 64 };
      rects[id] = r;
      new Button(this, {
        id,
        rect: r,
        label: labels[i] ?? '',
        variant,
        focus: this.focus,
        onActivate: count(id),
      });
    });
    const lg = { x: 680, y: 272, w: 264, h: 72 };
    rects['btn-lg'] = lg;
    new Button(this, {
      id: 'btn-lg',
      rect: lg,
      label: t('save.newMatch'),
      focus: this.focus,
      onActivate: count('btn-lg'),
    });

    // Icon buttons (64 hit, 56 visual).
    const icons = [
      'ui.icon.back',
      'ui.icon.pause',
      'ui.icon.sound-on',
      'ui.icon.fullscreen-enter',
      'ui.icon.gear',
    ];
    icons.forEach((icon, i) => {
      const id = `icon-${i}`;
      const hit = { x: 16 + i * 80, y: 240, w: 64, h: 64 };
      rects[id] = hit;
      new IconButton(this, { id, hit, icon, focus: this.focus, onActivate: count(id) });
    });

    // Confirm modals: neutral and destructive (DR-172).
    const openNeutral = { x: 16, y: 456, w: 280, h: 72 };
    const openDestructive = { x: 312, y: 456, w: 280, h: 72 };
    rects['open-modal'] = openNeutral;
    rects['open-destructive'] = openDestructive;
    const open = (style: 'primary' | 'destructive') => () => {
      ConfirmModal.open(this, {
        title: style === 'primary' ? t('save.resumeTitle') : t('save.startNew'),
        body:
          style === 'primary'
            ? t('save.resumeBody', { round: 5, team: 'Blue' })
            : t('save.replaceBody', { level: 12 }),
        confirm: style === 'primary' ? t('save.resume') : t('save.startNew'),
        cancel: style === 'primary' ? t('save.newMatch') : t('modal.cancel'),
        style,
        focus: this.focus,
        onConfirm: () => {
          hook.lastModalResult = 'confirm';
        },
        onCancel: () => {
          hook.lastModalResult = 'cancel';
        },
      });
    };
    new Button(this, {
      id: 'open-modal',
      rect: openNeutral,
      label: t('save.resume'),
      variant: 'info',
      focus: this.focus,
      onActivate: open('primary'),
    });
    new Button(this, {
      id: 'open-destructive',
      rect: openDestructive,
      label: t('save.startNew'),
      variant: 'destructive',
      focus: this.focus,
      onActivate: open('destructive'),
    });

    // Badges, acorns, wind parts, placeholder weapons and ants.
    image(this, 440, 376, 'ui.badge.blue');
    image(this, 496, 376, 'ui.badge.amber');
    ['ui.acorn.filled', 'ui.acorn.empty', 'ui.acorn.gold'].forEach((k, i) => {
      image(this, 560 + i * 56, 376, k).setScale(0.4);
    });
    image(this, 440, 424, 'ui.wind.chevron').setTint(color['meaning-white']);
    image(this, 470, 424, 'ui.wind.chevron').setTint(color['info-shade']);
    image(this, 500, 424, 'ui.wind.ghost');
    ['seed', 'dewdrop', 'pollen', 'grub', 'roller', 'plop'].forEach((w, i) => {
      image(this, 560 + i * 48, 424, `weapon.icon.${w}`);
    });
    image(this, 660, 528, 'ant.side.blue.idle').setDisplaySize(88, 63);
    image(this, 780, 528, 'ant.side.amber.idle').setDisplaySize(88, 63).setFlipX(true);
    image(this, 900, 528, 'ant.hero.blue.idle').setScale(0.4);

    new FocusRing(this, this.focus);
    bindFocusKeys(this, this.focus);
    this.focus.focus('btn-primary');
    hook.ready = true;
    window.__uilab = hook;
    this.game.events.emit('uilab-ready');
  }
}
