import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const reportPath = path.join(root, 'docs', 'content-audit', '2026-07-21-flow-content-generalization-benchmark-v1-ko.html');
const url = process.argv[2] || pathToFileURL(reportPath).href;
const screenshotDir = path.join(root, 'docs', 'specs', '2026-07-21-flow-content-generalization-benchmark-v1', 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function inspectViewport(name, viewport) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });

  const initial = await page.evaluate(() => ({
    title: document.title,
    cases: document.querySelectorAll('[data-case]').length,
    roleCards: document.querySelectorAll('[data-role]').length,
    coverCases: [...document.querySelectorAll('.teaser-top span:first-child')].map((node) => node.textContent.trim()),
    resultCount: document.querySelector('#resultCount')?.textContent.trim(),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
  if (name === 'desktop-1440x900') {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.querySelector('.findings-slide').offsetTop - 96);
    });
    await page.screenshot({ path: path.join(screenshotDir, 'findings-1440x900.png') });
    await page.evaluate(() => window.scrollTo(0, document.querySelector('#case-GB-15').offsetTop - 96));
    await page.screenshot({ path: path.join(screenshotDir, 'case-gb15-1440x900.png') });
  }

  await page.selectOption('#statusFilter', 'hold');
  const holdVisible = await page.locator('[data-case]:visible').count();
  await page.selectOption('#statusFilter', '');
  await page.selectOption('#providerFilter', 'official');
  const officialVisible = await page.locator('[data-case]:visible').count();
  await page.selectOption('#providerFilter', '');
  await page.selectOption('#formatFilter', 'table_file');
  const tableFileVisible = await page.locator('[data-case]:visible').count();
  await page.selectOption('#formatFilter', '');
  await page.selectOption('#roleFilter', 'low_cost');
  const lowVisibleCards = await page.locator('[data-role]:visible').count();
  await page.selectOption('#roleFilter', '');
  await page.selectOption('#disagreementFilter', 'yes');
  const disagreementVisible = await page.locator('[data-case]:visible').count();
  await page.click('#resetFilters');
  const resetVisible = await page.locator('[data-case]:visible').count();

  results.push({
    name,
    viewport,
    ...initial,
    overflow: initial.scrollWidth > initial.clientWidth,
    filters: { holdVisible, officialVisible, tableFileVisible, lowVisibleCards, disagreementVisible, resetVisible },
    consoleErrors,
  });
  await page.close();
}

await inspectViewport('desktop-1440x900', { width: 1440, height: 900 });
await inspectViewport('mobile-390x844', { width: 390, height: 844 });
await browser.close();

const failures = [];
for (const result of results) {
  if (result.cases !== 18) failures.push(`${result.name}: expected 18 cases, found ${result.cases}`);
  if (result.roleCards !== 54) failures.push(`${result.name}: expected 54 role cards, found ${result.roleCards}`);
  if (result.coverCases.join(',') !== 'GB-14,GB-16,GB-17') failures.push(`${result.name}: unexpected cover cases ${result.coverCases.join(',')}`);
  if (result.resultCount !== '18 / 18') failures.push(`${result.name}: unexpected result count ${result.resultCount}`);
  if (result.overflow) failures.push(`${result.name}: horizontal overflow ${result.scrollWidth}/${result.clientWidth}`);
  if (result.filters.holdVisible < 1) failures.push(`${result.name}: hold filter returned no cases`);
  if (result.filters.officialVisible < 1) failures.push(`${result.name}: official filter returned no cases`);
  if (result.filters.tableFileVisible < 2) failures.push(`${result.name}: table/file filter expected at least 2 cases`);
  if (result.filters.lowVisibleCards !== 18) failures.push(`${result.name}: low-cost role filter showed ${result.filters.lowVisibleCards} cards`);
  if (result.filters.disagreementVisible < 1) failures.push(`${result.name}: disagreement filter returned no cases`);
  if (result.filters.resetVisible !== 18) failures.push(`${result.name}: reset showed ${result.filters.resetVisible} cases`);
  if (result.consoleErrors.length) failures.push(`${result.name}: console errors: ${result.consoleErrors.join(' | ')}`);
}

console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', url, results, failures }, null, 2));
if (failures.length) process.exit(1);
