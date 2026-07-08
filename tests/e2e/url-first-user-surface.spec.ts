import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  scanPrototypeRouteGuardrails,
  scanUserFacingOutputGuardrails,
  scanUserSurfaceGuardrails,
} from '../../lib/flow/user-surface-guardrails';

const urlFirstSourceSlugSignals = ['AJD', 'DeskLab', 'Mathbang'];
const creatorProfileSourceSlugSignals = [
  ...urlFirstSourceSlugSignals,
  'my-flow-studio',
  'flow-curation-team',
];

async function getLocatorLines(locator: Locator): Promise<string[]> {
  return (await locator.innerText())
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

async function expectCleanUrlFirstUserSurface(locator: Locator) {
  const result = scanUserSurfaceGuardrails({
    primaryLines: await getLocatorLines(locator),
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });

  expect(result.internalCopyHits).toEqual([]);
  expect(result.sourceSlugHits).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
  expect(result.trailingFlowSuffixHits).toEqual([]);
  expect(result.rawIsoDateHits).toEqual([]);
}

async function expectCleanCreatorProfileSurface(locator: Locator) {
  const result = scanUserSurfaceGuardrails({
    primaryLines: await getLocatorLines(locator),
    sourceSlugSignals: creatorProfileSourceSlugSignals,
  });

  expect(result.internalCopyHits).toEqual([]);
  expect(result.sourceSlugHits).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
  expect(result.trailingFlowSuffixHits).toEqual([]);
  expect(result.rawIsoDateHits).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
}

function expectCleanUserFacingOutput(text: string) {
  const result = scanUserFacingOutputGuardrails({
    text,
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });

  expect(result.internalCopyHits).toEqual([]);
  expect(result.sourceSlugHits).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
  expect(result.trailingFlowSuffixHits).toEqual([]);
  expect(result.rawIsoDateHits).toEqual([]);
}

async function openFlowFinding(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('flow-url-lookup-entry')).toBeVisible({ timeout: 15_000 });
}

async function lookupUrl(page: Page, url: string) {
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('원문 URL').fill(url);
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(page.getByTestId('flow-url-lookup-result')).toBeVisible();
}

async function seedResolvedUrlFirstCandidate(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://mathbang.net/13',
          originalUrl: 'https://mathbang.net/13?utm_source=share',
          title: '이제 실행 가능한 수학 후보',
          memo: '후보가 기존 콘텐츠로 닫힌 상태',
          status: 'miss_request',
          savedAt: '2026-07-07T00:00:00.000Z',
          lastLookup: {
            status: 'hit',
            title: '이미 만들어진 Flow가 있어요',
            checkedAt: '2026-07-07T00:00:00.000Z',
            canSaveToMyFlow: true,
            flowMapId: 'middle-school-math-1',
            routeHref: '/flow-maps/middle-school-math-1',
          },
        },
      ]),
    );
  });
  await page.reload();
  await expect(page.getByTestId('flow-url-supply-candidate-list')).toBeVisible();
}

async function seedMyStudioCreatorProfileContent(page: Page) {
  await page.goto('/flows');
  await page.evaluate(() => {
    const bundlesKey = 'flow_builder_mvp_bundles_v11';
    const sourceBundles = JSON.parse(localStorage.getItem(bundlesKey) ?? '[]');
    const makeStudioBundle = (
      slug: string,
      nextSlug: string,
      titleSuffix: string,
      status: 'published' | 'draft',
      usageCount: number,
      copyCount: number,
    ) => {
      const source = sourceBundles.find((bundle: { flow?: { slug?: string } }) => bundle.flow?.slug === slug);
      if (!source) throw new Error(`Missing seed bundle for ${slug}`);
      const next = JSON.parse(JSON.stringify(source));
      const nextId = `flow-my-studio-${nextSlug}`;
      next.flow.id = nextId;
      next.flow.slug = nextSlug;
      next.flow.title = `${next.flow.title} ${titleSuffix}`;
      next.flow.status = status;
      next.flow.owner_user_id = 'user-my-studio';
      next.flow.creator_name = '나의 스튜디오';
      next.flow.creator_role = '내가 저장하고 만든 실행 콘텐츠';
      next.flow.creator_note = '내가 쓰기 좋게 정리한 콘텐츠만 모아 둡니다.';
      next.flow.usage_count = usageCount;
      next.flow.copy_count = copyCount;
      next.sections = next.sections.map((section: { flow_id: string }) => ({ ...section, flow_id: nextId }));
      next.items = next.items.map((item: { flow_id: string }) => ({ ...item, flow_id: nextId }));
      return next;
    };
    const fixtureSlugs = new Set([
      'my-studio-moving-d30',
      'my-studio-computer-study',
      'my-studio-vehicle-check',
      'my-studio-moving-copy',
      'my-studio-draft-note',
    ]);
    const kept = sourceBundles.filter((bundle: { flow?: { slug?: string } }) => !fixtureSlugs.has(bundle.flow?.slug ?? ''));
    const fixtures = [
      makeStudioBundle('moving-d30-basic', 'my-studio-moving-d30', '정리본', 'published', 18, 5),
      makeStudioBundle('computer-skills-d30-study', 'my-studio-computer-study', '정리본', 'published', 12, 4),
      makeStudioBundle('vehicle-inspection-prep', 'my-studio-vehicle-check', '정리본', 'published', 9, 3),
      makeStudioBundle('moving-d30-basic', 'my-studio-moving-copy', '사본', 'published', 2, 1),
      makeStudioBundle('used-car-buying-check', 'my-studio-draft-note', '초안', 'draft', 0, 0),
    ];
    localStorage.setItem(bundlesKey, JSON.stringify([...kept, ...fixtures]));
  });
}

async function expectUrlFirstExportModesAvoidTechnicalFormatLabels(result: Locator) {
  const exportModeSelect = result.getByTestId('url-first-export-mode-select');
  await expect(exportModeSelect).toBeVisible();

  for (const mode of ['calendar', 'markdown', 'checklist']) {
    await exportModeSelect.selectOption(mode);
    await expect(result.getByTestId('url-first-memo-document-download')).toHaveText('메모 문서 받기');
    await expect(result).not.toContainText('Markdown');
    await expectCleanUrlFirstUserSurface(result);
  }
}

test('URL-first hit and custom-start states stay inside normal user-surface guardrails', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://mathbang.net/13?utm_source=share');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result).toContainText('이미 만든 준비가 있는지 먼저 찾아봤어요');
  await expect(result).not.toContainText('AI 자동 생성 없이 먼저 찾아봤어요');
  await expect(result).not.toContainText('Mathbang');
  await expect(result).not.toContainText('Markdown');
  const startDateInput = result.getByTestId('url-first-start-date-input');
  await expect(startDateInput).toBeVisible();
  await expect(startDateInput).toHaveAttribute('type', 'date');
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);

  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await expect(result).not.toContainText('Markdown');
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);
});

test('URL-first miss and saved-candidate states hide production-only wording from user surface', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/source-to-convert?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('아직 Flow화되지 않은 URL입니다');
  await expect(result).toContainText('이미 만든 준비가 있는지 먼저 찾아봤어요');
  await expect(result).not.toContainText('AI 자동 생성 없이 먼저 찾아봤어요');
  await expectCleanUrlFirstUserSurface(result);

  await result.getByLabel('요청 제목').fill('새로 보고 싶은 준비 체크리스트');
  await result.getByLabel('요청 메모').fill('URL에서 따라 할 순서만 남겨두고 싶음');
  await result.getByRole('button', { name: '요청으로 저장' }).click();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible();
  const candidateCard = candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' });
  await expect(candidateCard).toBeVisible();
  await expectCleanUrlFirstUserSurface(candidateCard);

  await candidateCard.getByRole('button', { name: '요청 내용 보기' }).click();
  await expect(candidateCard.getByTestId('flow-url-supply-production-handoff')).toBeVisible();
  await expect(candidateCard).toContainText('내가 쓴 제목·메모');
  await expect(candidateCard).toContainText('마지막 확인');
  await expect(candidateCard).not.toContainText('사용자 제목/메모');
  await expect(candidateCard).not.toContainText('마지막 다시 조회');
  await expectCleanUrlFirstUserSurface(candidateCard);

  await candidateCard.getByTestId('flow-url-supply-user-summary-copy').click();
  await expect(candidateCard).toContainText('요청 정리본 복사됨');
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toContain('# 요청 정리본');
  expect(copiedText).toContain('새로 보고 싶은 준비 체크리스트');
  expect(copiedText).toContain('URL에서 따라 할 순서만 남겨두고 싶음');
  expectCleanUserFacingOutput(copiedText);
});

test('URL-first resolved candidate cards hide legacy state-machine wording', async ({ page }) => {
  await openFlowFinding(page);
  await seedResolvedUrlFirstCandidate(page);

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
  await expect(candidateCard).toBeVisible();
  await expect(candidateCard).toContainText('이미 Flow로 준비됨');
  await expect(candidateCard).toContainText('Flow 결과로 이동해 바로 시작할 수 있어요');
  await expect(candidateCard).not.toContainText('이제 실행 가능한 수학 후보');
  await expect(candidateCard).not.toContainText('후보가 기존 콘텐츠로 닫힌 상태');
  await expect(candidateCard).not.toContainText(/닫힌 상태|실행 가능한 .*후보/);
  await expectCleanUrlFirstUserSurface(candidateCard);

  await candidateCard.getByRole('button', { name: '요청 내용 보기' }).click();
  await expect(candidateCard.getByTestId('flow-url-supply-production-handoff')).toBeVisible();
  await expect(candidateCard).not.toContainText('이제 실행 가능한 수학 후보');
  await expect(candidateCard).not.toContainText('후보가 기존 콘텐츠로 닫힌 상태');
  await expectCleanUrlFirstUserSurface(candidateCard);
});

test('URL-first lab stays prototype-gated and absent from user navigation', async ({ page }) => {
  const userRoutes = [
    '/',
    '/flows',
    '/my',
    '/calendar',
    '/f/vehicle-inspection-prep',
    '/flow-maps/moving-d30',
  ];
  const userRouteViewports = [
    { width: 390, height: 844 },
    { width: 768, height: 844 },
    { width: 1024, height: 768 },
  ];

  for (const viewport of userRouteViewports) {
    await page.setViewportSize(viewport);
    for (const route of userRoutes) {
      await page.goto(route);
      await expect(page.locator('a[href="/flow-lab/url-first-p0"], a[href^="/flow-lab/url-first-p0?"]')).toHaveCount(0);
      await expect(page.locator('a[href*="source-backed-manual-registration"]')).toHaveCount(0);
    }
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  const studioLink = page.getByRole('link', { name: '스튜디오' });
  await expect(studioLink).toBeVisible();
  await expect(studioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?savedMap=moving-d30');
  const mobileStudioLink = page.getByRole('link', { name: '스튜디오' });
  await expect(mobileStudioLink).toBeVisible();
  await expect(mobileStudioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await page.goto('/calendar');
  const calendarStudioLink = page.getByRole('link', { name: '스튜디오' });
  await expect(calendarStudioLink).toBeVisible();
  await expect(calendarStudioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await seedMyStudioCreatorProfileContent(page);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/u/my-flow-studio');
    await expect(page.getByTestId('creator-profile-surface')).toBeVisible();
    await expect(page.getByRole('heading', { name: '나의 스튜디오' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 Flow 스튜디오' })).toHaveCount(0);
    await expect(page.getByText('채널 콘텐츠')).toHaveCount(0);
    await expect(page.getByText('공개 콘텐츠', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '전체', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('creator-profile-content-card')).toHaveCount(5);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.getByText('My Creator Profile')).toHaveCount(0);
    await expect(page.getByText('Exact Source')).toHaveCount(0);
    await expect(page.getByText('Published Flows')).toHaveCount(0);
    await expectCleanCreatorProfileSurface(page.locator('body'));
    await expectNoHorizontalOverflow(page);
  }

  await page.goto('/u/flow-curation-team');
  await expect(page.getByTestId('creator-profile-surface')).toBeVisible();
  const publicCreatorRobots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(publicCreatorRobots ?? '').not.toMatch(/noindex/i);
  expect(await page.getByTestId('creator-profile-content-card').count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByText('채널 콘텐츠')).toHaveCount(0);
  await expectCleanCreatorProfileSurface(page.locator('body'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-lab/url-first-p0');
  await expect(page.getByTestId('url-first-p0-lab')).toBeVisible();
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('내부 실험 콘솔');
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('정상 사용자 메뉴에 연결하지 않는');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);

  await page.goto('/restart/moving-d30');
  const restartBodyLines = await getLocatorLines(page.locator('body'));
  const restartExportEntryLabel = await page.getByTestId('moving-mobile-export-actions').getByRole('button').innerText();
  const restartGate = scanPrototypeRouteGuardrails({
    primaryLines: restartBodyLines,
    exportEntryLabels: [restartExportEntryLabel],
  });
  expect(restartGate.rawRouteSlugHits).toEqual([]);
  expect(restartGate.englishWeekdayHits).toEqual([]);
  expect(restartGate.englishUiVerbHits).toEqual([]);
  expect(restartGate.englishMonthTimeHits).toEqual([]);
  expect(restartGate.mixedExportLanguageHits).toEqual([]);
  expect(restartGate.duplicateExportEntryHits).toEqual([]);
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toHaveCount(0);
});
