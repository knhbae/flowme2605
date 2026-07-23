import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(docsDir, 'assets', '2026-07-22-flowme-vertical-service-content-coverage-atlas');
const report = path.join(docsDir, '2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko.html');
const reportUrl = pathToFileURL(report).href;
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

fs.mkdirSync(assetDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()));
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto(reportUrl, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(() => document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; }));

  const slideIds = await page.locator('.slide').evaluateAll((slides) => slides.map((slide) => slide.id));
  for (const id of slideIds) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(25);
  }
  await page.evaluate(() => document.getElementById('executive-answer').scrollIntoView({ block: 'start', behavior: 'auto' }));
  await page.waitForTimeout(250);

  await page.screenshot({ path: path.join(assetDir, `report-${viewport.name}-cover.png`), fullPage: false });
  await page.evaluate(() => document.getElementById('service-babybilly-story').scrollIntoView({ block: 'start', behavior: 'auto' }));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(assetDir, `report-${viewport.name}-story.png`), fullPage: false });
  await page.evaluate(() => document.getElementById('service-visitkorea-mapping').scrollIntoView({ block: 'start', behavior: 'auto' }));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(assetDir, `report-${viewport.name}-travel.png`), fullPage: false });
  await page.evaluate(() => document.getElementById('service-kotsa-mapping').scrollIntoView({ block: 'start', behavior: 'auto' }));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(assetDir, `report-${viewport.name}-service.png`), fullPage: false });
  await page.evaluate(() => document.getElementById('decision-ledgers').scrollIntoView({ block: 'start', behavior: 'auto' }));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(assetDir, `report-${viewport.name}-ledger.png`), fullPage: false });

  const metrics = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('.slide')];
    const images = [...document.querySelectorAll('img')];
    const viewportWidth = document.documentElement.clientWidth;
    const slideOverflow = slides.filter((slide) => slide.scrollWidth > slide.clientWidth + 1).map((slide) => ({ id: slide.id, clientWidth: slide.clientWidth, scrollWidth: slide.scrollWidth }));
    const desktopTallSlides = innerWidth >= 1000
      ? slides.filter((slide) => slide.getBoundingClientRect().height > innerHeight - 16).map((slide) => ({ id: slide.id, height: Math.round(slide.getBoundingClientRect().height) }))
      : [];
    const outsideViewport = [...document.querySelectorAll('.slide h2,.slide h3,.slide p,.slide a,.slide .chip,.topbar select')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > viewportWidth + 2 || rect.left < -2);
      })
      .slice(0, 50)
      .map((element) => ({ tag: element.tagName, text: (element.textContent || '').trim().slice(0, 80), left: Math.round(element.getBoundingClientRect().left), right: Math.round(element.getBoundingClientRect().right) }));
    return {
      slideCount: slides.length,
      imageCount: images.length,
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src')),
      documentHorizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      slideOverflow,
      desktopTallSlides,
      outsideViewport,
      navOptions: {
        category: document.querySelectorAll('#section-jump option').length,
        service: document.querySelectorAll('#service-jump option').length,
      },
    };
  });

  await page.selectOption('#service-jump', 'service-babybilly-story');
  const navigationWorked = await page.waitForFunction(() => {
    const top = document.getElementById('service-babybilly-story').getBoundingClientRect().top;
    const barHeight = document.querySelector('.topbar').getBoundingClientRect().height;
    return Math.abs(top - barHeight - 8) < 40;
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);

  results.push({ viewport, ...metrics, navigationWorked, consoleErrors, pageErrors });
  await context.close();
}

await browser.close();

const output = {
  schemaVersion: 'flowme-atlas-render-check-v1',
  generatedAt: new Date().toISOString(),
  note: '자동 렌더링·상호작용 검사이며 실제 사용자 검증이 아니다.',
  results,
};

fs.writeFileSync(path.join(assetDir, 'render-check.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output, null, 2));

const failures = results.flatMap((result) => [
  ...(result.slideCount === 66 ? [] : [`${result.viewport.name}: slide count ${result.slideCount}`]),
  ...(result.brokenImages.length === 0 ? [] : [`${result.viewport.name}: ${result.brokenImages.length} broken images`]),
  ...(result.documentHorizontalOverflow <= 1 ? [] : [`${result.viewport.name}: document horizontal overflow ${result.documentHorizontalOverflow}`]),
  ...(result.slideOverflow.length === 0 ? [] : [`${result.viewport.name}: ${result.slideOverflow.length} slide overflows`]),
  ...(result.desktopTallSlides.length === 0 ? [] : [`${result.viewport.name}: ${result.desktopTallSlides.length} slides taller than viewport`]),
  ...(result.outsideViewport.length === 0 ? [] : [`${result.viewport.name}: ${result.outsideViewport.length} elements outside viewport`]),
  ...(result.navigationWorked ? [] : [`${result.viewport.name}: service navigation failed`]),
  ...(result.consoleErrors.length === 0 ? [] : [`${result.viewport.name}: ${result.consoleErrors.length} console errors`]),
  ...(result.pageErrors.length === 0 ? [] : [`${result.viewport.name}: ${result.pageErrors.length} page errors`]),
]);

if (failures.length > 0) {
  console.error(`Render verification failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
}
