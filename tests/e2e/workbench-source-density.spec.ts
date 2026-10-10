import { expect, test } from '@playwright/test';
import { seedBundles } from '../../lib/flow/seed-flows';

import { gotoLegacySavedPlanLibraryRoute } from './helpers/my-flow-library';

async function openArtifactFirstOutline(page: import('@playwright/test').Page) {
  const hero = page.getByTestId('public-flow-hero');
  await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');

  const outline = hero.getByTestId('public-flow-capability-result');
  await expect(outline).toBeVisible();
  const expand = outline.getByTestId('flow-capability-artifact-preview-expand');
  if (await expand.isVisible().catch(() => false)) await expand.click();
  await expect(outline.getByTestId('flow-capability-artifact-preview-row').first()).toBeVisible();

  return { hero, outline };
}

function getPreReviewSource(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  if (!bundle) throw new Error(`Missing pre-review source data: ${slug}`);
  return bundle;
}

function getPublicIdentitySource(page: import('@playwright/test').Page) {
  return page.locator('[data-flow-identity-slot="source"]');
}

async function expectClosedSourceRoute(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '이 계획은 지금 열 수 없어요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '다른 계획 찾기' })).toHaveAttribute('href', '/flows');
  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);
  await expect(page.getByLabel('Flow artifact workbench')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /내 계획에 저장|(?:이사일|시작일|검사일) 정하기/ })).toHaveCount(0);
}

test.describe('field checklist workbench source density', () => {
  // The same public renderer's generic density contract remains live on eligible source.
  for (const route of ['/f/vehicle-inspection-prep']) {
    test(`${route} keeps source access out of repeated checklist row details`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);

      const { hero, outline } = await openArtifactFirstOutline(page);

      await expect(hero.getByTestId('public-flow-capability-result').locator('a[href]')).toHaveCount(0);
      await expect(outline.getByTestId('flow-capability-artifact-preview-row').locator('a[href]')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-reference-details')).toHaveCount(0);
      await expect(page.locator('[data-testid="flow-source-card"], [data-testid="flow-source-card-mobile"]')).toHaveCount(0);
      const identitySource = getPublicIdentitySource(page);
      await expect(identitySource).toHaveCount(1);
      await expect(identitySource.locator('a[href]')).toHaveCount(1);
    });
  }

  // Source-data assertions are not a PASS for the old held public warning-card UI.
  test('held new-car pre-review data keeps caution as one flow note rather than a task', () => {
    const source = getPreReviewSource('new-car-delivery-check');
    expect(source.flow.warning).toBe('차량 인수 후 발견되는 하자는 처리 기준이 달라질 수 있습니다. 서명 또는 인수 확정 전에 사진 파일명, 딜러 확인, 보류 조건을 남기세요.');
    expect(source.items.filter((item) => item.title.includes('공통 주의'))).toHaveLength(0);
    expect(source.items.map((item) => item.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `flow-new-car-delivery-item-${index}`),
    );
    expect(source.flow.source_url).toBe('https://web.getcha.kr/blog/new-car-inspection-checklist-complete-guide-2026');
    expect(source.flow.source_checked_at).toBe('2026-07-11');
  });

  test('held used-car pre-review data keeps its official source and condition boundary', () => {
    const source = getPreReviewSource('used-car-buying-check');
    expect(source.flow.source_url).toBe('https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y');
    expect(source.flow.warning).toBe('이 체크리스트는 참고용이며 차량 상태를 보증하지 않습니다. 사고·침수·압류·저당 여부는 공식 조회와 전문가 점검을 함께 사용하세요.');
    expect(source.items.map((item) => item.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => `flow-used-car-buying-item-${index}`),
    );
  });

  test('held fridge pre-review data keeps all six inventory items with original identity and dates', () => {
    const source = getPreReviewSource('fridge-cleanout-weekly-plan');
    expect(source.flow.primary_destination).toBe('sheet');
    expect(source.items).toHaveLength(6);
    expect(source.items.map((item) => item.id)).toEqual(
      Array.from({ length: 6 }, (_, index) => `flow-fridge-cleanout-weekly-plan-item-${index}`),
    );
    expect(source.items.map((item) => item.title)).toEqual([
      '냉장고 지도에서 우선 소진 재료 3개 고르기',
      '이번 주 메인 재료와 메뉴 후보 묶기',
      '1~2일차 신선 재료 먼저 쓰기',
      '3~4일차 남은 요리와 재료 변형하기',
      '5~6일차 냉동실과 기본 재료로 이어가기',
      '7일차 남은 재료 처리와 장보기 보류 결정하기',
    ]);
    expect(source.items.map((item) => item.day_offset)).toEqual([0, 0, 1, 3, 5, 7]);
    expect(source.flow.warning).toContain('식품 안전');
    expect(source.flow.warning).toContain('보장하지 않습니다');
  });

  for (const slug of ['new-car-delivery-check', 'used-car-buying-check', 'fridge-cleanout-weekly-plan', 'passport-renewal-docs']) {
    test(`/f/${slug} is held for NEW start without changing local records`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, '/');
      const recordsBefore = await page.evaluate(() => Object.fromEntries(
        Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]),
      ));
      const response = await gotoLegacySavedPlanLibraryRoute(page, `/f/${slug}`);
      expect(response?.status()).toBe(404);
      await expectClosedSourceRoute(page);
      await expect(page.getByTestId('public-flow-save-primary')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveCount(0);
      expect(await page.evaluate(() => Object.fromEntries(
        Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]),
      ))).toEqual(recordsBefore);
    });
  }

  // Wedding's current quick entry is not coverage for held fridge's former quick-disabled UI.
  test('/f/curated-wedding-naver-timeline keeps export at the flow level on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/curated-wedding-naver-timeline');

    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    const capability = page.getByTestId('public-flow-capability-result');
    expect(await capability.getByTestId('flow-capability-result-choice').count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('mobile-artifact-export-excel')).toHaveCount(0);
    await expect(page.locator('main[data-p35-q1-quick-eligible="true"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(1);
    await expect(page.getByTestId('public-flow-quick-result-entry')).toBeVisible();

    const selected = capability.getByTestId('flow-capability-selected-preview');
    await expect(selected).toHaveAttribute('data-capability-output-count', '6');
    const selectedItemIds = (await selected.getAttribute('data-capability-manifest-item-ids'))
      ?.split(',')
      .filter(Boolean) ?? [];
    expect(selectedItemIds).toHaveLength(6);

    const alternative = capability.getByTestId('flow-capability-result-choice').nth(1);
    await alternative.click();
    await expect(selected).toHaveAttribute(
      'data-capability-destination',
      (await alternative.getAttribute('data-capability-destination')) ?? '',
    );
    expect((await selected.getAttribute('data-capability-manifest-item-ids'))
      ?.split(',')
      .filter(Boolean)).toEqual(selectedItemIds);
  });

  test('/f/curated-new-car-basic keeps internal source trace out of expanded user details', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/curated-new-car-basic');

    await openArtifactFirstOutline(page);
    await expect(page.locator('body')).not.toContainText('sourceTrace');
    await expect(page.locator('body')).not.toContainText(/원문 근거\s*[:：]/u);
    await expect(page.locator('body')).not.toContainText(/옵션\s*200~500만원|등록비\s*7~8%|보험료\s*연\s*100~200만원/u);
  });

  test('/f/birth-registration-prep separates birth filing from benefit bundle application', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await gotoLegacySavedPlanLibraryRoute(page, '/f/birth-registration-prep');

    expect(response?.status()).toBe(404);
    await expectClosedSourceRoute(page);
    const body = page.locator('body');
    await expect(body).not.toContainText(/정부24\s*\(온라인\)[^\n]{0,80}출생신고/u);
    await expect(body).not.toContainText(/부모급여[^\n]{0,80}60일/u);
  });

  test('/f/payday-finance-routine does not turn a mismatched source ratio into a recommendation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await gotoLegacySavedPlanLibraryRoute(page, '/f/payday-finance-routine');

    expect(response?.status()).toBe(404);
    await expectClosedSourceRoute(page);
    const body = page.locator('body');
    await expect(body).not.toContainText(/생활비\s*40%[^\n]{0,100}비상금\s*20%/u);
  });

  test('/f/safe-inheritance-onestop keeps the official source reachable without unsupported urgency', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/safe-inheritance-onestop');

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
      const response = await gotoLegacySavedPlanLibraryRoute(page, route);
      expect(response?.status()).toBe(404);
      await expectClosedSourceRoute(page);
    }
  });

  test('corrected official routes expose current source and save actions', async ({ page }) => {
    const routes = [
      {
        route: '/f/ev-subsidy-apply',
        sourceUrl: 'https://ev.or.kr/nportal/buySupprt/initSubsiGuideAction.do',
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
      await gotoLegacySavedPlanLibraryRoute(page, route.route);
      await expect(page.getByTestId('public-flow-review-only-gate')).toHaveCount(0);
      await expect(getPublicIdentitySource(page).locator('a[href]')).toHaveAttribute(
        'href',
        route.sourceUrl,
      );
      await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeVisible();
    }
  });

  // Historical source data, not a current public-source revalidation or public UI claim.
  test('held passport pre-review data preserves the foreign ministry source identity', () => {
    const source = getPreReviewSource('passport-renewal-docs');
    expect(source.flow.source_title).toContain('외교부 여권안내');
    expect(source.flow.source_url).toBe('https://www.passport.go.kr/home/kor/contents.do?menuPos=7');
    expect(source.flow.source_checked_at).toBe('2026-07-11');
    expect(JSON.stringify(source.flow)).not.toContain('정부24 여권 발급 민원 안내');
  });
});
