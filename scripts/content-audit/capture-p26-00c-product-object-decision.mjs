import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageDir = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-20-p26-00c-product-object-journey-decision',
);
const prototypePath = path.join(packageDir, 'prototype.html');
const screenshotsDir = path.join(packageDir, 'screenshots');
const currentDir = path.join(screenshotsDir, 'current');
const proposedDir = path.join(screenshotsDir, 'proposed');
const productionBase = process.env.FLOWME_PRODUCTION_URL || 'https://flowme2605.vercel.app';

const viewports = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
};
const surfaces = ['home', 'catalog', 'save', 'post', 'my', 'calendar', 'editor', 'export'];
const productionRoutes = [
  { id: 'home', route: '/' },
  { id: 'flows', route: '/flows' },
  { id: 'public-vehicle', route: '/f/vehicle-inspection-prep' },
  { id: 'my-moving', route: '/my?savedMap=moving-d30', stateBoundary: 'fresh_browser_query_only' },
  { id: 'calendar-moving', route: '/calendar?savedMap=moving-d30', stateBoundary: 'fresh_browser_query_only' },
];

fs.mkdirSync(currentDir, { recursive: true });
fs.mkdirSync(proposedDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {
  generatedAt: new Date().toISOString(),
  productionBase,
  evidenceBoundary: {
    prototype: 'heuristic_simulation',
    production: 'current_production_interaction',
    observedUserSessionCount: 0,
    freshBrowserSavedStateNote:
      'savedMap query does not hydrate browser-local saved state by itself; saved-state Calendar comparison remains prior artifact evidence until an interaction fixture is replayed.',
  },
  prototype: [],
  production: [],
};

try {
  for (const [device, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    const page = await context.newPage();
    for (const surface of surfaces) {
      const errors = [];
      const onConsole = (message) => {
        if (message.type() === 'error') errors.push(message.text());
      };
      const onPageError = (error) => errors.push(error.message);
      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      const url = `${pathToFileURL(prototypePath).href}?state=proposed,moving,${surface},${device},capture`;
      await page.goto(url, { waitUntil: 'load' });
      const metrics = await collectMetrics(page);
      const screenshot = path.join(proposedDir, `${surface}-${device}.png`);
      await page.screenshot({ path: screenshot });
      results.prototype.push({
        surface,
        device,
        viewport,
        screenshot: path.relative(packageDir, screenshot).replaceAll('\\', '/'),
        ...metrics,
        consoleErrorCount: errors.length,
        consoleErrors: errors,
      });
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    }
    await context.close();
  }

  for (const [device, viewport] of Object.entries(viewports)) {
    for (const target of productionRoutes) {
      const context = await browser.newContext({ viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`${productionBase}${target.route}`, {
        waitUntil: 'networkidle',
        timeout: 45_000,
      });
      const metrics = await collectMetrics(page);
      const screenshot = path.join(currentDir, `${target.id}-${device}.png`);
      await page.screenshot({ path: screenshot });
      results.production.push({
        ...target,
        device,
        viewport,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        screenshot: path.relative(packageDir, screenshot).replaceAll('\\', '/'),
        ...metrics,
        consoleErrorCount: errors.length,
        consoleErrors: errors,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

results.summary = {
  proposedScreenshotCount: results.prototype.length,
  currentProductionScreenshotCount: results.production.length,
  prototypeHorizontalOverflowCount: results.prototype.filter((entry) => entry.horizontalOverflow).length,
  prototypeConsoleErrorCount: results.prototype.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
  productionHorizontalOverflowCount: results.production.filter((entry) => entry.horizontalOverflow).length,
  productionConsoleErrorCount: results.production.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
  productionHttpFailureCount: results.production.filter(
    (entry) => entry.status === null || entry.status < 200 || entry.status >= 400,
  ).length,
};

fs.writeFileSync(
  path.join(packageDir, 'capture-results.json'),
  `${JSON.stringify(results, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(results.summary, null, 2));

async function collectMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const actionSelector = 'button, a[href], input, select, textarea';
    const textSelector = 'h1, h2, h3, p, .source, .preview-row, .chip, .legacy-copy, .task-row strong, .task-row span';
    return {
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      visibleActionCount: [...document.querySelectorAll(actionSelector)].filter(visible).length,
      visibleTextBlockCount: [...document.querySelectorAll(textSelector)].filter(visible).length,
      visibleLegacyCopyCount: [...document.querySelectorAll('.legacy-copy')].filter(visible).length,
      title: document.title,
    };
  });
}
