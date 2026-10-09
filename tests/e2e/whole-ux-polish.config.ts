import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';
const phase = process.env.FLOWME_UX_POLISH_PHASE;
if (!phase || !/^[a-z0-9-]{1,32}$/.test(phase)) throw Error('polish-phase-required');
const out = path.resolve(`output/playwright/whole-ux-visual-polish-20261009/${phase}`);
if (existsSync(path.join(out, 'results.json'))) throw Error('polish-output-already-exists');
export default { ...base, testMatch: 'whole-ux-polish.browser.ts', retries: 0, workers: 1, timeout: 60_000,
  use: { ...base.use, timezoneId: 'Asia/Seoul' },
  projects: [[390,844],[1024,768],[1440,900]].map(([width,height]) => ({ name: `${width}x${height}`, use: { viewport: { width,height } } })),
  reporter: [['list'],['json',{outputFile:path.join(out,'results.json')}]], outputDir:path.join(out,'artifacts') };
