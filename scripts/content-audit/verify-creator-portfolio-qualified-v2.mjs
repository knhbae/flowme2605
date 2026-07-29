import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const auditDir = path.join(repoRoot, 'docs', 'content-audit');
const assetDir = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-assets',
);
const dataPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-v2.json',
);
const htmlPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-review-ko.html',
);
const handoffPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-logic-handoff-ko.md',
);
const manifestPath = path.join(assetDir, 'source-screenshot-manifest-v2.json');
const outputPath = path.join(assetDir, 'verification-v2.json');

const [dataText, htmlText, handoffText, manifestText] = await Promise.all([
  fs.readFile(dataPath, 'utf8'),
  fs.readFile(htmlPath, 'utf8'),
  fs.readFile(handoffPath, 'utf8'),
  fs.readFile(manifestPath, 'utf8'),
]);
const data = JSON.parse(dataText);
const manifest = JSON.parse(manifestText);
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(data.entityRecords.length === 27, 'entityRecords must contain 27 records');
check(data.rightsRecords.length === 27, 'rightsRecords must contain 27 records');
check(data.evidenceRecords.length === 27, 'evidenceRecords must contain 27 records');
check(
  data.logicHandoffSelections.length >= 6 &&
    data.logicHandoffSelections.length <= 9,
  'logic handoff selections must contain 6-9 records',
);
check(data.boundaryCases.length === 5, 'boundaryCases must contain 5 records');
check(
  data.rightsRecords.every((record) =>
    [
      'not_reviewed',
      'link_metadata_only',
      'permission_required',
      'private_conversion_only',
      'public_conversion_allowed',
    ].includes(record.status),
  ),
  'every rights record must use a supported status',
);
check(
  data.rightsRecords
    .filter((record) => record.status === 'public_conversion_allowed')
    .every(
      (record) =>
        record.evidenceClass === 'observed_explicit_permission' &&
        record.evidenceUrl,
    ),
  'public_conversion_allowed requires direct evidence',
);
check(
  data.evidenceRecords.every(
    (record) =>
      record.audienceActivity &&
      record.materialRequest &&
      record.executionOutcome &&
      record.creatorResponse &&
      record.businessEvidence,
  ),
  'normalized evidence dimensions are incomplete',
);
check(
  data.qualificationRecords.every((record) =>
    Object.values(record.scoreAudit).every(
      (score) =>
        Number.isFinite(score.score) &&
        typeof score.comment === 'string' &&
        score.comment.length > 0 &&
        score.observationWindow &&
        score.evidenceUrls?.length,
    ),
  ),
  'every score must have score, comment, observation window, and evidence URL',
);
check(
  manifest.summary.captured === data.logicHandoffSelections.length &&
    manifest.summary.failed === 0,
  'source screenshot captures are incomplete',
);

const sourceRows = new Set(
  data.representativeSourceRows.map((row) => row.sourceRowId),
);
for (const example of data.representativeFlowExamples) {
  check(
    (example.userContentBundle.setupFields || []).length <= 2,
    `${example.creatorId}: setup fields exceed 2`,
  );
  for (const flow of example.userContentBundle.map?.flows || []) {
    for (const step of flow.steps || []) {
      for (const item of step.items || []) {
        check(
          item.sourceRowIds?.length > 0,
          `${item.itemId}: sourceRowIds are missing`,
        );
        check(
          item.sourceTrace?.length > 0,
          `${item.itemId}: sourceTrace is missing`,
        );
        for (const rowId of item.sourceRowIds || []) {
          check(sourceRows.has(rowId), `${item.itemId}: source row ${rowId} missing`);
        }
      }
    }
  }
}

const forbiddenPatterns = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /placeholder/i,
  /generic memoHint/i,
  /publicRightsReady/,
];
for (const pattern of forbiddenPatterns) {
  check(!pattern.test(dataText), `JSON contains forbidden pattern ${pattern}`);
  check(!pattern.test(htmlText), `HTML contains forbidden pattern ${pattern}`);
  check(!pattern.test(handoffText), `handoff contains forbidden pattern ${pattern}`);
}

for (const capture of manifest.captures) {
  const stat = await fs.stat(capture.absolutePath);
  check(stat.size > 20_000, `${capture.filename}: screenshot is unexpectedly small`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const browserResults = [];
for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const context = await browser.newContext({
    viewport,
    locale: 'ko-KR',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'load',
    timeout: 30_000,
  });
  await page.waitForTimeout(700);
  const initial = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    selectedCards: document.querySelectorAll('[data-kind="selected"]').length,
    boundaryCards: document.querySelectorAll('[data-kind="boundary"]').length,
    auditCards: document.querySelectorAll('[data-kind="audit"]').length,
    brokenImages: [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  }));
  check(
    initial.documentWidth <= initial.viewportWidth + 1,
    `${viewport.name}: horizontal overflow ${initial.documentWidth}/${initial.viewportWidth}`,
  );
  check(initial.selectedCards === 8, `${viewport.name}: selected card count mismatch`);
  check(initial.boundaryCards === 5, `${viewport.name}: boundary card count mismatch`);
  check(initial.auditCards === 27, `${viewport.name}: audit card count mismatch`);
  check(
    initial.brokenImages.length === 0,
    `${viewport.name}: broken images ${initial.brokenImages.join(', ')}`,
  );

  let topScreenshotPath = null;
  if (viewport.name === 'mobile') {
    topScreenshotPath = path.join(
      assetDir,
      'qa-qualified-report-mobile-top.png',
    );
    await page.screenshot({ path: topScreenshotPath, fullPage: false });
  }

  await page.locator('[data-filter="selected"]').click();
  const selectedFilterResult = await page.evaluate(() => ({
    visibleSelected: [...document.querySelectorAll('[data-kind="selected"]')].filter(
      (card) => !card.classList.contains('hidden'),
    ).length,
    visibleBoundary: [...document.querySelectorAll('[data-kind="boundary"]')].filter(
      (card) => !card.classList.contains('hidden'),
    ).length,
  }));
  check(
    selectedFilterResult.visibleSelected === 8 &&
      selectedFilterResult.visibleBoundary === 0,
    `${viewport.name}: selected filter failed`,
  );
  await page.locator('[data-filter="all"]').click();

  if (viewport.name === 'mobile') {
    const firstDetails = page.locator('.candidate-card .full-content').first();
    await firstDetails.locator(':scope > summary').click();
    await page.waitForTimeout(300);
    const firstItem = firstDetails.locator('.item').first();
    await firstItem.scrollIntoViewIfNeeded();
  }
  const screenshotPath = path.join(
    assetDir,
    `qa-qualified-report-${viewport.name}.png`,
  );
  await page.screenshot({
    path: screenshotPath,
    fullPage: viewport.name === 'desktop',
  });
  browserResults.push({
    viewport,
    initial,
    selectedFilterResult,
    consoleErrors,
    topScreenshotPath,
    screenshotPath,
  });
  check(
    consoleErrors.length === 0,
    `${viewport.name}: console errors ${consoleErrors.join(' | ')}`,
  );
  await context.close();
}
await browser.close();

const result = {
  schemaVersion: 'flowme-creator-portfolio-qualified-verification-v2',
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  failures,
  dataChecks: data.validation.checks,
  browserResults,
};
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, passed: result.passed, failures }, null, 2));
if (!result.passed) process.exitCode = 1;
