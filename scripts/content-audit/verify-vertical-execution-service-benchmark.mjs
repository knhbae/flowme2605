import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { scoreDimensions } from './vertical-execution-service-data.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(docsDir, '2026-07-28-vertical-execution-service-assets');
const jsonFile = path.join(docsDir, '2026-07-28-vertical-execution-service-benchmark-v1.json');
const htmlFile = path.join(docsDir, '2026-07-28-vertical-execution-service-review-ko.html');
const handoffFile = path.join(docsDir, '2026-07-28-vertical-execution-content-opportunity-handoff-ko.md');
const renderLogFile = path.join(assetDir, 'render-check.json');
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const captureLog = JSON.parse(fs.readFileSync(path.join(assetDir, 'capture-log.json'), 'utf8'));
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(data.summary.discoveredCount >= 30, `discovered count ${data.summary.discoveredCount} < 30`);
expect(data.summary.verifiedCount >= 18 && data.summary.verifiedCount <= 24, `verified count ${data.summary.verifiedCount} outside 18..24`);
expect(data.summary.deepDiveCount >= 8 && data.summary.deepDiveCount <= 10, `deep dive count ${data.summary.deepDiveCount} outside 8..10`);
expect(data.summary.categoryCount >= 7, `category count ${data.summary.categoryCount} < 7`);
expect(data.summary.opportunityCount >= 5 && data.summary.opportunityCount <= 8, `opportunity count ${data.summary.opportunityCount} outside 5..8`);
expect(data.verifiedServices.length === data.summary.verifiedCount, 'verifiedServices count mismatch');
expect(data.deepDiveServiceIds.length === data.summary.deepDiveCount, 'deepDiveServiceIds count mismatch');
expect(data.contentDiscoveryOpportunities.length === data.summary.opportunityCount, 'opportunity count mismatch');
expect(captureLog.counts.total === 20, `capture count ${captureLog.counts.total} != 20`);
expect(captureLog.counts.filesPresent === captureLog.counts.total, 'one or more capture files are missing');
expect(captureLog.counts.accessLimited === 0, `${captureLog.counts.accessLimited} captures remain access-limited`);

const serviceIds = new Set(data.verifiedServices.map((service) => service.id));
const candidateIds = new Set(data.discoveredCandidates.map((candidate) => candidate.id));
expect(serviceIds.size === data.verifiedServices.length, 'duplicate verified service id');
expect(candidateIds.size === data.discoveredCandidates.length, 'duplicate discovered candidate id');

for (const service of data.verifiedServices) {
  expect(service.evidenceSources.length >= 2, `${service.id}: fewer than 2 evidence sources`);
  expect(!service.evidenceLevels.includes('in_app_verified'), `${service.id}: unsupported in_app_verified claim`);
  expect(service.verificationBoundary.includes('in_app_verified가 아니다'), `${service.id}: missing verification boundary`);
  expect(service.initialInputs.filter((item) => item.required).length <= 3, `${service.id}: more than 3 required inputs`);
  expect(service.compression?.userMoment, `${service.id}: missing compression userMoment`);
  expect(service.compression?.naturalArtifact, `${service.id}: missing compression naturalArtifact`);
  expect(service.compression?.stage0Behavior, `${service.id}: missing Stage 0 behavior`);
  expect(service.compression?.serviceRelationship, `${service.id}: missing serviceRelationship`);
  expect(service.compression?.doNotBuildBoundary, `${service.id}: missing doNotBuildBoundary`);
  expect(service.compression?.finalDecision, `${service.id}: missing finalDecision`);
  expect(service.userCommunicationEvidence?.status, `${service.id}: missing communication status`);
  expect(service.userCommunicationEvidence?.observed?.length >= 20, `${service.id}: weak communication observation`);
  expect(/^https:\/\//.test(service.userCommunicationEvidence?.sourceUrl || ''), `${service.id}: invalid communication evidence URL`);
  expect(service.businessEvidenceRecord?.observed, `${service.id}: missing observed business evidence`);
  expect(service.businessEvidenceRecord?.unknown, `${service.id}: missing business unknown boundary`);
  expect(service.observationInferenceBoundary?.observedFacts?.length >= 2, `${service.id}: missing observed facts`);
  expect(service.observationInferenceBoundary?.flowmeInference, `${service.id}: missing FlowMe inference`);

  for (const dimension of scoreDimensions) {
    const record = service.scores[dimension];
    expect(record && Number.isFinite(record.score), `${service.id}.${dimension}: missing score`);
    expect(record && record.score >= 0 && record.score <= 10, `${service.id}.${dimension}: score outside 0..10`);
    expect(record && typeof record.comment === 'string' && record.comment.length >= 35, `${service.id}.${dimension}: weak score comment`);
  }

  for (const source of service.evidenceSources) {
    expect(/^https:\/\//.test(source.url), `${service.id}: non-HTTPS evidence URL ${source.url}`);
    expect(source.checkedAt === '2026-07-28', `${service.id}: evidence checkedAt mismatch`);
  }
}

for (const opportunity of data.contentDiscoveryOpportunities) {
  expect(opportunity.requiredSourceRows.length >= 3, `${opportunity.id}: insufficient source rows`);
  expect(opportunity.searchQueries.length >= 3, `${opportunity.id}: insufficient search queries`);
  expect(opportunity.publicUseBoundary.length >= 30, `${opportunity.id}: weak rights boundary`);
}

for (const capture of captureLog.results) {
  expect(capture.status === 'captured_public_surface', `${capture.screenshotId}: capture status ${capture.status}`);
  expect(capture.screenshotBytes > 12_000, `${capture.screenshotId}: capture too small`);
  const screenshotFile = path.join(docsDir, ...capture.screenshot.split('/'));
  expect(fs.existsSync(screenshotFile), `${capture.screenshotId}: screenshot file missing`);
  expect(capture.verificationBoundary.includes('로그인 안쪽'), `${capture.screenshotId}: capture boundary missing`);
}

for (const file of [jsonFile, htmlFile, handoffFile]) {
  const text = fs.readFileSync(file, 'utf8');
  expect(!/\b(?:TODO|TBD|PLACEHOLDER)\b/i.test(text), `${path.basename(file)}: placeholder marker found`);
  expect(!/generic memoHint/i.test(text), `${path.basename(file)}: generic memoHint marker found`);
}

const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
const browser = await chromium.launch({
  headless: true,
  ...(chromeExecutable && fs.existsSync(chromeExecutable) ? { executablePath: chromeExecutable } : {}),
});

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];
const renderResults = [];

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
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(() => {
    document.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });
  });
  await page.waitForTimeout(700);

  await page.screenshot({
    path: path.join(assetDir, `report-${viewport.name}-cover.png`),
    fullPage: false,
  });

  await page.locator('#pattern-overview .pattern-card').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(assetDir, `report-${viewport.name}-patterns.png`),
    fullPage: false,
  });

  await page.locator('#service-the-knot .ui-screen').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(assetDir, `report-${viewport.name}-the-knot.png`),
    fullPage: false,
  });

  await page.locator('#service-sidechef .ui-screen').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(assetDir, `report-${viewport.name}-sidechef-ui.png`),
    fullPage: false,
  });

  await page.locator('#opportunities').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(assetDir, `report-${viewport.name}-opportunities.png`),
    fullPage: false,
  });

  const metrics = await page.evaluate(() => {
    const images = [...document.querySelectorAll('img')];
    const viewportWidth = document.documentElement.clientWidth;
    const outsideViewport = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,select,summary,dt,dd,li,label')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -2 || rect.right > viewportWidth + 2);
      })
      .slice(0, 40)
      .map((element) => ({
        tag: element.tagName,
        text: (element.textContent || '').trim().slice(0, 90),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return {
      cardCount: document.querySelectorAll('.service-card').length,
      patternCardCount: document.querySelectorAll('.pattern-card').length,
      storyboardCount: document.querySelectorAll('.ui-storyboard').length,
      uiScreenCount: document.querySelectorAll('.ui-screen').length,
      opportunityCount: document.querySelectorAll('.opportunity-card').length,
      imageCount: images.length,
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src')),
      documentHorizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      outsideViewport,
      externalSourceLinks: [...document.querySelectorAll('.source-list a')].filter((link) => /^https:\/\//.test(link.href)).length,
    };
  });

  const deepGoCount = data.verifiedServices.filter((service) => (
    data.deepDiveServiceIds.includes(service.id) && service.finalDecision === 'go'
  )).length;
  const deepPartnerCount = data.verifiedServices.filter((service) => (
    data.deepDiveServiceIds.includes(service.id) && service.finalDecision === 'partner'
  )).length;

  await page.locator('[data-filter="go"]').click();
  const goVisible = await page.locator('.service-card:not(.hidden)').count();
  await page.locator('[data-filter="partner"]').click();
  const partnerVisible = await page.locator('.service-card:not(.hidden)').count();
  await page.locator('[data-filter="all"]').click();
  await page.selectOption('#category-filter', 'health_fitness');
  const healthVisible = await page.locator('.service-card:not(.hidden)').count();
  await page.selectOption('#category-filter', 'all');

  const firstScoreDetails = page.locator('.score-details').first();
  await firstScoreDetails.locator('summary').click();
  const scoreDetailsOpened = await firstScoreDetails.evaluate((element) => element.open);

  const result = {
    viewport,
    ...metrics,
    filterChecks: {
      goVisible,
      expectedGoVisible: deepGoCount,
      partnerVisible,
      expectedPartnerVisible: deepPartnerCount,
      healthVisible,
      expectedHealthVisible: 1,
    },
    scoreDetailsOpened,
    consoleErrors,
    pageErrors,
  };
  renderResults.push(result);

  expect(metrics.cardCount === 10, `${viewport.name}: service card count ${metrics.cardCount} != 10`);
  expect(metrics.patternCardCount === 8, `${viewport.name}: pattern card count ${metrics.patternCardCount} != 8`);
  expect(metrics.storyboardCount === 10, `${viewport.name}: storyboard count ${metrics.storyboardCount} != 10`);
  expect(metrics.uiScreenCount === 40, `${viewport.name}: UI screen count ${metrics.uiScreenCount} != 40`);
  expect(metrics.opportunityCount === 8, `${viewport.name}: opportunity count ${metrics.opportunityCount} != 8`);
  expect(metrics.imageCount === 20, `${viewport.name}: image count ${metrics.imageCount} != 20`);
  expect(metrics.brokenImages.length === 0, `${viewport.name}: ${metrics.brokenImages.length} broken images`);
  expect(metrics.documentHorizontalOverflow <= 1, `${viewport.name}: horizontal overflow ${metrics.documentHorizontalOverflow}`);
  expect(metrics.outsideViewport.length === 0, `${viewport.name}: ${metrics.outsideViewport.length} elements outside viewport`);
  expect(goVisible === deepGoCount, `${viewport.name}: Go filter ${goVisible} != ${deepGoCount}`);
  expect(partnerVisible === deepPartnerCount, `${viewport.name}: Partner filter ${partnerVisible} != ${deepPartnerCount}`);
  expect(healthVisible === 1, `${viewport.name}: category filter ${healthVisible} != 1`);
  expect(scoreDetailsOpened, `${viewport.name}: score details did not open`);
  expect(consoleErrors.length === 0, `${viewport.name}: ${consoleErrors.length} console errors`);
  expect(pageErrors.length === 0, `${viewport.name}: ${pageErrors.length} page errors`);
  await context.close();
}

await browser.close();

const output = {
  schemaVersion: 'flowme-vertical-execution-service-render-check-v1',
  generatedAt: new Date().toISOString(),
  dataChecks: {
    discovered: data.summary.discoveredCount,
    verified: data.summary.verifiedCount,
    deepDive: data.summary.deepDiveCount,
    categories: data.summary.categoryCount,
    opportunities: data.summary.opportunityCount,
    captures: captureLog.counts,
  },
  renderResults,
  failures,
  passed: failures.length === 0,
  note: '브라우저 자동 검증은 레이아웃·상호작용·이미지 상태를 확인한다. 실제 사용자 관찰 검증이 아니다.',
};

fs.writeFileSync(renderLogFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
