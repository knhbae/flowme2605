import path from 'node:path';
import base from './cloudflare-release.config';

if ((process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') !== 'local') throw Error('folder-writing-local-synthetic-only');
const run = process.env.FLOWME_FOLDER_WRITING_RUN ?? 'candidate';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('folder-writing-run-rejected');

// Reuse the five viewport projects, intercepted Auth/API and operator-owned
// server. Loading this configuration never starts or replaces an app process.
export default { ...base, testMatch: 'folder-writing.browser.ts', timeout: 90_000,
  use: { ...base.use, actionTimeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/folder-writing-${run}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/folder-writing-${run}/artifacts`) };
