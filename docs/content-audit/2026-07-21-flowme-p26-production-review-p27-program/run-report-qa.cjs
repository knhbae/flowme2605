const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const root = __dirname;
const reportUrl = pathToFileURL(path.join(root, 'review.html')).href;
const outputPath = path.join(root, 'report-qa-results.json');
const screens = ['home', 'find', 'save-before', 'post-save', 'my-flow', 'calendar', 'editor', 'export'];
const viewports = [
  { id: '390', width: 390, height: 844 },
  { id: '1024', width: 1024, height: 768 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(reportUrl, { waitUntil: 'load' });
    for (const screen of screens) {
      await page.selectOption('#surface-select', screen);
      const button = viewport.id === '390' ? '[data-viewport="mobile"]' : '[data-viewport="wide"]';
      await page.click(button);
      const state = await page.evaluate(({ screen, viewportId }) => {
        const root = document.documentElement;
        const active = document.querySelector(`[data-screen="${screen}"]:not([hidden])`);
        const wire = active?.querySelector(viewportId === '390' ? '.wire-mobile:not([hidden])' : '.wire-wide:not([hidden])');
        const unnamed = Array.from(document.querySelectorAll('button, select, a[href]'))
          .filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return false;
            return !(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent.trim());
          })
          .map((node) => node.tagName);
        const brokenImages = Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute('src'));
        return {
          screen,
          activeScreenCount: document.querySelectorAll('.prototype-screen:not([hidden])').length,
          activeWire: Boolean(wire),
          horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
          unnamedControls: unnamed,
          brokenImages,
        };
      }, { screen, viewportId: viewport.id });
      results.push({ viewport, ...state });
    }
    await page.selectOption('#surface-select', viewport.id === '390' ? 'home' : 'calendar');
    await page.click(viewport.id === '390' ? '[data-viewport="mobile"]' : '[data-viewport="wide"]');
    await page.screenshot({ path: path.join(root, 'screenshots', `report-review-${viewport.id}.png`), fullPage: true });

    const focusSamples = [];
    await page.keyboard.press('Home');
    for (let index = 0; index < 18; index += 1) {
      await page.keyboard.press('Tab');
      focusSamples.push(await page.evaluate(() => {
        const node = document.activeElement;
        if (!node) return null;
        return {
          tag: node.tagName,
          name: node.getAttribute('aria-label') || node.textContent.trim().replace(/\s+/g, ' ').slice(0, 100),
          visible: Boolean(node.getBoundingClientRect().width && node.getBoundingClientRect().height),
        };
      }));
    }
    results.push({ viewport, keyboardFocusSamples: focusSamples, consoleErrors, pageErrors });
    await context.close();
  }
  await browser.close();
  const summary = {
    stateCount: results.filter((result) => result.screen).length,
    overflowCount: results.filter((result) => result.horizontalOverflow > 0).length,
    unnamedControlStateCount: results.filter((result) => result.unnamedControls?.length).length,
    brokenImageStateCount: results.filter((result) => result.brokenImages?.length).length,
    consoleErrorCount: results.reduce((sum, result) => sum + (result.consoleErrors?.length ?? 0), 0),
    pageErrorCount: results.reduce((sum, result) => sum + (result.pageErrors?.length ?? 0), 0),
  };
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
