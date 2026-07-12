import fs from 'node:fs';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { RUNTIME_ARCHIVED_FLOW_SLUGS } from '../../lib/flow/runtime-content-policy';
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
  await lookup.getByLabel('URL 또는 메모').fill(url);
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
  await expect(result.getByLabel('학습 시작일')).toBeVisible();
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);

  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await expect(result).not.toContainText('Markdown');
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);
});

test('outdated schedule source URLs stop at official-source review without save or draft bypass', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_TAX_ADMIN_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await openFlowFinding(page);
  const cases = [
    {
      url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=2&csmSeq=1138&popMenu=ov',
      routeHref: '/flow-maps/baby-health-schedule',
    },
    {
      url: 'https://khms.or.kr/healthy_life/prevention/vaccination_child',
      routeHref: '/flow-maps/curated-child-vaccination-schedule',
    },
    {
      url: 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=6489&nttSn=1330438',
      routeHref: '/flow-maps/year-end-tax-submit',
    },
    {
      url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7706&mi=6646',
      routeHref: '/flow-maps/year-end-tax-submit',
    },
  ];

  for (const flowCase of cases) {
    await lookupUrl(page, flowCase.url);
    const result = page.getByTestId('flow-url-lookup-result');
    await expect(result).toContainText('최신 공식 내용 확인이 필요해요');
    await expect(result).toContainText('새 저장 중지');
    await expect(result.getByRole('link', { name: '최신 내용 확인' })).toHaveAttribute('href', flowCase.routeHref);
    await expect(result.getByTestId('flow-url-start-panel')).toHaveCount(0);
    await expect(result.getByTestId('flow-url-supply-request')).toHaveCount(0);
    await expect(result).not.toContainText('Markdown');
    await expectCleanUrlFirstUserSurface(result);
    if (evidenceDir && flowCase.url.includes('cntntsView.do')) {
      await page.screenshot({ path: `${evidenceDir}/05-tax-url-first-blocked-mobile.png`, fullPage: true });
    }
  }
});

test('URL-first miss and saved-candidate states hide production-only wording from user surface', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/source-to-convert?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('바로 시작할 Flow를 찾지 못했어요');
  await expect(result).not.toContainText('이미 만든 준비가 있는지 먼저 찾아봤어요');
  await expect(result.getByTestId('flow-url-miss-draft-gate')).toBeVisible();
  await expect(result).toContainText('직접 손볼 초안 준비하기');
  await expect(result).toContainText('원하는 결과를 여러 할 일로 나눈 뒤 저장 전 살펴볼 수 있어요');
  await expect(result).not.toContainText(/아직 없음|저장 대기|초안 요청 가능|아직 실행 가능한 Flow 아님/);
  await expect(result).not.toContainText('AI 자동 생성 없이 먼저 찾아봤어요');
  await expect(result).not.toContainText(/AI가|자동 생성|바로 생성|생성 중/);
  await expectCleanUrlFirstUserSurface(result);

  await result.getByLabel('Flow 이름').fill('새로 보고 싶은 준비 체크리스트');
  await result.getByLabel('원하는 결과').fill('URL에서 따라 할 순서만 남겨두고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible();
  await expect(candidateList).toContainText('내 초안');
  await expect(candidateList).not.toContainText(/아직 실행 가능한 Flow 아님|저장 대기|초안 요청 가능/);
  await expect(candidateList).not.toContainText('내가 요청한 후보');
  const candidateCard = candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' });
  await expect(candidateCard).toBeVisible();
  await expectCleanUrlFirstUserSurface(candidateCard);

  await expect(candidateCard.getByTestId('flow-url-miss-draft-entry')).toBeVisible();
  await expect(candidateCard.getByTestId('flow-url-miss-draft-entry')).not.toContainText(/AI가|자동 생성|바로 생성|생성 중/);
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await expect(draftEditor).toBeVisible();
  await expect(draftEditor.getByTestId('flow-url-miss-draft-flow-title')).toBeVisible();
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(3);
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item').nth(0)).toHaveAttribute('data-draft-day-offset', '0');
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item').nth(2)).toHaveAttribute('data-draft-day-offset', '2');
  await expectCleanUrlFirstUserSurface(draftEditor);
  await expectNoHorizontalOverflow(page);
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 준비 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
  await expect(draftEditor).toContainText('7월 18일');
  await expect(draftEditor).toContainText('7월 20일');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();
  await expect(page).toHaveURL(/\/my/);
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.locator('body')).toContainText('주말 준비 초안');
  await expect(page.locator('body')).toContainText('준비 범위 정하기');

  await page.goto('/flows');
  await expect(page.getByTestId('flow-url-supply-candidate-list')).toBeVisible();
  const copiedCandidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' });
  await copiedCandidateCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(copiedCandidateCard.getByTestId('flow-url-supply-production-handoff')).toBeVisible();
  await expect(copiedCandidateCard).toContainText('내가 쓴 제목·메모');
  await expect(copiedCandidateCard).toContainText('마지막 확인');
  await expect(copiedCandidateCard).toContainText('초안을 직접 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요');
  await expect(copiedCandidateCard).not.toContainText('사용자 제목/메모');
  await expect(copiedCandidateCard).not.toContainText('마지막 다시 조회');
  await expectCleanUrlFirstUserSurface(copiedCandidateCard);

  await copiedCandidateCard.getByTestId('flow-url-supply-user-summary-copy').click();
  await expect(copiedCandidateCard).toContainText('초안 요청 정리본 복사됨');
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toContain('# 초안 요청 정리본');
  expect(copiedText).toContain('새로 보고 싶은 준비 체크리스트');
  expect(copiedText).toContain('URL에서 따라 할 순서만 남겨두고 싶음');
  expect(copiedText).toContain('초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.');
  expectCleanUserFacingOutput(copiedText);
});

test('URL-first miss draft lands in My Flow with editable anchor and item overlay', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/weekend-draft-source?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('주말 준비 초안 요청');
  await result.getByLabel('원하는 결과').fill('링크에서 따라 할 부분만 정리하고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: '주말 준비 초안 요청' });
  await expect(candidateCard.getByTestId('flow-url-miss-draft-entry')).toBeVisible();
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();

  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 준비 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(3);
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  const storedDraftBundle = await page.evaluate(() => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
      flow?: { slug?: string };
      items?: Array<{ title?: string; day_offset?: number }>;
    }>;
    return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-'));
  });
  expect(storedDraftBundle?.items).toHaveLength(3);
  expect(storedDraftBundle?.items?.map((item) => item.day_offset)).toEqual([0, 1, 2]);
  await page.getByTestId('my-flow-view-flow').click();
  const mobileDraftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
  await expect(mobileDraftFlow).toBeVisible();
  await expect(mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toBeVisible();

  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  const mobileSettings = mobileDraftFlow.getByTestId('my-flow-personal-copy-settings');
  await expect(mobileSettings).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-anchor-edit-entry')).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-draft-item-inclusion-settings')).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-draft-item-inclusion-settings').getByRole('checkbox')).toHaveCount(3);
  await expect(mobileSettings).toContainText('전체 일정 기준');
  await expect(mobileSettings).toContainText('해당 할 일만');
  await mobileSettings.getByTestId('my-flow-personal-copy-start-date-input').fill('2026-07-25');
  await mobileSettings.getByRole('button', { name: '저장' }).click();

  if ((await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await mobileDraftFlow.getByTestId('my-flow-mobile-structure-open').click();
  }
  await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  const mobileDetail = mobileDraftFlow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
  await expect(mobileDetail).toBeVisible();
  const readSummary = mobileDetail.getByTestId('my-flow-detail-read-summary');
  await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await mobileDetail.getByTestId('my-flow-detail-title-input').fill('내 일정에 맞춘 첫 단계');
  await mobileDetail.getByTestId('my-flow-detail-date-input').fill('2026-07-27');
  await mobileDetail.getByTestId('my-flow-detail-memo').fill('초안에서 직접 고친 사용자 메모');
  await mobileDetail.getByTestId('my-flow-detail-save-changes').click();

  const storedAfterItemEdit = await page.evaluate(() => ({
    itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
    dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
  }));
  expect(JSON.stringify(storedAfterItemEdit.itemDrafts)).toContain('내 일정에 맞춘 첫 단계');
  expect(JSON.stringify(storedAfterItemEdit.itemDrafts)).toContain('초안에서 직접 고친 사용자 메모');
  expect(Object.values(storedAfterItemEdit.dateOverrides)).toContain('2026-07-27');

  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  await mobileDraftFlow.getByTestId('my-flow-personal-copy-start-date-input').fill('2026-07-30');
  await mobileDraftFlow.getByRole('button', { name: '저장' }).click();
  const storedAfterAnchorEdit = await page.evaluate(() => ({
    savedRecord: Object.entries(window.localStorage)
      .filter(([key]) => key.startsWith('flow:saved:url-draft-'))
      .map(([, value]) => JSON.parse(String(value)))[0],
    dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
  }));
  expect(storedAfterAnchorEdit.savedRecord.anchor).toBe('2026-07-30');
  expect(Object.values(storedAfterAnchorEdit.dateOverrides)).toContain('2026-07-27');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const wideDraftFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]');
  await expect(wideDraftFlow).toBeVisible();
  await expect(wideDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toBeVisible();

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const overriddenEvent = page.locator('.fc-daygrid-day[data-date="2026-07-27"] .fc-event').first();
  await expect(overriddenEvent).toBeVisible();
  await overriddenEvent.click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  const calendarDetail = selectedDay.getByTestId('my-flow-item-detail');
  await expect(selectedDay).toContainText('내 일정에 맞춘 첫 단계');
  await expect(calendarDetail).not.toContainText('내 일정에 맞춘 첫 단계');
  const calendarReadSummary = calendarDetail.getByTestId('my-flow-detail-read-summary');
  await calendarReadSummary.locator('summary').click();
  await expect(calendarReadSummary).toContainText('초안에서 직접 고친 사용자 메모');

  const portableExport = calendarDetail.getByTestId('my-flow-detail-portable-export');
  const portableExportSummary = portableExport.locator('summary');
  if ((await portableExportSummary.count()) > 0) {
    await portableExportSummary.click();
  }
  await calendarDetail.getByTestId('my-flow-detail-copy-portable-text').click();
  const copiedDraftText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedDraftText).toContain('내 일정에 맞춘 첫 단계');
  expect(copiedDraftText).toContain('초안에서 직접 고친 사용자 메모');
  expect(copiedDraftText).not.toContain('source-backed');
  expect(copiedDraftText).not.toContain('handoff');
  expect(copiedDraftText).not.toContain('Canonical URL');
  expect(copiedDraftText).not.toContain('Step');
});

test('URL-first draft preserves input on storage failure and reuses the canonical saved draft', async ({ page }) => {
  const sourceUrl = 'https://example.com/draft-lifecycle-source?utm_source=review';
  const requestTitle = '중복 없이 이어갈 주말 준비';
  await openFlowFinding(page);
  await lookupUrl(page, sourceUrl);

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill(requestTitle);
  await result.getByLabel('원하는 결과').fill('준비물 확인, 일정 정리, 마지막 점검');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  let candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: requestTitle });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  let editor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await editor.getByTestId('flow-url-miss-draft-flow-title').fill('저장 실패를 확인할 주말 준비');
  await editor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { __flowmeOriginalStorageSetItem?: typeof original }).__flowmeOriginalStorageSetItem = original;
    Storage.prototype.setItem = function setItemWithDraftFailure(key: string, value: string) {
      if (key === 'flow_builder_mvp_bundles_v11') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });

  await editor.getByTestId('flow-url-miss-draft-save').click();
  const failureFeedback = candidateCard.getByTestId('flow-url-miss-draft-feedback');
  await expect(failureFeedback).toContainText('초안을 저장하지 못했습니다');
  await expect(failureFeedback).toContainText('입력한 내용은 그대로예요');
  await expect(editor).toBeVisible();
  await expect(editor.getByTestId('flow-url-miss-draft-flow-title')).toHaveValue('저장 실패를 확인할 주말 준비');
  await expect(editor.getByTestId('flow-url-miss-draft-anchor-date')).toHaveValue('2026-07-18');
  expect(await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{ flow?: { slug?: string } }>;
    return bundles.filter((bundle) => bundle.flow?.slug?.startsWith('url-draft-')).length;
  })).toBe(0);

  await page.evaluate(() => {
    const target = window as typeof window & { __flowmeOriginalStorageSetItem?: typeof Storage.prototype.setItem };
    if (target.__flowmeOriginalStorageSetItem) Storage.prototype.setItem = target.__flowmeOriginalStorageSetItem;
  });
  await editor.getByTestId('flow-url-miss-draft-save').click();
  await expect(page).toHaveURL(/\/my/);

  const firstDraftState = await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{ flow?: { slug?: string } }>;
    const drafts = bundles.filter((bundle) => bundle.flow?.slug?.startsWith('url-draft-'));
    return { count: drafts.length, slug: drafts[0]?.flow?.slug ?? '' };
  });
  expect(firstDraftState.count).toBe(1);

  await page.goto('/flows');
  candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: requestTitle });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  editor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await editor.getByTestId('flow-url-miss-draft-save').click();

  const duplicateFeedback = candidateCard.getByTestId('flow-url-miss-draft-feedback');
  await expect(duplicateFeedback).toContainText('이미 저장한 초안이 있어요');
  await expect(duplicateFeedback.getByRole('link', { name: 'My Flow에서 이어서 수정' })).toHaveAttribute('href', '/my');
  await expect(page).toHaveURL(/\/flows/);
  const secondDraftState = await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{ flow?: { slug?: string } }>;
    const drafts = bundles.filter((bundle) => bundle.flow?.slug?.startsWith('url-draft-'));
    return { count: drafts.length, slug: drafts[0]?.flow?.slug ?? '' };
  });
  expect(secondDraftState).toEqual(firstDraftState);
  await expectCleanUrlFirstUserSurface(candidateCard);
});

test('URL-first miss draft appears in Studio draft shelf and returns to My Flow edit room', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/studio-draft-source?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('스튜디오 초안 요청');
  await result.getByLabel('원하는 결과').fill('스튜디오에서 이어서 손볼 초안');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: '스튜디오 초안 요청' });
  await expect(candidateCard.getByTestId('flow-url-miss-draft-entry')).toBeVisible();
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();

  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('스튜디오에서 이어갈 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(3);
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await page.goto('/u/my-flow-studio');
  await expect(page.getByTestId('creator-profile-surface')).toBeVisible();
  await expect(page.getByTestId('creator-profile-draft-tab')).toBeVisible();
  await page.getByTestId('creator-profile-draft-tab').click();

  const draftCard = page.locator('[data-testid="creator-profile-content-card"][data-flow-origin="url-first-draft"]').filter({ hasText: '스튜디오에서 이어갈 초안' });
  await expect(draftCard).toBeVisible();
  await expect(draftCard).toHaveAttribute('data-flow-status', 'draft');
  await expect(draftCard.getByTestId('creator-profile-draft-edit-link')).toHaveAttribute('href', '/my');
  await expect(draftCard.getByTestId('creator-profile-draft-edit-link')).not.toContainText(/AI가|자동 생성|바로 생성|생성 중/);

  await draftCard.getByTestId('creator-profile-draft-edit-link').click();
  await expect(page).toHaveURL(/\/my/);
  await page.getByTestId('my-flow-view-flow').click();
  const mobileDraftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
  await expect(mobileDraftFlow).toBeVisible();
  await expect(mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toBeVisible();
});

test('URL-first resolved candidate cards hide legacy state-machine wording', async ({ page }) => {
  await openFlowFinding(page);
  await seedResolvedUrlFirstCandidate(page);

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
  await expect(candidateCard).toBeVisible();
  await expect(candidateCard).toContainText('Flow 준비됨');
  await expect(candidateCard).toContainText('바로 시작할 수 있는 Flow가 준비됐어요');
  await expect(candidateCard).not.toContainText('이제 실행 가능한 수학 후보');
  await expect(candidateCard).not.toContainText('후보가 기존 콘텐츠로 닫힌 상태');
  await expect(candidateCard).not.toContainText(/닫힌 상태|실행 가능한 .*후보/);
  await expectCleanUrlFirstUserSurface(candidateCard);

  await candidateCard.getByRole('button', { name: '원문·메모 보기' }).click();
  await expect(candidateCard.getByTestId('flow-url-supply-production-handoff')).toBeVisible();
  await expect(candidateCard).not.toContainText('이제 실행 가능한 수학 후보');
  await expect(candidateCard).not.toContainText('후보가 기존 콘텐츠로 닫힌 상태');
  await expectCleanUrlFirstUserSurface(candidateCard);
});

test('old review and stateful workspace routes stay out of indexing and public navigation', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const normalRoutes = [
    '/',
    '/flows',
    '/f/vehicle-inspection-prep',
    '/flow-maps/moving-d30',
    '/my',
    '/calendar',
  ];
  const oldOrInternalLinkSelector = [
    'a[href="/creators"]',
    'a[href="/content-flows"]',
    'a[href^="/f/channel-"]',
    ...RUNTIME_ARCHIVED_FLOW_SLUGS.map((slug) => `a[href="/f/${slug}"]`),
    'a[href^="/ia-compare"]',
    'a[href^="/restart/"]',
    'a[href^="/flow-maps/"][href$="/creator"]',
  ].join(', ');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of normalRoutes) {
      await page.goto(route);
      await expect(page.locator(oldOrInternalLinkSelector)).toHaveCount(0);
    }
    await page.goto('/');
    const secondaryMenu = page.getByTestId('platform-nav');
    await secondaryMenu.locator('summary').click();
    await expect(secondaryMenu.getByRole('link', { name: 'Flow 만들기' })).toBeVisible();
    await expect(secondaryMenu.getByRole('link', { name: '크리에이터 보기' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }

  const noindexRoutes = [
    '/my',
    '/calendar',
    '/flows/new',
    '/flows/not-saved/edit',
    '/flow-maps/moving-d30/creator',
    '/u/my-flow-studio',
    '/u/samsung-service',
    '/u/not-a-real-profile',
    '/creators',
    '/content-flows',
    '/ia-compare',
    '/ia-compare/b',
    '/restart/moving-d30',
    '/flow-lab',
  ];

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of noindexRoutes) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  }

  for (const route of [
    '/',
    '/flows',
    '/f/vehicle-inspection-prep',
    '/flow-maps/moving-d30',
    '/u/flow-curation-team',
  ]) {
    await page.goto(route);
    const robotsMeta = page.locator('meta[name="robots"]');
    const robots = (await robotsMeta.count()) > 0 ? await robotsMeta.getAttribute('content') : '';
    expect(robots ?? '').not.toMatch(/noindex/i);
  }
});

test('URL-first lab stays prototype-gated and absent from user navigation', async ({ page }) => {
  test.setTimeout(60_000);

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
      await expect(page.locator('a[href="/flow-lab"], a[href^="/flow-lab/"]')).toHaveCount(0);
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

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/u/flow-curation-team');
    await expect(page.getByTestId('creator-profile-surface')).toBeVisible();
    const publicCreatorRobots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(publicCreatorRobots ?? '').not.toMatch(/noindex/i);
    const allFilter = page.getByRole('button', { name: '모두 보기', exact: true });
    await expect(allFilter).toHaveClass(/border-blue-600/);
    const publicCards = page.getByTestId('creator-profile-content-card');
    const publicCardCount = await publicCards.count();
    expect(publicCardCount).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('heading', { name: '실제 콘텐츠로 바로 시작' })).toHaveCount(0);
    await expect(publicCards.first()).not.toContainText('미리보기');
    await expect(publicCards.first()).not.toContainText('베타 운영 중');
    await expect(page.locator('[data-testid="creator-profile-content-card"][data-public-indexable="false"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="creator-profile-content-card"][data-source-status="preview"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="creator-profile-content-card"][data-source-status="needs_review"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '샘플', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '초안', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('creator-profile-library-action')).toHaveText('Flow 찾기');
    await expect(page.getByTestId('creator-profile-library-action')).toHaveAttribute('href', '/flows');
    const moreContent = page.getByTestId('creator-profile-content-more');
    await expect(moreContent).toBeVisible();
    await moreContent.click();
    expect(await page.getByTestId('creator-profile-content-card').count()).toBeGreaterThan(publicCardCount);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: '원문 확인됨', exact: true }).click();
    expect(await page.getByTestId('creator-profile-content-card').count()).toBeLessThanOrEqual(publicCardCount);
    await expect(page.getByText('채널 콘텐츠')).toHaveCount(0);
    await expectCleanCreatorProfileSurface(page.locator('body'));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-lab/url-first-p0');
  await expect(page.getByTestId('url-first-p0-lab')).toBeVisible();
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('내부 실험 콘솔');
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('정상 사용자 메뉴에 연결하지 않는');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);

  await page.goto('/flow-lab');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  await expect(page.locator('a[href="/flow-lab/p22-observation"]')).toHaveCount(1);

  await page.goto('/flow-lab/p22-observation');
  const observationSetup = page.getByTestId('p22-observation-setup');
  await expect(observationSetup).toBeVisible();
  await expect(observationSetup).toContainText('내부 관찰 준비 도구');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  await observationSetup.getByTestId('p22-observation-prepare-version-review').click();
  await expect(page).toHaveURL('/my');
  await page.getByTestId('my-flow-view-flow').click();
  const updateReview = page.getByTestId('my-flow-map-update-review');
  await expect(updateReview).toBeVisible();
  await updateReview.getByTestId('my-flow-map-update-toggle').click();
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('내 수정과 겹침');
  await expect(updateReview.getByTestId('my-flow-map-update-comparison')).toContainText('새 할 일');
  await expect(updateReview.getByTestId('my-flow-map-update-apply')).toBeEnabled();
  await updateReview.getByTestId('my-flow-map-update-apply').click();
  await expect(page.getByTestId('my-flow-version-review')).toBeVisible();

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
