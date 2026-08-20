import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No `webServer` block. `astro preview` starts a background daemon and the
  // foreground process returns immediately, which Playwright reads as the
  // server having "exited early" and refuses to run. The npm script owns the
  // server lifecycle instead — see `pretest:e2e` / `posttest:e2e`.
});
