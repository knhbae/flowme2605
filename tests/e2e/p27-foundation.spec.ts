import { expect, test } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
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
  await expect(page).toHaveURL('/my?savedFlow=moving-d30-basic');
  await page.getByTestId('my-flow-post-save-view-flow').click();
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

  test('/my server document keeps the canonical four-tab shell', async ({ request }) => {
    const response = await request.get('/my');
    expect(response.ok()).toBe(true);

    const html = await response.text();
    expect(html).toContain('My Flow');
    expect(html).toContain('지금');
    expect(html).toContain('Flow 목록');
    expect(html).toContain('완료');
    expect(html).not.toContain('Studio 대시보드');
  });
});

test.describe('P27 reversible lifecycle foundation', () => {
  test('saved Flow archive is reversible, persistent, and excluded from active Calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    const flowCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
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
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-management-menu-trigger').click();
    await flowCard.getByTestId('my-flow-archive-toggle').click();

    await page.reload();
    await expect(page.getByTestId('my-flow-open-archived')).toBeVisible();
    await page.getByTestId('my-flow-open-archived').click();
    await expect(page.getByTestId('my-flow-library-rail-filter')).toHaveValue('archived');
    const archivedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
    await expect(archivedCard).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-empty-state')).toContainText('날짜 항목 없음');
    await expect(page.locator('[data-flow-slug="moving-d30-basic"]')).toHaveCount(0);

    await page.goto('/my?view=flows');
    await page.getByTestId('my-flow-open-archived').click();
    const persistedArchivedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
    await persistedArchivedCard.getByTestId('my-flow-management-menu-trigger').click();
    await persistedArchivedCard.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    await expect(flowCard).toBeVisible();
    await expect(page.getByTestId('my-flow-library-rail-filter')).toHaveCount(0);
  });

  test('source-backed item removal has immediate undo and persistent restore', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    const flowCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
    const outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(4);

    const removeFirstItem = async () => {
      await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
      const detail = flowCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
      await enterMyFlowDetailEditMode(detail);
      await expect(detail).toHaveAttribute('data-surface-context', 'flow');
      await expect(detail).toHaveAttribute('data-can-remove-from-flow', 'true');
      await expect(detail.getByTestId('my-flow-remove-item')).toBeVisible();
      await detail.getByTestId('my-flow-remove-item').click();
    };

    await removeFirstItem();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(flowCard.getByTestId('my-flow-batch-undo')).toContainText('Flow에서 뺐어요');
    await flowCard.getByTestId('my-flow-batch-undo-action').click();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(4);

    await removeFirstItem();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await page.reload();

    const reloadedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]');
    await expect(reloadedCard.getByTestId('my-flow-whole-flow-outline').getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    const excluded = reloadedCard.getByTestId('my-flow-excluded-steps');
    await excluded.locator('summary').click();
    await expect(excluded.getByTestId('my-flow-excluded-step-row')).toHaveCount(1);
    await excluded.getByTestId('my-flow-restore-excluded-item').click();
    await expect(reloadedCard.getByTestId('my-flow-whole-flow-outline').getByTestId('my-flow-execution-row-shell')).toHaveCount(4);
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

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
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
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    await expect(page).toHaveURL('/f/moving-d30-basic');

    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toBeVisible();
    await expect(adjustment).not.toContainText('Markdown');
    await expect(adjustment).not.toContainText('발행');
    const rows = adjustment.getByTestId('public-flow-adjustment-row');
    await expect(rows).toHaveCount(24);
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'include');
    await expect(adjustment.getByTestId('public-flow-adjustment-title')).toHaveCount(0);
    await expect(adjustment.getByTestId('public-flow-adjustment-date')).toHaveCount(0);
    await expect(adjustment.getByRole('button', { name: /아래로 이동/ })).toHaveCount(0);

    await adjustment.getByTestId('public-flow-adjustment-mode-content').click();
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'content');
    const first = rows.first();
    await first.getByTestId('public-flow-adjustment-title').fill('내 이사 방식 확정');
    await first.getByTestId('public-flow-adjustment-memo').locator('summary').click();
    await first.getByRole('textbox', { name: '내 이사 방식 확정 개인 메모' }).fill('가족과 최종 확인');

    await adjustment.getByTestId('public-flow-adjustment-mode-schedule').click();
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'schedule');
    await first.getByTestId('public-flow-adjustment-date').fill('2030-08-01');

    await adjustment.getByTestId('public-flow-adjustment-mode-include').click();
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'include');
    await adjustment.getByTestId('public-flow-adjustment-item-disclosure').locator('summary').click();
    await rows.nth(1).getByRole('checkbox', { name: '이사할 집 하자 점검하기 저장에 포함' }).uncheck();

    await adjustment.getByTestId('public-flow-adjustment-mode-order').click();
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'order');
    await first.getByRole('button', { name: '내 이사 방식 확정 아래로 이동' }).click();
    await rows.nth(1).getByRole('button', { name: '내 이사 방식 확정 아래로 이동' }).click();

    await adjustment.getByTestId('public-flow-adjustment-save').click();
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toBeVisible();
    const persisted = await page.evaluate(() => ({
      itemStates: JSON.parse(window.localStorage.getItem('flow_builder_mvp_item_state_moving-d30-basic') || '{}'),
      drafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
      saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') || '{}'),
    }));
    expect(persisted.itemStates['flow-moving-item-1']).toMatchObject({ skipped: true, note: 'excluded_on_start' });
    expect(persisted.itemStates['flow-moving-item-0'].personalOrder).toBe(2);
    expect(persisted.drafts['moving-d30-basic::flow-moving-item-0::draft-overlay']).toMatchObject({
      title: '내 이사 방식 확정',
      date: '2030-08-01',
      memo: '가족과 최종 확인',
    });
    expect(persisted.saved.anchor).toBe('2030-08-15');

    await openSavedPublicFlow(page, receipt);
    await expect(page).toHaveURL('/my?savedFlow=moving-d30-basic');
    await page.getByTestId('my-flow-post-save-view-flow').click();
    const flowCard = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expect(flowCard).toBeVisible();
    const expandAll = flowCard.getByRole('button', { name: '전체 펼치기' });
    if (await expandAll.isVisible().catch(() => false)) await expandAll.click();
    const outlineRows = flowCard.getByTestId('my-flow-whole-flow-outline').getByTestId('my-flow-execution-row-shell');
    await expect(outlineRows).toHaveCount(23);
    await expect(outlineRows.nth(0)).toContainText('필요 없는 물건 정리하기');
    await expect(outlineRows.nth(1)).toContainText('내 이사 방식 확정');
    await expect(outlineRows.nth(1)).toContainText('8월 1일');
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
    await expect(adjustment.getByTestId('public-flow-adjustment-row')).toHaveCount(24);
    await expect(adjustment).not.toContainText('Markdown');
    await expect(adjustment).not.toContainText('발행');
    await adjustment.getByTestId('public-flow-adjustment-mode-order').click();
    await expect(adjustment.getByRole('button', { name: '이사 방식 정하기 아래로 이동' })).toBeVisible();
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

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    await expect(page.getByTestId('my-flow-mobile-flow-summary')).toHaveAttribute('data-library-mode', 'compact');
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(3);
    await expect(page.getByTestId('my-flow-search')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-list-filter-all')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-structure-row').first()).toContainText('세탁기 통세척');
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow reveals search for a large library and groups one date into one execution frame', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux12');

    const dateGroup = page.getByTestId('my-flow-now-date-group');
    await expect(dateGroup).toBeVisible();
    const rowKeys = await dateGroup.getByTestId('my-flow-mobile-continuation-card').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-row-key')),
    );
    expect(rowKeys.length).toBeGreaterThan(1);
    expect(new Set(rowKeys).size).toBe(rowKeys.length);

    await page.getByTestId('my-flow-view-flow').click();
    await expect(page.getByTestId('my-flow-mobile-flow-summary')).toHaveAttribute('data-library-mode', 'searchable');
    await expect(page.getByTestId('my-flow-search')).toBeVisible();
    await expect(page.getByTestId('my-flow-list-filter-all')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow search result opens the selected whole Flow workspace on wide screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux12');
    await page.getByTestId('my-flow-view-flow').click();
    const library = page.getByTestId('my-flow-library-workspace');
    await library.getByTestId('my-flow-library-rail-search').fill('중고차');
    const flow = await openMyFlowLibraryFlow(page, 'used-car-buying-check');
    await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
    await expect(flow.getByTestId('my-flow-whole-flow-workspace')).toBeVisible();
    expect(await flow.getByTestId('my-flow-execution-row-shell').count()).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
  });

  test('Calendar keeps long undated titles readable and nested event wrappers out of the tab order', async ({ page }) => {
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
    await page.goto('/calendar');

    const undatedTitle = page.getByTestId('my-flow-calendar-unscheduled-item-title').first();
    await expect(undatedTitle).toBeVisible();
    const titleLayout = await undatedTitle.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
      };
    });
    expect(titleLayout.whiteSpace).not.toBe('nowrap');
    expect(titleLayout.textOverflow).not.toBe('ellipsis');

    await page.goto('/calendar?demo=ux12');
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
    await page.getByTestId('public-flow-saved-receipt-primary').click();

    const postSave = page.getByTestId('my-flow-post-save-panel');
    await expect(postSave).toBeVisible();
    await expect(postSave.getByTestId('my-flow-post-save-metrics')).toHaveAttribute('data-layout', 'compact');
    await expect(postSave.getByTestId('my-flow-post-save-action-hub')).toHaveAttribute('data-layout', 'compact');
    await expect(postSave.getByTestId('my-flow-post-save-step')).toHaveCount(4);
    await expect(postSave).toHaveAttribute('data-receipt-total-count', '24');
    await expect(postSave.getByTestId('my-flow-post-save-export-region')).toHaveCount(0);
    const outlineBox = await postSave.getByTestId('my-flow-post-save-artifact').boundingBox();
    expect(outlineBox?.y ?? Number.MAX_SAFE_INTEGER).toBeLessThan(844);

    const exportButton = postSave.getByTestId('my-flow-post-save-open-export');
    await exportButton.click();
    const exportRegion = postSave.getByTestId('my-flow-post-save-export-region');
    await expect(exportRegion).toBeFocused();
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
    await expect(exportRegion).toHaveCount(0);
    await expect(exportButton).toBeFocused();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await expect(page.getByTestId('my-flow-post-save-panel').getByTestId('my-flow-post-save-step')).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
  });
});
