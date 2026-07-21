import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)).toBe(false);
}

async function enterMyFlowDetailEditMode(detail: import('@playwright/test').Locator) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

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

  test('workout confirmation items and resources use a persistent personal overlay', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 시작' }).click();
    await expect.poll(() => page.evaluate(() => Boolean(
      window.localStorage.getItem('flow:saved:curated-allblanc-morning-workout'),
    ))).toBe(true);

    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();
    let flowCard = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="curated-allblanc-morning-workout"]',
    );
    await flowCard.getByTestId('my-flow-mobile-structure-open').click();
    let outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    let detail = flowCard.getByTestId('my-flow-item-detail');
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
    await resourceEditor.getByRole('button', { name: /자료 목록에서 빼기/ }).nth(1).click();
    await expect(resourceEditor.getByTestId('my-flow-resource-label-input')).toHaveCount(1);

    await detail.getByTestId('my-flow-detail-save-changes').click();
    await expect(detail).toHaveCount(0);

    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    detail = flowCard.getByTestId('my-flow-item-detail');
    await expect(detail.getByTestId('my-flow-item-checklist')).toContainText('운동 전 통증 확인');
    await expect(detail.getByTestId('my-flow-item-resource-link')).toHaveCount(1);
    await expect(detail.getByTestId('my-flow-item-resource-link')).toContainText('오늘 운동 영상');
    const subcheck = detail.getByTestId('my-flow-item-checklist').getByRole('checkbox');
    await subcheck.check();
    await expect(subcheck).toBeChecked();
    await subcheck.uncheck();
    await expect(subcheck).not.toBeChecked();
    await detail.getByRole('button', { name: '닫기', exact: true }).click();

    await page.reload();
    flowCard = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="curated-allblanc-morning-workout"]',
    );
    await flowCard.getByTestId('my-flow-mobile-structure-open').click();
    outline = flowCard.getByTestId('my-flow-whole-flow-outline');
    await outline.getByTestId('my-flow-execution-row-shell').first().getByRole('button', { name: /열기/ }).click();
    detail = flowCard.getByTestId('my-flow-item-detail');
    await expect(detail.getByTestId('my-flow-item-checklist')).toContainText('운동 전 통증 확인');
    await expect(detail.getByTestId('my-flow-item-resource-link')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });
});
