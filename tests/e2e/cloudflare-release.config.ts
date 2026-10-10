import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const mode = process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local';
if (mode !== 'local' && mode !== 'remote-readonly') throw Error('cloudflare-qa-mode-rejected');

// No webServer: the reviewed launcher is owned by the release operator. This
// suite cannot start, stop, build or replace either the QA or serving process.
export default defineConfig({
  testDir: '.', testMatch: 'cloudflare-release.browser.ts', timeout: 60_000,
  expect: { timeout: 8_000 }, workers: 1, retries: 0,
  reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/cloudflare-release-${mode}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/cloudflare-release-${mode}/artifacts`),
  use: {
    ...devices['Desktop Chrome'], baseURL: 'https://alpha.wikiplans.com',
    serviceWorkers: 'block', trace: 'off', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) },
  },
  projects: [[390, 844], [375, 812], [844, 390], [1024, 768], [1440, 900]].map(([width, height]) => ({
    name: `${width}x${height}`, use: { viewport: { width, height } },
  })),
});
