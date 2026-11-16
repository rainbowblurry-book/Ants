import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { buildThemeCss, resolveSemanticColors, type ThemeJson } from './tools/gen-theme.ts';

const themePath = fileURLToPath(new URL('./src/ui/theme.json', import.meta.url));

/**
 * The splash, rotate and fatal shells live inline in index.html so they work
 * before (and without) the bundle (DR-012, DR-175). They may not contain
 * colour literals (DR-088), so the token values are injected here:
 *   - the theme-vars marker comment becomes the :root variable block
 *   - {{theme:NAME}} becomes the hex of semantic colour NAME
 */
function themeHtml(): Plugin {
  return {
    name: 'ants-theme-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const theme = JSON.parse(readFileSync(themePath, 'utf8')) as ThemeJson;
        const colors = resolveSemanticColors(theme);
        return html
          .replace('/*@theme-vars*/', buildThemeCss(theme))
          .replace(/\{\{theme:([a-z0-9-]+)\}\}/g, (_m, name: string) => {
            const c = colors[name];
            if (!c) throw new Error(`index.html: unknown theme colour "${name}"`);
            return c.hex;
          });
      },
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the game from /Ants/ (DR-017). CI sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [themeHtml()],
  build: {
    target: 'es2022',
    // Phaser 3.90 is one ~1.2 MB module; it is the game engine, not bloat.
    chunkSizeWarningLimit: 1600,
  },
  server: { host: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
