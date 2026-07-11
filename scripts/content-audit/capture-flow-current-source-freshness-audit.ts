import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { getContentLabSummary } from '../../lib/flow/content-lab';
import { getPublicFlowIndexingPolicy } from '../../lib/flow/route-indexing-policy';
import { seedBundles } from '../../lib/flow/seed-flows';
import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { getSourceFitAudit, getSourceFitSummary, type SourceFitDecision } from '../../lib/flow/source-fit';
import { summarizeSourceNeedsReviewPriority } from '../../lib/flow/source-review-priority';

const baseUrl = process.env.FLOWME_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3016';
const outputDir = path.resolve(
  process.cwd(),
  'docs/content-audit/2026-07-11-flowme-current-source-freshness-audit-evidence',
);
const screenshotDir = path.join(outputDir, 'screenshots');

type RouteAudit = {
  slug: string;
  expectedDecision: SourceFitDecision;
  staleTerms: string[];
  currentTerms: string[];
};

const routeAudits: RouteAudit[] = [
  {
    slug: 'birth-registration-prep',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['D+7', 'D+25'],
    currentTerms: ['출생신고', '행복출산'],
  },
  {
    slug: 'childcare-fee-support-apply',
    expectedDecision: 'keep_representative',
    staleTerms: ['부모급여 함께 판정', '지원금 자동 계산'],
    currentTerms: ['어린이집 보육료', '서비스 변경'],
  },
  {
    slug: 'seal-or-signature-certificate',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['발급 후 3개월', '모두 온라인 발급'],
    currentTerms: ['인감증명', '본인서명'],
  },
  {
    slug: 'customs-traveler-declare',
    expectedDecision: 'keep_representative',
    staleTerms: ['면세 한도 800달러', '자동 세액 계산'],
    currentTerms: ['휴대품', '관세청'],
  },
  {
    slug: 'health-insurance-dependent',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['등록 가능 확정', '자동 자격 판정'],
    currentTerms: ['피부양자', '공단'],
  },
  {
    slug: 'military-exam-prep',
    expectedDecision: 'keep_representative',
    staleTerms: ['판정 결과 예측'],
    currentTerms: ['병역판정검사', '신분증'],
  },
  {
    slug: 'overseas-safety-register',
    expectedDecision: 'keep_representative',
    staleTerms: ['안전 보장', '고정 여행경보'],
    currentTerms: ['해외안전여행', '여행경보'],
  },
  {
    slug: 'pension-estimate-check',
    expectedDecision: 'keep_representative',
    staleTerms: ['노후 목표 달성', '수령액 보장'],
    currentTerms: ['가입내역', '예상연금'],
  },
  {
    slug: 'tax-refund-find',
    expectedDecision: 'keep_representative',
    staleTerms: ['지방세 환급', 'AI 자동 계산'],
    currentTerms: ['국세', '홈택스'],
  },
  {
    slug: 'welfare-benefit-finder',
    expectedDecision: 'keep_representative',
    staleTerms: ['받을 수 있을 것 같은 서비스를 목록으로 적었다', '지원금 자동 추천'],
    currentTerms: ['복지멤버십', '별도 신청'],
  },
  {
    slug: 'blog-youtube-start',
    expectedDecision: 'keep_representative',
    staleTerms: ['유튜브 계정 만들기', '채널 콘셉트 정하기'],
    currentTerms: ['블로그 글', '영상'],
  },
  {
    slug: 'book-finish-one',
    expectedDecision: 'catalog_preview_only',
    staleTerms: ['하루 페이지 자동 계산'],
    currentTerms: ['책 한 권', '원문'],
  },
  {
    slug: 'dog-walk-routine',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['30도 이상', '10분만 산책'],
    currentTerms: ['산책', '날씨'],
  },
  {
    slug: 'home-cafe-daily',
    expectedDecision: 'keep_representative',
    staleTerms: ['매일 홈카페 루틴', '라테 아트'],
    currentTerms: ['아이스 커피', '추출'],
  },
  {
    slug: 'kitchen-reset-organize',
    expectedDecision: 'keep_representative',
    staleTerms: ['찬장', '서랍', '조리대'],
    currentTerms: ['냉장고', '식재료'],
  },
  {
    slug: 'morning-routine-30day',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['30일', '물 한 잔', 'TOP3'],
    currentTerms: ['아침 루틴', '기상'],
  },
  {
    slug: 'morning-skincare-routine',
    expectedDecision: 'reshape_before_featured',
    staleTerms: ['매일 피부 상태 기록'],
    currentTerms: ['스킨케어', '자외선'],
  },
  {
    slug: 'pet-health-observation',
    expectedDecision: 'keep_representative',
    staleTerms: ['주간 자가진단', '질환 판정'],
    currentTerms: ['건강검진', '상담'],
  },
  {
    slug: 'reading-habit-30day',
    expectedDecision: 'keep_representative',
    staleTerms: ['66일', '30일 단계'],
    currentTerms: ['15분', '읽기'],
  },
  {
    slug: 'skin-weekly-check',
    expectedDecision: 'hide_from_public_catalog',
    staleTerms: ['피부 타입 진단'],
    currentTerms: ['검토', '피부'],
  },
  {
    slug: 'travel-packing-list',
    expectedDecision: 'keep_representative',
    staleTerms: ['가스 밸브', '전기 차단'],
    currentTerms: ['여행', '준비물'],
  },
  {
    slug: 'weekly-meal-plan',
    expectedDecision: 'keep_representative',
    staleTerms: ['23% 절약', '영양 자동 계산'],
    currentTerms: ['평일 5일', '월요일'],
  },
  {
    slug: 'recipe-video-execute',
    expectedDecision: 'catalog_preview_only',
    staleTerms: ['김치찌개', '대체 재료 자동 추천'],
    currentTerms: ['레시피', '영상'],
  },
];

const wideSlugs = new Set([
  'birth-registration-prep',
  'health-insurance-dependent',
  'tax-refund-find',
  'weekly-meal-plan',
  'reading-habit-30day',
  'pet-health-observation',
  'recipe-video-execute',
]);

const allBundles = mergeSourceBackedMyFlowBundles(seedBundles);
const publishedBundles = allBundles.filter((bundle) => bundle.flow.status === 'published');
const indexableBundles = publishedBundles.filter((bundle) => getPublicFlowIndexingPolicy(bundle).indexable);

function findTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

async function dismissStorageNotice(page: Page) {
  const confirm = page.getByRole('button', { name: '확인', exact: true }).first();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
}

async function captureRoute(page: Page, routeAudit: RouteAudit, width: 390 | 1024, index: number) {
  const height = width === 390 ? 844 : 900;
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${baseUrl}/f/${routeAudit.slug}`, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible' });
  await dismissStorageNotice(page);
  await page.waitForTimeout(200);

  const bundle = allBundles.find((entry) => entry.flow.slug === routeAudit.slug);
  if (!bundle) throw new Error(`Missing Flow bundle: ${routeAudit.slug}`);
  const bodyText = await page.locator('body').innerText();
  const audit = getSourceFitAudit(routeAudit.slug);
  const indexingPolicy = getPublicFlowIndexingPolicy(bundle);
  const reviewGate = page.getByTestId('public-flow-review-only-gate');
  const workbenchCount = await page.getByRole('region', { name: 'Flow artifact workbench' }).count();
  const saveActionCount = await page.getByRole('button', { name: '내 Flow에 저장' }).count();
  const exportFormatOptionCount = await page.getByTestId('public-flow-export-format-option').count();
  const checkboxCount = await page.getByRole('checkbox').count();
  const screenshotName = `${String(index).padStart(2, '0')}-${routeAudit.slug}-${width}.png`;
  const staleCopyHits = findTerms(bodyText, routeAudit.staleTerms);
  const currentCopyHits = findTerms(bodyText, routeAudit.currentTerms);
  const decisionMatches = audit?.decision === routeAudit.expectedDecision;
  const approved = routeAudit.expectedDecision === 'keep_representative';
  const publicPolicyMatches = approved
    ? indexingPolicy.indexable && workbenchCount === 1 && saveActionCount > 0
    : !indexingPolicy.indexable && workbenchCount === 0 && saveActionCount === 0;

  await page.screenshot({
    path: path.join(screenshotDir, screenshotName),
    fullPage: true,
    animations: 'disabled',
  });

  return {
    route: `/f/${routeAudit.slug}`,
    viewport: { width, height },
    screenshot: `screenshots/${screenshotName}`,
    responseStatus: response?.status() ?? null,
    title: bundle.flow.title,
    sourceTitle: bundle.flow.source_title,
    sourceUrl: bundle.flow.source_url,
    sourceCheckedAt: bundle.flow.source_checked_at,
    sourceStatus: bundle.flow.source_status,
    sourcePrecision: bundle.flow.source_precision,
    expectedDecision: routeAudit.expectedDecision,
    actualDecision: audit?.decision ?? null,
    decisionMatches,
    indexingPolicy,
    robots: (await page.locator('meta[name="robots"]').getAttribute('content')) ?? '',
    reviewGateCount: await reviewGate.count(),
    reviewDecision: (await reviewGate.count()) ? await reviewGate.getAttribute('data-decision') : null,
    workbenchCount,
    saveActionCount,
    exportFormatOptionCount,
    checkboxCount,
    nonApprovedActionLeakCount: approved ? 0 : saveActionCount + exportFormatOptionCount + checkboxCount,
    publicPolicyMatches,
    staleCopyHitCount: staleCopyHits.length,
    staleCopyHits,
    currentCopyExpectedCount: routeAudit.currentTerms.length,
    currentCopyHitCount: currentCopyHits.length,
    currentCopyHits,
    mojibakeHitCount: (bodyText.match(/\?{2,}|�/gu) ?? []).length,
    horizontalOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  };
}

async function scanIndexableVisibleCopy(page: Page) {
  const bundles = Array.from(
    new Map(indexableBundles.map((bundle) => [bundle.flow.slug, bundle])).values(),
  );
  const hits: Array<{ route: string; title: string; samples: string[] }> = [];

  await page.setViewportSize({ width: 390, height: 844 });
  for (const bundle of bundles) {
    await page.goto(`${baseUrl}/f/${bundle.flow.slug}`, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    await dismissStorageNotice(page);
    const bodyText = await page.locator('body').innerText();
    const matches = [...bodyText.matchAll(/\?{2,}|�/gu)];
    if (matches.length === 0) continue;

    hits.push({
      route: `/f/${bundle.flow.slug}`,
      title: bundle.flow.title,
      samples: matches.slice(0, 5).map((match) => {
        const index = match.index ?? 0;
        return bodyText.slice(Math.max(0, index - 40), index + match[0].length + 80).replace(/\s+/gu, ' ');
      }),
    });
  }

  return { scannedRouteCount: bundles.length, hitRouteCount: hits.length, hits };
}

async function main() {
  await mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const context = await browser.newContext({ colorScheme: 'light', locale: 'ko-KR' });
  const page = await context.newPage();
  const scenarios: Awaited<ReturnType<typeof captureRoute>>[] = [];
  let indexableVisibleCopyScan: Awaited<ReturnType<typeof scanIndexableVisibleCopy>> = {
    scannedRouteCount: 0,
    hitRouteCount: 0,
    hits: [],
  };

  try {
    let index = 1;
    for (const routeAudit of routeAudits) {
      scenarios.push(await captureRoute(page, routeAudit, 390, index));
      index += 1;
    }
    for (const routeAudit of routeAudits.filter((entry) => wideSlugs.has(entry.slug))) {
      scenarios.push(await captureRoute(page, routeAudit, 1024, index));
      index += 1;
    }
    indexableVisibleCopyScan = await scanIndexableVisibleCopy(page);
  } finally {
    await browser.close();
  }

  const sourceFit = getSourceFitSummary();
  const sourceReviewQueue = summarizeSourceNeedsReviewPriority(seedBundles);
  const contentLab = getContentLabSummary(seedBundles);
  const approved = scenarios.filter((scenario) => scenario.expectedDecision === 'keep_representative');
  const gated = scenarios.filter((scenario) => scenario.expectedDecision !== 'keep_representative');
  const evidence = {
    generatedAt: new Date().toISOString(),
    scope: {
      baseUrl,
      auditedRouteCount: routeAudits.length,
      mobileRouteCount: routeAudits.length,
      wideRouteCount: wideSlugs.size,
      viewports: [390, 1024],
      sourceReachabilityDoesNotProveSemanticFreshness: true,
      outdatedSourcesAreNotAutoApproved: true,
    },
    summary: {
      publishedBundleCount: publishedBundles.length,
      publicFlowIndexableCount: indexableBundles.length,
      publicFlowReviewOnlyCount: publishedBundles.length - indexableBundles.length,
      sourceFitAuditCount: sourceFit.auditedCount,
      sourceFitApprovedCount: sourceFit.decisionCounts.keep_representative,
      sourceFitReshapeCount: sourceFit.decisionCounts.reshape_before_featured,
      sourceFitPreviewOnlyCount: sourceFit.decisionCounts.catalog_preview_only,
      sourceFitHiddenCount: sourceFit.decisionCounts.hide_from_public_catalog,
      sourceReviewQueueCount: sourceReviewQueue.totalCount,
      sourceReviewAuditNowCount: sourceReviewQueue.priorityCounts.audit_now,
      sourceReviewReplacementCount: sourceReviewQueue.priorityCounts.source_replacement,
      sourceReviewRiskCount: sourceReviewQueue.priorityCounts.risk_review,
      naturalArtifactEffectiveCoverageCount: contentLab.naturalArtifactRealSourceAuditedCount,
      capturedScenarioCount: scenarios.length,
      capturedApprovedScenarioCount: approved.length,
      capturedGatedScenarioCount: gated.length,
      decisionMismatchCount: scenarios.filter((scenario) => !scenario.decisionMatches).length,
      publicPolicyMismatchCount: scenarios.filter((scenario) => !scenario.publicPolicyMatches).length,
      staleCopyHitCount: scenarios.reduce((sum, scenario) => sum + scenario.staleCopyHitCount, 0),
      approvedCurrentCopyMissingCount: approved.reduce(
        (sum, scenario) =>
          sum + Math.max(0, scenario.currentCopyExpectedCount - scenario.currentCopyHitCount),
        0,
      ),
      nonApprovedActionLeakCount: gated.reduce(
        (sum, scenario) => sum + scenario.nonApprovedActionLeakCount,
        0,
      ),
      horizontalOverflowCount: scenarios.filter((scenario) => scenario.horizontalOverflow).length,
      mojibakeHitCount: scenarios.reduce((sum, scenario) => sum + scenario.mojibakeHitCount, 0),
      indexableVisibleCopyScanRouteCount: indexableVisibleCopyScan.scannedRouteCount,
      indexableVisibleCopyMojibakeHitRouteCount: indexableVisibleCopyScan.hitRouteCount,
    },
    decisions: routeAudits.map((entry) => ({
      slug: entry.slug,
      decision: getSourceFitAudit(entry.slug)?.decision ?? null,
      sourceCheckedAt: getSourceFitAudit(entry.slug)?.checkedAt ?? null,
      sourcePrecision: getSourceFitAudit(entry.slug)?.sourcePrecision ?? null,
      currentGap: getSourceFitAudit(entry.slug)?.currentGap ?? null,
      contentAction: getSourceFitAudit(entry.slug)?.contentAction ?? null,
    })),
    scenarios,
    indexableVisibleCopyMojibakeHits: indexableVisibleCopyScan.hits,
  };

  await writeFile(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence.summary, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
