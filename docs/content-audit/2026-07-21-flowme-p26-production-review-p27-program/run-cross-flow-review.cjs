const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const BASE_URL = 'https://flowme2605.vercel.app';
const ROOT = __dirname;
const SCREENSHOTS = path.join(ROOT, 'screenshots');
const MOBILE = { width: 390, height: 844 };
const WIDE = { width: 1024, height: 768 };
const TARGET_DATE = '2026-07-21';

async function capture(page, id, note) {
  await page.waitForTimeout(350);
  const metrics = await page.evaluate(() => ({
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    nowSection: document.querySelector('[data-testid="my-flow-now-section"]')?.textContent.replace(/\s+/g, ' ').trim() || '',
    todayRemaining: document.querySelector('[data-testid="my-flow-today-remaining-count"]')?.textContent.replace(/\s+/g, ' ').trim() || '',
    todayRows: Array.from(document.querySelectorAll('[data-testid="my-flow-today-open-list"] [data-testid="my-flow-execution-row-shell"]')).map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    selectedDateGroups: Array.from(document.querySelectorAll('[data-testid="my-flow-selected-date-group"]')).map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    scopeOptions: Array.from(document.querySelectorAll('[data-testid^="my-flow-calendar-scope-"]')).map((node) => ({ name: node.getAttribute('aria-label') || node.textContent.replace(/\s+/g, ' ').trim(), pressed: node.getAttribute('aria-pressed') })),
    savedKeys: Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')).sort(),
  }));
  const file = `supplemental-cross-flow-${id}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS, file), fullPage: true });
  return { id, note, screenshot: `screenshots/${file}`, ...metrics };
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: MOBILE, timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${BASE_URL}/flow-maps/moving-d30`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.getByTestId('flow-map-anchor-input').fill('2026-08-20');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL(/\/my\?savedMap=moving-d30/, { timeout: 30000 });

  await page.goto(`${BASE_URL}/f/vehicle-inspection-prep`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByTestId('public-flow-date-intent-undated').click();
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' }).click();

  await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle', timeout: 60000 });
  const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  const toggle = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  const firstUndated = tray.getByTestId('my-flow-calendar-unscheduled-item').first();
  await firstUndated.getByRole('checkbox').check();
  await tray.getByTestId('my-flow-calendar-unscheduled-date').fill(TARGET_DATE);
  await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();

  await page.goto(`${BASE_URL}/my`, { waitUntil: 'networkidle', timeout: 60000 });
  const states = [];
  states.push(await capture(page, 'my-mobile', 'Mobile Now highlights one primary continuation while the same-date remainder is not shown as one grouped list.'));
  await page.setViewportSize(WIDE);
  states.push(await capture(page, 'my-wide', 'Wide Today counts two items but splits one primary continuation from the remaining same-date list.'));

  await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await page.locator(`.fc-daygrid-day[data-date="${TARGET_DATE}"]`).getByTestId('my-flow-calendar-date-button').click();
  states.push(await capture(page, 'calendar-wide', 'Selected date groups rows without merging distinct Flow ownership.'));
  await page.setViewportSize(MOBILE);
  states.push(await capture(page, 'calendar-mobile', 'Mobile selected date preserves Flow markers for same-date items.'));

  const result = {
    evidenceBoundary: 'Independent automated interaction; not observed-user validation.',
    observedUserCount: 0,
    targetDate: TARGET_DATE,
    status: 'completed',
    states,
    consoleErrors,
    pageErrors,
    summary: {
      stateCount: states.length,
      overflowCount: states.filter((state) => state.overflow > 0).length,
      todayRowCount: Math.max(...states.map((state) => state.todayRows.length)),
      selectedDateGroupCount: Math.max(...states.map((state) => state.selectedDateGroups.length)),
      savedFlowKeyCount: Math.max(...states.map((state) => state.savedKeys.length)),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
    },
  };
  fs.writeFileSync(path.join(ROOT, 'cross-flow-results.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result.summary, null, 2));
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
