import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const reportPath = path.join(root, 'review.html');
const captureRoot = path.join(root, 'report-screenshots');
const resultPath = path.join(root, 'report-qa.json');
const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const viewports = [
  { id: '390', width: 390, height: 844 },
  { id: '1024', width: 1024, height: 768 },
  { id: '1440', width: 1440, height: 900 },
];

fs.mkdirSync(captureRoot, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromeExecutable,
  headless: true,
});

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

    await page.goto(pathToFileURL(reportPath).href, { waitUntil: 'load' });
    await page.waitForTimeout(250);

    const images = page.locator('img');
    for (let index = 0; index < await images.count(); index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => {
        element.loading = 'eager';
      });
    }
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.evaluate(() => window.scrollTo(0, 0));

    const baseMetrics = await page.evaluate(() => {
      const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(document.querySelectorAll(focusableSelector));
      const unnamed = focusables.filter((element) => {
        const name = element.getAttribute('aria-label')
          || element.getAttribute('title')
          || element.textContent?.trim();
        return !name;
      }).map((element) => element.outerHTML.slice(0, 180));
      const brokenImages = Array.from(document.images)
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src'));
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        overflowOffenders: Array.from(document.querySelectorAll('body *'))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
            };
          })
          .filter((entry) => entry.right > document.documentElement.clientWidth + 1 || entry.left < -1)
          .slice(0, 30),
        focusableCount: focusables.length,
        unnamedFocusables: unnamed,
        imageCount: document.images.length,
        brokenImages,
        h1Count: document.querySelectorAll('h1').length,
        hiddenFindingCount: document.querySelectorAll('.finding[hidden]').length,
      };
    });

    await page.locator('[data-filter="high"]').click();
    const highFilterVisibleCount = await page.locator('.finding:not([hidden])').count();
    await page.locator('[data-filter="all"]').click();

    await page.locator('[data-target="wf-save"] [data-mode="wide"]').click();
    const saveWireMode = await page.locator('#wf-save').getAttribute('data-mode');
    await page.locator('[data-target="wf-save"] [data-mode="mobile"]').click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(captureRoot, `review-${viewport.id}-top.png`) });
    await page.locator('#surface-save-before').screenshot({ path: path.join(captureRoot, `review-${viewport.id}-save-before.png`) });
    await page.locator('#surface-my-flow').screenshot({ path: path.join(captureRoot, `review-${viewport.id}-my-flow.png`) });
    await page.locator('#backlog').screenshot({ path: path.join(captureRoot, `review-${viewport.id}-backlog.png`) });

    await page.goto(pathToFileURL(reportPath).href, { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, 0));
    const focusOrder = [];
    await page.keyboard.press('Tab');
    for (let index = 0; index < 12; index += 1) {
      focusOrder.push(await page.evaluate(() => {
        const element = document.activeElement;
        return {
          tag: element?.tagName?.toLowerCase() ?? null,
          name: element?.getAttribute?.('aria-label') || element?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || null,
          href: element?.getAttribute?.('href') ?? null,
        };
      }));
      await page.keyboard.press('Tab');
    }

    results.push({
      viewport,
      ...baseMetrics,
      highFilterVisibleCount,
      saveWireMode,
      consoleErrors,
      pageErrors,
      focusOrder,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const localLinks = [];
const html = fs.readFileSync(reportPath, 'utf8');
for (const match of html.matchAll(/href="([^"]+)"/g)) {
  const href = match[1];
  if (href.startsWith('#') || href.startsWith('http:') || href.startsWith('https:') || href.startsWith('mailto:')) continue;
  const resolved = path.resolve(root, href.split('#')[0]);
  localLinks.push({ href, exists: fs.existsSync(resolved) });
}

const output = {
  generatedAt: new Date().toISOString(),
  report: path.basename(reportPath),
  observedUserCount: 0,
  results,
  localLinks,
  totals: {
    viewportCount: results.length,
    horizontalOverflowCount: results.filter((result) => result.horizontalOverflowPx > 0).length,
    brokenImageCount: results.reduce((sum, result) => sum + result.brokenImages.length, 0),
    unnamedFocusableCount: results.reduce((sum, result) => sum + result.unnamedFocusables.length, 0),
    consoleErrorCount: results.reduce((sum, result) => sum + result.consoleErrors.length, 0),
    pageErrorCount: results.reduce((sum, result) => sum + result.pageErrors.length, 0),
    brokenLocalLinkCount: localLinks.filter((link) => !link.exists).length,
    highFilterPassed: results.every((result) => result.highFilterVisibleCount === 7),
    wireTogglePassed: results.every((result) => result.saveWireMode === 'wide'),
  },
};

fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.totals, null, 2));

if (
  output.totals.horizontalOverflowCount > 0
  || output.totals.brokenImageCount > 0
  || output.totals.unnamedFocusableCount > 0
  || output.totals.consoleErrorCount > 0
  || output.totals.pageErrorCount > 0
  || output.totals.brokenLocalLinkCount > 0
  || !output.totals.highFilterPassed
  || !output.totals.wireTogglePassed
) {
  process.exitCode = 1;
}
