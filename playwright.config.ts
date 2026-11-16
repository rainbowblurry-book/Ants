import { defineConfig } from '@playwright/test';

// The same base path the build used (CI builds for GitHub Pages at /Ants/, DR-017).
const base = process.env.BASE_PATH ?? '/';
const port = 4173;

/** The three target viewports (UI.md §6 check 4, DR-192). */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${port}${base}`,
    trace: 'off',
    launchOptions: {
      // CI has no GPU. Ask for the software WebGL path by name, so a browser
      // update cannot silently drop the game to the Canvas renderer.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {
      name: 'phone-844x390',
      use: {
        browserName: 'chromium',
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'phone-667x375',
      use: {
        browserName: 'chromium',
        viewport: { width: 667, height: 375 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1280x720',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
