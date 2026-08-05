import { expect, test } from '@playwright/test';
import {
  expandMyFlowWholePlan,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)).toBe(false);
}

async function expectDirectSelectedPlan(
  page: import('@playwright/test').Page,
  expectedItemCount?: number,
): Promise<string> {
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      view: url.searchParams.get('view'),
      flow: url.searchParams.get('flow'),
      hasReceipt: url.searchParams.has('saveReceipt'),
    };
  }).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasReceipt: false,
  });
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).toMatch(/^personal-copy:/u);
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  const banner = page.getByTestId('my-flow-save-banner');
  await expect(banner).toHaveAttribute('data-personal-copy-key', personalCopyKey);
  if (expectedItemCount !== undefined) {
    await expect(banner).toHaveAttribute('data-item-count', String(expectedItemCount));
  }
  return personalCopyKey;
}

async function saveMovingFlow(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const wideSave = page.getByTestId('public-flow-save-primary');
  if (await wideSave.isVisible()) await wideSave.click();
  else await page.getByTestId('public-flow-save-primary-mobile').click();
  return expectDirectSelectedPlan(page, 24);
}

test.describe('P27 server document foundation', () => {
  test('/flows exposes a meaningful entry and representative Flows before hydration', async ({ request }) => {
    const response = await request.get('/flows');
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain('URL이나 메모로 계획 찾기');
    expect(html).toContain('원룸 이사 D-30');
    expect(html).toContain('차량 점검 준비');
    expect(html).toContain('세탁조 청소');
    expect(html).not.toContain('Flow를 불러오는 중입니다.');
  });

  test('/my server document keeps the canonical three-destination shell', async ({ request }) => {
    const response = await request.get('/my');
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain('내 계획');
    expect(html).toContain('P35-ENTRY-ROUTER-3TAB');
    expect(html).toContain('data-saved-library-flag="pending"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('my-flow-view-today');
    expect(html).not.toContain('my-flow-view-completed');
    expect(html).not.toContain('Studio 대시보드');
  });
});

test.describe('P27 reversible lifecycle foundation', () => {
  test('saved Flow archive is reversible, persistent, and excluded from active Calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const personalCopyKey = await saveMovingFlow(page);

    let flowCard = await openMyFlowLibraryFlow(page, personalCopyKey);
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-management-menu-trigger').click();
    await flowCard.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await expect.poll(() => {
      const url = new URL(page.url());
      return { flow: url.searchParams.get('flow'), status: url.searchParams.get('status') };
    }).toEqual({ flow: null, status: 'archived' });
    await expect(page.locator(
      `[data-testid="my-flow-library-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    )).toBeVisible();

    const afterArchive = await page.evaluate((flowSlug) => ({
      lifecycle: JSON.parse(window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{}'),
      savedKeys: Object.keys(window.localStorage).filter((key) => key.startsWith('flow:saved:')),
      saved: window.localStorage.getItem(`flow:saved:${flowSlug}`),
    }), personalCopyKey);
    expect(afterArchive.lifecycle.archivedFlowSlugs).toContain(personalCopyKey);
    expect(afterArchive.savedKeys).toContain(`flow:saved:${personalCopyKey}`);
    expect(afterArchive.saved).toContain('2030-08-15');

    await page.getByTestId('my-flow-lifecycle-undo').click();
    flowCard = await openMyFlowLibraryFlow(page, personalCopyKey);
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-management-menu-trigger').click();
    await flowCard.getByTestId('my-flow-archive-toggle').click();

    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('archived');
    const library = page.getByTestId('my-flow-library-workspace');
    const archivedRow = library.locator(
      `[data-testid="my-flow-library-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    await expect(archivedRow).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-empty-state')).toContainText('날짜 항목 없음');
    await expect(page.locator(`[data-flow-slug="${personalCopyKey}"]`)).toHaveCount(0);

    await page.goto('/my?view=flows&status=archived');
    const persistedLibrary = page.getByTestId('my-flow-library-workspace');
    const persistedArchivedRow = persistedLibrary.locator(
      `[data-testid="my-flow-library-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    await persistedArchivedRow.getByTestId('my-flow-archived-direct-restore').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    await expect(await openMyFlowLibraryFlow(page, personalCopyKey)).toBeVisible();
  });

  test('source-backed item removal persists and restores', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const personalCopyKey = await saveMovingFlow(page);

    const flowCard = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    const outline = await expandMyFlowWholePlan(flowCard);
    const getOutlineRows = () => outline.getByTestId('my-flow-execution-row-shell');
    await expect(getOutlineRows()).toHaveCount(24);

    await flowCard.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
    const planEditor = page.getByTestId('saved-flow-editor-plan');
    await planEditor.getByTestId('saved-flow-editor-item-row').first().getByRole('checkbox').uncheck();
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);
    await expect(getOutlineRows()).toHaveCount(23);
    await page.reload();

    const reloadedCard = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    const reloadedOutline = await expandMyFlowWholePlan(reloadedCard);
    const reloadedOutlineRows = reloadedOutline.getByTestId('my-flow-execution-row-shell');
    await expect(reloadedOutlineRows).toHaveCount(23);
    const excluded = reloadedCard.getByTestId('my-flow-excluded-steps');
    await excluded.locator('summary').click();
    await expect(excluded.getByTestId('my-flow-excluded-step-row')).toHaveCount(1);
    await excluded.getByTestId('my-flow-restore-excluded-item').click();
    await expect(reloadedOutlineRows).toHaveCount(24);
  });

  test('workout item detail uses a persistent personal overlay', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const personalCopyKey = await expectDirectSelectedPlan(page);
    await expect.poll(() => page.evaluate((slug) => Boolean(
      window.localStorage.getItem(`flow:saved:${slug}`),
    ), personalCopyKey)).toBe(true);

    let flowCard = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await flowCard.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
    let planEditor = page.getByTestId('saved-flow-editor-plan');
    await planEditor.getByTestId('saved-flow-editor-item-open').first().click();
    let itemEditor = page.getByTestId('saved-flow-editor-item');
    const personalDetail = '운동 전 통증과 오늘 사용할 운동 영상을 확인합니다.';
    await itemEditor.getByTestId('saved-flow-editor-item-detail-input').fill(personalDetail);
    await itemEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(itemEditor).toHaveCount(0);
    await planEditor.getByTestId('saved-flow-editor-save').click();
    await expect(planEditor).toHaveCount(0);

    await page.reload();
    flowCard = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await flowCard.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first().click();
    planEditor = page.getByTestId('saved-flow-editor-plan');
    await planEditor.getByTestId('saved-flow-editor-item-open').first().click();
    itemEditor = page.getByTestId('saved-flow-editor-item');
    await expect(itemEditor.getByTestId('saved-flow-editor-item-detail-input')).toHaveValue(personalDetail);
    await expectNoHorizontalOverflow(page);
  });

  test('public adjustment stays personal and lands as the same My Flow outline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await expect(page).toHaveURL('/f/moving-d30-basic');

    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toBeVisible();
    await expect(adjustment).not.toContainText('Markdown');
    await expect(adjustment).not.toContainText('발행');
    await expect(adjustment).toHaveAttribute('data-adjustment-kind', 'name');
    await expect(adjustment.getByTestId('public-flow-adjustment-name-input')).toHaveCount(1);
    await expect(adjustment.getByTestId('public-flow-adjustment-item-list')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-title"]')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-date"]')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-memo"]')).toHaveCount(0);
    await expect(adjustment.getByRole('button', { name: /아래로 이동/ })).toHaveCount(0);

    await adjustment.getByTestId('public-flow-adjustment-name-input').fill('내 이사 준비');
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await adjustment.getByTestId('public-flow-adjustment-kind-items').click();
    const rows = adjustment.getByTestId('public-flow-adjustment-item-row');
    await expect(rows).toHaveCount(24);
    await rows.nth(1).getByRole('checkbox', { name: '이사할 집 하자 점검하기 계획에 포함' }).uncheck();
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const personalCopyKey = await expectDirectSelectedPlan(page, 23);
    const persisted = await page.evaluate((flowSlug) => ({
      itemStates: JSON.parse(window.localStorage.getItem(`flow_builder_mvp_item_state_${flowSlug}`) || '{}'),
      saved: JSON.parse(window.localStorage.getItem(`flow:saved:${flowSlug}`) || '{}'),
    }), personalCopyKey);
    expect(persisted.itemStates['flow-moving-item-1']).toMatchObject({ personalExcluded: true });
    expect(persisted.itemStates['flow-moving-item-0']).toEqual({ personalOrder: 0 });
    expect(persisted.saved.anchor).toBe('2030-08-15');
    expect(persisted.saved.personalTitle).toBe('내 이사 준비');
    expect(persisted.saved).toMatchObject({
      schemaVersion: 2,
      slug: personalCopyKey,
      personalCopyKey,
      sourceFlowSlug: 'moving-d30-basic',
      savedItemCount: 23,
    });

    const flowCard = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expect(flowCard).toBeVisible();
    const outline = await expandMyFlowWholePlan(flowCard);
    const outlineRows = outline.getByTestId('my-flow-execution-row-shell');
    await expect(outlineRows).toHaveCount(23);
    await expect(outlineRows.nth(0)).toContainText('이사 방식 정하기');
    await expect(outlineRows.nth(1)).toContainText('필요 없는 물건 정리하기');

    const excludedSteps = flowCard.getByTestId('my-flow-excluded-steps');
    await excludedSteps.locator('summary').click();
    const excludedRow = excludedSteps.getByTestId('my-flow-excluded-step-row').filter({
      hasText: '이사할 집 하자 점검하기',
    });
    await excludedRow.getByTestId('my-flow-restore-excluded-item').click();
    const restored = await page.evaluate((flowSlug) => JSON.parse(
      window.localStorage.getItem(`flow_builder_mvp_item_state_${flowSlug}`) || '{}',
    )['flow-moving-item-1'], personalCopyKey);
    expect(restored.personalExcluded).toBeUndefined();

    await page.reload();
    const restoredAfterReload = await page.evaluate((flowSlug) => JSON.parse(
      window.localStorage.getItem(`flow_builder_mvp_item_state_${flowSlug}`) || '{}',
    )['flow-moving-item-1'], personalCopyKey);
    expect(restoredAfterReload.personalExcluded).toBeUndefined();
    await expectNoHorizontalOverflow(page);
  });

  test('public adjustment keeps the same personal hierarchy on wide screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry').click();

    await expect(page).toHaveURL('/f/moving-d30-basic');
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toBeVisible();
    await adjustment.getByTestId('public-flow-adjustment-kind-items').click();
    await expect(adjustment.getByTestId('public-flow-adjustment-item-row')).toHaveCount(24);
    await expect(adjustment).not.toContainText('Markdown');
    await expect(adjustment).not.toContainText('발행');
    const moveDownControls = adjustment.getByRole('button', { name: /아래로 이동/ });
    await expect(moveDownControls).toHaveCount(24);
    await expect(moveDownControls.last()).toBeDisabled();
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-title"]')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-date"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow keeps three saved Flows directly browsable without search chrome', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
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
    });

    await page.goto('/my?view=flows&mode=flow');
    await expect(page.locator('main')).toHaveAttribute('data-p35-my-flow-marker', 'P35-MY-LIBRARY-ONLY');
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(3);
    await expect(page.getByTestId('my-flow-search')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-list-filter-all')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-structure-row').first()).toContainText('세탁기 통세척');
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow reveals progressive library controls for a large collection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows&mode=flow');

    const savedCount = Number.parseInt(
      (await page.getByTestId('my-flow-saved-count').innerText()).replace(/\D/g, ''),
      10,
    );
    expect(savedCount).toBeGreaterThan(8);
    await expect(page.getByTestId('my-flow-search')).toBeVisible();
    await expect(page.getByTestId('my-flow-list-filter-all')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(8);
    await expect(page.getByTestId('my-flow-mobile-inventory-open')).toContainText(
      `${savedCount - 8}개 더 보기`,
    );
    await expect(page.getByTestId('my-flow-now-date-group')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow search result opens the selected whole Flow workspace on wide screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20&view=flows&mode=flow');
    const library = page.getByTestId('my-flow-library-workspace');
    await library.getByTestId('my-flow-library-rail-search').fill('중고차');
    const flow = await openMyFlowLibraryFlow(page, 'used-car-buying-check');
    await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
    await expect(flow.getByTestId('my-flow-whole-flow-workspace')).toBeVisible();
    expect(await flow.getByTestId('my-flow-execution-row-shell').count()).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
  });

  test('undated work stays in My Flow and routine wrappers stay out of the Calendar tab order', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(() => {
      window.localStorage.setItem('flow:saved:travel-packing-list', JSON.stringify({
        slug: 'travel-packing-list',
        savedAt: '2030-01-01T00:00:00.000Z',
        selectedArtifactMode: 'checklist',
        dateIntent: 'undated',
      }));
      window.localStorage.setItem('flow:travel-packing-list:anchorDate', JSON.stringify({
        mode: 'undated',
        anchor: '',
      }));
    });
    await page.goto('/my?view=flows&mode=flow');
    const undatedRow = page.locator(
      '[data-testid="my-flow-library-row"][data-flow-slug="travel-packing-list"]',
    );
    await expect(undatedRow).toBeVisible();
    const titleLayout = await undatedRow.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
      };
    });
    expect(titleLayout.whiteSpace).not.toBe('nowrap');
    expect(titleLayout.textOverflow).not.toBe('ellipsis');

    await page.goto('/calendar?demo=ux12');
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await page.getByTestId('my-flow-month-picker').fill('2026-05');
    const routineWrapper = page.locator('.my-flow-routine-rail-event').first();
    await expect(routineWrapper).toHaveAttribute('role', 'group');
    await expect(routineWrapper).toHaveAttribute('aria-label', /반복 일정 \d+개/);
    await expect(routineWrapper).toHaveAttribute('tabindex', '-1');
    await expect(routineWrapper.getByTestId('my-flow-routine-icon').first()).toHaveAccessibleName(/.+/);

    const tabbableCalendarWrappers = await page.locator('.my-flow-routine-rail-event, .my-flow-schedule-overflow-event').evaluateAll((nodes) =>
      nodes.filter((node) => node.getAttribute('tabindex') !== '-1').length,
    );
    expect(tabbableCalendarWrappers).toBe(0);
    await expectNoHorizontalOverflow(page);
  });

  test('post-save keeps the saved outline primary and export preflight compact', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/moving-d30');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const personalCopyKey = await expectDirectSelectedPlan(page, 24);
    await expect(page.getByTestId('my-flow-save-banner-summary')).toContainText('24');

    const flow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expandMyFlowWholePlan(flow);
    await expect(flow.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');
    const exportRegion = flow.getByTestId('my-flow-export-surface');
    const exportButton = exportRegion.getByTestId('my-flow-export-entry');
    await exportButton.click();
    const exportPanel = exportRegion.getByTestId('my-flow-export-panel');
    await expect(exportPanel).toHaveAttribute('data-export-layout', 'compact-preflight');
    await expect(exportPanel).toHaveAttribute('data-default-expanded-secondary-count', '0');
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toContainText('계획 전체 · 24개');
    await expect(exportPanel.getByTestId('my-flow-export-detail-loss-notice')).toBeVisible();
    await expect(exportPanel).not.toContainText('1 범위');
    await expect(exportPanel).not.toContainText('2 예상 결과');
    await expect(exportPanel).not.toContainText('3 형식');

    await exportPanel.getByTestId('my-flow-export-scope-selected').click();
    await expect(exportPanel.getByTestId('my-flow-export-selectable-item')).toHaveCount(24);
    await exportButton.click();
    await expect(exportPanel).toHaveCount(0);
    await expect(exportButton).toBeFocused();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    const reloadedFlow = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expect(reloadedFlow.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');
    await expectNoHorizontalOverflow(page);
  });
});
