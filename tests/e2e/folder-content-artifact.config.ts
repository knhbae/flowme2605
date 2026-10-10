import base from './cloudflare-release.config';
import path from 'node:path';
import { existsSync } from 'node:fs';
const run = process.env.FLOWME_FOLDER_ARTIFACT_RUN ?? 'final-v1';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('artifact-run-rejected');
const directory = path.resolve(`output/playwright/folder-content-artifact-${run}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('artifact-run-already-recorded');
export default { ...base, testMatch: 'folder-content-artifact.browser.ts', retries: 0, workers: 1,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3114' },
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]],
  outputDir: path.join(directory, 'artifacts') };
