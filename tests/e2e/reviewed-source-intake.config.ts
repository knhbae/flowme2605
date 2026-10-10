import path from 'node:path';
import { existsSync } from 'node:fs';
import base from './cloudflare-release.config';
const phase = process.env.FLOWME_REVIEWED_SOURCE_QA_PHASE;
if (!phase || !/^[a-z0-9-]{1,32}$/.test(phase)) throw Error('reviewed-source-phase-required');
const out = path.resolve(`output/playwright/reviewed-source-intake-20261010/${phase}`);
if (existsSync(path.join(out, 'results.json'))) throw Error('reviewed-source-output-preserved');
export default { ...base, testMatch: 'reviewed-source-intake.browser.ts', retries: 0, workers: 1, timeout: 60_000,
  projects: [[1440,900],[390,844]].map(([width,height]) => ({ name: `${width}x${height}`, use: { viewport: {width,height} } })),
  use: { ...base.use, timezoneId: 'Asia/Seoul' }, reporter: [['list'],['json',{outputFile:path.join(out,'results.json')}]],
  outputDir: path.join(out,'artifacts') };
