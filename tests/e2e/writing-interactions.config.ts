import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';

if ((process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') !== 'local') throw Error('writing-interactions-local-synthetic-only');
const run = process.env.FLOWME_WRITING_INTERACTIONS_RUN ?? 'candidate';
if (!/^[a-z0-9-]{1,50}$/.test(run)) throw Error('writing-interactions-run-rejected');
const directory = path.resolve(`output/playwright/writing-interactions-${run}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('writing-interactions-run-already-recorded');

// The inherited configuration does not start, build or replace an app process.
// Its only asset source is the separately owned synthetic loopback server.
export default { ...base, testMatch: 'writing-interactions.browser.ts', timeout: 120_000,
  use: { ...base.use, actionTimeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]],
  outputDir: path.join(directory, 'artifacts') };
