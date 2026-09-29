import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    baseURL: 'http://127.0.0.1:5173',
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
