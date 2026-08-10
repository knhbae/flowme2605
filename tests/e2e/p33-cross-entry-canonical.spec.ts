import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { AJD_MOVING_CANONICAL_FLOW_ID } from '../../lib/flow/canonical-flow-registry';
import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const evidenceRoot = process.env.FLOWME_P33_EVIDENCE_DIR;
const runtimeErrorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const runtimeErrors: string[] = [];
  runtimeErrorsByPage.set(page, runtimeErrors);
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrorsByPage.get(page) ?? []).toEqual([]);
});

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function clearLocalState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('P33 cross-entry canonical alignment', () => {
  test('legacy AJD routes resolve to the one 24-item public detail', async ({ page }) => {
    test.setTimeout(60_000);
    const aliases = [
      '/flow-maps/moving-d30',
      '/flow-maps/curated-ajd-moving-d30',
      '/f/source-backed-moving-d30',
      '/f/curated-ajd-moving-d30',
    ];

    for (const alias of aliases) {
      await page.goto(alias);
      await expect(page).toHaveURL('/f/moving-d30-basic');
      await expect(page.getByTestId('public-flow-capability-result').locator(
        '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
      )).toHaveAttribute('data-capability-output-count', '24');
    }
  });

  test('Flow finding exposes one canonical AJD moving card and the shared detail', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await clearLocalState(page);
    await page.getByTestId('flow-catalog-search').fill('이사 D-30');

    const results = page.getByTestId('flow-catalog-browse-results');
    const movingCards = results
      .getByTestId('single-flow-catalog-card')
      .filter({ hasText: '이사 D-30 준비' });
    await expect(movingCards).toHaveCount(1);
    await expect(movingCards.getByTestId('flow-card-support-meta')).toContainText('할 일 24개');
    await expect(results.getByTestId('flow-map-catalog-card').filter({ hasText: '이사 D-30' })).toHaveCount(0);

    await movingCards.getByRole('link', { name: /이사 D-30 준비.*더보기/ }).click();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await expect(page.getByTestId('public-flow-capability-result').locator(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    )).toHaveAttribute('data-capability-output-count', '24');
    await capture(page, 'p33-02-find-to-canonical-moving-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('moving and vehicle persist their one natural public result', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const candidate of [
      { slug: 'moving-d30-basic', expectedCount: 24, initialShape: 'checklist', savedShape: 'calendar' },
      { slug: 'vehicle-inspection-prep', expectedCount: 10, initialShape: 'checklist', savedShape: 'checklist' },
    ]) {
      await gotoLegacySavedPlanLibraryRoute(page, `/f/${candidate.slug}`);
      await clearLocalState(page);
      const preview = page.getByTestId('public-flow-capability-result');
      await expect(preview).toHaveAttribute(
        'data-capability-primary-destination',
        candidate.initialShape,
      );
      await expect(preview.locator(
        '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
      )).toHaveAttribute('data-capability-output-count', String(candidate.expectedCount));
      if (candidate.slug === 'moving-d30-basic') {
        await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
        await expect(preview).toHaveAttribute(
          'data-capability-primary-destination',
          candidate.savedShape,
        );
      }

      const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
      const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
      expect(personalCopyKey).toMatch(/^personal-copy:/u);
      const savedRecord = await page.evaluate((copyKey) => JSON.parse(
        window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null',
      ), personalCopyKey);
      expect(savedRecord).toMatchObject({
        schemaVersion: 2,
        personalCopyKey,
        sourceFlowSlug: candidate.slug,
        selectedArtifactMode: candidate.savedShape,
        savedItemCount: candidate.expectedCount,
      });
      await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText(
        String(candidate.expectedCount),
      );
    }

    await capture(page, 'p33-03-vehicle-checklist-selected-plan-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('duplicate AJD copies require an explicit active choice and preserve both records', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem('p33-reconciliation-seeded') === 'true') return;
      window.sessionStorage.setItem('p33-reconciliation-seeded', 'true');
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        personalTitle: '우리 집 전체 이사 준비',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2026-09-10',
        savedAt: '2026-07-24T02:00:00.000Z',
      }));
      window.localStorage.setItem('flow:saved:source-backed-moving-d30', JSON.stringify({
        slug: 'source-backed-moving-d30',
        personalTitle: '예전에 쓰던 간단 이사',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2026-08-20',
        savedAt: '2026-07-23T02:00:00.000Z',
      }));
      window.localStorage.setItem(
        'flow_builder_mvp_checks_source-backed-moving-d30',
        JSON.stringify({ 'source-backed-moving-d30-step-1': true }),
      );
    });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');

    const reconciliation = page.getByTestId('canonical-saved-copy-reconciliation');
    await expect(reconciliation).toBeVisible();
    await expect(reconciliation.getByTestId('canonical-saved-copy-option')).toHaveCount(2);
    await expect(reconciliation).toContainText('자동으로 합치지 않습니다');
    const canonicalOption = reconciliation.locator(
      '[data-testid="canonical-saved-copy-option"][data-copy-role="canonical"]',
    );
    await canonicalOption.getByTestId('canonical-saved-copy-select').click();
    await expect(page.getByTestId('canonical-saved-copy-reconciliation-notice')).toContainText(
      '전체 이사 준비',
    );

    const stored = await page.evaluate(() => ({
      canonical: window.localStorage.getItem('flow:saved:moving-d30-basic'),
      legacy: window.localStorage.getItem('flow:saved:source-backed-moving-d30'),
      legacyChecks: window.localStorage.getItem(
        'flow_builder_mvp_checks_source-backed-moving-d30',
      ),
      lifecycle: JSON.parse(
        window.localStorage.getItem('flow:my-flow:lifecycle:v1') || 'null',
      ),
      reconciliation: JSON.parse(
        window.localStorage.getItem('flow:canonical:reconciliation:v1') || 'null',
      ),
    }));
    expect(stored.canonical).toBeTruthy();
    expect(stored.legacy).toBeTruthy();
    expect(stored.legacyChecks).toBeTruthy();
    expect(stored.lifecycle.archivedFlowSlugs).toContain('source-backed-moving-d30');
    expect(stored.reconciliation.decisions[
      AJD_MOVING_CANONICAL_FLOW_ID
    ].activeOriginSlug).toBe('moving-d30-basic');

    await page.reload();
    await expect(page.getByTestId('canonical-saved-copy-reconciliation')).toHaveCount(0);
    await capture(page, 'p33-05-canonical-copy-resolved-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow presents source recurrence in user language without raw RRULE syntax', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem(
        'flow:saved:source-backed-aircon-filter-cleaning',
        JSON.stringify({
          slug: 'source-backed-aircon-filter-cleaning',
          selectedArtifactMode: 'calendar',
          dateIntent: 'undated',
          savedAt: '2026-07-24T03:00:00.000Z',
        }),
      );
    });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');

    const flow = await openMyFlowLibraryFlow(
      page,
      'source-backed-aircon-filter-cleaning',
      'plan',
    );
    await expect(page.locator('body')).not.toContainText('FREQ=');
    await expect(flow).toContainText('2주마다');
    await capture(page, 'p33-06-readable-recurrence-1024.png');
    await expectNoHorizontalOverflow(page);
  });

  test('direct save handoff, My Flow, Calendar, and export keep the canonical 24-item identity', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary'));
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 24개');
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    const savedRecord = await page.evaluate((copyKey) => JSON.parse(
      window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null',
    ), personalCopyKey);
    expect(savedRecord).toMatchObject({
      schemaVersion: 2,
      personalCopyKey,
      sourceFlowSlug: 'moving-d30-basic',
      selectedArtifactMode: 'calendar',
      savedItemCount: 24,
    });
    const canonicalFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expect(canonicalFlow).toBeVisible();
    const savedFlowTitle = (await canonicalFlow
      .locator('[data-flow-identity-slot="title"]')
      .first()
      .textContent())?.trim() ?? '';
    expect(savedFlowTitle).not.toBe('');
    await expect(canonicalFlow.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );

    const exportSurface = canonicalFlow.getByTestId('my-flow-export-surface');
    await exportSurface.getByTestId('my-flow-export-entry').click();
    const exportPanel = exportSurface.getByTestId('my-flow-export-panel');
    await expect(exportPanel.getByTestId('my-flow-export-scope-flow')).toContainText('계획 전체');
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toContainText('24개');
    await capture(page, 'p33-06-canonical-my-flow-export-1440.png');
    await expectNoHorizontalOverflow(page);

    await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
    const dateCounts = [
      ['2030-07', '2030-07-16', 4],
      ['2030-08', '2030-08-05', 5],
      ['2030-08', '2030-08-12', 4],
      ['2030-08', '2030-08-14', 4],
      ['2030-08', '2030-08-15', 5],
      ['2030-08', '2030-08-16', 2],
    ] as const;
    let projectedItemCount = 0;
    for (const [month, date, expectedCount] of dateCounts) {
      await page.getByTestId('my-flow-month-picker').fill(month);
      const dateCell = page.locator(`.fc-daygrid-day[data-date="${date}"]`);
      await dateCell.getByTestId('my-flow-calendar-date-button').click();
      const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
      const selectedGroup = selectedDay.locator(
        `[data-testid="my-flow-selected-date-group"][data-flow-slug="${personalCopyKey}"]`,
      );
      await expect(selectedGroup).toBeVisible();
      await expect(selectedGroup.locator('[data-flow-identity-slot="title"]')).toHaveText(
        savedFlowTitle,
      );
      await expect(selectedDay.getByTestId('my-flow-execution-row-shell')).toHaveCount(
        expectedCount,
      );
      projectedItemCount += expectedCount;
    }
    expect(projectedItemCount).toBe(24);
    await capture(page, 'p33-06-canonical-calendar-1440.png');
    await expectNoHorizontalOverflow(page);
  });
});
