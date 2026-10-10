import path from 'node:path';
import base from './cloudflare-release.config';

if ((process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') !== 'local') throw Error('folder-writing-regression-local-only');
const run = process.env.FLOWME_FOLDER_REGRESSION_RUN ?? 'final';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('folder-writing-regression-run-rejected');

export default { ...base, testMatch: ['ux-journey.browser.ts', 'cloudflare-release.browser.ts'],
  reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/folder-writing-regression-${run}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/folder-writing-regression-${run}/artifacts`) };
