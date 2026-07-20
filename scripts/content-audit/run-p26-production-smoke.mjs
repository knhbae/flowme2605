import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.FLOWME_PRODUCTION_URL || 'https://flowme2605.vercel.app';
const outputRoot = path.resolve(
  'docs/content-audit/2026-07-20-p26-final-review-package/production-smoke',
);
const screenshotRoot = path.join(outputRoot, 'screenshots');

const routes = [
  { route: '/', slug: 'home', expectedPrimaryNavLinkCount: 4 },
  { route: '/flows', slug: 'flows', expectedPrimaryNavLinkCount: 4 },
  { route: '/my', slug: 'my', expectedPrimaryNavLinkCount: 4 },
  { route: '/calendar', slug: 'calendar', expectedPrimaryNavLinkCount: 4 },
  { route: '/f/vehicle-inspection-prep', slug: 'vehicle', expectedPrimaryNavLinkCount: 0 },
  { route: '/f/washer-tub-clean-monthly', slug: 'washer', expectedPrimaryNavLinkCount: 0 },
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'wide', width: 1024, height: 768 },
];

await mkdir(screenshotRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    for (const scenario of routes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const response = await page.goto(`${baseUrl}${scenario.route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.locator('body').waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(2_000);

      const inspection = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const main = document.querySelector('main');
        const primaryNavLabels = ['홈', 'Flow 찾기', '캘린더', '내 Flow'];
        const visiblePrimaryNavLinks = [...document.querySelectorAll('a')]
          .filter((link) => primaryNavLabels.includes((link.textContent || '').trim()))
          .filter((link) => {
            const rect = link.getBoundingClientRect();
            const style = getComputedStyle(link);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          })
          .map((link) => (link.textContent || '').trim());
        return {
          bodyTextLength: (body?.innerText || '').trim().length,
          selectorVisible: Boolean(main || body),
          horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
          visiblePrimaryNavLinkCount: visiblePrimaryNavLinks.length,
          visiblePrimaryNavLabels: visiblePrimaryNavLinks,
        };
      });

      const screenshot = `screenshots/${viewport.name}-${scenario.slug}.png`;
      await page.screenshot({
        path: path.join(outputRoot, screenshot),
        fullPage: true,
      });

      results.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        route: scenario.route,
        expectedPrimaryNavLinkCount: scenario.expectedPrimaryNavLinkCount,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        ...inspection,
        consoleErrors,
        pageErrors,
        screenshot,
      });

      await context.close();
    }
  }
} finally {
  await browser.close();
}

const summary = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  sourceCommit: process.env.FLOWME_SOURCE_COMMIT || null,
  deploymentId: process.env.FLOWME_DEPLOYMENT_ID || null,
  routeViewportChecks: results.length,
  failedHttpCount: results.filter((entry) => !entry.status || entry.status >= 400).length,
  redirectedOffProductionCount: results.filter(
    (entry) => new URL(entry.finalUrl).hostname !== new URL(baseUrl).hostname,
  ).length,
  selectorMissingCount: results.filter((entry) => !entry.selectorVisible).length,
  primaryNavMismatchCount: results.filter(
    (entry) => entry.visiblePrimaryNavLinkCount !== entry.expectedPrimaryNavLinkCount,
  ).length,
  horizontalOverflowCount: results.filter((entry) => entry.horizontalOverflow > 1).length,
  consoleErrorCount: results.reduce((count, entry) => count + entry.consoleErrors.length, 0),
  pageErrorCount: results.reduce((count, entry) => count + entry.pageErrors.length, 0),
  results,
};

await writeFile(path.join(outputRoot, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const failed =
  summary.failedHttpCount > 0 ||
  summary.redirectedOffProductionCount > 0 ||
  summary.selectorMissingCount > 0 ||
  summary.primaryNavMismatchCount > 0 ||
  summary.horizontalOverflowCount > 0 ||
  summary.consoleErrorCount > 0 ||
  summary.pageErrorCount > 0;

console.log(JSON.stringify(summary, null, 2));
if (failed) process.exitCode = 1;
