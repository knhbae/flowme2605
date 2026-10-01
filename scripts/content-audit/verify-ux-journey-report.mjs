import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifact = resolve(root, 'docs/content-audit/2026-10-01-flowme-ux-journey-review-ko.html');
const html = readFileSync(artifact, 'utf8');
assert(!html.includes('최종 검증 집계 입력 전'));
assert(!html.includes('계측값 대기'));
assert(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(html));
const output = resolve(root, 'output/playwright/ux-journey-report');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const errors = [], consoleErrors = [], externalRequests = [], results = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.route('**/*', route => {
    if (route.request().url().startsWith('file:')) return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(pathToFileURL(artifact).href);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      verification: document.querySelector('[data-slot="verification"]')?.textContent,
      metrics: document.querySelectorAll('[data-slot="geometry"] tbody tr').length,
      missingLinks: [...document.querySelectorAll('a[href]')].filter(link => !link.getAttribute('href')).length,
    }));
    assert(geometry.scrollWidth <= width, `${width}x${height} horizontal overflow`);
    assert(geometry.verification?.includes('2,258'));
    assert.equal(geometry.metrics, 5);
    assert.equal(geometry.missingLinks, 0);
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const link of links) {
      assert(!/^(?:https?:|javascript:)/.test(link));
      assert(existsSync(fileURLToPath(new URL(link, pathToFileURL(artifact)))), `missing local link ${link}`);
    }
    await page.getByRole('link', { name: 'A/B 직접 조작하기', exact: true }).focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'A/B 직접 조작하기');
    await page.screenshot({ path: resolve(output, `${width}x${height}.png`), fullPage: true });
    results.push({ width, height, overflow: 0, localLinks: links.length, keyboardLink: true });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
  const report = { artifact, results, pageErrors: errors, consoleErrors, externalRequests,
    meaning: 'Local HTML render and link QA only; no observed users or real devices.' };
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally { await browser.close(); }
