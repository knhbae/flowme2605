import { defineConfig, devices } from '@playwright/test';

const port = 3104;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
  },
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://127.0.0.1:${port}/flows`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
