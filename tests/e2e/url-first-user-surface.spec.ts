import fs from 'node:fs';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { RUNTIME_ARCHIVED_FLOW_SLUGS } from '../../lib/flow/runtime-content-policy';
import {
  scanPrototypeRouteGuardrails,
  scanUserFacingOutputGuardrails,
  scanUserSurfaceGuardrails,
} from '../../lib/flow/user-surface-guardrails';
import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  getPersonalDraftEffectiveItems,
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
  openPersonalDraftListExport,
} from './helpers/my-flow-library';

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

async function openMyFlowView(page: Page) {
  const currentFlowView = page.getByTestId('my-flow-todo-experiment-view-flows');
  if (await currentFlowView.isVisible({ timeout: 5_000 }).catch(() => false)) {
    if ((await currentFlowView.getAttribute('aria-selected')) !== 'true') {
      await currentFlowView.click();
    }
    return;
  }
  const viewControl = page.getByTestId('my-flow-view-flow');
  if (await viewControl.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await viewControl.click();
    return;
  }

  // A saved draft can render its receipt between URL settlement and hydration.
  // Use the stable local-view URL instead of waiting on the replaced receipt frame.
  await page.goto('/my?view=flows');
}

function getPersonalDraftFlow(page: Page) {
  return page
    .locator(
      '[data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]:visible, [data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]:visible, [data-testid="my-flow-mobile-workspace"][data-flow-slug^="url-draft-"]:visible',
    )
    .first();
}

async function openPersonalDraftFlowIfCollapsed(flow: Locator) {
  const open = flow.getByTestId('my-flow-mobile-structure-open');
  if (await open.isVisible().catch(() => false)) await open.click();
  const planTab = flow.getByTestId('my-flow-workspace-tab-plan');
  if (await planTab.isVisible().catch(() => false)) await planTab.click();
  const planToggle = flow.getByTestId('my-flow-workspace-plan-toggle');
  if (
    await planToggle.isVisible().catch(() => false) &&
    (await planToggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await planToggle.click();
  }
}

async function getOpenedPersonalDraftFlow(page: Page) {
  await openMyFlowView(page);
  const visibleFlow = getPersonalDraftFlow(page);
  const flow = (await visibleFlow.isVisible().catch(() => false))
    ? visibleFlow
    : page.locator('[data-testid="my-flow-library-row"][data-flow-slug^="url-draft-"]').first();
  await expect(flow).toBeVisible();
  const slug = await flow.getAttribute('data-flow-slug');
  if (!slug) throw new Error('Personal draft Flow slug is missing');
  return openMyFlowLibraryFlow(page, slug);
}

async function setPersonalDraftStructureEditMode(flow: Locator, open: boolean) {
  await openMyFlowView(flow.page());
  await openPersonalDraftFlowIfCollapsed(flow);
  const toggle = flow.getByTestId('my-flow-batch-mode-toggle').first();
  await expect(toggle).toBeVisible();
  const active = (await toggle.getAttribute('aria-pressed')) === 'true';
  if (active !== open) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', open ? 'true' : 'false');
}

async function addPersonalDraftItem(flow: Locator, title: string) {
  await setPersonalDraftStructureEditMode(flow, true);
  await flow.getByTestId('personal-draft-add-entry').click();
  await flow.getByTestId('personal-draft-add-title').fill(title);
  await flow.getByTestId('personal-draft-add-title').press('Enter');
  await setPersonalDraftStructureEditMode(flow, false);
  return getPersonalDraftEffectiveItems(flow).filter({ hasText: title }).first();
}

async function openPersonalDraftEffectiveItem(item: Locator) {
  const effectiveItem = item.first();
  const compactButton = effectiveItem.getByTestId('my-flow-mobile-structure-step-row');
  if (await compactButton.count()) await compactButton.click();
  else await effectiveItem.getByRole('button', { name: /열기/ }).click();
}

async function enterPersonalDraftItemEditMode(detail: Locator) {
  await expect(detail).toBeVisible();
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    return;
  }

  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
}

async function removePersonalDraftItemInStructureMode(page: Page, flow: Locator, title: string) {
  await setPersonalDraftStructureEditMode(flow, true);
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  const row = outline.getByTestId('my-flow-batch-selectable-row').filter({ hasText: title });
  await row.getByTestId('my-flow-batch-item-checkbox').check();
  page.once('dialog', (dialog) => dialog.accept());
  await outline.getByTestId('my-flow-batch-remove-selected').click();
}

async function expandMyFlowAdvancedEditor(detail: Locator) {
  const toggle = detail.getByTestId('my-flow-editor-advanced-toggle');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function hideNextDevOverlay(page: Page) {
  await page.locator('nextjs-portal').evaluateAll((elements) => {
    elements.forEach((element) => element.remove());
  });
}

async function hidePlatformChromeForEvidence(page: Page) {
  await page
    .locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]')
    .evaluateAll((elements) => {
      elements.forEach((element) => {
        (element as HTMLElement).style.visibility = 'hidden';
      });
    });
}

async function restorePlatformChromeAfterEvidence(page: Page) {
  await page
    .locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]')
    .evaluateAll((elements) => {
      elements.forEach((element) => {
        (element as HTMLElement).style.visibility = '';
      });
    });
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
  await result.getByTestId('flow-url-quick-start').locator('summary').click();
  const startDateInput = result.getByTestId('url-first-start-date-input');
  await expect(startDateInput).toBeVisible();
  await expect(startDateInput).toHaveAttribute('type', 'date');
  await expect(result.getByLabel('학습 시작일')).toBeVisible();
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);

  await result.getByRole('button', { name: '저장 전 편집' }).click();
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
    await expect(result.getByRole('link', { name: '최신 내용 확인' })).toHaveAttribute('href', /^\/(?:f|flow-maps)\//);
    await expect(result.getByTestId('flow-url-start-panel')).toHaveCount(0);
    await expect(result.getByTestId('flow-url-supply-request')).toHaveCount(0);
    await expect(result).not.toContainText('Markdown');
    await expectCleanUrlFirstUserSurface(result);
    if (evidenceDir && flowCase.url.includes('cntntsView.do')) {
      await page.screenshot({ path: `${evidenceDir}/05-tax-url-first-blocked-mobile.png`, fullPage: true });
    }
  }
});

test('broad worksheet category URL stops before an invented weekly schedule or draft bypass', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_LEARNING_MAINTENANCE_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await openFlowFinding(page);
  await lookupUrl(page, 'https://funmom.tistory.com/?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('실행할 자료를 더 골라야 해요');
  await expect(result).toContainText('개별 자료와 난이도를 더 확인해야 해요');
  await expect(result).toContainText('새 저장 중지');
  await expect(result.getByRole('link', { name: '원문 자료 보기' })).toHaveAttribute(
    'href',
    '/f/curated-funmom-weekly-print-picker',
  );
  await expect(result.getByTestId('flow-url-start-panel')).toHaveCount(0);
  await expect(result.getByTestId('flow-url-supply-request')).toHaveCount(0);
  await expect(result).not.toContainText('월: 색칠공부 한 장 출력');
  await expect(result).not.toContainText('공식 원문');
  await expect(result).not.toContainText('Markdown');
  await expectCleanUrlFirstUserSurface(result);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-funmom-url-first-blocked-mobile.png`, fullPage: true });
});

test('creator infant-feeding URL stops before an outdated start-age schedule or draft bypass', async ({ page }) => {
  const evidenceDir = process.env.FLOWME_INFANT_FEEDING_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  await openFlowFinding(page);
  await lookupUrl(page, 'https://blog.naver.com/01695258757/222768860919?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('아이 상태에 맞는 확인이 필요해요');
  await expect(result).toContainText('시작 시기와 메뉴를 아이 상태에 맞게 다시 확인');
  await expect(result).toContainText('참고 원문');
  await expect(result).not.toContainText('공식 원문');
  await expect(result).toContainText('새 저장 중지');
  await expect(result.getByRole('link', { name: '시작 전 확인' })).toHaveAttribute(
    'href',
    '/flow-maps/baby-food-map',
  );
  await expect(result.getByTestId('flow-url-start-panel')).toHaveCount(0);
  await expect(result.getByTestId('flow-url-supply-request')).toHaveCount(0);
  await expect(result).not.toContainText('Markdown');
  await expectCleanUrlFirstUserSurface(result);
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/03-baby-food-url-first-blocked-mobile.png`, fullPage: true });
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
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(1);
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item').nth(0)).toHaveAttribute('data-draft-day-offset', '0');
  await expectCleanUrlFirstUserSurface(draftEditor);
  await expectNoHorizontalOverflow(page);
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 준비 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
  await expect(draftEditor).toContainText('7월 18일');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();
  await expect(page).toHaveURL(/\/my/);
  if (await page.getByTestId('my-flow-post-save-panel').count()) {
    await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
    await page.getByTestId('my-flow-post-save-view-flow').click();
  }
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  await expect(page.locator('body')).toContainText('주말 준비 초안');
  await expect(page.locator('body')).toContainText('URL에서 따라 할 순서만 남겨두기');

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
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(1);
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  const storedDraftBundle = await page.evaluate(() => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
      flow?: { slug?: string };
      items?: Array<{ title?: string; day_offset?: number }>;
    }>;
    return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-'));
  });
  expect(storedDraftBundle?.items).toHaveLength(1);
  expect(storedDraftBundle?.items?.map((item) => item.day_offset)).toEqual([0]);
  await openMyFlowView(page);
  const mobileDraftFlow = await getOpenedPersonalDraftFlow(page);
  await expect(mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toBeVisible();

  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  const mobileSettings = mobileDraftFlow.getByTestId('my-flow-personal-copy-settings');
  await expect(mobileSettings).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-anchor-edit-entry')).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-draft-item-inclusion-settings')).toBeVisible();
  await expect(mobileSettings.getByTestId('my-flow-draft-item-inclusion-settings').getByRole('checkbox')).toHaveCount(1);
  await expect(mobileSettings).toContainText('전체 일정 기준');
  await expect(mobileSettings).toContainText('해당 할 일만');
  await mobileSettings.getByTestId('my-flow-personal-copy-start-date-input').fill('2026-07-25');
  await mobileSettings.getByRole('button', { name: '저장' }).click();

  if ((await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await openPersonalDraftFlowIfCollapsed(mobileDraftFlow);
  }
  await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  const mobileDetail = getOpenMyFlowItemDetail(page);
  await expect(mobileDetail).toBeVisible();
  await enterPersonalDraftItemEditMode(mobileDetail);
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
  await mobileDraftFlow
    .getByTestId('my-flow-personal-copy-settings')
    .getByRole('button', { name: '저장' })
    .click();
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
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  await expect(wideDraftFlow).toBeVisible();
  await expect(wideDraftFlow.getByTestId('my-flow-personal-copy-settings-open')).toBeVisible();

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  const overriddenEvent = page.locator('.fc-daygrid-day[data-date="2026-07-27"] .fc-event').first();
  await expect(overriddenEvent).toBeVisible();
  await overriddenEvent.click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay).toContainText('내 일정에 맞춘 첫 단계');
  const calendarRow = selectedDay
    .getByTestId('my-flow-execution-row-shell')
    .filter({ hasText: '내 일정에 맞춘 첫 단계' });
  await calendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  const calendarDetail = getOpenMyFlowItemDetail(page);
  const calendarReadSummary = calendarDetail.getByTestId('my-flow-detail-read-summary');
  await expect(calendarReadSummary).toContainText('초안에서 직접 고친 사용자 메모');

  const portableExport = calendarDetail.getByTestId('my-flow-detail-portable-export');
  if ((await portableExport.getAttribute('open')) === null) {
    await portableExport.locator(':scope > summary').click();
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

test('personal draft permanent delete removes its local definition and leaves no archived ghost', async ({ page }) => {
  test.setTimeout(120_000);
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/p31-personal-draft-delete');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('삭제 계약 확인 초안');
  await result.getByLabel('원하는 결과').fill('개인 초안 삭제 범위를 확인하고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidate = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '삭제 계약 확인 초안' });
  await candidate.getByTestId('flow-url-miss-draft-open').click();
  const editor = candidate.getByTestId('flow-url-miss-draft-editor');
  await editor.getByTestId('flow-url-miss-draft-flow-title').fill('삭제 계약 확인 초안');
  await editor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await openMyFlowView(page);
  const draftRow = getPersonalDraftFlow(page);
  await expect(draftRow).toBeVisible();
  const draftSlug = await draftRow.getAttribute('data-flow-slug');
  expect(draftSlug).toMatch(/^url-draft-/);

  const draftWorkspace = await openMyFlowLibraryFlow(page, draftSlug!, 'execute');
  const management = draftWorkspace.getByTestId('my-flow-workspace-management-menu');
  await management.locator('summary').click();
  await management.getByTestId('my-flow-archive-toggle').click();

  const openArchived = page.getByTestId('my-flow-open-archived');
  if (await openArchived.isVisible().catch(() => false)) {
    await openArchived.click();
  } else {
    await page.getByTestId('my-flow-list-filter-archived').click();
  }
  const archivedRow = page.locator(
    `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${draftSlug}"]`,
  );
  await expect(archivedRow).toBeVisible();
  const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
  await archivedMenu.locator('summary').click();
  await archivedMenu.getByTestId('my-flow-permanent-delete-open').click();

  const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
  await expect(dialog).toContainText('초안 원문과 항목 구성');
  await dialog.getByTestId('my-flow-permanent-delete-confirm').click();
  await page.reload();

  await expect(page.locator(`[data-flow-slug="${draftSlug}"]`)).toHaveCount(0);
  const residue = await page.evaluate((slug) => {
    const bundles = JSON.parse(
      window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]',
    ) as Array<{ flow?: { slug?: string } }>;
    return {
      bundleCount: bundles.filter((bundle) => bundle.flow?.slug === slug).length,
      matchingKeys: Object.keys(window.localStorage).filter((key) => key.includes(slug)),
      archived: JSON.parse(
        window.localStorage.getItem('flow:my-flow:lifecycle:v1') ||
          '{"archivedFlowSlugs":[]}',
      ).archivedFlowSlugs,
    };
  }, draftSlug);
  expect(residue.bundleCount).toBe(0);
  expect(residue.matchingKeys).toEqual([]);
  expect(residue.archived).not.toContain(draftSlug);
  await expectNoHorizontalOverflow(page);
});

test('personal draft structural items add, complete, tombstone, and undo without source-backed controls', async ({ page }) => {
  test.setTimeout(120_000);
  const evidenceDir = process.env.FLOWME_P23_01B_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-structural-draft?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('주말 집 정리 초안 요청');
  await result.getByLabel('원하는 결과').fill('정리 범위를 나누고 필요한 연락을 챙기고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: '주말 집 정리 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 집 정리 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await openMyFlowView(page);
  let draftFlow = await getOpenedPersonalDraftFlow(page);
  await expect(draftFlow.getByTestId('personal-draft-add-entry')).toHaveCount(0);
  await expect(draftFlow.getByTestId('personal-draft-reorder-controls')).toHaveCount(0);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  const addEntry = draftFlow.getByTestId('personal-draft-add-entry');
  await expect(addEntry).toBeVisible();
  await addEntry.focus();
  await expect(addEntry).toBeFocused();
  await page.keyboard.press('Enter');
  const addTitle = draftFlow.getByTestId('personal-draft-add-title');
  await addTitle.fill('관리실에 후속 전화하기');
  await expect(draftFlow.getByTestId('personal-draft-add-save')).toBeEnabled();
  await addTitle.press('Enter');
  await setPersonalDraftStructureEditMode(draftFlow, false);

  let addedItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 후속 전화하기' }).first();
  await expect(addedItem).toBeVisible();
  await expect(addedItem).toHaveAttribute('data-structural-ownership', 'user_created');
  const stableItemId = await addedItem.getAttribute('data-item-id');
  expect(stableItemId).toMatch(/^personal-item-/);
  const initialOrder = await getPersonalDraftEffectiveItems(draftFlow).evaluateAll(
    (elements, itemId) => elements.findIndex((element) => element.getAttribute('data-item-id') === itemId),
    stableItemId,
  );
  expect(initialOrder).toBeGreaterThanOrEqual(0);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${evidenceDir}/01-personal-draft-item-added-mobile.png`, fullPage: true });
  }

  await page.reload();
  await openMyFlowView(page);
  draftFlow = await getOpenedPersonalDraftFlow(page);
  const showAll = draftFlow.getByTestId('my-flow-mobile-structure-show-all');
  if (await showAll.count()) await showAll.click();
  addedItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 후속 전화하기' }).first();
  await expect(addedItem).toHaveAttribute('data-item-id', stableItemId ?? '');

  await addedItem.getByTestId('my-flow-mobile-structure-step-row').click();
  const detail = getOpenMyFlowItemDetail(page);
  await expect(detail.getByTestId('personal-draft-delete-item')).toHaveCount(0);
  const detailOpen = addedItem.getByTestId('my-flow-mobile-structure-step-row');
  await closeOpenMyFlowItemDetail(page);
  await expect(detailOpen).toBeFocused();
  await expect(addedItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await detailOpen.click();
  const completionDetail = getOpenMyFlowItemDetail(page);
  const complete = completionDetail.getByRole('checkbox', { name: '관리실에 후속 전화하기 완료 체크' });
  await complete.focus();
  await expect(complete).toBeFocused();
  await page.keyboard.press('Space');
  const reopen = completionDetail.getByRole('checkbox', { name: '관리실에 후속 전화하기 다시 열기' });
  await expect(reopen).toBeChecked();
  await reopen.press('Space');
  await expect(complete).not.toBeChecked();
  await closeOpenMyFlowItemDetail(page);

  await removePersonalDraftItemInStructureMode(page, draftFlow, '관리실에 후속 전화하기');
  const undoNotice = draftFlow.getByTestId('my-flow-batch-undo');
  await expect(undoNotice).toBeVisible();
  await expect(addedItem).toHaveCount(0);
  const deletedOverlay = await page.evaluate((itemId) => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('flow:my-flow:structural-overlay:'));
    const overlay = key ? JSON.parse(localStorage.getItem(key) || 'null') : null;
    return {
      itemId: overlay?.itemTombstones?.[0]?.itemId,
      userItemStillStored: overlay?.userItems?.some((item: { itemId?: string }) => item.itemId === itemId),
    };
  }, stableItemId);
  expect(deletedOverlay).toEqual({ itemId: stableItemId, userItemStillStored: true });
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${evidenceDir}/02-personal-draft-delete-undo-mobile.png`, fullPage: true });
  }

  const undoButton = undoNotice.getByTestId('my-flow-batch-undo-action');
  await undoButton.focus();
  await expect(undoButton).toBeFocused();
  await page.keyboard.press('Space');
  await setPersonalDraftStructureEditMode(draftFlow, false);
  addedItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 후속 전화하기' }).first();
  await expect(addedItem).toHaveAttribute('data-item-id', stableItemId ?? '');
  const restoredOrder = await getPersonalDraftEffectiveItems(draftFlow).evaluateAll(
    (elements, itemId) => elements.findIndex((element) => element.getAttribute('data-item-id') === itemId),
    stableItemId,
  );
  expect(restoredOrder).toBe(initialOrder);

  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }
  addedItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 후속 전화하기' }).first();
  await removePersonalDraftItemInStructureMode(page, draftFlow, '관리실에 후속 전화하기');
  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  await expect(getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 후속 전화하기' })).toHaveCount(0);
  await expect(draftFlow.getByTestId('personal-draft-delete-undo')).toHaveCount(0);

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('flow:my-flow:structural-overlay:'));
    if (!key) return;
    const overlay = JSON.parse(localStorage.getItem(key) || 'null');
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const draft = bundles.find((bundle: { flow?: { slug?: string } }) =>
      bundle.flow?.slug?.startsWith('url-draft-'),
    );
    const deletedAt = '2026-07-13T12:00:00.000Z';
    overlay.itemTombstones = [
      ...(draft?.items ?? []).map((item: { id: string }) => ({
        itemId: item.id,
        ownership: 'source',
        deletedAt,
      })),
      ...(overlay.userItems ?? []).map((item: { itemId: string }) => ({
        itemId: item.itemId,
        ownership: 'user_created',
        deletedAt,
      })),
    ];
    localStorage.setItem(key, JSON.stringify(overlay));
  });
  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  await expect(draftFlow.getByTestId('personal-draft-empty-state')).toBeVisible();
  await expect(draftFlow.getByTestId('personal-draft-add-entry')).toBeVisible();

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('flow:my-flow:structural-overlay:'));
    if (!key) return;
    const overlay = JSON.parse(localStorage.getItem(key) || 'null');
    overlay.itemTombstones = [];
    localStorage.setItem(key, JSON.stringify(overlay));
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  await expect(wideDraftFlow.getByTestId('personal-draft-add-entry')).toHaveCount(0);
  await setPersonalDraftStructureEditMode(wideDraftFlow, true);
  await expect(wideDraftFlow.getByTestId('personal-draft-add-entry')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${evidenceDir}/03-personal-draft-structural-edit-wide.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-structural-controls')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-delete-item')).toHaveCount(0);
});

test('personal draft order and persistent recovery survive reload without changing source-backed flows', async ({ page }) => {
  test.setTimeout(180_000);
  const evidenceDir = process.env.FLOWME_P23_01C_EVIDENCE_DIR;
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-order-recovery-draft?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('주말 준비 순서 초안 요청');
  await result.getByLabel('원하는 결과').fill('준비 순서를 정한다. 빠진 할 일을 확인한다. 관리실에 연락한다.');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page.getByTestId('flow-url-supply-candidate-list').locator('article').filter({ hasText: '주말 준비 순서 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 준비 순서 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-08-01');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await openMyFlowView(page);
  let draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  let addedItem = await addPersonalDraftItem(draftFlow, '관리실에 최종 확인 전화하기');
  const userItemId = await addedItem.getAttribute('data-item-id');
  expect(userItemId).toMatch(/^personal-item-/);
  let editedSourceItem = getPersonalDraftEffectiveItems(draftFlow, 'source').first();
  const editedSourceItemId = await editedSourceItem.getAttribute('data-item-id');
  expect(editedSourceItemId).toBeTruthy();
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  let detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await detail.getByTestId('my-flow-detail-title-input').fill('관리실에 변경 내용 확인하기');
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-05');
  await detail.getByTestId('my-flow-detail-memo').fill('계약 변경 사항과 방문 시간을 함께 확인');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  editedSourceItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 변경 내용 확인하기' }).first();
  await expect(editedSourceItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await detail.getByRole('checkbox', { name: '관리실에 변경 내용 확인하기 완료 체크' }).click();
  await closeOpenMyFlowItemDetail(page);

  await setPersonalDraftStructureEditMode(draftFlow, true);
  let structureRows = draftFlow.getByTestId('my-flow-batch-selectable-row');
  const orderBeforeMove = await structureRows.evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  let structureAddedItem = structureRows.filter({ hasText: '관리실에 최종 확인 전화하기' });
  const moveUp = structureAddedItem.getByTestId('personal-draft-move-up');
  await moveUp.focus();
  await expect(moveUp).toBeFocused();
  await page.keyboard.press('Enter');
  const orderAfterEnterMove = await structureRows.evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  expect(orderAfterEnterMove.indexOf(userItemId)).toBe(orderBeforeMove.indexOf(userItemId) - 1);
  let structureSourceItem = structureRows.filter({ hasText: '관리실에 변경 내용 확인하기' });
  const moveSourceDown = structureSourceItem.getByTestId('personal-draft-move-down');
  await moveSourceDown.focus();
  await expect(moveSourceDown).toBeFocused();
  await page.keyboard.press('Space');
  const orderAfterMove = await structureRows.evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  expect(orderAfterMove).not.toEqual(orderAfterEnterMove);
  await expect(draftFlow.locator('[data-testid="personal-draft-move-up"]:visible')).toHaveCount(orderAfterMove.length);
  await expect(draftFlow.locator('[data-testid="personal-draft-move-down"]:visible')).toHaveCount(orderAfterMove.length);
  await expect(structureRows.first().getByTestId('personal-draft-move-up')).toBeDisabled();
  await expect(structureRows.last().getByTestId('personal-draft-move-down')).toBeDisabled();
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await draftFlow.screenshot({ path: `${evidenceDir}/01-personal-draft-reordered-mobile.png` });
  }

  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  structureRows = draftFlow.getByTestId('my-flow-batch-selectable-row');
  const persistedOrder = await structureRows.evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  expect(persistedOrder).toEqual(orderAfterMove);
  await setPersonalDraftStructureEditMode(draftFlow, false);
  editedSourceItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 변경 내용 확인하기' }).first();
  await expect(editedSourceItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  let completionDetail = getOpenMyFlowItemDetail(page);
  await expect(completionDetail.getByRole('checkbox', { name: '관리실에 변경 내용 확인하기 다시 열기' })).toBeChecked();
  await closeOpenMyFlowItemDetail(page);
  await removePersonalDraftItemInStructureMode(page, draftFlow, '관리실에 변경 내용 확인하기');

  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  await expect(draftFlow.getByTestId('personal-draft-delete-undo')).toHaveCount(0);
  const recovery = draftFlow.getByTestId('personal-draft-persistent-recovery');
  await expect(recovery.getByTestId('personal-draft-persistent-recovery-entry')).toBeVisible();
  await expect(recovery).not.toHaveAttribute('open', '');
  await recovery.getByTestId('personal-draft-persistent-recovery-entry').click();
  const recoverableItem = recovery.getByTestId('personal-draft-recoverable-item').filter({ hasText: '관리실에 변경 내용 확인하기' });
  await expect(recoverableItem).toHaveAttribute('data-item-id', editedSourceItemId ?? '');
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await draftFlow.screenshot({ path: `${evidenceDir}/02-personal-draft-persistent-recovery-mobile.png` });
  }

  const restoreButton = recoverableItem.getByTestId('personal-draft-restore-item');
  await restoreButton.focus();
  await expect(restoreButton).toBeFocused();
  await page.keyboard.press('Space');
  structureSourceItem = draftFlow.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '관리실에 변경 내용 확인하기' });
  await expect(structureSourceItem).toHaveAttribute('data-item-id', editedSourceItemId ?? '');
  const restoredOrder = await draftFlow.getByTestId('my-flow-batch-selectable-row').evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  expect(restoredOrder).toEqual(orderAfterMove);
  await setPersonalDraftStructureEditMode(draftFlow, false);
  editedSourceItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 변경 내용 확인하기' }).first();
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await expect(editedSourceItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(detail.getByRole('checkbox', { name: '관리실에 변경 내용 확인하기 다시 열기' })).toBeChecked();
  await enterPersonalDraftItemEditMode(detail);
  await expect(detail.getByTestId('my-flow-detail-title-input')).toHaveValue('관리실에 변경 내용 확인하기');
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-08-05');
  await expect(detail.getByTestId('my-flow-detail-memo')).toHaveValue('계약 변경 사항과 방문 시간을 함께 확인');
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await draftFlow.screenshot({ path: `${evidenceDir}/03-personal-draft-restored-mobile.png` });
  }

  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }
  addedItem = getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '관리실에 최종 확인 전화하기' }).first();
  await removePersonalDraftItemInStructureMode(page, draftFlow, '관리실에 최종 확인 전화하기');
  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  await setPersonalDraftStructureEditMode(draftFlow, true);
  const userRecovery = draftFlow.getByTestId('personal-draft-persistent-recovery');
  await userRecovery.getByTestId('personal-draft-persistent-recovery-entry').click();
  const recoverableUserItem = userRecovery.getByTestId('personal-draft-recoverable-item').filter({ hasText: '관리실에 최종 확인 전화하기' });
  await expect(recoverableUserItem).toHaveAttribute('data-item-id', userItemId ?? '');
  await recoverableUserItem.getByTestId('personal-draft-restore-item').click();
  structureAddedItem = draftFlow.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '관리실에 최종 확인 전화하기' });
  await expect(structureAddedItem).toHaveAttribute('data-item-id', userItemId ?? '');
  const restoredAfterUserRecovery = await draftFlow.getByTestId('my-flow-batch-selectable-row').evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-item-id')),
  );
  expect(restoredAfterUserRecovery).toEqual(restoredOrder);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  await setPersonalDraftStructureEditMode(wideDraftFlow, true);
  const wideOrderRows = wideDraftFlow.getByTestId('my-flow-batch-selectable-row');
  await expect(wideOrderRows).toHaveCount(restoredAfterUserRecovery.length);
  await expect(wideOrderRows.getByTestId('personal-draft-move-up')).toHaveCount(restoredAfterUserRecovery.length);
  await expect(wideOrderRows.getByTestId('personal-draft-move-down')).toHaveCount(restoredAfterUserRecovery.length);
  await expect(wideOrderRows.first().getByTestId('personal-draft-move-up')).toBeDisabled();
  await expect(wideOrderRows.last().getByTestId('personal-draft-move-down')).toBeDisabled();
  await expectNoHorizontalOverflow(page);
  if (evidenceDir) {
    await hideNextDevOverlay(page);
    await wideDraftFlow.screenshot({ path: `${evidenceDir}/04-personal-draft-order-wide.png` });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-reorder-controls')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-persistent-recovery-entry')).toHaveCount(0);
});

test('personal draft structural Calendar and ICS projections share effective items and stable identity', async ({ page }) => {
  test.setTimeout(240_000);
  const evidenceDir = process.env.FLOWME_P23_01D2_D3A_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  const downloadDir = evidenceDir ? `${evidenceDir}/downloads` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (downloadDir) fs.mkdirSync(downloadDir, { recursive: true });
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    if (
      location.url.endsWith('/favicon.ico') &&
      message.text().includes('404')
    ) {
      return;
    }
    consoleErrors.push(
      [message.text(), location.url].filter(Boolean).join(' @ '),
    );
  });

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-calendar-ics-draft?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('여행 출발 준비 초안 요청');
  await result.getByLabel('원하는 결과').fill('항공권을 확인한다. 숙소 예약을 확인한다. 짐 목록을 정리한다.');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '여행 출발 준비 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('여행 출발 준비 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-08-05');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await openMyFlowView(page);
  let draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }

  const sourceItems = getPersonalDraftEffectiveItems(draftFlow, 'source');
  const sourceItemIds = await sourceItems.evaluateAll((elements) => Array.from(new Set(
    elements
      .map((element) => element.getAttribute('data-item-id'))
      .filter((value): value is string => Boolean(value)),
  )));
  expect(sourceItemIds.length).toBeGreaterThanOrEqual(3);
  const scheduledSourceId = sourceItemIds[0]!;
  const excludedSourceId = sourceItemIds[1]!;
  const tombstonedSourceId = sourceItemIds[2]!;

  let scheduledSourceItem = sourceItems.first();
  await scheduledSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  let detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await detail.getByTestId('my-flow-detail-title-input').fill('여권과 예약 정보 최종 확인');
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-05');
  await detail.getByTestId('my-flow-detail-memo').fill('예약 번호와 여권 만료일을 함께 확인');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);

  for (const title of ['교통편 앱 오프라인 저장', '날짜 없이 챙길 준비물']) {
    await addPersonalDraftItem(draftFlow, title);
  }
  const scheduledUserItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '교통편 앱 오프라인 저장' })
    .first();
  const unscheduledUserItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '날짜 없이 챙길 준비물' })
    .first();
  const scheduledUserId = await scheduledUserItem.getAttribute('data-item-id');
  const unscheduledUserId = await unscheduledUserItem.getAttribute('data-item-id');
  expect(scheduledUserId).toMatch(/^personal-item-/);
  expect(unscheduledUserId).toMatch(/^personal-item-/);

  await scheduledUserItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await expect(detail.getByTestId('personal-draft-date-mode-control')).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveCount(0);
  await detail.getByTestId('personal-draft-date-mode-fixed').click();
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-05');
  await detail.getByTestId('my-flow-detail-memo').fill('탑승권과 지도를 오프라인에서도 열 수 있게 저장');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);

  await unscheduledUserItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await expect(detail.getByTestId('personal-draft-date-mode-control')).toBeVisible();
  await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveCount(0);
  await detail.getByRole('button', { name: '수정 취소' }).click();
  await closeOpenMyFlowItemDetail(page);

  await page.evaluate(
    ({ scheduledUserId, unscheduledUserId, scheduledSourceId, excludedSourceId, tombstonedSourceId }) => {
      const key = Object.keys(localStorage).find((entry) =>
        entry.startsWith('flow:my-flow:structural-overlay:'),
      );
      if (!key) throw new Error('Missing personal structural overlay');
      const overlay = JSON.parse(localStorage.getItem(key) || 'null');
      overlay.selection = {
        mode: 'all_except_excluded',
        includedItemIds: [],
        excludedItemIds: [excludedSourceId],
      };
      overlay.itemTombstones = [
        { itemId: tombstonedSourceId, ownership: 'source', deletedAt: '2026-07-13T18:00:00.000Z' },
      ];
      overlay.orderOverride = [
        scheduledSourceId,
        scheduledUserId,
        unscheduledUserId,
        excludedSourceId,
        tombstonedSourceId,
      ];
      overlay.updatedAt = '2026-07-13T18:00:00.000Z';
      localStorage.setItem(key, JSON.stringify(overlay));
    },
    {
      scheduledUserId,
      unscheduledUserId,
      scheduledSourceId,
      excludedSourceId,
      tombstonedSourceId,
    },
  );

  await page.reload();
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }
  await setPersonalDraftStructureEditMode(draftFlow, true);
  let scheduledUserAfterFixture = draftFlow
    .getByTestId('my-flow-batch-selectable-row')
    .filter({ hasText: '교통편 앱 오프라인 저장' });
  await scheduledUserAfterFixture.getByTestId('personal-draft-move-up').click();
  const orderAfterMove = await draftFlow
    .getByTestId('my-flow-batch-selectable-row')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-item-id')));
  expect(orderAfterMove.indexOf(scheduledUserId)).toBeLessThan(
    orderAfterMove.indexOf(scheduledSourceId),
  );

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  let selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay).toContainText('교통편 앱 오프라인 저장');
  await expect(selectedDay).toContainText('여권과 예약 정보 최종 확인');
  await expect(selectedDay).not.toContainText('날짜 없이 챙길 준비물');
  const selectedRows = selectedDay.locator(
    '[data-testid="my-flow-execution-row-shell"]',
  );
  await expect(selectedRows).toHaveCount(2);
  await expect(selectedRows.nth(0)).toHaveAttribute('data-item-id', scheduledUserId ?? '');
  await expect(selectedRows.nth(1)).toHaveAttribute('data-item-id', scheduledSourceId);
  await expect(
    page.locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${tombstonedSourceId}"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${excludedSourceId}"]`),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  let userCalendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${scheduledUserId}"]`,
  );
  await expect(userCalendarRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await userCalendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  const complete = detail.getByTestId('my-flow-task-complete-control');
  await expect(complete).toHaveAttribute('aria-label', /교통편 앱 오프라인 저장.*완료 체크$/);
  await complete.check();
  const reopen = detail.getByTestId('my-flow-task-complete-control');
  await expect(reopen).toHaveAttribute('aria-label', /교통편 앱 오프라인 저장.*다시 열기$/);
  await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
  await reopen.uncheck();
  const portableExport = detail.getByTestId('my-flow-detail-portable-export');
  if ((await portableExport.getAttribute('open')) === null) {
    await portableExport.locator(':scope > summary').click();
  }
  const firstDownloadPromise = page.waitForEvent('download');
  await detail.getByTestId('my-flow-detail-download-ics').click();
  const firstDownload = await firstDownloadPromise;
  if (downloadDir) {
    await firstDownload.saveAs(`${downloadDir}/personal-draft-user-item-before-reorder.ics`);
  }
  const firstDownloadPath = await firstDownload.path();
  expect(firstDownloadPath).toBeTruthy();
  const firstIcs = fs.readFileSync(firstDownloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect(firstIcs).toContain('SUMMARY:교통편 앱 오프라인 저장');
  expect(firstIcs).toContain('DTSTART;VALUE=DATE:20260805');
  expect(firstIcs).toContain('탑승권과 지도를 오프라인에서도 열 수 있게 저장');
  expect((firstIcs.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
  const firstUid = firstIcs.match(/^UID:(.+)$/m)?.[1];
  expect(firstUid).toBeTruthy();
  const visibleFirstIcs = firstIcs
    .split(/\r?\n/u)
    .filter((line) => !line.startsWith('PRODID:') && !line.startsWith('UID:'))
    .join('\n');
  const icsGuardrail = scanUserFacingOutputGuardrails({
    text: visibleFirstIcs,
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(icsGuardrail.internalCopyHits).toEqual([]);
  expect(icsGuardrail.sourceSlugHits).toEqual([]);
  expect(icsGuardrail.structuralDisplayHits).toEqual([]);
  expect(icsGuardrail.trailingFlowSuffixHits).toEqual([]);
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await page.screenshot({
      path: `${screenshotDir}/01-personal-draft-calendar-mobile.png`,
      fullPage: true,
    });
  }

  await page.goto('/my');
  await openMyFlowView(page);
  draftFlow = getPersonalDraftFlow(page);
  await openPersonalDraftFlowIfCollapsed(draftFlow);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }
  await setPersonalDraftStructureEditMode(draftFlow, true);
  scheduledUserAfterFixture = draftFlow
    .getByTestId('my-flow-batch-selectable-row')
    .filter({ hasText: '교통편 앱 오프라인 저장' });
  await scheduledUserAfterFixture.getByTestId('personal-draft-move-down').click();

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  const reorderedRows = selectedDay.locator(
    '[data-testid="my-flow-execution-row-shell"]',
  );
  await expect(reorderedRows.nth(0)).toHaveAttribute('data-item-id', scheduledSourceId);
  await expect(reorderedRows.nth(1)).toHaveAttribute('data-item-id', scheduledUserId ?? '');
  userCalendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${scheduledUserId}"]`,
  );
  await userCalendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  detail = getOpenMyFlowItemDetail(page);
  const reorderedPortableExport = detail.getByTestId('my-flow-detail-portable-export');
  if ((await reorderedPortableExport.getAttribute('open')) === null) {
    await reorderedPortableExport.locator(':scope > summary').click();
  }
  const secondDownloadPromise = page.waitForEvent('download');
  await detail.getByTestId('my-flow-detail-download-ics').click();
  const secondDownload = await secondDownloadPromise;
  if (downloadDir) {
    await secondDownload.saveAs(`${downloadDir}/personal-draft-user-item-after-reorder.ics`);
  }
  const secondDownloadPath = await secondDownload.path();
  expect(secondDownloadPath).toBeTruthy();
  const secondIcs = fs.readFileSync(secondDownloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect(secondIcs.match(/^UID:(.+)$/m)?.[1]).toBe(firstUid);
  await closeOpenMyFlowItemDetail(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expect(
    page
      .getByTestId('my-flow-calendar-selected-day')
      .locator('[data-testid="my-flow-execution-row-shell"]'),
  ).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({
      path: `${screenshotDir}/02-personal-draft-calendar-wide.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');

  const sourceCalendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${scheduledSourceId}"]`,
  );
  await sourceCalendarRow
    .getByRole('button', { name: /Flow에서 열기/ })
    .click();
  detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await detail.getByTestId('my-flow-detail-date-input').fill('');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(
    selectedDay.locator(
      `[data-testid="my-flow-execution-row-shell"][data-item-id="${scheduledSourceId}"]`,
    ),
  ).toHaveCount(0);
  await expect(
    selectedDay.locator(
      `[data-testid="my-flow-execution-row-shell"][data-item-id="${scheduledUserId}"]`,
    ),
  ).toBeVisible();

  await page.evaluate((tombstonedSourceId) => {
    const key = Object.keys(localStorage).find((entry) =>
      entry.startsWith('flow:my-flow:structural-overlay:'),
    );
    if (!key) throw new Error('Missing personal structural overlay');
    const overlay = JSON.parse(localStorage.getItem(key) || 'null');
    overlay.itemTombstones = overlay.itemTombstones.filter(
      (entry: { itemId?: string }) => entry.itemId !== tombstonedSourceId,
    );
    localStorage.setItem(key, JSON.stringify(overlay));
  }, tombstonedSourceId);
  await page.reload();
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-07"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expect(
    page.locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${tombstonedSourceId}"]`),
  ).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-05"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar?demo=source-backed');
  await expect(page.getByTestId('my-flow-calendar-card')).toBeVisible();
  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-structural-controls')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-reorder-controls')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('personal draft structural list exports share effective items across checklist, sheet, and memo', async ({ page }) => {
  test.setTimeout(240_000);
  const evidenceDir = process.env.FLOWME_P23_01D3B_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  const downloadDir = evidenceDir ? `${evidenceDir}/downloads` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (downloadDir) fs.mkdirSync(downloadDir, { recursive: true });

  const copyListExport = async (
    flow: Locator,
    destination: 'memo' | 'checklist' | 'sheet',
  ) => {
    const panel = await openPersonalDraftListExport(flow);
    await page.evaluate(() => navigator.clipboard.writeText(''));
    const action = panel.getByTestId(`personal-draft-copy-${destination}`);
    if (!(await action.isVisible().catch(() => false))) {
      const moreFormats = panel.getByTestId('my-flow-export-more-formats');
      if ((await moreFormats.getAttribute('open')) === null) await moreFormats.locator('summary').click();
    }
    await action.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe('');
    return page.evaluate(() => navigator.clipboard.readText());
  };

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-list-export-draft?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('여행 준비 목록 초안 요청');
  await result.getByLabel('원하는 결과').fill('항공권을 확인한다. 숙소 예약을 확인한다. 짐 목록을 정리한다.');
  await result.getByRole('button', { name: '초안 준비하기' }).click();

  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '여행 준비 목록 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('여행 준비 목록');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-08-05');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  await openMyFlowView(page);
  let draftFlow = await getOpenedPersonalDraftFlow(page);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }

  let sourceItems = getPersonalDraftEffectiveItems(draftFlow, 'source');
  const sourceItemIds = await sourceItems.evaluateAll((elements) => Array.from(new Set(
    elements
      .map((element) => element.getAttribute('data-item-id'))
      .filter((value): value is string => Boolean(value)),
  )));
  expect(sourceItemIds.length).toBeGreaterThanOrEqual(3);
  const editedSourceId = sourceItemIds[0]!;
  const excludedSourceId = sourceItemIds[1]!;
  const tombstonedSourceId = sourceItemIds[2]!;
  const sourceTitles = await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const draft = bundles.find((bundle: { flow?: { slug?: string } }) =>
      bundle.flow?.slug?.startsWith('url-draft-'),
    );
    return Object.fromEntries(
      (draft?.items ?? []).map((item: { id: string; title: string }) => [item.id, item.title]),
    ) as Record<string, string>;
  });
  expect(sourceTitles[excludedSourceId]).toBeTruthy();
  expect(sourceTitles[tombstonedSourceId]).toBeTruthy();

  let editedSourceItem = sourceItems.first();
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  let detail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(detail);
  await detail.getByTestId('my-flow-detail-title-input').fill('여권과 예약 정보 최종 확인');
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-05');
  await detail.getByTestId('my-flow-detail-memo').fill('예약 번호와 여권 만료일을 함께 확인');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);
  editedSourceItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '여권과 예약 정보 최종 확인' })
    .first();
  await expect(editedSourceItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await detail.getByRole('checkbox', { name: '여권과 예약 정보 최종 확인 완료 체크' }).click();
  await closeOpenMyFlowItemDetail(page);

  const userItem = await addPersonalDraftItem(draftFlow, '날짜 없이 챙길 준비물');
  const userItemId = await userItem.getAttribute('data-item-id');
  expect(userItemId).toMatch(/^personal-item-/);

  await page.evaluate(
    ({ editedSourceId, excludedSourceId, tombstonedSourceId, userItemId }) => {
      const key = Object.keys(localStorage).find((entry) =>
        entry.startsWith('flow:my-flow:structural-overlay:'),
      );
      if (!key) throw new Error('Missing personal structural overlay');
      const overlay = JSON.parse(localStorage.getItem(key) || 'null');
      overlay.selection = {
        mode: 'all_except_excluded',
        includedItemIds: [],
        excludedItemIds: [excludedSourceId],
      };
      overlay.itemTombstones = [
        { itemId: tombstonedSourceId, ownership: 'source', deletedAt: '2026-07-13T20:00:00.000Z' },
      ];
      overlay.orderOverride = [
        editedSourceId,
        userItemId,
        excludedSourceId,
        tombstonedSourceId,
      ];
      overlay.updatedAt = '2026-07-13T20:00:00.000Z';
      localStorage.setItem(key, JSON.stringify(overlay));
    },
    { editedSourceId, excludedSourceId, tombstonedSourceId, userItemId },
  );

  await page.reload();
  await openMyFlowView(page);
  draftFlow = await getOpenedPersonalDraftFlow(page);
  if (await draftFlow.getByTestId('my-flow-mobile-structure-show-all').count()) {
    await draftFlow.getByTestId('my-flow-mobile-structure-show-all').click();
  }
  await setPersonalDraftStructureEditMode(draftFlow, true);
  let persistedUserItem = draftFlow
    .getByTestId('my-flow-batch-selectable-row')
    .filter({ hasText: '날짜 없이 챙길 준비물' });
  await persistedUserItem.getByTestId('personal-draft-move-up').click();
  await setPersonalDraftStructureEditMode(draftFlow, false);

  const visibleTitles = await getPersonalDraftEffectiveItems(draftFlow).evaluateAll(
    (elements) => Array.from(new Map(elements.map((element) => [
      element.getAttribute('data-item-id'),
      element,
    ])).values()).map((element) => {
      const button = element.querySelector<HTMLElement>('[data-testid="my-flow-mobile-structure-step-row"]');
      const lines = (button?.innerText ?? '')
        .split(/\n+/u)
        .map((line) => line.replace(/\s+/gu, ' ').trim())
        .filter(Boolean);
      return lines.find((line) => !/^단계 \d+$/u.test(line) && !/^(열기|열림|완료)$/u.test(line)) ?? '';
    }),
  );
  expect(visibleTitles[0]).toBe('날짜 없이 챙길 준비물');
  expect(visibleTitles).toContain('여권과 예약 정보 최종 확인');

  const checklistDone = await copyListExport(draftFlow, 'checklist');
  const sheetDone = await copyListExport(draftFlow, 'sheet');
  const memoDone = await copyListExport(draftFlow, 'memo');
  const combinedDone = [checklistDone, sheetDone, memoDone].join('\n');

  expect(checklistDone).toContain('- [ ] 날짜 없이 챙길 준비물');
  expect(checklistDone).toContain('- [x] 여권과 예약 정보 최종 확인');
  expect(checklistDone.indexOf('날짜 없이 챙길 준비물')).toBeLessThan(
    checklistDone.indexOf('여권과 예약 정보 최종 확인'),
  );
  expect(memoDone).toContain('예약 번호와 여권 만료일을 함께 확인');
  expect(memoDone).toContain('일정: 2026-08-05');
  expect(combinedDone).not.toContain(sourceTitles[excludedSourceId]);
  expect(combinedDone).not.toContain(sourceTitles[tombstonedSourceId]);
  expect(combinedDone).not.toMatch(/\bStep\b|\bItem\b|Markdown|sourceTrace|source-backed/iu);

  const sheetLines = sheetDone.trimEnd().split(/\r?\n/u);
  const sheetRows = sheetLines.slice(1).map((line) => line.split('\t'));
  expect(sheetLines[0]).toBe('순서\t상태\t할 일\t날짜\t시간\t예상 시간\t메모\t원문');
  expect(sheetRows).toHaveLength(visibleTitles.length);
  expect(sheetRows.map((row) => row[2])).toEqual(visibleTitles);
  expect(new Set(sheetRows.map((row) => row[2])).size).toBe(sheetRows.length);
  const userSheetRow = sheetRows.find((row) => row[2] === '날짜 없이 챙길 준비물');
  expect(userSheetRow?.[3]).toBe('날짜 없음');
  expect(userSheetRow?.[7]).toBe('원문 없음');

  const outputGuardrail = scanUserFacingOutputGuardrails({
    text: combinedDone,
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(outputGuardrail.internalCopyHits).toEqual([]);
  expect(outputGuardrail.sourceSlugHits).toEqual([]);
  expect(outputGuardrail.structuralDisplayHits).toEqual([]);
  expect(outputGuardrail.trailingFlowSuffixHits).toEqual([]);

  if (downloadDir) {
    fs.writeFileSync(`${downloadDir}/personal-draft-checklist-completed.txt`, checklistDone, 'utf8');
    fs.writeFileSync(`${downloadDir}/personal-draft-sheet.tsv`, sheetDone, 'utf8');
    fs.writeFileSync(`${downloadDir}/personal-draft-memo.txt`, memoDone, 'utf8');
  }
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await draftFlow.screenshot({ path: `${screenshotDir}/01-personal-draft-list-export-mobile.png` });
  }

  editedSourceItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '여권과 예약 정보 최종 확인' })
    .first();
  await expect(editedSourceItem.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await editedSourceItem.getByTestId('my-flow-mobile-structure-step-row').click();
  detail = getOpenMyFlowItemDetail(page);
  await detail.getByRole('checkbox', { name: '여권과 예약 정보 최종 확인 다시 열기' }).click();
  await closeOpenMyFlowItemDetail(page);
  const checklistReopened = await copyListExport(draftFlow, 'checklist');
  expect(checklistReopened).toContain('- [ ] 여권과 예약 정보 최종 확인');
  expect(checklistReopened.match(/^- \[/gmu)).toHaveLength(
    checklistDone.match(/^- \[/gmu)?.length ?? 0,
  );
  if (downloadDir) {
    fs.writeFileSync(`${downloadDir}/personal-draft-checklist-reopened.txt`, checklistReopened, 'utf8');
  }

  await setPersonalDraftStructureEditMode(draftFlow, true);
  const recovery = draftFlow.getByTestId('personal-draft-persistent-recovery');
  await recovery.getByTestId('personal-draft-persistent-recovery-entry').click();
  const recoverableSource = recovery
    .getByTestId('personal-draft-recoverable-item')
    .filter({ hasText: sourceTitles[tombstonedSourceId] });
  await expect(recoverableSource).toHaveAttribute('data-item-id', tombstonedSourceId);
  await recoverableSource.getByTestId('personal-draft-restore-item').click();
  await setPersonalDraftStructureEditMode(draftFlow, false);
  const checklistRestored = await copyListExport(draftFlow, 'checklist');
  expect(checklistRestored).toContain(sourceTitles[tombstonedSourceId]);
  expect(checklistRestored.match(/^- \[/gmu)).toHaveLength(
    (checklistReopened.match(/^- \[/gmu)?.length ?? 0) + 1,
  );

  await page.reload();
  await openMyFlowView(page);
  draftFlow = await getOpenedPersonalDraftFlow(page);
  const checklistAfterReload = await copyListExport(draftFlow, 'checklist');
  expect(checklistAfterReload).toBe(checklistRestored);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  const wideExport = await openPersonalDraftListExport(wideDraftFlow);
  await expect(wideExport.getByTestId('personal-draft-copy-checklist')).toBeVisible();
  await expect(wideExport.getByTestId('personal-draft-copy-memo')).toBeVisible();
  const moreFormats = wideExport.getByTestId('my-flow-export-more-formats');
  await expect(moreFormats).toBeVisible();
  if ((await moreFormats.getAttribute('open')) === null) {
    await moreFormats.locator(':scope > summary').click();
  }
  await expect(wideExport.getByTestId('personal-draft-copy-sheet')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${screenshotDir}/02-personal-draft-list-export-wide.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-list-export')).toHaveCount(0);
});

test('personal draft user-created item date can be set, moved, and removed across every projection', async ({ page }) => {
  test.setTimeout(240_000);
  const evidenceDir = process.env.FLOWME_P23_02A_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  const downloadDir = evidenceDir ? `${evidenceDir}/downloads` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (downloadDir) fs.mkdirSync(downloadDir, { recursive: true });

  const openDraftFlow = async () => {
    await openMyFlowView(page);
    const flow = getPersonalDraftFlow(page);
    await openPersonalDraftFlowIfCollapsed(flow);
    const showAll = flow.getByTestId('my-flow-mobile-structure-show-all');
    if (await showAll.count()) await showAll.click();
    return flow;
  };
  const openUserItemEditor = async (flow: Locator, title: string) => {
    const item = getPersonalDraftEffectiveItems(flow).filter({ hasText: title }).first();
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterPersonalDraftItemEditMode(detail);
    return { item, detail };
  };
  const copyListExport = async (
    flow: Locator,
    destination: 'memo' | 'checklist' | 'sheet',
  ) => {
    const panel = await openPersonalDraftListExport(flow);
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await panel.getByTestId(`personal-draft-copy-${destination}`).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe('');
    return page.evaluate(() => navigator.clipboard.readText());
  };

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-optional-date-draft?utm_source=review');
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('주말 여행 준비 초안 요청');
  await result.getByLabel('원하는 결과').fill('날짜 없는 준비물을 필요할 때 일정에 넣고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();
  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '주말 여행 준비 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 여행 준비');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  let draftFlow = await openDraftFlow();
  let userItem = await addPersonalDraftItem(draftFlow, '여행자 보험 서류 챙기기');
  const stableItemId = await userItem.getAttribute('data-item-id');
  expect(stableItemId).toMatch(/^personal-item-/);

  let opened = await openUserItemEditor(draftFlow, '여행자 보험 서류 챙기기');
  await expect(opened.detail.getByTestId('personal-draft-date-mode-control')).toBeVisible();
  await expect(opened.detail.getByTestId('personal-draft-date-mode-none')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('my-flow-detail-date-input')).toHaveCount(0);
  await expect(opened.detail.getByLabel('시간')).toHaveCount(0);
  await expect(opened.detail.getByTestId('my-flow-detail-repeat-input')).toHaveCount(0);
  await opened.detail.getByTestId('personal-draft-date-mode-fixed').click();
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-12');
  await opened.detail.getByTestId('my-flow-detail-memo').fill('보험 증권 번호와 비상 연락처 확인');
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await opened.detail.screenshot({ path: `${screenshotDir}/01-personal-draft-date-edit-mobile.png` });
  }
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();

  const storedAfterSet = await page.evaluate((itemId) => {
    const structuralKey = Object.keys(localStorage).find((key) =>
      key.startsWith('flow:my-flow:structural-overlay:'),
    );
    const structural = structuralKey
      ? JSON.parse(localStorage.getItem(structuralKey) || 'null')
      : null;
    const userItem = structural?.userItems?.find(
      (item: { itemId?: string }) => item.itemId === itemId,
    );
    const itemDrafts = JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}');
    const dateOverrides = JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}');
    const legacyKey = Object.keys(itemDrafts).find((key) => key.includes(`::${itemId}::`));
    const legacyDateKey = Object.keys(dateOverrides).find((key) => key.includes(`::${itemId}::`));
    return {
      itemId: userItem?.itemId,
      schedule: userItem?.schedule,
      legacyDraftDate: legacyKey ? itemDrafts[legacyKey]?.date : undefined,
      legacyDateOverride: legacyDateKey ? dateOverrides[legacyDateKey] : undefined,
    };
  }, stableItemId);
  expect(storedAfterSet).toEqual({
    itemId: stableItemId,
    schedule: { mode: 'fixed_date', date: '2026-08-12' },
    legacyDraftDate: undefined,
    legacyDateOverride: undefined,
  });

  await page.reload();
  draftFlow = await openDraftFlow();
  userItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '여행자 보험 서류 챙기기' })
    .first();
  await expect(userItem).toHaveAttribute('data-item-id', stableItemId ?? '');
  await expect(userItem).toContainText('8월 12일');

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-12"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  let selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  let calendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`,
  );
  await expect(calendarRow).toContainText('여행자 보험 서류 챙기기');
  await expect(calendarRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await calendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  let calendarDetail = getOpenMyFlowItemDetail(page);
  const calendarCompletion = calendarDetail.getByTestId('my-flow-task-complete-control');
  await expect(calendarCompletion).toHaveAccessibleName('여행자 보험 서류 챙기기 완료 체크');
  await calendarCompletion.click();
  await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
  await expect(calendarCompletion).toHaveAccessibleName('여행자 보험 서류 챙기기 다시 열기');
  await calendarCompletion.click();
  const calendarReopenNotice = page.getByTestId('my-flow-completion-snackbar');
  await expect(calendarReopenNotice).toHaveAttribute('data-completion-result', 'reopened');
  await expect(calendarReopenNotice.getByTestId('my-flow-completion-open')).toBeFocused();
  await calendarCompletion.focus();
  await expect(calendarCompletion).toBeFocused();
  const portableExport = calendarDetail.getByTestId('my-flow-detail-portable-export');
  if ((await portableExport.getAttribute('open')) === null) {
    await portableExport.locator(':scope > summary').click();
  }
  const downloadPromise = page.waitForEvent('download');
  await calendarDetail.getByTestId('my-flow-detail-download-ics').click();
  const download = await downloadPromise;
  if (downloadDir) await download.saveAs(`${downloadDir}/personal-draft-user-item-date-set.ics`);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const ics = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect(ics).toContain('SUMMARY:여행자 보험 서류 챙기기');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260812');
  expect(ics).toContain('보험 증권 번호와 비상 연락처 확인');
  expect((ics.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
  const visibleIcs = ics
    .split(/\r?\n/u)
    .filter((line) => !line.startsWith('PRODID:') && !line.startsWith('UID:'))
    .join('\n');
  const icsGuardrail = scanUserFacingOutputGuardrails({
    text: visibleIcs,
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(icsGuardrail.internalCopyHits).toEqual([]);
  expect(icsGuardrail.sourceSlugHits).toEqual([]);
  expect(icsGuardrail.structuralDisplayHits).toEqual([]);
  expect(icsGuardrail.trailingFlowSuffixHits).toEqual([]);
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await openMyFlowCalendarSelectedDay(page, '2026-08-12');
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDir}/02-personal-draft-calendar-date-set-mobile.png`, fullPage: true });
  }

  await page.goto('/my');
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '여행자 보험 서류 챙기기');
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-14');
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await openMyFlowCalendarSelectedDay(page, '2026-08-12');
  await expect(
    page.locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`),
  ).toHaveCount(0);
  await openMyFlowCalendarSelectedDay(page, '2026-08-14');
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  calendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`,
  );
  await expect(calendarRow).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-14"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  calendarRow = selectedDay.locator(
    `[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`,
  );
  await calendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  calendarDetail = getOpenMyFlowItemDetail(page);
  await enterPersonalDraftItemEditMode(calendarDetail);
  await expect(calendarDetail.getByTestId('personal-draft-date-mode-control')).toBeVisible();
  await expect(calendarDetail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-08-14');
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${screenshotDir}/03-personal-draft-date-moved-wide.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my');
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '여행자 보험 서류 챙기기');
  await opened.detail.getByTestId('personal-draft-date-clear').click();
  await expect(opened.detail.getByTestId('my-flow-detail-date-input')).toHaveCount(0);
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  await page.reload();
  draftFlow = await openDraftFlow();
  userItem = getPersonalDraftEffectiveItems(draftFlow)
    .filter({ hasText: '여행자 보험 서류 챙기기' })
    .first();
  await expect(userItem).toHaveAttribute('data-item-id', stableItemId ?? '');
  await expect(userItem).not.toContainText('8월 14일');

  const checklist = await copyListExport(draftFlow, 'checklist');
  const sheet = await copyListExport(draftFlow, 'sheet');
  const memo = await copyListExport(draftFlow, 'memo');
  expect(checklist).toContain('- [ ] 여행자 보험 서류 챙기기');
  expect(sheet).toContain('여행자 보험 서류 챙기기\t날짜 없음');
  expect(memo).toContain('여행자 보험 서류 챙기기');
  expect(memo).toContain('보험 증권 번호와 비상 연락처 확인');
  const listGuardrail = scanUserFacingOutputGuardrails({
    text: [checklist, sheet, memo].join('\n'),
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(listGuardrail.internalCopyHits).toEqual([]);
  expect(listGuardrail.sourceSlugHits).toEqual([]);
  expect(listGuardrail.structuralDisplayHits).toEqual([]);
  expect(listGuardrail.trailingFlowSuffixHits).toEqual([]);
  if (downloadDir) {
    fs.writeFileSync(`${downloadDir}/personal-draft-date-removed-checklist.txt`, checklist, 'utf8');
    fs.writeFileSync(`${downloadDir}/personal-draft-date-removed-sheet.tsv`, sheet, 'utf8');
    fs.writeFileSync(`${downloadDir}/personal-draft-date-removed-memo.txt`, memo, 'utf8');
  }
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await draftFlow.screenshot({ path: `${screenshotDir}/04-personal-draft-date-removed-mobile.png` });
  }

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-14"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expect(
    page.locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${stableItemId}"]`),
  ).toHaveCount(0);

  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-date-mode-control')).toHaveCount(0);
});

test('personal draft user-created item time and all-day mode persist across Calendar and exports', async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const evidenceDir = process.env.FLOWME_P25_PROGRESSIVE_ADJUSTMENT_EVIDENCE_DIR
    ?? process.env.FLOWME_P23_02B2_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  const downloadDir = evidenceDir ? `${evidenceDir}/downloads` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (downloadDir) fs.mkdirSync(downloadDir, { recursive: true });

  const openDraftFlow = async () => {
    await openMyFlowView(page);
    const flow = getPersonalDraftFlow(page);
    await openPersonalDraftFlowIfCollapsed(flow);
    const showAll = flow.getByTestId('my-flow-mobile-structure-show-all');
    if (await showAll.count()) await showAll.click();
    return flow;
  };
  const addUserItem = async (flow: Locator, title: string) => {
    return addPersonalDraftItem(flow, title);
  };
  const openUserItemEditor = async (flow: Locator, title: string) => {
    const item = getPersonalDraftEffectiveItems(flow).filter({ hasText: title }).first();
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterPersonalDraftItemEditMode(detail);
    return { item, detail };
  };
  const copyListExport = async (
    flow: Locator,
    destination: 'memo' | 'checklist' | 'sheet',
  ) => {
    const panel = await openPersonalDraftListExport(flow);
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await panel.getByTestId(`personal-draft-copy-${destination}`).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe('');
    return page.evaluate(() => navigator.clipboard.readText());
  };
  const downloadCalendarFromRow = async (row: Locator, filename: string) => {
    const completionOpen = page.getByTestId('my-flow-completion-open');
    if (await completionOpen.isVisible().catch(() => false)) {
      await completionOpen.click();
    }
    await row.getByRole('button', { name: /Flow에서 열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    const portableExport = detail.getByTestId('my-flow-detail-portable-export');
    if ((await portableExport.getAttribute('open')) === null) {
      await portableExport.locator(':scope > summary').click();
    }
    const downloadPromise = page.waitForEvent('download');
    await detail.getByTestId('my-flow-detail-download-ics').click();
    const download = await downloadPromise;
    if (downloadDir) await download.saveAs(`${downloadDir}/${filename}`);
    const path = await download.path();
    expect(path).toBeTruthy();
    const content = fs.readFileSync(path!, 'utf8').replaceAll('\r\n ', '');
    await closeOpenMyFlowItemDetail(page);
    return content;
  };

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-time-draft?utm_source=review');
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('출발 시간 준비 초안 요청');
  await result.getByLabel('원하는 결과').fill('출발 전에 할 일을 시간 순서로 정리하고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();
  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '출발 시간 준비 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('출발 시간 준비');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  let draftFlow = await openDraftFlow();
  const timedItem = await addUserItem(draftFlow, '보험 서류 챙기기');
  const timedItemId = await timedItem.getAttribute('data-item-id');
  expect(timedItemId).toMatch(/^personal-item-/);
  let opened = await openUserItemEditor(draftFlow, '보험 서류 챙기기');
  await opened.detail.getByTestId('personal-draft-date-mode-fixed').click();
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-12');
  await expect(opened.detail.getByTestId('personal-draft-time-mode-control')).toHaveCount(0);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await opened.detail.screenshot({ path: `${screenshotDir}/04-personal-draft-basic-mobile.png` });
    await restorePlatformChromeAfterEvidence(page);
  }
  await expandMyFlowAdvancedEditor(opened.detail);
  await expect(opened.detail.getByTestId('personal-draft-time-mode-control')).toBeVisible();
  await opened.detail.getByTestId('personal-draft-time-mode-timed').click();
  await expect(opened.detail.getByTestId('my-flow-detail-save-changes')).toBeDisabled();
  await opened.detail.getByTestId('personal-draft-time-input').fill('09:30');
  await opened.detail.getByTestId('personal-draft-duration-input').fill('45');
  await expect(opened.detail.getByTestId('personal-draft-time-validation')).toHaveCount(0);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await opened.detail.screenshot({ path: `${screenshotDir}/01-personal-draft-time-edit-mobile.png` });
    await restorePlatformChromeAfterEvidence(page);
  }
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();

  const storedTimed = await page.evaluate((itemId) => {
    const structuralKey = Object.keys(localStorage).find((key) =>
      key.startsWith('flow:my-flow:structural-overlay:'),
    );
    const structural = structuralKey
      ? JSON.parse(localStorage.getItem(structuralKey) || 'null')
      : null;
    return structural?.userItems?.find(
      (item: { itemId?: string }) => item.itemId === itemId,
    );
  }, timedItemId);
  expect(storedTimed?.schedule).toMatchObject({
    mode: 'fixed_date',
    date: '2026-08-12',
    time: '09:30',
    durationMinutes: 45,
  });
  expect(typeof storedTimed?.schedule?.timeZone).toBe('string');
  expect(storedTimed.schedule.timeZone.length).toBeGreaterThan(0);

  await page.reload();
  draftFlow = await openDraftFlow();
  await expect(
    getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '보험 서류 챙기기' }).first(),
  ).toContainText('오전 9:30 · 45분');

  const allDayItem = await addUserItem(draftFlow, '여권 원본 챙기기');
  const allDayItemId = await allDayItem.getAttribute('data-item-id');
  opened = await openUserItemEditor(draftFlow, '여권 원본 챙기기');
  await opened.detail.getByTestId('personal-draft-date-mode-fixed').click();
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-12');
  await expandMyFlowAdvancedEditor(opened.detail);
  await expect(opened.detail.getByTestId('personal-draft-time-mode-all-day')).toHaveAttribute('aria-pressed', 'true');
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-12"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  let selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  let agendaRows = selectedDay.locator('[data-testid="my-flow-execution-row-shell"]');
  const visibleItemIds = await agendaRows.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-item-id')),
  );
  expect(visibleItemIds.indexOf(allDayItemId)).toBeLessThan(visibleItemIds.indexOf(timedItemId));
  let timedCalendarRow = agendaRows.filter({ hasText: '보험 서류 챙기기' });
  await expect(timedCalendarRow.getByTestId('personal-draft-timed-meta')).toHaveText('오전 9:30 · 45분');
  await expect(timedCalendarRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await timedCalendarRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  const timedDetail = getOpenMyFlowItemDetail(page);
  const timedCompletion = timedDetail.getByTestId('my-flow-task-complete-control');
  await expect(timedCompletion).toHaveAccessibleName('보험 서류 챙기기 완료 체크');
  await timedCompletion.click();
  await expect(page.getByTestId('my-flow-completion-undo')).toHaveCount(0);
  await expect(timedCompletion).toHaveAccessibleName('보험 서류 챙기기 다시 열기');
  await timedCompletion.click();
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-12"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  timedCalendarRow = selectedDay
    .locator('[data-testid="my-flow-execution-row-shell"]')
    .filter({ hasText: '보험 서류 챙기기' });
  const firstIcs = await downloadCalendarFromRow(
    timedCalendarRow,
    'personal-draft-timed-before-edit.ics',
  );
  const firstUid = firstIcs.match(/^UID:(.+)$/mu)?.[1];
  expect(firstIcs).toContain('DTSTART;TZID=');
  expect(firstIcs).toContain(':20260812T093000');
  expect(firstIcs).toContain(':20260812T101500');
  expect((firstIcs.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
  const firstIcsGuardrail = scanUserFacingOutputGuardrails({
    text: firstIcs.split(/\r?\n/u).filter((line) => !line.startsWith('UID:') && !line.startsWith('PRODID:')).join('\n'),
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(firstIcsGuardrail.internalCopyHits).toEqual([]);
  expect(firstIcsGuardrail.sourceSlugHits).toEqual([]);
  expect(firstIcsGuardrail.structuralDisplayHits).toEqual([]);
  expect(firstIcsGuardrail.trailingFlowSuffixHits).toEqual([]);
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await selectedDay.screenshot({ path: `${screenshotDir}/02-personal-draft-timed-calendar-mobile.png` });
    await restorePlatformChromeAfterEvidence(page);
  }

  await page.goto('/my');
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 챙기기');
  await expandMyFlowAdvancedEditor(opened.detail);
  await expect(opened.detail.getByTestId('personal-draft-time-input')).toHaveValue('09:30');
  await expect(opened.detail.getByTestId('personal-draft-duration-input')).toHaveValue('45');
  await opened.detail.getByTestId('personal-draft-time-input').fill('10:15');
  await opened.detail.getByTestId('personal-draft-duration-input').fill('60');
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);

  const checklist = await copyListExport(draftFlow, 'checklist');
  const sheet = await copyListExport(draftFlow, 'sheet');
  const memo = await copyListExport(draftFlow, 'memo');
  expect(checklist).toContain('일정: 2026-08-12 · 10:15 · 예상 1시간');
  expect(sheet).toContain('보험 서류 챙기기\t2026-08-12\t10:15\t1시간');
  expect(memo).toContain('일정: 2026-08-12 · 10:15 · 예상 1시간');
  const listGuardrail = scanUserFacingOutputGuardrails({
    text: [checklist, sheet, memo].join('\n'),
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });
  expect(listGuardrail.internalCopyHits).toEqual([]);
  expect(listGuardrail.sourceSlugHits).toEqual([]);
  expect(listGuardrail.structuralDisplayHits).toEqual([]);
  expect(listGuardrail.trailingFlowSuffixHits).toEqual([]);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-12"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  timedCalendarRow = selectedDay
    .locator('[data-testid="my-flow-execution-row-shell"]')
    .filter({ hasText: '보험 서류 챙기기' });
  await expect(timedCalendarRow).toHaveCount(1);
  await expect(timedCalendarRow.getByTestId('personal-draft-timed-meta')).toHaveText('오전 10:15 · 1시간');
  const secondIcs = await downloadCalendarFromRow(
    timedCalendarRow,
    'personal-draft-timed-after-edit.ics',
  );
  expect(secondIcs.match(/^UID:(.+)$/mu)?.[1]).toBe(firstUid);
  expect(secondIcs).toContain(':20260812T101500');
  expect(secondIcs).toContain(':20260812T111500');
  expect((secondIcs.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  await page
    .locator('.fc-daygrid-day[data-date="2026-08-12"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({ path: `${screenshotDir}/03-personal-draft-timed-calendar-wide.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my');
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 챙기기');
  await expandMyFlowAdvancedEditor(opened.detail);
  await opened.detail.getByTestId('personal-draft-time-mode-all-day').click();
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  const storedAllDay = await page.evaluate((itemId) => {
    const structuralKey = Object.keys(localStorage).find((key) =>
      key.startsWith('flow:my-flow:structural-overlay:'),
    );
    const structural = structuralKey
      ? JSON.parse(localStorage.getItem(structuralKey) || 'null')
      : null;
    return structural?.userItems?.find(
      (item: { itemId?: string }) => item.itemId === itemId,
    )?.schedule;
  }, timedItemId);
  expect(storedAllDay).toEqual({ mode: 'fixed_date', date: '2026-08-12' });
  await page.reload();
  draftFlow = await openDraftFlow();
  await expect(
    getPersonalDraftEffectiveItems(draftFlow).filter({ hasText: '보험 서류 챙기기' }).first(),
  ).not.toContainText('오전 10:15');
  await expectNoHorizontalOverflow(page);

  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-time-mode-control')).toHaveCount(0);
});

test('personal draft recurrence rules persist without changing item date or time identity', async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const evidenceDir = process.env.FLOWME_P23_02C2A_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

  const openDraftFlow = async () => {
    await openMyFlowView(page);
    const flow = getPersonalDraftFlow(page);
    await openPersonalDraftFlowIfCollapsed(flow);
    const showAll = flow.getByTestId('my-flow-mobile-structure-show-all');
    if (await showAll.count()) await showAll.click();
    return flow;
  };
  const addUserItem = async (flow: Locator, title: string) => {
    return addPersonalDraftItem(flow, title);
  };
  const openUserItemEditor = async (flow: Locator, title: string) => {
    const item = getPersonalDraftEffectiveItems(flow).filter({ hasText: title }).first();
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterPersonalDraftItemEditMode(detail);
    return { item, detail };
  };
  const readStoredUserItem = async (itemId: string) => page.evaluate((targetItemId) => {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('flow:my-flow:structural-overlay:')) continue;
      const record = JSON.parse(localStorage.getItem(key) || 'null');
      const item = record?.userItems?.find(
        (entry: { itemId?: string }) => entry.itemId === targetItemId,
      );
      if (item) return item;
    }
    return null;
  }, itemId);

  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/personal-recurrence-draft?utm_source=review');
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('주간 여행 준비 초안 요청');
  await result.getByLabel('원하는 결과').fill('여행 전 준비를 정해진 요일마다 확인하고 싶음');
  await result.getByRole('button', { name: '초안 준비하기' }).click();
  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '주간 여행 준비 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주간 여행 준비');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  let draftFlow = await openDraftFlow();
  const recurringItem = await addUserItem(draftFlow, '보험 서류 다시 확인하기');
  const recurringItemId = await recurringItem.getAttribute('data-item-id');
  expect(recurringItemId).toMatch(/^personal-item-/);

  let opened = await openUserItemEditor(draftFlow, '보험 서류 다시 확인하기');
  await opened.detail.getByTestId('personal-draft-date-mode-fixed').click();
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-17');
  await expandMyFlowAdvancedEditor(opened.detail);
  await opened.detail.getByTestId('personal-draft-time-mode-timed').click();
  await opened.detail.getByTestId('personal-draft-time-input').fill('09:30');
  await opened.detail.getByTestId('personal-draft-duration-input').fill('45');
  await expect(opened.detail.getByTestId('personal-draft-recurrence-control')).toBeVisible();
  await opened.detail.getByTestId('personal-draft-recurrence-weekly').click();
  await opened.detail.getByTestId('personal-draft-recurrence-interval').fill('2');
  await opened.detail.getByTestId('personal-draft-recurrence-weekday-WE').click();
  await opened.detail.getByTestId('personal-draft-recurrence-weekday-FR').click();
  await opened.detail.getByTestId('personal-draft-recurrence-end-mode').selectOption('count');
  await opened.detail.getByTestId('personal-draft-recurrence-count').fill('8');
  await expect(opened.detail.getByTestId('personal-draft-recurrence-validation')).toHaveCount(0);
  await expect(opened.detail.getByTestId('my-flow-detail-save-changes')).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await opened.detail.screenshot({
      path: `${screenshotDir}/01-personal-draft-recurrence-edit-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }
  const visibleCopy = await opened.detail.innerText();
  expect(visibleCopy).not.toMatch(/P0|Canonical URL|source-backed|Step|Item|Markdown/);
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();

  const storedWeekly = await readStoredUserItem(recurringItemId!);
  expect(storedWeekly).toMatchObject({
    itemId: recurringItemId,
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-17',
      time: '09:30',
      durationMinutes: 45,
      repeat: {
        schemaVersion: 1,
        status: 'active',
        revisions: [
          {
            rule: {
              frequency: 'weekly',
              interval: 2,
              weekdays: ['MO', 'WE', 'FR'],
              end: { mode: 'count', count: 8 },
            },
          },
        ],
      },
    },
  });
  const recurrenceSeriesId = storedWeekly.schedule.repeat.seriesId;
  expect(recurrenceSeriesId).toMatch(/^personal-recurrence:/);

  await page.reload();
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 다시 확인하기');
  await expandMyFlowAdvancedEditor(opened.detail);
  await expect(opened.detail.getByTestId('personal-draft-recurrence-weekly')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('personal-draft-recurrence-interval')).toHaveValue('2');
  await expect(opened.detail.getByTestId('personal-draft-recurrence-weekday-MO')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('personal-draft-recurrence-weekday-WE')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('personal-draft-recurrence-weekday-FR')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('personal-draft-recurrence-end-mode')).toHaveValue('count');
  await expect(opened.detail.getByTestId('personal-draft-recurrence-count')).toHaveValue('8');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  const wideOrderItem = getPersonalDraftEffectiveItems(wideDraftFlow)
    .filter({ hasText: '보험 서류 다시 확인하기' })
    .first();
  await openPersonalDraftEffectiveItem(wideOrderItem);
  const wideDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await enterPersonalDraftItemEditMode(wideDetail);
  await expect(wideDetail.getByTestId('personal-draft-recurrence-control')).toHaveCount(0);
  await expandMyFlowAdvancedEditor(wideDetail);
  await expect(wideDetail.getByTestId('personal-draft-recurrence-control')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({
      path: `${screenshotDir}/02-personal-draft-recurrence-edit-wide.png`,
      fullPage: true,
    });
  }
  await wideDetail.getByTestId('personal-draft-recurrence-count').fill('10');
  await wideDetail.getByTestId('my-flow-detail-save-changes').click();
  const storedEditedRecurrence = await readStoredUserItem(recurringItemId!);
  expect(storedEditedRecurrence.schedule.repeat.seriesId).toBe(recurrenceSeriesId);
  expect(storedEditedRecurrence.schedule.repeat.revisions).toHaveLength(1);
  expect(storedEditedRecurrence.schedule.repeat.revisions[0].rule.end).toEqual({
    mode: 'count',
    count: 10,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my');
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 다시 확인하기');
  await opened.detail.getByTestId('my-flow-detail-date-input').fill('2026-08-18');
  await expandMyFlowAdvancedEditor(opened.detail);
  await opened.detail.getByTestId('personal-draft-time-input').fill('10:00');
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  const storedMovedRecurrence = await readStoredUserItem(recurringItemId!);
  expect(storedMovedRecurrence.schedule.repeat.seriesId).toBe(recurrenceSeriesId);
  expect(storedMovedRecurrence.schedule.repeat.revisions).toHaveLength(1);
  expect(storedMovedRecurrence.schedule.repeat.revisions[0]).toMatchObject({
    effectiveFrom: '2026-08-18',
    scheduleTemplate: {
      time: '10:00',
      durationMinutes: 45,
    },
  });

  await page.reload();
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 다시 확인하기');
  await expandMyFlowAdvancedEditor(opened.detail);
  await opened.detail.getByTestId('personal-draft-recurrence-none').click();
  await opened.detail.getByTestId('my-flow-detail-save-changes').click();
  const storedWithoutRecurrence = await readStoredUserItem(recurringItemId!);
  expect(storedWithoutRecurrence).toMatchObject({
    itemId: recurringItemId,
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-18',
      time: '10:00',
      durationMinutes: 45,
    },
  });
  expect(storedWithoutRecurrence.schedule.repeat).toBeUndefined();
  await page.reload();
  draftFlow = await openDraftFlow();
  opened = await openUserItemEditor(draftFlow, '보험 서류 다시 확인하기');
  await expandMyFlowAdvancedEditor(opened.detail);
  await expect(opened.detail.getByTestId('personal-draft-recurrence-none')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opened.detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-08-18');
  await expect(opened.detail.getByTestId('personal-draft-time-input')).toHaveValue('10:00');
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await opened.detail.screenshot({
      path: `${screenshotDir}/03-personal-draft-recurrence-removed-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }

  await page.goto('/my?demo=source-backed');
  await openMyFlowView(page);
  await expect(page.getByTestId('personal-draft-recurrence-control')).toHaveCount(0);
});

test('personal draft recurrence expands into Calendar occurrences with reversible completion and series ICS', async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location().url;
      consoleErrors.push(location ? `${message.text()} (${location})` : message.text());
    }
  });
  const evidenceDir = process.env.FLOWME_P23_02C2B_EVIDENCE_DIR;
  const screenshotDir = evidenceDir ? `${evidenceDir}/screenshots` : '';
  const icsEvidenceDir = process.env.FLOWME_P23_02C2C_EVIDENCE_DIR;
  const icsScreenshotDir = icsEvidenceDir ? `${icsEvidenceDir}/screenshots` : '';
  const icsDownloadDir = icsEvidenceDir ? `${icsEvidenceDir}/downloads` : '';
  const executionEvidenceDir = process.env.FLOWME_P23_03_EVIDENCE_DIR;
  const executionScreenshotDir = executionEvidenceDir ? `${executionEvidenceDir}/screenshots` : '';
  const completionEvidenceDir = process.env.FLOWME_P26_12_EVIDENCE_DIR ?? process.env.FLOWME_P25_05A_EVIDENCE_DIR;
  const completionScreenshotDir = completionEvidenceDir ? `${completionEvidenceDir}/screenshots` : '';
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (icsScreenshotDir) fs.mkdirSync(icsScreenshotDir, { recursive: true });
  if (icsDownloadDir) fs.mkdirSync(icsDownloadDir, { recursive: true });
  if (executionScreenshotDir) fs.mkdirSync(executionScreenshotDir, { recursive: true });
  if (completionScreenshotDir) fs.mkdirSync(completionScreenshotDir, { recursive: true });

  const openDraftFlow = async () => {
    await openMyFlowView(page);
    const flow = getPersonalDraftFlow(page);
    await openPersonalDraftFlowIfCollapsed(flow);
    const showAll = flow.getByTestId('my-flow-mobile-structure-show-all');
    if (await showAll.count()) await showAll.click();
    return flow;
  };
  const openUserItemEditor = async (flow: Locator, title: string) => {
    const item = getPersonalDraftEffectiveItems(flow).filter({ hasText: title }).first();
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = getOpenMyFlowItemDetail(page);
    await enterPersonalDraftItemEditMode(detail);
    return detail;
  };
  const selectCalendarDate = async (date: string) => {
    await openMyFlowCalendarSelectedDay(page, date);
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/calendar-occurrence-draft?utm_source=review');
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByLabel('Flow 이름').fill('반복 일정 확인 초안 요청');
  await result.getByLabel('원하는 결과').fill('매일 확인할 일을 내 캘린더에서 완료하고 다시 열기');
  await result.getByRole('button', { name: '초안 준비하기' }).click();
  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '반복 일정 확인 초안 요청' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('반복 일정 확인');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();

  await expect(page).toHaveURL(/\/my/);
  const draftFlow = await openDraftFlow();
  const recurringTitle = '매일 준비물 다시 확인하기';
  const recurringItem = await addPersonalDraftItem(draftFlow, recurringTitle);
  const recurringItemId = await recurringItem.getAttribute('data-item-id');
  expect(recurringItemId).toMatch(/^personal-item-/);

  const detail = await openUserItemEditor(draftFlow, recurringTitle);
  await detail.getByTestId('personal-draft-date-mode-fixed').click();
  await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-13');
  await expandMyFlowAdvancedEditor(detail);
  await detail.getByTestId('personal-draft-recurrence-daily').click();
  await detail.getByTestId('personal-draft-recurrence-end-mode').selectOption('count');
  await detail.getByTestId('personal-draft-recurrence-count').fill('3');
  await detail.getByTestId('my-flow-detail-save-changes').click();
  await closeOpenMyFlowItemDetail(page);

  await recurringItem.getByTestId('my-flow-mobile-structure-step-row').click();
  const seriesDetail = getOpenMyFlowItemDetail(page);
  await expect(seriesDetail.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(seriesDetail).toHaveAttribute('data-execution-level', 'series');
  await expect(seriesDetail.getByTestId('personal-draft-recurrence-calendar-entry')).toBeVisible();
  await expect(seriesDetail.getByTestId('personal-draft-recurrence-calendar-entry')).toHaveText('캘린더에서 회차별 실행');
  const seriesPortableExport = seriesDetail.getByTestId('my-flow-detail-portable-export');
  if ((await seriesPortableExport.getAttribute('open')) === null) {
    await seriesPortableExport.locator(':scope > summary').click();
  }
  const firstSeriesDownloadPromise = page.waitForEvent('download');
  await seriesDetail.getByTestId('my-flow-detail-download-ics').click();
  const firstSeriesDownload = await firstSeriesDownloadPromise;
  if (icsDownloadDir) {
    await firstSeriesDownload.saveAs(`${icsDownloadDir}/personal-draft-recurrence-before-completion.ics`);
  }
  const firstSeriesDownloadPath = await firstSeriesDownload.path();
  expect(firstSeriesDownloadPath).toBeTruthy();
  const firstSeriesIcs = fs.readFileSync(firstSeriesDownloadPath!, 'utf8').replaceAll('\r\n ', '');
  const firstSeriesUid = firstSeriesIcs.match(/^UID:(.+)$/mu)?.[1];
  expect(firstSeriesUid).toBeTruthy();
  expect(firstSeriesIcs).toContain('RRULE:FREQ=DAILY;COUNT=3');
  expect((firstSeriesIcs.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  expect(firstSeriesIcs).not.toContain('EXDATE:');
  expect(firstSeriesIcs).not.toContain('RECURRENCE-ID');
  const firstSeriesVisibleOutput = firstSeriesIcs
    .split(/\r?\n/u)
    .filter((line) => !line.startsWith('UID:') && !line.startsWith('PRODID:'))
    .join('\n');
  expect(firstSeriesVisibleOutput).not.toMatch(
    /\bP0\b|대기열|파이프라인|Canonical URL|handoff|source-backed|\bStep\b|\bItem\b|Markdown/iu,
  );
  if (icsScreenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await seriesPortableExport.screenshot({
      path: `${icsScreenshotDir}/00-personal-draft-recurrence-ics-entry-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await seriesDetail.screenshot({
      path: `${screenshotDir}/00-personal-draft-series-calendar-entry-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }
  if (completionScreenshotDir) {
    await seriesDetail.screenshot({
      path: `${completionScreenshotDir}/02-recurrence-series-definition-mobile.png`,
    });
  }
  await seriesDetail.getByTestId('personal-draft-recurrence-calendar-entry').click();
  await expect(page).toHaveURL(/\/calendar/);
  await selectCalendarDate('2026-07-13');
  let selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  let occurrenceRow = selectedDay
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(occurrenceRow).toHaveCount(1);
  await expect(occurrenceRow).toHaveAttribute('data-occurrence-state', 'pending');
  await expect(occurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  const firstOccurrenceId = await occurrenceRow.getAttribute('data-occurrence-id');
  expect(firstOccurrenceId).toContain(':occurrence:2026-07-13T');
  await occurrenceRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  await expect(page).toHaveURL(/\/my\?view=flows&flow=.*&item=.*&date=2026-07-13/u);
  let occurrenceDetail = getOpenMyFlowItemDetail(page);
  let occurrenceCompletion = occurrenceDetail.getByTestId('my-flow-task-complete-control');
  await expect(occurrenceCompletion).toHaveCount(1);
  await occurrenceCompletion.click();
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await selectCalendarDate('2026-07-13');
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  occurrenceRow = selectedDay
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(occurrenceRow).toHaveAttribute('data-occurrence-state', 'done');
  await expect(occurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await occurrenceRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  occurrenceDetail = getOpenMyFlowItemDetail(page);
  occurrenceCompletion = occurrenceDetail.getByTestId('my-flow-task-complete-control');
  await expect(occurrenceCompletion).toBeChecked();
  await occurrenceCompletion.click();
  const firstOccurrenceReopenNotice = page.getByTestId('my-flow-completion-snackbar');
  await expect(firstOccurrenceReopenNotice).toHaveAttribute('data-completion-result', 'reopened');
  await expect(firstOccurrenceReopenNotice.getByTestId('my-flow-completion-open')).toBeFocused();
  await occurrenceCompletion.focus();
  await expect(occurrenceCompletion).toBeFocused();
  await occurrenceCompletion.click();
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await selectCalendarDate('2026-07-13');
  selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  occurrenceRow = selectedDay
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(occurrenceRow).toHaveAttribute('data-occurrence-state', 'done');
  await expect(occurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  const storedDone = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('flow:my-flow:occurrence-execution') || '{}'),
  );
  const storedDoneRecord = Object.values(storedDone).find(
    (entry) => (entry as { occurrenceId?: string }).occurrenceId === firstOccurrenceId,
  ) as { state?: string; completedAt?: string } | undefined;
  expect(storedDoneRecord?.state).toBe('done');
  expect(storedDoneRecord?.completedAt).toBeTruthy();
  await expect(page.locator('.fc-event[aria-label*="매일 준비물 다시 확인하기"]')).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await selectedDay.screenshot({
      path: `${screenshotDir}/01-personal-draft-occurrence-done-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }
  if (completionScreenshotDir) {
    await selectedDay.screenshot({
      path: `${completionScreenshotDir}/03-recurrence-occurrence-control-mobile.png`,
    });
  }

  await page.reload();
  await selectCalendarDate('2026-07-13');
  occurrenceRow = page
    .getByTestId('my-flow-calendar-selected-day')
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(occurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await occurrenceRow.getByRole('button', { name: /Flow에서 열기/ }).click();
  occurrenceDetail = getOpenMyFlowItemDetail(page);
  occurrenceCompletion = occurrenceDetail.getByTestId('my-flow-task-complete-control');
  await expect(occurrenceCompletion).toBeChecked();
  await occurrenceCompletion.click();
  const occurrenceReopenNotice = page.getByTestId('my-flow-completion-snackbar');
  await expect(occurrenceReopenNotice).toHaveAttribute('data-completion-result', 'reopened');
  await expect(occurrenceReopenNotice).toContainText('7월 13일 다시 열림');
  await occurrenceCompletion.focus();
  await expect(occurrenceCompletion).toBeFocused();
  await closeOpenMyFlowItemDetail(page);
  await page.goto('/calendar');
  await selectCalendarDate('2026-07-13');
  occurrenceRow = page
    .getByTestId('my-flow-calendar-selected-day')
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(occurrenceRow).toHaveAttribute('data-occurrence-state', 'reopened');
  await expect(occurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await hidePlatformChromeForEvidence(page);
    await page.getByTestId('my-flow-calendar-selected-day').screenshot({
      path: `${screenshotDir}/02-personal-draft-occurrence-reopened-mobile.png`,
    });
    await restorePlatformChromeAfterEvidence(page);
  }

  await selectCalendarDate('2026-07-14');
  let secondOccurrenceRow = page
    .getByTestId('my-flow-calendar-selected-day')
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(secondOccurrenceRow).toHaveCount(1);
  await expect(secondOccurrenceRow).toHaveAttribute('data-occurrence-state', 'pending');
  const secondOccurrenceId = await secondOccurrenceRow.getAttribute('data-occurrence-id');
  expect(secondOccurrenceId).not.toBe(firstOccurrenceId);
  await expect(secondOccurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(secondOccurrenceRow.getByRole('button', { name: new RegExp(`${recurringTitle} Flow에서 열기`) }))
    .toBeVisible();
  await expect(secondOccurrenceRow.getByTestId('personal-draft-occurrence-execution-actions')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
  expect(await secondOccurrenceRow.getAttribute('data-occurrence-id')).toBe(secondOccurrenceId);

  await page.goto('/my');
  const reopenedDraftFlow = await openDraftFlow();
  const reopenedRecurringItem = getPersonalDraftEffectiveItems(reopenedDraftFlow)
    .filter({ hasText: recurringTitle })
    .first();
  await reopenedRecurringItem.getByTestId('my-flow-mobile-structure-step-row').click();
  const reopenedSeriesDetail = getOpenMyFlowItemDetail(page);
  const reopenedSeriesPortableExport = reopenedSeriesDetail.getByTestId('my-flow-detail-portable-export');
  if ((await reopenedSeriesPortableExport.getAttribute('open')) === null) {
    await reopenedSeriesPortableExport.locator(':scope > summary').click();
  }
  const reopenedDownloadPromise = page.waitForEvent('download');
  await reopenedSeriesDetail.getByTestId('my-flow-detail-download-ics').click();
  const reopenedDownload = await reopenedDownloadPromise;
  if (icsDownloadDir) {
    await reopenedDownload.saveAs(`${icsDownloadDir}/personal-draft-recurrence-after-reopen.ics`);
  }
  const reopenedDownloadPath = await reopenedDownload.path();
  expect(reopenedDownloadPath).toBeTruthy();
  const reopenedIcs = fs.readFileSync(reopenedDownloadPath!, 'utf8').replaceAll('\r\n ', '');
  expect(reopenedIcs.match(/^UID:(.+)$/mu)?.[1]).toBe(firstSeriesUid);
  expect(reopenedIcs).toContain('RRULE:FREQ=DAILY;COUNT=3');
  expect((reopenedIcs.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await selectCalendarDate('2026-07-14');
  const wideOccurrenceRow = page
    .getByTestId('my-flow-calendar-selected-day')
    .locator('article[data-occurrence-id]')
    .filter({ hasText: recurringTitle });
  await expect(wideOccurrenceRow).toBeVisible();
  await expect(wideOccurrenceRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await expect(wideOccurrenceRow.getByRole('button', { name: new RegExp(`${recurringTitle} Flow에서 열기`) }))
    .toBeVisible();
  await expect(wideOccurrenceRow.getByTestId('personal-draft-occurrence-execution-actions')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  if (screenshotDir) {
    await hideNextDevOverlay(page);
    await page.screenshot({
      path: `${screenshotDir}/03-personal-draft-occurrence-calendar-wide.png`,
      fullPage: true,
    });
  }
  if (executionScreenshotDir) {
    await hideNextDevOverlay(page);
    await page.getByTestId('my-flow-calendar-selected-day').screenshot({
      path: `${executionScreenshotDir}/02-personal-draft-occurrence-calendar-lens-wide.png`,
    });
  }
  if (completionScreenshotDir) {
    await hideNextDevOverlay(page);
    await page.getByTestId('my-flow-calendar-selected-day').screenshot({
      path: `${completionScreenshotDir}/04-recurrence-occurrence-wide.png`,
    });
  }

  await page.goto('/my');
  await openMyFlowView(page);
  const wideDraftFlow = await getOpenedPersonalDraftFlow(page);
  const wideRecurringItem = getPersonalDraftEffectiveItems(wideDraftFlow)
    .filter({ hasText: recurringTitle })
    .first();
  await openPersonalDraftEffectiveItem(wideRecurringItem);
  const wideSeriesDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  const wideSeriesPortableExport = wideSeriesDetail.getByTestId('my-flow-detail-portable-export');
  if ((await wideSeriesPortableExport.getAttribute('open')) === null) {
    await wideSeriesPortableExport.locator(':scope > summary').click();
  }
  await expect(wideSeriesDetail.getByTestId('my-flow-detail-download-ics')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (icsScreenshotDir) {
    await hideNextDevOverlay(page);
    await wideSeriesPortableExport.screenshot({
      path: `${icsScreenshotDir}/01-personal-draft-recurrence-ics-entry-wide.png`,
    });
  }

  await page.goto('/calendar?demo=source-backed');
  await expect(page.locator('[data-occurrence-id]')).toHaveCount(0);
  await expect(page.getByTestId('personal-draft-occurrence-execution-actions')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
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
  await expect(duplicateFeedback.getByRole('link', { name: 'My Flow에서 이어서 수정' })).toHaveAttribute(
    'href',
    `/my?savedFlow=${encodeURIComponent(firstDraftState.slug)}`,
  );
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
  await expect(draftEditor.getByTestId('flow-url-miss-draft-item')).toHaveCount(1);
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
  await openMyFlowView(page);
  const mobileDraftFlow = await getOpenedPersonalDraftFlow(page);
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
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-22');
  await page.getByTestId('public-flow-save-primary').click();
  await page.getByTestId('public-flow-saved-receipt-primary').click();
  await page.waitForURL('**/my?view=flows&flow=moving-d30-basic');
  await expect(page.getByTestId('my-flow-studio-link')).not.toBeVisible();
  await page.goto('/my?view=flows&mode=flow');
  const auxiliaryMenu = page.getByTestId('my-flow-auxiliary-menu');
  await auxiliaryMenu.locator('summary').click();
  const studioLink = auxiliaryMenu.getByRole('link', { name: '스튜디오' });
  await expect(studioLink).toBeVisible();
  await expect(studioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my?view=flows');
  const mobileAuxiliaryMenu = page.getByTestId('my-flow-auxiliary-menu');
  await mobileAuxiliaryMenu.locator('summary').click();
  const mobileStudioLink = mobileAuxiliaryMenu.getByRole('link', { name: '스튜디오' });
  await expect(mobileStudioLink).toBeVisible();
  await expect(mobileStudioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await page.goto('/calendar');
  await expect(page.getByRole('link', { name: '스튜디오' })).toHaveCount(0);

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
  await openMyFlowView(page);
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
