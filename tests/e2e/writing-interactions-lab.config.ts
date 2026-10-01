import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';

const run = process.env.FLOWME_WRITING_LAB_RUN ?? 'candidate';
if (!/^[a-z0-9-]{1,50}$/.test(run)) throw Error('writing-lab-run-rejected');
const directory = path.resolve(`output/playwright/writing-interactions-lab-${run}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('writing-lab-run-already-recorded');

// Every document request is fulfilled from the frozen generated HTML. This
// suite neither starts nor stops the user-visible loopback preview process.
export default { ...base, testMatch: 'writing-interactions-lab.browser.ts', timeout: 60_000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3113', actionTimeout: 8_000 },
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]],
  outputDir: path.join(directory, 'artifacts') };
