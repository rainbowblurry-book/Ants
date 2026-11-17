import * as Phaser from 'phaser';
import { buildGameConfig, REG_RENDER_SCALE } from './boot/config';
import { parseScaleOverride, pickRenderScale } from './boot/renderScale';
import { t } from './i18n';
import { Battle } from './scenes/Battle';
import { UiLab } from './scenes/UiLab';
import { LayoutService, REG_LAYOUT } from './ui/layout';
import { font } from './ui/theme';

declare global {
  interface Window {
    /** Set by the inline script in index.html (DR-175). */
    __antsFatal?: (detail: unknown, body?: string) => void;
    /** Test hook for Playwright. */
    __ants?: { game: Phaser.Game; renderScale: number; layout: LayoutService };
  }
}

/** DR-018: the page never zooms, scrolls or bounces. */
function blockBrowserGestures(): void {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('gesturestart', stop);
  document.addEventListener('dblclick', stop);
}

/** Canvas text needs the web fonts to be ready before the first draw. */
async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`400 56px "${font.display}"`),
    document.fonts.load(`700 22px "${font.body}"`),
    document.fonts.load(`800 18px "${font.body}"`),
  ]);
}

function hideSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.setAttribute('aria-busy', 'false');
  splash.classList.add('is-leaving');
  window.setTimeout(() => {
    splash.hidden = true;
  }, 250);
}

/**
 * Stage 4 starts the Battle scene directly. `?scene=uilab` opens the UI
 * foundation gallery instead (dev and tests). Boot, Preload and Title arrive
 * in stage 7.
 */
function pickScenes(): Phaser.Types.Scenes.SceneType[] {
  const scene = new URLSearchParams(location.search).get('scene');
  return scene === 'uilab' ? [UiLab] : [Battle];
}

async function boot(): Promise<void> {
  blockBrowserGestures();
  await loadFonts();

  // Performance mode arrives with Settings (stage 7). Until then it is off.
  const s = parseScaleOverride(location.search) ?? pickRenderScale(window.devicePixelRatio, false);

  const game = new Phaser.Game({
    ...buildGameConfig(s, pickScenes()),
    callbacks: {
      // Before any scene starts, so every scene can read S.
      preBoot: (g) => g.registry.set(REG_RENDER_SCALE, s),
    },
  });
  game.canvas.setAttribute('aria-label', t('a11y.canvas'));
  const layout = new LayoutService(s, () => game.canvas);
  layout.start();
  game.registry.set(REG_LAYOUT, layout);
  game.events.once('battle-ready', hideSplash);
  game.events.once('uilab-ready', hideSplash);
  window.__ants = { game, renderScale: s, layout };
}

boot().catch((err: unknown) => {
  window.__antsFatal?.(err instanceof Error ? (err.stack ?? err.message) : err);
});
