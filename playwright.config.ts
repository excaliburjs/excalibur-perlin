import { defineConfig, devices } from '@playwright/test';

// Overridable so several excalibur plugin repos' e2e suites can run side by side on one
// machine without silently attaching to each other's dev server (reuseExistingServer below
// would not notice). CI leaves it unset and gets core's 4173.
const port = Number(process.env.EX_E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  // Mirrors excalibur core's e2e config. 2 workers is a reasonable balance of speed vs.
  // stability on software-rendered (swiftshader) CI runners - override with --workers
  // locally if your machine has more headroom.
  workers: 2,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: 'off',
    trace: 'off'
  },
  webServer: {
    command: `npx vite example --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Rendering-consistency args copied verbatim from excalibur core - these are why
        // baselines reproduce across machines/OSes.
        launchOptions: {
          ignoreDefaultArgs: ['--disable-render-backgrounding', '--disable-remote-fonts', '--font-render-hinting'],
          args: [
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-dev-shm-usage',
            '--disable-renderer-backgrounding',
            '--disable-device-discovery-notifications',
            '--autoplay-policy=no-user-gesture-required',
            '--mute-audio',
            '--force-device-scale-factor=1',
            '--use-gl=swiftshader'
          ]
        }
      }
    }
  ]
});
