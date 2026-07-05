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
});
