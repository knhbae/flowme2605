import { expect, test } from '@playwright/test';

async function openArtifactFirstOutline(page: import('@playwright/test').Page) {
  const hero = page.getByTestId('public-flow-hero');
  await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');

  const outline = hero.getByTestId('public-flow-artifact-preview');
  await expect(outline).toBeVisible();
  const expand = outline.getByTestId('public-flow-artifact-preview-expand');
  if (await expand.isVisible().catch(() => false)) await expand.click();
  await expect(outline.getByTestId('public-flow-artifact-preview-row').first()).toBeVisible();

  return { hero, outline };
}

function getPublicIdentitySource(page: import('@playwright/test').Page) {
  return page.locator('[data-flow-identity-slot="source"]');
}

async function expectClosedSourceRoute(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '이 Flow는 지금 열 수 없어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flow 찾기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /그대로 시작|그대로 저장|내 Flow에 저장|날짜 없이 시작|날짜 없이 저장|이 날짜로 시작|이 날짜로 저장/ })).toHaveCount(0);
}

test.describe('field checklist workbench source density', () => {
  for (const route of ['/f/new-car-delivery-check', '/f/used-car-buying-check']) {
    test(`${route} keeps source access out of repeated checklist row details`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const { hero, outline } = await openArtifactFirstOutline(page);

      await expect(hero.getByTestId('public-flow-artifact-preview').locator('a[href]')).toHaveCount(0);
      await expect(outline.getByTestId('public-flow-artifact-preview-row').locator('a[href]')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
      await expect(page.locator('[data-testid="flow-source-card"], [data-testid="flow-source-card-mobile"]')).toHaveCount(0);
      const identitySource = getPublicIdentitySource(page);
      await expect(identitySource).toHaveCount(1);
      await expect(identitySource.locator('a[href]')).toHaveCount(1);
    });
  }

  test('/f/new-car-delivery-check keeps repeated caution copy as one common note', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-delivery-check');

    const { outline } = await openArtifactFirstOutline(page);
    await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
    await expect(page.locator('[data-testid="flow-source-card"], [data-testid="flow-source-card-mobile"]')).toHaveCount(0);
    await expect(page.getByTestId('flow-warning-card')).toHaveCount(1);
    await expect(outline.getByTestId('public-flow-artifact-preview-row').filter({ hasText: '공통 주의' })).toHaveCount(0);
  });

  test('/f/fridge-cleanout-weekly-plan keeps export at the flow level on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/fridge-cleanout-weekly-plan');

    const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    await expect(exportEntry).toBeVisible();
    await expect(exportEntry.getByTestId('public-flow-export-secondary-toggle')).toContainText('내 도구로 옮기기');
    await expect(exportEntry).toContainText('캘린더·체크리스트·시트 중 선택');
    await expect(page.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
    await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
    const exportBranch = page.getByTestId('public-flow-export-branch');
    await expect(exportBranch).toBeVisible();
    await expect(exportBranch.getByTestId('public-flow-export-format-option').first()).toBeVisible();
    expect(await exportBranch.getByTestId('public-flow-export-format-option').count()).toBeGreaterThanOrEqual(2);
    await exportBranch.getByTestId('public-flow-export-branch-close').click();
    await expect(exportBranch).toHaveCount(0);
  });

  test('/f/curated-new-car-basic keeps internal source trace out of expanded user details', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-new-car-basic');

    await openArtifactFirstOutline(page);
    await expect(page.locator('body')).not.toContainText('sourceTrace');
    await expect(page.locator('body')).not.toContainText(/원문 근거\s*[:：]/u);
    await expect(page.locator('body')).not.toContainText(/옵션\s*200~500만원|등록비\s*7~8%|보험료\s*연\s*100~200만원/u);
  });

  test('/f/birth-registration-prep separates birth filing from benefit bundle application', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto('/f/birth-registration-prep');

    expect(response?.status()).toBe(404);
    await expectClosedSourceRoute(page);
    const body = page.locator('body');
    await expect(body).not.toContainText(/정부24\s*\(온라인\)[^\n]{0,80}출생신고/u);
    await expect(body).not.toContainText(/부모급여[^\n]{0,80}60일/u);
  });

  test('/f/payday-finance-routine does not turn a mismatched source ratio into a recommendation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto('/f/payday-finance-routine');

    expect(response?.status()).toBe(404);
    await expectClosedSourceRoute(page);
    const body = page.locator('body');
    await expect(body).not.toContainText(/생활비\s*40%[^\n]{0,100}비상금\s*20%/u);
  });

  test('/f/safe-inheritance-onestop keeps the official source reachable without unsupported urgency', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/safe-inheritance-onestop');

    await expect(page.getByTestId('public-flow-review-only-gate')).toHaveCount(0);
    await expect(getPublicIdentitySource(page).locator('a[href]')).toHaveAttribute(
      'href',
      'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17400000001&tp_seq=02',
    );
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeVisible();
    const body = page.locator('body');
    await expect(body).not.toContainText(/일부 재산[^\n]{0,100}6개월/u);
  });

  test('remaining broad advice routes stay out of public service after source freshness audit', async ({ page }) => {
    const routes = [
      '/f/housing-subscription-account',
      '/f/monthly-household-budget',
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(404);
      await expectClosedSourceRoute(page);
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
      await expect(getPublicIdentitySource(page).locator('a[href]')).toHaveAttribute(
        'href',
        route.sourceUrl,
      );
      await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeVisible();
    }
  });

  test('/f/passport-renewal-docs uses the current foreign ministry source', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/f/passport-renewal-docs');

    await expect(getPublicIdentitySource(page)).toContainText('외교부 여권안내');
    await expect(getPublicIdentitySource(page).locator('a[href]')).toHaveAttribute(
      'href',
      'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
    );
    await expect(page.locator('body')).not.toContainText('정부24 여권 발급 민원 안내');
  });
});
