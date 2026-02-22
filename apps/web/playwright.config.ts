import { defineConfig, devices } from '@playwright/test';

const useExistingWeb = process.env.USE_EXISTING_WEB === 'true';
// Allow overriding baseURL for container runs (e.g., host.docker.internal)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
// Isolate rate limiting per test run
const runId = `pw-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;

export default defineConfig({
  // Our tests live under tests/e2e
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'X-Test-Run-Id': runId,
    },
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // In container-first flows we often have web running already.
  // Allow skipping the dev server to reuse the existing one.
  ...(useExistingWeb
    ? {}
    : {
        webServer: {
          command: 'pnpm run dev',
          port: 3000,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
