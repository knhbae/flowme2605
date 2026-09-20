import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from '../../playwright.config';
import { browserOwnership, browserSpecPatterns } from './owner-manifest';

export default defineConfig({
  ...base,
  projects: undefined,
  testDir: '.',
  testMatch: browserSpecPatterns(browserOwnership().groups['historical-surface']),
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: path.resolve(process.cwd(), process.env.FLOWME_HISTORICAL_REPORT ?? 'output/playwright/historical-surface-summary.json') }]],
  outputDir: '../../output/playwright/historical-surface',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3695' },
  webServer: {
    cwd: process.cwd(),
    command: 'node node_modules/next/dist/bin/next start tests/e2e/historical-app -p 3695 -H 127.0.0.1',
    url: 'http://127.0.0.1:3695/historical-health',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
