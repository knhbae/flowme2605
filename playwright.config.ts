import { defineConfig, devices } from '@playwright/test';
import { browserOwnership, browserSpecPatterns } from './tests/e2e/owner-manifest';

const requestedPort = Number.parseInt(process.env.FLOWME_PLAYWRIGHT_PORT ?? '3104', 10);
const port = Number.isFinite(requestedPort) ? requestedPort : 3104;
const { groups } = browserOwnership();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ]
    : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Windows fallback keeps the original local-dev behavior; elsewhere leave
      // undefined so Playwright uses its own managed browser (npx playwright install).
      executablePath:
        process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
        (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
    },
  },
  projects: [
    {
      name: 'current-and-artifacts',
      testMatch: browserSpecPatterns([...groups.operating, ...groups.program, ...groups['historical-artifact'], ...groups['historical-standalone']]),
      use: { baseURL: `http://127.0.0.1:${port}` },
    },
    {
      name: 'historical-surface',
      testMatch: browserSpecPatterns(groups['historical-surface']),
      use: { baseURL: 'http://127.0.0.1:3695' },
    },
  ],
  webServer: [{
    command: `npm run start -- -p ${port}`,
    url: `http://127.0.0.1:${port}/flows`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  }, {
    cwd: process.cwd(),
    command: 'node node_modules/next/dist/bin/next start tests/e2e/historical-app -p 3695 -H 127.0.0.1',
    url: 'http://127.0.0.1:3695/historical-health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  }],
});
