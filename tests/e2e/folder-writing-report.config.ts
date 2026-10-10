import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = process.env.FLOWME_FOLDER_REPORT_RUN ?? new Date().toISOString().replace(/[:.]/g, '-').toLowerCase();
if (!/^[a-z0-9-]{1,50}$/.test(run)) throw Error('folder-report-run-rejected');
const runDirectory = path.resolve(`output/playwright/folder-writing-report-${run}`);
if (existsSync(path.join(runDirectory, 'results.json'))) throw Error('folder-report-run-already-recorded');

// Every request is fulfilled or blocked by the test. This configuration never
// starts, reuses, changes, or stops an app/prototype server.
export default defineConfig({
  testDir: '.',
  testMatch: 'folder-writing-report.browser.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['json', { outputFile: path.join(runDirectory, 'results.json') }]],
  outputDir: path.join(runDirectory, 'artifacts'),
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) },
    actionTimeout: 10_000,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: '390x844', use: { viewport: { width: 390, height: 844 } } },
    { name: '375x812', use: { viewport: { width: 375, height: 812 } } },
    { name: '844x390', use: { viewport: { width: 844, height: 390 } } },
    { name: '1024x768', use: { viewport: { width: 1024, height: 768 } } },
    { name: '1440x900', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
