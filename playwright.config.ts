import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    // Dev server never exercises prod-only next.config.ts flags (e.g.
    // cacheComponents), so CI runs against a real production build.
    command: process.env.CI ? 'bun run build && bun run start' : 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 120_000,
  },
})
