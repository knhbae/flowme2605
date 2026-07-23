import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const report = path.join(root, 'review.html');
const captureRoot = path.join(root, 'report-qa');
const outputPath = path.join(root, 'report-qa.json');
const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(captureRoot, { recursive: true });

const browser = await chromium.launch({ executablePath: chromeExecutable, headless: true });
const output = {
  schemaVersion: 'flowme-p29-independent-report-qa-v1',
  generatedAt: new Date().toISOString(),
  report: pathToFileURL(report).href,
  observedUserCount: 0,
  viewports: [],
};

for (const viewport of [
  { id: '390', width: 390, height: 844 },
  { id: '1024', width: 1024, height: 768 },
  { id: '1440', width: 1440, height: 900 },
]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(pathToFileURL(report).href, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(captureRoot, `review-${viewport.id}-viewport.png`), fullPage: false });
  await page.screenshot({ path: path.join(captureRoot, `review-${viewport.id}.png`), fullPage: true });
  const metrics = await page.evaluate(() => {
    const clean = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const controls = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, summary'))
      .filter(visible);
    const unnamed = controls.filter((element) => !clean(
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent,
    ));
    const images = Array.from(document.images);
    return {
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      documentHeight: document.documentElement.scrollHeight,
      headingCount: document.querySelectorAll('h1, h2, h3').length,
      controlCount: controls.length,
      unnamedControlCount: unnamed.length,
      imageCount: images.length,
      brokenImageCount: images.filter((image) => !image.complete || image.naturalWidth === 0).length,
    };
  });
  output.viewports.push({
    viewport,
    screenshot: `report-qa/review-${viewport.id}.png`,
    viewportScreenshot: `report-qa/review-${viewport.id}-viewport.png`,
    consoleErrors,
    pageErrors,
    metrics,
  });
  await context.close();
}

output.totals = {
  viewportCount: output.viewports.length,
  horizontalOverflowViewportCount: output.viewports.filter((entry) => entry.metrics.horizontalOverflowPx > 1).length,
  unnamedControlCount: output.viewports.reduce((sum, entry) => sum + entry.metrics.unnamedControlCount, 0),
  brokenImageCount: output.viewports.reduce((sum, entry) => sum + entry.metrics.brokenImageCount, 0),
  consoleErrorCount: output.viewports.reduce((sum, entry) => sum + entry.consoleErrors.length, 0),
  pageErrorCount: output.viewports.reduce((sum, entry) => sum + entry.pageErrors.length, 0),
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.totals, null, 2));

await browser.close();

if (
  output.totals.horizontalOverflowViewportCount > 0
  || output.totals.unnamedControlCount > 0
  || output.totals.brokenImageCount > 0
  || output.totals.consoleErrorCount > 0
  || output.totals.pageErrorCount > 0
) {
  process.exitCode = 1;
}
