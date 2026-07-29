import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const outputRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.join(outputRoot, 'screenshots');
const baseUrl = 'https://flowme2605.vercel.app';
await mkdir(screenshotRoot, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : undefined,
});
const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));

async function health() {
  return page.evaluate(() => ({
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    focusableCount: document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])').length,
  }));
}

const routes = [];
for (const entry of [
  { route: '/f/moving-d30-basic', filename: 'supplemental-public-moving-1440.png' },
  { route: '/my?demo=ux20&view=flows', filename: 'supplemental-my-flow-1440.png' },
  { route: '/calendar?demo=ux50', filename: 'supplemental-calendar-1440.png' },
]) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}${entry.route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotRoot, entry.filename), fullPage: false, animations: 'disabled' });
  routes.push({
    route: entry.route,
    viewport: '1440x900',
    screenshot: `screenshots/${entry.filename}`,
    health: await health(),
    evidenceKind: 'current_production_interaction',
  });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/flows`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.getByTestId('flow-catalog-search').fill('\uC774\uC0AC');
await page.waitForTimeout(1000);
const card = page.locator('[data-testid="flow-map-catalog-card"]:visible').first();
const discovery = {
  route: '/flows',
  query: '\uC774\uC0AC',
  resultHref: await card.getAttribute('href'),
  resultAccessibleName: await card.getAttribute('aria-label'),
  resultItemCountText: await card.getByTestId('flow-card-support-meta').innerText(),
  publicMovingHrefCount: await page.locator('a[href="/f/moving-d30-basic"]:visible').count(),
  evidenceKind: 'current_production_interaction',
};
await page.screenshot({
  path: path.join(screenshotRoot, 'supplemental-discovery-moving-390.png'),
  fullPage: false,
  animations: 'disabled',
});

await page.goto(`${baseUrl}/flow-maps/moving-d30`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
discovery.mapSaveAction = await page.getByTestId('flow-map-save-all-mobile').innerText();
discovery.mapAdjustAction = await page.getByTestId('flow-map-adjust-save-mobile').innerText();
discovery.mapPublicChildLinkCount = await page.locator('a[href^="/f/"]:visible').count();
await page.screenshot({
  path: path.join(screenshotRoot, 'supplemental-discovery-moving-map-390.png'),
  fullPage: false,
  animations: 'disabled',
});

await browser.close();

await writeFile(
  path.join(outputRoot, 'supplemental-route-evidence.json'),
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    canonicalUrl: baseUrl,
    observedUserCount: 0,
    routes,
    discovery,
    consoleErrors,
    pageErrors,
  }, null, 2)}\n`,
  'utf8',
);
