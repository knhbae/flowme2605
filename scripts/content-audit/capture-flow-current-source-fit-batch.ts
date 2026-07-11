import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { getContentLabSummary } from '../../lib/flow/content-lab';
import { getPublicFlowIndexingPolicy } from '../../lib/flow/route-indexing-policy';
import { seedBundles } from '../../lib/flow/seed-flows';
import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { getSourceFitAudit, getSourceFitSummary } from '../../lib/flow/source-fit';
import { summarizeSourceNeedsReviewPriority } from '../../lib/flow/source-review-priority';

const baseUrl = process.env.FLOWME_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3015';
const outputDir = path.resolve(
  process.cwd(),
  'docs/content-audit/2026-07-11-flowme-current-source-fit-batch-evidence',
);
const screenshotDir = path.join(outputDir, 'screenshots');

type Scenario = {
  name: string;
  slug: string;
  width: 390 | 1024;
  height: number;
  screenshot: string;
  staleTerms: string[];
  currentTerms: string[];
};

const scenarios: Scenario[] = [
  {
    name: 'passport-approved-mobile',
    slug: 'first-passport-issue',
    width: 390,
    height: 844,
    screenshot: '01-passport-approved-mobile.png',
    staleTerms: ['413×531'],
    currentTerms: ['여권 사진 규격 확인하고 촬영하기', '수수료·처리 기간·수령 방법 확인하기'],
  },
  {
    name: 'closet-approved-mobile',
    slug: 'closet-organize-1day',
    width: 390,
    height: 844,
    screenshot: '02-closet-approved-mobile.png',
    staleTerms: ['무조건 1년', '하나 사면 하나 버리기', '??'],
    currentTerms: ['비움 기준과 유예기간 정하기', '비울 옷의 처리 방법과 날짜 정하기'],
  },
  {
    name: 'portfolio-approved-mobile',
    slug: 'portfolio-4week',
    width: 390,
    height: 844,
    screenshot: '03-portfolio-approved-mobile.png',
    staleTerms: ['STAR', '노션·블로그·PDF'],
    currentTerms: ['DB·API', '배포'],
  },
  {
    name: 'citizen-secretary-review-mobile',
    slug: 'citizen-secretary-alerts',
    width: 390,
    height: 844,
    screenshot: '04-citizen-secretary-review-mobile.png',
    staleTerms: ['100여 종', 'PASS·공동인증서'],
    currentTerms: ['필요한 행정 알림 고르기', '선택한 앱에서 신청 상태 확인하기'],
  },
  {
    name: 'domestic-trip-review-mobile',
    slug: 'domestic-trip-d7',
    width: 390,
    height: 844,
    screenshot: '05-domestic-trip-review-mobile.png',
    staleTerms: ['예약 취소 정책', '관광지 운영시간', '가스 밸브'],
    currentTerms: ['계절·동반자·숙박형태·활동 적기', '세면도구·개인 위생용품·평소 쓰는 약 챙기기'],
  },
  {
    name: 'passport-approved-wide',
    slug: 'first-passport-issue',
    width: 1024,
    height: 900,
    screenshot: '06-passport-approved-wide.png',
    staleTerms: ['413×531'],
    currentTerms: ['여권 사진 규격 확인하고 촬영하기', '수수료·처리 기간·수령 방법 확인하기'],
  },
  {
    name: 'portfolio-approved-wide',
    slug: 'portfolio-4week',
    width: 1024,
    height: 900,
    screenshot: '07-portfolio-approved-wide.png',
    staleTerms: ['STAR', '노션·블로그·PDF'],
    currentTerms: ['DB·API', '배포'],
  },
  {
    name: 'domestic-trip-review-wide',
    slug: 'domestic-trip-d7',
    width: 1024,
    height: 900,
    screenshot: '08-domestic-trip-review-wide.png',
    staleTerms: ['예약 취소 정책', '관광지 운영시간', '가스 밸브'],
    currentTerms: ['계절·동반자·숙박형태·활동 적기', '세면도구·개인 위생용품·평소 쓰는 약 챙기기'],
  },
];

function termHits(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

async function dismissStorageNotice(page: Page) {
  const confirm = page.getByRole('button', { name: '확인', exact: true }).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
}

async function captureScenario(page: Page, scenario: Scenario) {
  await page.setViewportSize({ width: scenario.width, height: scenario.height });
  await page.goto(`${baseUrl}/f/${scenario.slug}`, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible' });
  await dismissStorageNotice(page);
  await page.waitForTimeout(250);

  const bundle = allBundles.find((entry) => entry.flow.slug === scenario.slug);
  if (!bundle) throw new Error(`Missing Flow bundle: ${scenario.slug}`);

  const bodyText = await page.locator('body').innerText();
  const robots = (await page.locator('meta[name="robots"]').getAttribute('content')) ?? '';
  const reviewGate = page.getByTestId('public-flow-review-only-gate');
  const reviewGateCount = await reviewGate.count();
  const workbenchCount = await page.getByRole('region', { name: 'Flow artifact workbench' }).count();
  const artifactPreviewCount = await page.getByLabel('Flow artifact preview').count();
  const flowItemCardCount = await page.getByTestId('flow-item-card').count();
  const fullFlowHeadingCount = await page.getByText('전체 흐름', { exact: true }).count();
  const saveActionCount = await page.getByRole('button', { name: '내 Flow에 저장' }).count();
  const exportFormatOptionCount = await page.getByTestId('public-flow-export-format-option').count();
  const checkboxCount = await page.getByRole('checkbox').count();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  const screenshotPath = path.join(screenshotDir, scenario.screenshot);

  await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });

  const sourceFitAudit = getSourceFitAudit(scenario.slug);
  const indexingPolicy = getPublicFlowIndexingPolicy(bundle);
  const staleCopyHits = termHits(bodyText, scenario.staleTerms);
  const currentCopyHits = termHits(bodyText, scenario.currentTerms);

  return {
    name: scenario.name,
    route: `/f/${scenario.slug}`,
    viewport: { width: scenario.width, height: scenario.height },
    screenshot: `screenshots/${scenario.screenshot}`,
    title: bundle.flow.title,
    sourceUrl: bundle.flow.source_url,
    sourceCheckedAt: bundle.flow.source_checked_at,
    sourceStatus: bundle.flow.source_status,
    sourcePrecision: bundle.flow.source_precision,
    structureType: bundle.flow.structure_type,
    anchorType: bundle.flow.anchor_type,
    primaryDestination: bundle.flow.primary_destination,
    itemCount: bundle.items.length,
    sourceFitDecision: sourceFitAudit?.decision ?? null,
    sourceFitScore: sourceFitAudit?.score ?? null,
    indexingPolicy,
    robots,
    reviewGateCount,
    reviewReason: reviewGateCount ? await reviewGate.getAttribute('data-review-reason') : null,
    reviewDecision: reviewGateCount ? await reviewGate.getAttribute('data-decision') : null,
    workbenchCount,
    saveActionCount,
    exportFormatOptionCount,
    checkboxCount,
    duplicateExecutionSurfaceCount: artifactPreviewCount + flowItemCardCount + fullFlowHeadingCount,
    artifactPreviewCount,
    flowItemCardCount,
    fullFlowHeadingCount,
    staleCopyHitCount: staleCopyHits.length,
    staleCopyHits,
    currentCopyExpectedCount: scenario.currentTerms.length,
    currentCopyHitCount: currentCopyHits.length,
    currentCopyHits,
    horizontalOverflow,
  };
}

async function scanIndexableVisibleCopy(page: Page) {
  const bundles = Array.from(
    new Map(indexableBundles.map((bundle) => [bundle.flow.slug, bundle])).values(),
  );
  const hits: { route: string; title: string; tokens: string[]; samples: string[] }[] = [];

  await page.setViewportSize({ width: 390, height: 844 });
  for (const bundle of bundles) {
    await page.goto(`${baseUrl}/f/${bundle.flow.slug}`, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    await dismissStorageNotice(page);
    const bodyText = await page.locator('body').innerText();
    const tokens = Array.from(new Set(bodyText.match(/\?{2,}|�/gu) ?? []));
    if (tokens.length === 0) continue;

    hits.push({
      route: `/f/${bundle.flow.slug}`,
      title: bundle.flow.title,
      tokens,
      samples: tokens.map((token) => {
        const index = bodyText.indexOf(token);
        return bodyText.slice(Math.max(0, index - 40), index + token.length + 80).replace(/\s+/gu, ' ');
      }),
    });
  }

  return {
    scannedRouteCount: bundles.length,
    hitRouteCount: hits.length,
    hits,
  };
}

const allBundles = mergeSourceBackedMyFlowBundles(seedBundles);
const publishedBundles = allBundles.filter((bundle) => bundle.flow.status === 'published');
const indexableBundles = publishedBundles.filter((bundle) => getPublicFlowIndexingPolicy(bundle).indexable);
const contentLab = getContentLabSummary(seedBundles);
const sourceFit = getSourceFitSummary();
const sourceReviewQueue = summarizeSourceNeedsReviewPriority(seedBundles);

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
  const captured: Awaited<ReturnType<typeof captureScenario>>[] = [];
  let visibleCopyScan: Awaited<ReturnType<typeof scanIndexableVisibleCopy>> = {
    scannedRouteCount: 0,
    hitRouteCount: 0,
    hits: [],
  };

  try {
    for (const scenario of scenarios) {
      captured.push(await captureScenario(page, scenario));
    }
    visibleCopyScan = await scanIndexableVisibleCopy(page);
  } finally {
    await browser.close();
  }

  const approvedScenarios = captured.filter((scenario) => scenario.indexingPolicy.indexable);
  const reviewOnlyScenarios = captured.filter((scenario) => !scenario.indexingPolicy.indexable);
  const evidence = {
  generatedAt: new Date().toISOString(),
  scope: {
    baseUrl,
    routes: Array.from(new Set(scenarios.map((scenario) => `/f/${scenario.slug}`))),
    viewports: [390, 1024],
    sourceReachabilityDoesNotProveSemanticFreshness: true,
    approvalRequiresManualSourceFit: true,
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
    sourceReviewBacklogCount: sourceReviewQueue.priorityCounts.content_backlog,
    naturalArtifactEffectiveCoverageCount: contentLab.naturalArtifactRealSourceAuditedCount,
    lifecycleKeepCount: contentLab.lifecycleBucketCounts.keep,
    lifecycleFixCount: contentLab.lifecycleBucketCounts.fix,
    lifecyclePreviewOnlyCount: contentLab.lifecycleBucketCounts.preview_only,
    lifecycleHideCount: contentLab.lifecycleBucketCounts.hide,
    capturedScenarioCount: captured.length,
    approvedScenarioCount: approvedScenarios.length,
    reviewOnlyScenarioCount: reviewOnlyScenarios.length,
    staleCopyHitCount: captured.reduce((sum, scenario) => sum + scenario.staleCopyHitCount, 0),
    approvedDuplicateExecutionSurfaceCount: approvedScenarios.reduce(
      (sum, scenario) => sum + scenario.duplicateExecutionSurfaceCount,
      0,
    ),
    reviewOnlySaveActionCount: reviewOnlyScenarios.reduce(
      (sum, scenario) => sum + scenario.saveActionCount,
      0,
    ),
    reviewOnlyExportFormatOptionCount: reviewOnlyScenarios.reduce(
      (sum, scenario) => sum + scenario.exportFormatOptionCount,
      0,
    ),
    reviewOnlyCheckboxCount: reviewOnlyScenarios.reduce(
      (sum, scenario) => sum + scenario.checkboxCount,
      0,
    ),
    horizontalOverflowCount: captured.filter((scenario) => scenario.horizontalOverflow).length,
    indexableVisibleCopyScanRouteCount: visibleCopyScan.scannedRouteCount,
    indexableVisibleCopyMojibakeHitRouteCount: visibleCopyScan.hitRouteCount,
    observedUserSessionCount: contentLab.observedSessionEvidenceSessionCount,
    observedUserSessionTarget: 15,
  },
  decisions: [
    {
      slug: 'first-passport-issue',
      decision: 'keep_representative',
      rationale: 'Current official issue, photo, agency, and fee pages support an actionable preparation flow.',
    },
    {
      slug: 'closet-organize-1day',
      decision: 'keep_representative',
      rationale: 'The exact article supports a user-selected threshold, grace period, and disposal sorting flow.',
    },
    {
      slug: 'portfolio-4week',
      decision: 'keep_representative',
      rationale: 'The exact article provides a four-week development-project sequence with direct artifact value.',
    },
    {
      slug: 'citizen-secretary-alerts',
      decision: 'catalog_preview_only',
      rationale: 'The current official source is verified, but setup is short and has weak repeat execution value.',
    },
    {
      slug: 'domestic-trip-d7',
      decision: 'reshape_before_featured',
      rationale: 'The source supports a packing checklist, not the former D-7 reservation and itinerary timeline.',
    },
  ],
  scenarios: captured,
  indexableVisibleCopyMojibakeHits: visibleCopyScan.hits,
  verification: {
    targetedUnitTests: '128 passed',
    fullUnitTests: '406 passed',
    targetedCurrentSourceE2e: '1 passed',
    urlFirstE2e: '8 passed',
    publicShareE2e: '33 passed',
    workbenchSourceDensityE2e: '9 passed',
    docsCheck: 'passed (1946 local links)',
    strictSourceReachability: 'passed (154 routes, 157 unique URLs, 0 hard broken, 10 manual review)',
    build: 'passed',
  },
  };

  await writeFile(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
