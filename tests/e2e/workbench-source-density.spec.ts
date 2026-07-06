import { expect, test } from '@playwright/test';

async function openAllWorkbenchDetails(page: import('@playwright/test').Page) {
  const workbench = page.getByLabel('Flow artifact workbench');
  const listCard = workbench.getByTestId('artifact-list-card');
  await expect(listCard).toBeVisible();

  const summaries = listCard.locator('details summary');
  const count = await summaries.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const summary = summaries.nth(index);
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
  }

  return listCard;
}

test.describe('field checklist workbench source density', () => {
  for (const route of ['/f/new-car-delivery-check', '/f/used-car-buying-check']) {
    test(`${route} keeps source access out of repeated checklist row details`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const listCard = await openAllWorkbenchDetails(page);

      await expect(listCard.locator('details a[href]')).toHaveCount(0);
      const sourceCard = page.getByTestId('flow-source-card').first();
      await expect(sourceCard).toHaveCount(1);
      await expect(sourceCard.locator('a[href]').first()).toHaveCount(1);
    });
  }

  test('/f/new-car-delivery-check keeps repeated caution copy as one common note', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-delivery-check');

    const listCard = await openAllWorkbenchDetails(page);
    await expect(listCard.getByTestId('workbench-common-detail-caution')).toHaveCount(1);
    await expect(listCard.getByText('하자를 발견하면 서명 또는 인수 확정 전에')).toHaveCount(1);
    await expect(listCard.getByText('실행:').first()).toBeVisible();
    await expect(listCard.getByText('완료:').first()).toBeVisible();
  });

  test('/f/fridge-cleanout-weekly-plan gives mobile artifact export a target-specific label', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/fridge-cleanout-weekly-plan');

    const sheetExport = page.getByTestId('mobile-artifact-export-excel').first();
    await expect(sheetExport).toBeVisible();
    await expect(sheetExport).toHaveText('재고 소진표 받기');
    await expect(sheetExport).toHaveAttribute('aria-label', /시트로 받기: .*재고 소진표/);
  });
});
