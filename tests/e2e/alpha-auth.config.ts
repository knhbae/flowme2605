import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Isolated mocked-HTTP browser QA. Never inherits production keys or other E2E servers.
export default defineConfig({
  testDir: '.', testMatch: 'alpha-auth.browser.ts', timeout: 45_000,
  expect: { timeout: 8_000 }, workers: 1, retries: 0,
  reporter: [['list'], ['json', { outputFile: path.resolve(process.cwd(), 'output/playwright/alpha-m2/results.json') }]],
  outputDir: '../../output/playwright/alpha-m2/artifacts',
  use: {
    ...devices['Desktop Chrome'], baseURL: 'http://localhost:3104',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) },
  },
  webServer: {
    cwd: process.cwd(),
    command: 'node node_modules/next/dist/bin/next start -p 3104 -H 127.0.0.1',
    url: 'http://127.0.0.1:3104/alpha', reuseExistingServer: false, timeout: 90_000,
    env: {
      FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'test',
      FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
      FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
      FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_m2_ui_fixture',
      FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback',
      VERCEL_ENV: 'development',
    },
  },
});
