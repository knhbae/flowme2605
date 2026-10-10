import base from './cloudflare-release.config';
import path from 'node:path';
const phase = process.env.FLOWME_UX_COMPARE ?? 'after';
if (!['before', 'after'].includes(phase)) throw Error('ux-compare-phase-rejected');
const run = process.env.FLOWME_UX_RUN ?? 'verified';
if (!/^[a-z0-9-]{1,40}$/.test(run)) throw Error('ux-compare-run-rejected');
export default { ...base, testMatch: 'ux-journey.browser.ts',
  reporter: [['list'], ['json', { outputFile: path.resolve(`output/playwright/ux-journey-${phase}-${run}/results.json`) }]],
  outputDir: path.resolve(`output/playwright/ux-journey-${phase}-${run}/artifacts`) };
