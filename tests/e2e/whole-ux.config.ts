import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';
const run = process.env.FLOWME_WHOLE_UX_RUN ?? 'first';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('whole-ux-run-rejected');
const directory = path.resolve(`output/playwright/whole-ux/browser-${run}`);
if (existsSync(path.join(directory, 'results.json'))) throw Error('whole-ux-run-already-recorded');
export default { ...base, testMatch: 'whole-ux-*.browser.ts', timeout: 90_000, retries: 0, workers: 1,
  use: { ...base.use, actionTimeout: 10_000, timezoneId: 'Asia/Seoul' },
  projects: [[1440, 900], [390, 844], [1024, 768]].map(([width, height]) => ({ name: `${width}x${height}`, use: { viewport: { width, height } } })),
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'results.json') }]], outputDir: path.join(directory, 'artifacts') };
