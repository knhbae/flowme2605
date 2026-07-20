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
  /\bItem\b/,
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
  expect(result.trailingFlowSuffixHits).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
}

async function enterMyFlowDetailEditMode(detail: Locator) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  const summary = readSummary.locator('summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) await summary.click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
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
  if ((await tools.getAttribute('open')) === null) await tools.locator('summary').click();
  return tools;
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
  await expect(page.getByRole('heading', { name: '이 Flow는 지금 열 수 없어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '다른 Flow 찾기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
}

test('home presents FLOW as an executable content platform', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('navigation').getByRole('link', { name: 'Flow 찾기', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '채널' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '내 Flow', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flow Lab' })).toHaveCount(0);
  await page.getByLabel('보조 메뉴 열기').click();
  await expect(page.getByRole('link', { name: 'Flow 만들기' })).toBeVisible();
  await expect(page.getByRole('link', { name: /크리에이터 보기/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '콘텐츠를 일정과 할 일로 저장' })).toBeVisible();
  await expect(page.getByText('서비스 구조')).toHaveCount(0);
  await expect(page.getByText('짧은 단일 Flow')).toHaveCount(0);
  const urlFirstEntry = page.getByTestId('home-url-first-entry');
  await expect(urlFirstEntry).toBeVisible();
  await expect(urlFirstEntry).toHaveAttribute('href', '/flows');
  await expect(urlFirstEntry).toContainText('URL이나 메모로 Flow 찾기');
  await expect(urlFirstEntry).toContainText('링크 붙여넣기');
  await expect(urlFirstEntry).toContainText('요청 메모');
  await expect(urlFirstEntry).toContainText(/Flow 찾기\s*·\s*링크 붙여넣기/);
  await expect(urlFirstEntry).not.toContainText('Flow 찾기링크 붙여넣기');
  await expect(page.getByRole('link', { name: '내 콘텐츠로 Flow 만들기' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '#D-Day 준비' })).toHaveCount(0);
  await expect(page.getByText('원룸 이사 D-30').first()).toBeVisible();
  await expect(page.getByText('중1 수학 목차 진도').first()).toBeVisible();
  await expect(page.getByText('전세계약 전 서류 체크 Flow').first()).toHaveCount(0);
  await expect(page.getByText('중고차 구매 현장 점검 Flow').first()).toHaveCount(0);
  await expect(page.getByText('초기 이유식 메뉴·레시피 Flow').first()).toHaveCount(0);
  await expect(page.getByText('결혼 준비 D-300 타임라인 Flow').first()).toHaveCount(0);
  await expect(page.getByText('직장인 영어공부 30일 루틴 Flow').first()).toHaveCount(0);
  await expect(page.getByText('미리보기').first()).toHaveCount(0);
  await expect(page.getByText('출력:').first()).toHaveCount(0);
  await expect(page.getByText('베타 운영 중').first()).toHaveCount(0);
  await expect(page.getByText('출처 연결').first()).toHaveCount(0);
  await expect(page.getByTestId('home-menu-tree-section')).toHaveCount(0);
  await expect(page.getByText('시작 경로')).toHaveCount(0);
  await expect(page.getByText('날짜가 있는 항목 실행')).toHaveCount(0);
  const recommendationCards = page.locator('[data-home-recommendation-card="true"]');
  await expect(recommendationCards).toHaveCount(2);
  const primaryCard = page.getByTestId('home-primary-flow-card');
  await expect(primaryCard).toHaveAttribute('href', '/flow-maps/moving-d30');
  await expect(primaryCard).toContainText('이사일만 넣으면');
  await expect(primaryCard).toContainText('D-30 일정');
  await expect(primaryCard).toContainText('할 일');
  await expect(primaryCard).toContainText('열어보기');
  await expect(primaryCard).not.toContainText('저장 전 보기');
  const mathCard = recommendationCards.filter({ hasText: '중1 수학 목차 진도' });
  await expect(mathCard).toHaveAttribute('href', '/flow-maps/middle-school-math-1');
  await expect(mathCard).toContainText('입력 없이');
  await expect(mathCard).toContainText('진도표');
  await expect(mathCard).toContainText('열어보기');
  await expect(mathCard).not.toContainText('저장 전 보기');
  await expect(primaryCard.getByTestId('home-card-signal')).toHaveCount(0);
  await expect(page.getByTestId('home-secondary-actions')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '저장한 콘텐츠 보기' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '캘린더 보기' })).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
});

test('home recommended starts open detail pages and save into My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());

  await Promise.all([
    page.waitForURL('**/flow-maps/moving-d30', { timeout: 15_000 }),
    page.locator('[data-home-recommendation-card="true"]').filter({ hasText: '원룸 이사 D-30' }).click(),
  ]);
  await expect(page.getByTestId('flow-map-public')).toBeVisible();
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-31');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await expect(page.getByTestId('my-flow-post-save-artifact')).toContainText('이사 방식과 견적 후보 정하기');

  await page.goto('/');
  await Promise.all([
    page.waitForURL('**/flow-maps/middle-school-math-1', { timeout: 15_000 }),
    page.locator('[data-home-recommendation-card="true"]').filter({ hasText: '중1 수학 목차 진도' }).click(),
  ]);
  await expect(page.getByTestId('flow-map-public')).toBeVisible();
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
  await expect(page.getByTestId('my-flow-post-save-artifact')).toContainText('1. 소인수분해');
});

test('wide home and My Flow keep action columns purposeful', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });

  await page.goto('/');
  const primaryHomeCard = page.getByTestId('home-primary-flow-card');
  const secondaryHomeCard = page.getByTestId('home-secondary-flow-card').first();
  await expect(primaryHomeCard).toBeVisible();
  await expect(secondaryHomeCard).toBeVisible();

  const primaryHomeBox = await primaryHomeCard.boundingBox();
  const secondaryHomeBox = await secondaryHomeCard.boundingBox();
  expect(primaryHomeBox).not.toBeNull();
  expect(secondaryHomeBox).not.toBeNull();
  expect(secondaryHomeBox!.width).toBeGreaterThan(primaryHomeBox!.width * 0.8);
  await expectNoHorizontalOverflow(page);

  await page.goto('/f/vehicle-inspection-prep');
  const publicSetup = page.getByTestId('public-flow-primary-setup');
  const publicArtifact = page.getByLabel('Flow artifact workbench');
  await expect(publicSetup).toBeVisible();
  await expect(page.getByTestId('public-flow-artifact-preview')).toHaveCount(0);
  await expect(publicArtifact).toBeVisible();
  const publicSetupBox = await publicSetup.boundingBox();
  const publicArtifactBox = await publicArtifact.boundingBox();
  expect(publicSetupBox).not.toBeNull();
  expect(publicArtifactBox).not.toBeNull();
  expect(publicArtifactBox!.y).toBeGreaterThan(publicSetupBox!.y);
  await expectNoHorizontalOverflow(page);

  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all').click();
  await page.waitForURL('**/my?savedMap=moving-d30', { timeout: 15_000 });

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

  await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '저장할 실행 콘텐츠' })).toHaveCount(0);
  const flowMapCatalog = page.getByTestId('flow-map-catalog-section');
  await expect(flowMapCatalog).toBeVisible();
  await expect(flowMapCatalog.getByRole('heading', { name: '내 상황에 맞는 콘텐츠 고르기' })).toHaveCount(0);
  await expect(flowMapCatalog.getByTestId('flow-map-catalog-card')).toHaveCount(7);
  await expect(flowMapCatalog.locator('[data-testid="flow-map-catalog-card"][data-source-kind="curated-source"]')).toHaveCount(5);
  await expect(flowMapCatalog.getByTestId('single-flow-catalog-card')).toHaveCount(0);
  const firstCatalogCard = flowMapCatalog.getByTestId('flow-map-catalog-card').first();
  const firstCatalogCardTop = await firstCatalogCard.evaluate((element) => element.getBoundingClientRect().top);
  expect(firstCatalogCardTop).toBeLessThan(480);
  await expect(firstCatalogCard.getByTestId('flow-card-primary-action')).toHaveText('열어보기');
  await expectCompactCatalogAction(firstCatalogCard, firstCatalogCard.getByTestId('flow-map-detail-link'));
  await expect(firstCatalogCard.getByTestId('flow-map-recommended-flow-link')).toHaveCount(0);
  await expect(firstCatalogCard.getByTestId('flow-map-source-link')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/moving-d30"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/flow-maps/middle-school-math-1"]')).toBeVisible();
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-ajd-moving-d30"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/baby-health-schedule"]')).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/curated-child-vaccination-schedule"]')).toHaveCount(0);
  await expect(flowMapCatalog.getByText('콘텐츠', { exact: true })).toHaveCount(0);
  await expect(flowMapCatalog.locator('a[href="/flow-maps/moving-map"]')).toHaveCount(0);
  await expect(page.getByTestId('curated-source-catalog-section')).toHaveCount(0);
  await expect(page.getByTestId('single-flow-catalog-section')).toHaveCount(0);
  const catalogCount = flowMapCatalog.getByTestId('flow-catalog-count');
  await expect(catalogCount).toContainText('7개 콘텐츠');
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
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result).toContainText('중1 수학');
  await expect(result.getByRole('link', { name: '저장 전 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');
  await expect(result).toContainText('캘린더');
  await expect(result).toContainText('메모 문서');
  await expect(result).not.toContainText('Markdown');
  await expect(result).toContainText('내 Flow');
  await expect(result).not.toContainText('source-backed');

  await lookup.getByLabel('URL 또는 메모').fill('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(result).toContainText('원문 확인');
  await expect(result.getByRole('link', { name: '미리보기 열기' })).toHaveAttribute('href', '/f/vehicle-inspection-prep');
  await expect(result).toContainText('저장 대기');
  await expect(result.getByText('내 Flow', { exact: true })).toHaveCount(0);

  await lookup.getByLabel('URL 또는 메모').fill('https://example.com/some-plan?utm_source=newsletter');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(result).toContainText('바로 시작할 Flow를 찾지 못했어요');
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await expect(result).not.toContainText(/아직 없음|저장 대기|초안 요청 가능|아직 실행 가능한 Flow 아님/);
  await expect(result).not.toContainText('이미 만들어진 Flow가 있어요');
  await expectNoHorizontalOverflow(page);
});

test('flow finding turns a plain memo into an editable private draft and lands in My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('이사 견적을 비교한다. 관리사무소에 연락한다. 주소 변경 대상을 확인한다.');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

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
  await expect(editor).toContainText('첫 번째 할 일만 캘린더에 넣습니다');
  await expect(editor.getByTestId('flow-memo-draft-item').first()).toContainText('8월 30일');
  await expect(editor.getByTestId('flow-memo-draft-item').nth(1)).toContainText('날짜 없음');
  await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();

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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const memoDraftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
  await expect(memoDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toContainText('첫 할 일 날짜');

  await page.goto('/calendar');
  await expect(page.getByText('이사 견적을 비교하기').first()).toBeVisible();
  await expect(
    page.locator('.fc-event').filter({ hasText: '관리사무소에 연락하기' }),
  ).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-unscheduled-toggle').click();
  await expect(
    page.getByTestId('my-flow-calendar-unscheduled-tray').getByText('관리사무소에 연락하기'),
  ).toBeVisible();
  await expect(page.getByText('첫 할 일 날짜').first()).toBeVisible();
  await expect(page.getByText('메모에서 나눈 할 일').first()).toBeVisible();
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
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('바로 시작할 Flow를 찾지 못했어요');
  await expect(result.getByTestId('flow-url-miss-draft-gate')).toBeVisible();
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await expect(result).not.toContainText(/아직 없음|저장 대기|초안 요청 가능|아직 실행 가능한 Flow 아님/);
  await expect(result.getByTestId('flow-url-supply-candidate-form')).toBeVisible();
  await result.getByLabel('Flow 이름').fill('예시 준비 체크리스트');
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
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(result.getByTestId('flow-url-supply-existing')).toContainText('저장한 초안이 있어요');
  await expect(result).toContainText('예시 준비 체크리스트');
  await expect(result.getByTestId('flow-url-supply-candidate-form')).toHaveCount(0);
  storedCandidates = await page.evaluate(() => JSON.parse(window.localStorage.getItem('flow:url-first:supply-candidates') || '[]'));
  expect(storedCandidates).toHaveLength(1);

  await lookup.getByLabel('URL 또는 메모').fill('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(result).toContainText('원문 확인');
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await result.getByLabel('Flow 이름').fill('자동차검사 준비 보강 요청');
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
  await expect(page.getByTestId('flow-url-lookup-result')).toContainText('바로 시작할 Flow를 찾지 못했어요');

  const reviewCard = candidateList.locator('article').filter({ hasText: '원문 확인 후보' });
  await expect(reviewCard).toContainText('원문 확인');
  await reviewCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await reviewCard.getByRole('button', { name: '삭제' }).click();
  await expect(candidateList).not.toContainText('원문 확인 후보');

  const resolvedCard = candidateList.locator('article').filter({ hasText: '이제 변환된 수학 후보' });
  await expect(resolvedCard).toContainText('Flow 준비됨');
  await resolvedCard.getByRole('button', { name: 'Flow 결과로 이동' }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await expect(page.getByLabel('URL 또는 메모')).toHaveValue('https://mathbang.net/13');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result.getByTestId('flow-url-start-panel')).toBeVisible();

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
  await expect(candidateCard).toContainText('Flow 준비됨');
  await expect(candidateCard).toContainText('바로 시작할 수 있는 Flow가 준비됐어요.');
  await candidateCard.getByRole('button', { name: 'Flow 결과로 이동' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(page.getByLabel('URL 또는 메모')).toHaveValue('https://www.samsungsvc.co.kr/solution/28524');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result.getByRole('link', { name: '저장 전 보기' })).toHaveAttribute('href', '/flow-maps/aircon-filter-cleaning');
  await expect(result.getByTestId('flow-url-start-panel')).toBeVisible();

  await result.getByTestId('url-first-start-date-input').fill('2026-07-06');
  await result.getByLabel('내보내기 방식').selectOption('calendar');
  await result.getByRole('button', { name: '시작하기' }).click();

  await expect(page).toHaveURL(/\/my\?savedMap=aircon-filter-cleaning/);
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  const savedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-aircon-filter-cleaning"]');
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
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3104' });
  await page.goto('/flows');
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
  expect(copiedMarkdown).toContain('아직 바로 시작할 Flow가 없어 초안 요청으로 보관했어요.');
  expect(copiedMarkdown).toContain('초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.');
  expect(copiedMarkdown).not.toContain('handoff');
  expect(copiedMarkdown).not.toContain('Canonical URL');
  expect(copiedMarkdown).not.toContain('Original URL');
  expect(copiedMarkdown).not.toContain('Step');
  expect(copiedMarkdown).not.toContain('sourceTrace');
  expect(copiedMarkdown).not.toContain('source-backed');

  const resolvedCard = candidateList.locator('article').filter({ hasText: '이제 변환된 수학 후보' });
  await expect(resolvedCard).toContainText('Flow 준비됨');
  await resolvedCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(resolvedCard).toContainText('이미 Flow로 준비됐어요.');
  await expect(resolvedCard.getByRole('button', { name: 'Flow 결과로 이동' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('flow finding URL lookup starts a hit with date, option, My Flow save, and markdown export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('Flow가 있어요');
  await expect(result.getByLabel('시작일')).toBeVisible();
  await result.getByLabel('학습 시작일').fill('2026-07-15');
  await result.getByLabel('내보내기 방식').selectOption('markdown');

  const markdownDownloadPromise = page.waitForEvent('download');
  await result.getByRole('button', { name: '메모 문서 받기' }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toBe('middle-school-math-1-flow.md');
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).toBeTruthy();
  const markdown = fs.readFileSync(markdownPath!, 'utf8');
  expect(markdown).toContain('2026-07-15');
  expect(markdown).toContain('middle-school-math-1');

  await result.getByRole('button', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  const directSavedFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
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
  await lookupAfterSave.getByRole('button', { name: 'Flow 찾기' }).click();
  const blockedResult = page.getByTestId('flow-url-lookup-result');
  await expect(blockedResult).toContainText('저장 대기');
  await expect(blockedResult.getByLabel('시작일')).toHaveCount(0);
  await expect(blockedResult.getByRole('button', { name: '시작하기' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('flow finding URL lookup starts a lightweight customized personal copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();

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
  await result.getByLabel('내보내기 방식').selectOption('markdown');

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

  await result.getByRole('button', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-confirmation')).toHaveText('내 Flow에 저장됨');
  await expect(page.getByTestId('my-flow-post-save-artifact')).toContainText('소인수분해');
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toContainText('소인수분해');
  await page.getByTestId('my-flow-view-flow').click();

  await expect(page.getByTestId('my-flow-map-update-review')).toHaveCount(0);
  const personalFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(personalFlow).toBeVisible();
  await expect(personalFlow).toContainText('시험 전 소인수분해만');
  await expect(personalFlow.getByTestId('my-flow-personal-copy-badge')).toContainText('개인 사본');
  await expect(personalFlow.getByTestId('my-flow-overview-progress-summary')).toContainText('전체 0/1 완료');
  const activeSteps = personalFlow.getByTestId('my-flow-whole-flow-outline');
  await expect(activeSteps).toContainText('소인수분해');
  await expect(activeSteps).not.toContainText('정수와 유리수');
  const excludedSteps = personalFlow.getByTestId('my-flow-excluded-steps');
  await expect(excludedSteps).toContainText('제외됨');
  await expect(excludedSteps).toContainText('정수와 유리수');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3104' });
  await personalFlow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  const personalDetail = personalFlow.getByTestId('my-flow-inline-detail').getByTestId('my-flow-item-detail');
  await expect(personalDetail).toBeVisible();
  await expect(personalDetail).toContainText('소인수분해');
  await expect(personalDetail).not.toContainText('정수와 유리수');
  await personalDetail.getByTestId('my-flow-detail-portable-export').locator('summary').click();
  await personalDetail.getByTestId('my-flow-detail-copy-portable-text').click();
  await expect(personalDetail.getByTestId('my-flow-detail-copy-feedback')).toContainText('메모 복사됨');
  const copiedMarkdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMarkdown).toContain('Flow: 시험 전 소인수분해만');
  expect(copiedMarkdown).toContain('소인수분해');
  expect(copiedMarkdown).not.toContain('정수와 유리수');

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
  expect(savedState.itemStates['math-integers-rationals'].skipped).toBe(true);
  expect(savedState.itemStates['math-integers-rationals'].note).toBe('excluded_on_start');
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
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
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
  expect(updatedState.itemStates['math-integers-rationals'].skipped).toBe(true);
  expect(updatedState.itemStates['math-integers-rationals'].note).toBe('excluded_on_start');

  await page.reload();
  await openPostSaveWorkspaceIfPresent(page);
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-map-update-review')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('my flow personal copy settings can readjust saved title date and included steps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();

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
  await result.getByRole('button', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=middle-school-math-1/);
  await openPostSaveWorkspaceIfPresent(page);
  await page.getByTestId('my-flow-view-flow').click();

  const personalFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
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
  await expect(personalFlow.getByTestId('my-flow-overview-progress-summary')).toContainText('전체 0/1 완료');
  const activeSteps = personalFlow.getByTestId('my-flow-whole-flow-outline');
  await expect(activeSteps).toContainText('정수와 유리수');
  await expect(activeSteps).not.toContainText('소인수분해');
  const excludedSteps = personalFlow.getByTestId('my-flow-excluded-steps');
  await expect(excludedSteps).toContainText('소인수분해');
  await expect(excludedSteps).not.toContainText('정수와 유리수');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3104' });
  const firstExecutionRow = personalFlow.getByTestId('my-flow-execution-row-shell').first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  const personalDetail = personalFlow.getByTestId('my-flow-inline-detail').getByTestId('my-flow-item-detail');
  await expect(firstExecutionRow).toContainText('정수와 유리수');
  await personalDetail.getByTestId('my-flow-detail-portable-export').locator('summary').click();
  await personalDetail.getByTestId('my-flow-detail-copy-portable-text').click();
  const copiedMarkdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMarkdown).toContain('Flow: 1학기 앞부분 복습');
  expect(copiedMarkdown).toContain('정수와 유리수');
  expect(copiedMarkdown).not.toContain('소인수분해');

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
  expect(savedState.itemStates['math-prime-factorization'].skipped).toBe(true);
  expect(savedState.itemStates['math-prime-factorization'].note).toBe('excluded_on_start');
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
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
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
  expect(updatedState.itemStates['math-prime-factorization'].skipped).toBe(true);
  expect(updatedState.itemStates['math-integers-rationals']).toBeUndefined();
  await expectNoHorizontalOverflow(page);
});

test('my flow personal copy step detail exports current copy to memo checklist calendar and sheet row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible({ timeout: 15_000 });
  await lookup
    .getByLabel('URL 또는 메모')
    .fill('https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('Flow가 있어요');
  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();

  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await customPanel.getByLabel('저장 이름').fill('8월 이사 핵심만');
  const stepBoxes = customPanel.locator('input[type="checkbox"]');
  const stepCount = await stepBoxes.count();
  expect(stepCount).toBeGreaterThan(1);
  for (let index = 1; index < stepCount; index += 1) {
    await stepBoxes.nth(index).uncheck();
  }
  await result.getByLabel('이사일').fill('2026-08-01');
  await result.getByRole('button', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/my\?savedMap=curated-ajd-moving-d30/);
  await openPostSaveWorkspaceIfPresent(page);
  await page.getByTestId('my-flow-view-flow').click();

  const personalFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="curated-ajd-moving-d30"]');
  await expect(personalFlow).toBeVisible();
  const settingsOpen = personalFlow.getByTestId('my-flow-personal-copy-settings-open');
  await expect(settingsOpen).toHaveText('이사일·이름 바꾸기');
  await expect(settingsOpen).toHaveAccessibleName(/이사 준비 이사일·이름 바꾸기/);
  await settingsOpen.click();
  const settings = personalFlow.getByTestId('my-flow-personal-copy-settings');
  await settings.getByLabel('저장 이름').fill('8월 이사 준비 사본');
  await expect(settings.getByRole('button', { name: '이사일 바꾸기' })).toBeVisible();
  await expect(settings).toContainText('전체 일정 기준');
  await expect(settings).toContainText('해당 할 일만');
  await settings.getByLabel('이사일').fill('2026-08-04');
  await settings.getByRole('button', { name: '저장' }).click();

  const activeSteps = personalFlow.getByTestId('my-flow-whole-flow-outline');
  await expect(activeSteps).toContainText('이사 방식');
  await expect(activeSteps).not.toContainText('주소 변경');
  const excludedSteps = personalFlow.getByTestId('my-flow-excluded-steps');
  await expect(excludedSteps).toContainText('주소 변경');
  await page.getByTestId('my-flow-view-today').click();
  await expect(page.getByTestId('my-flow-now-section')).toContainText('이사 방식');
  await page.getByTestId('my-flow-view-flow').click();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3104' });
  await personalFlow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  let personalDetail = personalFlow.getByTestId('my-flow-inline-detail').getByTestId('my-flow-item-detail');
  await expect(personalDetail).toContainText('이사 방식');
  const readSummary = personalDetail.getByTestId('my-flow-detail-read-summary');
  await readSummary.locator('summary').click();
  const itemEditEntry = readSummary.getByTestId('my-flow-detail-edit-toggle');
  await expect(itemEditEntry).toHaveText('할 일 조정');
  await expect(itemEditEntry).toHaveAccessibleName(/이사 방식.*할 일 조정/);
  await itemEditEntry.click();
  await personalDetail.getByTestId('my-flow-detail-title-input').fill('견적 후보만 먼저 확인');
  await expect(personalDetail.getByLabel('이 할 일 날짜')).toBeVisible();
  await personalDetail.getByTestId('my-flow-detail-date-input').fill('2026-07-07');
  await personalDetail.getByTestId('my-flow-detail-memo').fill('오전 중 후보 2곳만 확인');
  await personalDetail.getByTestId('my-flow-detail-save-changes').click();

  await expect(activeSteps).toContainText('견적 후보만 먼저 확인');
  await personalFlow.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  personalDetail = personalFlow.getByTestId('my-flow-inline-detail').getByTestId('my-flow-item-detail');
  await expect(personalDetail).toContainText('오전 중 후보 2곳만 확인');
  const exportPanel = personalDetail.getByTestId('my-flow-detail-portable-export');
  await exportPanel.locator('summary').click();
  await expect(exportPanel.getByTestId('my-flow-detail-personal-copy-export-note')).toContainText('내 개인 사본 기준');

  await exportPanel.getByTestId('my-flow-detail-copy-portable-text').click();
  let copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Flow: 8월 이사 준비 사본');
  expect(copied).toContain('일정: 2026-07-07');
  expect(copied).toContain('견적 후보만 먼저 확인');
  expect(copied).toContain('오전 중 후보 2곳만 확인');
  expect(copied).not.toContain('주소 변경');

  await exportPanel.getByTestId('my-flow-detail-copy-checklist-text').click();
  copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Flow: 8월 이사 준비 사본');
  expect(copied).toContain('견적 후보만 먼저 확인');
  expect(copied).toContain('- [ ]');
  expect(copied).not.toContain('주소 변경');

  await exportPanel.getByTestId('my-flow-detail-copy-sheet-row').click();
  copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Flow\t할 일\t구간\t날짜');
  expect(copied).toContain('8월 이사 준비 사본\t견적 후보만 먼저 확인\tD-30\t2026-07-07');
  expect(copied).toContain('오전 중 후보 2곳만 확인');
  expect(copied).not.toContain('주소 변경');

  const downloadPromise = page.waitForEvent('download');
  await exportPanel.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260707');
  expect(ics).toContain('SUMMARY:견적 후보만 먼저 확인');
  expect(ics).toContain('Flow: 8월 이사 준비 사본');
  expect(ics).toContain('오전 중 후보 2곳만 확인');
  expect(ics).not.toContain('주소 변경');

  const overlayState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:curated-ajd-moving-d30') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:curated-ajd-moving-d30') || 'null'),
  }));
  const stepOverride = overlayState.snapshot.personalCopy.stepOverridesByFlow['curated-ajd-moving-d30']['moving-d30-method-quotes'];
  expect(stepOverride).toEqual({
    title: '견적 후보만 먼저 확인',
    schedule: { mode: 'fixed_date', date: '2026-07-07' },
    userMemo: '오전 중 후보 2곳만 확인',
  });
  expect(overlayState.persistence.personalCopy.stepOverridesByFlow['curated-ajd-moving-d30']['moving-d30-method-quotes']).toEqual(stepOverride);
  expect(overlayState.persistence.childFlows[0].steps[0].title).toContain('이사 방식');

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const oldEvent = page.locator('.fc-daygrid-day[data-date="2026-07-05"] .fc-event', { hasText: '견적 후보만 먼저 확인' });
  await expect(oldEvent).toHaveCount(0);
  const movedEvent = page.locator('.fc-daygrid-day[data-date="2026-07-07"] .fc-event').first();
  await expect(movedEvent).toHaveAttribute('title', /견적 후보만 먼저 확인/);
  await movedEvent.click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('견적 후보만 먼저 확인');
  await expectNoHorizontalOverflow(page);
});

test('main user routes keep the FlowMe design token rhythm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 250, 248)');

  const mobileTabs = page.getByTestId('platform-mobile-tabs');
  await expect(mobileTabs).toBeVisible();
  await expect(mobileTabs).toHaveCSS('border-color', 'rgb(231, 228, 221)');
  await expect(mobileTabs).toHaveCSS('border-radius', '8px');
  await expect(mobileTabs.getByRole('link', { name: 'Flow 찾기' })).toHaveCSS('background-color', 'rgb(27, 26, 23)');

  const firstCatalogCard = page.getByTestId('flow-map-catalog-card').first();
  await expect(firstCatalogCard).toHaveCSS('border-color', 'rgb(231, 228, 221)');
  await expect(firstCatalogCard).toHaveCSS('border-radius', '16px');
  await expect(firstCatalogCard.getByTestId('flow-map-detail-link')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(firstCatalogCard.getByTestId('flow-map-detail-link')).toHaveCSS('color', 'rgb(54, 84, 255)');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/f/vehicle-inspection-prep');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench).toBeVisible();
  await expect(workbench).toHaveAttribute('data-artifact-surface', 'timeline_calendar');
  await expect(workbench.getByTestId('public-flow-preview-summary')).toHaveText('10개 항목');

  const listCard = workbench.getByTestId('artifact-list-card').first();
  await expect(listCard).toHaveCSS('border-color', 'rgb(221, 228, 224)');
  await expect(listCard).toHaveCSS('border-radius', '8px');

  const calendarCard = workbench.getByTestId('artifact-calendar-card').first();
  await expect(calendarCard).toHaveCSS('border-color', 'rgb(221, 228, 224)');
  await expect(calendarCard).toHaveCSS('border-radius', '8px');

  const exportButton = workbench
    .getByTestId('public-flow-export-secondary-entry')
    .getByRole('button', { name: /메모로 복사|캘린더 파일 받기|시트로 받기/ })
    .first();
  await workbench.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(exportButton).toHaveCSS('border-radius', '6px');
});

test('special public workbench routes keep the FlowMe visual rhythm', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/f/vehicle-inspection-prep',
    '/f/moving-d30-basic',
    '/f/computer-skills-d30-study',
    '/f/new-car-delivery-check',
    '/f/used-car-buying-check',
  ]) {
    await page.goto(route);
    await expect(page.locator('main').first()).toHaveCSS('background-color', 'rgb(245, 247, 246)');
    await expect(page.getByTestId('flow-public-shell')).toBeVisible();
    const creatorAttribution = page.getByTestId('public-flow-creator-attribution');
    await expect(creatorAttribution).toContainText('by ');
    await expect(creatorAttribution.getByRole('link')).toHaveAttribute('href', /^\/u\//);
    await expect(page.getByTestId('platform-mobile-tabs')).toHaveCount(0);
    await expectNoInternalUserSurfaceCopy(page.locator('body'));
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  }

  await page.goto('/f/moving-d30-basic');
  const exportFirstHero = page.getByRole('region', { name: 'Export-first flow hero' });
  await expect(exportFirstHero).toHaveCSS('border-bottom-color', 'rgb(221, 228, 224)');
  await expect(exportFirstHero).toHaveCSS('border-radius', '0px');
  await expect(exportFirstHero.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toHaveCSS('border-radius', '6px');

  await page.goto('/f/new-car-delivery-check');
  const newCarWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(newCarWorkbench.getByTestId('flow-hold-section')).toHaveCSS('border-radius', '8px');
  await expect(newCarWorkbench.getByTestId('artifact-list-card')).toHaveCSS('border-radius', '8px');

  await page.goto('/f/used-car-buying-check');
  const usedCarWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(usedCarWorkbench.getByTestId('used-car-source-bridge')).toHaveCSS('border-radius', '8px');
  await expect(usedCarWorkbench.getByTestId('used-car-decision-result-card')).toHaveCSS('border-radius', '8px');

  await page.goto('/f/computer-skills-d30-study');
  const studyWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(studyWorkbench.getByTestId('artifact-calendar-card')).toHaveCSS('border-radius', '8px');
  await expect(studyWorkbench.getByTestId('artifact-list-card')).toHaveCSS('border-radius', '8px');

  await page.goto('/f/fridge-cleanout-weekly-plan');
  const spreadsheetWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(spreadsheetWorkbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCSS('border-color', 'rgb(221, 228, 224)');
  await expect(spreadsheetWorkbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCSS('border-radius', '8px');
  await expect(spreadsheetWorkbench.getByTestId('mobile-artifact-summary-card')).toHaveCSS('border-radius', '8px');

  await expectPublicFlowRouteClosed(page, '/f/real-thankyou-bubu-home-workout-starter');

  await page.goto('/f/washer-tub-clean-monthly');
  const maintenanceWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(maintenanceWorkbench.getByTestId('maintenance-routine-next-card')).toHaveCSS('border-radius', '8px');
  await expect(maintenanceWorkbench.getByTestId('maintenance-routine-checklist-card')).toHaveCSS('border-radius', '8px');
  await expect(maintenanceWorkbench.getByTestId('maintenance-source-bridge')).toHaveCSS('border-radius', '8px');
});

test('public flow detail uses a share shell until it saves into My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  const hero = page.getByTestId('public-flow-hero');
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toHaveCount(0);
  await expect(page.getByTestId('flow-public-shell')).toBeVisible();
  await expect(page.getByTestId('platform-mobile-tabs')).toHaveCount(0);
  await expect(page.locator('input[type="date"]')).toHaveCount(1);
  await expect(hero.getByTestId('public-flow-primary-setup')).toBeVisible();
  await expect(hero.getByRole('button', { name: '날짜 정하기' })).toBeVisible();
  await expect(hero.getByRole('button', { name: '날짜 없이', exact: true })).toBeVisible();
  await expect(hero.getByRole('button', { name: '예시만 보기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(hero).not.toContainText('검사일 입력으로 시작');
  const stickySave = page.getByTestId('public-flow-mobile-save-cta');
  await expect(stickySave.getByRole('button', { name: '날짜 없이 저장' })).toBeVisible();
  await expectNoInternalUserSurfaceCopy(page.locator('body'));

  await stickySave.getByRole('button', { name: '날짜 없이 저장' }).click();
  await expect(stickySave.getByRole('link', { name: '내 Flow에서 보기' })).toHaveAttribute('href', '/my?savedFlow=vehicle-inspection-prep');
  await stickySave.getByRole('link', { name: '내 Flow에서 보기' }).click();
  await expect(page).toHaveURL('/my?savedFlow=vehicle-inspection-prep');
  await expect(page.getByTestId('my-flow-post-save-artifact')).toBeVisible();
  await expect(page.getByTestId('platform-mobile-tabs')).toBeVisible();
});

test('curated source cards are integrated into Flow finding and open the recommended Flow', async ({ page }) => {
  await page.goto('/flows');

  const catalog = page.getByTestId('flow-map-catalog-section');
  const curatedCards = catalog.locator('[data-testid="flow-map-catalog-card"][data-source-kind="curated-source"]');
  await expect(page.getByTestId('curated-source-catalog-section')).toHaveCount(0);
  await expect(curatedCards).toHaveCount(5);
  await expect(catalog).toContainText('오픽 모의고사 2주/1달 계획표');
  await expect(catalog).not.toContainText('펀맘 공부 루틴');
  await expect(catalog).not.toContainText('확인하며 사용');
  await expect(catalog).not.toContainText('자료 보강 후 시작');
  await expect(catalog).toContainText('먼저 할 일');

  const opicCard = curatedCards.filter({ hasText: '오픽 모의고사 2주/1달 계획표' });
  await expect(opicCard.getByTestId('flow-map-detail-link')).toHaveAttribute('href', '/flow-maps/curated-opic-mock-course');
  await expect(opicCard.getByTestId('flow-card-primary-action')).toHaveText('열어보기');
  await expectCompactCatalogAction(opicCard, opicCard.getByTestId('flow-map-detail-link'));
  await expect(opicCard.getByTestId('flow-map-recommended-flow-link')).toHaveCount(0);
  await expect(opicCard.getByTestId('flow-map-source-link')).toHaveCount(0);

  await opicCard.getByTestId('flow-map-detail-link').scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL('**/flow-maps/curated-opic-mock-course', { timeout: 15_000 }),
    opicCard.getByTestId('flow-map-detail-link').click(),
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

test('curated source Flow Map stays readable at 390px with step memo and source links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/curated-ajd-moving-d30');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap).toContainText('5개 할 일');
  await expect(publicMap).toContainText('체크리스트');
  await expect(publicMap).not.toContainText('묶음');
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(publicMap.getByRole('link', { name: '바로 시작' })).toHaveAttribute('href', '/f/curated-ajd-moving-d30');
  await expect(publicMap.getByTestId('flow-map-public-step-items').first()).toContainText('이사 방식');

  await publicMap.getByText('메모 · 원문').first().click();
  await expect(publicMap).toContainText('이사 체크리스트는 날짜 기준으로 놓치기 쉬운 생활/행정 항목을 나누는 것이 자연스럽습니다.');
  await expect(publicMap).not.toContainText('sourceTrace');
  await expect(publicMap).not.toContainText('AJD moving checklist article');
  await expect(publicMap.getByRole('link', { name: '이 단계 원문 보기' }).first()).toHaveAttribute('href', /ajd\.co\.kr/);

  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});

test('curated source save lands in My Flow with user-facing overdue copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/curated-ajd-moving-d30');
  await page.evaluate(() => window.localStorage.clear());

  await page.getByLabel('이사일').fill('2026-07-31');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=curated-ajd-moving-d30');

  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).not.toContainText('묶음');
  await expect(postSavePanel.getByTestId('my-flow-post-save-receipt-summary')).toContainText('할 일 5개');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(5);
  await expect(postSavePanel).not.toContainText('지난 일정 2026-07-01');
  await expect(postSavePanel).not.toContainText('다음 2026-07-01');
  await postSavePanel.getByTestId('my-flow-post-save-open-first').click();

  const nowSection = page.getByTestId('my-flow-now-section');
  await expect(nowSection).toContainText('지난 할 일');
  await expect(nowSection).toContainText('이사 방식과 견적 예약');
  await expect(nowSection).toContainText('이사 준비');
  await expect(nowSection).not.toContainText('밀린 Step');
  await expect(nowSection).not.toContainText('원문 Step');
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

test('product IA v2 keeps discovery simple and saved execution clear', async ({ page }) => {
  const movingDate = createMovingDateFixture();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '콘텐츠를 일정과 할 일로 저장' })).toBeVisible();
  const mobileTabs = page.getByTestId('platform-mobile-tabs');
  await expect(mobileTabs.locator('a')).toHaveCount(4);
  await expect(mobileTabs.getByRole('link', { name: '캘린더' })).toHaveAttribute('href', '/calendar');
  await expect(page.getByText('대표 Flow Map')).toHaveCount(0);
  await expect(page.getByTestId('home-primary-flow-card')).toHaveAttribute('href', '/flow-maps/moving-d30');
  await expect(page.getByTestId('home-primary-flow-card')).toContainText('열어보기');
  await expect(page.getByTestId('home-primary-flow-card')).not.toContainText('저장 전 보기');
  await expect(page.locator('[data-home-recommendation-card="true"]')).toHaveCount(2);
  await expect(page.locator('[data-home-recommendation-card="true"]').filter({ hasText: '중1 수학 목차 진도' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');
  const homeUrlFirstEntry = page.getByTestId('home-url-first-entry');
  await expect(homeUrlFirstEntry).toBeVisible();
  await expect(homeUrlFirstEntry).toHaveAttribute('href', '/flows');
  await expect(homeUrlFirstEntry).toContainText('URL이나 메모로 Flow 찾기');
  await expect(page.getByTestId('home-secondary-actions')).toHaveCount(0);

  await page.goto('/calendar');
  await expect(page.getByRole('heading', { level: 1, name: '캘린더' })).toBeVisible();
  await expect(page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '캘린더' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('my-flow-empty-state')).toContainText('날짜가 있는 콘텐츠를 먼저 고르세요');
  await expect(page.getByTestId('my-flow-empty-state').getByRole('link', { name: '콘텐츠 고르러 가기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByTestId('my-flow-empty-state').getByRole('link')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-calendar-empty-surface')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));

  await page.goto('/calendar?demo=source-backed');
  await expect(page.getByRole('heading', { level: 1, name: '캘린더' })).toBeVisible();
  await expect(page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '캘린더' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);

  await page.goto('/flows');
  await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
  await expect(page.getByTestId('flow-map-catalog-section').getByRole('heading', { name: '내 상황에 맞는 콘텐츠 고르기' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Flow Map');
  await expect(page.getByText('한 개만 저장').first()).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));

  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveText('그대로 저장');
  await page.getByTestId('flow-map-anchor-input').fill('');
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveText('이사일 입력');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page.getByTestId('flow-map-anchor-input')).toBeFocused();
  await page.getByTestId('flow-map-anchor-input').fill(movingDate.anchor);
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveText('그대로 저장');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await expect(page.getByTestId('my-flow-empty-state')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  const movingPostSave = page.getByTestId('my-flow-post-save-panel');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expect(movingPostSave.getByTestId('my-flow-post-save-confirmation')).toHaveText('내 Flow에 저장됨');
  await expect(movingPostSave.getByTestId('my-flow-post-save-confirmation')).not.toContainText('이사 방식과 견적 후보 정하기');
  await expect(movingPostSave).toContainText('원룸 이사 D-30 일정');
  await expect(movingPostSave.getByRole('heading', { name: '저장된 전체 Flow' })).toBeVisible();
  await expect(movingPostSave).not.toContainText('먼저 할 일부터 열어보세요');
  await expect(movingPostSave).not.toContainText('지난 일정');
  await expect(movingPostSave).not.toContainText('5개 Step');
  await expect(movingPostSave.getByTestId('my-flow-post-save-step')).toHaveCount(5);
  await expect(movingPostSave.getByTestId('my-flow-post-save-open-first')).toContainText('바로 시작');
  await expect(movingPostSave.getByTestId('my-flow-post-save-view-all')).toHaveCount(0);
  await movingPostSave.getByTestId('my-flow-post-save-open-first').click();
  await expectTodaySummaryIsQuietSupport(page);
  await expect(page.getByTestId('my-flow-now-section').locator('h3')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId('my-flow-now-section')).toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-now-section').locator('h3')).not.toContainText('이사 방식과 견적 후보 정하기');
  await expectFirstContinuationTitleNotRepeated(page.getByTestId('my-flow-now-section'));
  await expectTextOccurrenceAtMost(page.getByTestId('my-flow-now-section'), '지난 할 일', 1);
  await expect(page.getByTestId('my-flow-now-section').getByTestId('my-flow-mobile-continuation-card').first()).not.toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText('지난 할 일 중 먼저 정리할 항목입니다.');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]')).toBeVisible();

  await page.goto('/flow-maps/middle-school-math-1');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
  const mathPostSave = page.getByTestId('my-flow-post-save-panel');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expect(mathPostSave.getByTestId('my-flow-post-save-confirmation')).toHaveText('내 Flow에 저장됨');
  await expect(mathPostSave.getByTestId('my-flow-post-save-confirmation')).not.toContainText('1. 소인수분해');
  await expect(mathPostSave).toContainText('중1 수학 목차 진도표');
  await expect(mathPostSave.getByRole('heading', { name: '저장된 전체 Flow' })).toBeVisible();
  await expect(mathPostSave.getByTestId('my-flow-post-save-receipt-summary')).toContainText('할 일 8개');
  await expect(mathPostSave).not.toContainText('8개 Step');
  await expect(mathPostSave.getByTestId('my-flow-post-save-step')).toHaveCount(8);
  await mathPostSave.getByTestId('my-flow-post-save-open-first').click();
  const mathAnytimeSection = page.getByTestId('my-flow-anytime-section');
  await expect(mathAnytimeSection).toContainText('소인수분해');
  await expectTodaySummaryIsQuietSupport(page);
  await expect(mathAnytimeSection.getByTestId('my-flow-execution-row-shell').first()).toContainText('1. 소인수분해');
  await expectTextOccurrenceAtMost(mathAnytimeSection, '1. 소인수분해', 1);
  await expect(mathAnytimeSection).not.toContainText('남은 할 일이 없습니다');
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  const mathDetail = mathAnytimeSection.getByTestId('my-flow-inline-detail');
  await expect(mathDetail).toBeVisible();
  await expect(mathDetail).not.toContainText('확인할 항목');
  await expect(mathDetail).toContainText(/확인 항목|개념 항목/);

  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const publicMobileSaveActions = page.getByTestId('public-flow-mobile-save-cta');
  await publicMobileSaveActions.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ }).click();
  await publicMobileSaveActions.getByRole('link', { name: '내 Flow에서 보기' }).click();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-open-first').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(
    page
      .getByTestId('my-flow-anytime-section')
      .getByRole('button', { name: /자동차검사 기간과 예약 가능일 확인하기 열기 · 자동차검사 준비 · 날짜 없음/ }),
  ).toBeVisible();
  await expect(page.getByTestId('my-flow-anytime-section')).not.toContainText('자동차검사 D-14 준비 Flow');
});

test('my flow and calendar true empty states offer one content-picking action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto('/my');
  const myEmptyState = page.getByTestId('my-flow-empty-state');
  await expect(myEmptyState).toBeVisible();
  await expect(myEmptyState).toContainText('저장할 콘텐츠를 먼저 고르세요');
  await expect(myEmptyState.getByRole('link', { name: '콘텐츠 고르러 가기' })).toHaveAttribute('href', '/flows');
  await expect(myEmptyState.getByRole('link')).toHaveCount(1);
  await expect(myEmptyState.getByRole('button')).toHaveCount(0);
  await expect(myEmptyState).not.toContainText('새 Flow 만들기');
  await expect(myEmptyState).not.toContainText('Flow 찾기');
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

  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await openPostSaveWorkspaceIfPresent(page);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoVisibleSourceBrandSlug(page.locator('body'));

  await page.goto('/calendar');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoVisibleSourceBrandSlug(page.locator('body'));
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toBeVisible();
  await expect(selectedDateGroup).not.toContainText(/Flow\s+일정|지도\s+일정|지도\s+루틴/);

  await page.goto('/flow-maps/middle-school-math-1/creator');
  const creatorMap = page.getByTestId('flow-map-creator');
  await expect(creatorMap).toContainText('사용자에게 저장될 Step');
});

test('p7 guardrail keeps user routes clean and restart prototype in its own bucket', async ({ page }, testInfo) => {
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

  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-open-first').click();
  const movingMyFlow = page.locator('body');
  await expectNoInternalUserSurfaceCopy(movingMyFlow);
  await expectNoVisibleSourceBrandSlug(movingMyFlow);
  await expectNoUserFacingDisplayLeakage(movingMyFlow);
  await expectNoUserFacingRawIsoDate(movingMyFlow);
  await expectFirstContinuationTitleNotRepeated(page.getByTestId('my-flow-now-section'));
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

test('mobile fixed layers keep save actions and final content separated', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/flow-maps/moving-d30', '/flow-maps/middle-school-math-1']) {
    await page.goto(route);
    await expect(page.getByTestId('flow-map-public')).toBeVisible();
    const mobileTabs = page.getByTestId('platform-mobile-tabs');
    const stickySave = page.getByTestId('flow-map-mobile-sticky-save');
    await expect(stickySave).toBeVisible();
    await expectVerticalGap(stickySave, mobileTabs, 0);
    await expectVerticalGapAtMost(stickySave, mobileTabs, 4);
    await expectFixedLayerFootprintAtMost([stickySave, mobileTabs], 120);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const finalFlowMapContent = page.getByTestId('flow-map-execution-outline');
    await expectElementClearsFixedLayerGroup(finalFlowMapContent, [stickySave, mobileTabs], 16);
  }

  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectElementClearsFixedLayer(page.getByTestId('my-flow-post-save-panel'), page.getByTestId('platform-mobile-tabs'), 16);

  await page.goto('/calendar');
  await expect(page.getByTestId('my-flow-empty-state')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay).toContainText(/7월 \d+일/);
  await expect(selectedDay).not.toContainText('선택한 날짜');
  await expect(selectedDay).not.toContainText('0개 루틴');
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toContainText('원룸 이사 D-30 일정');
  await expect(selectedDateGroup).not.toContainText('원룸 이사 D-30 일정 지도');
  await expect(selectedDateGroup.getByRole('button', { name: /열기/ })).toBeVisible();
  await expect(selectedDateGroup.getByTestId('my-flow-selected-date-group-meta')).toHaveCount(1);
  await expect(selectedDateGroup.getByTestId('my-flow-row-timing-chip')).toHaveCount(0);
  await expect(selectedDateGroup.getByTestId('my-flow-row-section-label')).toHaveCount(0);
  await expect(selectedDateGroup).not.toContainText('1개 · 1개 남음');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectElementClearsFixedLayer(page.getByTestId('my-flow-calendar-card'), page.getByTestId('platform-mobile-tabs'), 16);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));

  await page.goto('/f/vehicle-inspection-prep');
  const publicSaveCta = page.getByTestId('public-flow-mobile-save-cta');
  await expect(publicSaveCta).toBeVisible();
  const publicSetup = page.getByTestId('public-flow-primary-setup');
  await scrollElementToViewportEnd(publicSetup);
  await expectElementClearsFixedLayer(publicSetup, publicSaveCta, 16);
  const publicReferenceSummary = page.getByTestId('public-flow-reference-details').locator(':scope > summary');
  await scrollElementToViewportEnd(publicReferenceSummary);
  await expectElementClearsFixedLayer(publicReferenceSummary, publicSaveCta, 16);

  for (const route of ['/f/fridge-cleanout-weekly-plan', '/f/washer-tub-clean-monthly']) {
    await page.goto(route);
    const mobileExportBar = page.getByTestId('mobile-export-bar');
    if (route.includes('fridge-cleanout')) {
      await page.getByTestId('fridge-full-sheet-disclosure').locator('summary').click();
    }
    const finalWorkbenchTarget = route.includes('fridge-cleanout')
      ? page.getByTestId('fridge-mobile-full-sheet-table').locator('tbody tr').last()
      : page.getByTestId('maintenance-routine-next-card');
    await scrollElementToViewportEnd(finalWorkbenchTarget);
    await expect(mobileExportBar).toBeVisible();
    await expectElementClearsFixedLayer(finalWorkbenchTarget, mobileExportBar, 16);
  }
});

test('flow catalog title opens the current public Flow Map page', async ({ page }) => {
  await page.goto('/flows');

  await page.locator('a[href="/flow-maps/moving-d30"]').click();

  await expect(page).toHaveURL(/\/flow-maps\/moving-d30/);
  await expect(page.getByRole('heading', { name: '원룸 이사 D-30 일정' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '원룸 이사 D-30 일정 지도' })).toHaveCount(0);
});

test('user-facing content titles hide trailing Flow suffix while keeping app labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await expect(page.getByRole('link', { name: 'Flow 찾기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '원룸 이사 D-30' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '원룸 이사 D-30 Flow' })).toHaveCount(0);

  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toHaveCount(0);

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByTestId('moving-save-actions').getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByTestId('my-flow-now-section')).toContainText('이사 준비');
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText('이사 D-30 준비 Flow');

  await page.goto('/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.locator('body')).toContainText('이사 준비');
  await expect(page.locator('body')).not.toContainText('이사 D-30 준비 Flow');
  await expect(page.locator('body')).not.toContainText('체크할 Flow');
});

test('representative single flow saves into My Flow execution space', async ({ page }) => {
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByTestId('public-flow-save-actions')).toBeVisible();
  await expect(page.getByText('대표 노출 전 보강 중')).toHaveCount(0);
  await page.getByTestId('public-flow-save-actions').getByRole('button', { name: '날짜 없이 저장' }).click();
  await expect(page.getByTestId('public-flow-save-actions').getByRole('link', { name: '내 Flow에서 보기' })).toBeVisible();

  await page.getByTestId('public-flow-save-actions').getByRole('link', { name: '내 Flow에서 보기' }).click();
  await expect(page).toHaveURL(/\/my/);
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByText('자동차검사 준비').first()).toBeVisible();
  await expect(page.getByText('자동차검사 D-14 준비 Flow').first()).toHaveCount(0);
});

test('public single Flow detail keeps setup and save before one complete artifact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const hero = page.getByTestId('public-flow-hero');
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('heading', { name: '자동차검사 D-14 준비' })).toBeVisible();
  await expect(hero.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toHaveCount(0);
  await expect(hero.getByTestId('public-flow-primary-setup')).toBeVisible();
  await expect(hero.getByTestId('public-flow-primary-setup').locator('input[type="date"]')).toBeVisible();
  await expect(hero.getByRole('button', { name: '날짜 정하기' })).toBeVisible();
  await expect(hero.getByRole('button', { name: '날짜 없이', exact: true })).toBeVisible();
  await expect(hero.getByRole('button', { name: '예시만 보기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('input[type="date"]')).toHaveCount(1);
  await expect(hero).not.toContainText('검사일 입력으로 시작');
  await expect(hero.getByTestId('public-flow-artifact-preview')).toHaveCount(0);
  await expect(hero.getByTestId('public-flow-save-actions')).toBeHidden();
  const artifact = page.getByLabel('Flow artifact workbench');
  await expect(artifact).toBeVisible();
  await expect(artifact).toContainText('자동차검사 기간과 예약 가능일 확인하기');
  await expect(artifact.getByRole('checkbox')).toHaveCount(0);
  const stickySave = page.getByTestId('public-flow-mobile-save-cta');
  await expect(stickySave.getByRole('button', { name: '날짜 없이 저장' })).toBeVisible();
  await expectNoInternalUserSurfaceCopy(hero);

  const inputTop = await hero.getByTestId('public-flow-primary-setup').evaluate((element) => element.getBoundingClientRect().top);
  const artifactTop = await artifact.evaluate((element) => element.getBoundingClientRect().top);
  const heroBottom = await hero.evaluate((element) => element.getBoundingClientRect().bottom);

  expect(inputTop).toBeLessThan(560);
  expect(artifactTop).toBeLessThan(700);
  expect(heroBottom).toBeLessThan(844);

  await stickySave.getByRole('button', { name: '날짜 없이 저장' }).click();
  await expect(stickySave.getByRole('link', { name: '내 Flow에서 보기' })).toBeVisible();
});

test('public save setup exposes date intent and formats user-facing dates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/vehicle-inspection-prep');
  const vehicleSetup = page.getByTestId('public-flow-primary-setup');
  await expect(vehicleSetup).toBeVisible();
  await expect(vehicleSetup.getByRole('button', { name: '입력' })).toBeVisible();
  await expect(vehicleSetup.getByRole('button', { name: '날짜 정하기' })).toBeVisible();
  await expect(vehicleSetup.getByRole('button', { name: '날짜 없이', exact: true })).toBeVisible();
  await expect(vehicleSetup.getByRole('button', { name: '예시만 보기' })).toBeVisible();
  await vehicleSetup.locator('input[type="date"]').fill('2026-07-27');
  await vehicleSetup.getByRole('button', { name: '입력' }).click();
  await expect(vehicleSetup).toContainText('7월 27일');
  await expectNoUserFacingRawIsoDate(vehicleSetup);

  await page.goto('/f/moving-d30-basic');
  const movingSetup = page.getByRole('region', { name: 'Export-first flow hero' });
  await expect(movingSetup.getByRole('button', { name: '입력' })).toBeVisible();
  await expect(movingSetup.getByRole('button', { name: '날짜 정하기' })).toBeVisible();
  await expect(movingSetup.getByRole('button', { name: '날짜 없이', exact: true })).toBeVisible();
  await expect(movingSetup.getByRole('button', { name: '예시만 보기' })).toBeVisible();
});

test('special workbench date labels avoid raw ISO dates in primary mobile cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/washer-tub-clean-monthly');
  const washerNextCard = page.getByTestId('maintenance-routine-next-card');
  await expect(washerNextCard).toContainText(/월 \d+일/);
  await expectNoUserFacingRawIsoDate(washerNextCard);

  await page.goto('/f/fridge-cleanout-weekly-plan');
  const fridgeSummary = page.getByTestId('mobile-artifact-summary-card');
  await expect(fridgeSummary).toContainText(/월 \d+일/);
  await expectNoUserFacingRawIsoDate(fridgeSummary);
});

test('fridge cleanout mobile starts with one active inventory row before the full sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/fridge-cleanout-weekly-plan');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  const sheetCard = workbench.getByTestId('artifact-log-table-spreadsheet');
  await expect(sheetCard).toBeVisible();

  const activeRow = workbench.getByTestId('fridge-mobile-active-row');
  await expect(activeRow).toBeVisible();
  await expect(activeRow.getByTestId('fridge-active-row-title')).toHaveCSS('-webkit-line-clamp', '2');
  await expect(activeRow).toContainText('우선 재료');
  await expect(activeRow).toContainText('메뉴 후보');
  await expect(activeRow).toContainText('장보기 보류');
  await expect(activeRow).toContainText('상태');
  await expect(activeRow.locator('input, textarea, select')).toHaveCount(4);

  const visibleRowsBeforeOpen = await sheetCard.locator('tbody tr').evaluateAll((rows) =>
    rows.filter((row) => row.getClientRects().length > 0).length,
  );
  expect(visibleRowsBeforeOpen).toBeLessThanOrEqual(1);

  const fullSheet = workbench.getByTestId('fridge-full-sheet-disclosure');
  await expect(fullSheet).toBeVisible();
  await fullSheet.locator('summary').click();
  await expect(workbench.getByTestId('fridge-mobile-full-sheet-table')).toBeVisible();
  await expect(workbench.getByTestId('fridge-mobile-full-sheet-table').locator('tbody tr')).toHaveCount(7);
});

test('special workbench routes do not repeat setup as an inline start CTA', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const routes = [
    '/f/fridge-cleanout-weekly-plan',
    '/f/washer-tub-clean-monthly',
    '/f/new-car-delivery-check',
    '/f/used-car-buying-check',
  ];

  for (const route of routes) {
    await page.goto(route);

    await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();
    await expect(page.getByText(/입력으로 시작/)).toHaveCount(0);
  }
});

test('fridge and washer setup path is a visible input action before browse navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/f/fridge-cleanout-weekly-plan', '/f/washer-tub-clean-monthly']) {
    await page.goto(route);

    const setup = page.getByTestId('public-flow-primary-setup');
    await expect(setup).toBeVisible();
    await expect(setup.getByTestId('public-flow-anchor-action-row')).toBeVisible();
    await expect(setup.getByTestId('public-flow-anchor-input')).toBeVisible();
    await expect(setup.getByRole('button', { name: '입력' })).toBeVisible();
    await expect(page.getByTestId('flow-public-secondary-browse-link')).toBeVisible();
  }
});

test('public no-anchor Flow detail opens directly into one read-only artifact on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/used-car-buying-check');

  const hero = page.getByTestId('public-flow-hero');
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('heading', { name: '중고차 구매 현장 점검' })).toBeVisible();
  await expect(hero.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toHaveCount(0);
  await expect(hero.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await expect(hero.getByTestId('public-flow-artifact-preview')).toHaveCount(0);
  const artifact = page.getByLabel('Flow artifact workbench');
  await expect(artifact).toContainText('총예산을 차량가');
  await expect(artifact.getByRole('checkbox')).toHaveCount(0);
  await expectNoInternalUserSurfaceCopy(hero);

  const firstActionTop = await artifact.evaluate((element) => element.getBoundingClientRect().top);
  const heroBottom = await hero.evaluate((element) => element.getBoundingClientRect().bottom);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);

  expect(firstActionTop).toBeLessThan(720);
  expect(heroBottom).toBeLessThan(820);
  expect(hasHorizontalOverflow).toBe(false);
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

  await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
  await expect(page.getByTestId('flow-map-catalog-section').getByTestId('single-flow-catalog-card')).toHaveCount(0);
  await expect(page.getByText('필터 조정')).toHaveCount(0);
  await expect(page.getByLabel('태그')).toHaveCount(0);
  await expect(page.getByText('#돈이 걸린 결정').first()).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '중고차 구매 현장 점검 Flow' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '전세계약 전 서류 체크' })).toHaveCount(0);
});

test('my flow workspace separates copied or drafted flows from public discovery', async ({ page }) => {
  await page.goto('/my');

  await expect(page).toHaveTitle(/내 Flow/);
  await expect(page.getByRole('heading', { name: '내 Flow', exact: true })).toBeVisible();
  await expect(page.getByText('Creator Studio')).toHaveCount(0);
  await expect(page.getByText('사용자가 곧 제작자입니다')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
  await expect(page.getByText('아직 만든 내 버전이 없습니다')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '스튜디오' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();
  await expect(page.getByTestId('my-flow-empty-state').getByRole('link', { name: '콘텐츠 고르러 가기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByTestId('my-flow-empty-state').getByRole('link')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);

  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-07-15');
  await page.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ }).click();

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByTestId('my-flow-single-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('이사 준비');
  await expect(page.getByTestId('my-flow-overview-card').getByTestId('my-flow-overview-progress-summary')).toHaveCount(0);
  await expect(page.locator('a[href="/f/moving-d30-basic"]').first()).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox')).toHaveCount(0);

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-overview-card')).toContainText('이사 준비');
  await expect(page.getByTestId('my-flow-overview-card').getByTestId('my-flow-overview-progress-summary')).toHaveCount(0);
  await expect(page.locator('a[href="/f/moving-d30-basic"]').first()).toBeVisible();

  await page.goto('/f/moving-d30-basic');
  let publicExport = page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('public-flow-export-secondary-entry');
  await publicExport.getByTestId('public-flow-export-secondary-toggle').click();
  await publicExport.getByRole('button', { name: /내 버전/ }).click();
  await expect(page).toHaveURL(/\/flows\/.+\/edit/);

  await page.goto('/my');
  await expect(page.getByText('발행 Flow')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /초안/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toHaveCount(0);
  await page.getByRole('link', { name: '스튜디오' }).click();
  await expect(page.getByRole('heading', { name: '나의 스튜디오' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
  await expect(page.getByText('채널 콘텐츠')).toHaveCount(0);
  await expect(page.getByText('공개 콘텐츠', { exact: true })).toHaveCount(0);
  await expect(page.getByText('초안').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
});

test('creator profile aggregates creator flows from byline links', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await page.getByRole('link', { name: 'by 웨딩 체크메이트' }).click();

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
  await expect.poll(() => page.evaluate((slug) => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const bundle = bundles.find((entry: { flow?: { slug?: string } }) => entry.flow?.slug === slug);
    return {
      saved: Boolean(window.localStorage.getItem(`flow:saved:${slug}`)),
      status: bundle?.flow?.status,
      retired: Boolean(bundle?.flow?.tags?.includes('retired-personal-copy')),
    };
  }, retiredSlug)).toEqual({ saved: true, status: 'draft', retired: true });
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('책 한 권 완독 실천');
  const migratedState = await page.evaluate((slug) => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const bundle = bundles.find((entry: { flow?: { slug?: string } }) => entry.flow?.slug === slug);
    return {
      status: bundle?.flow?.status,
      tags: bundle?.flow?.tags ?? [],
      checks: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_checks_${slug}`) || '{}'),
      itemStates: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_item_state_${slug}`) || '{}'),
    };
  }, retiredSlug);
  expect(migratedState.status).toBe('draft');
  expect(migratedState.tags).toContain('retired-personal-copy');
  expect(migratedState.checks['book-finish-old-item']).toBe(true);
  expect(migratedState.itemStates['book-finish-old-item'].note).toBe('완독 기록은 보존해야 합니다.');

  await page.goto('/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('책 한 권 완독 실천');

});

test('real source public flow exposes source QA metadata and target metadata', async ({ page }) => {
  await page.goto('/f/real-samsung-aircon-seasonal-care');
  await openPublicReferenceDetailsIfPresent(page);

  const sourceCard = getVisiblePublicSourceCard(page);
  await expect(sourceCard).toContainText('7월 12일 원문 확인 기록');
  await sourceCard.locator('summary').click();
  await expect(page.getByText('원문에서 옮긴 방식:')).toBeVisible();
  await expect(page.getByText('개별 원문 페이지')).toBeVisible();
  await expect(page.getByText('1. 목표일 입력하기')).toBeVisible();
  await expect(page.getByText('원문과 근거')).toBeVisible();
});

test('source currentness retires the stale pet duplicate and separates appliance jobs', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_OVERLAP_CURRENTNESS_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });

  await expectPublicFlowRouteClosed(page, '/f/pet-registration-basic');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-retired-pet-legacy-mobile.png`, fullPage: true });

  await page.goto('/f/real-pet-registration-check');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('h1')).toContainText('반려견 동물등록 준비');
  await expect(page.locator('body')).toContainText('등록 방식과 대행기관 확인');
  await expect(page.locator('body')).not.toContainText('인식표 방식');
  const petSourceCard = getVisiblePublicSourceCard(page);
  await expect(petSourceCard).toContainText('7월 12일 원문 확인 기록');
  await petSourceCard.locator('summary').click();
  await expect(petSourceCard.getByRole('link', { name: '원문 보기' })).toHaveAttribute(
    'href',
    'https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66',
  );
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-current-pet-registration-mobile.png`, fullPage: true });

  await page.goto('/f/samsung-aircon-seasonal-check');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('h1')).toContainText('삼성 에어컨 계절 전 점검');
  await expect(page.locator('body')).toContainText('냉방 18도로 10분 이상 시험 가동하기');
  await expect(page.locator('body')).not.toContainText('물 맺힘이나 누수 흔적');
  const selfCheckSourceCard = getVisiblePublicSourceCard(page);
  await selfCheckSourceCard.locator('summary').click();
  await expect(selfCheckSourceCard).toContainText('2026년 2월 27일 원문 게시');
  await expect(selfCheckSourceCard.getByRole('link', { name: '원문 보기' })).toHaveAttribute(
    'href',
    'https://www.samsungsvc.co.kr/solution/2002378?assess=N',
  );
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-aircon-self-check-mobile.png`, fullPage: true });

  await page.goto('/f/real-samsung-aircon-seasonal-care');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('h1')).toContainText('삼성 에어컨 전문 세척 예약 준비');
  await expect(page.locator('body')).toContainText('전문 세척 필요 신호 기록');
  const careSourceCard = getVisiblePublicSourceCard(page);
  await careSourceCard.locator('summary').click();
  await expect(careSourceCard.getByRole('link', { name: '원문 보기' })).toHaveAttribute(
    'href',
    'https://www.samsungsvc.co.kr/info/maintenance',
  );
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-aircon-professional-care-mobile.png`, fullPage: true });

  await page.goto('/f/real-samsung-washer-filter-care');
  await expect(page.locator('h1')).toContainText('삼성 비스포크 AI 콤보 배수필터 청소');
  await expect(page.locator('body')).toContainText('필터와 내부 이물질 제거');
  await expect(page.getByTestId('maintenance-routine-next-card')).toContainText('주 1회');
  await expect(page.getByTestId('maintenance-routine-next-card')).toContainText('다음 배수필터 청소일');
  await expect(page.getByTestId('maintenance-routine-checklist-card')).toContainText('배수필터를 열기 전에 확인할 것');
  await expect(page.getByTestId('routine-session-grid-card')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/05-washer-ai-combo-drain-filter-mobile.png`, fullPage: true });

  await page.goto('/f/samsung-washer-filter-cleaning');
  await expect(page.locator('h1')).toContainText('삼성 미세플라스틱 저감장치 필터 청소');
  await expect(page.locator('body')).toContainText('필터 LED 확인, 전원 차단, 물세척 금지');
  await expect(page.getByLabel('시작일')).toHaveCount(0);
  await expect(page.getByTestId('routine-session-grid-card')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/06-washer-microfiber-filter-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/u/samsung-service');
  await expect(page.locator('a[href="/f/real-samsung-aircon-seasonal-care"]').first()).toContainText('전문 세척 예약 준비');
  await expect(page.locator('a[href="/f/real-samsung-washer-filter-care"]').first()).toContainText('비스포크 AI 콤보');
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/07-samsung-distinct-jobs-wide.png`, fullPage: true });
});

test('vehicle inspection and computer study expose current source scope', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_VEHICLE_STUDY_CURRENTNESS_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('body')).toContainText('차량번호와 예약 정보 확인하기');
  await expect(page.locator('body')).not.toContainText('자동차등록증');
  const vehicleSource = getVisiblePublicSourceCard(page);
  await expect(vehicleSource).toContainText('7월 12일 원문 확인 기록');
  await vehicleSource.locator('summary').click();
  await expect(vehicleSource.getByRole('heading', { name: 'TS한국교통안전공단 정기검사 대상·기준·유효기간 안내' })).toBeVisible();
  await expect(vehicleSource.getByRole('link', { name: '원문 보기' })).toHaveAttribute(
    'href',
    'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200',
  );
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-vehicle-current-source-mobile.png`, fullPage: true });

  await page.goto('/f/computer-skills-d30-study');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.getByRole('heading', { name: '컴퓨터활용능력 1급 D-30 학습' })).toBeVisible();
  await expect(page.locator('body')).toContainText('2026 컴퓨터활용능력 1급 교재');
  await expect(page.locator('body')).toContainText('2027년 이후 시험');
  const studySource = getVisiblePublicSourceCard(page);
  await expect(studySource).toContainText('2025년 10월 15일 원문 게시');
  await expect(studySource).toContainText('7월 12일 원문 확인 기록');
  const environmentDetail = page
    .getByTestId('artifact-list-card')
    .getByText('실기 프로그램 환경 점검하기', { exact: true })
    .locator('xpath=../..')
    .locator('details');
  await environmentDetail.locator('summary').click();
  await expect(environmentDetail).toContainText('MS Office LTSC Professional Plus 2021');
  await expect(environmentDetail.getByRole('link', { name: '대한상공회의소 컴퓨터활용능력 시험안내' })).toHaveAttribute(
    'href',
    'https://license.korcham.net/co/examguide.do',
  );
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-computer-2026-scope-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/f/vehicle-inspection-prep');
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-vehicle-current-source-wide.png`, fullPage: true });

  await page.goto('/f/computer-skills-d30-study');
  await expect(page.locator('body')).toContainText('2027년 이후 시험');
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-computer-2026-scope-wide.png`, fullPage: true });
});

test('vehicle inspection route keeps reservation and result memo beside the timeline', async ({ page }) => {
  await page.goto('/f/vehicle-inspection-prep');

  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자동차검사 D-14 준비 Flow' })).toHaveCount(0);
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(workbench.getByText('검사 예약·결과 후속 메모')).toHaveCount(0);
  await expect(workbench.getByLabel('검사 예약 정보')).toHaveCount(0);
  await expect(workbench.getByText('검사 결과 후속 memo gap 검토가 필요합니다.')).toHaveCount(0);
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

test('public moving flow calculates dates without exposing execution progress before save', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByText('1. 이사일 입력하기')).toBeVisible();
  await expect(page.getByText('예시 날짜로 미리보기')).toBeVisible();
  await expect(page.getByText('Flow 구성', { exact: true })).toBeVisible();
  await expect(page.getByTestId('artifact-list-card').getByRole('heading', { name: '다가오는 할 일' })).toBeVisible();
  await expect(page.getByText('이사 방식 정하기').first()).toBeVisible();
  await expect(page.getByText('2. 실행 항목 체크')).toHaveCount(0);
  await expect(page.getByText('3. 내보내기와 백업')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(page.getByText('내보내기와 백업')).toHaveCount(0);
  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  let flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await expect(flowExport).not.toHaveAttribute('open', '');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(page.getByText('by FLOW 큐레이션팀')).toBeVisible();
  await expect(page.getByText('베타 운영 중').first()).toHaveCount(0);
  await page.getByLabel('이사일').fill('2026-07-15');
  await expect(page.getByLabel('이사일')).toHaveValue('2026-07-15');
  await expect(page.getByTestId('public-flow-result-promise')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 할 일' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'D-30 큰 준비', exact: true })).toHaveCount(0);
  await expect(page.getByText(/6월 15일/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '주별 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '달력 보기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card').getByRole('heading', { name: '일정 한눈에 보기' })).toBeVisible();
  await expect(page.getByText('월', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('일', { exact: true }).first()).toBeVisible();

  await expect(workbench.getByRole('checkbox')).toHaveCount(0);
  await expect(workbench.getByTestId('public-flow-preview-summary')).toHaveText('24개 항목');

  const downloadPromise = page.waitForEvent('download');
  workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByRole('button', { name: /시트로 받기/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('moving-d30-basic.xlsx');
});

test('moving flow opens with an export-first calendar preview hero', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const hero = page.getByRole('region', { name: 'Export-first flow hero' });
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('heading', { name: '이사일을 정하면 할 일 날짜가 맞춰집니다' })).toBeVisible();
  await expect(hero.getByRole('heading', { name: '이사 D-30 준비' })).toHaveCount(0);
  await expect(hero.getByText('이렇게 일정이 잡혀요')).toBeVisible();

  await hero.getByLabel('이사일').fill('2026-06-22');
  await expect(hero.getByText('5월 23일', { exact: true })).toBeVisible();
  await expect(hero.getByText('이사 방식 정하기')).toBeVisible();
  await expect(hero.getByText('6월 12일', { exact: true })).toBeVisible();
  await expect(hero.getByText('우편물/카드/은행 주소 변경하기')).toBeVisible();
  await expect(hero.getByText('6월 22일', { exact: true })).toBeVisible();
  await expect(hero.getByText('전기/가스/수도/관리비 정산하기')).toBeVisible();
  await expect(hero.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();

  const firstCard = page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card');
  await expect(firstCard.getByText('이사 방식 정하기')).toBeVisible();
  const heroBox = await hero.boundingBox();
  const listBox = await firstCard.boundingBox();
  expect(heroBox?.y ?? 0).toBeLessThan(listBox?.y ?? 0);
});

test('moving mobile saves to My Flow before external export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-06-26');
  const saveActions = page.getByTestId('moving-save-actions');
  await expect(saveActions.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();
  await saveActions.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ }).click();

  await expect(page.getByText('내 Flow에 담았어요')).toBeVisible();
  await expect(saveActions.getByRole('link', { name: '내 Flow에서 보기' })).toHaveAttribute('href', '/my?savedFlow=moving-d30-basic');
  await expect(saveActions.getByRole('button', { name: /파일 받기|메모로 복사/ })).toHaveCount(0);
  const flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: '캘린더 파일 받기' })).toBeVisible();
  await expect(flowExport.getByRole('button', { name: '시트로 받기' })).toBeVisible();
  await expect(flowExport.getByRole('button', { name: '메모로 복사' })).toBeVisible();

  await saveActions.getByRole('link', { name: '내 Flow에서 보기' }).click();
  await expect(page).toHaveURL('/my?savedFlow=moving-d30-basic');
  const postSave = page.getByTestId('my-flow-post-save-panel');
  await expect(postSave).toBeVisible();
  await postSave.getByTestId('my-flow-post-save-open-first').click();
  await expect(page.getByTestId('my-flow-view-today')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();
  await expect(page.getByTestId('my-flow-single-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-now-section')).toContainText('이사 준비');
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText('이사 D-30 준비 Flow');
});

test('my flow management uses today and flow locally while calendar is global', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-06-26');
  await page.getByTestId('moving-save-actions').getByRole('button', { name: '내 Flow에 저장' }).click();

  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '내 Flow', exact: true })).toBeVisible();
  await expect(page.getByTestId('my-flow-view-today')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByRole('heading', { name: '필요한 Flow만 열기' })).toBeVisible();

  await page.goto('/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toBeVisible();

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const movingFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
  const firstExecutionRow = movingFlow.getByTestId('my-flow-execution-row-shell').first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveAttribute('aria-pressed', 'true');
  const inlineDetail = movingFlow.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
  await expect(inlineDetail).toBeVisible();
  await firstExecutionRow.getByTestId('my-flow-task-complete-control').check();
  await expect(firstExecutionRow.getByTestId('my-flow-task-complete-control')).toBeChecked();
  await expect(firstExecutionRow.getByTestId('my-flow-task-complete-control')).toHaveAccessibleName(/완료 취소/);
});

test('my flow today puts the executable slot before the summary on mobile', async ({ page }) => {
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

  await page.goto('/my');

  const nowSection = page.getByTestId('my-flow-now-section');
  await expect(nowSection).toBeVisible();
  await expectTodaySummaryIsQuietSupport(page);
  await expect(nowSection).toContainText('지난 할 일');
  await expectTextOccurrenceAtMost(nowSection, '지난 할 일', 1);
  await expect(nowSection).not.toContainText('남은 할 일이 없습니다');
  await expect(nowSection.getByTestId('my-flow-mobile-continuation-card').first()).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(nowSection.getByTestId('my-flow-mobile-continuation-complete').first()).toBeVisible();
});

test('my flow today exposes inline completion without a separate today status frame', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-06-03T09:00:00+09:00') });
  await page.addInitScript(() => {
    window.localStorage.clear();
    const savedAt = '2026-06-03T00:00:00.000Z';
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-02',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-06-02',
    }));
  });

  await page.goto('/my');

  const nowSection = page.getByTestId('my-flow-now-section');
  await expect(nowSection).toBeVisible();
  await expect(page.getByTestId('my-flow-today-summary')).toHaveCount(0);
  await expect(nowSection).toContainText('오늘');
  await expect(nowSection.getByTestId('my-flow-today-remaining-count')).toHaveText(/오늘 \d+개 남음/);
  await expect(nowSection.getByTestId('my-flow-inline-detail')).toHaveCount(0);

  const firstRunnableRow = nowSection.getByTestId('my-flow-mobile-continuation-card').first();
  const completeCheckbox = firstRunnableRow.getByTestId('my-flow-task-complete-control');
  await expect(completeCheckbox).toBeVisible();
  await expect(completeCheckbox).toHaveAttribute('type', 'checkbox');
  await expect(completeCheckbox).toHaveAttribute('aria-label', /완료 체크$/);
  await expect(firstRunnableRow.getByTestId('my-flow-mobile-continuation-flow-context')).not.toContainText(/\d+\/\d+\s*완료/);

  await completeCheckbox.click();
  await expect(nowSection.getByTestId('my-flow-inline-detail')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-today-completed-list')).toBeVisible();
  await expect(page.getByTestId('my-flow-today-completed-list')).toContainText('완료 1');
  await expect(page.getByTestId('my-flow-today-completed-toggle')).toHaveAccessibleName('완료한 할 일 1개 보기');
});

test('my flow today dedupes rows when today overdue and next queues coexist on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
  await page.addInitScript(() => {
    window.localStorage.clear();
    const savedAt = '2026-05-28T00:00:00.000Z';
    const saveFlow = (slug: string, anchor?: string) => {
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) {
        window.localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({
          mode: 'custom',
          anchor,
        }));
      }
    };

    saveFlow('moving-d30-basic', '2026-06-26');
    saveFlow('computer-skills-d30-study', '2026-06-27');
    saveFlow('used-car-buying-check');
  });

  await page.goto('/my');

  const nowSection = page.getByTestId('my-flow-now-section');
  const upcomingSection = page.getByTestId('my-flow-upcoming-list');
  const overdueSection = page.getByTestId('my-flow-overdue-list');
  await expect(nowSection).toBeVisible();
  await expectTodaySummaryIsQuietSupport(page);
  await expect(upcomingSection).toBeVisible();
  await expect(overdueSection).toBeVisible();
  await expect(overdueSection).toContainText('지난 할 일');
  await expect(page.locator('body')).not.toContainText(/밀린 할 일|지난 일정|밀림/);
  await expect(nowSection.getByTestId('my-flow-mobile-continuation-card').first()).toHaveAttribute('data-flow-slug', 'computer-skills-d30-study');
  await expect(upcomingSection.getByTestId('my-flow-upcoming-preview').first()).toBeVisible();
  await expect(upcomingSection.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(overdueSection.getByTestId('my-flow-overdue-open-sheet')).toBeVisible();

  const visibleQueueKeys = await page
    .locator(
      '[data-testid="my-flow-now-section"] [data-testid="my-flow-mobile-continuation-card"], ' +
      '[data-testid="my-flow-upcoming-list"] [data-testid="my-flow-upcoming-preview-shell"]',
    )
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-row-key')).filter(Boolean));
  expect(visibleQueueKeys.length).toBeGreaterThanOrEqual(2);
  expect(new Set(visibleQueueKeys).size).toBe(visibleQueueKeys.length);

  await overdueSection.getByTestId('my-flow-overdue-open-sheet').click();
  const overdueSheet = page.getByTestId('my-flow-status-sheet');
  await expect(overdueSheet).toBeVisible();
  await expect(overdueSheet).toContainText('지난 할 일');
  await expect(overdueSheet).not.toContainText(/밀린 할 일|지난 일정|밀림/);
  const overdueGroups = overdueSheet.getByTestId('my-flow-status-sheet-group');
  await expect(overdueGroups.first()).toBeVisible();
  await expect(overdueGroups.first()).toContainText('5월 27일');
  await expect(overdueGroups.first()).toContainText('기준 D-30');
  await expect(overdueGroups.first()).toContainText('이사 준비');
  await expectTextOccurrenceAtMost(overdueGroups.first(), '5월 27일', 1);
  await expectTextOccurrenceAtMost(overdueGroups.first(), '기준 D-30', 1);
  const firstOverdueGroupRow = overdueGroups.first().getByTestId('my-flow-status-sheet-row').first();
  await expect(firstOverdueGroupRow).not.toContainText('5월 27일');
  await expect(firstOverdueGroupRow).not.toContainText('기준 D-30');
  await expect(firstOverdueGroupRow).not.toContainText('이사 준비');
  const overdueKeys = await overdueSheet
    .getByTestId('my-flow-status-sheet-row')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-row-key')).filter(Boolean));
  expect(overdueKeys.length).toBeGreaterThan(0);
  const firstOverdueSheetOpen = firstOverdueGroupRow.locator('button').filter({ hasText: '열기' });
  await expect(firstOverdueSheetOpen).toHaveText('열기');
  await expect(firstOverdueSheetOpen).toHaveAttribute('aria-label', /5월 27일.*이사 준비.*기준 D-30.*열기$/);
  await expect(firstOverdueSheetOpen).not.toContainText('항목 열기');
  const allQueueKeys = [...visibleQueueKeys, ...overdueKeys];
  expect(new Set(allQueueKeys).size).toBe(allQueueKeys.length);
  await testInfo.attach('p7-02-my-flow-multi-queue-row-keys', {
    body: JSON.stringify({ visibleQueueKeys, overdueKeys }, null, 2),
    contentType: 'application/json',
  });

  await overdueSheet.getByRole('button', { name: '닫기', exact: true }).click();
  await expectTextOccurrenceAtMost(nowSection, '필기와 실기 시험 범위 나누기', 1);
  await expectTextOccurrenceAtMost(nowSection, '오늘 할 일', 1);
  await expectNoUserFacingRawIsoDate(page.locator('body'));
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
});

test('my flow long saved list keeps final mobile rows and actions above fixed navigation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
  await page.addInitScript(() => {
    window.localStorage.clear();
    const savedAt = '2026-05-28T00:00:00.000Z';
    const saveFlow = (slug: string, selectedArtifactMode: 'calendar' | 'checklist' | 'sheet', anchor?: string) => {
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode,
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) {
        window.localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({
          mode: 'custom',
          anchor,
        }));
      }
    };

    saveFlow('moving-d30-basic', 'calendar', '2026-06-26');
    saveFlow('computer-skills-d30-study', 'calendar', '2026-06-27');
    saveFlow('english-study-30day-routine', 'calendar', '2026-05-27');
    saveFlow('fridge-cleanout-weekly-plan', 'sheet', '2026-05-28');
    saveFlow('used-car-buying-check', 'checklist');
    saveFlow('new-car-delivery-check', 'checklist');
  });

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();

  const mobileTabs = page.getByTestId('platform-mobile-tabs');
  const mobileHub = page.getByTestId('my-flow-mobile-flow-hub');
  await expect(mobileHub).toBeVisible();
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).toContainText(/\d+개 저장/);
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).not.toContainText(/\d+개 남음/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(4);
  const compactStructureTexts = (await page.getByTestId('my-flow-mobile-structure-row').allInnerTexts()).join(' ');
  expect(compactStructureTexts).not.toMatch(/일정 흐름|체크 흐름|반복 흐름/);
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText('2개 더 보기');
  const overdueCompactRow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]');
  await expect(overdueCompactRow).toContainText('지난 할 일');
  await expect(overdueCompactRow).not.toContainText('다음 할 일');

  const inventoryOpenButton = page.getByTestId('my-flow-mobile-inventory-open');
  await inventoryOpenButton.scrollIntoViewIfNeeded();
  await expectElementClearsFixedLayer(inventoryOpenButton, mobileTabs, 12);

  const lastCompactRow = page.getByTestId('my-flow-mobile-structure-row').last();
  await lastCompactRow.scrollIntoViewIfNeeded();
  await lastCompactRow.getByTestId('my-flow-mobile-structure-open').click();
  await expect(lastCompactRow.getByTestId('my-flow-mobile-structure-step-list')).toBeVisible();
  await expect(lastCompactRow.getByTestId('my-flow-mobile-structure-step-row').first()).toBeVisible();
  await lastCompactRow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  const compactInlineDetail = lastCompactRow.getByTestId('my-flow-mobile-structure-inline-detail');
  await expect(compactInlineDetail).toBeVisible();
  await expectElementClearsFixedLayer(compactInlineDetail, mobileTabs, 12);

  await inventoryOpenButton.click();
  const inventorySheet = page.getByTestId('my-flow-inventory-sheet');
  const inventoryPanel = inventorySheet.locator('section');
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(6);
  const firstInventoryRow = inventorySheet.getByTestId('my-flow-group-row').first();
  await expect(firstInventoryRow.getByTestId('my-flow-inventory-progress-summary')).toContainText(/전체 \d+\/\d+ 완료/);
  await expect(firstInventoryRow).not.toContainText(/\b\d+\/\d+\b(?!\s*완료|개 콘텐츠)/);
  await expect(firstInventoryRow).not.toContainText(/\b\d+%\b/);
  await inventorySheet.getByTestId('my-flow-group-row').last().scrollIntoViewIfNeeded();

  const lastInventoryRow = inventorySheet.getByTestId('my-flow-group-row').last();
  const lastInventoryAction = lastInventoryRow.getByRole('button').first();
  const lastInventorySource = lastInventoryRow.getByRole('link').first();
  await expect(lastInventoryAction).toBeVisible();
  await expect(lastInventorySource).toBeVisible();

  const panelBox = await inventoryPanel.boundingBox();
  const rowBox = await lastInventoryRow.boundingBox();
  const actionBox = await lastInventoryAction.boundingBox();
  const sourceBox = await lastInventorySource.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(sourceBox).not.toBeNull();
  expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height - 12);
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height - 12);
  expect(sourceBox!.y + sourceBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height - 12);

  await testInfo.attach('p7-03-my-flow-long-list-clearance', {
    body: JSON.stringify({
      savedCount: 6,
      visibleMobileStructureRows: 4,
      inventorySheetRows: 6,
      inventoryOpenButtonClearsTabs: true,
      lastInventoryRowBottomGap: Math.round(panelBox!.y + panelBox!.height - (rowBox!.y + rowBox!.height)),
      lastInventoryActionBottomGap: Math.round(panelBox!.y + panelBox!.height - (actionBox!.y + actionBox!.height)),
      lastInventorySourceBottomGap: Math.round(panelBox!.y + panelBox!.height - (sourceBox!.y + sourceBox!.height)),
    }, null, 2),
    contentType: 'application/json',
  });

  await expectNoUserFacingRawIsoDate(page.locator('body'));
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
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

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('h3')).toContainText('6월 3일');
  await expect(selectedDay.locator('h3')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(selectedDay).not.toContainText('이 날짜에 등록된 일정이 없습니다.');
  const selectedDateGroup = selectedDay.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toContainText('이사 준비');
  await expect(selectedDateGroup).toContainText('2개 · 2개 남음');
  await expect(selectedDateGroup.getByTestId('my-flow-selected-date-group-meta')).toHaveCount(1);
  await expect(selectedDateGroup.getByTestId('my-flow-group-timing-chip')).toContainText('기준 D+1');
  await expect(selectedDateGroup.getByTestId('my-flow-group-section-label')).toContainText('행정 마무리');
  await expect(selectedDateGroup.getByTestId('my-flow-row-timing-chip')).toHaveCount(0);
  await expect(selectedDateGroup.getByTestId('my-flow-row-section-label')).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"]')).toHaveClass(/my-flow-calendar-selected-date/);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
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

  await expect(page.getByRole('heading', { name: /내 Flow 월간 일정/ })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-card')).not.toContainText('월간 일정');
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('h3')).toContainText('6월 3일');

  const groupTexts = (await selectedDay.getByTestId('my-flow-selected-date-group').allInnerTexts()).join(' ');
  expect(groupTexts).toContain('이사 준비');
  expect(groupTexts).toContain('컴퓨터활용능력 1급 학습');
  expect(groupTexts).not.toMatch(/저장한 일정|저장한 루틴|일정 흐름|체크 흐름|반복 흐름/);

  const flowMarkers = selectedDay.getByTestId('my-flow-selected-date-flow-marker');
  await expect(flowMarkers).toHaveCount(2);
  const markerLabels = (await flowMarkers.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''))).join(' ');
  expect(markerLabels).toContain('이사 준비');
  expect(markerLabels).toContain('컴퓨터활용능력 1급 학습');

  const dateCell = page.locator('.fc-daygrid-day[data-date="2026-06-03"]');
  const scheduleLabels = (await dateCell.getByTestId('my-flow-calendar-flow-label').allInnerTexts()).join(' ');
  expect(scheduleLabels).toContain('이사');
  expect(scheduleLabels).toContain('컴퓨터');
  expect(scheduleLabels).not.toMatch(/(^|\s)(일정|\d+개)(\s|$)/);

  const agendaRows = selectedDay.locator('[data-testid="my-flow-execution-row-shell"] > article');
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
  expect(selectedDayGroupText).toContain('이사 준비');
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

test('calendar route keeps the first agenda and light day cells in the mobile viewport', async ({ page }) => {
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

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('h3')).toContainText('7월 12일');
  const selectedDayBox = await selectedDay.boundingBox();
  expect(selectedDayBox?.y ?? 9999).toBeLessThan(540);
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toContainText('이사 준비');

  const scheduleContent = page.locator('.fc-daygrid-day[data-date="2026-07-12"] [data-testid="my-flow-calendar-schedule-content"]').first();
  await expect(scheduleContent).toBeVisible();
  await expect(scheduleContent).not.toContainText('이사 방식과 견적 후보 정하기');
  const scheduleLabelText = (await scheduleContent.getByTestId('my-flow-calendar-flow-label').innerText()).trim();
  expect(scheduleLabelText.length).toBeLessThanOrEqual(6);
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('my flow filters narrow saved calendar checklist and routine management', async ({ page }) => {
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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="english-study-30day-routine"]')).toBeVisible();

  await expect(page.getByTestId('my-flow-scope-select')).toBeHidden();
  await page.getByTestId('my-flow-filter-english-study-30day-routine').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', 'english-study-30day-routine');
  await expect(page.getByTestId('my-flow-overview-card').getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/12 완료');

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
});

test('my flow ux12 demo renders grouped fixture flows without saving them', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX12');
  await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
  await expect(page.getByText('아직 만든 내 버전이 없습니다')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-today')).toHaveAttribute('aria-pressed', 'true');
  await expectTodaySummaryIsQuietSupport(page);
  await expect(page.getByTestId('my-flow-now-section')).toBeVisible();
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText('위 카드에서');
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText('전체 탭에서');
  await expect(page.getByTestId('my-flow-today-list')).toHaveCount(0);
  const overdueSectionBox = await page.getByTestId('my-flow-overdue-list').boundingBox();
  const completedSectionBox = await page.getByTestId('my-flow-today-completed-list').boundingBox();
  expect(overdueSectionBox?.y ?? 0).toBeLessThan(completedSectionBox?.y ?? 0);
  await expect(page.getByTestId('my-flow-overdue-list')).toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-overdue-open-sheet')).toBeVisible();
  await expect(page.getByTestId('my-flow-today-completed-list').locator('article')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-today-completed-list')).toContainText('완료 2');
  await expect(page.getByTestId('my-flow-today-completed-toggle')).toHaveAccessibleName('완료한 할 일 2개 보기');
  await page.getByTestId('my-flow-today-completed-toggle').click();
  await expect(page.getByTestId('my-flow-today-completed-list').locator('article')).toHaveCount(2);
  const firstCompletedTodayRow = page.getByTestId('my-flow-today-completed-list').locator('article').first();
  await expect(firstCompletedTodayRow.getByTestId('my-flow-row-timing-chip')).toBeVisible();
  await expect(firstCompletedTodayRow).not.toContainText('큰 일정 확정');
  await expect(firstCompletedTodayRow).not.toContainText('결혼 준비 Flow');
  await page.getByTestId('my-flow-view-flow').click();
  const statusBoard = page.getByTestId('my-flow-status-board');
  await expect(statusBoard).toBeVisible();
  await expect(statusBoard).not.toContainText('Flow 상태판');
  await expect(statusBoard).toContainText('저장한 콘텐츠 정리');
  await expect(statusBoard).toContainText('진행 중');
  await expect(statusBoard).toContainText('평균 진행');
  await expect(statusBoard).toContainText('다음 실행');
  await expect(statusBoard).toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-overview-summary')).not.toContainText('전체 Flow 운영');
  const prioritySection = page.getByTestId('my-flow-priority-section');
  await expect(prioritySection).toBeVisible();
  await expect(prioritySection).toContainText('지금 볼 할 일');
  await expect(prioritySection).toContainText('오늘 남음 0');
  await expect(prioritySection).not.toContainText('오늘 4');
  await expect(prioritySection).toContainText('지난 할 일 2');
  await expect(prioritySection).toContainText('7일 안 1');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first()).toContainText('다음 7일');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first()).toContainText('컴퓨터활용능력 1급 학습');
  const firstPriorityOpen = prioritySection.locator('[data-testid="my-flow-priority-card"]').first().locator('button').filter({ hasText: '열기' });
  await expect(firstPriorityOpen).toHaveText('열기');
  await expect(firstPriorityOpen).toHaveAttribute('aria-label', /.+ 열기$/);
  await expect(firstPriorityOpen).not.toContainText('항목 열기');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').nth(1)).toContainText('지난 할 일');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').nth(1)).toContainText('이사 준비');
  await firstPriorityOpen.click();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveAttribute('aria-pressed', 'true');
  const priorityDetail = prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByTestId('my-flow-priority-inline-detail');
  await expect(priorityDetail).toContainText('메모·일정');
  await expect(priorityDetail).not.toContainText('기출 회독 목표 정하기');
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByRole('checkbox', { name: /완료 체크$/ })).toBeVisible();
  await firstPriorityOpen.click();
  await expect(prioritySection.locator('[data-testid="my-flow-priority-card"]').first().getByTestId('my-flow-priority-inline-detail')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-inventory-toggle')).toContainText('전체 Flow 보기');
  await page.getByTestId('my-flow-inventory-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(16);
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="washer-tub-clean-monthly"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="travel-packing-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="pet-health-observation"]')).toBeVisible();
  const firstOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).toContainText('일정');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).toContainText('메모');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('증빙');
  await expect(firstOverviewCard.getByTestId('my-flow-type-counts')).not.toContainText('기록');
  await expect(firstOverviewCard.getByTestId('my-flow-next-action-open')).toHaveText('열기');
  await expect(firstOverviewCard.getByTestId('my-flow-next-action-open')).toHaveAttribute('aria-label', /.+ 열기$/);
  await firstOverviewCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveAttribute('aria-pressed', 'true');
  await expect(firstOverviewCard.getByTestId('my-flow-overview-inline-detail')).toContainText('필요 없는 물건 정리하기');
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-routine')).toHaveCount(0);
  await page.getByTestId('my-flow-view-flow').click();
  const scopeSelect = page.getByTestId('my-flow-scope-select');
  if (await scopeSelect.isVisible()) {
    await scopeSelect.selectOption('all');
  } else {
    await expect(page.getByTestId('my-flow-list')).toBeVisible();
  }
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-checklist-view')).toHaveCount(0);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')));
  expect(savedKeys).toHaveLength(0);

  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByText('색과 라벨로 Flow를 구분하고, 반복 항목은 아이콘으로 표시합니다.')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-routine-legend')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-scope-filter')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-scope-all')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('my-flow-calendar-scope-routine').click();
  await expect(page.getByTestId('my-flow-calendar-scope-routine')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText(/반복 항목 · \d+개 항목/);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="scheduled_task"]')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-scope-schedule').click();
  await expect(page.getByTestId('my-flow-calendar-scope-schedule')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText(/날짜 항목 · \d+개 항목/);
  await expect(page.locator('[data-testid="my-flow-routine-icon"]')).toHaveCount(0);
  await page.getByTestId('my-flow-calendar-scope-all').click();
  await expect(page.getByTestId('my-flow-calendar-scope-all')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  await page.getByTestId('my-flow-month-picker').fill('2026-12');
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-12');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-12-31"]')).toBeVisible();
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  await expect(page.locator('.fc')).toBeVisible();
  await page.getByRole('button', { name: '다음 달' }).click();
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-06');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText(/6월 \d+일/);
  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByTestId('my-flow-month-picker')).toHaveValue('2026-05');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText(/5월 \d+일/);
  await expect(page.locator('.fc-event').first()).toBeVisible();
  const clickedDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-29"]');
  await clickedDateCell.getByTestId('my-flow-calendar-date-button').click();
  await expect(clickedDateCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(clickedDateCell.getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-05-27"]').getByTestId('my-flow-calendar-date-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
  const firstEventCell = page.locator('.fc-daygrid-day:has(.fc-event)').first();
  const firstCalendarEvent = firstEventCell.locator('.fc-event').first();
  await firstCalendarEvent.click();
  await expect(firstEventCell).toHaveClass(/my-flow-calendar-selected-date/);
  await expect(firstCalendarEvent).toHaveClass(/my-flow-calendar-active-event/);
  await expect(page.locator('.fc-event .line-through').first()).toBeVisible();
  await expect(page.locator('[data-testid="my-flow-routine-dots"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
  const firstRoutineIcon = page.locator('[data-testid="my-flow-routine-icon"]').first();
  await expect(firstRoutineIcon).toHaveAttribute('data-routine-icon-kind', /.+/);
  await expect(firstRoutineIcon.locator('svg')).toBeVisible();
  await expect(firstRoutineIcon).toHaveText('');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+2');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-02"] [data-testid="my-flow-routine-icon"][data-routine-icon-kind="study"] svg')).toBeVisible();
  await expect(page.locator('.fc-event[aria-label*="상세 열기"]').first()).toBeVisible();
  const accessibleCalendarEvent = page.locator('.fc-event[aria-label*="상세 열기"]').first();
  await expect(accessibleCalendarEvent).toBeVisible();
  await accessibleCalendarEvent.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toBeVisible();
  await page.getByTestId('my-flow-calendar-selected-day').getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+2');
  await page.locator('.fc-daygrid-day[data-date="2026-05-28"]').getByTestId('my-flow-calendar-date-button').click();
  const selectedCalendarRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="scheduled_task"]').first();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('컴퓨터활용능력 1급 학습');
  await expect(selectedCalendarRow).not.toContainText('컴퓨터활용능력 1급 학습 Flow');
  const selectedCalendarGroup = selectedCalendarRow.locator('xpath=ancestor::*[@data-testid="my-flow-selected-date-group"][1]');
  await expect(selectedCalendarGroup.getByTestId('my-flow-group-timing-chip')).toContainText('기준 D-30');
  await expect(selectedCalendarGroup.getByTestId('my-flow-group-timing-chip')).toHaveAttribute('aria-label', 'Flow 기준 D-30');
  await expect(selectedCalendarGroup.getByTestId('my-flow-group-section-label')).toContainText('범위 쪼개기');
  await expect(selectedCalendarRow.getByTestId('my-flow-row-timing-chip')).toHaveCount(0);
  await expect(selectedCalendarRow.getByTestId('my-flow-row-section-label')).toHaveCount(0);
  await expect(selectedCalendarRow.getByRole('checkbox', { name: /완료 취소$/ })).toBeVisible();
  await selectedCalendarRow.getByRole('button').first().click();
  const selectedCalendarDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-timing-chip')).toHaveCount(0);
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-section-label')).toHaveCount(0);
  await expect(selectedCalendarDetail.getByText('상세', { exact: true })).toHaveCount(0);
  await expect(selectedCalendarDetail).toContainText('필기 암기와 실기 조작 시간');
  await expect(selectedCalendarDetail).not.toContainText('컴퓨터활용능력 1급 학습 Flow');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-advanced-content')).toHaveCount(0);
  await expect(selectedCalendarDetail).toHaveAttribute('data-default-primary-action-count', '2');
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-source-link')).not.toBeVisible();
  const selectedCalendarTools = await openMyFlowDetailTools(selectedCalendarDetail);
  await expect(selectedCalendarTools.getByTestId('my-flow-detail-source-link')).toHaveAttribute('href', /^https:\/\//);
  await enterMyFlowDetailEditMode(selectedCalendarDetail);
  const calendarMemo = selectedCalendarDetail.getByTestId('my-flow-detail-memo');
  await expect(calendarMemo).toHaveValue(/필기 암기와 실기 조작 시간/);
  const calendarMemoBox = await calendarMemo.boundingBox();
  expect(calendarMemoBox?.height ?? 0).toBeGreaterThanOrEqual(96);
  await expect(selectedCalendarDetail.getByRole('button', { name: /메모 (크게|작게) 보기/ })).toHaveCount(0);
  await expect(selectedCalendarDetail.getByTestId('my-flow-detail-advanced-toggle')).toHaveCount(0);
  await selectedCalendarDetail.getByRole('button', { name: /수정 취소$/ }).click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
  await selectedCalendarRow.getByRole('button').first().click();
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 3일');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-overflow-date', '2026-06-03');
  await expect(page.getByTestId('my-flow-selected-day-overflow-note')).toContainText('+2');
  await expect(page.getByTestId('my-flow-selected-day-overflow-note')).toContainText('반복 항목 포함');
  const selectedDayRoutineRow = page
    .getByTestId('my-flow-calendar-selected-day')
    .locator('article[data-item-type="routine_session"]')
    .first();
  const selectedDayRoutineCompletion = selectedDayRoutineRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ });
  await expect(selectedDayRoutineCompletion).toBeVisible();
  await expect(selectedDayRoutineRow.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(selectedDayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toContainText(/이번 회차 (대기|완료|건너뜀|보류)/);
  await selectedDayRoutineRow.getByRole('button').first().click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toBeVisible();
  const selectedRoutineDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  const routineStatusBefore = await selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill').innerText();
  expect(routineStatusBefore).toMatch(/이번 회차 (대기|완료|건너뜀|보류)/);
  await expect(selectedRoutineDetail.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await selectedDayRoutineCompletion.click();
  const completionSnackbar = page.getByTestId('my-flow-completion-snackbar');
  await expect(completionSnackbar).toContainText('완료');
  await expect(selectedDayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toContainText('이번 회차 완료');
  await completionSnackbar.getByTestId('my-flow-completion-undo').click();
  await expect(selectedDayRoutineCompletion).not.toBeChecked();
  await expect(selectedRoutineDetail).toBeVisible();
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 다시 진행');
  await enterMyFlowDetailEditMode(selectedRoutineDetail);
  const routineTitleInput = selectedRoutineDetail.getByTestId('my-flow-detail-title-input');
  const routineMemoInput = selectedRoutineDetail.getByTestId('my-flow-detail-memo');
  await expect(routineTitleInput).toBeVisible();
  await expect(selectedRoutineDetail.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).toHaveCount(0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
  await expect(routineMemoInput).not.toHaveValue(/실행:/);
  await expect(routineMemoInput).not.toHaveValue(/완료 기준:/);
  await expandMyFlowAdvancedEditor(selectedRoutineDetail);
  const routineRepeatToggleBox = await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').boundingBox();
  const routineTimeBox = await selectedRoutineDetail.getByLabel('시간').boundingBox();
  const routineLocationBox = await selectedRoutineDetail.getByLabel('장소').boundingBox();
  expect(routineTimeBox?.y ?? 9999).toBeLessThan(routineRepeatToggleBox?.y ?? 0);
  expect(routineLocationBox?.y ?? 9999).toBeLessThan(routineRepeatToggleBox?.y ?? 0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-occurrence-section')).toContainText('이번 일정');
  const routineOccurrenceBox = await selectedRoutineDetail.getByTestId('my-flow-routine-occurrence-section').boundingBox();
  expect(routineOccurrenceBox?.y ?? 9999).toBeLessThan(routineRepeatToggleBox?.y ?? 0);
  await expect(selectedRoutineDetail.getByTestId('my-flow-routine-repeat-editor')).toHaveCount(0);
  await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor')).toBeVisible();
  const routineRepeatEditor = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor');
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-repeat-cancel')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 요일 월')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 변경 적용 범위')).toBeVisible();
  await expect(routineRepeatEditor.getByLabel('반복 변경 적용 범위')).toHaveValue('this');
  await expect(routineRepeatEditor.getByLabel('반복 요일 월')).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
  const repeatScopeBox = await routineRepeatEditor.getByLabel('반복 변경 적용 범위').boundingBox();
  const repeatWeekdayBox = await routineRepeatEditor.getByLabel('반복 요일 월').boundingBox();
  expect(repeatScopeBox?.y ?? 0).toBeLessThan(repeatWeekdayBox?.y ?? 0);
  await routineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('this');
  await expect(routineRepeatEditor).toContainText('이 이벤트만은 이번 날짜의 시간·장소·메모만 바꿉니다.');
  await expect(routineRepeatEditor.locator('select')).toContainText('이 이벤트 및 이후');
  await expect(routineRepeatEditor.locator('select')).toContainText('모든 이벤트');
  await expect(routineRepeatEditor.getByLabel('반복 요일 수')).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(4);
  await routineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('future');
  await expect(routineRepeatEditor.getByLabel('반복 요일 수')).toBeEnabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeEnabled();
  await routineRepeatEditor.getByTestId('my-flow-routine-end-date').fill('2026-06-02');
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-repeat-pending')).toContainText('저장 전');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(4);
  await routineRepeatEditor.getByTestId('my-flow-routine-repeat-cancel').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]')).toHaveCount(4);
  await selectedRoutineDetail.getByTestId('my-flow-routine-repeat-toggle').click();
  const reopenedRoutineRepeatEditor = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-routine-repeat-editor');
  await expect(reopenedRoutineRepeatEditor.locator('select')).toHaveValue('this');
  await reopenedRoutineRepeatEditor.getByLabel('반복 변경 적용 범위').selectOption('future');
  await reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-end-date').fill('2026-06-02');
  await expect(reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-pending')).toContainText('저장 전');
  await expect(reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-apply')).toHaveClass(/bg-blue-700/);
  const routineCountBeforeApply = await page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').count();
  await reopenedRoutineRepeatEditor.getByTestId('my-flow-routine-repeat-apply').click();
  const routineCountAfterApply = await page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').count();
  expect(routineCountAfterApply).toBeGreaterThan(0);
  expect(routineCountAfterApply).toBeLessThanOrEqual(routineCountBeforeApply);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('article').first()).toHaveAttribute('data-item-type', 'scheduled_task');
  await page.getByTestId('my-flow-calendar-selected-day').locator('article').first().getByRole('button').first().click();
  const selectedTaskDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(selectedTaskDetail).toBeVisible();
  await expect(selectedTaskDetail).toHaveAttribute('data-item-type', 'scheduled_task');
  await enterMyFlowDetailEditMode(selectedTaskDetail);
  await expect(selectedTaskDetail.getByLabel(/날짜 이동/)).toHaveCount(0);
  await expect(selectedTaskDetail.getByTestId('my-flow-detail-date-input')).toHaveCount(1);
  await expect(selectedTaskDetail.locator('input[aria-label="Flow 기준"]')).toHaveCount(0);
  await expect(selectedTaskDetail.getByLabel('반복 요일 월')).toHaveCount(0);
  await expect(selectedTaskDetail.getByTestId('my-flow-detail-memo')).toHaveCount(1);
  await expect(selectedTaskDetail.getByLabel('왜')).toHaveCount(0);
  await expect(selectedTaskDetail.getByLabel('방법')).toHaveCount(0);
  await expect(selectedTaskDetail.getByLabel('완료 기준')).toHaveCount(0);
  await expect(selectedTaskDetail.getByLabel('주의')).toHaveCount(0);

  await selectedTaskDetail.getByTestId('my-flow-detail-date-input').fill('2026-05-29');
  await expect(selectedTaskDetail.getByRole('button', { name: '변경 저장' })).toBeVisible();
  await selectedTaskDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('5월 29일');
});

test('my flow source-backed demo renders bridge bundles without publishing them as public seeds', async ({ page }) => {
  await page.goto('/my?demo=source-backed');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('원문 기반');
  await expect(page.getByTestId('my-flow-view-today')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(2);
  await expect(page.getByTestId('my-flow-demo-group')).toContainText(['원룸 이사 D-30 일정', '중1 수학 목차 진도표']);

  const movingCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await expect(movingCard).toContainText('원룸 이사 준비');
  await expect(movingCard).not.toContainText('원룸 이사 D-30 준비');
  await expect(movingCard.getByTestId('my-flow-overview-progress-summary')).toContainText('전체 0/5 완료');
  await expect(movingCard.getByTestId('my-flow-overview-progress-bar')).toBeVisible();
  await expect(movingCard).not.toContainText('0%');
  await expect(movingCard.getByTestId('my-flow-next-action-open')).toHaveText('열기');
  await expect(movingCard.getByTestId('my-flow-next-action-open')).toHaveAttribute('aria-label', /.+ 열기$/);

  const mathCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(mathCard).toContainText('단원별 개념 진도');
  await expect(mathCard.getByTestId('my-flow-overview-progress-summary')).toContainText('전체 0/8 완료');
  await expect(mathCard.getByTestId('my-flow-overview-progress-bar')).toBeVisible();
  await expect(mathCard).not.toContainText('0%');
  await expect(mathCard.getByRole('button', { name: '진도 보기' })).toBeVisible();

  await mathCard.getByTestId('my-flow-next-action-open').click();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveAttribute('aria-pressed', 'true');
  await expect(mathCard.getByTestId('my-flow-overview-inline-detail')).toContainText('소인수분해');
  await expect(mathCard.getByTestId('my-flow-overview-inline-detail')).toContainText('거듭제곱');
  await expect(mathCard.getByTestId('my-flow-detail-checklist-progress')).toContainText(/^(확인 항목|개념 항목) \d+\/\d+$/);
});

test('my flow source-backed demo stays lightweight on mobile inventory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByRole('button', { name: 'Flow 찾기' })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toContainText('저장한 콘텐츠');
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).not.toContainText(/오늘 0|다음 0|지난 할 일 0/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(2);
  const movingMobileCard = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]');
  await expect(movingMobileCard).toContainText('원룸 이사 준비');
  await expect(movingMobileCard.getByTestId('my-flow-mobile-structure-progress')).toContainText('전체 0/5 완료');
  await expect(movingMobileCard).not.toContainText('0%');
  const mathMobileCard = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(mathMobileCard).toContainText('단원별 개념 진도');
  await expect(mathMobileCard.getByTestId('my-flow-mobile-structure-progress')).toContainText('전체 0/8 완료');
  await expect(mathMobileCard).not.toContainText('0%');
});

test('source-backed flow map public page stays save-before focused', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/middle-school-math-1');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap).toBeVisible();
  await expect(publicMap.getByRole('heading', { name: '중1 수학 목차 진도표' })).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-result-promise')).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-result-chips')).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-artifact-preview')).toContainText('소인수분해');
  await expect(publicMap.getByTestId('flow-map-hero')).toContainText('열어보기');
  await expect(publicMap.getByTestId('flow-map-hero')).not.toContainText('저장 전 보기');
  await expect(publicMap).not.toContainText('저장되는 결과물');
  const firstActionTop = await publicMap.getByTestId('flow-map-artifact-preview').evaluate((element) => element.getBoundingClientRect().top);
  expect(firstActionTop).toBeLessThan(720);
  await expect(publicMap).toContainText('중1 수학 목차');
  await expect(publicMap.getByTestId('flow-map-hero')).not.toContainText('Mathbang');
  await expect(publicMap.getByTestId('flow-map-artifact-preview')).not.toContainText('Mathbang');
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(publicMap).toContainText('소인수분해');
  await expect(publicMap).toContainText('정수와 유리수');
  await expect(publicMap).toContainText('거듭제곱');
  await expect(publicMap.getByTestId('flow-map-public-step-items').first()).toContainText(/체크 \d+개/);
  await expect(publicMap.getByText('메모 · 원문').first()).toBeVisible();
  await expect(publicMap.getByRole('button', { name: '그대로 저장' })).toBeVisible();
  await expect(publicMap).not.toContainText(/source fit|PoC|개발자|평가 점수/i);
  await expect(publicMap).not.toContainText(/제작자 편집|초안 저장|새 공개 버전/i);
});

test('source-backed flow map public page saves into the real My Flow path', async ({ page }) => {
  await page.goto('/flow-maps/middle-school-math-1');

  await page.getByRole('button', { name: '그대로 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
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
  await postSavePanel.getByTestId('my-flow-post-save-open-first').click();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  const todayDetail = page.getByTestId('my-flow-anytime-section').getByTestId('my-flow-inline-detail');
  await expect(todayDetail).toContainText('개념 항목');
  await expect(todayDetail).toContainText('거듭제곱');
  await expect(todayDetail).not.toContainText('Mathbang');

  await page.getByTestId('my-flow-view-flow').click();
  const mathCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(mathCard).toBeVisible();
  await expect(mathCard).toContainText('단원별 개념 진도');
  await expect(mathCard.getByTestId('my-flow-map-context')).toContainText('중1 수학 목차 진도표');
  await expect(mathCard).not.toContainText('Mathbang');
  await expect(mathCard.getByTestId('my-flow-workspace-progress-summary')).toContainText('전체 0/8 완료');
  await expect(mathCard.getByRole('link', { name: '원문 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');

  await mathCard.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
  await expect(page.getByTestId('my-flow-view-flow')).toHaveAttribute('aria-pressed', 'true');
  const detailSection = mathCard.getByTestId('my-flow-workspace-detail-pane');
  await expect(detailSection.getByTestId('my-flow-item-detail')).toBeVisible();
  await expect(detailSection).not.toContainText('Mathbang');
  const itemChecklist = detailSection.getByTestId('my-flow-item-checklist');
  await expect(itemChecklist).toContainText('거듭제곱');
  await itemChecklist.getByLabel('거듭제곱').check();
  await expect(detailSection.getByTestId('my-flow-detail-checklist-progress')).toContainText('개념 항목 1/8');

  await enterMyFlowDetailEditMode(detailSection.getByTestId('my-flow-item-detail'));
  await detailSection.getByTestId('my-flow-detail-date-input').fill('2026-06-29');
  await expect(detailSection.getByTestId('my-flow-progress-schedule-note')).toContainText('날짜를 넣으면');
  await detailSection.getByTestId('my-flow-detail-save-changes').click();
  await page.goto('/calendar');
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
  await page.getByRole('button', { name: '그대로 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');

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
  await page.getByTestId('my-flow-view-flow').click();

  await expect(page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-middle-school-math-1"]')).toBeVisible();
  await expect(page.getByTestId('my-flow-review-section')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('알뜰폰 SK7 셀프개통 체크');

  await page.goto('/calendar');
  await expect(page.locator('body')).not.toContainText('알뜰폰 SK7 셀프개통 체크');
});

test('source-backed single progress map opens step detail on mobile My Flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/middle-school-math-1');

  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=middle-school-math-1');
  await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
  await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-post-save-view-flow')).toBeVisible();

  await page.getByTestId('my-flow-post-save-open-first').click();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();
  const anytimeSection = page.getByTestId('my-flow-anytime-section');
  await expect(anytimeSection).toContainText('날짜 없는 할 일');
  await anytimeSection.getByRole('button', { name: /5\. 기본도형 열기/ }).click();
  const flowDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await expect(flowDetail).toBeVisible();
  await expect(flowDetail).not.toContainText('Step 실행');
  await expect(flowDetail).not.toContainText('Item');
  await expect(flowDetail).not.toContainText('확인할 항목');
  await expect(flowDetail).toContainText(/확인 항목|개념 항목/);
  await expect(anytimeSection.getByTestId('my-flow-inline-detail')).toBeVisible();
  const itemChecklist = flowDetail.getByTestId('my-flow-item-checklist');
  await expect(itemChecklist).toContainText('점, 선, 면, 직선, 반직선, 선분');
  await expect(flowDetail.getByTestId('my-flow-detail-read-summary')).toContainText('메모·일정');
  await expect(flowDetail.getByTestId('my-flow-detail-portable-export').locator('summary')).toContainText('현재 항목 가져가기 · 1개');
  await itemChecklist.getByLabel('점, 선, 면, 직선, 반직선, 선분').check();
  await expect(flowDetail.getByTestId('my-flow-detail-checklist-progress')).toContainText('개념 항목 1/15');
});

test('source-backed moving map saves one dated timeline into My Flow calendar', async ({ page }) => {
  const movingDate = createMovingDateFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  const publicMap = page.getByTestId('flow-map-public');
  await expect(publicMap.getByRole('heading', { name: '원룸 이사 D-30 일정' })).toBeVisible();
  await expect(publicMap.getByRole('heading', { name: '원룸 이사 D-30 일정 지도' })).toHaveCount(0);
  await expect(publicMap.getByLabel('이사일')).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-result-chips')).toBeVisible();
  await expect(publicMap.getByTestId('flow-map-artifact-preview')).toContainText('이사 방식과 견적 후보 정하기');
  await expect(publicMap).not.toContainText('저장되는 결과물');
  const anchorTop = await publicMap.getByTestId('flow-map-anchor-input').evaluate((element) => element.getBoundingClientRect().top);
  const firstActionTop = await publicMap.getByTestId('flow-map-artifact-preview').evaluate((element) => element.getBoundingClientRect().top);
  expect(anchorTop).toBeLessThan(680);
  expect(firstActionTop).toBeLessThan(760);
  await expect(publicMap).toContainText('원룸 이사 D-30 준비');
  await expect(publicMap).toContainText('이사 방식과 견적 후보 정하기');
  await publicMap.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(publicMap).toContainText('견적 후보 2-3곳을 열고 연락처를 메모합니다.');
  await expectNoVisibleSourceBrandSlug(publicMap);

  await page.getByLabel('이사일').fill(movingDate.anchor);
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await expect(page.getByTestId('my-flow-demo-badge')).toHaveCount(0);

  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('원룸 이사 D-30 일정');
  await expect(postSavePanel).not.toContainText('원룸 이사 D-30 일정 지도');
  await expect(postSavePanel.getByTestId('my-flow-post-save-receipt-summary')).toContainText('할 일 5개');
  await expect(postSavePanel).not.toContainText('묶음');
  await expect(postSavePanel).toContainText('이사 방식과 견적 후보 정하기');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(5);
  await expect(postSavePanel.getByTestId('my-flow-post-save-view-all')).toHaveCount(0);
  await expectNoVisibleSourceBrandSlug(postSavePanel);

  await postSavePanel.getByTestId('my-flow-post-save-open-first').click();
  const nowSection = page.getByTestId('my-flow-now-section');
  await expect(nowSection.getByTestId('my-flow-inline-detail')).toContainText('확인 항목');
  await expect(nowSection.getByTestId('my-flow-inline-detail')).toContainText('견적 후보 2-3곳을 열고 연락처를 메모합니다.');

  await page.getByTestId('my-flow-view-flow').click();
  const movingOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await expect(movingOverviewCard).toBeVisible();
  await expectNoVisibleSourceBrandSlug(movingOverviewCard);
  await expect(movingOverviewCard).not.toContainText(/\b2026-\d{2}-\d{2}\b/);
  await expect(movingOverviewCard).toContainText(movingDate.firstActionLabel);

  await page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '캘린더' }).click();
  const calendarCard = page.getByTestId('my-flow-calendar-card');
  await expect(calendarCard).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).toContainText(/\d{1,2}월 \d{1,2}일/);
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).not.toContainText('저장한 일정');
  await expect(selectedDateGroup).not.toContainText('날짜 항목');
  await expect(selectedDateGroup).toContainText('원룸 이사 D-30 일정');
  await expectNoVisibleSourceBrandSlug(selectedDateGroup);
  await expect(selectedDateGroup).not.toContainText('원룸 이사 D-30 일정 지도');
  await expect(selectedDateGroup).not.toContainText('1개 · 1개 남음');
  await expect(selectedDateGroup.getByTestId('my-flow-row-flow-chip')).toHaveCount(0);
  await expect(selectedDateGroup.getByTestId('my-flow-row-progress-chip')).toHaveCount(0);

  const savedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:saved:moving-d30') || 'null'));
  expect(savedMap.version).toBe('2026-06-24.1');
  expect(savedMap.anchor).toBe(movingDate.anchor);
  expect(savedMap.flowSlugs).toEqual(['source-backed-moving-d30']);
  expect(savedMap.stepCountsByFlow).toEqual({
    'source-backed-moving-d30': 5,
  });
  const persistenceRecord = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:map:persistence:moving-d30') || 'null'));
  expect(persistenceRecord.schemaVersion).toBe(1);
  expect(persistenceRecord.readiness.content).toBe('ready_for_my_flow');
  expect(persistenceRecord.childFlows[0].stepIds).toEqual([
    'moving-method-quotes',
    'moving-cleaning-waste',
    'moving-address-admin',
    'moving-meter-photos',
    'moving-move-day-admin',
  ]);
});

test('P19 task completion controls use one checkbox pattern in My Flow and Calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  await page.getByLabel('이사일').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');

  await page.getByTestId('my-flow-post-save-open-first').click();

  const nowSection = page.getByTestId('my-flow-now-section');
  const nowComplete = nowSection.getByTestId('my-flow-task-complete-control').first();
  await expect(nowComplete).toHaveAttribute('type', 'checkbox');
  await expect(nowComplete).toHaveAttribute('aria-label', /완료/);
  await nowComplete.click();
  await expect.poll(() => page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('flow_builder_mvp_checks_'))
      .some((key) => Object.values(JSON.parse(window.localStorage.getItem(key) || '{}')).some(Boolean)),
  )).toBe(true);

  const inlineDetail = nowSection.getByTestId('my-flow-inline-detail');
  await expect(inlineDetail.getByTestId('my-flow-task-complete-control')).toHaveCount(0);

  await page.goto('/calendar');
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  const calendarComplete = selectedDateGroup.getByTestId('my-flow-task-complete-control').first();
  await expect(calendarComplete).toHaveAttribute('type', 'checkbox');
  await expect(calendarComplete).toHaveAttribute('aria-label', /완료/);
  await expect(selectedDateGroup.getByRole('button', { name: /^완료$/ })).toHaveCount(0);
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
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록을 보관했어요');
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
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록을 보관했어요');
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
  await expect(publicMap.getByTestId('flow-map-result-promise')).toContainText('전체 Flow');
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
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록을 보관했어요');
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

  await expect(page).toHaveURL('/my?demo=source-backed&savedMap=baby-health-schedule');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('영유아 검진·접종 일정');
  await expect(page.getByTestId('my-flow-post-save-panel')).not.toContainText('영유아 검진·접종 일정 지도');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('저장 기록을 보관했어요');
  await expect(page.getByTestId('my-flow-post-save-panel')).toContainText('현재 확인이 필요한 Flow라 실행 목록에는 표시하지 않아요.');
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
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=version-review');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  const stepBoxes = customPanel.locator('input[type="checkbox"]');
  const stepCount = await stepBoxes.count();
  for (let index = 1; index < stepCount; index += 1) await stepBoxes.nth(index).uncheck();
  await result.getByLabel('학습 시작일').fill('2026-07-15');
  await result.getByRole('button', { name: '시작하기' }).click();
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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
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
  await page.getByTestId('my-flow-view-flow').click();
  const reviewedFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-middle-school-math-1"]');
  await expect(reviewedFlow.getByTestId('my-flow-reuse-status')).toContainText('새 내용을 반영해 시작했어요');
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
  await expect(page).toHaveURL('/my?demo=source-backed&savedMap=baby-health-schedule');

  const postSavePanel = page.getByTestId('my-flow-post-save-panel');
  await expect(postSavePanel).toContainText('영유아 검진·접종 일정');
  await expect(postSavePanel).not.toContainText('영유아 검진·접종 일정 지도');
  await expect(postSavePanel).toContainText('저장 기록을 보관했어요');
  await expect(postSavePanel).toContainText('현재 확인이 필요한 Flow라 실행 목록에는 표시하지 않아요.');
  await expect(postSavePanel.getByTestId('my-flow-post-save-held-note')).toBeVisible();
  await expect(postSavePanel).not.toContainText('묶음');
  await expect(postSavePanel.getByTestId('my-flow-post-save-step')).toHaveCount(18);
});

test('my flow step detail saves portable calendar task fields', async ({ page }) => {
  await page.goto('/flow-maps/moving-d30');

  await page.getByLabel('이사일').fill('2026-07-22');
  await page.getByRole('button', { name: '그대로 저장' }).click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
  await page.getByTestId('my-flow-view-flow').click();
  const movingCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await movingCard.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();

  const detail = movingCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
  await expect(detail).toBeVisible();
  await enterMyFlowDetailEditMode(detail);
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-06-24');
  await expandMyFlowAdvancedEditor(detail);
  await detail.locator('input[type="time"]').fill('09:30');
  await detail.getByTestId('my-flow-detail-repeat-input').selectOption('weekly');
  await detail.locator('input[placeholder="장소 없음"]').fill('집');
  await detail.locator('textarea').first().fill('견적 후보 3곳과 포함 범위만 메모');
  await detail.getByRole('button', { name: '변경 저장' }).click();

  const stored = await page.evaluate(() => ({
    dateOverrides: JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    drafts: JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
  }));
  expect(Object.values(stored.dateOverrides)).toContain('2026-06-24');
  const draftValues = Object.values(stored.drafts) as Array<Record<string, string>>;
  expect(draftValues.some((draft) => draft.time === '09:30' && draft.location === '집' && draft.repeatPreset === 'weekly')).toBe(true);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const movedEvent = page.locator('.fc-daygrid-day[data-date="2026-06-24"] .fc-event').first();
  await expect(movedEvent).toHaveAttribute('title', /이사 방식/);
  await movedEvent.click();
  const restoredDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(restoredDetail).toBeVisible();
  const restoredTools = await openMyFlowDetailTools(restoredDetail);
  await expect(restoredTools.getByTestId('my-flow-detail-copy-portable-text')).toContainText('메모로 복사');
  await expect(restoredTools.getByTestId('my-flow-detail-download-ics')).toContainText('캘린더 파일 받기');
  await restoredTools.getByTestId('my-flow-detail-copy-portable-text').click();
  await expect(restoredTools.getByTestId('my-flow-detail-copy-feedback')).toContainText('메모 복사됨');
  const downloadPromise = page.waitForEvent('download');
  await restoredTools.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  await expect(restoredTools.getByTestId('my-flow-detail-download-feedback')).toContainText('캘린더 파일 받음');
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  expect(ics).toContain('DTSTART:20260624T093000');
  expect(ics).toContain('RRULE:FREQ=WEEKLY');
  expect(ics).toContain('LOCATION:집');
  expect(ics).toContain('견적 후보 3곳과 포함 범위만 메모');
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
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.setItem('flow:saved:travel-packing-list', JSON.stringify({
      slug: 'travel-packing-list',
      savedAt: '2026-07-13T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }));
  });
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();

  let flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
  if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await flow.getByTestId('my-flow-mobile-structure-open').click();
  }
  await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  let detail = flow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
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

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const scheduledCell = page.locator('.fc-daygrid-day[data-date="2026-07-24"]');
  await expect(scheduledCell.locator('.fc-event')).toHaveCount(1);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/02-source-undated-calendar-mobile.png`, fullPage: true });
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
  if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await flow.getByTestId('my-flow-mobile-structure-open').click();
  }
  await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  detail = flow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
  const exportTools = await openMyFlowDetailTools(detail);
  await exportTools.getByTestId('my-flow-detail-copy-portable-text').click();
  const copiedMemo = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedMemo).toContain('일정: 2026-07-24');
  await exportTools.getByTestId('my-flow-detail-copy-checklist-text').click();
  const copiedChecklist = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedChecklist).toContain('2026-07-24');
  await exportTools.getByTestId('my-flow-detail-copy-sheet-row').click();
  const copiedSheet = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedSheet).toContain('2026-07-24');
  const downloadPromise = page.waitForEvent('download');
  await exportTools.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260724');
  if (evidenceDir) {
    fs.writeFileSync(`${evidenceDir}/downloads/travel-packing-personal-date.ics`, ics, 'utf8');
  }

  await enterMyFlowDetailEditMode(detail);
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-24');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const wideFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="travel-packing-list"]');
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
  await wideDetail.getByTestId('my-flow-undated-item-date-clear').click();
  await expect(wideDetail.getByTestId('my-flow-detail-date-input')).toHaveValue('');
  await wideDetail.getByTestId('my-flow-detail-save-changes').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar');
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
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByLabel('이사일').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await openPostSaveWorkspaceIfPresent(page);
  await page.getByTestId('my-flow-view-flow').click();

  let flow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await expect(flow.getByTestId('my-flow-direct-anchor-settings-open')).toHaveAccessibleName(
    /원룸 이사.*이사일 바꾸기/,
  );
  await expect(flow.getByTestId('my-flow-personal-copy-settings-open')).toHaveCount(0);
  await expect(flow.getByTestId('personal-draft-add-entry')).toHaveCount(0);
  const firstExecutionRow = flow.getByTestId('my-flow-execution-row-shell').first();
  await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
  let detail = firstExecutionRow.getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(detail);
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-07');
  await detail.getByTestId('my-flow-detail-memo').fill('오전 중 후보 2곳만 확인');
  await detail.getByTestId('my-flow-detail-save-changes').click();

  await flow.getByTestId('my-flow-direct-anchor-settings-open').click();
  const anchorSettings = flow.getByTestId('my-flow-direct-anchor-settings');
  await expect(anchorSettings).toContainText('전체 일정 기준');
  await expect(anchorSettings.getByTestId('my-flow-direct-anchor-input')).toHaveValue('2026-07-22');
  await expect(anchorSettings.getByTestId('my-flow-direct-anchor-policy')).toContainText('따로 바꾼 할 일 날짜와 메모는 그대로 유지');
  await anchorSettings.getByTestId('my-flow-direct-anchor-input').fill('2026-08-05');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/01-direct-anchor-edit-mobile.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await anchorSettings.getByRole('button', { name: '일정 다시 맞추기' }).click();
  await expect(flow.getByTestId('my-flow-direct-anchor-settings')).toHaveCount(0);

  const savedState = await page.evaluate(() => ({
    snapshot: JSON.parse(window.localStorage.getItem('flow:map:saved:moving-d30') || 'null'),
    persistence: JSON.parse(window.localStorage.getItem('flow:map:persistence:moving-d30') || 'null'),
    savedRecord: JSON.parse(window.localStorage.getItem('flow:saved:source-backed-moving-d30') || 'null'),
    storedAnchor: JSON.parse(window.localStorage.getItem('flow:source-backed-moving-d30:anchorDate') || 'null'),
    dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
    itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
  }));
  expect(savedState.snapshot.anchor).toBe('2026-08-05');
  expect(savedState.snapshot.version).toBe('2026-06-24.1');
  expect(savedState.snapshot.personalCopy).toBeUndefined();
  expect(savedState.persistence.saved.anchor).toBe('2026-08-05');
  expect(savedState.persistence.map.version).toBe('2026-06-24.1');
  expect(savedState.savedRecord.anchor).toBe('2026-08-05');
  expect(savedState.storedAnchor.anchor).toBe('2026-08-05');
  expect(savedState.dateOverrides['source-backed-moving-d30::moving-method-quotes::2026-07-06']).toBe('2026-07-07');
  expect(savedState.dateOverrides['source-backed-moving-d30::moving-method-quotes::2026-06-22']).toBeUndefined();
  expect(savedState.itemDrafts['source-backed-moving-d30::moving-method-quotes::draft-overlay'].memo).toBe('오전 중 후보 2곳만 확인');

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-22"] .fc-event')).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-08"] .fc-event')).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-06"] .fc-event')).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-07"] .fc-event')).toHaveCount(1);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-07-22"] .fc-event')).toHaveCount(1);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/02-direct-anchor-calendar-shift-mobile.png`, fullPage: true });
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]');
  await flow.getByTestId('my-flow-mobile-structure-open').click();
  await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  detail = flow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
  await expect(detail).toContainText('오전 중 후보 2곳만 확인');
  await enterMyFlowDetailEditMode(detail);
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-07');
  await detail.getByRole('button', { name: /수정 취소$/ }).click();
  await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  detail = flow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
  const exportTools = await openMyFlowDetailTools(detail);
  const downloadPromise = page.waitForEvent('download');
  await exportTools.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8');
  const unfoldedIcs = ics.replace(/\r?\n[ \t]/g, '');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260707');
  expect(unfoldedIcs).toContain('오전 중 후보 2곳만 확인');
  if (evidenceDir) fs.writeFileSync(`${evidenceDir}/downloads/direct-anchor-preserved-item.ics`, ics, 'utf8');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const wideFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
  await expect(wideFlow.getByTestId('my-flow-direct-anchor-settings-open')).toBeVisible();
  await wideFlow.getByTestId('my-flow-direct-anchor-settings-open').click();
  await expect(wideFlow.getByTestId('my-flow-direct-anchor-input')).toHaveValue('2026-08-05');
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/03-direct-anchor-entry-wide.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test('my flow mobile saved map edit and revisit keeps step detail lightweight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  const publicMap = page.getByTestId('flow-map-public');
  await publicMap.locator('input[type="date"]').fill('2026-07-22');
  await publicMap.locator('button').last().click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
  await page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '캘린더' }).click();
  await expect(page).toHaveURL('/calendar');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  const selectedDateGroup = page.getByTestId('my-flow-selected-date-group').first();
  await expect(selectedDateGroup).toContainText('원룸 이사 D-30 일정');
  await expect(selectedDateGroup).not.toContainText('원룸 이사 D-30 일정 지도');
  await selectedDateGroup.getByRole('button').first().click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  const inlineDetail = page.getByTestId('my-flow-inline-detail').first();
  await expect(inlineDetail).toBeVisible();
  const detail = inlineDetail.getByTestId('my-flow-item-detail');
  await expect(detail).toBeVisible();

  const detailBox = await detail.boundingBox();
  expect(detailBox).not.toBeNull();
  expect(detailBox!.y).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => (await detail.boundingBox())?.y ?? 9999).toBeLessThan(844);

  await enterMyFlowDetailEditMode(detail);
  await expect(detail.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
  await expandMyFlowAdvancedEditor(detail);
  await expect(detail.getByTestId('my-flow-detail-repeat-input')).toBeVisible();
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-06-25');
  await detail.locator('input[type="time"]').fill('10:00');
  await detail.getByTestId('my-flow-detail-repeat-input').selectOption('weekly');
  await detail.locator('textarea').first().fill('mobile revisit memo');
  await detail.getByTestId('my-flow-detail-save-changes').click();

  await page.goto('/calendar');
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
    { mapId: 'curated-ajd-moving-d30', slug: 'curated-ajd-moving-d30', anchor: '2026-07-31' },
  ];

  for (const flowCase of cases) {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`/flow-maps/${flowCase.mapId}`);

    const publicMap = page.getByTestId('flow-map-public');
    await expect(publicMap).toBeVisible();
    if (flowCase.anchor) {
      await publicMap.getByTestId('flow-map-anchor-input').fill(flowCase.anchor);
    }

    await publicMap.getByTestId('flow-map-save-all').click();
    await expect(page).toHaveURL(new RegExp(`/my\\?savedMap=${flowCase.mapId}$`));
    await page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-view-flow').click();
    await page.getByTestId('my-flow-view-flow').click();

    const card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowCase.slug}"]`);
    await expect(card).toBeVisible();
    await card.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();

    const detail = card.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
    await expect(detail).toBeVisible();
    const detailTools = await openMyFlowDetailTools(detail);
    await expect(detailTools.getByTestId('my-flow-detail-source-link')).toHaveAttribute('href', /^https:\/\//);

    const itemChecklist = detail.getByTestId('my-flow-item-checklist');
    await expect(itemChecklist).toBeVisible();
    const firstItemCheckbox = itemChecklist.locator('input[type="checkbox"]').first();
    await firstItemCheckbox.check();
    await expect(firstItemCheckbox).toBeChecked();

    const memo = `${flowCase.mapId} rehearsal memo`;
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-memo').fill(memo);
    await detail.getByTestId('my-flow-detail-save-changes').click();

    const storedAfterEdit = await page.evaluate(() => ({
      stepItemChecks: JSON.parse(window.localStorage.getItem('flow:my-flow:step-item-checks') || '{}'),
      itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    }));
    expect(JSON.stringify(storedAfterEdit.stepItemChecks)).toContain('true');
    expect(JSON.stringify(storedAfterEdit.itemDrafts)).toContain(memo);

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    const restoredCard = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowCase.slug}"]`);
    await expect(restoredCard).toBeVisible();
    await restoredCard.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    const restoredDetail = restoredCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
    await expect(restoredDetail.getByTestId('my-flow-item-checklist').locator('input[type="checkbox"]').first()).toBeChecked();
    await enterMyFlowDetailEditMode(restoredDetail);
    await expect(restoredDetail.getByTestId('my-flow-detail-memo')).toHaveValue(memo);
  }
});

test('my flow ux20 demo keeps large flow inventories grouped and collapsed', async ({ page }) => {
  await page.goto('/my?demo=ux20');

  await expect(page.getByTestId('my-flow-demo-badge')).toContainText('UX20');
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-list')).toHaveCount(0);
  const priorityCardCount = await page.getByTestId('my-flow-priority-card').count();
  expect(priorityCardCount).toBeGreaterThan(0);
  expect(priorityCardCount).toBeLessThanOrEqual(4);
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-inventory-toggle')).toContainText('27');

  await page.getByTestId('my-flow-inventory-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(27);
  await expect(page.getByTestId('my-flow-demo-group')).toHaveCount(14);

  await page.getByTestId('my-flow-list-filter-routine').click();
  await expect(page.getByTestId('my-flow-inventory-toggle')).toHaveCount(0);
  const routineCardCount = await page.getByTestId('my-flow-overview-card').count();
  expect(routineCardCount).toBeGreaterThan(0);
  expect(routineCardCount).toBeLessThan(27);

  await page.getByTestId('my-flow-search').fill('식단');
  const searchedCardCount = await page.getByTestId('my-flow-overview-card').count();
  expect(searchedCardCount).toBeGreaterThan(0);
  expect(searchedCardCount).toBeLessThanOrEqual(routineCardCount);

  const savedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('flow:saved:')));
  expect(savedKeys).toHaveLength(0);
});

test('my flow inventory can hide and restore a flow without removing today data', async ({ page }) => {
  await page.goto('/my?demo=ux20');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();
  const firstCard = page.getByTestId('my-flow-overview-card').first();
  const firstTitle = await firstCard.locator('h3').innerText();
  await firstCard.getByTestId('my-flow-hide-toggle').click();
  await expect(page.getByTestId('my-flow-overview-card').filter({ hasText: firstTitle })).toHaveCount(0);

  await page.getByTestId('my-flow-list-filter-hidden').click();
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-overview-card')).toContainText(firstTitle);
  await page.getByTestId('my-flow-overview-card').getByTestId('my-flow-hide-toggle').click();
  await page.getByTestId('my-flow-list-filter-all').click();
  await expect(page.getByTestId('my-flow-overview-card').filter({ hasText: firstTitle })).toHaveCount(1);
});

test('my flow ux12 calendar collapses dense days and opens recurring routine edits by default', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const denseDateCell = page.locator('.fc-daygrid-day[data-date="2026-05-27"]');
  await expect(denseDateCell.locator('.fc-event')).toHaveCount(4);
  const scheduleEventPadding = await denseDateCell.locator('.fc-event').first().evaluate((node) => {
    const styles = window.getComputedStyle(node);
    return {
      left: Number.parseFloat(styles.paddingLeft),
      right: Number.parseFloat(styles.paddingRight),
    };
  });
  expect(scheduleEventPadding.left).toBeLessThanOrEqual(1);
  expect(scheduleEventPadding.right).toBeLessThanOrEqual(1);
  const scheduleOverflow = denseDateCell.getByTestId('my-flow-schedule-overflow');
  await expect(scheduleOverflow).toContainText('+2');
  await expect(denseDateCell.locator('.fc-more-link')).toContainText('+1');
  await expect(denseDateCell.getByTestId('my-flow-routine-rail')).toBeVisible();
  const scheduleOverflowEventStyle = await denseDateCell.locator('.fc-event:has([data-testid="my-flow-schedule-overflow"])').first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      borderTopColor: style.borderTopColor,
    };
  });
  expect(scheduleOverflowEventStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(scheduleOverflowEventStyle.borderTopColor).toBe('rgba(0, 0, 0, 0)');
  await expect(scheduleOverflow).toHaveAttribute('aria-label', /2026-05-27/);
  await expect(scheduleOverflow).toHaveAttribute('aria-label', /2/);
  await page.locator('.fc-daygrid-day[data-date="2026-05-29"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('5월 29일');
  await scheduleOverflow.click();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('5월 27일');
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-schedule-overflow-date', '2026-05-27');
  await expect(page.getByTestId('my-flow-selected-day-schedule-overflow-note')).toContainText('+2');
  await expect(page.getByTestId('my-flow-selected-day-schedule-overflow-note')).toContainText('날짜 항목 포함');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);

  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first().click();
  const routineDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(routineDetail);
  await expandMyFlowAdvancedEditor(routineDetail);
  await routineDetail.getByTestId('my-flow-routine-repeat-toggle').click();
  const routineRepeatEditor = routineDetail.getByTestId('my-flow-routine-repeat-editor');
  await expect(routineRepeatEditor.locator('select')).toHaveValue('this');
  await expect(routineRepeatEditor.locator('input[type="checkbox"]').first()).toBeDisabled();
  await expect(routineRepeatEditor.getByTestId('my-flow-routine-end-date')).toBeDisabled();
});

test('my flow ux12 keeps single-flow detail lightweight inside the Flow view', async ({ page }) => {
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();
  const usedCarOverviewCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
  await usedCarOverviewCard.getByTestId('my-flow-next-action-open').click();
  const flowDetail = usedCarOverviewCard.getByTestId('my-flow-overview-inline-detail').getByTestId('my-flow-item-detail');
  await expect(flowDetail).toBeVisible();
  await expect(flowDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(flowDetail.getByTestId('my-flow-log-fields')).toHaveCount(0);
  await expect(flowDetail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(1);
  await enterMyFlowDetailEditMode(flowDetail);
  await expect(flowDetail.getByLabel('메모')).toBeVisible();
  await expect(flowDetail.locator('[data-testid^="my-flow-proof"]')).toHaveCount(0);

  await flowDetail.getByLabel('메모').fill('손전등 준비, 체크 메모 열어둠');
  await expect(flowDetail.getByRole('button', { name: '변경 저장' })).toBeVisible();
  await flowDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(usedCarOverviewCard.getByTestId('my-flow-overview-inline-detail')).toHaveCount(0);
  await usedCarOverviewCard.getByTestId('my-flow-next-action-open').click();
  const savedFlowDetail = usedCarOverviewCard.getByTestId('my-flow-overview-inline-detail').getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(savedFlowDetail);
  await expect(savedFlowDetail.getByLabel('메모')).toHaveValue('손전등 준비, 체크 메모 열어둠');
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

test('my flow ux12 calendar marks clicked routine icons active', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await routineIcon.click();

  await expect(routineIcon).toHaveClass(/my-flow-calendar-active-routine/);
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 3일');
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveAttribute('data-item-type', 'routine_session');
});

test('my flow ux12 moves only one routine occurrence from calendar detail', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const sourceRoutineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const sourceRoutineLabel = await sourceRoutineIcon.getAttribute('aria-label');
  expect(sourceRoutineLabel).toBeTruthy();
  await sourceRoutineIcon.click();

  const routineDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(routineDetail).toHaveAttribute('data-item-type', 'routine_session');
  await enterMyFlowDetailEditMode(routineDetail);
  await expect(routineDetail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-06-03');
  await routineDetail.getByTestId('my-flow-detail-date-input').fill('2026-06-04');
  await routineDetail.getByRole('button', { name: '변경 저장' }).click();

  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 4일');
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-04"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(1);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-06"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
});

test('my flow ux12 drags one routine icon to another calendar date', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const sourceRoutineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  const sourceRoutineLabel = await sourceRoutineIcon.getAttribute('aria-label');
  expect(sourceRoutineLabel).toBeTruthy();

  await sourceRoutineIcon.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));

  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(0);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-04"] [data-testid="my-flow-routine-icon"]').and(page.locator(`[aria-label="${sourceRoutineLabel}"]`))).toHaveCount(1);
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('6월 4일');
});

test('my flow ux12 drags an overflow routine row to another calendar date', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]').click();
  const overflowRoutineRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').nth(2);
  await expect(overflowRoutineRow).toBeVisible();
  const overflowRoutineKey = await overflowRoutineRow.getAttribute('data-routine-key');
  expect(overflowRoutineKey).toBeTruthy();

  await overflowRoutineRow.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));

  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).toContainText('6월 4일');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator(`article[data-routine-key="${overflowRoutineKey}"]`)).toHaveCount(1);
  await expect(page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-overflow"]')).toContainText('+1');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').getByTestId('my-flow-calendar-date-button').click();
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator('h3')).toContainText('6월 3일');
  await expect(page.getByTestId('my-flow-calendar-selected-day').locator(`article[data-routine-key="${overflowRoutineKey}"]`)).toHaveCount(0);
});

test('my flow ux12 calendar routine rows show the current occurrence state without ambiguous flow progress', async ({ page }) => {
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  const routineIcon = page.locator('.fc-daygrid-day[data-date="2026-06-03"] [data-testid="my-flow-routine-icon"]').first();
  await expect(routineIcon).toBeVisible();
  await routineIcon.dragTo(page.locator('.fc-daygrid-day[data-date="2026-06-04"]'));

  await page.locator('.fc-daygrid-day[data-date="2026-06-04"]').getByTestId('my-flow-calendar-date-button').click();
  const todayRoutineRow = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').first();
  await expect(todayRoutineRow).toBeVisible();
  await expect(todayRoutineRow.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 대기');
  await expect(todayRoutineRow).not.toContainText(/반복 항목 \d+\/\d+/);
  await expect(todayRoutineRow.getByTestId('my-flow-routine-completion-note')).toHaveCount(0);
});

test('my flow mobile keeps single saved flow in the same today and flow shell', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-28T03:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-06-26' }));
  });

  await page.goto('/my');

  await expect(page.getByText('오늘, 다음, 지난 할 일을 먼저 봅니다.')).toBeVisible();
  await expect(page.getByTestId('my-flow-now-section')).toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-single-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-single-continue')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-single-show-flow')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-today')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-routine')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-overdue-list')).toContainText('지난 할 일');
  await expect(page.getByTestId('my-flow-overdue-open-sheet')).toBeVisible();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).toContainText('저장한 콘텐츠');
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).toContainText('1개 저장');
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).not.toContainText(/오늘 0|다음 0|지난 할 일 0/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveAttribute('data-flow-slug', 'moving-d30-basic');
  await expect(page.getByTestId('my-flow-mobile-structure-row').getByTestId('my-flow-mobile-structure-progress')).toContainText(/전체 0\/24 완료/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).not.toContainText('0%');
  await expect(page.getByTestId('my-flow-overview-card')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-hide-toggle')).toHaveCount(0);

  await page.goto('/my?demo=ux12');
  await expect(page.getByTestId('my-flow-view-today')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-calendar')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();
  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-routine')).toHaveCount(0);
});

test('my flow mobile item opens editable detail inline from today page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-today').click();
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByTestId('my-flow-today-list')).toHaveCount(0);
  const overdueListBox = await page.getByTestId('my-flow-overdue-list').boundingBox();
  const completedListBox = await page.getByTestId('my-flow-today-completed-list').boundingBox();
  expect(overdueListBox?.y ?? 0).toBeLessThan(completedListBox?.y ?? 0);

  const firstRunnableRow = page.getByTestId('my-flow-now-section').getByTestId('my-flow-mobile-continuation-card').first();
  await expect(firstRunnableRow).toBeVisible();
  await expect(page.getByTestId('my-flow-now-section')).toContainText('지난 할 일');
  await expectTextOccurrenceAtMost(page.getByTestId('my-flow-now-section'), '지난 할 일', 1);
  await expect(page.getByTestId('my-flow-now-section')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(firstRunnableRow).not.toContainText('지난 할 일');
  await expect(firstRunnableRow).not.toContainText('지금 실행할 Step');
  await expect(firstRunnableRow).not.toContainText(/\d+%/);
  await expect(firstRunnableRow.getByTestId('my-flow-mobile-continuation-flow-context')).not.toContainText(/\d+\/\d+\s*완료/);
  await firstRunnableRow.getByTestId('my-flow-mobile-continuation-open').click();
  const mobileDetail = firstRunnableRow.getByTestId('my-flow-item-detail');
  await expect(mobileDetail).toBeVisible();
  await expect(mobileDetail).not.toContainText('Step 실행');
  await expect(mobileDetail).not.toContainText('Item');
  await expect(mobileDetail).not.toContainText('할 일 상태');
  await expect(mobileDetail).toContainText('실행할 일');
  await expect(mobileDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(mobileDetail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(0);
  await expect(mobileDetail.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).toHaveCount(0);
  await expect(mobileDetail.getByRole('button', { name: '수정', exact: true })).toHaveCount(0);
  await mobileDetail.getByText('메모·일정').click();
  await mobileDetail.getByRole('button', { name: /할 일 조정/ }).click();
  const originalMemo = await mobileDetail.getByLabel('메모').inputValue();
  await mobileDetail.getByLabel('메모').fill('모바일에서 취소할 실행 메모');
  await expect(mobileDetail.getByRole('button', { name: /수정 취소/ })).toBeVisible();
  await mobileDetail.getByRole('button', { name: /수정 취소/ }).click();
  await expect(mobileDetail).toHaveCount(0);

  await firstRunnableRow.getByRole('button').first().click();
  await mobileDetail.getByText('메모·일정').click();
  await mobileDetail.getByRole('button', { name: /할 일 조정/ }).click();
  await expect(mobileDetail.getByLabel('메모')).toHaveValue(originalMemo);
  await mobileDetail.getByLabel('메모').fill('모바일에서 수정한 실행 메모');
  await mobileDetail.getByRole('button', { name: '변경 저장' }).click();
  await expect(mobileDetail).toHaveCount(0);
  await firstRunnableRow.getByRole('button').first().click();
  await mobileDetail.getByText('메모·일정').click();
  await mobileDetail.getByRole('button', { name: /할 일 조정/ }).click();
  await expect(mobileDetail.getByLabel('메모')).toHaveValue('모바일에서 수정한 실행 메모');
});

test('my flow mobile calendar keeps date selection separate and gives events usable tap targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=ux12');

  const calendarCardBox = await page.getByTestId('my-flow-calendar-card').boundingBox();
  expect(calendarCardBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((calendarCardBox?.x ?? 9999) + (calendarCardBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(calendarCardBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  const initialSelectedDayBox = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(initialSelectedDayBox?.y ?? 9999).toBeLessThan(260);
  const calendarTop = await page.locator('.fc').boundingBox();
  expect(calendarTop?.y ?? 0).toBeGreaterThan(initialSelectedDayBox?.y ?? 0);
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
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail')).toHaveCount(0);
  const selectedDayAfterDateTap = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayAfterDateTap?.y ?? 9999).toBeLessThan(520);

  const mobileEvent = page.locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"][aria-label*="상세 열기"]');
  const eventBox = await mobileEvent.boundingBox();
  expect(eventBox?.height ?? 0).toBeGreaterThanOrEqual(28);
  await mobileEvent.click();
  const mobileDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(mobileDetail).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toContainText('필기와 실기 시험 범위 나누기');
  await expect(mobileDetail).not.toContainText('필기와 실기 시험 범위 나누기');
  await expect(mobileDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await enterMyFlowDetailEditMode(mobileDetail);
  await expect(mobileDetail.getByLabel('메모')).toBeVisible();
  await mobileDetail.getByRole('button', { name: /수정 취소/ }).click();
  await expect(mobileDetail).toHaveCount(0);

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
  await expect(page.getByTestId('my-flow-calendar-selected-day')).toHaveAttribute('data-overflow-date', '2026-06-03');
  await expect(page.getByTestId('my-flow-selected-day-overflow-note')).toContainText('+3');
  const selectedDayAfterOverflow = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayAfterOverflow?.y ?? 9999).toBeLessThan(220);
  const selectedDayBox = await page.getByTestId('my-flow-calendar-selected-day').boundingBox();
  expect(selectedDayBox?.x ?? 9999).toBeGreaterThanOrEqual(0);
  expect((selectedDayBox?.x ?? 9999) + (selectedDayBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(selectedDayBox?.width ?? 0).toBeGreaterThanOrEqual(350);
  const selectedDayFirstRow = page.getByTestId('my-flow-calendar-selected-day').locator('article').first();
  const selectedDayFirstRowBox = await selectedDayFirstRow.boundingBox();
  expect(selectedDayFirstRowBox?.height ?? 9999).toBeLessThanOrEqual(92);
  await expect(selectedDayFirstRow.getByTestId('my-flow-row-date-meta')).toBeHidden();
  await expect(page.getByTestId('my-flow-calendar-selected-day').getByRole('checkbox', { name: /이번 회차 완료 체크$/ }).first()).toBeVisible();

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
  await page.goto('/my?demo=ux12');
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();

  const usedCarCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
  await usedCarCard.getByTestId('my-flow-next-action-open').click();
  let detail = usedCarCard.getByTestId('my-flow-item-detail');
  await expect(detail).toHaveAttribute('data-detail-mode', 'execute');
  await expect(detail).toHaveAttribute('data-default-primary-action-count', '2');
  await expect(detail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(detail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(1);
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
  await expect(detail).toHaveCount(0);

  await usedCarCard.getByTestId('my-flow-next-action-open').click();
  detail = usedCarCard.getByTestId('my-flow-item-detail');
  await enterMyFlowDetailEditMode(detail);
  await detail.getByTestId('my-flow-detail-memo').fill('저장한 편집 메모');
  await detail.getByRole('button', { name: '변경 저장' }).click();
  await expect(detail).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const event = page.locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"]').first();
  await event.click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('article').first().getByRole('checkbox', { name: /완료/ })).toBeVisible();
  const mobileDetail = selectedDay.getByTestId('my-flow-item-detail');
  await expect(mobileDetail).toHaveAttribute('data-detail-mode', 'execute');
  await expect(mobileDetail).toHaveAttribute('data-default-primary-action-count', '2');
  await expect(mobileDetail.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
  await expect(mobileDetail.getByTestId('my-flow-detail-source-link')).not.toBeVisible();
  await enterMyFlowDetailEditMode(mobileDetail);
  await expect(mobileDetail.getByRole('checkbox', { name: /완료 체크$/ })).toHaveCount(0);
  await expect(mobileDetail.getByRole('button', { name: /수정 취소/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('my flow mobile keeps checklist and routine work inside flow and calendar surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await expect(page.getByTestId('my-flow-view-checklist')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-view-routine')).toHaveCount(0);

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const inventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(inventorySheet.getByTestId('my-flow-list-filter-routine')).toBeVisible();
  await inventorySheet.getByTestId('my-flow-list-filter-routine').click();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-routine')).toHaveAttribute('aria-pressed', 'true');
  await expect(inventorySheet.getByTestId('my-flow-group-row').first()).toContainText('Flow');

  await inventorySheet.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(inventorySheet).toHaveCount(0);
  await page.goto('/calendar?demo=ux12');
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await expect(page.getByTestId('my-flow-calendar-scope-filter')).toBeVisible();
  await page.getByTestId('my-flow-calendar-scope-routine').click();
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await expect(page.getByTestId('my-flow-calendar-scope-routine')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="my-flow-routine-icon"]').first()).toBeVisible();
});

test('my flow mobile status board opens actionable flow lists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux12');

  await page.getByTestId('my-flow-view-flow').click();
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByTestId('my-flow-overview-summary')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-board')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-priority-section')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-mobile-flow-hub')).toContainText('저장한 콘텐츠');
  await expect(page.getByTestId('my-flow-mobile-flow-summary')).not.toContainText(/오늘 0|다음 0|지난 할 일 0/);
  await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(4);
  const firstStructureRow = page.getByTestId('my-flow-mobile-structure-row').first();
  await expect(firstStructureRow.getByTestId('my-flow-mobile-structure-progress')).toContainText(/전체 \d+\/\d+ 완료/);
  await expect(firstStructureRow).not.toContainText(/\d+%/);
  await firstStructureRow.getByTestId('my-flow-mobile-structure-open').click();
  await expect(firstStructureRow.getByTestId('my-flow-mobile-structure-step-list')).toBeVisible();
  await expect(firstStructureRow.getByTestId('my-flow-mobile-structure-open')).not.toContainText(/Step \d+개/);
  await expect(firstStructureRow.getByTestId('my-flow-mobile-structure-step-row')).toHaveCount(3);
  await expect(firstStructureRow.getByTestId('my-flow-mobile-structure-show-all')).toHaveCount(0);
  await expect(firstStructureRow.getByTestId('my-flow-item-detail')).toHaveCount(0);
  await firstStructureRow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  await expect(firstStructureRow.getByTestId('my-flow-item-detail')).toBeVisible();
  await expect(firstStructureRow.getByTestId('my-flow-item-detail')).toContainText('실행할 일');
  await expect(firstStructureRow.getByTestId('my-flow-inline-action-hint')).toBeVisible();
  await expect(firstStructureRow.getByTestId('my-flow-inline-action-hint')).toContainText('바로 할 일');
  await expect(firstStructureRow.getByTestId('my-flow-inline-action-hint')).not.toContainText('Step');
  await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText('전체 Flow 목록 열기');
  await expect(page.getByTestId('my-flow-status-overdue')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-status-next')).toHaveCount(0);
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const inventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(16);
  await expect(inventorySheet.getByRole('button', { name: '완료 체크' })).toHaveCount(0);
  await inventorySheet.getByRole('button', { name: '닫기', exact: true }).click();

  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const openInventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(openInventorySheet).toBeVisible();
  await openInventorySheet.getByTestId('my-flow-list-filter-open').click();
  await expect(openInventorySheet.getByTestId('my-flow-list-filter-open')).toHaveAttribute('aria-pressed', 'true');
  const openFlowCount = await openInventorySheet.getByTestId('my-flow-group-row').count();
  expect(openFlowCount).toBeGreaterThan(0);
  expect(openFlowCount).toBeLessThan(16);
});

test('my flow mobile ux20 limits large inventory before showing all flows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=ux20');

  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  const inventorySheet = page.getByRole('dialog', { name: '전체 Flow 목록' });
  await expect(inventorySheet).toBeVisible();
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(8);
  await expect(inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle')).toContainText('전체 Flow 보기 27개');

  await inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle').click();
  await expect(inventorySheet.getByTestId('my-flow-group-row')).toHaveCount(27);
  await expect(inventorySheet.getByTestId('my-flow-mobile-large-inventory-toggle')).toHaveCount(0);

  await inventorySheet.getByTestId('my-flow-list-filter-routine').click();
  await expect(inventorySheet.getByTestId('my-flow-list-filter-routine')).toHaveAttribute('aria-pressed', 'true');
  const routineRows = await inventorySheet.getByTestId('my-flow-group-row').count();
  expect(routineRows).toBeGreaterThan(0);
  expect(routineRows).toBeLessThan(27);
});

test('public flow item card keeps detail reachable without execution controls', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await page.getByLabel('이사일').fill('2026-06-22');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByRole('checkbox')).toHaveCount(0);
  await expect(workbench.getByText('이사할 집 하자 점검하기')).toBeVisible();
  const firstDetail = workbench.getByTestId('artifact-list-card').locator('summary', { hasText: '자세히' }).first();
  await expect(firstDetail).toBeVisible();

  await firstDetail.click();
  await expect(workbench.getByText('실행:').first()).toBeVisible();
  await expect(workbench.getByText('완료:').first()).toBeVisible();
  await expect(workbench.getByText('이유:').first()).toBeVisible();
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

test('computer skills final QA exports checklist and calendar without study progress tables', async ({ page }) => {
  await page.goto('/f/computer-skills-d30-study');

  await expect(page.getByRole('heading', { name: '컴퓨터활용능력 1급 D-30 학습' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '컴퓨터활용능력 1급 D-30 학습 Flow' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
  await expect(page.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(page.getByTestId('artifact-log-table-study-mock-scores')).toHaveCount(0);

  await page.getByLabel('시험일').fill('2026-06-22');
  await expect(page.getByText('05-23').first()).toBeVisible();

  let studyWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(studyWorkbench.getByRole('checkbox')).toHaveCount(0);
  const flowExport = studyWorkbench.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeEnabled();
  await expect(flowExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeEnabled();

  const excelDownloadPromise = page.waitForEvent('download');
  await flowExport.getByRole('button', { name: /시트로 받기/ }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('computer-skills-d30-study.xlsx');

  const calendarDownloadPromise = page.waitForEvent('download');
  studyWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await studyWorkbench.getByTestId('public-flow-export-secondary-entry').getByRole('button', { name: /캘린더 파일 받기/ }).click();
  const calendarDownload = await calendarDownloadPromise;
  expect(calendarDownload.suggestedFilename()).toBe('computer-skills-d30-study.ics');
});

test('risk-boundary QA keeps full-flow export available beside new-car evidence', async ({ page }) => {
  await page.goto('/f/new-car-delivery-check');

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench).toBeVisible();
  const holdSection = workbench.getByTestId('flow-hold-section');
  await expect(holdSection).toContainText('인수 보류 기준');
  await holdSection.getByTestId('flow-hold-memo-toggle').click();
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-reason').fill('driver door scratch');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files').fill('door-scratch-4821.jpg, hud-test-20260603.mp4');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-confirmation').fill('dealer confirmed scratch and will send written repair date');
  await holdSection.getByTestId('flow-hold-field-new-car-delivery-check-hold-next-check').fill('do not sign until repair memo is attached');
  await expect(workbench.getByRole('checkbox')).toHaveCount(0);
  const flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeEnabled();

  const excelDownloadPromise = page.waitForEvent('download');
  await flowExport.getByRole('button', { name: /시트로 받기/ }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toBe('new-car-delivery-check.xlsx');
});

test('public MVP guardrail screens keep evidence and stop conditions first', async ({ page }) => {
  await page.goto('/f/new-car-delivery-check');

  let workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('인수 보류 기준');
  await expect(workbench.getByTestId('flow-hold-memo-toggle')).toBeVisible();
  await expect(workbench.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files')).toBeHidden();
  await workbench.getByTestId('flow-hold-memo-toggle').click();
  await expect(workbench.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await expectPublicFlowRouteClosed(page, '/f/baby-food-menu-recipe');
});

test('moving mobile keeps save sticky and full-flow export secondary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-07-15');
  await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const mobileBar = page.getByTestId('mobile-export-bar');
  await expect(mobileBar).toBeVisible();
  await expect(mobileBar.getByText('Flow 전체 · 24개 항목')).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();
  await expect(mobileBar.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
  await expect(mobileBar.getByRole('button', { name: '엑셀 받기' })).toHaveCount(0);

  const flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await expect(flowExport).toBeVisible();
  await expect(flowExport).not.toHaveAttribute('open', '');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(flowExport.getByRole('button', { name: /메모로 복사/ })).toBeVisible();
});

test('wedding flow keeps its anchor and read-only artifact within flow-level actions', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toHaveCount(0);
  await expect(page.getByTestId('public-flow-primary-setup')).toContainText('예식일 입력');
  await expect(page.getByText('첫 행동:')).toHaveCount(0);
  await expect(page.getByText('원문과 근거')).toBeVisible();
  await expect(page.getByText('ohprint.me')).toBeVisible();
  await expect(page.getByLabel('예식일')).toBeVisible();

  await page.getByLabel('예식일').fill('2026-09-15');
  await expect(page.getByText(/예식일.*9월 15일/)).toBeVisible();
  await expect(page.getByText(/예식일 기준으로 날짜가 계산/)).toBeVisible();

  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('public-flow-preview-summary')).toHaveText('12개 항목');
  await expect(workbench.getByRole('checkbox')).toHaveCount(0);
  await expect(workbench.getByText('예식 날짜와 예상 하객 규모 정하기').first()).toBeVisible();
  await expect(workbench).toContainText('보증인원 변경 가능 기한');
  await expect(workbench.getByTestId('wedding-source-bridge')).toContainText('계약금/위약금');
  await expect(workbench).toContainText('하객 명단');
  await expect(page.getByTestId('public-flow-export-secondary-entry')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('예식일')).toHaveValue('2026-09-15');
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' }).getByRole('checkbox')).toHaveCount(0);
});

test('current P1 flows expose new execution model surfaces', async ({ page }) => {
  await page.goto('/f/wedding-d180-basic');

  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '결혼 준비 D-300 타임라인 Flow' })).toHaveCount(0);
  await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toContainText('일정과 할 일');
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('artifact-list-card')).toBeVisible();

  for (const [slug, title] of [
    ['english-study-30day-routine', '직장인 영어공부 30일 루틴'],
  ] as const) {
    await page.goto(`/f/${slug}`);

    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByRole('heading', { name: `${title} Flow` })).toHaveCount(0);
    await expect(page.getByText('새 실행모델로 전환 중')).toHaveCount(0);
    await expect(page.getByText('회차 그리드')).toBeVisible();
    await expect(page.getByText('회차 기록표', { exact: true })).toBeVisible();
  }
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
  await expect(page.getByRole('heading', { name: '이 Flow는 지금 열 수 없어요' })).toBeVisible();
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

test('routine flow highlights weekly routine setup', async ({ page }) => {
  await page.goto('/f/english-study-30day-routine');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('routine-session-grid-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-session-log-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-today-session-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await page.getByLabel('시작일', { exact: true }).fill('2026-06-01');
  await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
});

test('routine desktop uses session grid and session log artifacts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/english-study-30day-routine');

  const workbench = page.getByLabel('Flow artifact workbench');
  const sessionGrid = workbench.getByTestId('routine-session-grid-card');
  const sessionLog = workbench.getByTestId('routine-session-log-card');
  const todayCard = workbench.getByTestId('routine-today-session-card');

  await expect(sessionGrid).toBeVisible();
  await expect(sessionGrid.getByText(/1주차/).first()).toBeVisible();

  await expect(sessionLog).toBeVisible();
  await expect(sessionLog.getByRole('button', { name: '시트로 받기' })).toHaveCount(0);
  const flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: '시트로 받기' })).toBeVisible();

  await expect(todayCard).toBeVisible();

  const gridBox = await sessionGrid.boundingBox();
  const logBox = await sessionLog.boundingBox();
  expect(gridBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(gridBox!.y).toBeLessThan(logBox!.y);

  await expect(page.getByText('validated')).toHaveCount(0);
});

test('routine mobile puts the session card before the calendar card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const slug of [
    'english-study-30day-routine',
  ] as const) {
    await page.goto(`/f/${slug}`);

    const workbench = page.getByLabel('Flow artifact workbench');
    const sessionCard = workbench.getByTestId('routine-today-session-card').first();
    const calendarCard = workbench.getByTestId('artifact-calendar-card').first();

    await expect(sessionCard).toBeVisible();
    await expect(sessionCard.getByRole('checkbox')).toHaveCount(0);
    await expect(sessionCard.getByTestId('routine-session-record-button')).toHaveCount(0);
    await expect(calendarCard).toBeVisible();
    await expect(calendarCard.getByText('2주차', { exact: true }).first()).toBeHidden();
    await calendarCard.getByTestId('routine-grid-mobile-toggle').click();
    await expect(calendarCard.getByText('2주차', { exact: true }).first()).toBeVisible();

    const sessionLog = workbench.getByTestId('routine-session-log-card');
    await expect(sessionLog.locator('table')).toBeHidden();
    await sessionLog.getByTestId('routine-session-log-mobile-toggle').click();
    await expect(sessionLog.locator('table')).toBeVisible();

    const sessionBox = await sessionCard.boundingBox();
    const calendarBox = await calendarCard.boundingBox();
    expect(sessionBox).not.toBeNull();
    expect(calendarBox).not.toBeNull();
    expect(sessionBox!.y).toBeLessThan(calendarBox!.y);

    await expect(page.getByText('validated')).toHaveCount(0);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/english-study-30day-routine');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card').last()).toBeVisible();
});

test('low-context date labels explain the required anchor', async ({ page }) => {
  await page.goto('/f/vehicle-inspection-prep');

  await expect(page.getByLabel('검사일')).toBeVisible();
  await page.getByLabel('검사일').fill('2026-08-20');
  await page.getByRole('button', { name: '입력' }).click();

  await expect(page.getByText(/검사일.*8월 20일/)).toBeVisible();
  await expect(page.getByText('08-06').first()).toBeVisible();
});

test('no-anchor checklist skips date setup and hides calendar export', async ({ page }) => {
  await page.goto('/f/passport-renewal-docs');

  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  const flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await expect(flowExport.getByRole('button', { name: /캘린더 파일 받기/ })).toHaveCount(0);
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(flowExport.getByRole('button', { name: /메모로 복사/ })).toBeVisible();
});

test('used-car checklist shows decision preview instead of calendar by default', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 메모');
  const checklist = workbench.getByTestId('artifact-list-card');
  await expect(checklist).toBeVisible();
  await expect(checklist.getByRole('checkbox')).toHaveCount(0);
  await expect(checklist.getByTestId('public-flow-included-item-marker')).toHaveCount(8);
  await checklist.getByTestId('artifact-checklist-more-toggle').click();
  await expect(checklist.getByRole('checkbox')).toHaveCount(0);
  await expect(checklist.getByTestId('public-flow-included-item-marker')).toHaveCount(15);
  await expect(checklist.getByRole('button', { name: '핵심 8개만 보기' })).toBeVisible();
  await expect(workbench).toContainText('카히스토리');
  await expect(workbench).toContainText('자동차등록원부');
  await expect(workbench).toContainText('침수 흔적');
  await expect(workbench).toContainText('정비소 또는 전문가 점검');
  await expect(workbench).toContainText('계약서에 결함·보증·반품 조건');
  await expect(workbench.getByTestId('used-car-source-bridge')).toContainText('원문에서 옮긴 점검 순서');
  const decisionCard = workbench.getByTestId('used-car-decision-result-card');
  await expect(decisionCard).toContainText('점검 후 판단');
  await expect(decisionCard).toContainText('현장 체크가 끝나면 구매/보류/거절 중 하나만 남깁니다');
  await expect(decisionCard.getByRole('button', { name: '구매 진행' })).toBeVisible();
  await expect(decisionCard.getByRole('button', { name: '보류' })).toBeVisible();
  await expect(decisionCard.getByRole('button', { name: '거절' })).toBeVisible();
  await decisionCard.getByRole('button', { name: '보류' }).click();
  await expect(decisionCard.getByRole('button', { name: '보류' })).toHaveAttribute('aria-pressed', 'true');
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('공식 조회/사진 메모(선택)');
  await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
});

test('used-car first screen keeps hold memo and checklist before comparison density', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toContainText('구매 보류 메모');
  await expect(workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toBeHidden();
  await workbench.getByTestId('flow-hold-memo-toggle').click();
  await expect(workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  const listTop = await workbench.getByTestId('artifact-list-card').evaluate((element) => element.getBoundingClientRect().top);
  const holdTop = await workbench.getByTestId('flow-hold-section').evaluate((element) => element.getBoundingClientRect().top);
  expect(listTop).toBeLessThan(holdTop);
});

test('representative flows show artifact-first previews on the first screen', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-comparison-card')).toHaveCount(0);

  await page.goto('/f/english-study-30day-routine');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/washer-tub-clean-monthly');
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('maintenance-routine-checklist-card')).toBeVisible();
});

test('artifact workbench shows the primary usable surface first', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('Flow 구성');
  await expect(workbench).toContainText('다가오는 할 일');
  await expect(workbench).toContainText('일정 한눈에 보기');

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('flow-hold-section')).toBeVisible();
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/english-study-30day-routine');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('routine-session-grid-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-session-log-card')).toBeVisible();

  await page.goto('/f/fridge-cleanout-weekly-plan');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toBeVisible();
  await expect(workbench).toContainText('7일 재고 소진표');
});

test('common first screen keeps one read-only artifact concise and expandable', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('public-flow-preview-summary')).toHaveText('24개 항목');
  await expect(page.getByText('항목을 체크하면 이 브라우저에 자동 저장됩니다.')).toHaveCount(0);

  const listCard = workbench.getByTestId('artifact-list-card');
  await expect(listCard).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
  await expect(listCard.getByRole('checkbox')).toHaveCount(0);
  await expect(listCard.getByTestId('public-flow-included-item-marker')).toHaveCount(8);
  await listCard.getByRole('button', { name: '나머지 16개 보기' }).click();
  await expect(listCard.getByRole('checkbox')).toHaveCount(0);
  await expect(listCard.getByTestId('public-flow-included-item-marker')).toHaveCount(24);
  await expect(listCard.getByRole('button', { name: '처음 8개만 보기' })).toBeVisible();
});

test('artifact workbench keeps whole-flow export behind one secondary entry', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  const movingListCard = workbench.getByTestId('artifact-list-card');
  const movingCalendarCard = workbench.getByTestId('artifact-calendar-card');
  await expect(workbench).toBeVisible();
  await expect(movingListCard.getByRole('button', { name: '체크리스트 복사' })).toHaveCount(0);
  await expect(movingCalendarCard.getByRole('button', { name: '캘린더 파일 받기' })).toHaveCount(0);
  const movingExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await expect(movingExport).not.toHaveAttribute('open', '');
  await movingExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(movingExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(movingExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();
  await expect(movingExport.getByRole('button', { name: /내 버전/ })).toBeVisible();
  await expect(workbench.getByText('실행판에서 체크한 내용을 내 도구로 옮깁니다.')).toHaveCount(0);

  await page.goto('/f/computer-skills-d30-study');
  workbench = page.getByLabel('Flow artifact workbench');
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');
  await expect(workbench).toBeVisible();
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByRole('button', { name: '시트로 받기' })).toHaveCount(0);
  await expect(studyCalendarCard.getByRole('button', { name: '캘린더 파일 받기' })).toHaveCount(0);
  const studyExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await studyExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(studyExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(studyExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();
});

test('timeline desktop gives the execution list more width than the compact calendar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/f/moving-d30-basic');

  const workbench = page.getByLabel('Flow artifact workbench');
  const calendarBox = await workbench.getByTestId('artifact-calendar-card').boundingBox();
  const listBox = await workbench.getByTestId('artifact-list-card').boundingBox();

  expect(calendarBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  expect(calendarBox!.x).toBeLessThan(listBox!.x);
  expect(listBox!.width).toBeGreaterThan(calendarBox!.width * 2);
  expect(Math.abs(listBox!.y - calendarBox!.y)).toBeLessThan(4);
});

test('moving desktop keeps source context in a right rail beside the workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/moving-d30-basic');

  const layout = page.getByTestId('flow-desktop-workbench-layout');
  const rail = page.getByTestId('flow-desktop-rail');
  const workbench = page.getByLabel('Flow artifact workbench');

  await expect(layout).toBeVisible();
  await expect(rail.getByTestId('flow-source-card')).toBeVisible();

  const railBox = await rail.boundingBox();
  const workbenchBox = await workbench.boundingBox();

  expect(railBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(railBox!.x).toBeGreaterThan(workbenchBox!.x + workbenchBox!.width);
});

test('dense desktop routes keep source context in a right rail beside the workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const slug of [
    'computer-skills-d30-study',
    'moving-d30-basic',
    'new-car-delivery-check',
    'used-car-buying-check',
  ]) {
    await page.goto(`/f/${slug}`);

    const layout = page.getByTestId('flow-desktop-workbench-layout');
    const rail = page.getByTestId('flow-desktop-rail');
    const workbench = page.getByLabel('Flow artifact workbench');

    await expect(layout).toBeVisible();
    await expect(rail.getByTestId('flow-source-card')).toBeVisible();

    const railBox = await rail.boundingBox();
    const workbenchBox = await workbench.boundingBox();

    expect(railBox).not.toBeNull();
    expect(workbenchBox).not.toBeNull();
    expect(railBox!.x).toBeGreaterThan(workbenchBox!.x + workbenchBox!.width);
  }
});

test('public detail rebrand keeps a tool-first shell without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByTestId('flow-public-shell')).toBeVisible();
  await expect(page.getByTestId('platform-nav')).toHaveCount(0);
  await expect(page.getByTestId('flow-public-search')).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();
  await expect(page.getByTestId('flow-desktop-workbench-layout')).toBeVisible();

  const shellBox = await page.getByTestId('flow-public-shell').boundingBox();
  const workbenchBox = await page.getByLabel('Flow artifact workbench').boundingBox();
  expect(shellBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(shellBox!.width).toBeGreaterThan(workbenchBox!.width * 0.9);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  await expect(page.getByTestId('flow-public-shell')).toBeVisible();
  await expect(page.getByTestId('platform-mobile-tabs')).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasHorizontalOverflow).toBe(false);
});

test('public share shell keeps browse link reachable after the primary path', async ({ page }) => {
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
    const browseLink = page.getByTestId('flow-public-secondary-browse-link');
    await expect(shell).toBeVisible();
    await expect(browseLink).toBeVisible();
    await expect(browseLink).toHaveText('콘텐츠 더 보기');
    await expect(browseLink).toHaveAttribute('href', '/flows');
    await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
    await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');
    await expect(browseLink).toHaveCSS('border-top-width', '0px');
    await expect(browseLink).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(browseLink).toHaveCSS('font-size', '12px');

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
          testId: element.dataset.testid ?? element.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
        })),
    );
    const browseIndex = focusableEntries.findIndex((entry) => entry.testId === 'flow-public-secondary-browse-link');
    const primaryIndex = focusableEntries.findIndex(
      (entry) =>
        entry.testId === 'public-flow-mobile-save-cta' ||
        entry.testId === 'public-flow-primary-setup' ||
        entry.testId === 'moving-save-actions' ||
        entry.text.includes('내 Flow에 저장'),
    );
    expect(browseIndex).toBeGreaterThanOrEqual(0);
    if (primaryIndex >= 0) {
      expect(browseIndex).toBeGreaterThan(primaryIndex);
    }

    const saveButton = page.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ }).first();
    if ((await saveButton.count()) > 0 && (await saveButton.isVisible())) {
      await expect(saveButton).toHaveCSS('background-color', 'rgb(54, 84, 255)');
    }
  }
});

test('mobile full-flow export remains available without item-level duplicates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/computer-skills-d30-study');

  await page.getByLabel('시험일').fill('2026-06-22');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByRole('checkbox')).toHaveCount(0);
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
  await expect(studyCalendarCard.getByTestId('mobile-artifact-export-calendar')).toHaveCount(0);

  const flowExport = workbench.getByTestId('public-flow-export-secondary-entry');
  await expect(flowExport).toContainText('이 Flow 통째로 가져가기');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeEnabled();
  await expect(flowExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeEnabled();
});

test('validation fix surfaces route-specific anchors, safety panels, and mobile destination CTA labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/computer-skills-d30-study');
  await expect(page.getByLabel('시험일')).toBeVisible();
  let flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();

  await expectPublicFlowRouteClosed(page, '/f/baby-food-menu-recipe');

  await page.goto('/f/new-car-delivery-check');
  await expect(page.getByTestId('flow-hold-section')).toContainText('인수 보류 기준');
  await expect(page.getByTestId('flow-hold-section')).toContainText('사진 파일명');
  flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
});

test('vehicle hold memo entries persist while full-flow export stays secondary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  const newCarHold = page.getByTestId('flow-hold-section');
  await expect(newCarHold).toBeVisible();
  await newCarHold.getByTestId('flow-hold-memo-toggle').click();
  await newCarHold.getByTestId('flow-hold-field-new-car-delivery-check-hold-reason').fill('paint scratch needs dealer confirmation');
  await newCarHold.getByTestId('flow-hold-field-new-car-delivery-check-hold-evidence-files').fill('door-scratch-4821.jpg');
  let flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(newCarHold.getByTestId('flow-hold-field-new-car-delivery-check-hold-reason')).toHaveValue('paint scratch needs dealer confirmation');

  await page.goto('/f/used-car-buying-check');
  const usedCarHold = page.getByTestId('flow-hold-section');
  await expect(usedCarHold).toContainText('구매 보류 메모');
  await usedCarHold.getByTestId('flow-hold-memo-toggle').click();
  await usedCarHold.getByTestId('flow-hold-field-used-car-buying-check-hold-reason').fill('insurance history conflicts with seller explanation');
  await usedCarHold.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files').fill('usedcar_20260526_engine_noise.mp4');
  flowExport = page.getByTestId('public-flow-export-secondary-entry');
  await flowExport.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(flowExport.getByRole('button', { name: /시트로 받기/ })).toBeVisible();
  await expect(usedCarHold.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toHaveValue('insurance history conflicts with seller explanation');
});

test('mobile workbench keeps destination export at the flow level', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  let listCard = workbench.getByTestId('artifact-list-card');
  let calendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(listCard.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
  await expect(calendarCard.getByTestId('mobile-artifact-export-calendar')).toHaveCount(0);
  await expect(workbench.getByTestId('public-flow-export-secondary-entry')).toBeVisible();

  await page.goto('/f/computer-skills-d30-study');
  workbench = page.getByLabel('Flow artifact workbench');
  const studyListCard = workbench.getByTestId('artifact-list-card');
  const studyCalendarCard = workbench.getByTestId('artifact-calendar-card');

  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(studyListCard.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
  await expect(studyCalendarCard.getByTestId('mobile-artifact-export-calendar')).toHaveCount(0);
  await expect(workbench.getByTestId('public-flow-export-secondary-entry')).toBeVisible();

  await page.goto('/f/washer-tub-clean-monthly');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(workbench.getByTestId('maintenance-routine-next-card')).toBeVisible();
  await expect(workbench.getByTestId('public-flow-export-secondary-entry')).toBeVisible();

  await page.goto('/f/new-car-delivery-check');
  workbench = page.getByLabel('Flow artifact workbench');
  const newCarListCard = workbench.getByTestId('artifact-list-card');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(newCarListCard).toBeVisible();
});

test('mobile schedule artifacts show the calendar before dense tables', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/moving-d30-basic');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();
});

test('mobile study route starts with the actionable list before the compact calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/computer-skills-d30-study');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(workbench.getByTestId('artifact-calendar-card')).toBeVisible();

  const order = await workbench.locator('[data-testid="artifact-list-card"], [data-testid="artifact-calendar-card"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.testid ?? node.tagName.toLowerCase()),
  );

  expect(order.slice(0, 2)).toEqual(['artifact-list-card', 'artifact-calendar-card']);
});

test('mobile vehicle checklist routes omit comparison summary grids', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
});

test('study progress table is absent from the experiment checklist route', async ({ page }) => {
  await page.goto('/f/computer-skills-d30-study');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-log-table-study-chapter-progress')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-log-table-study-mock-scores')).toHaveCount(0);
  await expect(workbench.getByTestId('artifact-list-card')).toBeVisible();
});

test('mobile sensitive routes collapse secondary execution sections below the first artifact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/new-car-delivery-check');
  let collapsedSections = page.getByTestId('mobile-collapsed-section');
  await expect(collapsedSections).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('artifact-list-card')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  collapsedSections = page.getByTestId('mobile-collapsed-section');
  await expect(collapsedSections).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('flow-hold-section')).toBeVisible();

  await expectPublicFlowRouteClosed(page, '/f/baby-food-menu-recipe');
});

test('public artifact persists setup and notes without exposing execution completion', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByLabel('이사일').fill('2026-07-15');
  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('public-flow-preview-summary')).toHaveText('24개 항목');
  await expect(workbench.getByRole('checkbox')).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('이사일')).toHaveValue('2026-07-15');
  await expect(page.getByLabel('Flow artifact workbench').getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench').getByTestId('public-flow-preview-summary')).toHaveText('24개 항목');
  const reloadedMovingWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(reloadedMovingWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(reloadedMovingWorkbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.reload();
  const restoredMovingWorkbench = page.getByLabel('Flow artifact workbench');
  await expect(restoredMovingWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(restoredMovingWorkbench.getByTestId('artifact-calendar-card')).toBeVisible();

  await page.goto('/f/english-study-30day-routine');
  const routineWorkbench = page.getByLabel('Flow artifact workbench');
  const routineLogCard = routineWorkbench.getByTestId('routine-session-log-card');
  await expect(routineLogCard.getByRole('checkbox')).toHaveCount(0);
  await routineLogCard.getByLabel('회차 메모: 1회차').fill('오답노트 20분 추가');
  await routineLogCard.getByLabel('회차 메모: 2회차').fill('듣기 20분, 단어 30개');

  await page.reload();
  const reloadedRoutineWorkbench = page.getByLabel('Flow artifact workbench');
  const reloadedRoutineLogCard = reloadedRoutineWorkbench.getByTestId('routine-session-log-card');
  await expect(reloadedRoutineLogCard.getByRole('checkbox')).toHaveCount(0);
  await expect(reloadedRoutineLogCard.getByLabel('회차 메모: 1회차')).toHaveValue('오답노트 20분 추가');
  await expect(reloadedRoutineLogCard.getByLabel('회차 메모: 2회차')).toHaveValue('듣기 20분, 단어 30개');

});

test('vehicle hold memo edits and persists user notes', async ({ page }) => {
  await page.goto('/f/used-car-buying-check');

  const workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench.getByTestId('artifact-comparison-card')).toHaveCount(0);
  await workbench.getByTestId('flow-hold-memo-toggle').click();
  await workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason').fill('insurance history conflict');
  await workbench.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files').fill('usedcar_20260526_engine_noise.mp4');

  await page.reload();

  const restoredWorkbench = page.getByLabel('Flow artifact workbench');
  await restoredWorkbench.getByTestId('flow-hold-memo-toggle').click();
  await expect(restoredWorkbench.getByTestId('flow-hold-field-used-car-buying-check-hold-reason')).toHaveValue('insurance history conflict');
  await expect(restoredWorkbench.getByTestId('flow-hold-field-used-car-buying-check-hold-evidence-files')).toHaveValue('usedcar_20260526_engine_noise.mp4');
});

test('public flow can be copied into an editable draft', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  const publicExport = page.getByRole('region', { name: 'Flow artifact workbench' }).getByTestId('public-flow-export-secondary-entry');
  await publicExport.getByTestId('public-flow-export-secondary-toggle').click();
  await publicExport.getByRole('button', { name: /내 버전/ }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: /이사 D-30 준비 Flow 사본/ })).toBeVisible();
  await expect(page.getByText('초안 Flow')).toBeVisible();
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

test('approved promoted content-flow routes preserve executable source cues', async ({ page }) => {
  const expectations: Record<string, string[]> = {
    '/f/washer-tub-clean-monthly': ['문 열어 건조', '고무패킹', '세제통', '배수필터', '통세척/통살균 코스', '설명서에서 허용한 종류와 양', '월 1회 관리일'],
    '/f/wedding-d180-basic': ['D-300~D-180', '보증인원', '계약금', '청첩장', '식권', 'BGM', '역할 분담'],
    '/f/used-car-buying-check': ['원문에서 옮긴 점검 순서', '자동차등록원부', '침수 흔적', '점검 후 판단', '구매/보류/거절'],
    '/f/fridge-cleanout-weekly-plan': ['냉장고 지도', '우선 재료', '메뉴 후보', '장보기 보류', '상태', '장보기 전 메모'],
  };

  for (const [route, terms] of Object.entries(expectations)) {
    await page.goto(route);
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
    await expect(workbench).toBeVisible();
    if (route === '/f/used-car-buying-check') {
      await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
      await expect(workbench.getByRole('heading', { name: '현장 체크리스트' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('방문/시승일 기록');
    }
    if (route === '/f/fridge-cleanout-weekly-plan') {
      await expect(workbench.getByRole('heading', { name: '7일 재고 소진표' }).first()).toBeVisible();
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('우선 재료');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('메뉴 후보');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('장보기 보류');
      await expect(workbench.getByTestId('artifact-log-table-spreadsheet')).toContainText('상태');
      await expect(workbench).toContainText('장보기 전 메모');
      await expect(workbench).toContainText('절약액이나 영양 균형은 계산하지 않습니다');
      await expect(workbench).not.toContainText('운동');
      await expect(workbench).not.toContainText('측정');
      await expect(page.locator('body')).not.toContainText('칼로리');
      await expect(page.locator('body')).not.toContainText('체중 감량');
      await expect(page.locator('body')).not.toContainText('보장합니다');
    }
    for (const term of terms) {
      await expect(workbench).toContainText(term);
    }
  }
});

test('promoted maintenance routes use source-specific artifact workbenches', async ({ page }) => {
  await page.goto('/f/washer-tub-clean-monthly');
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByRole('heading', { name: '관리 캘린더' })).toBeVisible();
  await expect(workbench).toContainText('관리일');
  await expect(workbench.getByTestId('maintenance-source-bridge')).toContainText('원문에서 옮긴 실행 단서');
  await expect(workbench.getByTestId('maintenance-source-bridge').getByRole('link', { name: '원문 보기' })).toBeVisible();
  await expect(workbench.getByTestId('maintenance-routine-checklist-card')).toBeVisible();
  await expect(workbench.getByTestId('maintenance-routine-next-card')).toBeVisible();
  await expect(workbench.getByTestId('maintenance-source-bridge')).toContainText('통세척/통살균 코스');
  await expect(workbench.getByTestId('maintenance-source-bridge')).toContainText('월 1회 관리일');
  await expect(workbench.getByTestId('maintenance-source-bridge')).toContainText('설명서에서 허용한 종류와 양');
  await expect(workbench).not.toContainText('과탄산소다 100g');
  await expect(workbench).not.toContainText('2주 1회');

  for (const route of ['/f/monstera-care-routine', '/f/water-purifier-filter-cycle']) {
    await expectPublicFlowRouteClosed(page, route);
  }
});

test('current-source audit batch exposes one execution surface only for approved routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/f/first-passport-issue',
    '/f/closet-organize-1day',
    '/f/portfolio-4week',
  ]) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
    await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
    await expect(page.getByLabel('Flow artifact preview')).toHaveCount(0);
    await expect(page.getByText('전체 흐름', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).not.toContainText('??');
  }

  await page.goto('/f/first-passport-issue');
  await expect(page.locator('body')).toContainText('가로 3.5cm×세로 4.5cm');
  await expect(page.locator('body')).not.toContainText('413×531');

  await page.goto('/f/closet-organize-1day');
  await expect(page.getByRole('heading', { name: '단계별 실행' })).toBeVisible();
  const closetWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(closetWorkbench).toContainText('3단계 · 6개 할 일');
  await expect(closetWorkbench).toContainText('비울 기준 준비');

  for (const route of ['/f/citizen-secretary-alerts', '/f/domestic-trip-d7']) {
    await expectPublicFlowRouteClosed(page, route);
  }
});

test('current new-car source fit separates the reference journey from official registration and insurance', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_NEW_CAR_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });

  const mapResponse = await page.goto('/flow-maps/curated-new-car-purchase-guide');
  expect(mapResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '신차 구매 7단계 체크리스트' })).toBeVisible();
  await expect(page.locator('body')).toContainText('구매 방식 비교 메모');
  await expect(page.locator('body')).toContainText('신규등록 확인');
  await expect(page.locator('body')).toContainText('의무보험 확인');
  await expect(page.locator('a[href*="easylaw.go.kr"]')).toHaveCount(2);
  await expect(page.locator('body')).not.toContainText(/연봉\s*(?:의)?\s*50%|7\s*[~-]\s*8%|계약금\s*10%|15일\s*이내/u);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-new-car-map-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-new-car-map-wide.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const childResponse = await page.goto('/f/curated-new-car-basic');
  expect(childResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
  await expect(page.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();
  await expect(getVisiblePublicSourceCard(page)).toBeVisible();
  await expect(page.locator('body')).toContainText('등록과 의무보험은 현재 공식 안내');
  await expect(page.locator('a[href*="easylaw.go.kr"]')).toHaveCount(2);
  await expect(page.locator('body')).not.toContainText(/100만\s*원|300만\s*원|최소\s*3곳|36개월|60개월/u);
  const sourceCard = getVisiblePublicSourceCard(page);
  await expect(sourceCard).toContainText('원문 확인 기록');
  await expect(sourceCard).toContainText('Flow 정리');
  await expect(sourceCard).not.toContainText('업데이트');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoUserFacingRawIsoDate(page.locator('body'));
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-new-car-public-mobile.png`, fullPage: true });

  const officialDetails = page.locator('details').filter({ has: page.locator('a[href*="easylaw.go.kr"]') });
  await expect(officialDetails).toHaveCount(2);
  await officialDetails.evaluateAll((elements) => elements.forEach((element) => ((element as HTMLDetailsElement).open = true)));
  await page.locator('a[href*="easylaw.go.kr"]').first().scrollIntoViewIfNeeded();
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-new-car-official-details-mobile.png`, fullPage: true });
});

test('current Allblanc source fit separates publication age, personal schedule, and high-intensity review', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_ALLBLANC_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });

  const mapResponse = await page.goto('/flow-maps/curated-allblanc-workout-park');
  expect(mapResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Allblanc 영상별 홈트 루틴' })).toBeVisible();
  await expect(page.locator('body')).toContainText('게시 시점과 현재 재생 여부를 따로 확인');
  await expect(page.locator('body')).not.toContainText('월/수/금 아침 5분 영상 실행');
  await expect(page.locator('body')).not.toContainText('화/목 노점프 유산소 실행');
  await expect(page.locator('body')).not.toContainText('토요일 하체 홈트 실행');
  await expect(page.locator('body')).not.toContainText('Allblanc 고강도 하체 홈트');
  await expect(page.getByTestId('flow-map-choose-child')).toContainText('영상 하나를 고르세요');
  await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
  await page.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(page.getByRole('link', { name: '요일 정하고 시작' })).toHaveCount(2);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-allblanc-map-mobile.png`, fullPage: true });

  const morningResponse = await page.goto('/f/curated-allblanc-morning-workout');
  expect(morningResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
  await expect(page.getByTestId('public-flow-result-promise')).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();
  await expect(page.locator('body')).toContainText('원문이 정한 운동 처방이 아니라 내 캘린더에 저장할 일정');
  await expect(page.getByRole('link', { name: '원본 영상 열기' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('추천 리듬');
  const sourceCard = getVisiblePublicSourceCard(page);
  await expect(sourceCard).toContainText('2020년 3월 26일 원문 게시');
  await expect(sourceCard).toContainText('7월 12일 원문 확인 기록');

  const wednesday = page.getByLabel('수', { exact: true });
  const thursday = page.getByLabel('목', { exact: true });
  await expect(wednesday).toBeChecked();
  await expect(thursday).not.toBeChecked();
  await wednesday.uncheck();
  await thursday.check();
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 저장' }).click();
  const savedWeekdays = await page.evaluate(() => {
    const record = JSON.parse(window.localStorage.getItem('flow:saved:curated-allblanc-morning-workout') ?? '{}') as { weekdays?: string[] };
    return record.weekdays ?? [];
  });
  expect(savedWeekdays).toEqual(['월', '금', '목']);

  const sourceBridge = page.getByTestId('exact-video-source-bridge');
  await expect(sourceBridge.locator('a[href*="youtube.com/watch"]')).toHaveCount(1);
  await expect(sourceBridge.locator('a[href*="cdc.gov/healthy-weight-growth/physical-activity/getting-started"]')).toHaveCount(1);
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  await expectNoUserFacingRawIsoDate(page.locator('body'));
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-allblanc-morning-public-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-allblanc-morning-public-wide.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const noJumpResponse = await page.goto('/f/curated-allblanc-no-jump-cardio');
  expect(noJumpResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
  await expect(getVisiblePublicSourceCard(page)).toContainText('2021년 6월 23일 원문 게시');
  await expect(page.getByTestId('exact-video-source-bridge').locator('a[href*="cdc.gov/healthy-weight-growth/physical-activity/getting-started"]')).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText('빠르게 살 빠지는');
  await expect(page.locator('body')).not.toContainText('층간소음 부담이 낮은');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-allblanc-no-jump-public-mobile.png`, fullPage: true });

  const lowerBodyResponse = await page.goto('/f/curated-allblanc-lower-body');
  expect(lowerBodyResponse?.status()).toBe(404);
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
});

test('saved Allblanc routine keeps all four-week occurrences, sibling completion, and RRULE export aligned', async ({ page }) => {
  test.setTimeout(90_000);
  const evidenceDir = process.env.FLOWME_P24_F3A_EVIDENCE_DIR;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/curated-allblanc-morning-workout');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-15');
  for (const weekday of ['월', '수', '금']) {
    const checkbox = page.getByLabel(weekday, { exact: true });
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
  for (const weekday of ['화', '목', '토', '일']) {
    const checkbox = page.getByLabel(weekday, { exact: true });
    if (await checkbox.isChecked()) await checkbox.uncheck();
  }
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 저장' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.localStorage.getItem('flow:saved:curated-allblanc-morning-workout'),
  ))).toBe(true);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const julyRoutineIcons = page.locator('.fc-daygrid-day[data-date^="2026-07-"] [data-testid="my-flow-routine-icon"]');
  await expect(julyRoutineIcons).toHaveCount(8);
  for (const date of ['2026-07-15', '2026-07-17', '2026-07-20']) {
    await expect(page.locator(`.fc-daygrid-day[data-date="${date}"] [data-testid="my-flow-routine-icon"]`)).toHaveCount(1);
  }

  const selectRoutineRow = async (date: string) => {
    await page.locator(`.fc-daygrid-day[data-date="${date}"]`).getByTestId('my-flow-calendar-date-button').click();
    const row = page
      .getByTestId('my-flow-calendar-selected-day')
      .locator('article[data-occurrence-id]')
      .filter({ hasText: '아침 5분 전신 운동 영상 열기' });
    await expect(row).toHaveCount(1);
    return row;
  };

  const firstRow = await selectRoutineRow('2026-07-15');
  const firstOccurrenceId = await firstRow.getAttribute('data-occurrence-id');
  expect(firstOccurrenceId).toBeTruthy();
  await expect(firstRow.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 대기');
  await expect(firstRow).not.toContainText('반복 항목 0/1');
  const firstCompletion = firstRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ });
  await firstCompletion.click();
  await expect(firstRow).toHaveAttribute('data-occurrence-state', 'done');
  await expect(firstRow.getByRole('checkbox', { name: /이번 회차 완료 취소$/ })).toBeChecked();
  await expect(firstRow.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 완료');
  const completionSnackbar = page.getByTestId('my-flow-completion-snackbar');
  await expect(completionSnackbar).toContainText('아침 5분 전신 운동 영상 열기');
  await completionSnackbar.getByTestId('my-flow-completion-undo').click();
  await expect(firstRow).toHaveAttribute('data-occurrence-id', firstOccurrenceId!);
  await expect(firstRow).toHaveAttribute('data-occurrence-state', 'reopened');
  await expect(firstRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).not.toBeChecked();
  await firstRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ }).click();
  await expect(firstRow).toHaveAttribute('data-occurrence-state', 'done');
  const u1EvidenceDir = process.env.FLOWME_P24_U1_EVIDENCE_DIR;
  if (u1EvidenceDir) {
    fs.mkdirSync(`${u1EvidenceDir}/screenshots`, { recursive: true });
    await page.screenshot({
      path: `${u1EvidenceDir}/screenshots/03-recurring-occurrence-undo-mobile.png`,
      fullPage: true,
    });
  }

  const siblingRow = await selectRoutineRow('2026-07-17');
  const siblingOccurrenceId = await siblingRow.getAttribute('data-occurrence-id');
  expect(siblingOccurrenceId).toBeTruthy();
  expect(siblingOccurrenceId).not.toBe(firstOccurrenceId);
  await expect(siblingRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).not.toBeChecked();
  await expect(siblingRow).toHaveAttribute('data-occurrence-state', 'pending');

  const reopenedRow = await selectRoutineRow('2026-07-15');
  await expect(reopenedRow).toHaveAttribute('data-occurrence-id', firstOccurrenceId!);
  const reopenedCompletion = reopenedRow.getByRole('checkbox', { name: /이번 회차 완료 취소$/ });
  await reopenedCompletion.click();
  await expect(reopenedRow).toHaveAttribute('data-occurrence-state', 'reopened');
  await expect(reopenedRow.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 다시 진행');
  await expect(reopenedRow.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).not.toBeChecked();

  await reopenedRow.getByRole('button').first().click();
  const detail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await expect(detail).toHaveAttribute('data-occurrence-id', firstOccurrenceId!);
  await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  const tools = await openMyFlowDetailTools(detail);
  const downloadPromise = page.waitForEvent('download');
  await tools.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const rawIcs = fs.readFileSync(downloadPath!, 'utf8');
  const unfoldedIcs = rawIcs.replaceAll('\r\n ', '');
  expect((unfoldedIcs.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
  expect(unfoldedIcs).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260811');
  expect(unfoldedIcs).toContain('DTSTART;VALUE=DATE:20260715');
  expect(unfoldedIcs).not.toMatch(/source-backed|sourceTrace|\bStep\b|\bItem\b/iu);
  if (evidenceDir) {
    await download.saveAs(`${evidenceDir}/allblanc-four-week-routine.ics`);
  }
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByTestId('my-flow-calendar-selected-day').scrollIntoViewIfNeeded();
  if (evidenceDir) await page.getByTestId('my-flow-calendar-selected-day').screenshot({ path: `${evidenceDir}/01-allblanc-agenda-mobile.png` });
  await page.getByTestId('my-flow-calendar-card').scrollIntoViewIfNeeded();
  if (evidenceDir) await page.getByTestId('my-flow-calendar-card').screenshot({ path: `${evidenceDir}/02-allblanc-calendar-mobile.png` });
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '다음 달' }).click();
  await expect(page.getByRole('heading', { name: '2026년 8월' })).toBeVisible();
  await expect(page.locator('.fc-daygrid-day[data-date^="2026-08-"] [data-testid="my-flow-routine-icon"]')).toHaveCount(4);
  for (const date of ['2026-08-03', '2026-08-05', '2026-08-07', '2026-08-10']) {
    await expect(page.locator(`.fc-daygrid-day[data-date="${date}"] [data-testid="my-flow-routine-icon"]`)).toHaveCount(1);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-allblanc-calendar-wide.png`, fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('monthly maintenance routine keeps preview, Calendar, completion, and ICS on one source cadence', async ({ page }) => {
  test.setTimeout(90_000);
  const evidenceDir = process.env.FLOWME_P25_05A_EVIDENCE_DIR ?? process.env.FLOWME_P25_CANONICAL_PROJECTION_EVIDENCE_DIR;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  if (evidenceDir) {
    fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
    fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/f/washer-tub-clean-monthly');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-20');

  const preview = page.getByTestId('maintenance-routine-next-card');
  await expect(preview.getByRole('checkbox')).toHaveCount(0);
  for (const label of ['7월 20일', '8월 20일', '9월 20일', '10월 20일']) {
    await expect(preview).toContainText(label);
  }
  await expect(preview).toContainText('매월 1회');
  if (evidenceDir) {
    await preview.screenshot({ path: `${evidenceDir}/screenshots/01-washer-monthly-preview-mobile.png` });
  }

  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 저장' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.localStorage.getItem('flow:saved:washer-tub-clean-monthly'),
  ))).toBe(true);

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const savedRoutineFlow = page.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="washer-tub-clean-monthly"]',
  );
  await expect(savedRoutineFlow).toBeVisible();
  await savedRoutineFlow.getByTestId('my-flow-mobile-structure-open').click();
  const routineSeriesList = savedRoutineFlow.getByTestId('my-flow-mobile-structure-step-list');
  await expect(routineSeriesList.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await routineSeriesList.getByTestId('my-flow-mobile-structure-step-row').first().click();
  const routineOccurrenceDetail = savedRoutineFlow.getByTestId('my-flow-item-detail');
  await expect(routineOccurrenceDetail).toHaveAttribute('data-execution-level', 'occurrence');
  await expect(routineOccurrenceDetail.getByRole('checkbox', { name: /이번 회차 완료 체크$/ })).toHaveCount(1);
  if (evidenceDir) {
    await routineSeriesList.screenshot({ path: `${evidenceDir}/screenshots/04-published-routine-series-mobile.png` });
  }

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const julyCell = page.locator('.fc-daygrid-day[data-date="2026-07-20"]');
  await expect(julyCell.getByTestId('my-flow-routine-icon')).toHaveCount(1);
  await julyCell.getByTestId('my-flow-calendar-date-button').click();

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  const row = selectedDay
    .locator('article[data-occurrence-id]')
    .filter({ hasText: '통세척 코스 돌리고 문 열어 건조하기' });
  await expect(row).toHaveCount(1);
  const occurrenceId = await row.getAttribute('data-occurrence-id');
  expect(occurrenceId).toBeTruthy();
  const complete = row.getByRole('checkbox', { name: /이번 회차 완료 체크$/ });
  await complete.click();
  await expect(row).toHaveAttribute('data-occurrence-state', 'done');
  await row.getByRole('checkbox', { name: /이번 회차 완료 취소$/ }).click();
  await expect(row).toHaveAttribute('data-occurrence-id', occurrenceId!);
  await expect(row).toHaveAttribute('data-occurrence-state', 'reopened');

  await row.getByRole('button').first().click();
  const detail = selectedDay.getByTestId('my-flow-item-detail');
  await expect(detail).toHaveAttribute('data-occurrence-id', occurrenceId!);
  const tools = await openMyFlowDetailTools(detail);
  const downloadPromise = page.waitForEvent('download');
  await tools.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const unfoldedIcs = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect((unfoldedIcs.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
  expect(unfoldedIcs).toContain('DTSTART;VALUE=DATE:20260720');
  expect(unfoldedIcs).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=20');
  expect(unfoldedIcs).not.toMatch(/source-backed|sourceTrace|\bStep\b|\bItem\b/iu);
  if (evidenceDir) {
    await download.saveAs(`${evidenceDir}/downloads/washer-monthly-routine.ics`);
  }
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  if (evidenceDir) {
    await selectedDay.screenshot({ path: `${evidenceDir}/screenshots/02-washer-monthly-agenda-mobile.png` });
  }

  await page.getByRole('button', { name: '다음 달' }).click();
  await expect(page.getByRole('heading', { name: '2026년 8월' })).toBeVisible();
  await expect(page.locator('.fc-daygrid-day[data-date="2026-08-20"] [data-testid="my-flow-routine-icon"]')).toHaveCount(1);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expectNoHorizontalOverflow(page);
  const wideAgendaTitle = page
    .getByTestId('my-flow-calendar-selected-day')
    .getByTestId('my-flow-row-title')
    .filter({ hasText: '통세척 코스 돌리고 문 열어 건조하기' });
  const wideAgendaTitleBox = await wideAgendaTitle.boundingBox();
  expect(wideAgendaTitleBox).not.toBeNull();
  expect(wideAgendaTitleBox!.width).toBeGreaterThanOrEqual(100);
  if (evidenceDir) {
    await page.screenshot({ path: `${evidenceDir}/screenshots/03-washer-monthly-calendar-wide.png`, fullPage: true });
  }
  expect(consoleErrors).toEqual([]);
});

test('public routine hydration stays stable across opposite browser time zones', async ({ browser }) => {
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
    await expect(page.getByTestId('public-flow-preview-summary')).toBeVisible();
    await expect(page.getByTestId('maintenance-routine-checklist-card')).toBeVisible();
    await page.waitForTimeout(100);
    expect(hydrationErrors).toEqual([]);
    await context.close();
  }
});

test('current medium-risk sources separate publication, revision, recheck, and executable scope', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_MEDIUM_SOURCE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });

  const postalResponse = await page.goto('/f/source-backed-postal-address-transfer');
  expect(postalResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  const postalSource = getVisiblePublicSourceCard(page);
  await expect(postalSource).toContainText('7월 12일 원문 확인 기록');
  await expect(postalSource).not.toContainText('원문 게시');
  await expect(page.locator('body')).toContainText('공식 화면의 결제 기한');
  await expectNoInternalUserSurfaceCopy(page.locator('body'));
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/01-postal-official-mobile.png`, fullPage: true });

  const airconResponse = await page.goto('/f/source-backed-aircon-filter-cleaning');
  expect(airconResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  const airconSource = getVisiblePublicSourceCard(page);
  await expect(airconSource).toContainText('2025년 1월 6일 원문 게시');
  await expect(airconSource).toContainText('7월 12일 원문 확인 기록');
  await expect(page.locator('body')).toContainText('천장형 1way');
  await expect(page.locator('body')).toContainText('사용설명서');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/02-aircon-official-mobile.png`, fullPage: true });

  const movingMapResponse = await page.goto('/flow-maps/curated-ajd-moving-d30');
  expect(movingMapResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '이사 D-30 체크리스트' })).toBeVisible();
  await expect(page.locator('body')).toContainText('최근 갱신된 원문');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-moving-current-map-mobile.png`, fullPage: true });

  const movingResponse = await page.goto('/f/curated-ajd-moving-d30');
  expect(movingResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  const movingSource = getVisiblePublicSourceCard(page);
  await expect(movingSource).toContainText('2024년 5월 17일 원문 게시');
  await expect(movingSource).toContainText('2026년 6월 30일 원문 수정');
  await expect(movingSource).toContainText('7월 12일 원문 확인 기록');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/04-moving-current-public-mobile.png`, fullPage: true });

  const weddingMapResponse = await page.goto('/flow-maps/curated-wedding-checklist-family');
  expect(weddingMapResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '결혼 준비 참고표 2종' })).toBeVisible();
  await expect(page.getByTestId('flow-map-choose-child')).toContainText('두 참고표 중 하나를 고르세요');
  await expect(page.getByTestId('flow-map-choose-child')).not.toContainText('영상');
  await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
  await page.getByTestId('flow-map-execution-outline').locator('summary').first().click();
  await expect(page.getByRole('link', { name: '내용 보고 시작' })).toHaveCount(2);
  await expect(page.getByTestId('flow-map-child-compact-preview')).toHaveCount(2);
  await expect(page.locator('body')).toContainText('나머지 4개는 내용 보기에서 확인');
  await expect(page.locator('body')).toContainText('나머지 2개는 내용 보기에서 확인');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/05-wedding-choose-one-map-mobile.png`, fullPage: true });

  const naverResponse = await page.goto('/f/curated-wedding-naver-timeline');
  expect(naverResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.getByRole('heading', { name: '결혼 준비 1년 참고 타임라인' })).toBeVisible();
  await expect(getVisiblePublicSourceCard(page)).toContainText('2024년 7월 20일 원문 게시');
  await expect(page.locator('body')).toContainText('개인 경험을 바탕으로 한 참고 일정');
  await expect(page.locator('body')).not.toContainText(/리프팅 시술|화이트태닝|다이어트 병원/u);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/06-wedding-personal-timeline-mobile.png`, fullPage: true });

  const gongysdResponse = await page.goto('/f/curated-wedding-gongysd-atoz');
  expect(gongysdResponse?.status()).toBe(200);
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.getByRole('heading', { name: '결혼 준비 핵심 4가지 시작표' })).toBeVisible();
  const gongysdSource = getVisiblePublicSourceCard(page);
  await expect(gongysdSource).toContainText('2024년 12월 25일 원문 게시');
  await expect(gongysdSource).toContainText('2026년 2월 10일 원문 수정');
  await expect(page.locator('body')).toContainText('전체 체크리스트가 아니라 시작 단계 네 가지');
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/07-wedding-four-part-starter-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/flow-maps/curated-wedding-checklist-family');
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/08-wedding-choose-one-map-wide.png`, fullPage: true });
});

test('current source freshness audit keeps corrected routes executable and stale routes gated', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });

  const approvedRoutes = [
    '/f/childcare-fee-support-apply',
    '/f/customs-traveler-declare',
    '/f/military-exam-prep',
    '/f/overseas-safety-register',
    '/f/pension-estimate-check',
    '/f/tax-refund-find',
    '/f/welfare-benefit-finder',
    '/f/blog-youtube-start',
    '/f/home-cafe-daily',
    '/f/kitchen-reset-organize',
    '/f/pet-health-observation',
    '/f/reading-habit-30day',
    '/f/travel-packing-list',
    '/f/weekly-meal-plan',
  ];
  for (const route of approvedRoutes) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
    await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
    await expect(page.getByRole('button', { name: /그대로 저장|내 Flow에 저장|날짜 없이 저장|이 날짜로 저장/ })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('??');
    await expect(page.locator('body')).not.toContainText('�');
  }

  await page.goto('/f/tax-refund-find');
  await expect(page.locator('body')).toContainText('국세');
  await expect(page.locator('body')).not.toContainText('지방세 환급');
  await expect(page.locator('body')).not.toContainText('AI 자동 계산');

  await page.goto('/f/weekly-meal-plan');
  await expect(page.locator('body')).toContainText('평일 5일');
  await expect(page.locator('body')).not.toContainText('23% 절약');
  const weeklyMealTable = page.getByTestId('artifact-log-table-weekly-meal-plan-table');
  await expect(weeklyMealTable).toContainText('양배추참치덮밥·단무지무침');
  await expect(weeklyMealTable.getByLabel('금요일 / 메뉴')).toHaveValue('연어 포케');
  await expect(weeklyMealTable).not.toContainText('토요일');

  await page.goto('/f/pet-health-observation');
  await expect(page.getByRole('heading', { name: '건강검진 상담 준비', exact: true })).toBeVisible();
  await expect(page.getByLabel('병원에 전달할 생활 정보')).toBeVisible();
  await expect(page.getByTestId('artifact-log-table-pet-health-table')).toHaveCount(0);

  await page.goto('/f/reading-habit-30day');
  await expect(page.locator('body')).toContainText('15분');
  await expect(page.locator('body')).not.toContainText('66일');

  const gatedRoutes = [
    '/f/birth-registration-prep',
    '/f/seal-or-signature-certificate',
    '/f/health-insurance-dependent',
    '/f/dog-walk-routine',
    '/f/morning-routine-30day',
    '/f/morning-skincare-routine',
    '/f/recipe-video-execute',
  ];
  for (const route of gatedRoutes) {
    await expectPublicFlowRouteClosed(page, route);
  }

  for (const route of RUNTIME_ARCHIVED_FLOW_SLUGS.map((slug) => `/f/${slug}`)) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
    await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '이 Flow는 지금 열 수 없어요' })).toBeVisible();
    await expect(page.getByRole('link', { name: '다른 Flow 찾기' })).toHaveAttribute('href', '/flows');
    await expect(page.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
  }

  for (const policy of RUNTIME_ARCHIVED_FLOW_POLICIES.filter(
    (candidate) => candidate.replacementSlug,
  )) {
    const route = `/f/${policy.replacementSlug}`;
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('plank challenge stays out of public routes until its source table is approved', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/plank-30-day-challenge');
});

test('promoted public routes keep save primary visible and the executable artifact available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    '/f/vehicle-inspection-prep',
    '/f/wedding-d180-basic',
    '/f/used-car-buying-check',
    '/f/computer-skills-d30-study',
    '/f/new-car-delivery-check',
    '/f/fridge-cleanout-weekly-plan',
  ]) {
    await page.goto(route);

    const stickySaveTop = await page.getByTestId('public-flow-mobile-save-cta').evaluate((element) => element.getBoundingClientRect().top);
    expect(stickySaveTop).toBeLessThan(844);
    await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toBeVisible();
  }
});

test('promoted maintenance mobile routes show the date checklist before the next-date card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/f/washer-tub-clean-monthly']) {
    await page.goto(route);

    const checklistTop = await page.getByTestId('maintenance-routine-checklist-card').evaluate((element) => element.getBoundingClientRect().top);
    const nextCardTop = await page.getByTestId('maintenance-routine-next-card').evaluate((element) => element.getBoundingClientRect().top);

    expect(checklistTop).toBeLessThan(nextCardTop);
    await expect(page.getByTestId('maintenance-routine-checklist-card').getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByTestId('maintenance-routine-checklist-card').getByTestId('public-flow-included-item-marker').first()).toBeVisible();
  }
});

test('completed My Flow separates private reflection from an unsent source correction draft', async ({ page }) => {
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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const mobileFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]');
  const feedback = mobileFlow.getByTestId('my-flow-completion-feedback');
  await expect(feedback).toBeVisible();
  await expect(mobileFlow).toContainText('남은 항목이 없습니다.');
  await expect(mobileFlow).not.toContainText('다음 할 일');
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
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-completion-feedback-saved-summary')).toContainText('내 회고 저장됨');
  await expect(page.getByTestId('my-flow-completion-feedback-saved-summary')).toContainText('전송 전 메모 저장됨');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload();
  await page.getByTestId('my-flow-view-flow').click();
  const wideFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
  await expect(wideFlow.getByTestId('my-flow-completion-feedback')).toBeVisible();
  await expect(
    wideFlow.getByTestId('my-flow-workspace-flow-summary').getByText('남은 할 일이 없습니다', { exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.evaluate(() => {
    const checks = JSON.parse(window.localStorage.getItem('flow_builder_mvp_checks_moving-d30-basic') || '{}') as Record<string, boolean>;
    const firstCheckId = Object.keys(checks)[0];
    checks[firstCheckId] = false;
    window.localStorage.setItem('flow_builder_mvp_checks_moving-d30-basic', JSON.stringify(checks));
  });
  await page.reload();
  await page.getByTestId('my-flow-view-flow').click();
  await expect(page.getByTestId('my-flow-completion-feedback')).toHaveCount(0);
});

test('completed My Flow starts a new dated run without overwriting the previous execution', async ({ page }) => {
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
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3104' });
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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const mobileFlow = page.locator(`[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`);
  const feedback = mobileFlow.getByTestId('my-flow-completion-feedback');
  await expect(feedback).toBeVisible();
  await feedback.getByTestId('my-flow-reflection-open').click();
  await feedback.getByRole('button', { name: '도움됐어요' }).click();
  await feedback.getByTestId('my-flow-reflection-note').fill('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
  await feedback.getByTestId('my-flow-reflection-save').click();
  await feedback.getByTestId('my-flow-source-correction-open').click();
  await feedback.getByTestId('my-flow-source-correction-note').fill('관리사무소 운영 시간을 먼저 확인하도록 원본 순서를 검토해 주세요.');
  await feedback.getByTestId('my-flow-source-correction-save').click();
  await feedback.getByTestId('my-flow-reuse-open').click();
  const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
  await expect(feedback).toContainText('지난 실행은 기록으로 남기고 완료 상태만 새로 시작합니다.');
  await expect(reusePanel.getByTestId('my-flow-reuse-anchor-input')).toHaveAccessibleName('새 이사일');
  await expect(reusePanel.getByTestId('my-flow-reuse-fixed-date-policy')).toContainText('따로 바꾼 날짜 1개');
  await expectNoInternalUserSurfaceCopy(reusePanel);
  await expectNoUserFacingRawIsoDate(reusePanel);
  await expectNoUserFacingDisplayLeakage(reusePanel);

  await reusePanel.getByTestId('my-flow-reuse-start').click();
  await expect(reusePanel.getByTestId('my-flow-reuse-error')).toHaveText('이사일을 선택해 주세요.');
  await reusePanel.getByTestId('my-flow-reuse-anchor-input').fill('2026-10-20');
  await reusePanel.getByTestId('my-flow-reuse-start').click();
  await expect(reusePanel.getByTestId('my-flow-reuse-error')).toHaveText('따로 바꾼 날짜를 어떻게 처리할지 선택해 주세요.');
  await reusePanel.getByLabel('새 이사일에 맞추기').check();
  if (evidenceDir) {
    await reusePanel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/01-completed-flow-reuse-mobile.png` });
  }
  await reusePanel.getByTestId('my-flow-reuse-start').click();

  await page.getByTestId('my-flow-view-flow').click();
  await expect(mobileFlow.getByTestId('my-flow-reuse-status')).toContainText('새 이사일 10월 20일로 시작했어요. 지난 실행은 기록으로 남아 있어요.');
  await expect(mobileFlow.getByTestId('my-flow-completion-feedback')).toHaveCount(0);
  const pastRuns = mobileFlow.getByTestId('my-flow-past-runs');
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
  expect(pastRunClipboard).toContain('내 실행 회고');
  expect(pastRunClipboard).toContain('견적 후보를 먼저 줄여두니 다음 단계가 쉬웠어요.');
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

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload();
  await page.getByTestId('my-flow-view-flow').click();
  const wideFlow = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`);
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

  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const flowCard = page.locator(`[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`);
  const feedback = flowCard.getByTestId('my-flow-completion-feedback');
  await feedback.getByTestId('my-flow-reuse-open').click();
  const reusePanel = feedback.getByTestId('my-flow-reuse-panel');
  await expect(reusePanel.getByTestId('my-flow-reuse-anchor-input')).toHaveCount(0);
  await expect(reusePanel).toContainText('현재 항목과 내가 고친 내용은 유지하고 완료 체크만 비웁니다.');
  if (evidenceDir) {
    await reusePanel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDir}/04-date-free-reuse-mobile.png` });
  }
  await reusePanel.getByTestId('my-flow-reuse-start').click();

  await page.getByTestId('my-flow-view-flow').click();
  await expect(flowCard.getByTestId('my-flow-reuse-status')).toContainText('새 실행을 시작했어요. 지난 실행은 기록으로 남아 있어요.');
  const pastRuns = flowCard.getByTestId('my-flow-past-runs');
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

test('approved pilot flow executes while review inventory stays out of public routes', async ({ page }) => {
  await page.goto('/f/samsung-aircon-seasonal-check');
  await openPublicReferenceDetailsIfPresent(page);
  await expect(page.getByRole('heading', { name: '삼성 에어컨 계절 전 점검' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '삼성 에어컨 계절 전 점검 Flow' })).toHaveCount(0);
  await expect(page.getByText('출처와 주의 정보')).toHaveCount(0);
  const samsungSourceCard = getVisiblePublicSourceCard(page);
  await samsungSourceCard.locator('summary').click();
  await expect(samsungSourceCard.getByRole('heading', { name: '삼성전자서비스 에어컨 사전점검 안내' })).toBeVisible();
  await expect(samsungSourceCard.getByRole('link', { name: '원문 보기' })).toHaveAttribute(
    'href',
    'https://www.samsungsvc.co.kr/solution/2002378?assess=N',
  );
  await expect(page.getByLabel('시작일')).toHaveCount(0);
  const samsungWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(samsungWorkbench.getByTestId('routine-session-grid-card')).toHaveCount(0);
  await expect(samsungWorkbench.getByRole('checkbox')).toHaveCount(0);
  await expect(samsungWorkbench.getByText('전원 플러그와 전용 차단기 확인하기')).toBeVisible();

  await expectPublicFlowRouteClosed(page, '/f/qnet-exam-application-prep');
});

test('official route quality gates keep only approved artifacts executable', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/family-certificate-issue');

  await page.goto('/f/passport-renewal-docs');
  await expect(page.getByRole('heading', { name: '여권 재발급 준비' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '여권 재발급 준비 Flow' })).toHaveCount(0);
  const passportWorkbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(passportWorkbench.getByTestId('artifact-list-card')).toBeVisible();
  await expect(passportWorkbench.getByRole('heading', { name: '메모 카드' })).toHaveCount(0);
  await expect(passportWorkbench.getByRole('textbox', { name: '여행일·신청자·신청 경로' })).toHaveCount(0);

  await expectPublicFlowRouteClosed(page, '/f/driver-license-renewal-check');
  await expectPublicFlowRouteClosed(page, '/f/qnet-exam-application-prep');
});

test('MOFA travel route stays out of public routes until its execution fields are approved', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/real-mofa-overseas-travel-prep');
});

test('experiment feedback routes keep one artifact-first execution surface', async ({ page }) => {
  const routes = [
    'computer-skills-d30-study',
    'moving-d30-basic',
    'vehicle-inspection-prep',
    'passport-renewal-docs',
    'new-car-delivery-check',
    'used-car-buying-check',
  ];

  for (const slug of routes) {
    await page.goto(`/f/${slug}`);
    const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
    await expect(workbench).toBeVisible();
    await expect(workbench.getByTestId('public-flow-export-secondary-entry')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '전체 할 일' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '월별 달력' })).toHaveCount(0);
    await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
    await expect(workbench.getByText('자세히').first()).toBeVisible();
  }
});

test('review-gated routines do not leak workbenches while an approved routine stays executable', async ({ page }) => {
  for (const slug of [
    'real-thankyou-bubu-home-workout-starter',
    'real-fitvely-diet-record-routine',
  ]) {
    await expectPublicFlowRouteClosed(page, `/f/${slug}`);
  }

  await page.goto('/f/english-study-30day-routine');
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  await expect(workbench.getByTestId('routine-session-grid-card')).toBeVisible();
  await expect(workbench.getByTestId('routine-session-log-card')).toBeVisible();
  await expect(page.getByTestId('flow-item-card')).toHaveCount(0);
});

test('baby food personal schedule does not leak its old workbench on the public route', async ({ page }) => {
  await expectPublicFlowRouteClosed(page, '/f/baby-food-menu-recipe');
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toHaveCount(0);
});

test('url-first p0 lab previews hit review miss and memo states without public nav exposure', async ({ page }) => {
  await page.goto('/flow-lab/url-first-p0');

  await expect(page.getByRole('heading', { name: 'URL-first P0 실험' })).toBeVisible();
  await expect(page.getByTestId('url-first-result-card')).toContainText('상태 hit');
  await expect(page.getByTestId('url-first-result-card')).toContainText('/flow-maps/curated-ajd-moving-d30');
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

  await page.goto('/my?demo=ux12');
  await expect(page.getByTestId('my-flow-workspace')).toHaveAttribute('data-surface-role', 'task-first');
  const myFlowPrimaryRow = page.getByTestId('my-flow-now-section').getByTestId('my-flow-mobile-continuation-card').first();
  const myFlowCheckboxBox = await myFlowPrimaryRow.getByTestId('my-flow-task-complete-control').boundingBox();
  const myFlowOpenBox = await myFlowPrimaryRow.getByTestId('my-flow-mobile-continuation-open').boundingBox();
  expect(myFlowCheckboxBox).not.toBeNull();
  expect(myFlowOpenBox).not.toBeNull();
  expect(myFlowCheckboxBox!.x).toBeLessThan(myFlowOpenBox!.x);

  await page.goto('/calendar?demo=ux12');
  await expect(page.getByTestId('my-flow-workspace')).toHaveAttribute('data-surface-role', 'date-first');
  await expect(page.getByTestId('my-flow-calendar-card')).toHaveAttribute('data-calendar-layout', 'month-overview');
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay).toHaveAttribute('data-calendar-layout', 'selected-day-execution');
  await expect(selectedDay.getByTestId('my-flow-selected-date-group').first()).toHaveAttribute('data-density', 'compact');
  const calendarRow = selectedDay.getByTestId('my-flow-execution-row-shell').first();
  const calendarCheckboxBox = await calendarRow.getByTestId('my-flow-task-complete-control').boundingBox();
  const calendarOpenBox = await calendarRow.getByRole('button', { name: /열기/ }).boundingBox();
  expect(calendarCheckboxBox).not.toBeNull();
  expect(calendarOpenBox).not.toBeNull();
  expect(calendarCheckboxBox!.x).toBeLessThan(calendarOpenBox!.x);
});

test('url lookup keeps the result focused and makes the catalog secondary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.getByTestId('flow-url-lookup-input').fill('https://blog.naver.com/01695258757/222768860919?utm_source=review');
  await page.getByRole('button', { name: 'Flow 찾기' }).click();

  await expect(page.getByTestId('flow-url-lookup-result')).toBeVisible();
  await expect(page.getByTestId('flow-catalog-browse-controls')).toBeHidden();
  await expect(page.getByTestId('flow-catalog-browse-results')).toBeHidden();
  const browseToggle = page.getByTestId('flow-catalog-after-lookup-toggle');
  await expect(browseToggle).toHaveText(/다른 Flow 둘러보기/);
  await browseToggle.click();
  await expect(page.getByTestId('flow-catalog-browse-controls')).toBeVisible();
  await expect(page.getByTestId('flow-catalog-browse-results')).toBeVisible();
});

test('source-backed flow map uses one unframed promise and a flat execution outline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  await expect(page.getByTestId('flow-map-hero')).toHaveAttribute('data-visual-structure', 'unframed');
  const outline = page.getByTestId('flow-map-execution-outline');
  await expect(outline).toBeVisible();
  await expect(outline.getByTestId('flow-map-execution-step-row')).toHaveCount(5);
  await expect(page.getByTestId('flow-map-mobile-sticky-save')).toBeVisible();
  await expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
