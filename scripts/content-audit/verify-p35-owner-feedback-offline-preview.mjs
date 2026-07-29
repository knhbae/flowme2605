import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = process.cwd();
const offlineRoot = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-27-p35-owner-feedback-independent-review-handoff',
  'offline-preview',
);
const htmlFiles = [
  'index.html',
  'public-flow.html',
  'my-flow.html',
  'calendar.html',
  'export.html',
  'reference-gallery.html',
];
const viewports = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const linkFailures = [];
for (const htmlFile of htmlFiles) {
  const source = await readFile(path.join(offlineRoot, htmlFile), 'utf8');
  const hrefs = Array.from(source.matchAll(/\shref="([^"]+)"/gu), (match) => match[1]);
  for (const href of hrefs) {
    if (
      href.startsWith('http://')
      || href.startsWith('https://')
      || href.startsWith('#')
      || href.startsWith('mailto:')
    ) {
      continue;
    }
    const cleanHref = href.split('#', 1)[0];
    const target = path.resolve(offlineRoot, cleanHref);
    try {
      await access(target);
    } catch {
      linkFailures.push({ htmlFile, href, target });
    }
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

const checks = [];
for (const htmlFile of htmlFiles) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    await page.goto(pathToFileURL(path.join(offlineRoot, htmlFile)).href, {
      waitUntil: 'load',
    });

    const quality = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0
        );
      };
      const unnamedInteractiveCount = Array.from(
        document.querySelectorAll('button, a[href], input, select, textarea, summary'),
      ).filter((element) => {
        if (!visible(element)) return false;
        const name = (
          element.getAttribute('aria-label')
          ?? element.getAttribute('title')
          ?? element.textContent
          ?? ''
        ).trim();
        return name.length === 0;
      }).length;
      const brokenImageCount = Array.from(document.images).filter(
        (image) => !image.complete || image.naturalWidth === 0,
      ).length;
      return {
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        unnamedInteractiveCount,
        brokenImageCount,
      };
    });

    checks.push({
      htmlFile,
      viewport: `${viewport.width}x${viewport.height}`,
      ...quality,
      consoleAndPageErrors: errors,
    });
    await context.close();
  }
}
await browser.close();

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  observedUserCount: 0,
  htmlFileCount: htmlFiles.length,
  viewportCount: viewports.length,
  checkCount: checks.length,
  localLinkFailureCount: linkFailures.length,
  horizontalOverflowCount: checks.reduce(
    (sum, check) => sum + (check.horizontalOverflow > 0 ? 1 : 0),
    0,
  ),
  brokenImageCount: checks.reduce((sum, check) => sum + check.brokenImageCount, 0),
  unnamedInteractiveCount: checks.reduce(
    (sum, check) => sum + check.unnamedInteractiveCount,
    0,
  ),
  consoleAndPageErrorCount: checks.reduce(
    (sum, check) => sum + check.consoleAndPageErrors.length,
    0,
  ),
  linkFailures,
  checks,
};

await writeFile(
  path.join(offlineRoot, 'render-check.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);
console.log(JSON.stringify(result, null, 2));

if (
  result.localLinkFailureCount > 0
  || result.horizontalOverflowCount > 0
  || result.brokenImageCount > 0
  || result.unnamedInteractiveCount > 0
  || result.consoleAndPageErrorCount > 0
) {
  process.exitCode = 1;
}
