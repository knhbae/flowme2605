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

async function expectReviewOnlySourceRoute(
  page: import('@playwright/test').Page,
  sourceUrl: string,
  reviewReason = 'source_review_pending',
) {
  const gate = page.getByTestId('public-flow-review-only-gate');
  await expect(gate).toBeVisible();
  await expect(gate).toHaveAttribute('data-review-reason', reviewReason);
  await expect(gate.getByRole('link', { name: '현재 원문 확인하기' })).toHaveAttribute('href', sourceUrl);
  await expect(page.getByLabel('Flow artifact workbench')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 Flow에 저장' })).toHaveCount(0);
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

  test('/f/curated-new-car-basic keeps internal source trace out of expanded user details', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-new-car-basic');

    const listCard = await openAllWorkbenchDetails(page);
    await expect(listCard.locator('details[open]')).not.toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('sourceTrace');
    await expect(page.locator('body')).not.toContainText(/원문 근거\s*[:：]/u);
    await expect(page.locator('body')).not.toContainText(/옵션\s*200~500만원|등록비\s*7~8%|보험료\s*연\s*100~200만원/u);
  });

  test('/f/birth-registration-prep separates birth filing from benefit bundle application', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/birth-registration-prep');

    await expectReviewOnlySourceRoute(
      page,
      'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001',
      'source_fit_review_required',
    );
    const body = page.locator('body');
    await expect(body).not.toContainText(/정부24\s*\(온라인\)[^\n]{0,80}출생신고/u);
    await expect(body).not.toContainText(/부모급여[^\n]{0,80}60일/u);
  });

  test('/f/payday-finance-routine does not turn a mismatched source ratio into a recommendation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/payday-finance-routine');

    await expectReviewOnlySourceRoute(
      page,
      'https://toss.im/tossfeed/article/bank-account-divide',
      'source_fit_review_required',
    );
    const body = page.locator('body');
    await expect(body).not.toContainText(/생활비\s*40%[^\n]{0,100}비상금\s*20%/u);
  });

  test('/f/safe-inheritance-onestop keeps the official one-year window without unsupported urgency', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/safe-inheritance-onestop');

    await expect(page.getByTestId('public-flow-review-only-gate')).toHaveCount(0);
    await expect(page.getByTestId('flow-source-card').locator('a[href]').first()).toHaveAttribute(
      'href',
      'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17400000001&tp_seq=02',
    );
    await expect(page.getByRole('button', { name: '내 Flow에 저장' })).toBeVisible();
    const body = page.locator('body');
    await expect(body).toContainText('1년 이내');
    await expect(body).not.toContainText(/일부 재산[^\n]{0,100}6개월/u);
  });

  test('remaining broad advice routes stay review-only after source freshness audit', async ({ page }) => {
    const routes = [
      {
        route: '/f/housing-subscription-account',
        sourceUrl: 'https://www.applyhome.co.kr/co/coa/selectMainView.do',
      },
      {
        route: '/f/monthly-household-budget',
        sourceUrl: 'https://eknowhow.kr/budgeting-50-30-20-rule/',
      },
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of routes) {
      await page.goto(route.route);
      await expectReviewOnlySourceRoute(page, route.sourceUrl, 'source_fit_review_required');
    }
  });

  test('corrected official routes expose current source and save actions', async ({ page }) => {
    const routes = [
      {
        route: '/f/ev-subsidy-apply',
        sourceUrl: 'https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do',
      },
      {
        route: '/f/adult-vaccine-schedule-check',
        sourceUrl: 'https://nip.kdca.go.kr/irhp/mngm/goVcntMngm.do?menuCd=32&menuLv=3',
      },
      {
        route: '/f/used-car-ownership-transfer',
        sourceUrl: 'https://www.car365.go.kr/ccpt/cmmn/menu/redirectMenu.do?menuId=M610201004',
      },
      {
        route: '/f/small-business-fund-check',
        sourceUrl: 'https://ols.semas.or.kr/ols/man/SMAN010M/page.do',
      },
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of routes) {
      await page.goto(route.route);
      await expect(page.getByTestId('public-flow-review-only-gate')).toHaveCount(0);
      await expect(page.getByTestId('flow-source-card').locator('a[href]').first()).toHaveAttribute(
        'href',
        route.sourceUrl,
      );
      await expect(page.getByRole('button', { name: '내 Flow에 저장' })).toBeVisible();
    }
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
