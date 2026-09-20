import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Current production surface only. Historical assertions have their own owner
// in the full E2E configuration and are never counted as Program coverage.
export default defineConfig({
  ...base,
  projects: undefined,
  testDir: '.',
  testMatch: 'integrated-product-poc-*-merge.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir: '../../output/playwright/current-merge',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3104' },
  webServer: { command: 'npm run start -- -p 3104 -H 127.0.0.1', url: 'http://127.0.0.1:3104/flows', reuseExistingServer: true, timeout: 60_000 },
});
