import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname);
const reportUrl = pathToFileURL(path.join(root, 'review.html')).href;
const screenshotsDir = path.join(root, 'screenshots');
const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

await fs.mkdir(screenshotsDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(reportUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#journey-body tr').length === 24);
    const health = await page.evaluate(() => {
      const images = Array.from(document.images);
      const unnamedInteractive = Array.from(document.querySelectorAll('a,button,input,summary,select,textarea'))
        .filter((element) => {
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const name = element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('title');
          return !name;
        }).length;
      return {
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        journeyRows: document.querySelectorAll('#journey-body tr').length,
        brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src')),
        unnamedInteractive,
        h1Count: document.querySelectorAll('h1').length,
        navLinkCount: document.querySelectorAll('.topnav a').length,
      };
    });
    const screenshot = `screenshots/report-review-${viewport.name}.png`;
    await page.screenshot({ path: path.join(root, screenshot), fullPage: true });
    results.push({ viewport: `${viewport.width}x${viewport.height}`, screenshot, ...health, consoleErrors, pageErrors });
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.some((result) =>
  result.horizontalOverflow > 0 ||
  result.journeyRows !== 24 ||
  result.brokenImages.length > 0 ||
  result.unnamedInteractive > 0 ||
  result.h1Count !== 1 ||
  result.consoleErrors.length > 0 ||
  result.pageErrors.length > 0
);

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  report: 'review.html',
  status: failed ? 'fail' : 'pass',
  results,
};
await fs.writeFile(path.join(root, 'report-qa-results.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));
if (failed) process.exitCode = 1;
