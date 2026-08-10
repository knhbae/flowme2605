import fs from 'node:fs';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { addDays, formatKoreanShortDate, formatLocalDate } from '../../lib/flow/date';
import { FLOW_EXPORT_LABELS } from '../../lib/flow/export-labels';
import {
  RUNTIME_ARCHIVED_FLOW_POLICIES,
  RUNTIME_ARCHIVED_FLOW_SLUGS,
} from '../../lib/flow/runtime-content-policy';
import { seedBundles } from '../../lib/flow/seed-flows';
import { getCuratedSourceAppSeedFlowMaps, getSourceBackedHomepageFlowMaps } from '../../lib/flow/source-backed-my-flow';
import {
  collectSourceSlugSignals,
  findFirstTaskRepetitionHits,
  normalizeGuardrailLines,
  scanPrototypeRouteGuardrails,
  scanUserSurfaceGuardrails,
} from '../../lib/flow/user-surface-guardrails';
import {
  closeOpenMyFlowItemDetail,
  expandMyFlowWholePlan,
  getMyFlowVisibleExecutionRows,
  getOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const userSurfaceInternalTerms = [
  /묶음/,
  /검수\s*필요/,
  /정리\s*필요/,
  /\bdemo\b/i,
  /데모/,
  /\breview\b/i,
  /\baudit\b/i,
  /source-backed/i,
  /sourceTrace/,
  /partial_draft/,
  /source_import_required/,
  /\bFlow Map\b/,
  /Flow\s+일정/,
  /지도\s+일정/,
  /지도\s+루틴/,
  /\bbundle\b/i,
  /\breadiness\b/i,
  /대표\s*후보/,
  /샘플\s*후보/,
  /보류\s*후보/,
  /삭제\s*후보/,
  /대표\s*노출/,
  /내부\s*검토/,
  /검토\s*상태/,
  /\bStep\b/,
];

const userFacingSourceSlugSignals = collectSourceSlugSignals([
  ...seedBundles,
  ...getSourceBackedHomepageFlowMaps(),
  ...getCuratedSourceAppSeedFlowMaps(),
]);

function createMovingDateFixture() {
  const anchor = addDays(new Date(), 10);

  return {
    anchor: formatLocalDate(anchor),
    firstActionLabel: formatKoreanShortDate(addDays(anchor, -30), { includeWeekday: false }),
  };
}

async function expectNoInternalUserSurfaceCopy(locator: Locator) {
  for (const term of userSurfaceInternalTerms) {
    await expect(locator).not.toContainText(term);
  }
}

async function expectNoUserFacingRawIsoDate(locator: Locator) {
  const result = scanUserSurfaceGuardrails({ primaryLines: await getLocatorLines(locator) });
  expect(result.rawIsoDateHits).toEqual([]);
}

async function expectNoVisibleSourceBrandSlug(locator: Locator) {
  const result = scanUserSurfaceGuardrails({
    primaryLines: await getLocatorLines(locator),
    sourceSlugSignals: userFacingSourceSlugSignals,
  });
  expect(result.sourceSlugHits).toEqual([]);
}

async function expectNoUserFacingDisplayLeakage(locator: Locator) {
  const result = scanUserSurfaceGuardrails({ primaryLines: await getLocatorLines(locator) });
  expect(result.trailingFlowSuffixHits.filter((hit) => !['My Flow', '저장한 Flow'].includes(hit))).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
}

async function enterMyFlowDetailEditMode(detail: Locator) {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
    return;
  }
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  const summary = readSummary.locator('summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) await summary.click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function openSavedPersonalItemEditor(page: Page, detail: Locator): Promise<Locator> {
  await detail.getByTestId('my-flow-quick-item-edit').click();
  const editor = page.getByTestId('saved-flow-editor-item');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-editor-context', 'saved-overlay');
  await expect(editor).toHaveAttribute('data-editor-level', 'item');
  return editor;
}

async function saveSavedPersonalItemEditor(page: Page, editor: Locator): Promise<void> {
  await editor.getByTestId('my-flow-detail-save-changes').click();
  await expect(editor).toHaveCount(0);
  const planEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(planEditor).toBeVisible();
  await planEditor.getByTestId('saved-flow-editor-save').click();
  await expect(planEditor).toHaveCount(0);
  if (await getOpenMyFlowItemDetail(page).isVisible().catch(() => false)) {
    await closeOpenMyFlowItemDetail(page);
  }
}

async function expandMyFlowAdvancedEditor(detail: Locator) {
  const toggle = detail.getByTestId('my-flow-editor-advanced-toggle');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function openMyFlowDetailTools(detail: Locator) {
  const tools = detail.getByTestId('my-flow-detail-portable-export');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) await tools.locator(':scope > summary').click();
  return tools;
}

async function confirmMyFlowTransfer(panel: Locator, action: Locator): Promise<Locator> {
  await action.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const receipt = panel.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute('data-outcome', 'success');
  return receipt;
}

async function acknowledgeMyFlowTransfer(receipt: Locator): Promise<void> {
  const close = receipt.getByTestId('flow-transfer-success-close');
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function openUrlFirstQuickStart(result: Locator) {
  const quickStart = result.getByTestId('flow-url-quick-start');
  await expect(quickStart).toBeVisible();
  if ((await quickStart.getAttribute('open')) === null) await quickStart.locator(':scope > summary').click();
  await expect(result.getByTestId('flow-url-start-panel')).toBeVisible();
}

async function expectNoPrototypeDisplayGateLeakage(locator: Locator, exportEntryLabels: string[] = []) {
  const result = scanPrototypeRouteGuardrails({
    primaryLines: await getLocatorLines(locator),
    exportEntryLabels,
  });
  expect(result.rawRouteSlugHits).toEqual([]);
  expect(result.englishWeekdayHits).toEqual([]);
  expect(result.englishUiVerbHits).toEqual([]);
  expect(result.englishMonthTimeHits).toEqual([]);
  expect(result.mixedExportLanguageHits).toEqual([]);
  expect(result.duplicateExportEntryHits).toEqual([]);
}

async function expectNoHorizontalOverflow(page: { evaluate: <T>(pageFunction: () => T | Promise<T>) => Promise<T> }) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasHorizontalOverflow).toBe(false);
}

async function seedSavedBabyHealthMap(
  page: Page,
  options: { version?: string; includeVaccination?: boolean } = {},
) {
  const version = options.version ?? '2026-06-23.1';
  const includeVaccination = options.includeVaccination ?? true;
  await page.goto('/my?demo=source-backed&savedMap=baby-health-schedule');
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await page.evaluate(
    ({ savedVersion, withVaccination }) => {
      const savedAt = '2026-05-28T03:00:00.000Z';
      const anchor = '2026-01-15';
      const checkupSlug = 'source-backed-baby-health-checkups';
      const vaccinationSlug = 'source-backed-baby-vaccination-schedule';
      const flowSlugs = withVaccination ? [checkupSlug, vaccinationSlug] : [checkupSlug];
      window.localStorage.setItem(
        'flow:map:saved:baby-health-schedule',
        JSON.stringify({
          mapId: 'baby-health-schedule',
          title: '영유아 검진·접종 일정 지도',
          version: savedVersion,
          savedAt,
          anchor,
          flowSlugs,
          stepCountsByFlow: {
            [checkupSlug]: 12,
            ...(withVaccination ? { [vaccinationSlug]: 6 } : {}),
          },
          riskLevelsByFlow: Object.fromEntries(flowSlugs.map((slug) => [slug, 'medical_sensitive'])),
          sourceCheckedAtByFlow: Object.fromEntries(flowSlugs.map((slug) => [slug, '2026-06-23'])),
        }),
      );
      flowSlugs.forEach((slug) => {
        window.localStorage.setItem(
          `flow:saved:${slug}`,
          JSON.stringify({ slug, savedAt, selectedArtifactMode: 'calendar', anchor }),
        );
      });
      if (!withVaccination) window.localStorage.removeItem(`flow:saved:${vaccinationSlug}`);
    },
    { savedVersion: version, withVaccination: includeVaccination },
  );
}

async function expectTextOccurrenceAtMost(locator: Locator, text: string, maxCount: number) {
  const content = await locator.innerText();
  expect(content.split(text).length - 1).toBeLessThanOrEqual(maxCount);
}

async function getLocatorLines(locator: Locator) {
  const visibleText = await locator.innerText();
  return normalizeGuardrailLines(visibleText.split(/\n+/));
}

async function getFirstContinuationTitle(section: Locator) {
  const titleLocator = section.getByTestId('my-flow-mobile-continuation-title').first();
  if (await titleLocator.count()) {
    await expect(titleLocator).toBeVisible();
    return (await titleLocator.innerText()).replace(/\s+/g, ' ').trim();
  }

  const card = section.getByTestId('my-flow-mobile-continuation-card').first();
  await expect(card).toBeVisible();
  const lines = await getLocatorLines(card);
  const title = lines.find((line) =>
    line.length > 1 &&
    !/먼저 할 일|지난 할 일|밀린 할 일|다음 할 일|열기|열림|완료|날짜 없음|\d+\/\d+|^\d{1,2}월 \d{1,2}일/.test(line),
  );
  expect(title).toBeTruthy();
  return title as string;
}

async function expectFirstContinuationTitleNotRepeated(section: Locator) {
  const title = await getFirstContinuationTitle(section);
  const hits = findFirstTaskRepetitionHits(await getLocatorLines(section), title, { maxCount: 1 });
  expect(hits).toEqual([]);
}

async function expectTodaySummaryIsQuietSupport(page: Page) {
  const summary = page.getByTestId('my-flow-today-summary');
  await expect(summary).toHaveCount(0);
}

async function openPostSaveWorkspaceIfPresent(page: Page) {
  const panel = page.getByTestId('my-flow-post-save-panel');
  const hasPostSaveHandoff = /[?&]saved(?:Flow|Map)=/.test(page.url());
  if (hasPostSaveHandoff) await expect(panel).toBeVisible();
  if (hasPostSaveHandoff || (await panel.isVisible().catch(() => false))) {
    await panel.getByTestId('my-flow-post-save-view-flow').click();
    await expect(panel).toHaveCount(0);
  }
}

async function openCurrentMyFlowLibrary(page: Page) {
  const currentFlowView = page.getByTestId('my-flow-todo-experiment-view-flows');
  if (
    await currentFlowView.isVisible().catch(() => false) &&
    (await currentFlowView.getAttribute('aria-selected')) !== 'true'
  ) {
    await currentFlowView.click();
  }
  const legacyFlowView = page.getByTestId('my-flow-view-flow');
  if (await legacyFlowView.isVisible().catch(() => false)) await legacyFlowView.click();
  await expect(
    page.locator(
      '[data-testid="my-flow-mobile-flow-hub"]:visible, '
        + '[data-testid="my-flow-library-workspace"]:visible, '
        + '[data-testid="my-flow-mobile-workspace"]:visible, '
        + 'main[data-p32-workspace-state="focused"]:visible',
    ).first(),
  ).toBeVisible();
}

async function savePublicFlowToSelectedPlan(
  page: Page,
  button: Locator,
  expectedItemCount = 24,
): Promise<string> {
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await button.click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
      hasSaveReceipt: url.searchParams.has('saveReceipt'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasSaveReceipt: false,
  });

  const selectedPlanSlug = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(selectedPlanSlug).toMatch(/^personal-copy:/u);
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  const banner = page.getByTestId('my-flow-save-banner');
  await expect(banner).toHaveAttribute('data-personal-copy-key', selectedPlanSlug);
  await expect(banner.getByTestId('my-flow-save-banner-summary')).toHaveText(
    `저장됨 · ${expectedItemCount}개`,
  );
  await expect(page.locator(
    [
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${selectedPlanSlug}"]:visible`,
      `[data-testid="my-flow-overview-card"][data-flow-slug="${selectedPlanSlug}"]:visible`,
    ].join(', '),
  ).first()).toBeVisible();
  return selectedPlanSlug;
}

async function setApprovedPublicCalendarAnchor(page: Page, anchor: string): Promise<void> {
  const preview = page.getByTestId('public-flow-capability-result');
  await preview.locator(
    '[data-public-format-tab="true"][data-capability-destination="calendar"]',
  ).click();
  await page.getByTestId('public-flow-calendar-set-anchor').click();
  const editor = page.getByTestId('public-flow-personal-adjustment');
  await editor.getByTestId('public-flow-adjustment-anchor-input').fill(anchor);
  await editor.getByTestId('public-flow-adjustment-apply').click();
  await expect(editor).toHaveCount(0);
}

async function openPublicReferenceDetailsIfPresent(page: Page) {
  const details = page.getByTestId('public-flow-reference-details');
  if (await details.isVisible().catch(() => false)) {
    if ((await details.getAttribute('open')) === null) await details.locator('summary').first().click();
  }
}

function getVisiblePublicSourceCard(page: Page) {
  return page.locator('[data-testid="flow-source-card"]:visible, [data-testid="flow-source-card-mobile"]:visible').first();
}

async function expectCompactCatalogAction(card: Locator, action: Locator) {
  const cardBox = await card.boundingBox();
  const actionBox = await action.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(actionBox!.width).toBeLessThan(cardBox!.width * 0.55);
}

async function expectVerticalGap(upper: Locator, lower: Locator, minGap = 16) {
  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();
  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();
  expect(lowerBox!.y - (upperBox!.y + upperBox!.height)).toBeGreaterThanOrEqual(minGap);
}

async function expectVerticalGapAtMost(upper: Locator, lower: Locator, maxGap = 4) {
  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();
  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();
  expect(lowerBox!.y - (upperBox!.y + upperBox!.height)).toBeLessThanOrEqual(maxGap);
}

async function expectElementClearsFixedLayer(content: Locator, layer: Locator, minGap = 16) {
  const contentBox = await content.boundingBox();
  const layerBox = await layer.boundingBox();
  expect(contentBox).not.toBeNull();
  expect(layerBox).not.toBeNull();
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(layerBox!.y - minGap);
}

async function expectElementClearsFixedLayerGroup(content: Locator, layers: Locator[], minGap = 16) {
  const contentBox = await content.boundingBox();
  const layerBoxes = await Promise.all(layers.map((layer) => layer.boundingBox()));
  expect(contentBox).not.toBeNull();
  for (const layerBox of layerBoxes) {
    expect(layerBox).not.toBeNull();
  }
  const layerTop = Math.min(...layerBoxes.map((box) => box!.y));
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(layerTop - minGap);
}

async function expectFixedLayerFootprintAtMost(layers: Locator[], maxHeight: number) {
  const layerBoxes = await Promise.all(layers.map((layer) => layer.boundingBox()));
  for (const layerBox of layerBoxes) {
    expect(layerBox).not.toBeNull();
  }
  const top = Math.min(...layerBoxes.map((box) => box!.y));
  const bottom = Math.max(...layerBoxes.map((box) => box!.y + box!.height));
  expect(bottom - top).toBeLessThanOrEqual(maxHeight);
}

async function scrollElementToViewportEnd(locator: Locator) {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'end', inline: 'nearest' }));
}

async function expectPublicFlowRouteClosed(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), route).toBe(404);
  await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '이 계획은 지금 열 수 없어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '다른 계획 찾기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
}

test('root entry routes an empty user to the three-destination Flow catalog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page).toHaveURL('/flows');
  const navigation = page.getByTestId('platform-mobile-tabs');
  await expect(navigation).toHaveAttribute('data-p35-marker', 'P35-ENTRY-ROUTER-3TAB');
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(navigation.getByRole('link', { name: '계획 찾기' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: '홈' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'URL·메모로 계획 찾기' })).toBeVisible();
  await expect(page.locator('[data-home-recommendation-card="true"]')).toHaveCount(0);
  await expect(page.getByTestId('home-usage-example')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
});

test('catalog opens a public Flow and the saved root entry continues in My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');

  await expect(page).toHaveURL('/flows');
  const movingCard = page
    .getByTestId('single-flow-catalog-card')
    .filter({ hasText: '이사 D-30 준비' });
  await movingCard.getByRole('link', { name: '이사 D-30 준비 더보기' }).click();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await expect(page.getByTestId('flow-public-shell')).toBeVisible();
  await savePublicFlowToSelectedPlan(page, page.getByTestId('public-flow-save-primary-mobile'));

  await page.goto('/');
  await expect(page).toHaveURL(/\/my\?sort=next$/u);
  await expect(page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '내 계획' }))
    .toHaveAttribute('aria-current', 'page');
});

test('wide discovery and My Flow keep action columns purposeful', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/flows');
  await expect(page.getByTestId('platform-primary-tabs').getByRole('link')).toHaveCount(3);
  await expect(page.getByTestId('flow-map-catalog-card')).toHaveCount(8);
  await expectNoHorizontalOverflow(page);

  await page.goto('/f/vehicle-inspection-prep');
  const publicSetup = page.getByTestId('public-flow-primary-setup');
  const publicPreview = page.getByTestId('public-flow-capability-result');
  const publicDecision = page.getByTestId('flow-save-before-decision');
  await expect(publicSetup).toHaveCount(0);
  await expect(publicPreview).toBeVisible();
  await expect(publicPreview).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(publicPreview.locator(
    '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
  )).toHaveAttribute('data-capability-output-count', '10');
  await expect(publicDecision.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await expect(publicDecision.getByTestId('public-flow-save-primary')).toBeVisible();
  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await savePublicFlowToSelectedPlan(page, page.getByTestId('public-flow-save-primary'));

  const visibleFlowFindingLinks = await page.locator('a[href="/flows"]').evaluateAll((links) =>
    links.filter((link) => {
      const element = link as HTMLElement;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }).length,
  );
  expect(visibleFlowFindingLinks).toBe(1);
  await expectNoHorizontalOverflow(page);
});

test('flow list exposes the seed and online-sourced flows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');

  await expect(page.getByRole('heading', { name: 'URL·메모로 계획 찾기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '저장할 실행 콘텐츠' })).toHaveCount(0);
  const flowMapCatalog = page.getByTestId('flow-map-catalog-section');
  await expect(flowMapCatalog).toBeVisible();
  await expect(flowMapCatalog.getByRole('heading', { name: '내 상황에 맞는 콘텐츠 고르기' })).toHaveCount(0);
  await expect(flowMapCatalog.getByTestId('flow-map-catalog-card')).toHaveCount(8);
  await expect(flowMapCatalog.locator('[data-testid="flow-map-catalog-card"][data-source-kind="curated-source"]')).toHaveCount(7);
  await expect(flowMapCatalog.getByTestId('single-flow-catalog-card')).toHaveCount(2);
  const firstCatalogCard = flowMapCatalog.getByTestId('flow-map-catalog-card').first();
  const firstCatalogCardTop = await firstCatalogCard.evaluate((element) => element.getBoundingClientRect().top);
  expect(firstCatalogCardTop).toBeLessThan(480);
  await expect(firstCatalogCard.getByTestId('flow-card-primary-action')).toHaveText('더보기');
  await expectCompactCatalogAction(firstCatalogCard, firstCatalogCard.getByTestId('flow-map-detail-link'));
  await expect(firstCatalogCard.getByTestId('flow-map-recommended-flow-link')).toHaveCount(0);
  await expect(firstCatalogCard.getByTestId('flow-card-source-link')).toHaveCount(1);
  await expect(flowMapCatalog.locator('a[href="/f/moving-d30-basic"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/flow-maps/middle-school-math-1"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/f/curated-wedding-naver-timeline"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/f/curated-wedding-gongysd-atoz"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/f/curated-allblanc-morning-workout"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/f/curated-allblanc-no-jump-cardio"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-wedding-checklist-family"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-allblanc-workout-park"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-ajd-moving-d30"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/baby-health-schedule"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-child-vaccination-schedule"]')).toHaveCount(0);
  await expect(flowMapCatalog.getByText('콘텐츠', { exact: true })).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/moving-map"]')).toHaveCount(0);
  await expect(page.getByTestId('curated-source-catalog-section')).toHaveCount(0);
  await expect(page.getByTestId('single-flow-catalog-section')).toHaveCount(0);
  const catalogCount = flowMapCatalog.getByTestId('flow-catalog-count');
  await expect(catalogCount).toContainText('계획 10개');
  await expect(catalogCount).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByText('필터 조정')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '전세계약 전 서류 체크' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '전세계약 전 서류 체크 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '초등학교 입학 D-30 준비 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '초기 이유식 메뉴·레시피 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '여권 재발급 준비 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '직장인 영어공부 30일 루틴 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '시험 D-30 공부 계획 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '이직 전 리스크 점검 Flow' })).toHaveCount(0);

  await expect(page.locator('a[href="/f/jeonse-contract-precheck-docs"]')).toHaveCount(0);
  await expect(page.getByText('베타 운영 중').first()).toHaveCount(0);
  await expect(page.getByText('미리보기').first()).toHaveCount(0);
  await expect(page.getByText('출력:').first()).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 버전 만들기' })).toHaveCount(0);
});

test('flow finding URL lookup reuses existing source-backed Flows first', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText('이미 만들어진 계획이 있어요');
  await expect(result).toContainText('중1 수학');
  await expect(result.getByRole('link', { name: '미리보기에서 편집' })).toHaveAttribute('href', '/f/source-backed-middle-school-math-1');
  await expect(result.getByTestId('flow-url-quick-start')).not.toHaveAttribute('open', '');
  await expect(result).toContainText('캘린더');
  await expect(result).toContainText('메모 문서');
  await expect(result).not.toContainText('Markdown');
  await expect(result).toContainText('내 계획');
  await expect(result).not.toContainText('source-backed');

  await lookup.getByLabel('URL 또는 메모').fill('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  await expect(result).toContainText('원문 확인');
  await expect(result.getByRole('link', { name: '미리보기 열기' })).toHaveAttribute('href', '/f/vehicle-inspection-prep');
  await expect(result).toContainText('저장 대기');
  await expect(result.getByText('내 계획', { exact: true })).toHaveCount(0);

  await lookup.getByLabel('URL 또는 메모').fill('https://example.com/some-plan?utm_source=newsletter');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  await expect(result).toContainText('바로 시작할 계획을 찾지 못했어요');
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await expect(result).not.toContainText(/아직 없음|저장 대기|초안 요청 가능|아직 실행 가능한 Flow 아님/);
  await expect(result).not.toContainText('이미 만들어진 계획이 있어요');
  await expectNoHorizontalOverflow(page);
});

test('flow finding turns a plain memo into an editable private draft and lands in My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('이사 견적을 비교한다. 관리사무소에 연락한다. 주소 변경 대상을 확인한다.');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('내 메모');
  await expect(result).toContainText('메모를 실행할 초안으로 정리했어요');
  await expect(result).toContainText('내가 쓴 문장만 나눴어요');
  await expect(result).not.toContainText(/AI가|자동 생성|source-backed|sourceTrace|Markdown/);
  const editor = result.getByTestId('flow-memo-draft-editor');
  await expect(editor).toBeVisible();
  await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
  await editor.getByLabel('메모 초안 제목').fill('우리 집 이사 준비');
  await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2026-08-30');
  await expect(editor.getByTestId('flow-memo-draft-preflight')).toContainText('3개');
  await expect(editor.getByTestId('flow-memo-draft-item').first()).toContainText('8월 30일');
  await expect(editor.getByTestId('flow-memo-draft-item').nth(1)).toContainText('날짜 없음');
  await editor.getByTestId('flow-memo-draft-save').click();

  await page.waitForURL(/\/my(?:\?|$)/);
  await openPostSaveWorkspaceIfPresent(page);
  const storedDraft = await page.evaluate(() => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    return bundles.find((bundle: { flow?: { slug?: string; source_title?: string } }) =>
      bundle.flow?.slug?.startsWith('url-draft-') && bundle.flow?.source_title === '내 메모',
    );
  });
  expect(storedDraft?.flow).toMatchObject({
    title: '우리 집 이사 준비',
    source_title: '내 메모',
    source_status: 'preview',
    status: 'draft',
  });
  expect(storedDraft?.flow?.source_url).toBeUndefined();
  expect(storedDraft?.flow?.raw_text).toContain('처음 붙여넣은 메모');
  expect(storedDraft?.flow?.raw_text).toContain('관리사무소에 연락한다');
  expect(storedDraft?.items?.[0]).toMatchObject({ type: 'calendar', day_offset: 0 });
  expect(
    storedDraft?.items
      ?.slice(1)
      .every((item: { type?: string; day_offset?: number }) => item.type === 'todo' && item.day_offset === undefined),
  ).toBe(true);
  await expect(page.getByText('우리 집 이사 준비').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('기준 D-Day');
  await expectNoHorizontalOverflow(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const memoDraftFlow = await openMyFlowLibraryFlow(page, storedDraft.flow.slug);
  const memoDraftSettings = memoDraftFlow.getByTestId('my-flow-personal-copy-settings-open');
  await expect(memoDraftSettings).toHaveText('계획 수정');
  await expect(memoDraftSettings).toHaveAttribute('aria-label', /첫 할 일 날짜 바꾸기/);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-08-30"] .fc-event')).toHaveCount(1);
  const selectedDraftDay = await openMyFlowCalendarSelectedDay(page, '2026-08-30');
  await expect(selectedDraftDay).toContainText('이사 견적을 비교하기');
  await expect(
    page.locator('.fc-event').filter({ hasText: '관리사무소에 연락하기' }),
  ).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('기준 D-Day');
});

test('flow finding URL lookup saves production candidates without AI generation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://example.com/some-plan?utm_source=newsletter');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('바로 시작할 계획을 찾지 못했어요');
  await expect(result.getByTestId('flow-url-miss-draft-gate')).toBeVisible();
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await expect(result).not.toContainText(/아직 없음|저장 대기|초안 요청 가능|아직 실행 가능한 Flow 아님/);
  await expect(result.getByTestId('flow-url-supply-candidate-form')).toBeVisible();
  await result.getByLabel('계획 이름').fill('예시 준비 체크리스트');
  await result.getByLabel('원하는 결과').fill('블로그에서 따라 하고 싶은 단계가 있어서 Flow 후보로 남김');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  await expect(result.getByTestId('flow-url-supply-existing')).toContainText('저장한 초안이 있어요');
  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toContainText('내 초안');
  await expect(candidateList).toContainText('예시 준비 체크리스트');
  await expect(candidateList).not.toContainText(/아직 실행 가능한 Flow 아님|저장 대기|초안 요청 가능/);

  let storedCandidates = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:url-first:supply-candidates') || '[]'));
  expect(storedCandidates).toHaveLength(1);
  expect(storedCandidates[0]).toMatchObject({
    canonicalUrl: 'https://example.com/some-plan',
    originalUrl: 'https://example.com/some-plan?utm_source=newsletter',
    title: '예시 준비 체크리스트',
    memo: '블로그에서 따라 하고 싶은 단계가 있어서 Flow 후보로 남김',
    status: 'miss_request',
  });
  expect(storedCandidates[0].savedAt).toBeTruthy();

  await lookup.getByLabel('URL 또는 메모').fill('https://example.com/some-plan?utm_campaign=again');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  await expect(result.getByTestId('flow-url-supply-existing')).toContainText('저장한 초안이 있어요');
  await expect(result).toContainText('예시 준비 체크리스트');
  await expect(result.getByTestId('flow-url-supply-candidate-form')).toHaveCount(0);
  storedCandidates = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:url-first:supply-candidates') || '[]'));
  expect(storedCandidates).toHaveLength(1);

  await lookup.getByLabel('URL 또는 메모').fill('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  await expect(result).toContainText('원문 확인');
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await result.getByLabel('계획 이름').fill('자동차검사 준비 보강 요청');
  await result.getByLabel('원하는 결과').fill('원문 확인 뒤 실행 가능하게 만들 후보');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  storedCandidates = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:url-first:supply-candidates') || '[]'));
  expect(storedCandidates).toHaveLength(2);
  expect(storedCandidates.map((candidate: { status: string }) => candidate.status).sort()).toEqual(['miss_request', 'needs_review_request']);
  await expect(candidateList).toContainText('자동차검사 준비 보강 요청');
  await expectNoHorizontalOverflow(page);
});

test('flow finding production candidates can be revisited edited resolved and removed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://example.com/manage-me',
          originalUrl: 'https://example.com/manage-me?utm_source=user',
          title: '관리할 후보',
          memo: '처음 저장한 메모',
          status: 'miss_request',
          savedAt: '2026-07-05T06:30:00.000Z',
        },
        {
          canonicalUrl: 'https://flowme.local/f/vehicle-inspection-prep',
          originalUrl: 'https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share',
          title: '원문 확인 후보',
          memo: '보강이 필요한 후보',
          status: 'needs_review_request',
          savedAt: '2026-07-05T06:31:00.000Z',
        },
        {
          canonicalUrl: 'https://mathbang.net/13',
          originalUrl: 'https://mathbang.net/13?utm_source=old-request',
          title: '이제 변환된 수학 후보',
          memo: '예전에는 miss였던 후보',
          status: 'miss_request',
          savedAt: '2026-07-05T06:32:00.000Z',
        },
      ]),
    );
  });
  await page.reload();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible({ timeout: 15_000 });

  const manageCard = candidateList.locator('article').filter({ hasText: '관리할 후보' });
  await expect(manageCard).toContainText('내 초안');
  await manageCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(manageCard.getByRole('link', { name: '원 URL 열기' })).toHaveAttribute('href', 'https://example.com/manage-me?utm_source=user');

  await manageCard.getByRole('button', { name: '제목/메모 수정' }).click();
  await manageCard.getByLabel('요청 제목 수정').fill('수정한 후보 제목');
  await manageCard.getByLabel('요청 메모 수정').fill('수정한 후보 메모');
  await manageCard.getByRole('button', { name: '수정 저장' }).click();
  await expect(candidateList).toContainText('수정한 후보 제목');
  await expect(candidateList).toContainText('수정한 후보 메모');

  const updatedManageCard = candidateList.locator('article').filter({ hasText: '수정한 후보 제목' });
  await updatedManageCard.getByRole('button', { name: '다시 조회' }).click();
  await expect(page.getByLabel('URL 또는 메모')).toHaveValue('https://example.com/manage-me');
  await expect(page.getByTestId('flow-url-lookup-result')).toContainText('바로 시작할 계획을 찾지 못했어요');

  const reviewCard = candidateList.locator('article').filter({ hasText: '원문 확인 후보' });
  await expect(reviewCard).toContainText('원문 확인');
  await reviewCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await reviewCard.getByRole('button', { name: '삭제' }).click();
  await expect(candidateList).not.toContainText('원문 확인 후보');

  const resolvedCard = candidateList.locator('article').filter({ hasText: '이제 변환된 수학 후보' });
  await expect(resolvedCard).toContainText('계획 준비됨');
  await resolvedCard.getByRole('button', { name: '계획으로 이동' }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await expect(page.getByLabel('URL 또는 메모')).toHaveValue('https://mathbang.net/13');
  await expect(result).toContainText('이미 만들어진 계획이 있어요');
  await expect(result.getByRole('link', { name: '미리보기에서 편집' })).toHaveAttribute('href', '/f/source-backed-middle-school-math-1');
  await expect(result.getByTestId('flow-url-quick-start')).not.toHaveAttribute('open', '');

  const storedCandidates = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:url-first:supply-candidates') || '[]'));
  expect(storedCandidates).toHaveLength(2);
  expect(storedCandidates.find((candidate: { canonicalUrl: string }) => candidate.canonicalUrl === 'https://example.com/manage-me')).toMatchObject({
    title: '수정한 후보 제목',
    memo: '수정한 후보 메모',
    originalUrl: 'https://example.com/manage-me?utm_source=user',
    status: 'miss_request',
  });
  expect(storedCandidates.some((candidate: { canonicalUrl: string }) => candidate.canonicalUrl === 'https://flowme.local/f/vehicle-inspection-prep')).toBe(false);
  await expectNoHorizontalOverflow(page);
});

test('flow finding manual registered production candidate resolves to a startable Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://www.samsungsvc.co.kr/solution/28524',
          originalUrl: 'https://www.samsungsvc.co.kr/solution/28524?utm_source=user',
          title: '에어컨 필터 청소 요청',
          memo: '여름 전에 필터 청소 주기를 확인하고 싶어요.',
          status: 'miss_request',
          savedAt: '2026-07-05T08:30:00.000Z',
          lastLookup: {
            status: 'miss',
            title: 'Flow was not registered yet',
            checkedAt: '2026-07-05T08:45:00.000Z',
            canSaveToMyFlow: false,
          },
        },
      ]),
    );
  });
  await page.reload();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible({ timeout: 15_000 });
  const candidateCard = candidateList.locator('article').filter({ hasText: '에어컨 필터 청소 요청' });
  await expect(candidateCard).toContainText('계획 준비됨');
  await expect(candidateCard).toContainText('바로 시작할 수 있는 계획이 준비됐어요.');
  await candidateCard.getByRole('button', { name: '계획으로 이동' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(page.getByLabel('URL 또는 메모')).toHaveValue('https://www.samsungsvc.co.kr/solution/28524');
  await expect(result).toContainText('이미 만들어진 계획이 있어요');
  await expect(result.getByRole('link', { name: '미리보기에서 편집' })).toHaveAttribute('href', '/f/source-backed-aircon-filter-cleaning');
  await openUrlFirstQuickStart(result);

  await result.getByTestId('url-first-start-date-input').fill('2026-07-06');
  await result.getByLabel('결과 형식').selectOption('calendar');
  await result.getByRole('button', { name: '내 계획에 저장' }).click();

  await expect(page).toHaveURL(/\/my\?savedMap=aircon-filter-cleaning/);
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  const savedFlow = await openMyFlowLibraryFlow(
    page,
    'source-backed-aircon-filter-cleaning',
  );
  await expect(savedFlow).toBeVisible();

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:aircon-filter-cleaning') || 'null'),
    savedRecord: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-aircon-filter-cleaning') || 'null'),
  }));
  expect(savedState.snapshot.anchor).toBe('2026-07-06');
  expect(savedState.savedRecord.anchor).toBe('2026-07-06');
  expect(savedState.savedRecord.selectedArtifactMode).toBe('calendar');
  await expectNoHorizontalOverflow(page);
});

test('flow finding production candidates expose a production handoff markdown without generation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://example.com/production-ready',
          originalUrl: 'https://example.com/production-ready?utm_source=user',
          title: '요청 준비 후보',
          memo: '원문을 보고 따라 하고 싶어서 남김',
          status: 'miss_request',
          savedAt: '2026-07-05T06:30:00.000Z',
          lastLookup: {
            status: 'miss',
            title: '아직 Flow화되지 않은 URL입니다',
            checkedAt: '2026-07-05T07:00:00.000Z',
            canSaveToMyFlow: false,
          },
        },
        {
          canonicalUrl: 'https://mathbang.net/13',
          originalUrl: 'https://mathbang.net/13?utm_source=old-request',
          title: '이제 변환된 수학 후보',
          memo: '예전에는 miss였던 후보',
          status: 'miss_request',
          savedAt: '2026-07-05T06:32:00.000Z',
          lastLookup: {
            status: 'hit',
            title: '이미 만들어진 Flow가 있어요',
            checkedAt: '2026-07-05T07:01:00.000Z',
            canSaveToMyFlow: true,
            flowMapId: 'middle-school-math-1',
            routeHref: '/flow-maps/middle-school-math-1',
          },
        },
      ]),
    );
  });
  await page.reload();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible({ timeout: 15_000 });

  const pendingCard = candidateList.locator('article').filter({ hasText: '요청 준비 후보' });
  await pendingCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(pendingCard).toContainText('요청 내용');
  await expect(pendingCard).not.toContainText('Canonical URL');
  await expect(pendingCard).toContainText('원문 링크 저장됨');
  await expect(pendingCard).toContainText('내가 쓴 제목·메모');
  await expect(pendingCard).toContainText('마지막 확인');
  await expect(pendingCard).not.toContainText('사용자 제목/메모');
  await expect(pendingCard).not.toContainText('마지막 다시 조회');
  await expect(pendingCard).toContainText('7월 5일 · 아직 준비 전');
  await expect(pendingCard).not.toContainText('sourceTrace');

  await pendingCard.getByRole('button', { name: '초안 요청 정리본 복사' }).click();
  await expect(pendingCard).toContainText('초안 요청 정리본 복사됨');
  const copiedMarkdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMarkdown).toContain('# 초안 요청 정리본');
  expect(copiedMarkdown).toContain('요청 준비 후보');
  expect(copiedMarkdown).toContain('원문을 보고 따라 하고 싶어서 남김');
  expect(copiedMarkdown).toContain('https://example.com/production-ready?utm_source=user');
  expect(copiedMarkdown).toContain('아직 바로 시작할 계획이 없어 초안 요청으로 보관했어요.');
  expect(copiedMarkdown).toContain('초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 계획과 캘린더로 이어갈 수 있어요.');
  expect(copiedMarkdown).not.toContain('handoff');
  expect(copiedMarkdown).not.toContain('Canonical URL');
  expect(copiedMarkdown).not.toContain('Original URL');
  expect(copiedMarkdown).not.toContain('Step');
  expect(copiedMarkdown).not.toContain('sourceTrace');
  expect(copiedMarkdown).not.toContain('source-backed');

  const resolvedCard = candidateList.locator('article').filter({ hasText: '이제 변환된 수학 후보' });
  await expect(resolvedCard).toContainText('계획 준비됨');
  await resolvedCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(resolvedCard).toContainText('이미 계획으로 준비됐어요.');
  await expect(resolvedCard.getByRole('button', { name: '계획으로 이동' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('flow finding URL lookup starts a hit with date, option, My Flow save, and markdown export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('계획이 있어요');
  await openUrlFirstQuickStart(result);
  await expect(result.getByLabel('시작일')).toBeVisible();
  await result.getByLabel('학습 시작일').fill('2026-07-15');
  await result.getByLabel('결과 형식').selectOption('markdown');

  const markdownDownloadPromise = page.waitForEvent('download');
  await result.getByRole('button', { name: '메모 문서 받기' }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toBe('middle-school-math-1-flow.md');
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).toBeTruthy();
  const markdown = fs.readFileSync(markdownPath!, 'utf8');
  expect(markdown).toContain('2026-07-15');
  expect(markdown).toContain('middle-school-math-1');

  await result.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  const directSavedFlow = await openMyFlowLibraryFlow(
    page,
    'source-backed-middle-school-math-1',
  );
  await expect(directSavedFlow).toBeVisible();
  await expect(directSavedFlow.getByTestId('my-flow-personal-copy-settings-open')).toHaveCount(0);

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
    savedKeys: Object.keys(window.localStorage).filter((key) => key.startsWith('flow:saved:')),
    savedRecord: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-middle-school-math-1') || 'null'),
  }));
  expect(savedState.snapshot.anchor).toBe('2026-07-15');
  expect(savedState.savedKeys.length).toBeGreaterThan(0);
  expect(savedState.savedRecord.anchor).toBe('2026-07-15');
  expect(savedState.savedRecord.selectedArtifactMode).toBe('checklist');

  await page.goto('/flows');
  const lookupAfterSave = page.getByTestId('flow-url-lookup-entry');
  await lookupAfterSave.getByLabel('URL 또는 메모').fill('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  await lookupAfterSave.getByRole('button', { name: '계획 찾기' }).click();
  const blockedResult = page.getByTestId('flow-url-lookup-result');
  await expect(blockedResult).toContainText('저장 대기');
  await expect(blockedResult.getByLabel('시작일')).toHaveCount(0);
  await expect(blockedResult.getByRole('button', { name: '내 계획에 저장' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('flow finding URL lookup starts a lightweight customized personal copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 계획이 있어요');
  await openUrlFirstQuickStart(result);
  await result.getByRole('button', { name: '저장 전 편집' }).click();

  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await customPanel.getByLabel('저장 이름').fill('시험 전 소인수분해만');
  const stepBoxes = customPanel.locator('input[type="checkbox"]');
  const stepCount = await stepBoxes.count();
  expect(stepCount).toBeGreaterThan(1);
  for (let index = 1; index < stepCount; index += 1) {
    await stepBoxes.nth(index).uncheck();
  }

  await result.getByLabel('학습 시작일').fill('2026-07-15');
  await result.getByLabel('결과 형식').selectOption('markdown');

  const markdownDownloadPromise = page.waitForEvent('download');
  await result.getByRole('button', { name: '메모 문서 받기' }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toBe('middle-school-math-1-flow.md');
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).toBeTruthy();
  const markdown = fs.readFileSync(markdownPath!, 'utf8');
  expect(markdown).toContain('시험 전 소인수분해만');
  expect(markdown).toContain('1. 소인수분해');
  expect(markdown).not.toContain('2. 정수와 유리수');

  await result.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-confirmation')).toHaveText('내 계획에 저장됨');
  await expect(page.getByTestId('my-flow-post-save-artifact')).toContainText('소인수분해');
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toContainText('소인수분해');

  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  const personalFlow = await openMyFlowLibraryFlow(
    page,
    'source-backed-middle-school-math-1',
  );
  await expect(personalFlow).toBeVisible();
  await expect(personalFlow).toContainText('시험 전 소인수분해만');
  await expect(personalFlow).toHaveAttribute('data-copy-kind', 'personal');
  await expect(personalFlow.getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/1 완료');
  const activeRows = await getMyFlowVisibleExecutionRows(personalFlow);
  await expect(activeRows.filter({ hasText: '소인수분해' }).first()).toBeVisible();
  await expect(activeRows.filter({ hasText: '정수와 유리수' })).toHaveCount(0);
  const excludedSteps = personalFlow.getByTestId('my-flow-excluded-steps');
  await expect(excludedSteps).toContainText('계획에서 제외한 할 일');
  await expect(excludedSteps).toContainText('정수와 유리수');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await activeRows.first().getByRole('button', { name: /열기/ }).click();
  const personalDetail = getOpenMyFlowItemDetail(page);
  await expect(personalDetail).toBeVisible();
  await expect(personalDetail).toContainText('소인수분해');
  await expect(personalDetail).not.toContainText('정수와 유리수');
  const personalExport = personalDetail.getByTestId('my-flow-detail-portable-export');
  await personalExport.locator('summary').click();
  const transferReceipt = await confirmMyFlowTransfer(
    personalExport,
    personalExport.getByTestId('my-flow-detail-copy-portable-text'),
  );
  const copiedMarkdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMarkdown.split(/\r?\n/u)[0]).toBe('시험 전 소인수분해만');
  expect(copiedMarkdown).toContain('소인수분해');
  expect(copiedMarkdown).not.toContain('정수와 유리수');
  await acknowledgeMyFlowTransfer(transferReceipt);

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
    itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_source-backed-middle-school-math-1') || '{}'),
    savedRecord: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-middle-school-math-1') || 'null'),
  }));
  expect(savedState.snapshot.title).toBe('시험 전 소인수분해만');
  expect(savedState.snapshot.stepCountsByFlow['source-backed-middle-school-math-1']).toBe(1);
  expect(savedState.persistence.map.title).toBe('시험 전 소인수분해만');
  expect(savedState.persistence.childFlows[0].steps.map((step: { stepId: string }) => step.stepId)).toEqual(['math-prime-factorization']);
  expect(savedState.itemStates['math-integers-rationals'].personalExcluded).toBe(true);
  expect(savedState.itemStates['math-integers-rationals'].note).toBeUndefined();
  expect(savedState.itemStates['math-prime-factorization']).toBeUndefined();
  expect(savedState.savedRecord.anchor).toBe('2026-07-15');
  expect(savedState.savedRecord.selectedArtifactMode).toBe('checklist');

  await page.evaluate(() => {
    const key = 'flow:map:saved:middle-school-math-1';
    const snapshot = JSON.parse(window.localStorage.getItem(key) || 'null');
    snapshot.version = '2026-01-01.old';
    snapshot.stepCountsByFlow['source-backed-middle-school-math-1'] = 2;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview).toBeVisible();
  await expect(updateReview.getByTestId('my-flow-map-update-apply')).toBeDisabled();
  await expect(updateReview.getByTestId('my-flow-map-update-apply')).toHaveText('완료 후 검토');

  const updatedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
    itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_source-backed-middle-school-math-1') || '{}'),
  }));
  expect(updatedState.snapshot.title).toBe('시험 전 소인수분해만');
  expect(updatedState.snapshot.stepCountsByFlow['source-backed-middle-school-math-1']).toBe(2);
  expect(updatedState.snapshot.version).toBe('2026-01-01.old');
  expect(updatedState.snapshot.personalCopy.source).toBe('url_first_custom_start');
  expect(updatedState.persistence.map.title).toBe('시험 전 소인수분해만');
  expect(updatedState.persistence.childFlows[0].steps.map((step: { stepId: string }) => step.stepId)).toEqual(['math-prime-factorization']);
  expect(updatedState.itemStates['math-integers-rationals'].personalExcluded).toBe(true);
  expect(updatedState.itemStates['math-integers-rationals'].note).toBeUndefined();

  await page.reload();
  await openPostSaveWorkspaceIfPresent(page);
  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-map-update-review')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('my flow personal copy settings can readjust saved title date and included steps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 계획이 있어요');
  await openUrlFirstQuickStart(result);
  await result.getByRole('button', { name: '저장 전 편집' }).click();

  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await customPanel.getByLabel('저장 이름').fill('시험 전 소인수분해만');
  const stepBoxes = customPanel.locator('input[type="checkbox"]');
  const stepCount = await stepBoxes.count();
  expect(stepCount).toBeGreaterThan(1);
  for (let index = 1; index < stepCount; index += 1) {
    await stepBoxes.nth(index).uncheck();
  }
  await result.getByLabel('시작일').fill('2026-07-15');
  await result.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await openPostSaveWorkspaceIfPresent(page);

  const personalFlow = await openMyFlowLibraryFlow(
    page,
    'source-backed-middle-school-math-1',
  );
  await expect(personalFlow).toBeVisible();
  await personalFlow.getByTestId('my-flow-personal-copy-settings-open').click();

  const settings = personalFlow.getByTestId('my-flow-personal-copy-settings');
  await expect(settings).toBeVisible();
  await settings.getByLabel('저장 이름').fill('1학기 앞부분 복습');
  await expect(settings.getByRole('button', { name: '학습 시작일 바꾸기' })).toBeVisible();
  await expect(settings).toContainText('전체 일정 기준');
  await expect(settings).toContainText('해당 할 일만');
  await settings.getByLabel('학습 시작일').fill('2026-08-01');
  const settingsBoxes = settings.locator('input[type="checkbox"]');
  await expect(settingsBoxes).toHaveCount(stepCount);
  await settingsBoxes.nth(0).uncheck();
  await settingsBoxes.nth(1).check();
  await settings.getByRole('button', { name: '저장' }).click();

  await expect(personalFlow).toContainText('1학기 앞부분 복습');
  await expect(personalFlow.getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/1 완료');
  const activeRows = await getMyFlowVisibleExecutionRows(personalFlow);
  await expect(activeRows.filter({ hasText: '정수와 유리수' }).first()).toBeVisible();
  await expect(activeRows.filter({ hasText: '소인수분해' })).toHaveCount(0);
  const excludedSteps = personalFlow.getByTestId('my-flow-excluded-steps');
  await expect(excludedSteps).toContainText('소인수분해');
  await expect(excludedSteps).not.toContainText('정수와 유리수');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  const firstExecutionRow = activeRows.first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  const personalDetail = getOpenMyFlowItemDetail(page);
  await expect(firstExecutionRow).toContainText('정수와 유리수');
  const personalExport = personalDetail.getByTestId('my-flow-detail-portable-export');
  await personalExport.locator('summary').click();
  const transferReceipt = await confirmMyFlowTransfer(
    personalExport,
    personalExport.getByTestId('my-flow-detail-copy-portable-text'),
  );
  const copiedMarkdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMarkdown.split(/\r?\n/u)[0]).toBe('1학기 앞부분 복습');
  expect(copiedMarkdown).toContain('정수와 유리수');
  expect(copiedMarkdown).not.toContain('소인수분해');
  await acknowledgeMyFlowTransfer(transferReceipt);

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
    itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_source-backed-middle-school-math-1') || '{}'),
    savedRecord: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-middle-school-math-1') || 'null'),
  }));
  expect(savedState.snapshot.title).toBe('1학기 앞부분 복습');
  expect(savedState.snapshot.anchor).toBe('2026-08-01');
  expect(savedState.snapshot.stepCountsByFlow['source-backed-middle-school-math-1']).toBe(1);
  expect(savedState.snapshot.personalCopy.includedStepIdsByFlow['source-backed-middle-school-math-1']).toEqual(['math-integers-rationals']);
  expect(savedState.snapshot.personalCopy.excludedStepIdsByFlow['source-backed-middle-school-math-1']).toContain('math-prime-factorization');
  expect(savedState.persistence.map.title).toBe('1학기 앞부분 복습');
  expect(savedState.persistence.childFlows[0].steps.map((step: { stepId: string }) => step.stepId)).toEqual(['math-integers-rationals']);
  expect(savedState.itemStates['math-prime-factorization'].personalExcluded).toBe(true);
  expect(savedState.itemStates['math-prime-factorization'].note).toBeUndefined();
  expect(savedState.itemStates['math-integers-rationals']).toBeUndefined();
  expect(savedState.savedRecord.anchor).toBe('2026-08-01');

  await page.evaluate(() => {
    const snapshotKey = 'flow:map:saved:middle-school-math-1';
    const persistenceKey = 'flow:map:persistence:middle-school-math-1';
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) || 'null');
    const persistence = JSON.parse(window.localStorage.getItem(persistenceKey) || 'null');
    snapshot.version = '2026-01-01.old';
    snapshot.stepCountsByFlow['source-backed-middle-school-math-1'] = 2;
    persistence.map.version = '2026-01-01.old';
    window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
    window.localStorage.setItem(persistenceKey, JSON.stringify(persistence));
  });
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview.getByTestId('my-flow-map-update-apply')).toBeDisabled();
  await expect(updateReview).toContainText('현재 실행은 그대로 유지');

  const updatedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
    itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_source-backed-middle-school-math-1') || '{}'),
  }));
  expect(updatedState.snapshot.title).toBe('1학기 앞부분 복습');
  expect(updatedState.snapshot.version).toBe('2026-01-01.old');
  expect(updatedState.snapshot.anchor).toBe('2026-08-01');
  expect(updatedState.snapshot.personalCopy.includedStepIdsByFlow['source-backed-middle-school-math-1']).toEqual(['math-integers-rationals']);
  expect(updatedState.persistence.childFlows[0].steps.map((step: { stepId: string }) => step.stepId)).toEqual(['math-integers-rationals']);
  expect(updatedState.persistence.map.version).toBe('2026-01-01.old');
  expect(updatedState.itemStates['math-prime-factorization'].personalExcluded).toBe(true);
  expect(updatedState.itemStates['math-integers-rationals']).toBeUndefined();
  await expectNoHorizontalOverflow(page);
});

test('post-save moving item edits keep completion criterion in UI promise and checklist payload', async ({ page }) => {
  test.setTimeout(60_000);
  const expectedCriterion = '주요 공간 사진과 하자 목록을 집주인 또는 중개인에게 공유했다.';
  const privateNoteSentinel = 'PRIVATE_NOTE_MUST_NOT_EXPORT_P003';
  const correctionNoteSentinel = 'SOURCE_CORRECTION_MUST_NOT_EXPORT_P003';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.context().grantPermissions(
    ['clipboard-read', 'clipboard-write'],
    { origin: new URL(page.url()).origin },
  );

  await setApprovedPublicCalendarAnchor(page, '2030-08-15');
  await page.getByTestId('public-flow-adjust-entry-mobile').click();
  const adjustment = page.getByTestId('public-flow-personal-adjustment');
  await adjustment.getByTestId('public-flow-adjustment-name-input').fill('8월 이사 준비 사본');
  await expect(adjustment.locator('[data-testid^="public-flow-adjustment-title"]')).toHaveCount(0);
  await expect(adjustment.locator('[data-testid^="public-flow-adjustment-date"]')).toHaveCount(0);
  await adjustment.getByTestId('public-flow-adjustment-apply').click();
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, page.url());

  let personalFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  const activeSteps = personalFlow.getByTestId('my-flow-whole-flow-outline');
  await expect(activeSteps).toHaveAttribute('data-effective-row-count', '24');
  await expect(
    personalFlow
      .getByTestId('my-flow-shape-aware-execution')
      .getByTestId('my-flow-execution-row-shell'),
  ).toHaveCount(3);
  await expandMyFlowWholePlan(personalFlow);
  await expect(
    (await getMyFlowVisibleExecutionRows(personalFlow))
      .filter({ hasText: '이사할 집 하자 점검하기' })
      .first(),
  ).toBeVisible();

  const editableRow = (await getMyFlowVisibleExecutionRows(personalFlow))
    .filter({ hasText: '이사할 집 하자 점검하기' })
    .first();
  const editableArticle = editableRow.locator('article[data-item-id]').first();
  const editableItemId = await editableArticle.getAttribute('data-item-id');
  expect(editableItemId).toBeTruthy();
  await editableArticle.getByRole('button', { name: /열기/ }).click();
  let personalDetail = getOpenMyFlowItemDetail(page);
  const executionNoteItemId = await personalDetail.getAttribute('data-row-key');
  expect(executionNoteItemId).toBeTruthy();
  const personalEditor = await openSavedPersonalItemEditor(page, personalDetail);
  await personalEditor.getByTestId('saved-flow-editor-item-title-input').fill('견적 후보만 먼저 확인');
  await personalEditor.getByTestId('saved-flow-editor-item-date-input').fill('2030-08-02');
  await personalEditor.getByTestId('saved-flow-editor-item-detail-input').fill('오전 중 후보 2곳만 확인');
  await saveSavedPersonalItemEditor(page, personalEditor);

  await page.evaluate(({ flowSlug, itemId, privateSentinel, correctionSentinel }) => {
    window.localStorage.setItem(`flow:my-flow:execution-notes:${flowSlug}`, JSON.stringify([
      {
        itemId,
        itemTitle: '견적 후보만 먼저 확인',
        kind: 'private',
        note: privateSentinel,
        updatedAt: '2030-08-01T00:00:00.000Z',
      },
      {
        itemId,
        itemTitle: '견적 후보만 먼저 확인',
        kind: 'source_correction',
        note: correctionSentinel,
        updatedAt: '2030-08-01T00:00:00.000Z',
        sourceUrl: 'https://example.com/source-correction',
      },
    ]));
  }, {
    flowSlug: personalCopySlug,
    itemId: executionNoteItemId!,
    privateSentinel: privateNoteSentinel,
    correctionSentinel: correctionNoteSentinel,
  });

  await page.reload();
  personalFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expandMyFlowWholePlan(personalFlow);
  const savedEditableArticle = personalFlow
    .locator(`article[data-item-id="${editableItemId}"]`)
    .first();
  await expect(savedEditableArticle).toContainText('견적 후보만 먼저 확인');
  await savedEditableArticle.getByRole('button', { name: /열기/ }).click();
  personalDetail = getOpenMyFlowItemDetail(page);
  await expect(personalDetail).toContainText('오전 중 후보 2곳만 확인');
  await expect(personalDetail.getByTestId('my-flow-item-completion-criterion')).toContainText(expectedCriterion);
  const exportPanel = personalDetail.getByTestId('my-flow-detail-portable-export');
  await exportPanel.locator(':scope > summary').click();
  await expect(exportPanel).toContainText('실행 순서와 완료 기준을 함께 옮깁니다.');

  let transferReceipt = await confirmMyFlowTransfer(
    exportPanel,
    exportPanel.getByTestId('my-flow-detail-copy-portable-text'),
  );
  let copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('8월 이사 준비 사본');
  expect(copied).toContain('일정: 2030-08-02');
  expect(copied).toContain('견적 후보만 먼저 확인');
  expect(copied).toContain('오전 중 후보 2곳만 확인');
  expect(copied).toContain(`완료 기준: ${expectedCriterion}`);
  expect(copied).not.toContain(privateNoteSentinel);
  expect(copied).not.toContain(correctionNoteSentinel);
  await acknowledgeMyFlowTransfer(transferReceipt);

  transferReceipt = await confirmMyFlowTransfer(
    exportPanel,
    exportPanel.getByTestId('my-flow-detail-copy-checklist-text'),
  );
  copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('8월 이사 준비 사본');
  expect(copied).toContain('견적 후보만 먼저 확인');
  expect(copied).toContain('- [ ] 견적 후보만 먼저 확인');
  expect(copied).not.toContain('실행 상태: 미완료');
  expect(copied).toContain(`완료 기준: ${expectedCriterion}`);
  expect(copied).not.toMatch(new RegExp(`^- \\[\\s*[x ]?\\] .*${expectedCriterion}`, 'mu'));
  expect(copied).not.toContain(privateNoteSentinel);
  expect(copied).not.toContain(correctionNoteSentinel);
  await acknowledgeMyFlowTransfer(transferReceipt);

  const moreFormats = exportPanel.getByTestId('my-flow-export-more-formats');
  if (await moreFormats.isVisible().catch(() => false)) {
    await moreFormats.locator(':scope > summary').click();
  }
  transferReceipt = await confirmMyFlowTransfer(
    exportPanel,
    exportPanel.getByTestId('my-flow-detail-copy-sheet-row'),
  );
  copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.split(/\r?\n/u)[0]).toBe(
    '순서\t상태\t할 일\t날짜\t시간\t예상 시간\t시간대\t반복\t메모\t원문\t설명\t완료 기준\t실행 메모\t항목 주의\t계획 주의\t자료\t계획 원문 이름\t계획 원문 URL',
  );
  expect(copied).toContain('1\t미완료\t견적 후보만 먼저 확인\t2030-08-02\t종일');
  expect(copied).toContain('오전 중 후보 2곳만 확인');
  expect(copied).toContain(expectedCriterion);
  expect(copied).not.toContain(privateNoteSentinel);
  expect(copied).not.toContain(correctionNoteSentinel);
  await acknowledgeMyFlowTransfer(transferReceipt);

  await exportPanel.getByTestId('my-flow-detail-download-ics').click();
  const downloadConfirmation = exportPanel.getByTestId('my-flow-transfer-confirmation');
  await expect(downloadConfirmation).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadConfirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  await expect(exportPanel.getByTestId('my-flow-transfer-receipt')).toHaveAttribute('data-outcome', 'success');
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  const unfoldedIcs = ics.replace(/\r?\n[ \t]/g, '');
  expect(ics).toContain('DTSTART;VALUE=DATE:20300802');
  expect(ics).toContain('SUMMARY:견적 후보만 먼저 확인');
  expect(unfoldedIcs).toContain('계획: 8월 이사 준비 사본');
  expect(unfoldedIcs).toContain('오전 중 후보 2곳만 확인');
  expect(unfoldedIcs).toContain(`완료 기준: ${expectedCriterion}`);
  expect(unfoldedIcs).not.toContain(privateNoteSentinel);
  expect(unfoldedIcs).not.toContain(correctionNoteSentinel);

  const saved = await page.evaluate((flowSlug) => JSON.parse(
    window.localStorage.getItem(`flow:saved:${flowSlug}`) || 'null',
  ), personalCopySlug);
  expect(saved.personalTitle).toBe('8월 이사 준비 사본');

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2030-08');
  const movedDateCell = page.locator('.fc-daygrid-day[data-date="2030-08-02"]');
  const movedEvent = movedDateCell.locator('.fc-event');
  await expect(movedEvent).toHaveCount(1);
  const movedSelectedDay = await openMyFlowCalendarSelectedDay(page, '2030-08-02');
  await expect(movedSelectedDay.getByTestId('my-flow-selected-date-group')).toContainText('견적 후보만 먼저 확인');
  await expectNoHorizontalOverflow(page);
});




test('curated source cards are integrated into Flow finding and open the recommended Flow', async ({ page }) => {
  await page.goto('/flows');

  const catalog = page.getByTestId('flow-map-catalog-section');
  const curatedCards = catalog.locator('[data-testid="flow-map-catalog-card"][data-source-kind="curated-source"]');
  await expect(page.getByTestId('curated-source-catalog-section')).toHaveCount(0);
  await expect(curatedCards).toHaveCount(7);
  await expect(catalog).toContainText('오픽 모의고사 2주/1달 계획표');
  await expect(catalog).not.toContainText('펀맘 공부 루틴');
  await expect(catalog).not.toContainText('확인하며 사용');
  await expect(catalog).not.toContainText('자료 보강 후 시작');
  await expect(curatedCards.first().getByRole('list', { name: '대표 할 일' })).toBeVisible();

  const opicCard = curatedCards.filter({ hasText: '오픽 모의고사 2주/1달 계획표' });
  await expect(opicCard.getByRole('link', { name: '오픽 모의고사 2주/1달 계획표 더보기' }))
    .toHaveAttribute('href', '/flow-maps/curated-opic-mock-course');
  await expect(opicCard.getByTestId('flow-card-primary-action')).toHaveText('더보기');
  await expectCompactCatalogAction(opicCard, opicCard.getByTestId('flow-map-detail-link'));
  await expect(opicCard.getByTestId('flow-map-recommended-flow-link')).toHaveCount(0);
  await expect(opicCard.getByTestId('flow-card-source-link')).toHaveCount(1);

  await opicCard.getByTestId('flow-map-detail-link').scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL('**/flow-maps/curated-opic-mock-course', { timeout: 15_000 }),
    opicCard.click(),
  ]);
  await expect(page.getByTestId('flow-map-public')).toBeVisible();
  await page.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(page.getByRole('link', { name: '바로 시작' }).first()).toHaveAttribute('href', '/f/curated-opic-single-mock-review');

  const staleMapResponse = await page.goto('/flow-maps/moving-map');
  expect(staleMapResponse?.status()).toBe(404);
});

test('flow finding search and intent chips narrow commercial catalog cards', async ({ page }) => {
  await page.goto('/flows');

  const catalog = page.getByTestId('flow-map-catalog-section');
  await page.getByTestId('flow-catalog-search').fill('예방접종');
  await expect(catalog).toContainText('맞는 콘텐츠가 없습니다');
  await expect(catalog.getByTestId('flow-map-catalog-card')).toHaveCount(0);

  await page.getByTestId('flow-catalog-search').fill('');
  await catalog.getByRole('button', { name: '공부' }).click();
  await expect(catalog).toContainText('중1 수학 목차 진도');
  await expect(catalog).toContainText('오픽 모의고사 2주/1달 계획표');
  await expect(catalog).not.toContainText('신차 구매');
});

test('legacy AJD Flow Map alias opens the canonical 24-item detail with its source', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/curated-ajd-moving-d30');

  await expect(page).toHaveURL('/f/moving-d30-basic');
  const publicFlow = page.getByTestId('public-flow-hero');
  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-output-count', '24');
  await expect(capability.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
    'data-capability-output-count',
    '24',
  );
  await expect(page.getByTestId('flow-capability-artifact-preview-expand')).toContainText('나머지 21개 보기');
  await page.getByTestId('flow-capability-artifact-preview-expand').click();
  await expect(page.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(24);
  await expect(publicFlow).toContainText('이사 방식 정하기');
  await expect(page.locator('body')).not.toContainText('sourceTrace');
  await expect(page.getByRole('link', { name: '이사 체크리스트 참고' }).first()).toHaveAttribute(
    'href',
    /ajd\.co\.kr/,
  );

  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});

test('legacy AJD save entry lands on the canonical 24-item My Flow copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-10T09:00:00+09:00') });
  await page.goto('/flow-maps/curated-ajd-moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page).toHaveURL('/f/moving-d30-basic');
  await setApprovedPublicCalendarAnchor(page, '2026-07-31');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, page.url());

  const focusedWorkspace = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(focusedWorkspace).toBeVisible();
  await expect(focusedWorkspace.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute(
    'data-effective-row-count',
    '24',
  );
  await expect(focusedWorkspace).toContainText('이사 방식 정하기');
  await expect(focusedWorkspace).toContainText('이사 D-30 준비');
  await expect(focusedWorkspace).not.toContainText('밀린 Step');
  await expect(focusedWorkspace).not.toContainText('원문 Step');
});

test('IA comparison report links the 3-tab baseline and 4-tab user PoC', async ({ page }) => {
  await page.goto('/ia-compare');

  await expect(page.getByRole('heading', { name: '3탭 A안과 4탭 B안 비교' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'B안 사용자 PoC 열기' })).toHaveAttribute('href', '/ia-compare/b');
  await expect(page.getByRole('link', { name: 'A안 현재 구조 보기' })).toHaveAttribute('href', '/my?demo=source-backed');
  await expect(page.getByText('홈 / Flow 찾기 / 캘린더 / 내 Flow')).toBeVisible();
});

test('4-tab IA PoC sends saved content to calendar and keeps My Flow as management', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ia-compare/b');

  await expect(page.getByTestId('ia-tab-home')).toBeVisible();
  await expect(page.getByTestId('ia-tab-find')).toBeVisible();
  await expect(page.getByTestId('ia-tab-calendar')).toBeVisible();
  await expect(page.getByTestId('ia-tab-my')).toBeVisible();
  await expect(page.getByRole('heading', { name: '따라 할 콘텐츠를 내 일정으로' })).toBeVisible();

  await page.getByTestId('ia-tab-find').click();
  await expect(page.getByRole('heading', { name: '저장할 Flow 고르기' })).toBeVisible();
  await page.getByTestId('ia-save-flow').click();

  await expect(page.getByRole('heading', { name: '오늘과 날짜별 Step' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '오늘과 날짜별 항목' })).toBeVisible();
  await expect(page.getByTestId('ia-step-detail')).toBeVisible();
  const firstStep = page.getByTestId('ia-step-row').first();
  await firstStep.click();
  await expect(page.getByTestId('ia-step-detail')).toHaveCount(0);
  await firstStep.click();
  await expect(page.getByTestId('ia-step-detail')).toBeVisible();

  await page.getByTestId('ia-tab-find').click();
  await page.getByTestId('ia-flow-card').filter({ hasText: '중1 수학 목차 진도' }).click();
  await page.getByTestId('ia-save-flow').click();
  await page.getByTestId('ia-tab-my').click();

  await expect(page.getByRole('heading', { name: '내 Flow' })).toBeVisible();
  await expect(page.getByText('실행은 캘린더에서 하고, 전체 구조와 원문은 여기서 정리합니다.')).toBeVisible();
  await expect(page.getByText('원룸 이사 D-30')).toBeVisible();
  await expect(page.getByText('중1 수학 목차 진도')).toBeVisible();
  await expect(page.getByText('오늘 캘린더 Flow')).toHaveCount(0);
});


test('my flow and calendar true empty states offer one content-picking action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto('/my');
  const myEmptyState = page.getByTestId('my-flow-empty-state');
  await expect(myEmptyState).toBeVisible();
  await expect(myEmptyState).toContainText('저장한 계획이 없습니다');
  await expect(myEmptyState.getByRole('link', { name: '콘텐츠 고르러 가기' })).toHaveAttribute('href', '/flows');
  await expect(myEmptyState.getByRole('link')).toHaveCount(1);
  await expect(myEmptyState.getByRole('button')).toHaveCount(0);
  await expect(myEmptyState).not.toContainText('새 계획 만들기');
  await expect(myEmptyState).not.toContainText('계획 찾기');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));

  await page.goto('/calendar');
  const calendarEmptyState = page.getByTestId('my-flow-empty-state');
  await expect(calendarEmptyState).toBeVisible();
  await expect(calendarEmptyState).toContainText('날짜가 있는 콘텐츠를 먼저 고르세요');
  await expect(calendarEmptyState.getByRole('link', { name: '콘텐츠 고르러 가기' })).toHaveAttribute('href', '/flows');
  await expect(calendarEmptyState.getByRole('link')).toHaveCount(1);
  await expect(calendarEmptyState.getByRole('button')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-empty-surface')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
});

test('main user routes keep internal operation labels off the visible surface', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/',
    '/flows',
    '/flow-maps/moving-d30',
    '/flow-maps/middle-school-math-1',
    '/f/moving-d30-basic',
    '/f/jeonse-contract-precheck-docs',
    '/restart/moving-d30',
    '/my',
    '/calendar',
  ]) {
    await page.goto(route);
    await expectNoInternalUserSurfaceCopy(page.locator('body'));
    await expectNoVisibleSourceBrandSlug(page.locator('body'));
  }

  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await setApprovedPublicCalendarAnchor(page, '2026-07-22');
  await savePublicFlowToSelectedPlan(page, page.getByTestId('public-flow-save-primary-mobile'));
  await openPostSaveWorkspaceIfPresent(page);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoVisibleSourceBrandSlug(page.locator('body'));

  await page.goto('/calendar');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoVisibleSourceBrandSlug(page.locator('body'));
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  const selectedDateGroup = selectedDay.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toBeVisible();
  await expect(selectedDateGroup).not.toContainText(/Flow\s+일정|지도\s+일정|지도\s+루틴/);

  await page.goto('/flow-maps/middle-school-math-1/creator');
  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toContainText('사용자에게 저장될 Step');
});

test('p7 guardrail keeps user routes clean and restart prototype in its own bucket', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });

  const userRoutes = [
    '/',
    '/flows',
    '/flow-maps/moving-d30',
    '/flow-maps/middle-school-math-1',
    '/f/vehicle-inspection-prep',
    '/f/moving-d30-basic',
    '/f/fridge-cleanout-weekly-plan',
    '/f/washer-tub-clean-monthly',
    '/my',
    '/calendar',
  ];

  for (const route of userRoutes) {
    await page.goto(route);
    const body = page.locator('body');
    await expectNoInternalUserSurfaceCopy(body);
    await expectNoVisibleSourceBrandSlug(body);
    await expectNoUserFacingDisplayLeakage(body);
    await expectNoUserFacingRawIsoDate(body);
    await expectNoHorizontalOverflow(page);
  }

  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await savePublicFlowToSelectedPlan(page, page.getByTestId('public-flow-save-primary-mobile'));
  const movingMyFlow = page.locator('body');
  await expectNoInternalUserSurfaceCopy(movingMyFlow);
  await expectNoVisibleSourceBrandSlug(movingMyFlow);
  await expectNoUserFacingDisplayLeakage(movingMyFlow);
  await expectNoUserFacingRawIsoDate(movingMyFlow);
  await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/calendar');
  const calendarBody = page.locator('body');
  await expectNoInternalUserSurfaceCopy(calendarBody);
  await expectNoVisibleSourceBrandSlug(calendarBody);
  await expectNoUserFacingDisplayLeakage(calendarBody);
  await expectNoUserFacingRawIsoDate(calendarBody);
  await expectNoHorizontalOverflow(page);

  await page.goto('/restart/moving-d30');
  const restartBody = page.locator('body');
  await expectNoUserFacingRawIsoDate(restartBody);
  await expectNoVisibleSourceBrandSlug(restartBody);
  const restartExportEntryLabel = await page.getByTestId('moving-mobile-export-actions').getByRole('button').innerText();
  await expectNoPrototypeDisplayGateLeakage(restartBody, [restartExportEntryLabel]);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId('moving-mobile-export-actions').getByRole('button')).toHaveCount(1);
  await expect(page.getByTestId('moving-mobile-export-actions').getByRole('button', { name: '파일 받기 옵션' })).toBeVisible();

  await testInfo.attach('p7-06-guardrail-route-buckets', {
    body: JSON.stringify({ userRoutes, prototypeRoutes: ['/restart/moving-d30'] }, null, 2),
    contentType: 'application/json',
  });
});


test('flow catalog title opens the current public Flow Map page', async ({ page }) => {
  await page.goto('/flows');

  const movingCard = page
    .getByTestId('single-flow-catalog-card')
    .filter({ hasText: '이사 D-30 준비' });
  await movingCard.getByRole('link', { name: /더보기/ }).click();

  await expect(page).toHaveURL('/f/moving-d30-basic');
  await expect(page.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-output-count', '24');
  await page.getByTestId('flow-capability-artifact-preview-expand').click();
  await expect(page.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(24);
});

test('user-facing content titles hide trailing Flow suffix while keeping app labels', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await expect(page.getByRole('link', { name: '계획 찾기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이사 D-30 준비 Flow' })).toHaveCount(0);

  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toHaveCount(0);

  await page.goto('/f/moving-d30-basic');
  await setApprovedPublicCalendarAnchor(page, '2030-07-15');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary'),
  );
  await installLegacySavedPlanLibraryNavigation(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  const savedFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(savedFlow).toContainText('이사 준비');
  await expect(savedFlow).not.toContainText('이사 준비 Flow');

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-card')).toContainText('이사 준비');
  await expect(page.getByTestId('my-flow-calendar-card')).not.toContainText('이사 준비 Flow');
  const calendarFlowOpen = page.getByRole('button', { name: '이사 준비 내 계획에서 열기' }).first();
  await expect(calendarFlowOpen).toBeVisible();
  await expect(calendarFlowOpen).toHaveText('Flow 열기');
  await expect(page.locator('body')).not.toContainText('체크할 Flow');
});



test('public save setup exposes date intent and formats user-facing dates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/vehicle-inspection-prep');
  const vehicleFrame = page.getByTestId('public-flow-hero');
  await expect(vehicleFrame).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
  await expectNoUserFacingRawIsoDate(vehicleFrame);

  await page.goto('/f/moving-d30-basic');
  const movingSetup = page.getByTestId('public-flow-hero');
  await expect(movingSetup.getByTestId('public-flow-anchor-input')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
  const preview = page.getByTestId('public-flow-capability-result');
  await preview.locator(
    '[data-public-format-tab="true"][data-capability-destination="calendar"]',
  ).click();
  await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeDisabled();
  await page.getByTestId('public-flow-calendar-set-anchor').click();
  const editor = page.getByTestId('public-flow-personal-adjustment');
  await expect(editor).toHaveAttribute('data-adjustment-kind', 'anchor');
  await expect(editor.getByTestId('public-flow-adjustment-anchor-input')).toBeFocused();
});




test('fridge and washer setup path is a visible input action before browse navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/f/fridge-cleanout-weekly-plan', '/f/washer-tub-clean-monthly']) {
    await page.goto(route);

    const setup = page.getByTestId('public-flow-hero');
    await expect(setup).toHaveAttribute('data-visual-structure', 'artifact-first');
    await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toBeVisible();
    await expect(
      page.getByTestId('flow-public-shell').getByRole('link', { name: /계획 찾기/ }),
    ).toHaveAttribute('href', '/flows');
  }
});


test('moving restart route starts from move date setup', async ({ page }) => {
  await page.goto('/restart/moving-d30');

  await expect(page.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  await expect(page.getByLabel('이사일')).toBeVisible();
  await expect(page.getByRole('button', { name: '일정 만들기' })).toBeVisible();
  await expect(page.getByRole('link', { name: '이사할 때 체크리스트 상세 정리' })).toHaveAttribute(
    'href',
    /ajd\.co\.kr\/contents\/basic-tip\/detail/,
  );
  await expect(page.getByTestId('moving-source-section')).not.toContainText('AJD');
  await expectNoVisibleSourceBrandSlug(page.locator('body'));
  await expect(page.getByRole('link', { name: '정부24 전입신고 민원안내 및 신청' })).toHaveAttribute(
    'href',
    /gov\.kr\/mw\/AA020InfoCappView\.do/,
  );
  await expect(page.getByRole('region', { name: '이사 D-30 캘린더' })).toBeVisible();
  await expect(page.locator('.fc')).toBeVisible();
  await expect(page.locator('.fc-event').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b\d{4}-\d{2}-\d{2}\b/);
});

test('moving restart edits items before export', async ({ page }) => {
  await page.goto('/restart/moving-d30');
  await page.getByLabel('이사일').fill('2026-06-27');
  await page.getByRole('button', { name: '일정 만들기' }).click();

  const addressEditButton = page.getByRole('button', { name: '주소 변경과 정기 서비스 정리 편집' });
  await expect(addressEditButton).toHaveText('편집');
  await addressEditButton.click();
  await page.getByLabel('항목 날짜').fill('2026-06-18');
  await page.getByLabel('항목 메모').fill('인터넷 이전 설치는 오전 시간으로 예약');
  await page.getByRole('button', { name: '항목 저장' }).click();

  await expect(page.getByText('6월 18일 (목)')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b\d{4}-\d{2}-\d{2}\b/);
  await expect(page.getByText('인터넷 이전 설치는 오전 시간으로 예약')).toBeVisible();

  await page.getByRole('button', { name: '항목 추가' }).click();
  await page.getByLabel('새 항목 제목').fill('관리사무소 엘리베이터 예약');
  await page.getByLabel('새 항목 날짜').fill('2026-06-20');
  await page.getByRole('button', { name: '새 항목 저장' }).click();
  await expect(page.getByRole('heading', { name: '관리사무소 엘리베이터 예약' })).toBeVisible();

  const disposalEditButton = page.getByRole('button', { name: '버릴 물건과 대형폐기물 정리 편집' });
  await expect(disposalEditButton).toHaveText('편집');
  await disposalEditButton.click();
  await page.getByRole('button', { name: '항목 삭제' }).click();
  await expect(page.getByText('버릴 물건과 대형폐기물 정리')).toHaveCount(0);
});

test('moving restart exports edited items and gates flow save', async ({ page }) => {
  await page.goto('/restart/moving-d30');
  await page.getByLabel('이사일').fill('2026-06-27');
  await page.getByRole('button', { name: '일정 만들기' }).click();
  await page.getByRole('button', { name: '주소 변경과 정기 서비스 정리 편집' }).click();
  await page.getByLabel('항목 날짜').fill('2026-06-18');
  await page.getByRole('button', { name: '항목 저장' }).click();

  await page.getByRole('button', { name: '체크리스트 복사' }).click();
  await expect(page.getByText('체크리스트를 만들었습니다')).toBeVisible();
  await expect(page.getByText('6월 18일 (목)')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b\d{4}-\d{2}-\d{2}\b/);

  await page.getByRole('button', { name: '내 Flow로 저장' }).click();
  await expect(page.getByRole('dialog', { name: '내 Flow로 저장할까요?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그인/회원가입' })).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem('flow:auth:demo-user', 'true'));
  await page.getByRole('button', { name: '계속 둘러보기' }).click();
  await page.getByRole('button', { name: '내 Flow로 저장' }).click();
  await expect(page.getByText('내 Flow에 저장했습니다')).toBeVisible();
  await expect(page.getByRole('link', { name: '내 Flow에서 보기' })).toHaveAttribute('href', '/my');
});

test('moving restart mobile uses one export entry and friendly date text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/restart/moving-d30');

  const mobileNextTasks = page.getByTestId('moving-mobile-next-tasks');
  const nextTaskDateLabels = await mobileNextTasks.locator('article p').allInnerTexts();
  expect(nextTaskDateLabels).toEqual([
    '5월 28일 (목) · D-30',
    '5월 28일 (목) · D-30',
    '5월 28일 (목) · D-30',
  ]);
  await expect(mobileNextTasks).toContainText('이사 방식과 업체 후보 정하기');
  await expect(mobileNextTasks).toContainText('이사할 집 하자 사진 남기기');
  await expect(mobileNextTasks).toContainText('버릴 물건과 대형폐기물 정리');
  await page.getByTestId('moving-mobile-full-schedule').locator('button').nth(1).click();
  const fullSchedule = page.getByTestId('moving-full-schedule-list');
  await expect(fullSchedule).toBeVisible();
  await expect(fullSchedule).toContainText('D-30 마일스톤 3개');
  const firstScheduleGroup = fullSchedule.getByTestId('moving-schedule-date-group').first();
  await expect(firstScheduleGroup.getByTestId('moving-schedule-date-group-heading')).toContainText('5월 28일 (목)');
  await expect(firstScheduleGroup.locator('article')).toHaveCount(3);
  const firstScheduleEditButton = firstScheduleGroup.getByRole('button', { name: '이사 방식과 업체 후보 정하기 편집' });
  await expect(firstScheduleEditButton).toHaveText('편집');
  await expect(fullSchedule).toContainText('5월 28일 (목)');
  await expect(fullSchedule).toContainText('6월 17일 (수)');
  await expect(fullSchedule).toContainText('6월 26일 (금)');
  await expect(fullSchedule).toContainText('6월 27일 (토)');
  await expect(fullSchedule).toContainText('6월 28일 (일)');
  await expect(page.locator('body')).not.toContainText(/\b\d{4}-\d{2}-\d{2}\b/);

  const mobileExportActions = page.getByTestId('moving-mobile-export-actions');
  await expect(mobileExportActions.getByRole('button')).toHaveCount(1);
  const restartExportEntryLabel = await mobileExportActions.getByRole('button').innerText();
  await expectNoPrototypeDisplayGateLeakage(page.locator('body'), [restartExportEntryLabel]);
  await expect(mobileExportActions.getByRole('button', { name: '파일 받기 옵션' })).toBeVisible();

  await mobileExportActions.getByRole('button', { name: '파일 받기 옵션' }).click();
  await expect(page.locator('#moving-restart-export-panel')).toBeInViewport();
  await expect(page.locator('#moving-restart-export-panel').getByRole('button', { name: FLOW_EXPORT_LABELS.calendarFile })).toBeVisible();
});

test('flow discovery keeps legacy tag queries out of the representative catalog surface', async ({ page }) => {
  await page.goto('/flows?tag=돈이%20걸린%20결정');

  await expect(page.getByRole('heading', { name: 'URL·메모로 계획 찾기' })).toBeVisible();
  await expect(page.getByTestId('flow-map-catalog-section').getByTestId('single-flow-catalog-card')).toHaveCount(2);
  await expect(page.getByText('필터 조정')).toHaveCount(0);
  await expect(page.getByLabel('태그')).toHaveCount(0);
  await expect(page.getByText('#돈이 걸린 결정').first()).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '전세계약 전 서류 체크' })).toHaveCount(0);
});


test('creator profile aggregates creator flows on its secondary profile route', async ({ page }) => {
  await page.goto('/u/wedding-checkmate');

  await expect(page).toHaveURL(/\/u\//);
  await expect(page.getByRole('heading', { name: '웨딩 체크메이트' })).toBeVisible();
  await expect(page.getByText('원문 확인', { exact: true })).toBeVisible();
  await expect(page.getByText('총 실행')).toHaveCount(0);
  await expect(page.getByText('총 복사')).toHaveCount(0);
  await expect(page.locator('header')).toHaveAttribute('data-metric-policy', 'inventory-not-outcomes');
  await expect(page.getByText('D-Day 준비', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toHaveCount(0);
});

test('creator directory keeps generated samples inside the internal review inventory', async ({ page }) => {
  await page.goto('/creators');

  await expect(page.getByRole('heading', { name: '제작자 채널 재고' })).toBeVisible();
  await expect(page.getByText('전체 검토 재고')).toBeVisible();
  await expect(page.locator('header').getByText('실제 원본')).toBeVisible();
  await expect(page.locator('header').getByText('내부 샘플')).toBeVisible();
  await expect(page.locator('header').getByText('원본 검토')).toBeVisible();
  await expect(page.locator('header')).toContainText('정상 사용자 저장소와 공개 Flow에 포함되지 않습니다');
  await expect(page.getByRole('link', { name: /삼성전자서비스/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ThankyouBUBU', exact: true })).toBeVisible();
  await expect(page.getByText('실행성 점수')).toHaveCount(0);
  await expect(page.locator('a[href^="/f/channel-"]')).toHaveCount(0);
});

test('creator directory exposes representative creator content links', async ({ page }) => {
  await page.goto('/creators');

  await expect(page.getByText('공개 승인 Flow').first()).toBeVisible();
  await expect(page.locator('a[href="/f/real-samsung-aircon-seasonal-care"]').first()).toBeVisible();
  await expect(page.locator('a[href="/f/real-samsung-washer-filter-care"]').first()).toBeVisible();
  await expect(page.locator('a[href^="/f/channel-"]')).toHaveCount(0);
});

test('preview creator channel profile excludes generated sample entries from runtime', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByRole('heading', { name: '삼성전자서비스' })).toBeVisible();
  const channelHeader = page.locator('header');
  await expect(channelHeader).toContainText('콘텐츠');
  await expect(channelHeader.getByText('2', { exact: true }).first()).toBeVisible();
  await expect(channelHeader).toContainText('원문 확인');
  await expect(channelHeader).toContainText('주제');
  await expect(channelHeader).not.toContainText('총 실행');
  await expect(channelHeader).not.toContainText('총 복사');
  await expect(channelHeader).not.toContainText('수동 검토');
  await expect(channelHeader).not.toContainText('1차 분류');
  await expect(page.getByText('만든 콘텐츠')).toBeVisible();
  await expect(page.getByLabel('콘텐츠 검색')).toBeVisible();
  await expect(page.locator('[data-testid="creator-profile-content-card"][data-source-status="preview"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/f/channel-samsung-service-"]')).toHaveCount(0);
  await page.getByRole('button', { name: '샘플', exact: true }).click();
  await expect(page.getByTestId('creator-profile-content-card')).toHaveCount(0);
});

test('creator channel can filter real source-backed flows', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByText('내부 검토 재고', { exact: true })).toBeVisible();
  await expect(page.getByText('대표 항목:')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '원문 있는 재고', exact: true })).toHaveClass(/border-blue-600/);

  await expect(page.locator('a[href="/f/real-samsung-aircon-seasonal-care"]').first()).toBeVisible();
  await expect(page.locator('a[href="/f/real-samsung-washer-filter-care"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="creator-profile-content-card"][data-public-indexable="false"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '검토 재고 열기' })).toHaveCount(0);
  await expect(page.locator('a[href^="/f/channel-samsung-service-"]')).toHaveCount(0);
});

test('fitness creator profile highlights exact video flows before samples', async ({ page }) => {
  await page.goto('/u/thankyou-bubu');

  await expect(page.getByText('원문 있는 콘텐츠부터 검토')).toBeVisible();
  await expect(page.locator('a[href="/f/real-thankyou-bubu-home-workout-starter"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '검토 재고 열기' }).first()).toHaveAttribute('href', '/content-flows');

  await page.locator('button').first().click();

  await expect(page.locator('a[href="/f/real-thankyou-bubu-home-workout-starter"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/f/channel-thankyou-bubu-"]')).toHaveCount(0);
});

test('retired and review-gated fitness routes both stay out of the public service', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/real-thankyou-bubu-video-full-body-no-jump');
  await expectPublicFlowRouteClosed(page, '/f/real-thankyou-bubu-home-workout-starter');
});

test('current ThankyouBUBU routes stay behind the source-fit review boundary', async ({ page }) => {
  for (const slug of [
    'real-thankyou-bubu-home-workout-starter',
    'real-thankyou-bubu-20min-routine',
  ]) {
    await expectPublicFlowRouteClosed(page, `/f/${slug}`);
  }
});

test('FITVELY source flows remain read-only until source-fit review is complete', async ({ page }) => {
  for (const slug of [
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-workout-order',
    'real-fitvely-diet-record-routine',
  ]) {
    await expectPublicFlowRouteClosed(page, `/f/${slug}`);
  }
});

test('review-gated exact video has no public copy or execution route', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/real-thankyou-bubu-home-workout-starter');
});

test('creator profile merges newly shipped seed flows into existing browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([
        {
          flow: {
            id: 'flow-preview-thankyou-bubu-1',
            slug: 'channel-thankyou-bubu-legacy-preview',
            title: 'Legacy generated preview',
            description: 'Must be removed during runtime migration',
            category: '운동/홈트',
            structure_type: 'routine',
            anchor_type: 'start_date',
            status: 'published',
            source_status: 'preview',
            owner_user_id: 'channel-thankyou-bubu',
            created_at: '2026-05-20T00:00:00.000Z',
            updated_at: '2026-05-20T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
        {
          flow: {
            id: 'flow-local-only',
            slug: 'local-only',
            title: 'Local only old flow',
            description: 'Old browser storage entry',
            category: '운동/홈트',
            structure_type: 'routine',
            anchor_type: 'start_date',
            status: 'published',
            owner_user_id: 'channel-thankyou-bubu',
            creator_name: 'ThankyouBUBU',
            creator_role: '홈트 루틴 채널',
            creator_note: 'old storage',
            created_at: '2026-05-20T00:00:00.000Z',
            updated_at: '2026-05-20T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
      ]),
    );
  });

  await page.goto('/u/thankyou-bubu');

  await expect(page.getByText('원문 있는 콘텐츠부터 검토')).toBeVisible();
  await expect(page.locator('a[href="/f/real-thankyou-bubu-home-workout-starter"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '검토 재고 열기' }).first()).toHaveAttribute('href', '/content-flows');
  await page.getByRole('button', { name: '모두 보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Local only old flow' })).toBeVisible();
  const generatedPreviewCount = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') ?? '[]');
    return stored.filter((bundle: { flow?: { id?: string } }) => bundle.flow?.id?.startsWith('flow-preview-')).length;
  });
  expect(generatedPreviewCount).toBe(0);
});

test('a saved archived flow remains as personal history without returning to today or calendar', async ({ page }) => {
  test.setTimeout(90_000);
  const retiredSlug = 'book-finish-one';
  const retiredTitle = '책 한 권 완독 실천 Flow';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ slug, title }) => {
    if (window.sessionStorage.getItem('archived-personal-history-seeded') === 'true') return;
    window.sessionStorage.setItem('archived-personal-history-seeded', 'true');
    const flowId = 'flow-archived-book';
    const itemId = 'book-finish-old-item';
    window.localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([
        {
          flow: {
            id: flowId,
            slug,
            title,
            description: '기존에 저장해 실행하던 독서 기록입니다.',
            category: '학습/독서',
            structure_type: 'checklist',
            anchor_type: 'none',
            status: 'published',
            source_status: 'real',
            source_url: 'https://ridicorp.com/story/pr-reading-new-year-resolution/',
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-01T00:00:00.000Z',
          },
          sections: [
            { id: 'book-finish-old-section', flow_id: flowId, title: '읽기', order: 1 },
          ],
          items: [
            {
              id: itemId,
              flow_id: flowId,
              section_id: 'book-finish-old-section',
              title: '오늘 읽을 분량 읽기',
              type: 'todo',
              order: 1,
            },
          ],
          itemDetails: [
            { item_id: itemId, completion_criteria: '오늘 정한 분량을 읽고 표시합니다.' },
          ],
        },
      ]),
    );
    window.localStorage.setItem(
      `flow:saved:${slug}`,
      JSON.stringify({
        slug,
        savedAt: '2026-07-01T00:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }),
    );
    window.localStorage.setItem(
      `flow_builder_mvp_checks_${slug}`,
      JSON.stringify({ [itemId]: true }),
    );
    window.localStorage.setItem(
      `flow_builder_mvp_item_state_${slug}`,
      JSON.stringify({ [itemId]: { note: '완독 기록은 보존해야 합니다.' } }),
    );
  }, { slug: retiredSlug, title: retiredTitle });

  await page.goto('/my');
  const preservedState = await page.evaluate((slug) => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const bundle = bundles.find((entry: { flow?: { slug?: string } }) => entry.flow?.slug === slug);
    return {
      saved: Boolean(window.localStorage.getItem(`flow:saved:${slug}`)),
      status: bundle?.flow?.status,
      retired: Boolean(bundle?.flow?.tags?.includes('retired-personal-copy')),
      checks: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_checks_${slug}`) || '{}'),
      itemStates: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_item_state_${slug}`) || '{}'),
    };
  }, retiredSlug);
  expect(preservedState).toMatchObject({
    saved: true,
    status: 'published',
    retired: false,
  });
  expect(preservedState.checks['book-finish-old-item']).toBe(true);
  expect(preservedState.itemStates['book-finish-old-item'].note).toBe('완독 기록은 보존해야 합니다.');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('책 한 권 완독 실천');

  await page.goto('/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('책 한 권 완독 실천');

});





test('generated preview creator flow route is not public', async ({ page }) => {
  const response = await page.goto('/f/channel-samsung-service-%EC%9B%94%EA%B0%84-%EC%A0%90%EA%B2%80-%EB%A3%A8%ED%8B%B4');

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
});

test('new flow creation starts from pasted content and a human pattern choice', async ({ page }) => {
  await page.goto('/flows/new');

  await expect(page.getByRole('heading', { name: 'Flow 만들기' })).toBeVisible();
  await expect(page.getByText('콘텐츠 넣기')).toBeVisible();
  await expect(page.getByText('실행 방식 고르기')).toBeVisible();

  await page.getByLabel('제목').fill('자동차 구매 테스트 Flow');
  await page.getByLabel('원본 콘텐츠').fill('## 예산 확인\n- 총예산 정하기\n- 보험료 확인하기');
  await page.getByRole('button', { name: '순서대로 체크하기' }).click();
  await page.getByRole('button', { name: 'Flow 초안 만들기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '자동차 구매 테스트' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자동차 구매 테스트 Flow' })).toHaveCount(0);
});

test('text editor shows a public-style parsed preview while drafting', async ({ page }) => {
  await page.goto('/flows/flow-moving/edit');

  const sourceEditor = page.locator('textarea').first();
  await sourceEditor.fill('# 테스트 이사 Flow\n\n## D-30\n- 이사업체 견적 받기 D-30\n\n## D-Day\n- 이사 당일 확인 D-Day');

  const preview = page.getByTestId('editor-preview');
  await expect(preview).toContainText('미리보기');
  await expect(preview).toContainText('이사업체 견적 받기');
  await expect(preview).toContainText('D-30');
  await expect(preview).toContainText('이사 당일 확인');

  const detailPanel = page.locator('details').filter({ hasText: '실행 디테일' }).first();
  await detailPanel.locator('summary').click();
  await detailPanel.locator('textarea').first().fill('견적 기준을 남겨 나중에 비교하기 위해 필요합니다.');
  await expect(sourceEditor).toHaveValue(/why: 견적 기준을 남겨 나중에 비교하기 위해 필요합니다\./);

  await page.getByRole('button', { name: '발행' }).click();
  await expect(page.getByText('발행되었습니다')).toBeVisible();
  await expect(page.getByRole('link', { name: '제작자 프로필에서 보기' })).toBeVisible();
});




test('my flow management uses one local library while calendar stays global', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-01T09:00:00+09:00') });
  await page.goto('/f/moving-d30-basic');
  await setApprovedPublicCalendarAnchor(page, '2026-06-26');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary'),
  );
  await installLegacySavedPlanLibraryNavigation(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await expect(page.getByRole('heading', { name: '내 계획', exact: true })).toBeVisible();
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-flow')).toHaveCount(0);
  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(1);
  const movingFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(movingFlow).toHaveAttribute('data-flow-slug', personalCopySlug);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toBeVisible();

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const reopenedMovingFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  const firstExecutionRow = reopenedMovingFlow.getByTestId('my-flow-execution-row-shell').first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  const inlineDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await expect(inlineDetail).toBeVisible();
  await expect(firstExecutionRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  const completion = inlineDetail.getByTestId('my-flow-task-complete-control');
  await completion.click();
  await expect(completion).toBeChecked();
  await expect.poll(() => page.evaluate((flowSlug) => {
    const checks = JSON.parse(
      localStorage.getItem(`flow_builder_mvp_checks_${flowSlug}`) || '{}',
    ) as Record<string, boolean>;
    return Object.values(checks).some(Boolean);
  }, personalCopySlug)).toBe(true);
  await expect(completion).toHaveAccessibleName(/다시 열기/);
});

test('my flow mobile derives Today from saved Flow while keeping direct saved inventory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-08-06T09:00:00+09:00') });
  await page.addInitScript(() => {
    const savedAt = '2026-07-03T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-07-22',
    }));
  });

  await page.goto('/my');
  await openCurrentMyFlowLibrary(page);
  const row = page.getByTestId('my-flow-mobile-structure-row');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(row.getByTestId('my-flow-mobile-structure-open')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
  const today = page.getByTestId('my-flow-today-summary');
  await expect(today).toHaveAttribute('data-today-source', 'effective_execution');
  await expect(today).toHaveAttribute('data-write-owner', 'none');
  await expect(today).toHaveAttribute('data-overdue-count', /[1-9]\d*/u);
  await expect(today.getByRole('heading', { name: '오늘 할 일' })).toBeVisible();
  const overdueItem = today.locator('[data-testid="my-flow-today-item"][data-time-state="overdue"]').first();
  await expect(overdueItem).toContainText('지난 할 일');
  await expect(overdueItem).toHaveAttribute(
    'data-saved-identity',
    'moving-d30-basic',
  );
});
test('my flow focused workspace exposes reversible completion without a separate Today frame', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await page.clock.install({ time: new Date('2026-06-03T09:00:00+09:00') });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-06-03T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-02',
    }));
  });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  const executionRow = workspace
    .getByTestId('my-flow-temporal-next-group')
    .getByTestId('my-flow-execution-row-shell')
    .locator('article[data-row-key]')
    .first();
  const rowKey = await executionRow.getAttribute('data-row-key');
  expect(rowKey).toBeTruthy();
  await expect(executionRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await executionRow.getByRole('button', { name: /열기/ }).click();
  let detail = getOpenMyFlowItemDetail(page);
  const completion = detail.getByTestId('my-flow-task-complete-control');
  await expect(completion).toHaveAttribute('type', 'checkbox');
  await completion.click();
  await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
    'data-completion-result',
    'completed',
  );
  await closeOpenMyFlowItemDetail(page);
  const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
  if (
    await planToggle.isVisible().catch(() => false) &&
    (await planToggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await planToggle.click();
  }
  await expandMyFlowWholePlan(workspace);
  const wholeFlowOutline = workspace.getByTestId('my-flow-whole-flow-outline');
  const completedRow = wholeFlowOutline.locator(`article[data-row-key="${rowKey}"]`);
  await expect(completedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await completedRow.getByRole('button', { name: /열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  const reopen = detail.getByTestId('my-flow-task-complete-control');
  await expect(reopen).toBeChecked();
  await expect(reopen).toHaveAccessibleName(/다시 열기/);
  await reopen.click();
  await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
    'data-completion-result',
    'reopened',
  );
  await expect(reopen).not.toBeChecked();
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
});
test('my flow mobile library renders one row per saved Flow without queue duplication', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    const savedAt = '2026-05-28T00:00:00.000Z';
    for (const [slug, mode, anchor] of [
      ['moving-d30-basic', 'calendar', '2026-06-26'],
      ['computer-skills-d30-study', 'calendar', '2026-06-27'],
      ['used-car-buying-check', 'checklist', undefined],
    ]) {
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: mode,
        ...(anchor ? { anchor } : {}),
      }));
    }
  });

  await page.goto('/my');
  await openCurrentMyFlowLibrary(page);
  const rows = page.getByTestId('my-flow-mobile-structure-row');
  await expect(rows).toHaveCount(3);
  const slugs = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-flow-slug')));
  expect(new Set(slugs).size).toBe(3);
  await expect(page.getByTestId('my-flow-now-section')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overdue-list')).toHaveCount(0);
});
test('my flow long saved list keeps every mobile row above fixed navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    const savedAt = '2026-05-28T00:00:00.000Z';
    for (const [slug, selectedArtifactMode, anchor] of [
      ['moving-d30-basic', 'calendar', '2026-06-26'],
      ['computer-skills-d30-study', 'calendar', '2026-06-27'],
      ['english-study-30day-routine', 'calendar', '2026-05-27'],
      ['fridge-cleanout-weekly-plan', 'sheet', '2026-05-28'],
      ['used-car-buying-check', 'checklist', undefined],
      ['new-car-delivery-check', 'checklist', undefined],
    ]) {
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode,
        ...(anchor ? { anchor } : {}),
      }));
    }
  });

  await page.goto('/my');
  await openCurrentMyFlowLibrary(page);
  const rows = page.getByTestId('my-flow-mobile-structure-row');
  await expect(rows).toHaveCount(6);
  await expect(rows.getByTestId('my-flow-mobile-structure-open')).toHaveCount(6);
  const lastRow = rows.last();
  await lastRow.scrollIntoViewIfNeeded();
  const rowBox = await lastRow.boundingBox();
  const navBox = await page.getByTestId('platform-mobile-tabs').boundingBox();
  expect(rowBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  await expectNoHorizontalOverflow(page);
});
test('calendar route opens the nearest saved schedule instead of an empty today', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-03T09:00:00+09:00') });
  await page.addInitScript(() => {
    const savedAt = '2026-07-03T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-02',
    }));
    localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-06-02',
    }));
  });

  await page.goto('/calendar');

  const selectedDay = await openMyFlowCalendarSelectedDay(page, '2026-06-03');
  await expect(selectedDay.locator('h3')).toContainText('6월 3일');
  await expect(selectedDay.locator('h3')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(selectedDay).not.toContainText('이 날짜에 등록된 일정이 없습니다.');
  const selectedDateGroup = selectedDay.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toContainText('이사 D-30 준비');
  await expect(selectedDateGroup).toContainText('2개 · 2개 남음');
  await expect(selectedDateGroup.getByTestId('my-flow-selected-date-group-meta')).toHaveCount(1);
  await expect(selectedDateGroup.getByTestId('my-flow-group-timing-chip')).toContainText('기준 D+1');
  await expect(selectedDateGroup.getByTestId('my-flow-group-section-label')).toContainText('행정 마무리');
  await expect(selectedDateGroup.getByTestId('my-flow-row-timing-chip')).toHaveCount(0);
  await expect(selectedDateGroup.getByTestId('my-flow-row-section-label')).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"]')).toHaveClass(/my-flow-calendar-selected-date/);
  await expectNoInternalUserSurfaceCopy(selectedDateGroup);
});

test('calendar route distinguishes multiple saved flows on the same selected date', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-03T09:00:00+09:00') });
  await page.addInitScript(() => {
    const savedAt = '2026-07-03T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-02',
    }));
    localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-06-02',
    }));
    localStorage.setItem('flow:saved:computer-skills-d30-study', JSON.stringify({
      slug: 'computer-skills-d30-study',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-07-03',
    }));
    localStorage.setItem('flow:computer-skills-d30-study:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-07-03',
    }));
  });

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').click();

  await expect(page.getByRole('heading', { name: /내 계획 월간 일정/ })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-card')).not.toContainText('월간 일정');
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('h3')).toContainText('6월 3일');

  const groupTexts = (await selectedDay.getByTestId('my-flow-selected-date-group').allInnerTexts()).join(' ');
  expect(groupTexts).toContain('이사 D-30 준비');
  expect(groupTexts).toContain('컴퓨터활용능력 1급 학습');
  expect(groupTexts).not.toMatch(/저장한 일정|저장한 루틴|일정 흐름|체크 흐름|반복 흐름/);

  const flowMarkers = selectedDay.getByTestId('my-flow-selected-date-flow-marker');
  await expect(flowMarkers).toHaveCount(2);
  const markerLabels = (await flowMarkers.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''))).join(' ');
  expect(markerLabels).toContain('이사 D-30 준비');
  expect(markerLabels).toContain('컴퓨터활용능력 1급 학습');

  const dateCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  const scheduleLabels = (await dateCell.getByTestId('my-flow-calendar-flow-label').allInnerTexts()).join(' ');
  expect(scheduleLabels).toContain('이사');
  expect(scheduleLabels).toContain('컴퓨터');
  expect(scheduleLabels).not.toMatch(/(^|\s)(일정|\d+개)(\s|$)/);

  const agendaRows = selectedDay.getByTestId('my-flow-execution-row-shell');
  const agendaRowCount = await agendaRows.count();
  expect(agendaRowCount).toBeGreaterThanOrEqual(3);
  await expect(agendaRows.getByTestId('my-flow-row-date-meta')).toHaveCount(0);
  await expect(agendaRows.getByTestId('my-flow-row-timing-chip')).toHaveCount(0);
  await expect(agendaRows.getByTestId('my-flow-row-section-label')).toHaveCount(0);
  await expect(agendaRows.getByTestId('my-flow-row-flow-chip')).toHaveCount(0);
  await expect(agendaRows.getByTestId('my-flow-row-progress-chip')).toHaveCount(0);
  await expect(agendaRows.getByTestId('my-flow-row-open-label')).toHaveCount(agendaRowCount);
  await expect(agendaRows.getByRole('button', { name: /열기/ })).toHaveCount(agendaRowCount);
  await expect(agendaRows.getByTestId('my-flow-task-complete-control')).toHaveCount(agendaRowCount);
  await expect(agendaRows.getByTestId('my-flow-task-complete-control').first()).toHaveAttribute('type', 'checkbox');
  await expect(agendaRows.getByRole('button', { name: /^완료$/ })).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').click();
  await expect(page.locator('main').getByText('날짜별 실행', { exact: true })).toHaveCount(1);
  const calendarHeadingCount = await page.locator('main h1, main h2, main h3').filter({ hasText: /^캘린더$/ }).count();
  expect(calendarHeadingCount).toBe(1);
});

test('calendar route compacts three-plus same-date flow labels in the month grid', async ({ page }) => {
  const seedSameDateFlowStack = () => {
    const savedAt = '2026-07-03T00:00:00.000Z';
    const saveFlow = (slug: string, anchor: string) => {
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        anchor,
      }));
      localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({
        mode: 'custom',
        anchor,
      }));
    };
    saveFlow('moving-d30-basic', '2026-07-03');
    saveFlow('computer-skills-d30-study', '2026-07-03');
    saveFlow('vehicle-inspection-prep', '2026-06-17');
    saveFlow('portfolio-4week', '2026-07-01');
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-03T09:00:00+09:00') });
  await page.addInitScript(seedSameDateFlowStack);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const mobileDateCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  await mobileDateCell.getByTestId('my-flow-calendar-date-button').click();

  await expect(mobileDateCell.getByTestId('my-flow-calendar-flow-label')).toHaveCount(2);
  const mobileFlowMarkerInitials = mobileDateCell.getByTestId('my-flow-calendar-schedule-rail');
  await expect(mobileFlowMarkerInitials).toHaveCount(2);
  const mobileMarkerLabels = await mobileFlowMarkerInitials.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-flow-marker-initial') ?? ''),
  );
  expect(new Set(mobileMarkerLabels).size).toBe(2);
  expect(mobileMarkerLabels.every((label) => Array.from(label).length === 1)).toBe(true);
  await expect(mobileDateCell.getByTestId('my-flow-calendar-grid-overflow-summary')).toContainText('외 2개');
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group')).toHaveCount(4);
  await expect(selectedDay.getByTestId('my-flow-selected-date-flow-marker')).toHaveCount(4);
  const selectedDayGroupText = (await selectedDay.getByTestId('my-flow-selected-date-group').allInnerTexts()).join(' ');
  expect(selectedDayGroupText).toContain('이사 D-30 준비');
  expect(selectedDayGroupText).toContain('컴퓨터활용능력 1급 학습');
  expect(selectedDayGroupText).toContain('자동차검사 준비');
  expect(selectedDayGroupText).toContain('개발 프로젝트 포트폴리오');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const wideDateCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  await wideDateCell.getByTestId('my-flow-calendar-date-button').click();

  await expect(wideDateCell.getByTestId('my-flow-calendar-flow-label')).toHaveCount(2);
  await expect(wideDateCell.getByTestId('my-flow-calendar-schedule-rail')).toHaveCount(2);
  await expect(wideDateCell.getByTestId('my-flow-calendar-grid-overflow-summary')).toContainText('외 2개');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-selected-date-group')).toHaveCount(4);
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('calendar route keeps the compact month grid before the selected-day agenda on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-03T09:00:00+09:00') });
  await page.addInitScript(() => {
    const savedAt = '2026-07-03T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-07-22',
    }));
    localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-07-22',
    }));
  });

  await page.goto('/calendar');

  const selectedDay = await openMyFlowCalendarSelectedDay(page, '2026-07-12');
  await expect(selectedDay.locator('h3')).toContainText('7월 12일');
  await expect(page.getByTestId('my-flow-calendar-day-sheet')).toBeVisible();
  await expect(
    page.getByTestId('my-flow-calendar-day-sheet').getByTestId('my-flow-calendar-selected-day'),
  ).toBeVisible();
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toContainText('이사 D-30 준비');

  const scheduleContent = page.locator('.fc-daygrid-day[data-date="2026-07-12"] [data-testid="my-flow-calendar-schedule-content"]').first();
  await expect(scheduleContent).toBeVisible();
  await expect(scheduleContent).not.toContainText('이사 방식과 견적 후보 정하기');
  const scheduleLabel = scheduleContent.getByTestId('my-flow-calendar-flow-label');
  await expect(scheduleLabel).toHaveText(/^이사 D-30(?:\.\.\.|…)$/);
  await expect(scheduleLabel).toHaveAttribute('title', '이사 D-30 준비');
  await expect(scheduleContent).toHaveAttribute('data-p30-marker', 'P30-CALENDAR-COMPACT-IDENTITY');
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('saved calendar checklist and routine flows remain available across My Flow and Calendar', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await page.addInitScript(() => {
    const savedAt = '2026-05-27T00:00:00.000Z';
    localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    }));
    localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-06-26',
    }));
    localStorage.setItem('flow:saved:english-study-30day-routine', JSON.stringify({
      slug: 'english-study-30day-routine',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-05-27',
    }));
    localStorage.setItem('flow:english-study-30day-routine:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-05-27',
    }));
  });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(2);
  await expect(library.locator('[data-testid="my-flow-library-row"][data-flow-slug="moving-d30-basic"]')).toBeVisible();
  const routineLibraryRow = library.locator('[data-testid="my-flow-library-row"][data-flow-slug="english-study-30day-routine"]');
  await expect(routineLibraryRow).toBeVisible();
  const routineFlow = await openMyFlowLibraryFlow(page, 'english-study-30day-routine');
  await expect(routineFlow).toHaveAttribute('data-flow-slug', 'english-study-30day-routine');
  await expect(routineFlow.getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/12 완료');

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
});

test('my flow ux12 demo renders its fixture library without legacy local views', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');
  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX12');
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-now-section')).toHaveCount(0);

  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(16);
  const overview = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
  await expect(overview).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(overview.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
});
test('my flow source-backed demo renders two bridge bundles in the shared library', async ({ page }) => {
  await page.goto('/my?demo=source-backed');
  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('원문 기반');
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);

  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(2);
  await library.locator('[data-testid="my-flow-library-row"][data-flow-slug="source-backed-moving-d30"]').click();
  await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'))
    .toHaveAttribute('data-flow-slug', 'source-backed-moving-d30');
  await library.locator('[data-testid="my-flow-library-row"][data-flow-slug="source-backed-middle-school-math-1"]').click();
  await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'))
    .toHaveAttribute('data-flow-slug', 'source-backed-middle-school-math-1');
});
test('my flow source-backed demo stays lightweight in the mobile library', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');

  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  const rows = page.getByTestId('my-flow-mobile-structure-row');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]'))
    .toHaveCount(1);
  await expect(page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-middle-school-math-1"]'))
    .toHaveCount(1);
  await expect(rows.getByTestId('my-flow-mobile-structure-open')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
});
test('source-backed flow map public page stays save-before focused', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/middle-school-math-1');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap).toBeVisible();
  await expect(publicMap.getByRole('heading', { name: '중1 수학 목차 진도표' })).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-hero')).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(publicMap.getByText('원문', { exact: true })).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-artifact-preview')).toContainText('소인수분해');
  await expect(publicMap.getByTestId('flow-map-hero')).toContainText('저장될 전체 계획');
  await expect(publicMap.getByTestId('flow-map-hero')).not.toContainText('저장 전 보기');
  await expect(publicMap).not.toContainText('저장되는 결과물');
  const firstActionTop = await publicMap.getByTestId('flow-map-artifact-preview').evaluate((element) => element.getBoundingClientRect().top);
  expect(firstActionTop).toBeLessThan(720);
  await expect(publicMap).toContainText('중1 수학 목차');
  await expect(publicMap.getByTestId('flow-map-hero')).not.toContainText('이사일 1개를 넣으면');
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(publicMap).toContainText('소인수분해');
  await expect(publicMap).toContainText('정수와 유리수');
  await expect(publicMap).toContainText('거듭제곱');
  await expect(publicMap.getByTestId('flow-map-public-step-items').first()).toContainText(/체크 \d+개/);
  await expect(publicMap.getByText('메모 · 원문').first()).toBeVisible();
  await expect(publicMap.getByRole('button', { name: '내 계획에 저장' })).toBeVisible();
  await expect(publicMap).not.toContainText(/source fit|PoC|개발자|평가 점수/i);
  await expect(publicMap).not.toContainText(/제작자 편집|초안 저장|새 공개 버전/i);
});

test('source-backed flow map public page saves into the real My Flow path', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flow-maps/middle-school-math-1');

  await page.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1&savedPlanLibrary=off');
  await expect(page.getByTestId('flow-map-creator')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/제작자 편집|초안 저장|새 공개 버전/i);
  await expect(page.getByTestId('my-flow-demo-badge')).toHaveCount(0);
  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('저장됨');
  await expect(postSavePanel.getByRole('heading', { name: '1. 소인수분해' })).toHaveCount(0);
  await expect(postSavePanel).toContainText('중1 수학 목차 진도표');
  await expect(postSavePanel).not.toContainText('Mathbang');
  await expect(postSavePanel.getByTestId('my-flow-post-save-receipt-summary')).toContainText('할 일 8개');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(8);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all')).toHaveCount(0);
  await postSavePanel.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  const mathCard = await openMyFlowLibraryFlow(page, 'source-backed-middle-school-math-1');
  await expect(mathCard).toBeVisible();
  await expect(mathCard).toContainText('단원별 개념 진도');
  await expect(mathCard.getByTestId('my-flow-map-context')).toContainText('중1 수학 목차 진도표');
  await expect(mathCard).not.toContainText('Mathbang');
  await expect(mathCard.getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/8 완료');
  await mathCard.getByTestId('my-flow-management-menu-trigger').click();
  const sourceLink = mathCard.getByTestId('my-flow-management-source');
  await expect(sourceLink).toHaveText('원문 보기');
  await expect(sourceLink).toHaveAttribute('href', '/flow-maps/middle-school-math-1');

  await mathCard.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveCount(0);
  const detailSection = mathCard.getByTestId('my-flow-workspace-detail-pane');
  await expect(detailSection.getByTestId('my-flow-item-detail')).toBeVisible();
  await expect(detailSection).not.toContainText('Mathbang');
  const itemChecklist = detailSection.getByTestId('my-flow-item-checklist');
  await expect(itemChecklist).toContainText('거듭제곱');
  const powerChecklistItem = itemChecklist.getByLabel('거듭제곱');
  await powerChecklistItem.click();
  await expect(powerChecklistItem).toBeChecked();
  await expect(detailSection.getByTestId('my-flow-detail-checklist-progress')).toContainText('개념 항목 1/8');

  await enterMyFlowDetailEditMode(detailSection.getByTestId('my-flow-item-detail'));
  await detailSection.getByTestId('my-flow-detail-date-input').fill('2026-06-29');
  await expect(detailSection.getByTestId('my-flow-progress-schedule-note')).toContainText('날짜를 넣으면');
  await detailSection.getByTestId('my-flow-detail-save-changes').click();
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-29"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 29일');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article')).toHaveCount(1);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:source-backed-')));
  expect(savedKeys).toEqual(['flow:saved:source-backed-middle-school-math-1']);
  const savedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'));
  expect(savedMap.version).toBe('2026-06-24.1');
  expect(savedMap.flowSlugs).toEqual(['source-backed-middle-school-math-1']);
});

test('my flow separates ready source-backed content from review-needed saved flows', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1');
  await page.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1&sort=next');

  await page.evaluate(() => {
    localStorage.setItem(
      'flow:saved:alt-phone-sk7-self-activation',
      JSON.stringify({
        slug: 'alt-phone-sk7-self-activation',
        savedAt: '2026-06-24T12:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }),
    );
  });

  await page.goto('/my');
  await openCurrentMyFlowLibrary(page);

  await expect(await openMyFlowLibraryFlow(page, 'source-backed-middle-school-math-1')).toBeVisible();
  await expect(page.getByTestId('my-flow-review-section')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('알뜰폰 SK7 셀프개통 체크');

  await page.goto('/calendar');
  await expect(page.locator('body')).not.toContainText('알뜰폰 SK7 셀프개통 체크');
});

test('source-backed single progress map opens item detail in the mobile focused workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flow-maps/middle-school-math-1');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1&savedPlanLibrary=off');
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await page.getByTestId('my-flow-post-save-view-flow').click();

  const flow = await openMyFlowLibraryFlow(page, 'source-backed-middle-school-math-1', 'plan');
  const item = flow.getByTestId('my-flow-execution-row-shell').filter({ hasText: '기본도형' }).first();
  await item.getByRole('button', { name: /열기/ }).click();
  const detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await expect(detail).toBeVisible();
  await expect(detail).not.toContainText('Step 실행');
  await expect(detail).not.toContainText('Item');
  await expect(detail.getByTestId('my-flow-item-checklist')).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-portable-export').locator(':scope > summary'))
    .toContainText('현재 항목 1개 옮기기');
});
test('canonical moving aliases save one 24-item timeline without creating a legacy map copy', async ({ page }) => {
  const movingDate = createMovingDateFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  await expect(page).toHaveURL('/f/moving-d30-basic');
  const publicFlow = page.getByTestId('public-flow-hero');
  await expect(publicFlow.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  const publicCapability = page.getByTestId('public-flow-capability-result');
  await expect(publicCapability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(publicCapability.locator(
    '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
  )).toHaveAttribute('data-capability-output-count', '24');
  await setApprovedPublicCalendarAnchor(page, movingDate.anchor);
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, page.url());
  const movingOverviewCard = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(movingOverviewCard).toBeVisible();
  await expect(movingOverviewCard.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute(
    'data-effective-row-count',
    '24',
  );
  await expectNoVisibleSourceBrandSlug(movingOverviewCard);
  await expect(movingOverviewCard).toContainText(movingDate.firstActionLabel);

  const stored = await page.evaluate((flowSlug) => ({
    canonical: JSON.parse(localStorage.getItem(`flow:saved:${flowSlug}`) || 'null'),
    legacyMap: localStorage.getItem('flow:map:saved:moving-d30'),
    legacySourceRecord: localStorage.getItem('flow:saved:moving-d30-basic'),
  }), personalCopySlug);
  expect(stored.canonical.schemaVersion).toBe(2);
  expect(stored.canonical.anchor).toBe(movingDate.anchor);
  expect(stored.canonical.sourceFlowSlug).toBe('moving-d30-basic');
  expect(stored.canonical.personalCopyKey).toBe(personalCopySlug);
  expect(stored.canonical.savedItemCount).toBe(24);
  expect(stored.canonical.sourceFlowKey).toMatch(/\S/u);
  expect(stored.canonical.sourceVersion).toMatch(/\S/u);
  expect(stored.canonical.lastSaveRequestId).toMatch(/^save-request:/u);
  expect(stored.legacyMap).toBeNull();
  expect(stored.legacySourceRecord).toBeNull();
});

test('task completion controls use one checkbox pattern in My Flow and Calendar', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-07-20T10:00:00+09:00') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');
  await setApprovedPublicCalendarAnchor(page, '2026-07-22');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  const flow = await openMyFlowLibraryFlow(page, personalCopySlug, 'execute');
  const executionRow = flow
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-execution-row-shell')
    .locator('article[data-row-key]')
    .first();
  const rowKey = await executionRow.getAttribute('data-row-key');
  expect(rowKey).toBeTruthy();
  const stableExecutionRow = flow.locator(`article[data-row-key="${rowKey}"]`);
  await expect(stableExecutionRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await executionRow.getByRole('button', { name: /열기/ }).click();
  let detail = getOpenMyFlowItemDetail(page);
  const myFlowComplete = detail.getByTestId('my-flow-task-complete-control');
  await expect(myFlowComplete).toHaveAttribute('type', 'checkbox');
  await expect(myFlowComplete).toHaveAccessibleName(/완료/);
  await myFlowComplete.click();
  await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
    'data-completion-result',
    'completed',
  );

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await selectedDay.getByRole('button', { name: /열기/ }).first().click();
  const calendarFlow = await openMyFlowLibraryFlow(page, personalCopySlug, 'execute');
  const calendarFlowRow = calendarFlow
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-execution-row-shell')
    .first();
  await calendarFlowRow.getByRole('button', { name: /열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  const calendarComplete = detail.getByTestId('my-flow-task-complete-control');
  await expect(calendarComplete).toHaveAttribute('type', 'checkbox');
  await expect(page.getByTestId('my-flow-task-complete-button')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-task-complete-mixed')).toHaveCount(0);
});
test('review-hold Flow Maps keep current official source access without new save or stale schedule rows', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_TAX_ADMIN_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  const cases = [
    { mapId: 'baby-health-schedule', title: '영유아 검진·접종 일정' },
    { mapId: 'curated-child-vaccination-schedule', title: '아이 예방접종 일정표' },
    {
      mapId: 'year-end-tax-submit',
      title: '연말정산 간소화자료 온라인 제출',
      sourceHref: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7706&mi=6646',
    },
  ];

  for (const flowCase of cases) {
    if (flowCase.mapId === 'year-end-tax-submit') await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/flow-maps/${flowCase.mapId}`);

    const publicMap = page.getByTestId('flow-map-public');
    const hold = page.getByTestId('flow-map-review-hold');
    await expect(publicMap.getByRole('heading', { name: flowCase.title })).toBeVisible();
    await expect(hold).toContainText('최신 공식 내용 확인 필요');
    await expect(hold).toContainText('지금은 이 페이지에서 저장하거나 파일로 받지 않습니다');
    const sourceLink = hold.getByRole('link', { name: '최신 공식 내용 확인' });
    await expect(sourceLink).toHaveAttribute('target', '_blank');
    if (flowCase.sourceHref) await expect(sourceLink).toHaveAttribute('href', flowCase.sourceHref);
    await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-public-step-items')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    if (evidenceDir && flowCase.mapId === 'year-end-tax-submit') {
      await page.screenshot({ path: `${evidenceDir}/03-tax-review-hold-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.screenshot({ path: `${evidenceDir}/04-tax-review-hold-wide.png`, fullPage: true });
    }
  }
});

test('broad Funmom category collection stays visible as a source-row hold without an executable weekly schedule', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_LEARNING_MAINTENANCE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/curated-funmom-learning-park');

  const hold = page.getByTestId('flow-map-review-hold');
  await expect(hold.getByRole('heading', { name: '펀맘 주간 출력 루틴' })).toBeVisible();
  await expect(hold).toContainText('실행 항목 준비 중');
  await expect(hold).toContainText('원문 자료에서 실제로 실행할 항목을 고르는 중이에요');
  await expect(hold).toContainText('개별 자료와 난이도를 확인하기 전에는');
  await expect(hold.getByRole('link', { name: '원문 자료 둘러보기' })).toHaveAttribute('href', 'https://funmom.tistory.com/');
  await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
  await expect(page.getByTestId('flow-map-public-step-items')).toHaveCount(0);
  await expect(page.getByText('월: 색칠공부 한 장 출력')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-funmom-review-hold-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-funmom-review-hold-wide.png`, fullPage: true });
});

test('an existing saved Funmom draft stays out of ordinary execution surfaces', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_LEARNING_MAINTENANCE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=curated-funmom-learning-park');

  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('펀맘 주간 출력 루틴');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록 보관됨');
  await expect(page.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(page.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-funmom-existing-save-warning-mobile.png`, fullPage: true });
});

test('creator infant-feeding schedule is held for current guidance review without deleting an existing save', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_INFANT_FEEDING_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/baby-food-map');

  const hold = page.getByTestId('flow-map-review-hold');
  await expect(hold.getByRole('heading', { name: '초기 이유식 식단표' })).toBeVisible();
  await expect(hold).toContainText('시작 시기 확인 필요');
  await expect(hold).toContainText('150~180일 식단은 민간 참고 자료');
  await expect(hold).toContainText('생후 6개월 무렵');
  await expect(hold.getByRole('link', { name: '공식 이유식 안내 보기' })).toHaveAttribute(
    'href',
    'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5470',
  );
  await expect(hold.getByRole('link', { name: '참고 식단표 원문' })).toHaveAttribute(
    'href',
    'https://blog.naver.com/01695258757/222768860919',
  );
  await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
  await expect(page.getByTestId('flow-map-public-step-items')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-baby-food-review-hold-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-baby-food-review-hold-wide.png`, fullPage: true });

  const directResponse = await page.goto('/f/baby-150-start');
  expect(directResponse?.status()).toBe(404);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=baby-food-map');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('초기 이유식 식단표');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록 보관됨');
  await expect(page.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(page.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-baby-food-existing-save-warning-mobile.png`, fullPage: true });
});

test('current Samsung 1way aircon routine keeps its verified cadence and puts model applicability first', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_LEARNING_MAINTENANCE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/aircon-filter-cleaning');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap.getByRole('heading', { name: '천장형 에어컨 1way 필터 청소 루틴', level: 1 })).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-hero')).toContainText('저장될 전체 계획');
  await expect(publicMap.getByTestId('flow-map-artifact-preview')).toContainText('필터 청소하고 리셋하기');
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(publicMap.getByTestId('flow-map-source-link')).toHaveAttribute('href', 'https://www.samsungsvc.co.kr/solution/28524');
  await expect(page.getByTestId('flow-map-save-all-mobile')).toBeVisible();
  await expect(publicMap).not.toContainText('sourceTrace');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/05-aircon-direct-mobile.png`, fullPage: true });

  const detailItems = publicMap.getByTestId('flow-map-public-step-items');
  await detailItems.getByText('체크 7개 열기').click();
  await expect(detailItems).toContainText('제품이 천장형 1way인지 모델명과 사용설명서 확인');
  await expect(detailItems).toContainText('운전을 정지하고 보조전원스위치 끄기');
  await expect(detailItems).toContainText('필터 리셋 또는 알림 해제 실행');
  await expect(publicMap).not.toContainText('sourceTrace');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/06-aircon-details-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  await expect(page.getByTestId('flow-map-save-all')).toBeVisible();
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/07-aircon-direct-wide.png`, fullPage: true });
});

test('postal address transfer keeps only the official next-day check and defers variable dates to the service', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_TAX_ADMIN_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/postal-address-transfer');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap.getByRole('heading', { name: '주거이전 우편물 전송 확인', level: 1 })).toBeVisible();
  await expect(publicMap).toContainText('1개 할 일');
  await expect(publicMap).toContainText('주거이전서비스 신청·결제 상태 확인');
  await expect(publicMap).not.toContainText('D+3');
  await expect(publicMap).not.toContainText('D+7');
  await expect(publicMap).not.toContainText('서비스 시작일과 종료일 메모');
  await expect(page.getByTestId('flow-map-save-all')).toBeHidden();
  await expect(page.getByTestId('flow-map-save-all-mobile')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/01-postal-minimal-mobile.png` });
  }
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  const detailItems = publicMap.getByTestId('flow-map-public-step-items');
  await detailItems.getByText('체크 4개 열기').click();
  if (evidenceDir) {
    await detailItems.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/07-postal-details-mobile.png` });
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
    await expect(page.getByTestId('flow-map-save-all')).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/02-postal-minimal-wide.png`, fullPage: true });
  }
});

test('an existing saved year-end tax map stays out of ordinary execution surfaces', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_TAX_ADMIN_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=year-end-tax-submit');

  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('연말정산 간소화자료 온라인 제출');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록 보관됨');
  await expect(page.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(page.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/06-tax-existing-save-warning-mobile.png`, fullPage: true });
});

test('an existing saved baby health map stays out of ordinary execution after hold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed&savedMap=baby-health-schedule');

  await expect(page).toHaveURL('/my?demo=source-backed&savedMap=baby-health-schedule&sort=next');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('영유아 검진·접종 일정');
  await expect(page.getByTestId('my-flow-post-save-panel')).not.toContainText('영유아 검진·접종 일정 지도');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록 보관됨');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('확인 후 실행 목록에 표시할 수 있어요.');
  await expect(page.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(page.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
});

test('my flow hides held saved maps from ordinary execution while retaining storage', async ({ page }) => {
  await seedSavedBabyHealthMap(page, { version: '2026-01-01.old' });

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('영유아 검진·접종 일정');
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('flow:map:saved:baby-health-schedule')))).toBe(true);
  await page.reload();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('영유아 검진·접종 일정');
});

test('completed personal Flow reviews item changes before starting a new source version', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_VERSION_REVIEW_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=version-review');
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await openUrlFirstQuickStart(result);
  await result.getByRole('button', { name: '저장 전 편집' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  const stepBoxes = customPanel.locator('input[type="checkbox"]');
  const stepCount = await stepBoxes.count();
  for (let index = 1; index < stepCount; index += 1) await stepBoxes.nth(index).uncheck();
  await result.getByLabel('학습 시작일').fill('2026-07-15');
  await result.getByRole('button', { name: '내 계획에 저장' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);

  await page.evaluate(() => {
    const mapKey = 'flow:map:saved:middle-school-math-1';
    const persistenceKey = 'flow:map:persistence:middle-school-math-1';
    const flowSlug = 'source-backed-middle-school-math-1';
    const stepId = 'math-prime-factorization';
    const snapshot = JSON.parse(window.localStorage.getItem(mapKey) || 'null');
    const persistence = JSON.parse(window.localStorage.getItem(persistenceKey) || 'null');
    snapshot.version = '2026-01-01.old';
    snapshot.personalCopy.excludedStepIdsByFlow[flowSlug] = snapshot.personalCopy.excludedStepIdsByFlow[flowSlug]
      .filter((id: string) => id !== 'math-integers-rationals');
    snapshot.personalCopy.stepOverridesByFlow = {
      [flowSlug]: {
        [stepId]: {
          title: '내 시험용 소인수분해',
          userMemo: '내 풀이 순서를 유지',
          schedule: { mode: 'fixed_date', date: '2026-07-18' },
        },
      },
    };
    persistence.map.version = '2026-01-01.old';
    persistence.childFlows[0].steps[0].title = '이전 소인수분해';
    persistence.childFlows[0].steps[0].textFallback.description = '이전 설명';
    persistence.personalCopy = snapshot.personalCopy;
    window.localStorage.setItem(mapKey, JSON.stringify(snapshot));
    window.localStorage.setItem(persistenceKey, JSON.stringify(persistence));
    window.localStorage.setItem(`flow_builder_mvp_checks_${flowSlug}`, JSON.stringify({ [stepId]: true }));
  });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview).toBeVisible();
  await updateReview.getByTestId('my-flow-map-update-toggle').click();
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('내 수정과 겹침');
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('새 할 일');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-update-notice-mobile.png`, fullPage: true });
  await updateReview.getByTestId('my-flow-map-update-apply').click();

  const reusePanel = page.getByTestId('my-flow-reuse-panel');
  await expect(reusePanel.getByTestId('my-flow-version-review')).toBeVisible();
  await reusePanel.getByTestId('my-flow-reuse-anchor-input').fill('2026-09-01');
  await reusePanel.getByLabel('내가 바꾼 날짜 유지').check();
  const changedItem = reusePanel.getByTestId('my-flow-version-review-item').filter({ hasText: '소인수분해' });
  await changedItem.getByLabel('새 내용에 내 수정 유지').check();
  const addedItem = reusePanel.getByTestId('my-flow-version-review-item').filter({ hasText: '정수와 유리수' });
  await addedItem.getByLabel('이번에는 제외').check();
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/02-version-review-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.screenshot({ path: `${evidenceDir}/03-version-review-wide.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await reusePanel.getByTestId('my-flow-reuse-start').click();
  const reviewedFlow = await openMyFlowLibraryFlow(page, 'source-backed-middle-school-math-1', 'record');
  await expect(reviewedFlow.getByTestId('my-flow-past-runs')).toContainText('지난 실행 1회');
  await expect(reviewedFlow).toContainText('전체 0/1 완료');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-reviewed-run-mobile.png`, fullPage: true });

  const savedState = await page.evaluate(() => {
    const flowSlug = 'source-backed-middle-school-math-1';
    return {
      snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:middle-school-math-1') || 'null'),
      persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:middle-school-math-1') || 'null'),
      runs: JSON.parse(window.localStorage.getItem(`flow:run-registry:${flowSlug}`) || 'null'),
    };
  });
  expect(savedState.snapshot.version).not.toBe('2026-01-01.old');
  expect(savedState.snapshot.personalCopy.source).toBe('version_review');
  expect(savedState.snapshot.personalCopy.stepOverridesByFlow['source-backed-middle-school-math-1']['math-prime-factorization'].title).toBe('내 시험용 소인수분해');
  expect(savedState.snapshot.personalCopy.excludedStepIdsByFlow['source-backed-middle-school-math-1']).toContain('math-integers-rationals');
  expect(savedState.persistence.map.version).toBe(savedState.snapshot.version);
  const completedRun = savedState.runs.runs.find((run: { status: string }) => run.status === 'completed');
  const activeRun = savedState.runs.runs.find((run: { status: string }) => run.status === 'active');
  expect(completedRun.sourceVersion).toBe('2026-01-01.old');
  expect(completedRun.completionSnapshot.itemSnapshots).toHaveLength(1);
  expect(completedRun.completionSnapshot.itemSnapshots[0]).toMatchObject({
    title: '내 시험용 소인수분해',
    status: 'done',
    date: '2026-07-18',
    memo: '내 풀이 순서를 유지',
  });
  expect(activeRun.sourceVersion).toBe(savedState.snapshot.version);
  expect(activeRun.runId).not.toBe(completedRun.runId);
  expect(activeRun.reuseMode).toBe('reviewed_version');
});

test('active source update does not add missing child Flow before the current execution is complete', async ({ page }) => {
  await seedSavedBabyHealthMap(page, { version: '2026-01-01.old', includeVaccination: false });

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:baby-health-schedule') || 'null'),
    checkups: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-health-checkups') || 'null'),
    vaccinations: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-baby-vaccination-schedule') || 'null'),
  }));
  expect(savedState.snapshot.flowSlugs).not.toContain('source-backed-baby-vaccination-schedule');
  expect(savedState.checkups.anchor).toBe('2026-01-15');
  expect(savedState.vaccinations).toBeNull();
});

test('source-backed flow map creator page shows publish structure without mixing user execution', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1/creator');

  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toBeVisible();
  await expect(creatorMap.getByRole('heading', { name: '중1 수학 목차 진도표' })).toBeVisible();
  await expect(creatorMap).toContainText('제작자 편집');
  await expect(creatorMap).toContainText('원문 행');
  await expect(creatorMap).toContainText('사용자에게 저장될 Step');
  await expect(creatorMap).toContainText('초안 0개 수정');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('거듭제곱');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('에라토스테네스의 체');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('참고 원문');
  await expect(creatorMap).toContainText('저장 후 사용자 화면');
  await expect(creatorMap.getByTestId('flow-map-source-row')).toHaveCount(8);
  await expect(creatorMap.getByRole('link', { name: '공개 화면 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');
  await expect(creatorMap.getByRole('link', { name: '저장 후 화면 보기' })).toHaveAttribute('href', '/my?demo=source-backed&savedMap=middle-school-math-1');

  await creatorMap.getByTestId('flow-map-source-row').nth(1).click();
  await creatorMap.getByTestId('creator-draft-note').fill('2단원 제목과 fallback item 확인');
  await creatorMap.getByTestId('creator-save-draft').click();
  await expect(creatorMap).toContainText('초안 저장됨');
  await creatorMap.getByTestId('creator-publish-draft').click();
  await expect(creatorMap).toContainText('로컬 발행 표시됨');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:creator-draft:middle-school-math-1') || 'null'));
  expect(draft.publishedVersion).toBe('2026-06-24.1');
  expect(draft.rows['math-integers-rationals'].creatorNote).toBe('2단원 제목과 fallback item 확인');
  const published = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:published-local:middle-school-math-1') || 'null'));
  expect(published.source).toBe('local_creator_publish');
  expect(published.rows['math-integers-rationals'].creatorNote).toBe('2단원 제목과 fallback item 확인');
  await expect(creatorMap).not.toContainText('오늘 실행');
  await expect(creatorMap).not.toContainText('완료 체크');
  await expect(creatorMap.getByTestId('my-flow-item-detail')).toHaveCount(0);
});

test('source-backed creator saved preview opens the requested My Flow map demo', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule/creator');

  await page.getByRole('link', { name: '저장 후 화면 보기' }).click();
  await expect(page).toHaveURL('/my?demo=source-backed&savedMap=baby-health-schedule&sort=next');

  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('영유아 검진·접종 일정');
  await expect(postSavePanel).not.toContainText('영유아 검진·접종 일정 지도');
  await expect(postSavePanel).toContainText('저장 기록 보관됨');
  await expect(postSavePanel).toContainText('확인 후 실행 목록에 표시할 수 있어요.');
  await expect(postSavePanel.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(postSavePanel).not.toContainText('묶음');
  await expect(postSavePanel).toHaveAttribute('data-receipt-total-count', '18');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(14);
  await postSavePanel.getByTestId('my-flow-whole-flow-toggle-all-groups').click();
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(18);
});

test('my flow step detail saves portable date and memo fields', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.install({ time: new Date('2026-07-01T09:00:00+09:00') });
  await page.goto('/f/moving-d30-basic');

  await setApprovedPublicCalendarAnchor(page, '2026-07-22');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, page.url());
  await page.setViewportSize({ width: 390, height: 844 });
  const movingCard = await openMyFlowLibraryFlow(page, personalCopySlug);
  const movingOutline = movingCard.getByTestId('my-flow-whole-flow-outline');
  const movingMethodRow = movingOutline
    .locator('article[data-row-key]')
    .filter({ hasText: '이사 방식 정하기' })
    .first();
  await movingMethodRow.getByRole('button', { name: /열기/ }).click();

  let detail = getOpenMyFlowItemDetail(page);
  await expect(detail).toBeVisible();
  const itemEditor = await openSavedPersonalItemEditor(page, detail);
  await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-06-24');
  await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill('견적 후보 3곳과 포함 범위만 메모');
  await saveSavedPersonalItemEditor(page, itemEditor);

  const stored = await page.evaluate(() => ({
    dateOverrides: JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    drafts: JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
  }));
  expect(Object.keys(stored.dateOverrides)).toHaveLength(0);
  const draftValues = Object.values(stored.drafts) as Array<Record<string, string>>;
  expect(draftValues.some((draft) => (
    draft.date === '2026-06-24'
    && draft.memo === '견적 후보 3곳과 포함 범위만 메모'
  ))).toBe(true);

  const updatedMovingCard = await openMyFlowLibraryFlow(page, personalCopySlug, 'plan');
  const editedMovingMethodRow = updatedMovingCard
    .getByTestId('my-flow-whole-flow-outline')
    .locator('article[data-row-key]')
    .filter({ hasText: '이사 방식 정하기' })
    .first();
  await expect(editedMovingMethodRow).toContainText('6월 24일');
  await editedMovingMethodRow
    .getByRole('button', { name: /열기/ })
    .click();
  detail = getOpenMyFlowItemDetail(page);
  const exportTools = await openMyFlowDetailTools(detail);
  await expect(exportTools.getByTestId('my-flow-detail-copy-portable-text')).toContainText('메모로 복사');
  await expect(exportTools.getByTestId('my-flow-detail-download-ics')).toContainText('캘린더 파일 받기');
  const memoReceipt = await confirmMyFlowTransfer(
    exportTools,
    exportTools.getByTestId('my-flow-detail-copy-portable-text'),
  );
  await acknowledgeMyFlowTransfer(memoReceipt);
  await exportTools.getByTestId('my-flow-detail-download-ics').click();
  const downloadConfirmation = exportTools.getByTestId('my-flow-transfer-confirmation');
  await expect(downloadConfirmation).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadConfirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  await expect(exportTools.getByTestId('my-flow-transfer-receipt')).toHaveAttribute('data-outcome', 'success');
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  const unfoldedIcs = ics.replace(/\r?\n[ \t]/g, '');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260624');
  expect(ics).not.toContain('RRULE:');
  expect(unfoldedIcs).toContain('견적 후보 3곳과 포함 범위만 메모');

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const movedEvent = page.locator('.fc-daygrid-day[data-date="2026-06-24"] .fc-event').first();
  await expect(movedEvent).toHaveAttribute('title', /이사 방식/);
  await movedEvent.click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay.getByTestId('my-flow-item-detail')).toHaveCount(0);
  const openFlow = selectedDay.getByRole('button', { name: /계획에서 열기/ }).first();
  await expect(openFlow).toBeVisible();
  await openFlow.click();
  await expect(page).toHaveURL(/\/my\?/);
  await expect(page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopySlug}"]:visible`,
  )).toBeVisible();
});

test('source-backed undated checklist can add and remove a personal date', async ({ page }) => {
  test.setTimeout(60_000);
  const evidenceDir = process.env.FLOWME_P23_05A_EVIDENCE_DIR;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  if (evidenceDir) {
    fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
    fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => {
    window.localStorage.setItem('flow:saved:travel-packing-list', JSON.stringify({
      slug: 'travel-packing-list',
      savedAt: '2026-07-13T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }));
  });
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);

  let flow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
  await flow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  let detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await enterMyFlowDetailEditMode(detail);
  const dateControl = detail.getByTestId('my-flow-undated-item-date-control');
  await expect(dateControl).toBeVisible();
  await expect(dateControl).toContainText('날짜를 정하면 캘린더에도 함께 보여요.');
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-24');
  await expect(detail.getByTestId('my-flow-undated-item-date-clear')).toHaveAccessibleName(/날짜 없애기$/);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/01-source-undated-date-set-mobile.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await detail.getByTestId('my-flow-detail-save-changes').click();

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const scheduledCell = page.locator('.fc-daygrid-day[data-date="2026-07-24"]');
  await expect(scheduledCell.locator('.fc-event')).toHaveCount(1);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/02-source-undated-calendar-mobile.png`, fullPage: true });
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  flow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
  await flow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  const exportTools = await openMyFlowDetailTools(detail);
  let transferReceipt = await confirmMyFlowTransfer(
    exportTools,
    exportTools.getByTestId('my-flow-detail-copy-portable-text'),
  );
  const copiedMemo = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMemo).toContain('일정: 2026-07-24');
  await acknowledgeMyFlowTransfer(transferReceipt);
  transferReceipt = await confirmMyFlowTransfer(
    exportTools,
    exportTools.getByTestId('my-flow-detail-copy-checklist-text'),
  );
  const copiedChecklist = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedChecklist).toContain('2026-07-24');
  await acknowledgeMyFlowTransfer(transferReceipt);
  const moreFormats = exportTools.getByTestId('my-flow-export-more-formats');
  if (await moreFormats.isVisible().catch(() => false) && (await moreFormats.getAttribute('open')) === null) {
    await moreFormats.locator(':scope > summary').click();
  }
  transferReceipt = await confirmMyFlowTransfer(
    exportTools,
    exportTools.getByTestId('my-flow-detail-copy-sheet-row'),
  );
  const copiedSheet = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedSheet).toContain('2026-07-24');
  await acknowledgeMyFlowTransfer(transferReceipt);
  await exportTools.getByTestId('my-flow-detail-download-ics').click();
  const downloadConfirmation = exportTools.getByTestId('my-flow-transfer-confirmation');
  await expect(downloadConfirmation).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadConfirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  transferReceipt = exportTools.getByTestId('my-flow-transfer-receipt');
  await expect(transferReceipt).toHaveAttribute('data-outcome', 'success');
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260724');
  if (evidenceDir) {
    fs.writeFileSync(`${evidenceDir}/downloads/travel-packing-personal-date.ics`, ics, 'utf8');
  }
  await acknowledgeMyFlowTransfer(transferReceipt);

  await enterMyFlowDetailEditMode(detail);
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-24');
  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const wideFlow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
  await wideFlow
    .getByTestId('my-flow-whole-flow-outline')
    .getByTestId('my-flow-execution-row-shell')
    .first()
    .getByRole('button', { name: /열기/ })
    .click();
  const wideDetail = wideFlow.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(wideDetail);
  await expect(wideDetail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-24');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/03-source-undated-date-persisted-wide.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await wideDetail.getByTestId('my-flow-detail-date-input').fill('');
  await expect(wideDetail.getByTestId('my-flow-detail-date-input')).toHaveValue('');
  await wideDetail.getByTestId('my-flow-detail-save-changes').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-24"] .fc-event')).toHaveCount(0);
  const storedDateOverrides = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
  );
  const remainingTravelOverrides = Object.entries(storedDateOverrides)
    .filter(([key]) => key.startsWith('travel-packing-list::'));
  expect(remainingTravelOverrides).toHaveLength(0);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/04-source-undated-calendar-after-remove-mobile.png`, fullPage: true });
  }
  expect(consoleErrors).toEqual([]);
});

test('direct saved Flow Map can change its anchor while preserving item overrides', async ({ page }) => {
  test.setTimeout(60_000);
  const evidenceDir = process.env.FLOWME_P23_05B_EVIDENCE_DIR;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  if (evidenceDir) {
    fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
    fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-01T09:00:00+09:00') });
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await setApprovedPublicCalendarAnchor(page, '2026-07-22');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, page.url());

  let flow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(flow.getByTestId('my-flow-direct-anchor-settings-open')).toHaveAccessibleName(
    /이사 D-30 준비.*이사일 바꾸기/,
  );
  await expect(flow.getByTestId('my-flow-personal-copy-settings-open')).toHaveCount(0);
  await expect(flow.getByTestId('personal-draft-add-entry')).toHaveCount(0);
  const firstExecutionRow = flow
    .getByTestId('my-flow-whole-flow-outline')
    .getByTestId('my-flow-execution-row-shell')
    .filter({ hasText: '이사 방식 정하기' })
    .first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  let detail = getOpenMyFlowItemDetail(page);
  const itemEditor = await openSavedPersonalItemEditor(page, detail);
  await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-07-07');
  await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill('오전 중 후보 2곳만 확인');
  await saveSavedPersonalItemEditor(page, itemEditor);

  await flow.getByTestId('my-flow-direct-anchor-settings-open').click();
  const anchorSettings = page.getByTestId('saved-flow-editor-plan');
  await expect(anchorSettings).toHaveAttribute('data-editor-context', 'saved-overlay');
  await expect(anchorSettings.getByTestId('saved-flow-editor-anchor-input')).toHaveValue('2026-07-22');
  await anchorSettings.getByTestId('saved-flow-editor-anchor-input').fill('2026-08-05');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/01-direct-anchor-edit-mobile.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await anchorSettings.getByTestId('saved-flow-editor-save').click();
  await expect(anchorSettings).toHaveCount(0);

  const savedState = await page.evaluate((flowSlug) => ({
    savedRecord: JSON.parse(window.localStorage.getItem(`flow:saved:${flowSlug}`) || 'null'),
    storedAnchor: JSON.parse(window.localStorage.getItem(`flow:${flowSlug}:anchorDate`) || 'null'),
    dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
  }), personalCopySlug);
  expect(savedState.savedRecord.anchor).toBe('2026-08-05');
  expect(savedState.storedAnchor.anchor).toBe('2026-08-05');
  expect(Object.keys(savedState.dateOverrides)).toHaveLength(0);
  expect(Object.values(savedState.itemDrafts).some(
    (draft) => (
      (draft as { date?: string }).date === '2026-07-07'
      && (draft as { memo?: string }).memo === '오전 중 후보 2곳만 확인'
    ),
  )).toBe(true);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const originalSelectedDay = await openMyFlowCalendarSelectedDay(page, '2026-07-06');
  await expect(originalSelectedDay.getByTestId('my-flow-selected-date-group')).not.toContainText('이사 방식 정하기');
  const overriddenDateCell = page.locator('.fc-daygrid-day[data-date="2026-07-07"]');
  await expect(overriddenDateCell.locator('.fc-event')).toHaveCount(1);
  const overriddenSelectedDay = await openMyFlowCalendarSelectedDay(page, '2026-07-07');
  await expect(overriddenSelectedDay.getByTestId('my-flow-selected-date-group')).toContainText('이사 방식 정하기');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/02-direct-anchor-calendar-shift-mobile.png`, fullPage: true });
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  flow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(flow).toBeVisible();
  const overriddenFlowRow = flow
    .getByTestId('my-flow-whole-flow-outline')
    .getByTestId('my-flow-execution-row-shell')
    .filter({ hasText: '이사 방식 정하기' })
    .first();
  await overriddenFlowRow.getByRole('button', { name: /열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  await expect(detail).toContainText('오전 중 후보 2곳만 확인');
  const inspectEditor = await openSavedPersonalItemEditor(page, detail);
  await expect(inspectEditor.getByTestId('saved-flow-editor-item-date-input')).toHaveValue('2026-07-07');
  await inspectEditor.getByTestId('saved-flow-editor-item-cancel').click();
  const inspectPlanEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(inspectPlanEditor).toBeVisible();
  await inspectPlanEditor.getByTestId('saved-flow-editor-save').click();
  await expect(inspectPlanEditor).toHaveCount(0);
  flow = await openMyFlowLibraryFlow(page, personalCopySlug);
  const exportRow = (await getMyFlowVisibleExecutionRows(flow))
    .filter({ hasText: '이사 방식 정하기' })
    .first();
  await exportRow.getByRole('button', { name: /열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  const exportTools = await openMyFlowDetailTools(detail);
  await exportTools.getByTestId('my-flow-detail-download-ics').click();
  const downloadConfirmation = exportTools.getByTestId('my-flow-transfer-confirmation');
  await expect(downloadConfirmation).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadConfirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  await expect(exportTools.getByTestId('my-flow-transfer-receipt')).toHaveAttribute('data-outcome', 'success');
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  const unfoldedIcs = ics.replace(/\r?\n[ \t]/g, '');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260707');
  expect(unfoldedIcs).toContain('오전 중 후보 2곳만 확인');
  if (evidenceDir) fs.writeFileSync(`${evidenceDir}/downloads/direct-anchor-preserved-item.ics`, ics, 'utf8');

  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const wideFlow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await expect(wideFlow.getByTestId('my-flow-direct-anchor-settings-open')).toBeVisible();
  await wideFlow.getByTestId('my-flow-direct-anchor-settings-open').click();
  await expect(page.getByTestId('saved-flow-editor-plan').getByTestId('saved-flow-editor-anchor-input'))
    .toHaveValue('2026-08-05');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/03-direct-anchor-entry-wide.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test('my flow mobile saved map edit and revisit keeps step detail lightweight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T09:00:00+09:00') });
  await page.goto('/f/moving-d30-basic');

  await setApprovedPublicCalendarAnchor(page, '2026-07-22');
  const personalCopySlug = await savePublicFlowToSelectedPlan(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-22"]').getByTestId('my-flow-calendar-date-button').click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  const selectedDateGroup = selectedDay.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toHaveAttribute('data-flow-slug', personalCopySlug);
  await expect(selectedDateGroup.getByTestId('my-flow-item-detail')).toHaveCount(0);
  await selectedDateGroup.getByRole('button', { name: /계획에서 열기/ }).first().click();
  await expect(page).toHaveURL(/\/my\?/);
  const flow = await openMyFlowLibraryFlow(page, personalCopySlug);
  await flow
    .getByTestId('my-flow-whole-flow-outline')
    .getByTestId('my-flow-execution-row-shell')
    .first()
    .getByRole('button', { name: /열기/ })
    .click();
  const detail = getOpenMyFlowItemDetail(page);
  await expect(detail).toBeVisible();

  const itemEditor = await openSavedPersonalItemEditor(page, detail);
  await expect(itemEditor.getByTestId('saved-flow-editor-item-title-input')).toBeVisible();
  await expect(itemEditor.getByTestId('saved-flow-editor-item-date-input')).toBeVisible();
  await expect(itemEditor.getByTestId('saved-flow-editor-item-detail-input')).toBeVisible();
  await expect(itemEditor.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
  await itemEditor.getByTestId('saved-flow-editor-item-date-input').fill('2026-06-25');
  await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill('mobile revisit memo');
  await saveSavedPersonalItemEditor(page, itemEditor);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-25"] .fc-event')).toHaveCount(1);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test('source-backed baby health creator page keeps official source review separate from execution', async ({ page }) => {
  await page.goto('/flow-maps/baby-health-schedule/creator');

  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toBeVisible();
  await expect(creatorMap.getByRole('heading', { name: '영유아 검진·접종 일정 지도' })).toBeVisible();
  await expect(creatorMap).toContainText('원문 행');
  await expect(creatorMap).toContainText('준비');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('공식');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('건강 민감');
  await expect(creatorMap.getByTestId('flow-map-source-row').first()).toContainText('문진표');
  await expect(creatorMap).toContainText('저장 후 사용자 화면');
  await expect(creatorMap.getByTestId('flow-map-source-row')).toHaveCount(18);
  await expect(creatorMap.getByRole('link', { name: '공개 화면 보기' })).toHaveAttribute('href', '/flow-maps/baby-health-schedule');
  await expect(creatorMap.getByRole('link', { name: '저장 후 화면 보기' })).toHaveAttribute('href', '/my?demo=source-backed&savedMap=baby-health-schedule');
  await expect(creatorMap).not.toContainText('오늘 실행');
  await expect(creatorMap).not.toContainText('완료 체크');
});

test('non-catalog source-backed routes follow the direct lookup quality gate', async ({ page }) => {
  const cases = [
    { mapId: 'postal-address-transfer', expectedStatus: 200 },
    { mapId: 'smishing-response', expectedStatus: 404 },
    { mapId: 'year-end-tax-submit', expectedStatus: 200 },
    { mapId: 'aircon-filter-cleaning', expectedStatus: 200 },
    { mapId: 'picnic-food-safety', expectedStatus: 404 },
  ];

  for (const { mapId, expectedStatus } of cases) {
    const response = await page.goto(`/flow-maps/${mapId}`);
    expect(response?.status()).toBe(expectedStatus);
    if (expectedStatus === 404) {
      await expect(page.getByTestId('flow-map-public')).toHaveCount(0);
      continue;
    }

    await expect(page.getByTestId('flow-map-public')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  }
});

test('current source-backed routes keep source link checklist and memo in my flow', async ({ page }) => {
  const cases = [
    { mapId: 'middle-school-math-1', slug: 'source-backed-middle-school-math-1' },
  ];
  await installLegacySavedPlanLibraryNavigation(page);

  for (const flowCase of cases) {
    await gotoLegacySavedPlanLibraryRoute(page, '/');
    await page.evaluate(() => window.localStorage.clear());
    await gotoLegacySavedPlanLibraryRoute(page, `/flow-maps/${flowCase.mapId}`);

    const publicMap = page.getByTestId('flow-map-public');
    await expect(publicMap).toBeVisible();
    if (flowCase.anchor) {
      await publicMap.getByTestId('flow-map-anchor-input').fill(flowCase.anchor);
    }

    await publicMap.getByTestId('flow-map-save-all').click();
    await expect.poll(() => new URL(page.url()).searchParams.get('savedMap')).toBe(flowCase.mapId);
    await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();

    const card = await openMyFlowLibraryFlow(page, flowCase.slug);
    await expect(card).toBeVisible();
    const targetRow = card.getByTestId('my-flow-execution-row-shell').first();
    const targetItem = targetRow.locator('article[data-item-id]').first();
    const targetItemId = await targetItem.getAttribute('data-item-id');
    if (!targetItemId) throw new Error('Expected the source-backed row to expose a stable item ID.');
    await targetItem.getByRole('button', { name: /열기/ }).click();

    const detail = card.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
    await expect(detail).toBeVisible();
    const detailTools = await openMyFlowDetailTools(detail);
    await expect(detailTools.getByTestId('my-flow-detail-source-link')).toHaveAttribute('href', /^https:\/\//);

    const itemChecklist = detail.getByTestId('my-flow-item-checklist');
    await expect(itemChecklist).toBeVisible();
    const firstItemCheckbox = itemChecklist.locator('input[type="checkbox"]').first();
    await firstItemCheckbox.click();
    await expect(firstItemCheckbox).toBeChecked();
    await expect.poll(() => page.evaluate(() => {
      const checks = JSON.parse(
        localStorage.getItem('flow:my-flow:step-item-checks') || '{}',
      ) as Record<string, Record<string, boolean>>;
      return Object.values(checks).some((row) => Object.values(row).some(Boolean));
    })).toBe(true);

    const memo = `${flowCase.mapId} rehearsal memo`;
    await enterMyFlowDetailEditMode(detail);
    const titleInput = detail.getByTestId('my-flow-detail-title-input');
    const originalTitle = await titleInput.inputValue();
    const memoInput = detail.getByTestId('my-flow-detail-memo');
    await memoInput.fill(memo);
    await expect(memoInput).toHaveValue(memo);
    await expect(titleInput).toHaveValue(originalTitle);
    await detail.getByTestId('my-flow-detail-save-changes').click();

    const storedAfterEdit = await page.evaluate(() => ({
      stepItemChecks: JSON.parse(window.localStorage.getItem('flow:my-flow:step-item-checks') || '{}'),
      itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    }));
    expect(JSON.stringify(storedAfterEdit.stepItemChecks)).toContain('true');
    expect(JSON.stringify(storedAfterEdit.itemDrafts)).toContain(memo);

    await gotoLegacySavedPlanLibraryRoute(page, '/my');
    const storedAfterReload = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    );
    expect(JSON.stringify(storedAfterReload)).toContain(memo);
    await openCurrentMyFlowLibrary(page);
    const restoredCard = await openMyFlowLibraryFlow(page, flowCase.slug);
    await expect(restoredCard).toBeVisible();
    await restoredCard
      .locator(`article[data-item-id="${targetItemId}"]`)
      .first()
      .getByRole('button', { name: /열기/ })
      .click();
    const restoredDetail = restoredCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
    await expect(restoredDetail.getByTestId('my-flow-item-checklist').locator('input[type="checkbox"]').first()).toBeChecked();
    await enterMyFlowDetailEditMode(restoredDetail);
    await expect(restoredDetail.getByTestId('my-flow-detail-memo')).toHaveValue(memo);
  }
});

test('my flow ux20 demo keeps large flow inventories grouped without a dense rail', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/my?demo=ux20');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX20');
  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-list')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-priority-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-inventory-toggle')).toHaveCount(0);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(20);
  await library.getByTestId('my-flow-library-row').first().click();
  await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card')).toHaveCount(1);

  await library.getByTestId('my-flow-library-rail-filter').selectOption('open');
  await expect(page.getByTestId('my-flow-inventory-toggle')).toHaveCount(0);
  const openRowCount = await library.getByTestId('my-flow-library-row').count();
  expect(openRowCount).toBeGreaterThan(0);
  expect(openRowCount).toBeLessThan(20);

  await library.getByTestId('my-flow-library-rail-filter').selectOption('all');
  await expect(library.getByTestId('my-flow-library-row')).toHaveCount(20);
  await library.getByTestId('my-flow-library-rail-search').fill('이사');
  const searchedRowCount = await library.getByTestId('my-flow-library-row').count();
  expect(searchedRowCount).toBeGreaterThan(0);
  expect(searchedRowCount).toBeLessThanOrEqual(openRowCount);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')));
  expect(savedKeys).toHaveLength(0);
});

test('my flow inventory archives and restores a flow without deleting its saved data', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux20');

  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  const firstRow = library.getByTestId('my-flow-library-row').first();
  await firstRow.click();
  const firstCard = library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card');
  const firstTitle = await firstCard.locator('h3').innerText();
  await firstCard.getByTestId('my-flow-management-menu-trigger').click();
  await firstCard.getByTestId('my-flow-archive-toggle').click();
  await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
  await expect(library.getByTestId('my-flow-library-row').filter({ hasText: firstTitle })).toHaveCount(0);

  await library.getByTestId('my-flow-library-rail-filter').selectOption('archived');
  const archivedRow = library.getByTestId('my-flow-library-archived-row');
  await expect(archivedRow).toHaveCount(1);
  await expect(archivedRow).toContainText(firstTitle);
  await archivedRow.getByTestId('my-flow-archived-direct-restore').click();
  await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
  await library.getByTestId('my-flow-library-rail-filter').selectOption('all');
  await expect(library.getByTestId('my-flow-library-row').filter({ hasText: firstTitle })).toHaveCount(1);
  const restoredRowCount = await library.getByTestId('my-flow-library-row').count();
  await library.getByTestId('my-flow-library-rail-search').fill(firstTitle);
  const searchedRowCount = await library.getByTestId('my-flow-library-row').count();
  expect(searchedRowCount).toBeGreaterThan(0);
  expect(searchedRowCount).toBeLessThan(restoredRowCount);
});

test('my flow ux12 Calendar keeps dense routine days inside the execution lens', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay.locator('article').first()).toBeVisible();
  await expect(selectedDay.getByRole('button', { name: /계획에서 열기/ }).first()).toBeVisible();
  await expect(selectedDay.getByTestId('my-flow-item-detail')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
});
test('my flow ux12 keeps single-flow detail lightweight inside the Flow view', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');

  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
  const usedCarOverviewCard = await openMyFlowLibraryFlow(page, 'used-car-buying-check');
  await expect(usedCarOverviewCard).toHaveAttribute('data-flow-slug', 'used-car-buying-check');
  await expect(usedCarOverviewCard).toBeVisible();
  await expandMyFlowWholePlan(usedCarOverviewCard);
  const usedCarTargetRow = (await getMyFlowVisibleExecutionRows(usedCarOverviewCard))
    .filter({ hasText: '원하는 차종의 연식·주행거리별 시세 확인하기' })
    .first();
  await usedCarTargetRow.getByRole('button', { name: /열기/ }).click();
  const flowDetail = usedCarOverviewCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
  await expect(flowDetail).toBeVisible();
  await expect(flowDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(flowDetail.getByTestId('my-flow-log-fields')).toHaveCount(0);
  await expect(usedCarTargetRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(flowDetail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(1);
  await enterMyFlowDetailEditMode(flowDetail);
  await expect(flowDetail.getByTestId('my-flow-detail-memo')).toBeVisible();
  await expect(flowDetail.locator('[data-testid^="my-flow-proof"]')).toHaveCount(0);

  await flowDetail.getByTestId('my-flow-detail-memo').fill('손전등 준비, 체크 메모 열어둠');
  await expect(flowDetail.getByRole('button', { name: '변경 저장' })).toBeVisible();
  await flowDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(flowDetail).toHaveCount(0);
  await usedCarTargetRow.getByRole('button', { name: /열기/ }).click();
  const savedFlowDetail = usedCarOverviewCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(savedFlowDetail);
  await expect(savedFlowDetail.getByTestId('my-flow-detail-memo')).toHaveValue('손전등 준비, 체크 메모 열어둠');
});

test('my flow ux12 mobile routine rail keeps overflow horizontal without overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  const routineRail = routineCell.getByTestId('my-flow-routine-rail');
  const routineIcons = routineCell.getByTestId('my-flow-routine-icon');
  const routineOverflow = routineCell.getByTestId('my-flow-routine-overflow');
  await expect(routineRail).toBeVisible();
  await expect(routineIcons).toHaveCount(1);
  await expect(routineIcons.nth(0)).toBeVisible();
  await expect(routineOverflow).toContainText('+3');

  const railBox = await routineRail.boundingBox();
  const firstIconBox = await routineIcons.nth(0).boundingBox();
  const overflowBox = await routineOverflow.boundingBox();
  const routineRailEventVisualStyle = await routineCell.locator('.my-flow-routine-rail-event').first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
      borderTopWidth: style.borderTopWidth,
    };
  });
  expect(routineRailEventVisualStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(routineRailEventVisualStyle.borderTopColor).toBe('rgba(0, 0, 0, 0)');
  expect(firstIconBox).not.toBeNull();
  expect(overflowBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(firstIconBox?.width ?? 0).toBeGreaterThanOrEqual(28);
  expect(firstIconBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  const firstIconVisualStyle = await routineIcons.nth(0).evaluate((node) => {
    const style = window.getComputedStyle(node);
    const hasVisibleShadow = /0px [1-9]\d*px [1-9]\d*px/.test(style.boxShadow);
    return {
      backgroundColor: style.backgroundColor,
      hasVisibleShadow,
    };
  });
  expect(firstIconVisualStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(firstIconVisualStyle.hasVisibleShadow).toBe(false);
  expect((firstIconBox?.x ?? 0) + (firstIconBox?.width ?? 0)).toBeLessThanOrEqual((overflowBox?.x ?? 0) + 1);
  expect((overflowBox?.x ?? 0) + (overflowBox?.width ?? 0)).toBeLessThanOrEqual((railBox?.x ?? 0) + (railBox?.width ?? 0) + 1);
});

test('my flow ux12 Calendar routine icons select one day without opening an editor', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await routineIcon.click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 3일');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
});
test('my flow ux12 Calendar delegates routine adjustment to the focused Flow', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.getByTestId('my-flow-item-detail')).toHaveCount(0);
  const openFlow = selectedDay.getByRole('button', { name: /계획에서 열기/ }).first();
  await openFlow.click();
  await expect(page).toHaveURL(/\/my\?/);
  await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
});
test('my flow ux12 Calendar does not expose drag scheduling for a routine icon', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await expect(routineIcon).not.toHaveAttribute('draggable', 'true');
  await expect(page.getByTestId('my-flow-calendar-date-move-panel')).toHaveCount(0);
});
test('my flow ux12 Calendar keeps overflow rows read-only and delegates edits', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('article').first()).toBeVisible();
  await expect(selectedDay.getByRole('button', { name: /계획에서 열기/ }).first()).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-date-move-panel')).toHaveCount(0);
});
test('my flow ux12 calendar routine rows show the current occurrence state without ambiguous flow progress', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await expect(routineIcon).toBeVisible();
  await expect(routineIcon).not.toHaveAttribute('draggable', 'true');
  await expect(page.getByTestId('my-flow-calendar-date-move-panel')).toHaveCount(0);

  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  const todayRoutineRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').first();
  await expect(todayRoutineRow).toBeVisible();
  await expect(todayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 대기');
  await expect(todayRoutineRow).not.toContainText(/반복 항목 \d+\/\d+/);
  await expect(todayRoutineRow.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(
    page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: /계획에서 열기/ }).first(),
  ).toBeVisible();
});

test('my flow mobile keeps one saved Flow in one library and focused workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  const anchor = formatLocalDate(addDays(new Date(), 7));
  await page.addInitScript((savedAnchor) => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-28T03:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: savedAnchor,
    }));
    window.localStorage.setItem(
      'flow:moving-d30-basic:anchorDate',
      JSON.stringify({ mode: 'custom', anchor: savedAnchor }),
    );
  }, anchor);

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);

  await expect(page.locator('main')).toHaveAttribute('data-p35-my-flow-marker', 'P35-MY-LIBRARY-ONLY');
  await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-completed')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '저장한 계획' })).toBeVisible();
  await expect(page.getByTestId('my-flow-saved-count')).toHaveText('1개');
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toContainText(/전체 0\/24 완료/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).not.toContainText('0%');
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-archive-toggle')).toHaveCount(0);

  const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  await expect(workspace).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
  await expect(workspace.getByTestId('my-flow-workspace-execute')).toBeVisible();
  const temporalNextGroup = workspace.getByTestId('my-flow-temporal-next-group');
  await expect(temporalNextGroup).toHaveAttribute(
    'data-p35-marker',
    'P35-R0-NEXT-DATE-GROUP',
  );
  await expect(temporalNextGroup.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
  const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
  await expect(planToggle).toBeVisible();
  await planToggle.click();
  await expect(workspace.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
});

test('my flow mobile item opens editable detail from the focused Flow workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');

  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  const firstRunnableRow = workspace
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-execution-row-shell')
    .first();
  await expect(firstRunnableRow).toBeVisible();
  const firstRunnableOpen = firstRunnableRow.getByRole('button', { name: /열기/ });
  const firstRunnableOpenLabel = await firstRunnableOpen.getAttribute('aria-label');
  expect(firstRunnableOpenLabel).toBeTruthy();
  const openSameRunnableItem = async () => {
    const openButton = workspace
      .locator(`button[aria-label=${JSON.stringify(firstRunnableOpenLabel)}]:visible`)
      .first();
    await expect(openButton).toBeVisible();
    await openButton.click();
  };
  await openSameRunnableItem();
  let mobileDetail = getOpenMyFlowItemDetail(page);
  await expect(mobileDetail).toBeVisible();
  await expect(mobileDetail).not.toContainText('Step 실행');
  await expect(mobileDetail).not.toContainText('Item');
  await expect(mobileDetail).not.toContainText('할 일 상태');
  await expect(mobileDetail).not.toContainText('실행할 일');
  await expect(mobileDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(mobileDetail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(1);
  await expect(mobileDetail.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).toHaveCount(0);
  await expect(mobileDetail.getByRole('button', { name: '수정', exact: true })).toHaveCount(0);
  await enterMyFlowDetailEditMode(mobileDetail);
  const originalMemo = await mobileDetail.getByTestId('my-flow-detail-memo').inputValue();
  await mobileDetail.getByTestId('my-flow-detail-memo').fill('모바일에서 취소할 실행 메모');
  await expect(mobileDetail.getByRole('button', { name: /수정 취소/ })).toBeVisible();
  await mobileDetail.getByRole('button', { name: /수정 취소/ }).click();
  await expect(mobileDetail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
  await mobileDetail.getByTestId('my-flow-editor-confirm-discard').click();
  await expect(mobileDetail).toHaveCount(0);

  await openSameRunnableItem();
  mobileDetail = getOpenMyFlowItemDetail(page);
  await enterMyFlowDetailEditMode(mobileDetail);
  await expect(mobileDetail.getByTestId('my-flow-detail-memo')).toHaveValue(originalMemo);
  await mobileDetail.getByTestId('my-flow-detail-memo').fill('모바일에서 수정한 실행 메모');
  await mobileDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(mobileDetail).toHaveCount(0);
  await openSameRunnableItem();
  mobileDetail = getOpenMyFlowItemDetail(page);
  await enterMyFlowDetailEditMode(mobileDetail);
  await expect(mobileDetail.getByTestId('my-flow-detail-memo')).toHaveValue('모바일에서 수정한 실행 메모');
});

test('my flow mobile calendar keeps date selection separate and gives events usable tap targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux12');

  const calendarCardBox = await page.getByTestId('my-flow-calendar-card').boundingBox();
  expect(calendarCardBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((calendarCardBox?.x ?? 9999) + (calendarCardBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(calendarCardBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  await expect(page.getByTestId('my-flow-calendar-day-sheet')).toHaveCount(0);
  const calendarTop = await page.locator('.fc').boundingBox();
  expect(calendarTop?.y ?? 9999).toBeLessThan(844);
  expect(calendarTop?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((calendarTop?.x ?? 9999) + (calendarTop?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(calendarTop?.width ?? 0).toBeGreaterThanOrEqual(330);
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  const mobileDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-29"]');
  await mobileDateCell.getByTestId('my-flow-calendar-date-button').click();
  await expect(mobileDateCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(mobileDateCell.getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'true');
  const selectedDayAfterDateTap = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDayAfterDateTap.getByTestId('my-flow-item-detail')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-day-sheet-close').click();

  const mobileEvent = page.locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"][aria-label*="일정 보기"]');
  const eventBox = await mobileEvent.boundingBox();
  expect(eventBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  await mobileEvent.click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay).toContainText('필기와 실기 시험 범위 나누기');
  await expect(selectedDay.getByTestId('my-flow-item-detail')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
  await expect(selectedDay.getByRole('button', { name: /계획에서 열기/ }).first()).toBeVisible();
  await page.getByTestId('my-flow-calendar-day-sheet-close').click();

  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const routineOverflow = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]');
  const firstRoutineBox = await routineIcon.boundingBox();
  const overflowBox = await routineOverflow.boundingBox();
  expect(firstRoutineBox?.width ?? 0).toBeGreaterThanOrEqual(28);
  expect(firstRoutineBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  expect(overflowBox?.width ?? 0).toBeGreaterThanOrEqual(11);
  expect(overflowBox?.height ?? 0).toBeGreaterThanOrEqual(28);

  const sameDayRoutineBoxes = await page
    .locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"], .fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).map((rect) => ({ x: rect.x, y: rect.y })));
  expect(sameDayRoutineBoxes.length).toBeGreaterThanOrEqual(2);
  expect(Math.max(...sameDayRoutineBoxes.map((box) => box.y)) - Math.min(...sameDayRoutineBoxes.map((box) => box.y))).toBeLessThan(3);

  await routineOverflow.click();
  const routineSelectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(routineSelectedDay).toHaveAttribute('data-overflow-date', '2026-06-03');
  await expect(routineSelectedDay.getByTestId('my-flow-selected-day-overflow-note')).toContainText('+3');
  const selectedDayBox = await routineSelectedDay.boundingBox();
  expect(selectedDayBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((selectedDayBox?.x ?? 9999) + (selectedDayBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(selectedDayBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  const selectedDayFirstRow = routineSelectedDay.locator('article').first();
  const selectedDayFirstRowBox = await selectedDayFirstRow.boundingBox();
  expect(selectedDayFirstRowBox?.height ?? 9999).toBeLessThanOrEqual(92);
  await expect(selectedDayFirstRow.getByTestId('my-flow-row-date-meta')).toBeHidden();
  await expect(routineSelectedDay.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-day-sheet-close').click();

  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const mobileScheduleContent = page.locator('.fc-daygrid-day[data-date="2026-05-28"] [data-testid="my-flow-calendar-schedule-content"]').first();
  const mobileScheduleRail = mobileScheduleContent.getByTestId('my-flow-calendar-schedule-rail');
  await expect(mobileScheduleContent).toBeVisible();
  await expect(mobileScheduleRail).toBeVisible();
  const railWidth = await mobileScheduleRail.evaluate((node) => node.getBoundingClientRect().width);
  expect(railWidth).toBeGreaterThanOrEqual(2);
});

test('my flow and calendar details separate execution from explicit editing', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');
  await openCurrentMyFlowLibrary(page);
  const library = page.getByTestId('my-flow-library-workspace');
  await expect(library.getByTestId('my-flow-library-rail-search')).toBeVisible();

  const usedCarCard = await openMyFlowLibraryFlow(page, 'used-car-buying-check');
  await expect(usedCarCard).toHaveAttribute('data-flow-slug', 'used-car-buying-check');
  await expect(usedCarCard).toBeVisible();
  const usedCarOutline = usedCarCard.getByTestId('my-flow-whole-flow-outline');
  const usedCarFirstRow = usedCarOutline.getByTestId('my-flow-execution-row-shell').first();
  await usedCarFirstRow.getByRole('button', { name: /열기/ }).click();
  let detail = usedCarCard.getByTestId('my-flow-item-detail');
  await expect(detail).toHaveAttribute('data-detail-mode', 'execute');
  await expect(detail).toHaveAttribute('data-default-primary-action-count', '1');
  await expect(detail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(usedCarFirstRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
  await expect(detail.getByRole('button', { name: '닫기', exact: true })).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-edit-toggle')).not.toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-source-link')).not.toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-copy-portable-text')).not.toBeVisible();
  await expectNoHorizontalOverflow(page);

  await enterMyFlowDetailEditMode(detail);
  await expect(detail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: /수정 취소/ })).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-portable-export')).not.toBeVisible();
  await expect(detail.getByRole('button', { name: '변경 저장' })).toBeDisabled();
  await detail.getByTestId('my-flow-detail-memo').fill('취소할 편집 메모');
  await expect(detail.getByRole('button', { name: '변경 저장' })).toBeEnabled();
  await detail.getByRole('button', { name: /수정 취소/ }).click();
  await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
  await detail.getByTestId('my-flow-editor-confirm-discard').click();
  await expect(detail).toHaveCount(0);

  await usedCarFirstRow.locator('button').first().click();
  detail = usedCarCard.getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(detail);
  await detail.getByTestId('my-flow-detail-memo').fill('저장한 편집 메모');
  await detail.getByRole('button', { name: '변경 저장' }).click();
  await expect(detail).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const event = page.locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"]').first();
  await event.click();
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
  const openFlow = selectedDay.getByRole('button', { name: /계획에서 열기/ }).first();
  await expect(openFlow).toBeVisible();
  await openFlow.click();
  await expect(page).toHaveURL(/\/my\?/);
  await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('my flow mobile keeps checklist and routine work inside Flow and Calendar surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');

  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-inventory-sheet')).toHaveCount(0);
  const mobileHub = page.getByTestId('my-flow-mobile-flow-hub');
  await expect(mobileHub).toHaveAttribute('data-library-mode', 'searchable');
  await expect(page.getByTestId('my-flow-library-controls')).toBeVisible();
  const checklistRow = mobileHub.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]',
  );
  const routineRow = mobileHub.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="washer-tub-clean-monthly"]',
  );
  await expect(checklistRow).toBeVisible();
  await expect(routineRow).toBeVisible();
  const checklistFlow = await openMyFlowLibraryFlow(page, 'travel-packing-list');
  await expect(checklistFlow).toBeVisible();
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');
  await openCurrentMyFlowLibrary(page);
  const routineFlow = await openMyFlowLibraryFlow(page, 'washer-tub-clean-monthly');
  await expect(routineFlow).toBeVisible();
  await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-scope-filter')).toHaveAttribute('data-scope-presentation', 'picker');
  const scopeTrigger = page.getByTestId('calendar-flow-scope-picker-trigger');
  await scopeTrigger.click();
  const scopePicker = page.getByTestId('calendar-flow-scope-picker');
  await scopePicker.locator('[data-testid="calendar-flow-scope-picker-option"][data-flow-slug="washer-tub-clean-monthly"]').getByRole('checkbox').check();
  await scopePicker.getByTestId('calendar-flow-scope-picker-apply').click();
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
});

test('my flow mobile Flow list exposes searchable inventory before opening a plan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');

  await openCurrentMyFlowLibrary(page);
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByTestId('my-flow-overview-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-board')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-priority-section')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toHaveAttribute(
    'data-p35-marker',
    'P35-MY-LIBRARY-ONLY',
  );
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toHaveAttribute(
    'data-library-mode',
    'searchable',
  );
  await expect(page.getByTestId('my-flow-library-controls')).toBeVisible();
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(16);
  const firstStructureRow = page
    .getByTestId('my-flow-mobile-structure-row')
    .filter({ hasNotText: '모든 할 일 완료' })
    .first();
  await expect(firstStructureRow).toContainText(/전체 \d+\/\d+ 완료/);
  await expect(firstStructureRow).not.toContainText(/\d+%/);
  const firstSlug = await firstStructureRow.getAttribute('data-flow-slug');
  expect(firstSlug).toBeTruthy();
  const selectedFlow = await openMyFlowLibraryFlow(page, firstSlug!);
  await expect(selectedFlow).toHaveCount(1);
  const selectedPlanToggle = selectedFlow.getByTestId('my-flow-workspace-plan-toggle');
  if (
    await selectedPlanToggle.isVisible().catch(() => false) &&
    (await selectedPlanToggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await selectedPlanToggle.click();
  }
  expect(await selectedFlow.getByTestId('my-flow-execution-row-shell').count()).toBeGreaterThan(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
  await selectedFlow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  const selectedFlowDetail = getOpenMyFlowItemDetail(page);
  await expect(selectedFlowDetail).toBeVisible();
  await expect(selectedFlowDetail).toHaveAttribute('data-detail-mode', 'execute');
  await expect(selectedFlowDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveAttribute(
    'data-p31-marker',
    'P31-03-MY-FLOW-ITEM-SHEET',
  );
  await closeOpenMyFlowItemDetail(page);
  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');
  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-overdue')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-next')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '완료 체크' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-list-filter-all')).toBeVisible();
  await expect(page.getByTestId('my-flow-list-filter-open')).toBeVisible();
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(16);
});

test('my flow mobile ux20 limits large inventory before showing all flows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux20');

  await openCurrentMyFlowLibrary(page);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(8);
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText('12개 더 보기');

  await page.getByTestId('my-flow-mobile-inventory-open').click();
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(20);
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toHaveCount(0);

  await expect(page.getByTestId('my-flow-list-filter-routine')).toHaveCount(0);
  await page.getByTestId('my-flow-list-filter-open').click();
  await expect(page.getByTestId('my-flow-list-filter-open')).toHaveAttribute('aria-pressed', 'true');
  const openRows = await page.getByTestId('my-flow-mobile-structure-row').count();
  expect(openRows).toBeGreaterThan(0);
  expect(openRows).toBeLessThan(20);
});


test('source-fit decisions keep archived and review-gated flows out of public routes', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/study-exam-d30-plan');
  await expectPublicFlowRouteClosed(page, '/f/running-5k-4week');

  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByTestId('source-fit-status')).toHaveCount(0);
  const currentFlowRobots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(currentFlowRobots ?? '').not.toMatch(/noindex/i);

  for (const slug of ['new-car-delivery-check', 'fridge-cleanout-weekly-plan', 'washer-tub-clean-monthly']) {
    await page.goto(`/f/${slug}`);
    await expect(page.getByTestId('source-fit-status')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
  }
});




test('moving mobile keeps save sticky and public preview actions inside the personal-plan boundary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-01T09:00:00+09:00') });
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const stickySave = page.getByTestId('public-flow-mobile-save-cta');
  await expect(stickySave.getByRole('button', { name: '내 계획으로 저장' })).toBeVisible();
  await expect(stickySave.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
  await expect(stickySave.getByRole('button', { name: '엑셀 받기' })).toHaveCount(0);

  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
  await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);
  await expect(page.locator('[data-action-role="edit-public-draft"]:visible')).toHaveCount(1);
});



test('public source-backed Flow detail hides internal operation labels', async ({ page }) => {
  await page.goto('/f/curated-ajd-moving-d30');

  await expect(page.getByRole('heading', { name: '이사 D-30 준비' })).toBeVisible();
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByText('주의 필요')).toHaveCount(0);
});

test('new flow creation keeps advanced settings secondary', async ({ page }) => {
  await page.goto('/flows/new');

  await expect(page.getByText('고급 설정')).toBeVisible();
  await expect(page.getByText('목표일 기준으로 준비하기')).toBeVisible();
  await expect(page.getByText('매일·매주 반복하기')).toBeVisible();
  await expect(page.getByText('식단·레시피로 구성하기')).toBeVisible();
});

test('personal baby food schedule blocks new public execution while preserving an existing review-only save', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_BABY_FOOD_CURRENTNESS_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/f/baby-food-menu-recipe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '이 계획은 지금 열 수 없어요' })).toBeVisible();
  await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-public-execution-held-mobile.png`, fullPage: true });

  await page.evaluate(() => {
    localStorage.setItem('flow:saved:baby-food-menu-recipe', JSON.stringify({
      slug: 'baby-food-menu-recipe',
      savedAt: '2026-06-07T09:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-07',
    }));
  });
  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('초기 이유식 메뉴·레시피');
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('flow:saved:baby-food-menu-recipe')))).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-existing-save-review-mobile.png`, fullPage: true });

  await page.goto('/calendar');
  await expect(page.locator('body')).not.toContainText('초기 이유식 메뉴·레시피');
});
















test('public share shell keeps the Flow finding escape reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/f/vehicle-inspection-prep',
    '/f/moving-d30-basic',
    '/f/fridge-cleanout-weekly-plan',
    '/f/washer-tub-clean-monthly',
    '/f/new-car-delivery-check',
    '/f/used-car-buying-check',
  ]) {
    await page.goto(route);

    const shell = page.getByTestId('flow-public-shell');
    const browseLink = shell.getByRole('link', { name: /계획 찾기/ });
    await expect(shell).toBeVisible();
    await expect(browseLink).toBeVisible();
    await expect(browseLink).toHaveAttribute('href', '/flows');
    await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
    await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');

    const focusableEntries = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]'))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            element.getAttribute('aria-hidden') !== 'true' &&
            element.getAttribute('tabindex') !== '-1' &&
            !element.hasAttribute('disabled') &&
            element.getAttribute('aria-disabled') !== 'true' &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((element) => ({
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
          href: element instanceof HTMLAnchorElement ? element.getAttribute('href') ?? '' : '',
          testId: element.dataset.testid ?? element.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
        })),
    );
    const browseIndex = focusableEntries.findIndex((entry) => entry.href === '/flows');
    expect(browseIndex).toBeGreaterThanOrEqual(0);

    const saveButton = page.getByRole('button', { name: /내 계획에 저장|정하기/ }).first();
    if ((await saveButton.count()) > 0 && (await saveButton.isVisible())) {
      await expect(saveButton).toHaveCSS('background-color', 'rgb(27, 26, 23)');
    }
  }
});













test('content flows studio renders saved execution previews for every candidate', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/content-flows');

  await expect(page.locator('body')).not.toContainText('고충실도');
  await expect(page.getByText('실행 UI').first()).toBeVisible();

  await expect(page.locator('body')).not.toContainText('P0');
  await expect(page.locator('body')).not.toContainText('P1');
  await expect(page.locator('body')).not.toContainText('P2');
  await expect(page.getByText('우선').first()).toBeVisible();
  await expect(page.getByText('검토').first()).toBeVisible();
  await expect(page.getByLabel('원문 대응 강도')).toContainText('대응 약함');
  await expect(page.getByLabel(/Flow 적합도 \d\.\d점/).first()).toBeVisible();
  await expect(page.getByTestId('content-flow-candidate').first().getByText(/적합 \d\.\d/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '활용 가능성 평가' })).toBeVisible();
  await expect(page.getByText('원문을 본 사용자가 이 Flow를 저장하고 실제로 실행할 수 있는지 남깁니다.')).toBeVisible();
  await expect(page.getByText('최우선 판정 질문')).toBeVisible();
  await expect(page.getByText('원문을 읽고 저장한 뒤, 생성된 캘린더/체크리스트/시트/메모만 보고도 다음 행동을 할 수 있는가?')).toBeVisible();
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('원문 → 실행 산출물 대응');
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('Flow에서 확인');
  await expect(page.getByTestId('content-flow-review-source-trace')).toContainText('완료 기준:');
  await expect(page.getByText('원문 보고 바로 쓸 수 있음')).toBeVisible();
  await expect(page.getByText('원문 대비 실행이 막힘')).toBeVisible();
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('대표 검토 축');
  await expect(page.getByTestId('content-flow-coverage-group')).toHaveCount(7);
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('생활 전환');
  await expect(page.getByTestId('content-flow-coverage-groups')).toContainText('서류/행정');

  await page.getByTestId('content-flow-coverage-group').filter({ hasText: '서류/행정' }).click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-flow-id', 'freelancer-income-tax-docs');

  await page.getByRole('button', { name: /반복 방지 신규 후보/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(8);

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="balcony-fall-vegetable-calendar"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('채소별 파종·수확 후보일');
  await expect(page.getByTestId('content-flow-sheet-surface')).toContainText('첫 수확 후보');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="self-wall-paint-weekend"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('셀프 페인팅');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('D-1 가구 이동과 바닥 보양');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="freelancer-income-tax-docs"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('자료 준비만 남긴 신고 전 체크 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('세무 판단');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="anydesk-remote-setup-check"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('누가 먼저 요청한 지원인지 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('일회성 지원은 수동 승인으로 진행');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('AnyDesk 주소/비밀번호/인증값 미저장 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('작업 후 세션 종료와 자동 접속 설정 확인');

  await page.getByRole('button', { name: /최근 다양화 후보/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(5);
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="first-kimjang-weekend-checklist"]')).toContainText(
    '초보 김장 주말 체크리스트',
  );
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="passport-renewal-online-pickup"]')).toContainText(
    '여권 재발급 온라인 신청·수령 준비',
  );

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="passport-renewal-online-pickup"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('방문 수령을 나누는 공식행정 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('여권번호, 주민등록번호, 결제 정보는 Flow에 저장하지 않습니다.');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="beginner-camping-packing-sheet"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('캠핑 준비물 시트 Flow');
  await expect(page.getByTestId('content-flow-sheet-surface')).toContainText('안전·조명');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="free-appliance-pickup-reservation"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('폐가전 방문수거 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수거 가능 품목 확인');

  await page.getByRole('button', { name: /제작자 자료 확장/ }).click();
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(5);
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="piano-carol-sheet-7day-practice"]')).toContainText(
    '아이 피아노 캐롤 악보 7일 연습',
  );
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="jeonse-contract-precheck-docs"]')).toContainText(
    '전세계약 전 서류 10단계 확인',
  );

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="jeonse-contract-precheck-docs"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('계약 전 확인·보류가 함께 보이는 전세 서류 체크 Flow');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('법률 판단');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('보류 사유');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="cat-adoption-first-week-setup"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('입양 전 공간 준비부터 첫 병원 질문까지');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수의사 확인');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="piano-carol-sheet-7day-practice"]').click();
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('무료 악보 링크를 복제하지 않고 7일 연습 일정');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('악보 파일을 복제하지 않고');

  await page.getByRole('button', { name: '전체 후보' }).click();
  await page.getByLabel('원문 대응 강도').selectOption('weak');
  await expect(page.getByTestId('content-flow-candidate')).toHaveCount(2);
  await expect(page.getByTestId('content-flow-candidate').first()).toContainText('대응 약함');
  await page.getByTestId('content-flow-candidate').first().click();
  await expect(page.getByTestId('content-flow-preview-tab-save')).toContainText('보류 후보');
  await expect(page.getByTestId('content-flow-hold-review-note')).toContainText('보류 판정');
  await page.getByTestId('content-flow-preview-tab-save').click();
  await expect(page.getByTestId('content-flow-hold-candidate')).toContainText('현재 저장 후보 아님');
  await expect(page.getByTestId('content-flow-hold-candidate')).toContainText('원문 교체 또는 후보 제외가 먼저입니다');
  await page.getByLabel('원문 대응 강도').selectOption('전체');

  await page.getByLabel('원문 대응 강도').selectOption('needs_review');
  await expect.poll(async () => page.getByTestId('content-flow-candidate').count()).toBeGreaterThanOrEqual(12);
  await expect(page.getByTestId('content-flow-candidate').first()).toContainText('재검토 필요');
  await page.getByTestId('content-flow-candidate').first().click();
  await expect(page.getByTestId('content-flow-preview-tab-save')).toContainText('조건부 저장 검토');
  await expect(page.getByTestId('content-flow-conditional-review-note')).toContainText('조건부 검토');
  await page.getByTestId('content-flow-preview-tab-save').click();
  await expect(page.getByTestId('content-flow-conditional-candidate')).toContainText('조건부 저장 검토');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('조건 확인 후 저장 미리보기');
  await page.getByLabel('원문 대응 강도').selectOption('전체');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="remote-help-session-precheck"]').click();
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="remote-help-session-precheck"]')).toContainText('실행 UI');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('원격 도움 세션 권한 사전 체크');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('화면 공유만으로 충분한지 먼저 선택');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('접속값은 Flow에 저장하지 않습니다');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('세션 종료와 접근 정리');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="naver-search-advisor-site-readiness"]').click();
  await expect(page.locator('[data-testid="content-flow-candidate"][data-flow-id="naver-search-advisor-site-readiness"]')).toContainText('실행 UI');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('Naver Search Advisor 사이트 준비 체크');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('사이트 단위와 접근권한 먼저 고르기');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('검증값은 Flow에 저장하지 않습니다');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('다시 볼 날짜 정하기');

  const ids = await page
    .getByTestId('content-flow-candidate')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-flow-id')).filter(Boolean));
  expect(ids.length).toBeGreaterThanOrEqual(32);

  const counts = { calendar: 0, sheet: 0, checklist: 0, decision: 0 };
  for (const id of ids) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-flow-id', id);
    await expect(page.getByTestId('content-flow-high-fidelity')).toHaveAttribute('data-active-tab', 'execute');
    await expect(page.getByTestId('content-flow-execution-simulator')).toBeVisible();
    expect(await page.getByTestId('content-flow-detail-sheet-preview').locator('input[type="checkbox"]').count()).toBeGreaterThan(0);

    const hasSheet = (await page.getByTestId('content-flow-sheet-surface').count()) > 0;
    const hasChecklist = (await page.getByTestId('content-flow-checklist-surface').count()) > 0;
    const hasDecision = (await page.getByTestId('content-flow-decision-surface').count()) > 0;
    if (hasSheet) counts.sheet += 1;
    else if (hasChecklist) counts.checklist += 1;
    else if (hasDecision) counts.decision += 1;
    else {
      counts.calendar += 1;
      await expect(page.getByTestId('content-flow-simulated-calendar').locator('[data-selected="true"]')).toHaveCount(1);
    }
  }

  expect(counts.calendar + counts.sheet + counts.checklist + counts.decision).toBe(ids.length);
  expect(counts.calendar).toBeGreaterThan(0);
  expect(counts.sheet).toBeGreaterThan(0);
  expect(counts.checklist).toBeGreaterThan(0);
  expect(counts.decision).toBeGreaterThan(0);
});

test('content flows studio keeps the execution preview near the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/content-flows');

  await expect(page.getByRole('heading', { name: '원문을 Flow UI로 평가하기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '원문을 실제 Flow UI로 바꿔보고 평가하기' })).toHaveCount(0);

  const candidateList = page.getByTestId('content-flow-candidate-list');
  await expect(candidateList).toHaveAttribute('aria-label', 'Flow 콘텐츠 후보 선택');
  await expect(candidateList.getByTestId('content-flow-candidate').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(candidateList).toHaveClass(/snap-x/);
  await expect(candidateList.getByTestId('content-flow-candidate').first()).toHaveClass(/snap-start/);

  const tabList = page.getByTestId('content-flow-preview-tabs');
  await expect(tabList.getByRole('tab')).toHaveCount(4);
  await expect(tabList.getByRole('tab', { selected: true })).toHaveText('실행 화면');
  const tabLayout = await tabList.evaluate((element) => {
    const buttons = Array.from(element.querySelectorAll('button')).map((button) => button.getBoundingClientRect());
    return {
      firstTop: buttons[0]?.top ?? 0,
      secondTop: buttons[1]?.top ?? 0,
      thirdTop: buttons[2]?.top ?? 0,
      pageWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(Math.abs(tabLayout.firstTop - tabLayout.secondTop)).toBeLessThan(2);
  expect(tabLayout.thirdTop).toBeGreaterThan(tabLayout.firstTop + 8);
  expect(tabLayout.scrollWidth).toBeLessThanOrEqual(tabLayout.pageWidth + 1);

  const previewTop = await page.getByTestId('content-flow-high-fidelity').evaluate((element) => element.getBoundingClientRect().top);
  expect(previewTop).toBeLessThan(640);

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="anydesk-remote-setup-check"]').click();
  await page.waitForTimeout(350);
  const anydeskPreviewTop = await page.getByTestId('content-flow-high-fidelity').evaluate((element) => element.getBoundingClientRect().top);
  expect(anydeskPreviewTop).toBeLessThan(640);
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('누가 먼저 요청한 지원인지 확인');
  await expect(page.getByTestId('content-flow-high-fidelity')).toContainText('수동 승인');
});

test('content flows studio keeps source-specific execution details in representative previews', async ({ page }) => {
  await page.goto('/content-flows');

  const expectations: Record<string, string[]> = {
    'washer-tub-clean-monthly': ['문 열어 건조', '세제통', '고무패킹', '과탄산소다', '2주 간격'],
    'monstera-care-routine': ['밝은 간접광', '배수구멍', '겉흙 2~3cm', '체크 0/4', '오늘은 보류'],
    'wedding-12-month-timeline': ['D-300~D-180', '보증인원 변경 가능 기한', '계약금/위약금', '하객 명단', '식권', 'BGM', '역할 분담'],
    'water-purifier-filter-cycle': ['코크/출수구', '자가 살균', '물맛/냄새', '후카본'],
    'used-car-buying-check': ['자동차등록원부', '침수 흔적', '정비소 검수', '결함·보증·반품', '구매/보류/거절'],
    'plank-30-day-challenge': ['Day 7·19·27', 'Day 9', '호흡 3:3 패턴', 'Day 30 150초', '허리 통증'],
    'thankyou-bubu-no-jump-home-workout': ['점프 없음', '눕는 동작 없음', '원본 영상', '몸 상태 메모', '통증'],
  };

  for (const [id, terms] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const preview = page.getByTestId('content-flow-high-fidelity');
    await expect(preview).toHaveAttribute('data-flow-id', id);
    for (const term of terms) {
      await expect(preview).toContainText(term);
    }
  }
});

test('content flows wedding preview shows the full source-derived timeline without mixing future checks into the first date', async ({ page }) => {
  await page.goto('/content-flows');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="wedding-12-month-timeline"]').click();
  await page.getByTestId('content-flow-preview-tab-execute').click();

  const preview = page.getByTestId('content-flow-high-fidelity');
  await expect(preview).toHaveAttribute('data-flow-id', 'wedding-12-month-timeline');
  await expect(preview).toContainText('체크 0/5');

  const timelineList = page.getByTestId('content-flow-full-timeline-list');
  await expect(timelineList).toContainText('8단계 타임라인');
  await expect(timelineList).toContainText('웨딩홀 계약금·위약금 확인');
  await expect(timelineList).toContainText('식권·좌석·BGM 준비');
  await expect(timelineList).toContainText('본식 역할 분담 공유');

  const selectedDayPanel = page.getByTestId('content-flow-selected-day-panel');
  await expect(selectedDayPanel).toContainText('웨딩홀 후보 3곳 정리');
  await expect(selectedDayPanel).toContainText('보증인원 기준 입력');

  const detailSheet = page.getByTestId('content-flow-detail-sheet-preview');
  await expect(detailSheet).toContainText('보증인원 변경 가능 기한 확인');
  await expect(detailSheet).toContainText('계약금/위약금 규정 확인');
  await expect(detailSheet).not.toContainText('BGM 파일 확인 일정 만들기');
});

test('content flows washer preview keeps setup light and method details in memo', async ({ page }) => {
  await page.goto('/content-flows');

  await page.locator('[data-testid="content-flow-candidate"][data-flow-id="washer-tub-clean-monthly"]').click();

  const traceRows = page.getByTestId('content-flow-source-trace-row');
  await expect(traceRows.filter({ hasText: '준비물이 달라진다' })).toContainText('내 세탁기 방식과 준비물 확인');
  await expect(traceRows.filter({ hasText: '준비물이 달라진다' })).toContainText('구매 링크');

  await page.getByTestId('content-flow-preview-tab-save').click();

  const savePreview = page.getByTestId('content-flow-high-fidelity');
  await expect(savePreview).toContainText('첫 실행일');
  await expect(savePreview).toContainText('반복 주기');
  await expect(savePreview).toContainText('선택 메모');
  await expect(savePreview).not.toContainText('준비물 메모');

  await page.getByTestId('content-flow-preview-tab-execute').click();
  const executionPreview = page.getByTestId('content-flow-high-fidelity');
  await expect(executionPreview).toContainText('체크 0/6');
  await expect(executionPreview).toContainText('과탄산소다 100g');
  await expect(executionPreview).toContainText('세탁 후 문 열어 건조');
  await expect(executionPreview).toContainText('냄새가 반복되면 다음 실행부터 2주 1회로 조정');
});

test('content flows studio links only approved candidates to public service flows', async ({ page }) => {
  await page.goto('/content-flows');

  const expectations: Record<string, string> = {
    'washer-tub-clean-monthly': '/f/washer-tub-clean-monthly',
    'wedding-12-month-timeline': '/f/wedding-d180-basic',
    'used-car-buying-check': '/f/used-car-buying-check',
    'fridge-cleanout-weekly-plan': '/f/fridge-cleanout-weekly-plan',
  };

  for (const [id, href] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const link = page.getByTestId('content-flow-public-route-link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', href);
  }

  for (const id of [
    'monstera-care-routine',
    'water-purifier-filter-cycle',
    'plank-30-day-challenge',
    'thankyou-bubu-no-jump-home-workout',
    'jeonse-contract-precheck-docs',
    'remote-help-session-precheck',
    'lg-aircon-filter-biweekly',
  ]) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    await expect(page.getByTestId('content-flow-public-route-link')).toHaveCount(0);
  }
});








test('public routine hydration stays stable across opposite browser time zones', async ({ browser }) => {
  let firstManifestItemIds = '';
  for (const timezoneId of ['Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
    const context = await browser.newContext({
      timezoneId,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const hydrationErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (/hydration|418/i.test(error.message)) hydrationErrors.push(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydration|418/i.test(message.text())) hydrationErrors.push(message.text());
    });

    await page.goto('/f/washer-tub-clean-monthly');
    const capability = page.getByTestId('public-flow-capability-result');
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(capability).toHaveAttribute('data-capability-output-count', '3');
    await capability.locator(
      '[data-public-format-tab="true"][data-capability-destination="checklist"]',
    ).click();
    const preview = capability.getByTestId('flow-capability-selected-preview');
    await expect(preview).toHaveAttribute('data-capability-destination', 'checklist');
    await expect(preview).toHaveAttribute('data-capability-output-count', '3');
    const manifestHash = await preview.getAttribute('data-capability-manifest-hash') ?? '';
    expect(manifestHash).not.toBe('');
    const manifestItemIds = await preview.getAttribute('data-capability-manifest-item-ids') ?? '';
    expect(manifestItemIds).not.toBe('');
    if (firstManifestItemIds) expect(manifestItemIds).toBe(firstManifestItemIds);
    else firstManifestItemIds = manifestItemIds;
    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    await page.waitForTimeout(100);
    expect(hydrationErrors).toEqual([]);
    await context.close();
  }
});



test('plank challenge stays out of public routes until its source table is approved', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/plank-30-day-challenge');
});



test('completed My Flow separates private reflection from an unsent source correction draft', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  const movingBundle = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  expect(movingBundle).toBeTruthy();
  const completedChecks = Object.fromEntries((movingBundle?.items ?? []).map((item) => [item.id, true]));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ checks }) => {
    if (window.sessionStorage.getItem('completion-feedback-seeded') === 'true') return;
    window.sessionStorage.setItem('completion-feedback-seeded', 'true');
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-07-11T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-08-10',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-08-10' }));
    window.localStorage.setItem('flow_builder_mvp_checks_moving-d30-basic', JSON.stringify(checks));
  }, { checks: completedChecks });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const mobileFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  const feedback = mobileFlow.getByTestId('my-flow-completion-feedback');
  await expect(feedback).toBeVisible();
  await expect(mobileFlow.getByTestId('my-flow-optional-history')).toContainText(
    `${movingBundle?.items.length}/${movingBundle?.items.length} 완료`,
  );
  await expect(feedback).toContainText('내 회고는 나만 보고, 원본에서 고칠 점은 전송 전 메모로 따로 저장합니다.');
  await expect(feedback).not.toContainText(/공개 리뷰|별점|제작자에게 전송됨/);
  await expectNoInternalUserSurfaceCopy(feedback);
  await expectNoUserFacingRawIsoDate(feedback);
  await expectNoUserFacingDisplayLeakage(feedback);

  await feedback.getByTestId('my-flow-reflection-open').click();
  await expect(feedback.getByTestId('my-flow-reflection-editor')).toBeVisible();
  await feedback.getByRole('button', { name: '도움됐어요' }).click();
  await feedback.getByTestId('my-flow-reflection-note').fill('다음 이사에도 같은 순서로 확인하고 싶어요.');
  await feedback.getByTestId('my-flow-reflection-save').click();
  await expect(feedback.getByTestId('my-flow-completion-feedback-status')).toHaveText('내 회고를 이 기기에 저장했어요.');

  await feedback.getByTestId('my-flow-source-correction-open').click();
  const correctionEditor = feedback.getByTestId('my-flow-source-correction-editor');
  await expect(correctionEditor).toContainText('아직 누구에게도 전송되지 않아요.');
  await correctionEditor.getByTestId('my-flow-source-correction-scope').selectOption({ index: 1 });
  await correctionEditor.getByTestId('my-flow-source-correction-note').fill('이 단계는 관리사무소 운영 시간을 먼저 확인해야 해요.');
  await correctionEditor.getByTestId('my-flow-source-correction-save').click();
  await expect(feedback.getByTestId('my-flow-completion-feedback-status')).toHaveText('전송 전 메모를 이 기기에 저장했어요.');

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:my-flow:completion-feedback:moving-d30-basic') || 'null'));
  expect(stored.reflection).toMatchObject({
    outcome: 'helpful',
    note: '다음 이사에도 같은 순서로 확인하고 싶어요.',
  });
  expect(stored.sourceCorrectionDraft).toMatchObject({
    scope: 'item',
    note: '이 단계는 관리사무소 운영 시간을 먼저 확인해야 해요.',
  });
  expect(stored.sourceCorrectionDraft.itemId).toBeTruthy();
  expect(stored.sourceCorrectionDraft.itemTitle).toBeTruthy();
  expect(stored.sourceCorrectionDraft.sourceUrl).toContain('ajd.co.kr');
  expect(await page.evaluate(() => Object.values(JSON.parse(window.localStorage.getItem('flow_builder_mvp_checks_moving-d30-basic') || '{}')).every(Boolean))).toBe(true);
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await openCurrentMyFlowLibrary(page);
  const reloadedMobileFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  await expect(reloadedMobileFlow.getByTestId('my-flow-completion-feedback-saved-summary')).toContainText('내 회고 저장됨');
  await expect(reloadedMobileFlow.getByTestId('my-flow-completion-feedback-saved-summary')).toContainText('전송 전 메모 저장됨');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload();
  const wideFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  await expect(wideFlow.getByTestId('my-flow-completion-feedback')).toBeVisible();
  await expect(
    wideFlow.getByTestId('my-flow-shape-aware-execution').getByText(/남은 항목이 없습니다/),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.evaluate(() => {
    const checks = JSON.parse(window.localStorage.getItem('flow_builder_mvp_checks_moving-d30-basic') || '{}') as Record<string, boolean>;
    const firstCheckId = Object.keys(checks)[0];
    checks[firstCheckId] = false;
    window.localStorage.setItem('flow_builder_mvp_checks_moving-d30-basic', JSON.stringify(checks));
  });
  await page.reload();
  const reopenedWideFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  await expect(reopenedWideFlow.getByTestId('my-flow-completion-feedback')).toHaveCount(0);
});

test('completed My Flow starts a new dated run without overwriting the previous execution', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  const evidenceDir = process.env.FLOWME_REUSE_EVIDENCE_DIR;
  const historyEvidenceDir = process.env.FLOWME_P23_04_EVIDENCE_DIR;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  if (historyEvidenceDir) fs.mkdirSync(`${historyEvidenceDir}/screenshots`, { recursive: true });
  const flowSlug = 'moving-d30-basic';
  const movingBundle = seedBundles.find((bundle) => bundle.flow.slug === flowSlug);
  expect(movingBundle).toBeTruthy();
  const anchor = '2026-08-10';
  const firstItem = movingBundle?.items[0];
  expect(firstItem).toBeTruthy();
  const firstItemDate = new Date(`${anchor}T00:00:00.000Z`);
  firstItemDate.setUTCDate(firstItemDate.getUTCDate() + Number(firstItem?.day_offset ?? 0));
  const firstDate = firstItemDate.toISOString().slice(0, 10);
  const firstDraftKey = `${flowSlug}::${firstItem?.id}::${firstDate}`;
  const completedChecks = Object.fromEntries((movingBundle?.items ?? []).map((item) => [item.id, true]));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ slug, initialAnchor, checks, draftKey, movedDate }) => {
    if (window.sessionStorage.getItem('flow-reuse-seeded') === 'true') return;
    window.sessionStorage.setItem('flow-reuse-seeded', 'true');
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2026-07-11T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: initialAnchor,
    }));
    window.localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor: initialAnchor }));
    window.localStorage.setItem(`flow_builder_mvp_checks_${slug}`, JSON.stringify(checks));
    window.localStorage.setItem('flow:my-flow:item-drafts', JSON.stringify({
      [draftKey]: {
        title: '견적 후보 다시 확인',
        memo: '이번에는 후보 두 곳만 비교',
        logValue: '지난 실행에서만 쓰는 기록',
      },
    }));
    window.localStorage.setItem('flow:my-flow:date-overrides', JSON.stringify({ [draftKey]: movedDate }));
  }, {
    slug: flowSlug,
    initialAnchor: anchor,
    checks: completedChecks,
    draftKey: firstDraftKey,
    movedDate: '2026-07-15',
  });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await openCurrentMyFlowLibrary(page);
  const mobileFlow = await openMyFlowLibraryFlow(page, flowSlug, 'record');
  const feedback = mobileFlow.getByTestId('my-flow-completion-feedback');
  await expect(feedback).toBeVisible();
  await feedback.getByTestId('my-flow-reflection-open').click();
  await feedback.getByRole('button', { name: '도움됐어요' }).click();
  await feedback.getByTestId('my-flow-reflection-note').fill('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
  await feedback.getByTestId('my-flow-reflection-save').click();
  await feedback.getByTestId('my-flow-source-correction-open').click();
  await feedback.getByTestId('my-flow-source-correction-note').fill('관리사무소 운영 시간을 먼저 확인하도록 원본 순서를 검토해 주세요.');
  await feedback.getByTestId('my-flow-source-correction-save').click();
  await expect(feedback.getByTestId('my-flow-reuse-open')).toHaveText('새 이사일로 다시 쓰기');
  await feedback.getByTestId('my-flow-reuse-open').click();
  const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
  await expect(feedback).toContainText('지난 실행은 보관하고 완료 체크만 새로 시작합니다.');
  await expect(reusePanel.getByTestId('my-flow-reuse-anchor-input')).toHaveAccessibleName('새 이사일');
  await expect(reusePanel.getByTestId('my-flow-reuse-fixed-date-policy')).toContainText('따로 바꾼 날짜 1개');
  await expect(reusePanel.getByTestId('my-flow-reuse-current-anchor')).toHaveText('8월 10일');
  await expect(reusePanel.getByTestId('my-flow-reuse-next-anchor')).toHaveText('선택 필요');
  await expect(reusePanel.getByTestId('my-flow-reuse-previous-run-result')).toHaveText('그대로 보관');
  await expectNoInternalUserSurfaceCopy(reusePanel);
  await expectNoUserFacingRawIsoDate(reusePanel);
  await expectNoUserFacingDisplayLeakage(reusePanel);

  await reusePanel.getByTestId('my-flow-reuse-start').click();
  await expect(reusePanel.getByTestId('my-flow-reuse-error')).toHaveText('이사일을 선택해 주세요.');
  await reusePanel.getByTestId('my-flow-reuse-anchor-input').fill('2026-10-20');
  await expect(reusePanel.getByTestId('my-flow-reuse-next-anchor')).toHaveText('10월 20일');
  await expect(reusePanel.getByTestId('my-flow-reuse-linked-date-result')).toHaveText(`${movingBundle?.items.length}개 재배치`);
  await reusePanel.getByTestId('my-flow-reuse-start').click();
  await expect(reusePanel.getByTestId('my-flow-reuse-error')).toHaveText('따로 바꾼 날짜를 어떻게 처리할지 선택해 주세요.');
  await reusePanel.getByLabel('새 이사일에 맞추기').check();
  await expect(reusePanel.getByTestId('my-flow-reuse-fixed-date-result')).toHaveText('1개 재계산');
  if (evidenceDir) {
    await reusePanel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/01-completed-flow-reuse-mobile.png` });
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  const wideReuseFlow = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`);
  const wideReusePanel = wideReuseFlow.getByTestId('my-flow-reuse-panel');
  await expect(wideReusePanel).toBeVisible();
  await expect(wideReusePanel.getByTestId('my-flow-reuse-current-anchor')).toHaveText('8월 10일');
  await expect(wideReusePanel.getByTestId('my-flow-reuse-next-anchor')).toHaveText('10월 20일');
  await expect(wideReusePanel.getByTestId('my-flow-reuse-fixed-date-result')).toHaveText('1개 재계산');
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await wideReusePanel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/02-completed-flow-reuse-wide.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileReusePanel = mobileFlow.getByTestId('my-flow-reuse-panel');
  await expect(mobileReusePanel).toBeVisible();
  await mobileReusePanel.getByTestId('my-flow-reuse-start').click();

  const activeMobileFlow = await openMyFlowLibraryFlow(page, flowSlug, 'record');
  await expect(activeMobileFlow.getByTestId('my-flow-reuse-status')).toContainText('새 이사일 10월 20일로 시작했어요. 지난 실행은 기록으로 남아 있어요.');
  await expect(activeMobileFlow.getByTestId('my-flow-reuse-status-detail')).toHaveText('따로 고친 날짜 1개 재계산 · 완료 체크 새로 시작');
  await expect(activeMobileFlow.getByTestId('my-flow-completion-feedback')).toHaveCount(0);
  const pastRuns = activeMobileFlow.getByTestId('my-flow-past-runs');
  await expect(pastRuns.locator(':scope > summary')).toHaveText('지난 실행 1회');
  await pastRuns.locator(':scope > summary').click();
  await expect(pastRuns).toContainText('이사일 8월 10일');
  await expect(pastRuns).toContainText(`전체 ${movingBundle?.items.length}/${movingBundle?.items.length} 완료`);
  const pastRun = pastRuns.getByTestId('my-flow-past-run').first();
  await pastRun.locator('summary').first().click();
  const pastRunDetail = pastRun.getByTestId('my-flow-past-run-detail');
  await expect(pastRunDetail.getByTestId('my-flow-past-run-item')).toHaveCount(movingBundle?.items.length ?? 0);
  await expect(pastRunDetail.getByTestId('my-flow-past-run-items').locator('button, input, textarea, select')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(pastRunDetail);
  const editedPastItem = pastRunDetail.getByTestId('my-flow-past-run-item').filter({ hasText: '견적 후보 다시 확인' });
  await expect(editedPastItem).toContainText('완료');
  await expect(editedPastItem).toContainText('7월 15일');
  await expect(editedPastItem).toContainText('이번에는 후보 두 곳만 비교');
  await expect(pastRunDetail.getByTestId('my-flow-past-run-reflection')).toContainText('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
  await expect(pastRunDetail.getByTestId('my-flow-past-run-correction')).toContainText('관리사무소 운영 시간을 먼저 확인하도록 원본 순서를 검토해 주세요.');
  await expect(pastRunDetail.getByTestId('my-flow-past-run-correction')).toContainText('아직 전송되지 않았어요.');
  const pastRunExport = pastRunDetail.getByTestId('my-flow-past-run-export');
  await pastRunExport.locator('summary').click();
  await pastRunExport.getByRole('button', { name: '체크리스트 복사' }).click();
  let pastRunClipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(pastRunClipboard).toContain('- [x] 견적 후보 다시 확인');
  expect(pastRunClipboard).toContain('일정: 2026-07-15 종일');
  await pastRunExport.getByRole('button', { name: '시트로 복사' }).click();
  pastRunClipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(pastRunClipboard).toContain('상태\t할 일\t날짜');
  expect(pastRunClipboard).toContain('완료\t견적 후보 다시 확인\t2026-07-15');
  await pastRunExport.getByRole('button', { name: '메모로 복사' }).click();
  pastRunClipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(pastRunClipboard).toContain('견적 후보 다시 확인');
  expect(pastRunClipboard).toContain('이번에는 후보 두 곳만 비교');
  expect(pastRunClipboard).not.toContain('내 실행 회고');
  expect(pastRunClipboard).not.toContain('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
  expect(pastRunClipboard).not.toContain('관리사무소 운영 시간을 먼저 확인하도록 원본 순서를 검토해 주세요.');
  await expect(pastRunExport.getByTestId('my-flow-past-run-export-feedback')).toHaveText('지난 실행 메모 복사됨');
  await expectNoHorizontalOverflow(page);
  if (historyEvidenceDir) {
    await pastRun.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${historyEvidenceDir}/screenshots/00-past-run-detail-export-mobile.png`, fullPage: true });
  }
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/02-new-run-started-mobile.png`, fullPage: true });
  }

  const state = await page.evaluate(({ slug, originalDraftKey }) => ({
    registry: JSON.parse(window.localStorage.getItem(`flow:run-registry:${slug}`) || 'null'),
    checks: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_checks_${slug}`) || '{}'),
    anchor: JSON.parse(window.localStorage.getItem(`flow:${slug}:anchorDate`) || 'null'),
    itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    originalDraftKey,
  }), { slug: flowSlug, originalDraftKey: firstDraftKey });
  expect(state.registry.runs).toHaveLength(2);
  const completedRun = state.registry.runs.find((run: { status: string }) => run.status === 'completed');
  const activeRun = state.registry.runs.find((run: { status: string }) => run.status === 'active');
  expect(completedRun.runId).not.toBe(activeRun.runId);
  expect(completedRun.anchor).toBe('2026-08-10');
  expect(completedRun.personalExecutionStateSnapshot.dateOverrides[firstDraftKey]).toBe('2026-07-15');
  expect(completedRun.completionSnapshot.flowTitle).toContain('이사');
  expect(completedRun.completionSnapshot.itemSnapshots).toHaveLength(movingBundle?.items.length);
  expect(completedRun.completionSnapshot.itemSnapshots[0]).toMatchObject({
    title: '견적 후보 다시 확인',
    status: 'done',
    date: '2026-07-15',
    memo: '이번에는 후보 두 곳만 비교',
  });
  expect(completedRun.completionSnapshot.completionFeedback.reflection.note).toBe('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
  expect(completedRun.completionSnapshot.completionFeedback.sourceCorrectionDraft.note).toBe('관리사무소 운영 시간을 먼저 확인하도록 원본 순서를 검토해 주세요.');
  expect(activeRun.anchor).toBe('2026-10-20');
  expect(activeRun.fixedDatePolicy).toBe('reset_to_anchor');
  expect(state.checks).toEqual({});
  expect(state.anchor.anchor).toBe('2026-10-20');
  expect(state.dateOverrides).toEqual({});
  expect(state.itemDrafts[`${flowSlug}::${firstItem?.id}::draft-overlay`]).toEqual({
    title: '견적 후보 다시 확인',
    memo: '이번에는 후보 두 곳만 비교',
  });
  expect(state.itemDrafts[state.originalDraftKey]).toBeUndefined();

  await activeMobileFlow.getByTestId('my-flow-export-entry').click();
  const newRunExport = activeMobileFlow.getByTestId('my-flow-export-panel');
  await expect(newRunExport.getByTestId('my-flow-export-scope-summary')).toContainText('계획 전체');
  const calendarDownloadPromise = page.waitForEvent('download');
  const calendarTransferReceipt = await confirmMyFlowTransfer(
    newRunExport,
    newRunExport.getByTestId('my-flow-export-calendar'),
  );
  const calendarDownload = await calendarDownloadPromise;
  const calendarDownloadPath = await calendarDownload.path();
  expect(calendarDownloadPath).toBeTruthy();
  const newRunIcs = fs.readFileSync(calendarDownloadPath as string, 'utf8');
  expect(newRunIcs).toContain('DTSTART;VALUE=DATE:20261020');
  expect(newRunIcs).not.toContain('DTSTART;VALUE=DATE:20260810');
  await acknowledgeMyFlowTransfer(calendarTransferReceipt);

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload();
  const wideFlow = await openMyFlowLibraryFlow(page, flowSlug, 'record');
  await expect(wideFlow.getByTestId('my-flow-past-runs').locator(':scope > summary')).toHaveText('지난 실행 1회');
  await wideFlow.getByTestId('my-flow-past-runs').locator(':scope > summary').click();
  const widePastRun = wideFlow.getByTestId('my-flow-past-run').first();
  await widePastRun.locator('summary').first().click();
  await expect(widePastRun.getByTestId('my-flow-past-run-item')).toHaveCount(movingBundle?.items.length ?? 0);
  await expect(wideFlow.getByTestId('my-flow-reuse-open')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  if (historyEvidenceDir) {
    await widePastRun.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${historyEvidenceDir}/screenshots/01-past-run-detail-wide.png`, fullPage: true });
  }
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/03-new-run-history-wide.png`, fullPage: true });
  }
  expect(consoleErrors).toEqual([]);
});

test('completed date-free My Flow reuses the current copy without asking for a date', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  const evidenceDir = process.env.FLOWME_REUSE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  const flowSlug = 'passport-renewal-docs';
  const flowBundle = seedBundles.find((bundle) => bundle.flow.slug === flowSlug);
  expect(flowBundle?.flow.anchor_type).toBe('none');
  const completedChecks = Object.fromEntries((flowBundle?.items ?? []).map((item) => [item.id, true]));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ slug, checks }) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2026-07-11T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }));
    window.localStorage.setItem(`flow_builder_mvp_checks_${slug}`, JSON.stringify(checks));
  }, { slug: flowSlug, checks: completedChecks });

  await gotoLegacySavedPlanLibraryRoute(page, '/my');
  await openCurrentMyFlowLibrary(page);
  const flowCard = await openMyFlowLibraryFlow(page, flowSlug, 'record');
  const feedback = flowCard.getByTestId('my-flow-completion-feedback');
  await feedback.getByTestId('my-flow-reuse-open').click();
  const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
  await expect(reusePanel.getByTestId('my-flow-reuse-anchor-input')).toHaveCount(0);
  await expect(feedback.getByTestId('my-flow-reuse-open')).toHaveText('접기');
  await expect(reusePanel).toContainText('현재 항목과 내가 고친 내용은 유지하고 완료 체크만 비웁니다.');
  await expect(reusePanel.getByTestId('my-flow-reuse-linked-date-result')).toHaveText(`${flowBundle?.items.length}개 유지`);
  await expect(reusePanel.getByTestId('my-flow-reuse-previous-run-result')).toHaveText('그대로 보관');
  if (evidenceDir) {
    await reusePanel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/04-date-free-reuse-mobile.png` });
  }
  await reusePanel.getByTestId('my-flow-reuse-start').click();

  const activeFlowCard = await openMyFlowLibraryFlow(page, flowSlug, 'record');
  await expect(activeFlowCard.getByTestId('my-flow-reuse-status')).toContainText('새 실행을 시작했어요. 지난 실행은 기록으로 남아 있어요.');
  const pastRuns = activeFlowCard.getByTestId('my-flow-past-runs');
  await expect(pastRuns.locator(':scope > summary')).toHaveText('지난 실행 1회');
  await pastRuns.locator(':scope > summary').click();
  const pastRun = pastRuns.getByTestId('my-flow-past-run').first();
  await pastRun.locator('summary').first().click();
  await expect(pastRun.getByTestId('my-flow-past-run-item')).toHaveCount(flowBundle?.items.length ?? 0);
  await expect(pastRun.getByTestId('my-flow-past-run-item').first()).toContainText('날짜 없음');
  const runRegistry = await page.evaluate((slug) => JSON.parse(window.localStorage.getItem(`flow:run-registry:${slug}`) || 'null'), flowSlug);
  expect(runRegistry.runs.map((run: { status: string; reuseMode?: string }) => [run.status, run.reuseMode])).toEqual([
    ['completed', 'legacy'],
    ['active', 'same_copy'],
  ]);
  expect(runRegistry.runs[0].completionSnapshot.itemSnapshots).toHaveLength(flowBundle?.items.length);
  expect(runRegistry.runs[0].completionSnapshot.itemSnapshots.every((item: { scheduleState: string }) => item.scheduleState === 'unscheduled')).toBe(true);
  expect(await page.evaluate((slug) => JSON.parse(window.localStorage.getItem(`flow_builder_mvp_checks_${slug}`) || '{}'), flowSlug)).toEqual({});
  await expectNoHorizontalOverflow(page);
});

test('content flows studio brings representative artifacts into the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/content-flows');

  const expectations: Record<string, string> = {
    'wedding-12-month-timeline': 'content-flow-simulated-calendar',
    'water-purifier-filter-cycle': 'content-flow-sheet-surface',
    'used-car-buying-check': 'content-flow-decision-surface',
    'plank-30-day-challenge': 'content-flow-simulated-calendar',
  };

  for (const [id, testId] of Object.entries(expectations)) {
    await page.locator(`[data-testid="content-flow-candidate"][data-flow-id="${id}"]`).click();
    const artifactTop = await page.getByTestId(testId).evaluate((element) => element.getBoundingClientRect().top);
    expect(artifactTop).toBeLessThan(840);
  }
});

test('content flows studio sends review notes to the repo-backed review API', async ({ page }) => {
  let postedPayload: Record<string, unknown> | null = null;

  await page.route('**/api/content-flow-review', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ generatedAt: '2026-06-02', updatedAt: null, reviews: {} }),
      });
      return;
    }

    postedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, review: { ...postedPayload, updatedAt: '2026-06-06T00:00:00.000Z' } }),
    });
  });

  await page.goto('/content-flows');
  const selectedId = await page.getByTestId('content-flow-high-fidelity').getAttribute('data-flow-id');
  await page.getByTestId('content-flow-rating-4').click();
  await page.locator('aside').filter({ has: page.getByTestId('content-flow-review-save') }).locator('input[type="checkbox"]').first().check();
  await page.locator('textarea').fill('실제 실행 화면 기준으로 판단 가능');
  await page.getByTestId('content-flow-review-save').click();

  await expect.poll(() => postedPayload?.flowId).toBe(selectedId);
  expect(postedPayload?.rating).toBe(4);
  expect(postedPayload?.keep).toBe(true);
  expect(postedPayload?.memo).toBe('실제 실행 화면 기준으로 판단 가능');
});

test('flow lab shows converted pilot and scale validation boards', async ({ page }) => {
  await page.goto('/flow-lab');

  await expect(page.getByRole('heading', { name: '실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증' })).toBeVisible();
  await expect(page.getByText('3 x 4 파일럿 검증')).toBeVisible();
  const inventory = page.locator('section').filter({ hasText: '전체 콘텐츠 인벤토리' });
  await expect(inventory).toBeVisible();
  await expect(inventory.getByText('실제 원본', { exact: true })).toBeVisible();
  await expect(inventory.getByText('83', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('샘플 후보', { exact: true })).toBeVisible();
  await expect(inventory.getByText('442', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('수동 검토', { exact: true })).toBeVisible();
  await expect(inventory.getByText('132', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('검토 대기', { exact: true })).toBeVisible();
  await expect(inventory.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText('legacy 접근', { exact: true })).toBeVisible();
  await expect(inventory.getByText('0', { exact: true }).first()).toBeVisible();
  const lifecycle = page.locator('section').filter({ hasText: '전체 Flow 운영 분류' });
  await expect(lifecycle).toBeVisible();
  await expect(lifecycle.getByText('대표 유지', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('보강 필요', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('미리보기 전용', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('삭제 후보', { exact: true }).first()).toBeVisible();
  await expect(lifecycle.getByText('실제 원본 Flow의')).toBeVisible();
  const broadSourceGuard = page.locator('section').filter({ hasText: 'Broad Source Guard' });
  await expect(broadSourceGuard).toBeVisible();
  await expect(broadSourceGuard.getByText('Broad real sources', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Representative leaks', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Exact source replacement queue', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('Hidden broad-source decisions', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(broadSourceGuard.getByText('0', { exact: true }).first()).toBeVisible();
  await expect(broadSourceGuard.getByText('housing-subscription-account', { exact: true })).toBeVisible();
  await expect(broadSourceGuard.getByText('real-fitvely-weekly-body-check')).toBeVisible();
  await expect(broadSourceGuard.getByText('real-pet-health-visit-routine')).toHaveCount(0);
  await expect(broadSourceGuard.getByText('real-mofa-overseas-travel-prep')).toHaveCount(0);
  const readiness = page.locator('section').filter({ hasText: '대표 승격 1차 심사' });
  await expect(readiness).toBeVisible();
  await expect(readiness.getByText('대표 후보', { exact: true }).first()).toBeVisible();
  await expect(readiness.getByText('Public MVP 후보', { exact: true }).first()).toBeVisible();
  await expect(readiness.getByRole('link', { name: '컴퓨터활용능력 1급 D-30 학습 Flow' })).toBeVisible();
  await expect(readiness.getByRole('link', { name: '신차 인수 점검 Flow' })).toBeVisible();
  await expect(readiness.getByText('diet-habit-2week')).toBeVisible();
  const representativeUxReview = page.locator('section').filter({ hasText: 'Representative UX Content Review' });
  await expect(representativeUxReview).toBeVisible();
  await expect(representativeUxReview.getByText('ready_for_observed_session').first()).toBeVisible();
  await expect(representativeUxReview.getByText('needs_guardrail_rewrite').first()).toBeVisible();
  await expect(representativeUxReview.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(representativeUxReview.getByText('diet-habit-2week')).toBeVisible();
  await expect(representativeUxReview.getByText('new-car-delivery-check')).toBeVisible();
  const mobileSimulationProtocol = page.locator('section').filter({ hasText: 'Mobile Simulation Protocol' });
  await expect(mobileSimulationProtocol).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('No validated routes')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('avg score 77')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('diet-habit-2week')).toBeVisible();
  await expect(mobileSimulationProtocol.getByText('new-car-delivery-check')).toBeVisible();
  const observedSessionPrep = page.getByTestId('observed-session-prep-panel');
  await expect(observedSessionPrep).toBeVisible();
  await expect(observedSessionPrep.getByText('Observed-session prep package', { exact: true })).toBeVisible();
  await expect(observedSessionPrep.getByText('3 routes')).toBeVisible();
  await expect(observedSessionPrep.getByText('0 validated')).toBeVisible();
  await expect(observedSessionPrep.getByText('computer-skills-d30-study')).toBeVisible();
  await expect(observedSessionPrep.getByText('diet-habit-2week')).toBeVisible();
  await expect(observedSessionPrep.getByText('new-car-delivery-check')).toBeVisible();
  await expect(observedSessionPrep.getByText('screenshot targets', { exact: true })).toBeVisible();
  const observedSessionEvidence = page.getByTestId('observed-session-evidence-panel');
  await expect(observedSessionEvidence).toBeVisible();
  await expect(observedSessionEvidence.getByText('Observed-session evidence log', { exact: true })).toBeVisible();
  await expect(observedSessionEvidence.getByText('1 session note')).toBeVisible();
  await expect(observedSessionEvidence.getByText('2 not run')).toBeVisible();
  await expect(observedSessionEvidence.getByText('0 candidate signals')).toBeVisible();
  await expect(observedSessionEvidence.getByText('0 validated', { exact: true })).toHaveCount(0);
  await expect(observedSessionEvidence.locator('span').filter({ hasText: 'no signal' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'computer-skills-d30-study' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'diet-habit-2week' })).toBeVisible();
  await expect(observedSessionEvidence.locator('article').filter({ hasText: 'new-car-delivery-check' })).toBeVisible();
  const sessionIntake = page.getByTestId('observed-session-note-intake');
  await expect(sessionIntake).toBeVisible();
  await expect(sessionIntake.getByRole('combobox', { name: 'Route' })).toBeVisible();
  await expect(sessionIntake.getByRole('combobox', { name: 'Decision' })).not.toContainText('validated');
  await sessionIntake.getByRole('combobox', { name: 'Route' }).selectOption('diet-habit-2week');
  await sessionIntake.getByRole('spinbutton', { name: 'Session number' }).fill('1');
  await sessionIntake.getByRole('combobox', { name: 'Decision' }).selectOption('friction');
  await sessionIntake.getByLabel('Artifact-near CTA').fill('missed first, found after prompt');
  await sessionIntake.getByLabel('Sticky fallback').fill('used fallback sheet');
  await sessionIntake.getByLabel('Export/copy').fill('copied observation sheet');
  await sessionIntake.getByRole('textbox', { name: 'Friction' }).fill('Stop condition was noticed after table editing.');
  await sessionIntake.getByRole('textbox', { name: 'Follow-up' }).fill('Move stop cue closer to the first row.');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('# Observed Session Note: diet-habit-2week');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('Decision: `friction`');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('Artifact-near CTA: missed first, found after prompt');
  await expect(sessionIntake.getByTestId('observed-session-note-preview')).toContainText('This note is not validation.');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('# Observed Session Run Sheet: diet-habit-2week');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('Moderator prompt');
  await expect(sessionIntake.getByTestId('observed-session-run-sheet-preview')).toContainText('Decision options: `no signal`, `friction`, `candidate signal`');
  const noteDownloadPromise = page.waitForEvent('download');
  await sessionIntake.getByRole('button', { name: 'Download note' }).click();
  const noteDownload = await noteDownloadPromise;
  expect(noteDownload.suggestedFilename()).toMatch(/diet-habit-2week-session-01\.md$/);
  const runSheetDownloadPromise = page.waitForEvent('download');
  await sessionIntake.getByRole('button', { name: 'Download run sheet' }).click();
  const runSheetDownload = await runSheetDownloadPromise;
  expect(runSheetDownload.suggestedFilename()).toBe('diet-habit-2week-observed-session-run-sheet.md');
  const uxCleanupBacklog = page.locator('section').filter({ hasText: 'UX Cleanup Backlog' });
  await expect(uxCleanupBacklog).toBeVisible();
  await expect(uxCleanupBacklog.getByText('36 routes')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('0 validated')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('exact_workout_video_execution_detail')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('health_observation_guardrail')).toBeVisible();
  await expect(uxCleanupBacklog.getByText('vehicle_purchase_evidence_first')).toBeVisible();
  const designRefGapQueue = page.getByTestId('design-ref-gap-queue-panel');
  await expect(designRefGapQueue).toBeVisible();
  await expect(designRefGapQueue.getByText('Design-ref gap queue')).toBeVisible();
  await expect(designRefGapQueue.getByText('8 items')).toBeVisible();
  await expect(designRefGapQueue.getByText('8 landed')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 pending')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 P1 pending')).toBeVisible();
  await expect(designRefGapQueue.getByText('0 validated')).toBeVisible();
  await expect(designRefGapQueue.getByText('mobile-study-log-summary')).toBeVisible();
  await expect(designRefGapQueue.getByText('observed-session-prep')).toBeVisible();
  const exportFirstSimulation = page.locator('section').filter({ hasText: 'Export-first Simulation' });
  await expect(exportFirstSimulation).toBeVisible();
  await expect(exportFirstSimulation.getByText('Final QA candidate', { exact: true }).first()).toBeVisible();
  await expect(exportFirstSimulation.getByText('Public MVP after UX fix', { exact: true }).first()).toBeVisible();
  await expect(exportFirstSimulation.getByText('calendar + sheet')).toBeVisible();
  await expect(exportFirstSimulation.getByText('sheet + memo')).toBeVisible();
  await expect(exportFirstSimulation.getByText('mockScore=68')).toBeVisible();
  await expect(exportFirstSimulation.getByText('dealerConfirmed=hold delivery until written confirmation')).toBeVisible();
  await expect(exportFirstSimulation.getByText('stopCondition=consult professional if dizziness repeats')).toBeVisible();
  const needsReviewPriority = page.locator('section').filter({ hasText: '검토 대기 우선순위' });
  await expect(needsReviewPriority).toBeVisible();
  await expect(needsReviewPriority.getByText('바로 audit', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('원본 교체', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('리스크 검토', { exact: true }).first()).toBeVisible();
  await expect(needsReviewPriority.getByText('0', { exact: true }).first()).toBeVisible();
  const sourceFitAudit = page.locator('section').filter({ hasText: '원본 콘텐츠가 FLOW화될 가치가 있는지 점검' });
  await expect(sourceFitAudit).toBeVisible();
  await expect(sourceFitAudit.getByText('수동 Source-Fit Audit')).toBeVisible();
  const artifactAudit = page.locator('section').filter({ hasText: 'Natural Artifact Audit' });
  await expect(artifactAudit).toBeVisible();
  await expect(artifactAudit.getByText('사용자가 실제로 만들 산출물 기준 검토')).toBeVisible();
  await expect(artifactAudit.getByText('exact source')).toBeVisible();
  await expect(artifactAudit.getByText('catalog review')).toBeVisible();
  await expect(artifactAudit.getByText('감사 완료')).toBeVisible();
  await expect(artifactAudit.getByText('83', { exact: true }).first()).toBeVisible();
  await expect(sourceFitAudit.getByText('감사 완료')).toBeVisible();
  await expect(sourceFitAudit.getByText('카탈로그 미리보기 14')).toBeVisible();
  await expect(page.getByRole('link', { name: '시험 D-30 공부 계획 Flow', exact: true })).toBeVisible();
  await expect(page.getByText('B 파일럿 실제 Flow 변환')).toBeVisible();
  await expect(page.getByText('200+ 제작자 채널 Flow 검증')).toBeVisible();
  await expect(page.getByText('10 converted')).toBeVisible();
  const convertedPilot = page.locator('section').filter({ hasText: 'B 파일럿 실제 Flow 변환' });
  await expect(convertedPilot.getByRole('link', { name: /삼성전자서비스 에어컨/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /자동차검사 준비/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /Q-Net 원서접수/ })).toBeVisible();
  await expect(convertedPilot.getByRole('link', { name: /다이어트 식단·운동 기록/ })).toBeVisible();
});



test('MOFA travel route stays out of public routes until its execution fields are approved', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/real-mofa-overseas-travel-prep');
});



test('baby food personal schedule does not leak its old workbench on the public route', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/baby-food-menu-recipe');
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toHaveCount(0);
});

test('url-first p0 lab previews hit review miss and memo states without public nav exposure', async ({ page }) => {
  await page.goto('/flow-lab/url-first-p0');

  await expect(page.getByRole('heading', { name: 'URL-first P0 실험' })).toBeVisible();
  await expect(page.getByTestId('url-first-result-card')).toContainText('상태 hit');
  await expect(page.getByTestId('url-first-result-card')).toContainText('/f/moving-d30-basic');
  await expect(page.getByTestId('url-first-export-preview')).toContainText('moving-d30-flow.ics');
  await expect(page.getByTestId('url-first-export-preview')).toContainText('Markdown');
  await expect(page.getByTestId('url-first-export-preview')).toContainText('checklist');
  await expect(page.getByTestId('url-first-my-flow-calendar-preview')).toContainText('실제 저장 없음');
  await expect(page.locator('body')).not.toContainText(/추천\s*\d+명|저장\s*\d+명|사용\s*\d+명/);

  await page.getByRole('button', { name: '자동차검사 needs_review' }).click();
  await expect(page.getByTestId('url-first-result-card')).toContainText('상태 needs_review');
  await expect(page.getByTestId('url-first-gate')).toContainText('원문 확인 전에는 캘린더 파일을 만들지 않습니다.');
  await expect(page.getByTestId('url-first-result-card')).toContainText('저장 미리보기만');

  await page.getByRole('button', { name: '알 수 없는 URL' }).click();
  await expect(page.getByTestId('url-first-result-card')).toContainText('상태 miss');
  await expect(page.getByTestId('url-first-result-card')).toContainText('AI 생성 disabled');

  await page.getByRole('button', { name: '메모 초안' }).click();
  await expect(page.getByTestId('url-first-result-card')).toContainText('상태 memo_draft');
  await expect(page.getByTestId('url-first-recommendation')).toContainText('원룸 이사 D-30 일정 지도');
  await expect(page.getByTestId('url-first-export-preview')).toContainText('private-memo-draft.ics');

  for (const route of ['/', '/flows', '/my', '/calendar']) {
    await page.goto(route);
    await expect(page.locator('a[href="/flow-lab/url-first-p0"]')).toHaveCount(0);
    await expect(page.getByText('URL-first P0 실험')).toHaveCount(0);
  }
});

test('my flow and calendar expose distinct task-first and date-first execution layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLegacySavedPlanLibraryNavigation(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux12');
  await expect(page.getByTestId('my-flow-workspace')).toHaveAttribute('data-surface-role', 'task-first');
  const myFlowWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  const myFlowPrimaryRow = myFlowWorkspace
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-execution-row-shell')
    .first();
  await expect(myFlowPrimaryRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await myFlowPrimaryRow.getByRole('button', { name: /열기/ }).click();
  await expect(getOpenMyFlowItemDetail(page).getByTestId('my-flow-task-complete-control')).toHaveCount(1);
  await closeOpenMyFlowItemDetail(page);

  await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux12');
  await expect(page.getByTestId('my-flow-workspace')).toHaveAttribute('data-surface-role', 'date-first');
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveAttribute('data-calendar-layout', 'month-overview');
  const selectedDay = await openMyFlowCalendarSelectedDay(page);
  await expect(selectedDay).toHaveAttribute('data-calendar-layout', 'selected-day-execution');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toHaveAttribute('data-density', 'compact');
  const calendarRow = selectedDay.getByTestId('my-flow-execution-row-shell').first();
  await expect(calendarRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(calendarRow.getByRole('button', { name: /계획에서 열기/ })).toBeVisible();
});

test('url lookup keeps the result focused and makes the catalog secondary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.getByTestId('flow-url-lookup-input').fill('https://blog.naver.com/01695258757/222768860919?utm_source=review');
  await page.getByRole('button', { name: '계획 찾기' }).click();

  await expect(page.getByTestId('flow-url-lookup-result')).toBeVisible();
  await expect(page.getByTestId('flow-catalog-browse-controls')).toBeHidden();
  await expect(page.getByTestId('flow-catalog-browse-results')).toBeHidden();
  const browseToggle = page.getByTestId('flow-catalog-after-lookup-toggle');
  await expect(browseToggle).toHaveText(/다른 계획 둘러보기/);
  await browseToggle.click();
  await expect(page.getByTestId('flow-catalog-browse-controls')).toBeVisible();
  await expect(page.getByTestId('flow-catalog-browse-results')).toBeVisible();
});

test('source-backed flow map uses one artifact-first promise and a flat execution outline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/middle-school-math-1');

  await expect(page.getByTestId('flow-map-hero')).toHaveAttribute('data-visual-structure', 'artifact-first');
  const outline = page.getByTestId('flow-map-execution-outline');
  await expect(outline).toBeVisible();
  await expect(outline.getByTestId('flow-map-execution-step-row')).toHaveCount(8);
  await expect(page.getByTestId('flow-map-mobile-sticky-save')).toBeVisible();
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
