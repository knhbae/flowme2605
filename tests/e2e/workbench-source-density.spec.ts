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
    await expect(listCard.locator('details[open]')).not.toHaveCount(0);
  });

  test('/f/fridge-cleanout-weekly-plan keeps export at the flow level on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/fridge-cleanout-weekly-plan');

    const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
    await expect(exportEntry).toBeVisible();
    await expect(exportEntry).toContainText('Flow');
    await expect(exportEntry).toContainText('파일');
    await expect(page.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
    expect(await exportEntry.getByTestId('public-flow-export-format-option').count()).toBeGreaterThanOrEqual(2);
  });

  test('/f/new-car-7-step keeps internal source trace out of expanded user details', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-7-step');

    const listCard = await openAllWorkbenchDetails(page);
    await expect(listCard.locator('details[open]')).not.toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('sourceTrace');
    await expect(page.locator('body')).not.toContainText(/원문 근거\s*[:：]/u);
    await expect(page.locator('body')).not.toContainText(/옵션\s*200~500만원|등록비\s*7~8%|보험료\s*연\s*100~200만원/u);
  });
});
