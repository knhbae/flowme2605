import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputRoot = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-13-flowme-value-chain-execution-redesign-evidence',
);
const screenshotRoot = path.join(outputRoot, 'screenshots');
const baseUrl = process.env.FLOWME_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3110';
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);

await mkdir(screenshotRoot, { recursive: true });

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const captures = [];

async function capture({ name, route, viewport, prepare }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  if (prepare) await prepare(page);
  await page.screenshot({
    path: path.join(screenshotRoot, name),
    fullPage: true,
    animations: 'disabled',
  });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyTextLength: document.body.innerText.length,
    surfaceRole: document.querySelector('[data-testid="my-flow-workspace"]')?.getAttribute('data-surface-role') ?? null,
    calendarLayouts: Array.from(document.querySelectorAll('[data-calendar-layout]')).map((node) => node.getAttribute('data-calendar-layout')),
    creatorMetricPolicy: document.querySelector('header[data-metric-policy]')?.getAttribute('data-metric-policy') ?? null,
    visibleOutcomeMetricLabelCount: Array.from(document.querySelectorAll('body *')).filter((node) => {
      const element = node;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return /^(총 실행|총 복사)$/.test(element.textContent?.trim() ?? '');
    }).length,
  }));
  captures.push({ name, route, viewport, ...metrics });
  await context.close();
}

const mobile = { width: 390, height: 844 };
const wide = { width: 1024, height: 900 };

await capture({ name: '01-home-mobile.png', route: '/', viewport: mobile });
await capture({ name: '02-home-wide.png', route: '/', viewport: wide });
await capture({ name: '03-flows-default-mobile.png', route: '/flows', viewport: mobile });
await capture({
  name: '04-flows-result-mobile.png',
  route: '/flows',
  viewport: mobile,
  prepare: async (page) => {
    await page.getByTestId('flow-url-lookup-input').fill('https://blog.naver.com/01695258757/222768860919?utm_source=review');
    await page.getByRole('button', { name: 'Flow 찾기' }).click();
    await page.getByTestId('flow-url-lookup-result').waitFor();
  },
});
await capture({ name: '05-flow-map-moving-mobile.png', route: '/flow-maps/moving-d30', viewport: mobile });
await capture({ name: '06-flow-map-moving-wide.png', route: '/flow-maps/moving-d30', viewport: wide });
await capture({ name: '07-my-today-mobile.png', route: '/my?demo=ux12', viewport: mobile });
await capture({ name: '08-my-today-wide.png', route: '/my?demo=ux12', viewport: wide });
await capture({
  name: '09-my-all-mobile.png',
  route: '/my?demo=ux12',
  viewport: mobile,
  prepare: async (page) => {
    await page.getByTestId('my-flow-view-flow').click();
    await page.getByTestId('my-flow-mobile-flow-hub').waitFor();
  },
});
await capture({
  name: '10-my-all-wide.png',
  route: '/my?demo=ux12',
  viewport: wide,
  prepare: async (page) => {
    await page.getByTestId('my-flow-view-flow').click();
    await page.getByTestId('my-flow-status-board').waitFor();
  },
});
await capture({ name: '11-calendar-mobile.png', route: '/calendar?demo=ux12', viewport: mobile });
await capture({ name: '12-calendar-wide.png', route: '/calendar?demo=ux12', viewport: wide });
await capture({ name: '13-creator-profile-mobile.png', route: '/u/flow-curation-team', viewport: mobile });
await capture({ name: '14-creator-profile-wide.png', route: '/u/flow-curation-team', viewport: wide });
await capture({ name: '15-studio-empty-mobile.png', route: '/u/my-flow-studio', viewport: mobile });

await browser.close();
await writeFile(
  path.join(outputRoot, 'capture-metrics.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, captures }, null, 2)}\n`,
  'utf8',
);

console.log(`Captured ${captures.length} scenarios in ${screenshotRoot}`);
