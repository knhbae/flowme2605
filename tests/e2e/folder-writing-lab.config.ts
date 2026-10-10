import base from './cloudflare-release.config';
import path from 'node:path';

const run = process.env.FLOWME_FOLDER_LAB_RUN ?? 'verified';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('folder-lab-run-rejected');
// Uses the root-owned loopback server. Never starts or stops a server.
export default { ...base, testMatch: 'folder-writing-lab.browser.ts', timeout: 90_000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3110' },
  reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/folder-writing-lab-${run}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/folder-writing-lab-${run}/artifacts`),
};
