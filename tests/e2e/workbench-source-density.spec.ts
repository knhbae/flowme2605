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

  test('/f/birth-registration-prep separates birth filing from benefit bundle application', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/birth-registration-prep');

    await openAllWorkbenchDetails(page);
    const body = page.locator('body');
    await expect(body).toContainText('온라인 신고 참여 병원');
    await expect(body).toContainText('전자가족관계등록시스템');
    await expect(body).not.toContainText(/정부24\s*\(온라인\)[^\n]{0,80}출생신고/u);
    await expect(body).not.toContainText(/부모급여[^\n]{0,80}60일/u);
  });

  test('/f/payday-finance-routine does not turn a mismatched source ratio into a recommendation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/payday-finance-routine');

    await openAllWorkbenchDetails(page);
    const body = page.locator('body');
    await expect(body).toContainText(/비율[^\n]{0,100}직접 정/u);
    await expect(body).not.toContainText(/생활비\s*40%[^\n]{0,100}비상금\s*20%/u);
  });

  test('/f/safe-inheritance-onestop keeps the official one-year window without unsupported urgency', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/safe-inheritance-onestop');

    await openAllWorkbenchDetails(page);
    const body = page.locator('body');
    await expect(body).toContainText(/말일부터\s*1년\s*이내/u);
    await expect(body).not.toContainText(/일부 재산[^\n]{0,100}6개월/u);
  });

  test('/f/passport-renewal-docs uses the current foreign ministry source', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/f/passport-renewal-docs');

    await expect(page.getByTestId('flow-source-card')).toContainText('외교부 여권안내');
    await expect(page.getByTestId('flow-source-card').locator('a[href]')).toHaveAttribute(
      'href',
      'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
    );
    await expect(page.locator('body')).not.toContainText('정부24 여권 발급 민원 안내');
  });
});
