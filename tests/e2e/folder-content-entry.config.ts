import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';

const mode = process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local';
if (mode !== 'local' && mode !== 'remote-readonly') throw Error('folder-content-entry-mode-rejected');
const run = process.env.FLOWME_FOLDER_CONTENT_ENTRY_RUN ?? 'candidate';
if (!/^[a-z0-9-]{1,50}$/.test(run)) throw Error('folder-content-entry-run-rejected');
const directory = path.resolve(`output/playwright/folder-content-entry-${run}-${mode}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('folder-content-entry-run-already-recorded');

// The release operator owns build/start/stop. The shared fixture forwards only
// fixed QA3106 or fixed release-origin GET documents/static assets. Auth/API
// interactions remain synthetic in both modes; telemetry is never forwarded.
export default { ...base, testMatch: 'folder-content-entry.browser.ts', timeout: 120_000,
  retries: 0, workers: 1, use: { ...base.use, actionTimeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]],
  outputDir: path.join(directory, 'artifacts') };
