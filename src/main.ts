import * as Phaser from 'phaser';
import { buildGameConfig, REG_RENDER_SCALE } from './boot/config';
import { parseScaleOverride, pickRenderScale } from './boot/renderScale';
import { SpikeHud, SpikeWorld } from './scenes/Spike';
import { font } from './ui/theme';

declare global {
  interface Window {
    /** Set by the inline script in index.html (DR-175). */
    __antsFatal?: (detail: unknown, body?: string) => void;
    /** Test hook for Playwright. */
    __ants?: { game: Phaser.Game; renderScale: number };
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

async function boot(): Promise<void> {
  blockBrowserGestures();
  await loadFonts();

  // Performance mode arrives with Settings (stage 7). Until then it is off.
  const s = parseScaleOverride(location.search) ?? pickRenderScale(window.devicePixelRatio, false);

  const game = new Phaser.Game({
    ...buildGameConfig(s, [SpikeWorld, SpikeHud]),
    callbacks: {
      // Before any scene starts, so every scene can read S.
      preBoot: (g) => g.registry.set(REG_RENDER_SCALE, s),
    },
  });
  game.canvas.setAttribute('aria-label', 'ANTS! game');
  game.events.once('spike-ready', hideSplash);
  window.__ants = { game, renderScale: s };
}

boot().catch((err: unknown) => {
  window.__antsFatal?.(err instanceof Error ? (err.stack ?? err.message) : err);
});
