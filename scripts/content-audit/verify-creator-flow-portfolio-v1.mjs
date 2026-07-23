import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const auditDir = path.join(repoRoot, 'docs', 'content-audit');
const assetDir = path.join(auditDir, '2026-07-23-creator-flow-portfolio-assets');
const dataPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-data-v1.json');
const htmlPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-review-ko.html');
const handoffPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-logic-handoff-ko.md');
const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
const htmlSource = await fs.readFile(htmlPath, 'utf8');
const handoffSource = await fs.readFile(handoffPath, 'utf8');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function itemsFor(bundle) {
  return (bundle.map?.flows || []).flatMap((flow) => (
    (flow.steps || []).flatMap((step) => step.items || [])
  ));
}

check(data.candidateDiscoveryLedger.length >= 60, 'creator candidate count is below 60');
check(data.creatorPortfolioRecords.length >= 24 && data.creatorPortfolioRecords.length <= 27, 'deep creator count must be 24-27');
check(data.researchSummary.profileUrlsOpened >= 45, 'opened profile count is below 45');
check(data.researchSummary.contentUrlsOpened >= 90, 'opened content URL count is below 90');
check(data.representativeFlowExamples.length === 9, 'representative Flow example count must be 9');
check(Object.values(data.validation).every(Boolean), 'embedded validation contains a false value');

for (const creator of data.creatorPortfolioRecords) {
  check(creator.contentReviews.filter((review) => review.sourceOpened).length >= 3, `${creator.creatorId}: fewer than three opened contents`);
  for (const [scoreKey, score] of Object.entries(creator.scores)) {
    check(Number.isFinite(score.score), `${creator.creatorId}.${scoreKey}: score missing`);
    check(Boolean(score.comment?.trim()), `${creator.creatorId}.${scoreKey}: score comment missing`);
  }
}

for (const example of data.representativeFlowExamples) {
  const rowById = new Map(example.sourceRows.map((row) => [row.sourceRowId, row]));
  const items = itemsFor(example.userContentBundle);
  check(items.length === example.counts.items, `${example.creatorId}: item count mismatch`);
  check(
    (example.userContentBundle.map?.flows || []).length === example.counts.flows,
    `${example.creatorId}: flow count mismatch`,
  );
  for (const item of items) {
    check(item.sourceRowIds?.length > 0, `${item.itemId}: sourceRowIds missing`);
    check(item.sourceTrace?.length > 0, `${item.itemId}: sourceTrace missing`);
    for (const rowId of item.sourceRowIds || []) {
      check(rowById.has(rowId), `${item.itemId}: source row ${rowId} not included in example`);
    }
    for (const trace of item.sourceTrace || []) {
      check(Boolean(trace.sourceRowId && trace.sourceUrl && trace.sourceLocator), `${item.itemId}: incomplete source trace`);
      const row = rowById.get(trace.sourceRowId);
      check(Boolean(row), `${item.itemId}: trace row ${trace.sourceRowId} missing`);
      if (row) check(row.sourceUrl === trace.sourceUrl, `${item.itemId}: trace URL differs from source row`);
    }
  }
  const userContentText = JSON.stringify(example.userContentBundle);
  for (const internalKey of ['totalScore', 'decisionBand', 'adoptionReason', 'scoreComment', 'visibleDemandScore']) {
    check(!userContentText.includes(internalKey), `${example.creatorId}: internal review key leaked into user content (${internalKey})`);
  }
}

const combinedText = `${JSON.stringify(data)}\n${htmlSource}\n${handoffSource}`;
for (const forbidden of ['TODO', 'TBD', 'placeholder', 'generic memoHint', '"memoHint"']) {
  check(!combinedText.includes(forbidden), `forbidden placeholder text found: ${forbidden}`);
}
check(!/href=["'][^"']*\/flows\//.test(htmlSource), 'nonexistent app route link found in HTML');

for (const capture of data.screenshotEvidence.records) {
  const capturePath = path.join(auditDir, capture.relativePath);
  try {
    const stat = await fs.stat(capturePath);
    check(stat.size > 10_000, `capture is unexpectedly small: ${capture.relativePath}`);
  } catch {
    failures.push(`capture file missing: ${capture.relativePath}`);
  }
}

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const browserResults = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ko-KR',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    creatorCount: document.querySelectorAll('.creator-card').length,
    visibleCreatorCount: [...document.querySelectorAll('.creator-card')].filter((card) => !card.hidden).length,
    brokenImages: [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
    clippedTextElements: [...document.querySelectorAll('h1,h2,h3,h4,p,strong,a,span,small')]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return element.scrollWidth > element.clientWidth + 2 && style.overflowX !== 'auto';
      })
      .slice(0, 20)
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      })),
  }));
  check(layout.documentWidth <= viewport.width, `${viewport.name}: horizontal document overflow ${layout.documentWidth}/${viewport.width}`);
  check(layout.bodyWidth <= viewport.width, `${viewport.name}: horizontal body overflow ${layout.bodyWidth}/${viewport.width}`);
  check(layout.creatorCount === 27, `${viewport.name}: creator card count is not 27`);
  check(layout.visibleCreatorCount === 27, `${viewport.name}: initial visible creator count is not 27`);
  check(layout.brokenImages.length === 0, `${viewport.name}: broken images ${layout.brokenImages.join(', ')}`);

  await page.getByRole('button', { name: 'Go', exact: true }).click();
  const goFilter = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('.creator-card')].filter((card) => !card.hidden).length,
    invalid: [...document.querySelectorAll('.creator-card')].filter((card) => !card.hidden && card.dataset.band !== 'Go').length,
  }));
  check(goFilter.visible > 0 && goFilter.invalid === 0, `${viewport.name}: Go filter failed`);

  await page.getByRole('button', { name: '전체 27', exact: true }).click();
  await page.getByRole('button', { name: '여행·외출', exact: true }).last().click();
  const categoryFilter = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('.creator-card')].filter((card) => !card.hidden).length,
    invalid: [...document.querySelectorAll('.creator-card')].filter((card) => !card.hidden && card.dataset.category !== 'travel_outings').length,
  }));
  check(categoryFilter.visible === 3 && categoryFilter.invalid === 0, `${viewport.name}: category filter failed`);

  await page.getByRole('button', { name: '여행·외출', exact: true }).last().click();
  const firstExample = page.locator('.flow-example').first();
  await firstExample.scrollIntoViewIfNeeded();
  const firstItem = firstExample.locator('.item-list li').first();
  check(await firstItem.isVisible(), `${viewport.name}: representative Flow Item is not visible`);

  const screenshotPath = path.join(assetDir, `qa-report-${viewport.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  browserResults.push({
    viewport,
    layout,
    goVisibleCount: goFilter.visible,
    categoryVisibleCount: categoryFilter.visible,
    screenshotPath,
  });
  await context.close();
}

await browser.close();

const output = {
  schemaVersion: 'creator-flow-portfolio-verification-v1',
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  failures,
  browserResults,
};
await fs.writeFile(
  path.join(assetDir, 'verification-v1.json'),
  `${JSON.stringify(output, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(output, null, 2));
if (failures.length > 0) process.exit(1);

\n
