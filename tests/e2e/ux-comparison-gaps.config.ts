import { defineConfig } from '@playwright/test';
import path from 'node:path';
const label = process.env.FLOWME_UX_COMPARISON_LABEL ?? 'candidate';
if (!/^(baseline|candidate|smoke)(-[a-z0-9]+)*$/.test(label)) throw Error('comparison-label-rejected');
const mode = process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local';
if (!['local', 'remote-readonly'].includes(mode)) throw Error('comparison-mode-rejected');
if (label.startsWith('candidate') && (mode !== 'local' || process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT !== '3107'))
  throw Error('comparison-candidate-requires-local-3107');
export default defineConfig({
  testDir: '.', testMatch: 'ux-comparison-gaps.browser.ts', timeout: 60_000, workers: 1, retries: 0,
  expect: { timeout: 8_000 }, reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/ux-comparison-${label}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/ux-comparison-${label}/artifacts`),
  use: { baseURL: 'https://alpha.wikiplans.com', serviceWorkers: 'block', trace: 'off', screenshot: 'only-on-failure',
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  projects: [[390,844],[375,812],[844,390],[1024,768],[1440,900]].map(([width,height]) => ({ name: `${width}x${height}`, use: { viewport: { width,height } } })),
});
