import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = process.cwd();
const htmlPath = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-demand-business-review-ko.html');
const dataPath = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-demand-business-data-v1.json');
const goldPath = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-gold-benchmark-v1.json');
const assetDir = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-demand-business-assets');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
JSON.parse(fs.readFileSync(goldPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(data.selectedContentBundles.length === 9, '대표 Bundle 수 불일치');
assert(data.flows.length === 22, 'Flow 수 불일치');
assert(data.steps.length === 63, 'Step 수 불일치');
assert(data.items.length === 184, 'Item 수 불일치');
assert(data.items.every((entry) => entry.sourceTrace.every((trace) => trace.sourceUrl && trace.sourceLocator)), 'sourceTrace 누락');

const browser = await chromium.launch({ headless: true });
const results = {};

async function checkViewport(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'ko-KR' });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => {
    for (const image of document.querySelectorAll('.shot-grid img')) image.loading = 'eager';
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.shot-grid img')].every((img) => img.complete), null, { timeout: 15_000 });
  await page.waitForTimeout(1_000);

  const base = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    decisionCards: document.querySelectorAll('.decision-card').length,
    bundleDetails: document.querySelectorAll('.bundle-detail').length,
    imageCount: document.querySelectorAll('.shot-grid img').length,
    brokenImages: [...document.querySelectorAll('.shot-grid img')].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')),
    offenders: [...document.querySelectorAll('body *')]
      .filter((element) => {
        if (element.closest('.shot-grid') || element.closest('.filter-inner')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
      })
      .slice(0, 20)
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80) })),
  }));

  assert(base.documentWidth <= base.viewportWidth + 1, `${name}: 문서 가로 넘침 ${base.documentWidth}/${base.viewportWidth}`);
  assert(base.offenders.length === 0, `${name}: 요소 가로 넘침 ${JSON.stringify(base.offenders)}`);
  assert(base.decisionCards === 12, `${name}: 의사결정 카드 12개가 아님`);
  assert(base.bundleDetails === 10, `${name}: 상세 Bundle 10개가 아님`);
  assert(base.brokenImages.length === 0, `${name}: 깨진 이미지 ${base.brokenImages.join(', ')}`);

  async function visibleCount(selector) {
    return page.locator(selector).evaluateAll((elements) => elements.filter((element) => !element.classList.contains('hidden')).length);
  }

  await page.getByRole('button', { name: 'Go 9' }).click();
  assert(await visibleCount('.decision-card') === 9, `${name}: Go 카드 필터 실패`);
  assert(await visibleCount('.bundle-detail') === 9, `${name}: Go 상세 필터 실패`);

  await page.getByRole('button', { name: 'Modify 1' }).click();
  assert(await visibleCount('.decision-card') === 1, `${name}: Modify 카드 필터 실패`);
  assert(await visibleCount('.bundle-detail') === 1, `${name}: Modify 상세 필터 실패`);

  await page.getByRole('button', { name: 'Hold 2' }).click();
  assert(await visibleCount('.decision-card') === 2, `${name}: Hold 카드 필터 실패`);
  assert(await visibleCount('.bundle-detail') === 0, `${name}: Hold 상세는 없어야 함`);

  await page.getByRole('button', { name: '전체' }).click();
  const firstBundle = page.locator('.bundle-detail').first();
  await firstBundle.locator('.expand-bundle').click();
  const allOpened = await firstBundle.locator('.flow-block').evaluateAll((details) => details.every((entry) => entry.open));
  assert(allOpened, `${name}: 모두 펼치기 실패`);

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.scrollingElement.scrollTop = 0;
  });
  await page.waitForFunction(() => window.scrollY === 0);
  await page.waitForTimeout(300);
  const screenshotFile = path.join(assetDir, `review-${name}.png`);
  await page.screenshot({ path: screenshotFile, fullPage: false, animations: 'disabled' });
  results[name] = { ...base, screenshotFile };
  await context.close();
}

await checkViewport('desktop-1280x900', { width: 1280, height: 900 });
await checkViewport('mobile-390x844', { width: 390, height: 844 });
await browser.close();

console.log(JSON.stringify({ ok: true, results }, null, 2));
