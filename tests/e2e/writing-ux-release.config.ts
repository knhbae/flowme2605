import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';

const mode = process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local';
if (!['local', 'remote-readonly'].includes(mode)) throw Error('writing-ux-release-mode-rejected');
const run = process.env.FLOWME_WRITING_UX_RELEASE_RUN ?? 'candidate';
if (!/^[a-z0-9-]{1,50}$/.test(run)) throw Error('writing-ux-release-run-rejected');
const directory = path.resolve(`output/playwright/writing-ux-release-${mode}-${run}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('writing-ux-release-run-already-recorded');

// No launcher, build or server replacement. Remote mode delegates only the
// reviewed fixed-origin GET assets; the existing fixture synthesizes all APIs.
export default { ...base, testMatch: ['writing-ux-release.browser.ts', 'writing-interactions.browser.ts'], timeout: 120_000,
  use: { ...base.use, actionTimeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]],
  outputDir: path.join(directory, 'artifacts') };
