import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'integrated-product-poc-portable.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: '../../output/playwright/portable-program',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3694' },
  webServer: { command: 'npm run start -- -p 3694 -H 127.0.0.1', url: 'http://127.0.0.1:3694/flows', reuseExistingServer: false, timeout: 60_000 },
});
