import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const repoRoot = process.cwd();
const baseUrl = process.env.FLOWME_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3202';
const assetRoot = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-08-12-public-plan-edit-surface-unification-ui-review-assets',
);
const screenshotRoot = path.join(assetRoot, 'screenshots');
const manifestPath = path.join(assetRoot, 'capture-manifest.json');

const captures = [
  {
    file: 'ordinary-mobile-plan.png',
    route: '/f/curated-allblanc-no-jump-cardio',
    viewport: { width: 390, height: 844 },
    state: 'public shared Plan editor open',
    prepare: async (page) => {
      await page.getByTestId('public-flow-adjust-entry-mobile').click();
      await page.getByTestId('public-flow-personal-adjustment').waitFor();
    },
  },
  {
    file: 'map-mobile-plan.png',
    route: '/flow-maps/middle-school-math-1',
    viewport: { width: 390, height: 844 },
    state: 'flattened save_all shared Plan editor open',
    prepare: async (page) => {
      await page.getByTestId('flow-map-adjust-save-mobile').click();
      await page.getByTestId('public-flow-personal-adjustment').waitFor();
    },
  },
  {
    file: 'map-mobile-item.png',
    route: '/flow-maps/middle-school-math-1',
    viewport: { width: 390, height: 844 },
    state: 'flattened save_all shared Item editor open',
    prepare: async (page) => {
      await page.getByTestId('flow-map-adjust-save-mobile').click();
      const plan = page.getByTestId('public-flow-personal-adjustment');
      await plan.getByTestId('public-flow-adjustment-kind-items').click();
      await plan.getByTestId('public-flow-adjustment-item-edit').first().click();
      await page.getByTestId('public-flow-item-editor').waitFor();
    },
  },
  {
    file: 'map-mobile-dirty.png',
    route: '/flow-maps/middle-school-math-1',
    viewport: { width: 390, height: 844 },
    state: 'dirty browser Back discard confirmation open',
    prepare: async (page) => {
      await page.getByTestId('flow-map-adjust-save-mobile').click();
      const plan = page.getByTestId('public-flow-personal-adjustment');
      await plan.getByTestId('public-flow-adjustment-name-input').fill('시험 전 핵심 단원 계획');
      await page.evaluate(() => window.history.back());
      await plan.getByTestId('flow-editor-discard-prompt').waitFor();
    },
  },
  {
    file: 'opic-mobile-chooser.png',
    route: '/flow-maps/curated-opic-mock-course',
    viewport: { width: 390, height: 844 },
    state: 'choose_child gateway visible',
    prepare: async (page) => {
      const chooser = page.getByTestId('flow-map-choose-child');
      await chooser.waitFor();
      await chooser.evaluate((element) => element.scrollIntoView({
        block: 'center',
        behavior: 'instant',
      }));
    },
  },
  {
    file: 'map-desktop-plan.png',
    route: '/flow-maps/middle-school-math-1',
    viewport: { width: 1440, height: 1000 },
    state: 'flattened save_all shared Plan workspace open',
    prepare: async (page) => {
      await page.getByTestId('flow-map-adjust-save').click();
      await page.getByTestId('public-flow-personal-adjustment').waitFor();
    },
  },
];

await fs.mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    ?? (process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : undefined),
});
const results = [];

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      locale: 'ko-KR',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim());
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.origin === baseUrl && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    const response = await page.goto(`${baseUrl}${capture.route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      throw new Error(`${capture.route} returned ${response?.status() ?? 'no response'}`);
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await capture.prepare(page);
    await page.waitForTimeout(250);

    const outputPath = path.join(screenshotRoot, capture.file);
    await page.screenshot({
      path: outputPath,
      fullPage: false,
      animations: 'disabled',
    });
    const bytes = await fs.readFile(outputPath);
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      replacementCharacters: (document.body.innerText.match(/\uFFFD/gu) ?? []).length,
    }));

    results.push({
      file: `screenshots/${capture.file}`,
      route: capture.route,
      viewport: capture.viewport,
      state: capture.state,
      status: 'captured',
      httpStatus: response.status(),
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      dimensions,
      pageErrors,
      consoleErrors,
      failedRequests,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const feedbackSources = await Promise.all([
  {
    file: 'feedback-ordinary-public.jpg',
    evidence: 'user-provided ordinary public Flow screenshot',
  },
  {
    file: 'feedback-map-legacy.jpg',
    evidence: 'user-provided Flow Map screenshot',
  },
].map(async (entry) => {
  const bytes = await fs.readFile(path.join(assetRoot, entry.file));
  return {
    ...entry,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  };
}));

const manifest = {
  artifact: 'docs/content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html',
  status: 'captured_pending_report_render_check',
  capturedAt: new Date().toISOString(),
  baseUrl,
  evidenceBoundary: {
    environment: 'local implementation',
    automatedQa: 'internal QA only',
    observedUsers: 0,
    publication: 'not authorized',
  },
  feedbackSources,
  captures: results,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ manifestPath, captures: results.length }, null, 2)}\n`);
