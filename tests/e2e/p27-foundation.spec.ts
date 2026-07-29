import { expect, test } from '@playwright/test';
import {
  expandMyFlowWholePlan,
  getMyFlowVisibleExecutionRows,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { openSavedPublicFlow } from './helpers/public-flow-save';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)).toBe(false);
}

async function enterMyFlowDetailEditMode(detail: import('@playwright/test').Locator) {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
    return;
  }
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function saveMovingFlow(page: import('@playwright/test').Page) {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const wideSave = page.getByTestId('public-flow-save-primary');
  if (await wideSave.isVisible()) await wideSave.click();
  else await page.getByTestId('public-flow-save-primary-mobile').click();
  await page.getByTestId('public-flow-saved-receipt-primary').click();
  await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
}

async function openArchivedInventory(page: import('@playwright/test').Page) {
  const directEntry = page.getByTestId('my-flow-open-archived');
  if (await directEntry.isVisible().catch(() => false)) {
    await directEntry.click();
    return;
  }
  await page.getByTestId('my-flow-library-rail-filter').selectOption('archived');
}

test.describe('P27 server document foundation', () => {
  test('/flows exposes a meaningful entry and representative Flows before hydration', async ({ request }) => {
    const response = await request.get('/flows');
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain('URL이나 메모로 Flow 찾기');
    expect(html).toContain('원룸 이사 D-30');
    expect(html).toContain('차량 점검 준비');
    expect(html).toContain('세탁조 청소');
    expect(html).not.toContain('Flow를 불러오는 중입니다.');
  });

  test('/my server document keeps the canonical three-destination shell', async ({ request }) => {
    const response = await request.get('/my');
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain('My Flow');
    expect(html).toContain('P35-ENTRY-ROUTER-3TAB');
    expect(html).toContain('P35-MY-LIBRARY-ONLY');
    expect(html).not.toContain('my-flow-view-today');
    expect(html).not.toContain('my-flow-view-completed');
    expect(html).not.toContain('Studio 대시보드');
  });
});

test.describe('P27 reversible lifecycle foundation', () => {
  test('saved Flow archive is reversible, persistent, and excluded from active Calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    let flowCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-management-menu-trigger').click();
    await flowCard.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();

    const afterArchive = await page.evaluate(() => ({
      lifecycle: JSON.parse(window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{}'),
      savedKeys: Object.keys(window.localStorage).filter((key) => key.startsWith('flow:saved:')),
      saved: window.localStorage.getItem('flow:saved:moving-d30-basic'),
    }));
    expect(afterArchive.lifecycle.archivedFlowSlugs).toContain('moving-d30-basic');
    expect(afterArchive.savedKeys).toContain('flow:saved:moving-d30-basic');
    expect(afterArchive.saved).toContain('2030-08-15');

    await page.getByTestId('my-flow-lifecycle-undo').click();
    flowCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-management-menu-trigger').click();
    await flowCard.getByTestId('my-flow-archive-toggle').click();

    await page.reload();
    await openArchivedInventory(page);
    const library = page.getByTestId('my-flow-library-workspace');
    const archivedRow = library.locator(
      '[data-testid="my-flow-library-archived-row"][data-flow-slug="moving-d30-basic"]',
    );
    await expect(archivedRow).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-empty-state')).toContainText('날짜 항목 없음');
    await expect(page.locator('[data-flow-slug="moving-d30-basic"]')).toHaveCount(0);

    await page.goto('/my?view=flows');
    await openArchivedInventory(page);
    const persistedLibrary = page.getByTestId('my-flow-library-workspace');
    const persistedArchivedRow = persistedLibrary.locator(
      '[data-testid="my-flow-library-archived-row"][data-flow-slug="moving-d30-basic"]',
    );
    await persistedArchivedRow.getByTestId('my-flow-archived-direct-restore').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    await expect(await openMyFlowLibraryFlow(page, 'moving-d30-basic')).toBeVisible();
  });

  test('source-backed item removal has immediate undo and persistent restore', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    const flowCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(getMyFlowVisibleExecutionRows(flowCard)).toHaveCount(4);

    const removeFirstItem = async () => {
      await getMyFlowVisibleExecutionRows(flowCard).first().getByRole('button', { name: /열기/ }).click();
      const detail = flowCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
      await enterMyFlowDetailEditMode(detail);
      await expect(detail).toHaveAttribute('data-surface-context', 'flow');
      await expect(detail).toHaveAttribute('data-can-remove-from-flow', 'true');
      await expect(detail.getByTestId('my-flow-remove-item')).toBeVisible();
      await detail.getByTestId('my-flow-remove-item').click();
    };

    await removeFirstItem();
    await expect(getMyFlowVisibleExecutionRows(flowCard)).toHaveCount(3);
    await expect(flowCard.getByTestId('my-flow-batch-undo')).toContainText('Flow에서 뺐어요');
    await flowCard.getByTestId('my-flow-batch-undo-action').click();
    await expect(getMyFlowVisibleExecutionRows(flowCard)).toHaveCount(4);

    await removeFirstItem();
    await expect(getMyFlowVisibleExecutionRows(flowCard)).toHaveCount(3);
    await page.reload();

    const reloadedCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expect(getMyFlowVisibleExecutionRows(reloadedCard)).toHaveCount(3);
    const excluded = reloadedCard.getByTestId('my-flow-excluded-steps');
    await excluded.locator('summary').click();
    await expect(excluded.getByTestId('my-flow-excluded-step-row')).toHaveCount(1);
    await excluded.getByTestId('my-flow-restore-excluded-item').click();
    await expect(getMyFlowVisibleExecutionRows(reloadedCard)).toHaveCount(4);
  });

  test('workout confirmation items and resources use a persistent personal overlay', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect.poll(() => page.evaluate(() => Boolean(
      window.localStorage.getItem('flow:saved:curated-allblanc-morning-workout'),
    ))).toBe(true);

    await page.goto('/my?view=flows&mode=flow');
    let flowCard = await openMyFlowLibraryFlow(page, 'curated-allblanc-morning-workout');
    let outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    let detail = page
      .getByTestId('my-flow-item-detail-sheet')
      .getByTestId('my-flow-item-detail');
    await enterMyFlowDetailEditMode(detail);

    const subcheckEditor = detail.getByTestId('my-flow-subcheck-editor');
    await subcheckEditor.locator('summary').click();
    await subcheckEditor.getByLabel(/확인 항목 추가/).fill('운동 전 통증 확인');
    await subcheckEditor.getByRole('button', { name: '추가', exact: true }).click();
    await expect(subcheckEditor.getByTestId('my-flow-subcheck-edit-input')).toHaveCount(1);

    const resourceEditor = detail.getByTestId('my-flow-resource-editor');
    await resourceEditor.locator('summary').click();
    await expect(resourceEditor.getByTestId('my-flow-resource-label-input')).toHaveCount(2);
    await resourceEditor.getByTestId('my-flow-resource-label-input').first().fill('오늘 운동 영상');
    await resourceEditor.getByRole('button', { name: /자료 숨기기/ }).nth(1).click();
    await expect(resourceEditor.getByTestId('my-flow-resource-label-input')).toHaveCount(1);

    await detail.getByTestId('my-flow-detail-save-changes').click();
    await expect(detail).toHaveCount(0);

    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    detail = page
      .getByTestId('my-flow-item-detail-sheet')
      .getByTestId('my-flow-item-detail');
    await expect(detail.getByTestId('my-flow-item-checklist')).toContainText('운동 전 통증 확인');
    await expect(detail.getByTestId('my-flow-item-resource-link')).toHaveCount(1);
    await expect(detail.getByTestId('my-flow-item-resource-link')).toContainText('오늘 운동 영상');
    const subcheck = detail.getByTestId('my-flow-item-checklist').getByRole('checkbox');
    await subcheck.check();
    await expect(subcheck).toBeChecked();
    await subcheck.uncheck();
    await expect(subcheck).not.toBeChecked();
    await page
      .getByTestId('my-flow-item-detail-sheet-close')
      .click();

    await page.reload();
    flowCard = await openMyFlowLibraryFlow(page, 'curated-allblanc-morning-workout');
    outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    detail = page
      .getByTestId('my-flow-item-detail-sheet')
      .getByTestId('my-flow-item-detail');
    await expect(detail.getByTestId('my-flow-item-checklist')).toContainText('운동 전 통증 확인');
    await expect(detail.getByTestId('my-flow-item-resource-link')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });

  test('public adjustment stays personal and lands as the same My Flow outline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.evaluate(() => {
      window.localStorage.setItem(
        'flow_builder_mvp_item_state_moving-d30-basic',
        JSON.stringify({
          'flow-moving-item-1': {
            note: '하자 사진과 관리실 연락 메모',
          },
        }),
      );
    });
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
    await rows.nth(1).getByRole('checkbox', { name: '이사할 집 하자 점검하기 Flow에 포함' }).uncheck();
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toBeVisible();
    const persisted = await page.evaluate(() => ({
      itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') || '{}'),
      saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') || '{}'),
    }));
    expect(persisted.itemStates['flow-moving-item-1']).toMatchObject({ personalExcluded: true });
    expect(persisted.itemStates['flow-moving-item-1'].note).toBe('하자 사진과 관리실 연락 메모');
    expect(persisted.itemStates['flow-moving-item-0']).toBeUndefined();
    expect(persisted.saved.anchor).toBe('2030-08-15');
    expect(persisted.saved.personalTitle).toBe('내 이사 준비');

    await openSavedPublicFlow(page, receipt);
    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
    const flowCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expect(flowCard).toBeVisible();
    await expandMyFlowWholePlan(flowCard);
    const outlineRows = getMyFlowVisibleExecutionRows(flowCard);
    await expect(outlineRows).toHaveCount(23);
    await expect(outlineRows.nth(0)).toContainText('이사 방식 정하기');
    await expect(outlineRows.nth(1)).toContainText('필요 없는 물건 정리하기');

    const excludedSteps = flowCard.getByTestId('my-flow-excluded-steps');
    await excludedSteps.locator('summary').click();
    const excludedRow = excludedSteps.getByTestId('my-flow-excluded-step-row').filter({
      hasText: '이사할 집 하자 점검하기',
    });
    await excludedRow.getByTestId('my-flow-restore-excluded-item').click();
    const restored = await page.evaluate(() => JSON.parse(
      window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') || '{}',
    )['flow-moving-item-1']);
    expect(restored.note).toBe('하자 사진과 관리실 연락 메모');
    expect(restored.personalExcluded).toBeUndefined();

    await page.reload();
    const restoredAfterReload = await page.evaluate(() => JSON.parse(
      window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') || '{}',
    )['flow-moving-item-1']);
    expect(restoredAfterReload.note).toBe('하자 사진과 관리실 연락 메모');
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
    await expect(adjustment.getByRole('button', { name: /아래로 이동/ })).toHaveCount(0);
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
    await page.goto('/my?demo=ux12&view=flows&mode=flow');
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
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(receipt.getByTestId('public-flow-saved-receipt-status')).toContainText('24');
    await receipt.getByTestId('public-flow-saved-receipt-primary').click();

    const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
    await expect(flow.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');
    const exportRegion = flow.getByTestId('my-flow-export-surface');
    const exportButton = exportRegion.getByTestId('my-flow-export-entry');
    await exportButton.click();
    const exportPanel = exportRegion.getByTestId('my-flow-export-panel');
    await expect(exportPanel).toHaveAttribute('data-export-layout', 'compact-preflight');
    await expect(exportPanel).toHaveAttribute('data-default-expanded-secondary-count', '0');
    await expect(exportPanel.getByTestId('my-flow-export-scope-summary')).toContainText('Flow 전체 · 24개');
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
    const reloadedFlow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expect(reloadedFlow.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');
    await expectNoHorizontalOverflow(page);
  });
});
