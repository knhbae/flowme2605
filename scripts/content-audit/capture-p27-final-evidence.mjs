import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageDir = process.env.FLOWME_CAPTURE_OUTPUT_DIR
  ? path.resolve(repoRoot, process.env.FLOWME_CAPTURE_OUTPUT_DIR)
  : path.join(
      repoRoot,
      'docs',
      'content-audit',
      '2026-07-21-p27-lifecycle-workspace-final',
    );
const screenshotsDir = path.join(packageDir, 'screenshots');
const reviewPath = process.env.FLOWME_CAPTURE_REVIEW_PATH
  ? path.resolve(repoRoot, process.env.FLOWME_CAPTURE_REVIEW_PATH)
  : path.join(packageDir, 'review.html');
const baseUrl = process.env.FLOWME_CAPTURE_BASE_URL || 'http://127.0.0.1:3114';
const commitSha = process.env.FLOWME_CAPTURE_COMMIT_SHA || 'unknown';
const evidenceKind = process.env.FLOWME_CAPTURE_EVIDENCE_KIND || 'current_local_production_browser';
const captureReviewBoardEnabled =
  process.env.FLOWME_CAPTURE_REVIEW_BOARD !== 'false' && fs.existsSync(reviewPath);

const viewports = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
};

fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const entries = [];
const reviewBoardEntries = [];

try {
  await capture('public-adjustment-mobile', 'mobile', async (page) => {
    await openFresh(page, '/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await page.getByTestId('public-flow-personal-adjustment').waitFor({ state: 'visible' });
    return {
      route: '/f/moving-d30-basic',
      personalAdjustmentVisible: true,
      adjustmentMode: await page.getByTestId('public-flow-personal-adjustment').getAttribute('data-adjustment-mode'),
      adjustmentRowCount: await page.getByTestId('public-flow-adjustment-row').count(),
      visibleTitleInputCount: await page.getByTestId('public-flow-adjustment-title').count(),
      visibleDateInputCount: await page.getByTestId('public-flow-adjustment-date').count(),
      visibleReorderControlCount: await page.getByRole('button', { name: /아래로 이동/ }).count(),
      internalTermHitCount: await countTextHits(page, ['Markdown', 'source-backed', 'Canonical URL', 'handoff']),
    };
  });

  await capture('workout-preview-mobile', 'mobile', async (page) => {
    await openFresh(page, '/f/curated-allblanc-morning-workout');
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
    await workbench.getByTestId('routine-preview-horizon').waitFor({ state: 'visible' });
    return {
      route: '/f/curated-allblanc-morning-workout',
      previewHorizon: await workbench.getByTestId('routine-preview-horizon').innerText(),
      seriesEndPolicy: await workbench.getByTestId('routine-series-end-policy').getAttribute('data-series-end-policy'),
      seriesEndLabel: await workbench.getByTestId('routine-series-end-policy').innerText(),
      sourceResourceLinkCount: await workbench.getByRole('link', { name: /원본 영상 열기/ }).count(),
      completionLikeResourceControlCount: await workbench.locator('[aria-label*="완료"]:not([data-testid="public-flow-preview-checkbox"])').count(),
    };
  });

  await capture('my-flow-compact-library-mobile', 'mobile', async (page) => {
    await page.addInitScript(seedCompactLibrary);
    await page.goto(`${baseUrl}/my`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    const summary = page.getByTestId('my-flow-mobile-flow-summary');
    await summary.waitFor({ state: 'visible' });
    return {
      route: '/my',
      libraryMode: await summary.getAttribute('data-library-mode'),
      flowRowCount: await page.getByTestId('my-flow-mobile-structure-row').count(),
      searchControlCount: await page.getByTestId('my-flow-search').count(),
      libraryFilterControlCount: await page.getByTestId('my-flow-list-filter-all').count(),
    };
  });

  await capture('my-flow-search-workspace-wide', 'wide', async (page) => {
    await page.goto(`${baseUrl}/my?demo=ux12`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    const searchVisibleBeforeOpen = await page.getByTestId('my-flow-search').isVisible();
    await page.getByTestId('my-flow-search').fill('중고차');
    const flow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
    await flow.getByTestId('my-flow-next-action-open').click();
    await flow.getByTestId('my-flow-whole-flow-workspace').waitFor({ state: 'visible' });
    return {
      route: '/my?demo=ux12',
      searchVisibleBeforeOpen,
      selectedFlowSlug: await page.getByTestId('my-flow-scope-select').inputValue(),
      wholeFlowWorkspaceVisible: await flow.getByTestId('my-flow-whole-flow-workspace').isVisible(),
      executionRowCount: await flow.getByTestId('my-flow-execution-row-shell').count(),
    };
  });

  await capture('calendar-routine-wide', 'wide', async (page) => {
    await page.goto(`${baseUrl}/calendar?demo=ux12`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    await page.waitForTimeout(250);
    const wrappers = page.locator('.my-flow-routine-rail-event, .my-flow-schedule-overflow-event');
    return {
      route: '/calendar?demo=ux12',
      routineWrapperCount: await wrappers.count(),
      tabbableRoutineWrapperCount: await wrappers.evaluateAll((nodes) =>
        nodes.filter((node) => node.getAttribute('tabindex') !== '-1').length,
      ),
      namedRoutineIconCount: await page.locator('[data-testid="my-flow-routine-icon"][aria-label]').count(),
      flowScopeControlVisible: await page.getByTestId('my-flow-calendar-scope-filter').isVisible().catch(() => false),
    };
  });

  await capture('archive-recovery-wide', 'wide', async (page) => {
    await openFresh(page, '/flow-maps/moving-d30');
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-save-all').click();
    await page.getByTestId('my-flow-post-save-view-flow').click();
    const flow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await flow.getByTestId('my-flow-archive-toggle').click();
    await page.getByTestId('my-flow-lifecycle-snackbar').waitFor({ state: 'visible' });
    const lifecycle = await page.evaluate(() => JSON.parse(
      window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{}',
    ));
    return {
      route: '/my?savedMap=moving-d30',
      archiveFeedbackVisible: await page.getByTestId('my-flow-lifecycle-snackbar').isVisible(),
      immediateUndoVisible: await page.getByTestId('my-flow-lifecycle-undo').isVisible(),
      archivedFlowSlugs: lifecycle.archivedFlowSlugs ?? [],
      savedSourceRecordPreserved: await page.evaluate(() => Boolean(
        window.localStorage.getItem('flow:saved:source-backed-moving-d30'),
      )),
    };
  });

  await capture('post-save-receipt-mobile', 'mobile', async (page) => {
    await saveMovingMap(page, true);
    const panel = page.getByTestId('my-flow-post-save-panel');
    await panel.waitFor({ state: 'visible' });
    return {
      route: '/my?savedMap=moving-d30',
      receiptLayout: await panel.getByTestId('my-flow-post-save-metrics').getAttribute('data-layout'),
      actionHubLayout: await panel.getByTestId('my-flow-post-save-action-hub').getAttribute('data-layout'),
      visibleStepCount: await panel.getByTestId('my-flow-post-save-step').count(),
      exportPanelInitiallyVisibleCount: await panel.getByTestId('my-flow-post-save-export-region').count(),
    };
  });

  await capture('export-preflight-mobile', 'mobile', async (page) => {
    await saveMovingMap(page, true);
    const panel = page.getByTestId('my-flow-post-save-panel');
    await panel.getByTestId('my-flow-post-save-open-export').click();
    const exportRegion = panel.getByTestId('my-flow-post-save-export-region');
    await exportRegion.waitFor({ state: 'visible' });
    const exportPanel = exportRegion.getByTestId('my-flow-export-panel');
    return {
      route: '/my?savedMap=moving-d30',
      exportLayout: await exportPanel.getAttribute('data-export-layout'),
      scopeSummary: await exportPanel.getByTestId('my-flow-export-scope-summary').innerText(),
      detailLossNoticeVisible: await exportPanel.getByTestId('my-flow-export-detail-loss-notice').isVisible(),
      numberedWizardCopyHitCount: await countTextHits(exportPanel, ['1 범위', '2 예상 결과', '3 형식']),
    };
  });

  if (captureReviewBoardEnabled) {
    for (const device of Object.keys(viewports)) {
      await captureReviewBoard(device);
    }
  }
} finally {
  await browser.close();
}

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  commitSha,
  evidenceKind,
  observedUserSessionCount: 0,
  entries,
  reviewBoardEntries,
  summary: {
    screenshotCount: entries.length,
    horizontalOverflowCount: entries.filter((entry) => entry.horizontalOverflow).length,
    consoleErrorCount: entries.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
    pageErrorCount: entries.reduce((sum, entry) => sum + entry.pageErrorCount, 0),
    unnamedFocusableCount: entries.reduce((sum, entry) => sum + entry.unnamedFocusableCount, 0),
    reviewBoardScreenshotCount: reviewBoardEntries.length,
    reviewBoardHorizontalOverflowCount: reviewBoardEntries.filter((entry) => entry.horizontalOverflow).length,
    reviewBoardConsoleErrorCount: reviewBoardEntries.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
  },
};

fs.writeFileSync(
  path.join(packageDir, 'capture-results.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(result.summary, null, 2));

async function capture(id, device, prepare) {
  const viewport = viewports[device];
  const context = await browser.newContext({
    viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    const markers = await prepare(page);
    await settle(page);
    const metrics = await collectMetrics(page);
    const screenshot = path.join(screenshotsDir, `${id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    entries.push({
      id,
      device,
      viewport,
      screenshot: path.relative(packageDir, screenshot).replaceAll('\\', '/'),
      finalUrl: page.url(),
      ...markers,
      ...metrics,
      consoleErrorCount: consoleErrors.length,
      consoleErrors,
      pageErrorCount: pageErrors.length,
      pageErrors,
    });
  } finally {
    await context.close();
  }
}

async function captureReviewBoard(device) {
  const viewport = viewports[device];
  const context = await browser.newContext({ viewport, locale: 'ko-KR', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(pathToFileURL(reviewPath).href, { waitUntil: 'load' });
    const metrics = await collectMetrics(page);
    const screenshot = path.join(screenshotsDir, `review-board-${device}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    reviewBoardEntries.push({
      device,
      viewport,
      screenshot: path.relative(packageDir, screenshot).replaceAll('\\', '/'),
      ...metrics,
      consoleErrorCount: consoleErrors.length,
      consoleErrors,
      pageErrorCount: pageErrors.length,
      pageErrors,
    });
  } finally {
    await context.close();
  }
}

async function openFresh(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function saveMovingMap(page, mobile) {
  await openFresh(page, '/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  await page.getByTestId(mobile ? 'flow-map-save-all-mobile' : 'flow-map-save-all').click();
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(100);
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const hasAccessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
        : '';
      const associatedLabelText = 'labels' in element
        ? [...(element.labels ?? [])].map((label) => label.textContent ?? '').join(' ')
        : '';
      return Boolean(
        element.getAttribute('aria-label')?.trim()
        || labelledText.trim()
        || associatedLabelText.trim()
        || element.getAttribute('title')?.trim()
        || element.getAttribute('alt')?.trim()
        || element.textContent?.trim()
        || element.getAttribute('value')?.trim(),
      );
    };
    const focusables = [...document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )].filter(isVisible);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      visibleFocusableCount: focusables.length,
      unnamedFocusableCount: focusables.filter((element) => !hasAccessibleName(element)).length,
      title: document.title,
    };
  });
}

async function countTextHits(root, phrases) {
  const text = await root.locator('body').count().then(async (bodyCount) => (
    bodyCount ? root.locator('body').innerText() : root.innerText()
  ));
  return phrases.filter((phrase) => text.includes(phrase)).length;
}

function seedCompactLibrary() {
  window.localStorage.clear();
  const records = [
    { slug: 'moving-d30-basic', savedAt: '2030-01-01T00:00:00.000Z', anchor: '2030-08-15' },
    { slug: 'vehicle-inspection-prep', savedAt: '2030-01-02T00:00:00.000Z' },
    { slug: 'washer-tub-clean-monthly', savedAt: '2030-01-03T00:00:00.000Z', anchor: '2030-08-01' },
  ];
  records.forEach((record) => {
    window.localStorage.setItem(`flow:saved:${record.slug}`, JSON.stringify({
      ...record,
      selectedArtifactMode: record.anchor ? 'calendar' : 'checklist',
      dateIntent: record.anchor ? 'custom' : 'undated',
    }));
    window.localStorage.setItem(`flow:${record.slug}:anchorDate`, JSON.stringify({
      mode: record.anchor ? 'custom' : 'undated',
      anchor: record.anchor ?? '',
    }));
  });
}
