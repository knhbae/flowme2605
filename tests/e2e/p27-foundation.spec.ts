import { expect, test } from '@playwright/test';

async function saveMovingFlow(page: import('@playwright/test').Page) {
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  const wideSave = page.getByTestId('flow-map-save-all');
  if (await wideSave.isVisible()) await wideSave.click();
  else await page.getByTestId('flow-map-save-all-mobile').click();
  await expect(page).toHaveURL('/my?savedMap=moving-d30');
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

    const flowCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();

    const afterArchive = await page.evaluate(() => ({
      lifecycle: JSON.parse(window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{}'),
      savedKeys: Object.keys(window.localStorage).filter((key) => key.startsWith('flow:saved:')),
      savedMap: window.localStorage.getItem('flow:map:saved:moving-d30'),
    }));
    expect(afterArchive.lifecycle.archivedFlowSlugs).toContain('source-backed-moving-d30');
    expect(afterArchive.savedKeys).toContain('flow:saved:source-backed-moving-d30');
    expect(afterArchive.savedMap).toContain('2030-08-15');

    await page.getByTestId('my-flow-lifecycle-undo').click();
    await expect(flowCard).toBeVisible();
    await flowCard.getByTestId('my-flow-archive-toggle').click();

    await page.reload();
    await expect(page.getByTestId('my-flow-open-archived')).toBeVisible();
    await page.getByTestId('my-flow-open-archived').click();
    await expect(page.getByTestId('my-flow-list-filter-archived')).toHaveAttribute('aria-pressed', 'true');
    const archivedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await expect(archivedCard).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByTestId('my-flow-empty-state')).toContainText('날짜 항목 없음');
    await expect(page.locator('[data-flow-slug="source-backed-moving-d30"]')).toHaveCount(0);

    await page.goto('/my?view=flows');
    await page.getByTestId('my-flow-open-archived').click();
    const persistedArchivedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await persistedArchivedCard.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    await page.getByTestId('my-flow-list-filter-all').click();
    await expect(flowCard).toBeVisible();
  });

  test('source-backed item removal has immediate undo and persistent restore', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    const flowCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    const outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);

    const removeFirstItem = async () => {
      await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
      const detail = flowCard.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail');
      const readSummary = detail.getByTestId('my-flow-detail-read-summary');
      if ((await readSummary.getAttribute('open')) === null) {
        await readSummary.locator('summary').click();
      }
      await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
      await expect(detail).toHaveAttribute('data-surface-context', 'flow');
      await expect(detail).toHaveAttribute('data-can-remove-from-flow', 'true');
      await expect(detail.getByTestId('my-flow-remove-item')).toBeVisible();
      await detail.getByTestId('my-flow-remove-item').click();
    };

    await removeFirstItem();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(4);
    await expect(flowCard.getByTestId('my-flow-batch-undo')).toContainText('Flow에서 뺐어요');
    await flowCard.getByTestId('my-flow-batch-undo-action').click();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(5);

    await removeFirstItem();
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(4);
    await page.reload();

    const reloadedCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await expect(reloadedCard.getByTestId('my-flow-whole-flow-outline').getByTestId('my-flow-execution-row-shell')).toHaveCount(4);
    const excluded = reloadedCard.getByTestId('my-flow-excluded-steps');
    await excluded.locator('summary').click();
    await expect(excluded.getByTestId('my-flow-excluded-step-row')).toHaveCount(1);
    await excluded.getByTestId('my-flow-restore-excluded-item').click();
    await expect(reloadedCard.getByTestId('my-flow-whole-flow-outline').getByTestId('my-flow-execution-row-shell')).toHaveCount(5);
  });
});
