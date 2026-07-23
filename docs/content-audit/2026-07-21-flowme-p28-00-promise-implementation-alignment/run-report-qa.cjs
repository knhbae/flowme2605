const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');

const ROOT = __dirname;
const SCREENSHOTS = path.join(ROOT, 'screenshots');
const target = pathToFileURL(path.join(ROOT, 'review.html')).href;

async function inspect(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const focusables = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(visible);
    const unnamed = focusables.filter((node) => {
      const labelledBy = node.getAttribute('aria-labelledby');
      const labelledText = labelledBy ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ') : '';
      return !(node.getAttribute('aria-label') || labelledText || node.textContent || node.getAttribute('title') || node.getAttribute('alt'))?.trim();
    });
    const viewportWidth = document.documentElement.clientWidth;
    const overflowingElements = Array.from(document.querySelectorAll('body *')).filter((node) => visible(node) && !node.closest('.promise-wrap, .risk-wrap, .case-tabs') && !node.matches('.skip')).map((node) => {
      const rect = node.getBoundingClientRect();
      return { tag: node.tagName.toLowerCase(), className: String(node.className || '').slice(0, 80), text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter((item) => item.left < -1 || item.right > viewportWidth + 1).slice(0, 20);
    return {
      title: document.title,
      sectionCount: document.querySelectorAll('main > section').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      focusableCount: focusables.length,
      unnamedFocusableCount: unnamed.length,
      overflowingElements,
      promiseGeometry: (() => {
        const node = document.querySelector('.promise-wrap');
        const section = document.querySelector('#promise');
        const main = document.querySelector('main');
        const describe = (element) => element ? { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, rect: Math.round(element.getBoundingClientRect().width), overflowX: getComputedStyle(element).overflowX, minWidth: getComputedStyle(element).minWidth } : null;
        return { main: describe(main), section: describe(section), wrapper: describe(node) };
      })(),
      selectedCase: document.querySelector('.case-tab[aria-selected="true"]')?.textContent?.trim(),
      selectedMode: document.querySelector('[data-mode][aria-pressed="true"]')?.textContent?.trim(),
      verdict: document.querySelector('.verdict strong')?.textContent?.trim(),
    };
  });
}

(async () => {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = { generatedAt: new Date().toISOString(), target, observedUserSessions: 0, entries: [] };
  for (const viewport of [{ id: '390', width: 390, height: 844 }, { id: '1024', width: 1024, height: 768 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(target, { waitUntil: 'load' });
    await page.getByRole('tab', { name: '폭염 대응', exact: true }).click();
    await page.getByRole('button', { name: '현재', exact: true }).click();
    const currentArtifact = await page.locator('#artifact-name').textContent();
    await page.getByRole('button', { name: '제안', exact: true }).click();
    await page.getByRole('button', { name: '전체 보기', exact: true }).click();
    const proposedArtifact = await page.locator('#artifact-name').textContent();
    const expanded = await page.locator('#toggle-outline').getAttribute('aria-expanded');
    await page.getByRole('button', { name: 'prior artifact' }).click();
    const visibleProductionEvidence = await page.locator('.evidence-card[data-kind="production"]:visible').count();
    const visiblePriorEvidence = await page.locator('.evidence-card[data-kind="prior"]:visible').count();
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SCREENSHOTS, `review-${viewport.id}.png`) });
    results.entries.push({
      viewport,
      ...(await inspect(page)),
      consoleErrors,
      pageErrors,
      interaction: { currentArtifact: currentArtifact?.trim(), proposedArtifact: proposedArtifact?.trim(), expanded, visibleProductionEvidence, visiblePriorEvidence },
    });
    await context.close();
  }
  await browser.close();
  const failed = results.entries.some((entry) => entry.horizontalOverflow || entry.unnamedFocusableCount || entry.consoleErrors.length || entry.pageErrors.length || entry.interaction.expanded !== 'true' || entry.interaction.visibleProductionEvidence !== 0 || entry.interaction.visiblePriorEvidence < 1);
  results.summary = {
    failed,
    viewportCount: results.entries.length,
    horizontalOverflowCount: results.entries.filter((entry) => entry.horizontalOverflow).length,
    unnamedFocusableCount: results.entries.reduce((count, entry) => count + entry.unnamedFocusableCount, 0),
    consoleErrorCount: results.entries.reduce((count, entry) => count + entry.consoleErrors.length, 0),
    pageErrorCount: results.entries.reduce((count, entry) => count + entry.pageErrors.length, 0),
  };
  fs.writeFileSync(path.join(ROOT, 'report-qa-results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ failed, entries: results.entries }, null, 2)}\n`);
  process.exitCode = failed ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
