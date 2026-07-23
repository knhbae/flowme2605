const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');

const ROOT = __dirname;
const SOURCE = path.resolve(ROOT, '..', '2026-07-19-flow-content-usage-preview-ko.html');
const SCREENSHOTS = path.join(ROOT, 'screenshots');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const cases = [
  { id: 'moving', primary: 'calendar' },
  { id: 'course', primary: 'sheet' },
  { id: 'heat', primary: 'checklist' },
  { id: 'contract', primary: 'sheet' },
  { id: 'route', primary: 'checklist' },
];

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function pageState(page, item) {
  return page.evaluate(({ id, primary }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const focusables = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
      .filter((element) => visible(element) && element.getAttribute('tabindex') !== '-1');
    const unnamed = focusables.filter((element) => {
      const labels = 'labels' in element ? Array.from(element.labels || []).map((label) => label.textContent || '').join(' ') : '';
      return !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title') || element.textContent?.trim() || element.getAttribute('placeholder') || labels.trim());
    });
    return {
      caseId: id,
      expectedPrimary: primary,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      visibleFocusableCount: focusables.length,
      unnamedVisibleFocusableCount: unnamed.length,
      visibleInputCount: Array.from(document.querySelectorAll('input, select, textarea')).filter(visible).length,
      sourceChoiceCount: document.querySelectorAll('[data-flow-id]').length,
      destinationChoiceCount: document.querySelectorAll('[data-destination]').length,
      selectedDestination: document.querySelector('[data-destination][aria-selected="true"]')?.getAttribute('data-destination') || '',
      selectedFlow: document.querySelector('[data-flow-id][aria-selected="true"]')?.getAttribute('data-flow-id') || '',
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 2200),
    };
  }, item);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const results = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    evidenceKind: 'prior_design_artifact',
    observedUserSessionCount: 0,
    entries: [],
  };

  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    const context = await browser.newContext({ viewport, locale: 'ko-KR' });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(250);

    for (const item of cases) {
      await page.evaluate(({ id, primary }) => {
        document.querySelector(`[data-flow-id="${id}"]`)?.click();
        document.querySelector(`[data-destination="${primary}"]`)?.click();
      }, item);
      await page.waitForTimeout(50);
      const screenshot = `prior-${item.id}-${viewport.width}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS, screenshot), fullPage: false });
      results.entries.push({
        ...(await pageState(page, item)),
        viewport: `${viewport.width}x${viewport.height}`,
        screenshot: `screenshots/${screenshot}`,
        consoleErrorCount: consoleErrors.length,
        pageErrorCount: pageErrors.length,
      });
    }
    await context.close();
  }

  await browser.close();
  results.summary = {
    scenarioCount: results.entries.length,
    primaryMismatchCount: results.entries.filter((entry) => entry.selectedDestination !== entry.expectedPrimary).length,
    overflowCount: results.entries.filter((entry) => entry.horizontalOverflow).length,
    consoleErrorCount: results.entries.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
    pageErrorCount: results.entries.reduce((sum, entry) => sum + entry.pageErrorCount, 0),
    unnamedVisibleFocusableCount: results.entries.reduce((sum, entry) => sum + entry.unnamedVisibleFocusableCount, 0),
  };
  fs.writeFileSync(path.join(ROOT, 'prior-artifact-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(results.summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
