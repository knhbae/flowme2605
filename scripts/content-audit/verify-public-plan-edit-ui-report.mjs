import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const repoRoot = process.cwd();
const baseUrl = process.env.FLOWME_REPORT_BASE_URL ?? 'http://127.0.0.1:4202';
const reportPath = '/docs/content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html';
const assetRoot = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-08-12-public-plan-edit-surface-unification-ui-review-assets',
);
const screenshotRoot = path.join(assetRoot, 'report-render');
const renderCheckPath = path.join(assetRoot, 'render-check.json');
const manifestPath = path.join(assetRoot, 'capture-manifest.json');
const viewports = [
  { label: '390', width: 390, height: 844, screenshot: true },
  { label: '1024', width: 1024, height: 900, screenshot: false },
  { label: '1440', width: 1440, height: 1000, screenshot: true },
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
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
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

    const response = await page.goto(`${baseUrl}${reportPath}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Report returned ${response?.status() ?? 'no response'}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.scrollTo(0, 0);
    });

    const inspection = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const brokenImages = Array.from(document.images)
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src'));
      const missingAltImages = Array.from(document.images)
        .filter((image) => !image.hasAttribute('alt'))
        .map((image) => image.getAttribute('src'));
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        imageCount: document.images.length,
        brokenImages,
        missingAltImages,
        duplicateIds,
        replacementCharacters: (document.body.innerText.match(/\uFFFD/gu) ?? []).length,
        horizontalOverflow: Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
        documentHeight: document.documentElement.scrollHeight,
        localLinks: Array.from(document.querySelectorAll('a[href]'))
          .map((anchor) => anchor.href)
          .filter((href) => href.startsWith(window.location.origin) && !href.includes('#')),
      };
    });

    const localLinkStatuses = [];
    for (const href of [...new Set(inspection.localLinks)]) {
      const linkResponse = await context.request.get(href);
      localLinkStatuses.push({ href, status: linkResponse.status() });
    }

    if (viewport.screenshot) {
      await page.screenshot({
        path: path.join(screenshotRoot, `report-${viewport.label}.png`),
        fullPage: false,
        animations: 'disabled',
      });
    }
    results.push({
      viewport: { width: viewport.width, height: viewport.height },
      httpStatus: response.status(),
      ...inspection,
      localLinkStatuses,
      pageErrors,
      consoleErrors,
      failedRequests,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const failures = results.flatMap((result) => [
  ...(result.httpStatus === 200 ? [] : [`${result.viewport.width}: HTTP ${result.httpStatus}`]),
  ...(result.horizontalOverflow <= 1 ? [] : [`${result.viewport.width}: overflow ${result.horizontalOverflow}`]),
  ...(result.replacementCharacters === 0 ? [] : [`${result.viewport.width}: replacement characters`]),
  ...(result.brokenImages.length === 0 ? [] : [`${result.viewport.width}: broken images`]),
  ...(result.missingAltImages.length === 0 ? [] : [`${result.viewport.width}: missing image alt`]),
  ...(result.duplicateIds.length === 0 ? [] : [`${result.viewport.width}: duplicate ids`]),
  ...(result.pageErrors.length === 0 ? [] : [`${result.viewport.width}: page errors`]),
  ...(result.consoleErrors.length === 0 ? [] : [`${result.viewport.width}: console errors`]),
  ...(result.failedRequests.length === 0 ? [] : [`${result.viewport.width}: failed requests`]),
  ...(result.localLinkStatuses.every((link) => link.status === 200)
    ? []
    : [`${result.viewport.width}: broken local links`]),
]);
const renderCheck = {
  artifact: `.${reportPath}`,
  checkedAt: new Date().toISOString(),
  baseUrl,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  failures,
  results,
};
await fs.writeFile(renderCheckPath, `${JSON.stringify(renderCheck, null, 2)}\n`, 'utf8');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.status = failures.length === 0 ? 'captured_and_report_verified' : 'report_verification_failed';
manifest.reportRenderCheck = {
  file: 'render-check.json',
  status: renderCheck.status,
  viewports: viewports.map(({ width, height }) => ({ width, height })),
};
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({
  status: renderCheck.status,
  failures,
  renderCheckPath,
}, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
