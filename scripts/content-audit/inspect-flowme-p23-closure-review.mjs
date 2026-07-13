import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-13-p23-lifecycle-closure-review',
);
const screenshotsDir = path.join(outputDir, 'screenshots', '18-review-html');
const reviewUrl = pathToFileURL(path.join(outputDir, 'review.html')).href;
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'wide', width: 1024, height: 768 },
];

fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const records = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'ko-KR',
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(reviewUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    const metrics = await page.evaluate(() => ({
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      brokenImageCount: [...document.images].filter((image) => image.naturalWidth === 0).length,
      imageCount: document.images.length,
      tableCount: document.querySelectorAll('table').length,
      navigationLinkCount: document.querySelectorAll('nav a').length,
    }));
    const screenshot = path.join(screenshotsDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    records.push({
      viewport: { width: viewport.width, height: viewport.height },
      screenshot: path.relative(outputDir, screenshot).replaceAll('\\', '/'),
      consoleErrors,
      ...metrics,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const result = {
  generatedAt: new Date().toISOString(),
  reviewUrl,
  records,
};
fs.writeFileSync(path.join(outputDir, 'review-inspection.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
