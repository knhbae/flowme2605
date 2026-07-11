import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { summarizeContentInventory } from '../../lib/flow/content-inventory';
import { summarizeFlowLifecycle } from '../../lib/flow/content-lifecycle';
import { internalReviewBundles } from '../../lib/flow/internal-review-inventory';
import { getPublicFlowIndexingPolicy } from '../../lib/flow/route-indexing-policy';
import {
  isGeneratedPreviewBundle,
  isRuntimeExcludedBundle,
  RUNTIME_ARCHIVED_FLOW_SLUGS,
} from '../../lib/flow/runtime-content-policy';
import { seedBundles } from '../../lib/flow/seed-flows';
import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { summarizeFlowSourceFreshness } from '../../lib/flow/source-freshness';

const root = process.cwd();
const outputDirectory = path.join(
  root,
  'docs',
  'content-audit',
  '2026-07-12-flowme-runtime-content-inventory-separation-evidence',
);
const screenshotDirectory = path.join(outputDirectory, 'screenshots');
const baseUrl = process.env.FLOW_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3112';

mkdirSync(screenshotDirectory, { recursive: true });

const runtimeSeedBundles = seedBundles.filter((bundle) => !isRuntimeExcludedBundle(bundle));
const runtimePublishedBundles = mergeSourceBackedMyFlowBundles(runtimeSeedBundles).filter(
  (bundle) => bundle.flow.status === 'published',
);
const internalPublishedBundles = mergeSourceBackedMyFlowBundles(internalReviewBundles).filter(
  (bundle) => bundle.flow.status === 'published',
);
const indexableBundles = runtimePublishedBundles.filter(
  (bundle) => getPublicFlowIndexingPolicy(bundle).indexable,
);
const reviewGatedBundles = runtimePublishedBundles.filter(
  (bundle) => !getPublicFlowIndexingPolicy(bundle).indexable,
);
const generatedPreviewBundles = internalReviewBundles.filter(isGeneratedPreviewBundle);
const sourceBackedProjectionCount = runtimePublishedBundles.length - runtimeSeedBundles.length;
const runtimeInventory = summarizeContentInventory(runtimeSeedBundles);
const internalInventory = summarizeContentInventory(internalReviewBundles);
const runtimeLifecycle = summarizeFlowLifecycle(runtimeSeedBundles);
const internalLifecycle = summarizeFlowLifecycle(internalReviewBundles);
const sourceFreshness = summarizeFlowSourceFreshness(runtimeSeedBundles, new Date());

function countBy<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function countGeneratedPreviewLinks(page: Page): Promise<number> {
  return page.locator('a[href^="/f/channel-"]').count();
}

async function countArchivedRuntimeLinks(page: Page): Promise<number> {
  const selector = RUNTIME_ARCHIVED_FLOW_SLUGS.map((slug) => `a[href="/f/${slug}"]`).join(', ');
  return page.locator(selector).count();
}

const screenshotScenarios = [
  { id: 'home-mobile', route: '/', width: 390, height: 844, label: '홈 모바일' },
  { id: 'home-wide', route: '/', width: 1024, height: 768, label: '홈 wide' },
  { id: 'flows-mobile', route: '/flows', width: 390, height: 844, label: 'Flow 찾기 모바일' },
  { id: 'flows-wide', route: '/flows', width: 1024, height: 768, label: 'Flow 찾기 wide' },
  { id: 'approved-public-mobile', route: '/f/vehicle-inspection-prep', width: 390, height: 844, label: '공개 승인 Flow 모바일' },
  { id: 'approved-public-wide', route: '/f/vehicle-inspection-prep', width: 1024, height: 768, label: '공개 승인 Flow wide' },
  { id: 'review-gate-mobile', route: '/f/housing-subscription-account', width: 390, height: 844, label: '검토 게이트 Flow 모바일' },
  { id: 'review-gate-wide', route: '/f/housing-subscription-account', width: 1024, height: 768, label: '검토 게이트 Flow wide' },
  { id: 'creator-profile-mobile', route: '/u/samsung-service', width: 390, height: 844, label: '제작자 프로필 모바일' },
  { id: 'creator-profile-wide', route: '/u/samsung-service', width: 1024, height: 768, label: '제작자 프로필 wide' },
  { id: 'internal-inventory-mobile', route: '/creators', width: 390, height: 844, label: '내부 재고 모바일' },
  { id: 'internal-inventory-wide', route: '/creators', width: 1024, height: 768, label: '내부 재고 wide' },
] as const;

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
      (process.platform === 'win32'
        ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
        : undefined),
  });

const capturedScenarios: Array<Record<string, unknown>> = [];
try {
  for (const scenario of screenshotScenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
    });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    const filename = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(screenshotDirectory, filename), fullPage: true });
    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    capturedScenarios.push({
      ...scenario,
      status: response?.status() ?? null,
      robots,
      generatedPreviewLinkCount: await countGeneratedPreviewLinks(page),
      archivedRuntimeLinkCount: await countArchivedRuntimeLinks(page),
      horizontalOverflow: await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      ),
      screenshot: `screenshots/${filename}`,
    });
    await context.close();
  }

  const boundaryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const boundaryPage = await boundaryContext.newPage();
  const approvedResponse = await boundaryPage.goto(`${baseUrl}/f/vehicle-inspection-prep`, {
    waitUntil: 'domcontentloaded',
  });
  const approvedRobots = await boundaryPage.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
  const approvedSaveActionCount = await boundaryPage.getByRole('button', { name: /내 Flow에 저장/ }).count();
  const reviewResponse = await boundaryPage.goto(`${baseUrl}/f/housing-subscription-account`, {
    waitUntil: 'domcontentloaded',
  });
  const reviewRobots = await boundaryPage.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
  const reviewGateCount = await boundaryPage.getByTestId('public-flow-review-only-gate').count();
  const reviewSaveActionCount = await boundaryPage.getByRole('button', { name: /내 Flow에 저장/ }).count();
  const generatedPreviewResponse = await boundaryPage.goto(
    `${baseUrl}/f/channel-samsung-service-%EC%9B%94%EA%B0%84-%EC%A0%90%EA%B2%80-%EB%A3%A8%ED%8B%B4`,
    { waitUntil: 'domcontentloaded' },
  );
  await boundaryPage.screenshot({
    path: path.join(screenshotDirectory, 'generated-preview-404-mobile.png'),
    fullPage: true,
  });
  const archivedRouteResults: Array<{ slug: string; status: number | null }> = [];
  for (const slug of RUNTIME_ARCHIVED_FLOW_SLUGS) {
    const response = await boundaryPage.goto(`${baseUrl}/f/${slug}`, { waitUntil: 'domcontentloaded' });
    archivedRouteResults.push({ slug, status: response?.status() ?? null });
  }
  await boundaryPage.goto(`${baseUrl}/f/digital-detox-weekly`, { waitUntil: 'domcontentloaded' });
  await boundaryPage.screenshot({
    path: path.join(screenshotDirectory, 'archived-flow-404-mobile.png'),
    fullPage: true,
  });
  await boundaryContext.close();

  const migrationContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await migrationContext.addInitScript(() => {
    localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([
        {
          flow: {
            id: 'flow-digital-detox',
            slug: 'digital-detox-weekly',
            title: 'Archived published Flow',
            description: 'Archived published Flow',
            category: '생활습관',
            structure_type: 'routine',
            anchor_type: 'start_date',
            status: 'published',
            source_status: 'preview',
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-07-11T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
        {
          flow: {
            id: 'flow-preview-samsung-service-1',
            slug: 'channel-samsung-service-legacy-preview',
            title: 'Legacy generated preview',
            description: 'Legacy generated preview',
            category: '가전관리',
            structure_type: 'checklist',
            anchor_type: 'none',
            status: 'published',
            source_status: 'preview',
            created_at: '2026-05-21T00:00:00.000Z',
            updated_at: '2026-05-21T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
        {
          flow: {
            id: 'flow-user-draft-preserved',
            slug: 'user-draft-preserved',
            title: '사용자 초안 보존',
            description: '사용자가 직접 만든 초안',
            category: '개인',
            structure_type: 'checklist',
            anchor_type: 'none',
            status: 'draft',
            created_at: '2026-07-12T00:00:00.000Z',
            updated_at: '2026-07-12T00:00:00.000Z',
          },
          sections: [],
          items: [],
        },
      ]),
    );
  });
  const migrationPage = await migrationContext.newPage();
  await migrationPage.goto(`${baseUrl}/flows`, { waitUntil: 'domcontentloaded' });
  await migrationPage.waitForFunction(
    (archivedSlugs) => {
      const stored = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') ?? '[]') as Array<{
        flow?: { id?: string; slug?: string };
      }>;
      return (
        stored.length > 100 &&
        stored.every((bundle) => !bundle.flow?.id?.startsWith('flow-preview-')) &&
        stored.every((bundle) => !archivedSlugs.includes(bundle.flow?.slug ?? ''))
      );
    },
    [...RUNTIME_ARCHIVED_FLOW_SLUGS],
  );
  const migrationResult = await migrationPage.evaluate((archivedSlugs) => {
    const stored = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') ?? '[]') as Array<{
      flow?: { id?: string; slug?: string };
    }>;
    return {
      storedCount: stored.length,
      generatedPreviewRemainingCount: stored.filter((bundle) => bundle.flow?.id?.startsWith('flow-preview-')).length,
      archivedRuntimeRemainingCount: stored.filter((bundle) => archivedSlugs.includes(bundle.flow?.slug ?? '')).length,
      userDraftPreserved: stored.some((bundle) => bundle.flow?.id === 'flow-user-draft-preserved'),
    };
  }, [...RUNTIME_ARCHIVED_FLOW_SLUGS]);
  await migrationContext.close();

  const normalRoutePreviewLinkCount = capturedScenarios
    .filter((scenario) => !String(scenario.route).startsWith('/creators'))
    .reduce((sum, scenario) => sum + Number(scenario.generatedPreviewLinkCount ?? 0), 0);
  const normalRouteArchivedLinkCount = capturedScenarios
    .filter((scenario) => !String(scenario.route).startsWith('/creators'))
    .reduce((sum, scenario) => sum + Number(scenario.archivedRuntimeLinkCount ?? 0), 0);
  const summary = {
    canonicalSeedBundleCount: seedBundles.length,
    runtimeSeedBundleCount: runtimeSeedBundles.length,
    sourceBackedProjectionCount,
    runtimePublishedRouteCount: runtimePublishedBundles.length,
    publicIndexableCount: indexableBundles.length,
    publicReviewGatedCount: reviewGatedBundles.length,
    internalSeedInventoryCount: internalReviewBundles.length,
    internalPublishedInventoryCount: internalPublishedBundles.length,
    generatedPreviewInternalIdCount: generatedPreviewBundles.length,
    generatedPreviewCandidateInventoryCount: internalInventory.generatedPreviewCandidateCount,
    generatedPreviewRuntimeCount: runtimeSeedBundles.filter(isGeneratedPreviewBundle).length,
    generatedPreviewPublicRouteStatus: generatedPreviewResponse?.status() ?? null,
    normalRouteGeneratedPreviewLinkCount: normalRoutePreviewLinkCount,
    archivedRuntimeFlowCount: RUNTIME_ARCHIVED_FLOW_SLUGS.length,
    archivedRuntimePublicRoute404Count: archivedRouteResults.filter((route) => route.status === 404).length,
    normalRouteArchivedFlowLinkCount: normalRouteArchivedLinkCount,
    legacyPreviewMigrationRemainingCount: migrationResult.generatedPreviewRemainingCount,
    archivedRuntimeMigrationRemainingCount: migrationResult.archivedRuntimeRemainingCount,
    userDraftMigrationPreserved: migrationResult.userDraftPreserved,
    approvedPublicRouteStatus: approvedResponse?.status() ?? null,
    approvedPublicRouteNoindex: Boolean(approvedRobots?.includes('noindex')),
    approvedPublicSaveActionCount: approvedSaveActionCount,
    reviewGatedRouteStatus: reviewResponse?.status() ?? null,
    reviewGatedRouteNoindex: Boolean(reviewRobots?.includes('noindex')),
    reviewGatedPanelCount: reviewGateCount,
    reviewGatedSaveActionCount: reviewSaveActionCount,
    normalSourceCurrentCount: sourceFreshness.currentCount,
    normalSourceReviewDueCount: sourceFreshness.reviewDueCount,
    normalSourceStaleCount: sourceFreshness.staleCount,
    normalSourceMissingMetadataCount: sourceFreshness.missingMetadataCount,
    screenshotCount: capturedScenarios.length + 2,
    horizontalOverflowCount: capturedScenarios.filter((scenario) => scenario.horizontalOverflow).length,
  };

  const routeEvidence = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    summary,
    policy: {
      publicApproved: 'indexable and executable public Flow',
      reviewGated: 'direct-access noindex route with save and export actions disabled until review approval',
      runtimeArchived: 'explicit hide or unsupported-source preview; internal inventory preserved, runtime storage and public route removed',
      internalGeneratedPreview: 'internal review inventory only; excluded from runtime seed, browser storage, and public routes',
    },
    counts: {
      runtimeSourceStatus: countBy(runtimeSeedBundles, (bundle) => bundle.flow.source_status ?? 'unclassified'),
      internalSourceStatus: countBy(internalReviewBundles, (bundle) => bundle.flow.source_status ?? 'unclassified'),
      publicIndexingReason: countBy(runtimePublishedBundles, (bundle) => getPublicFlowIndexingPolicy(bundle).reason),
      runtimeLifecycle: runtimeLifecycle.bucketCounts,
      internalLifecycle: internalLifecycle.bucketCounts,
      runtimeInventoryLevels: runtimeInventory.levelCounts,
      internalInventoryLevels: internalInventory.levelCounts,
    },
    migrationResult,
    scenarios: capturedScenarios,
    generatedPreview404: {
      route: '/f/channel-samsung-service-월간-점검-루틴',
      status: generatedPreviewResponse?.status() ?? null,
      screenshot: 'screenshots/generated-preview-404-mobile.png',
    },
    archivedRuntimeRoutes: archivedRouteResults.map((route) => ({
      ...route,
      screenshot: route.slug === 'digital-detox-weekly' ? 'screenshots/archived-flow-404-mobile.png' : null,
    })),
    reviewGatedRoutes: reviewGatedBundles.map((bundle) => ({
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      sourceStatus: bundle.flow.source_status ?? 'unclassified',
      sourceCheckedAt: bundle.flow.source_checked_at ?? null,
      indexingReason: getPublicFlowIndexingPolicy(bundle).reason,
    })),
  };

  writeFileSync(
    path.join(outputDirectory, 'route-evidence.json'),
    `${JSON.stringify(routeEvidence, null, 2)}\n`,
    'utf8',
  );

  const readme = `# FlowMe 런타임 콘텐츠 재고 분리 evidence\n\n` +
    `- 정상 seed: ${summary.runtimeSeedBundleCount}개\n` +
    `- source-backed projection 포함 public route: ${summary.runtimePublishedRouteCount}개\n` +
    `- 공개 승인: ${summary.publicIndexableCount}개\n` +
    `- 검토 게이트: ${summary.publicReviewGatedCount}개\n` +
    `- 내부 전체 재고: ${summary.internalPublishedInventoryCount}개\n` +
    `- 내부 생성 샘플: ${summary.generatedPreviewInternalIdCount}개, 정상 runtime ${summary.generatedPreviewRuntimeCount}개\n` +
    `- 생성 샘플 공개 URL: HTTP ${summary.generatedPreviewPublicRouteStatus}\n` +
    `- archive Flow: ${summary.archivedRuntimeFlowCount}개, direct URL 404: ${summary.archivedRuntimePublicRoute404Count}개\n` +
    `- 기존 저장소 생성 샘플/archive 잔존: ${summary.legacyPreviewMigrationRemainingCount}/${summary.archivedRuntimeMigrationRemainingCount}개, 사용자 draft 보존: ${summary.userDraftMigrationPreserved}\n` +
    `- 정상 출처 stale/review-due/missing: ${summary.normalSourceStaleCount}/${summary.normalSourceReviewDueCount}/${summary.normalSourceMissingMetadataCount}\n\n` +
    `## 판정\n\n` +
    `생성형 샘플과 명시적 archive 4개는 삭제하지 않고 내부 검토 재고에 보존했다. 정상 사용자 seed와 localStorage에는 들어가지 않으며, 과거 direct public URL은 한국어 복귀 경로가 있는 서비스용 404다. ` +
    `검토 게이트 ${summary.publicReviewGatedCount}개는 공개 승인 콘텐츠로 세지 않으며 noindex와 행동 차단을 유지한다.\n\n` +
    `## 파일\n\n- [audit.md](./audit.md)\n- [review.html](./review.html)\n- [route-evidence.json](./route-evidence.json)\n- [screenshots/](./screenshots/)\n`;
  writeFileSync(path.join(outputDirectory, 'README.md'), readme, 'utf8');

  const audit = `# 런타임 콘텐츠 재고 분리 감사\n\n` +
    `## 문제\n\n` +
    `기존 canonical seed는 정상 사용자 콘텐츠와 생성형 채널 샘플을 함께 담았다. 이 때문에 440개 샘플이 앱 시작 시 생성되고 localStorage 마이그레이션 대상이 되었으며, direct /f URL도 존재했다. 오래된 페이지를 숨겨도 기존 브라우저에는 샘플이 남을 수 있었다.\n\n` +
    `## 조치\n\n` +
    `1. 정상 seed에서 flow-preview-* 생성 샘플을 제거했다.\n` +
    `2. 내부 /creators와 /content-flows만 별도 internalReviewBundles를 읽는다.\n` +
    `3. 기존 localStorage 마이그레이션은 flow-preview-*와 명시적 archive 4개만 제거하고 사용자 draft를 보존한다.\n` +
    `4. 생성 샘플과 archive direct /f URL은 다른 Flow 찾기와 홈 복귀가 가능한 한국어 서비스용 404로 닫았다.\n` +
    `5. /creators의 공개 링크는 source-fit 승인 Flow만 허용한다.\n\n` +
    `## 오래된 콘텐츠 해석\n\n` +
    `- 공개 승인 ${summary.publicIndexableCount}개: 정상 실행과 index 허용.\n` +
    `- 검토 게이트 ${summary.publicReviewGatedCount}개: 원문 또는 UX 승인 전이며 noindex, 저장/export 차단. “공개 콘텐츠” 수에 포함하지 않는다.\n` +
    `- 생성 샘플 ${summary.generatedPreviewInternalIdCount}개: 실제 콘텐츠가 아닌 구조 검토 재고. runtime과 public route에서 제거.\n` +
    `- 명시적 archive ${summary.archivedRuntimeFlowCount}개: 출처 불충분 또는 공개 숨김 판정이 확정되어 runtime과 public route에서 제거.\n` +
    `- 정상 source freshness: current ${summary.normalSourceCurrentCount}, stale ${summary.normalSourceStaleCount}, review-due ${summary.normalSourceReviewDueCount}, missing ${summary.normalSourceMissingMetadataCount}.\n\n` +
    `## 남은 리스크\n\n` +
    `- 검토 게이트 ${summary.publicReviewGatedCount}개는 아직 runtime 재고에 남아 있다. 다음 포트폴리오 배치에서 promote / keep-gated / archive를 계속 결정해야 한다.\n` +
    `- 정상 4탭 route는 여전히 큰 AppClient client bundle을 공유한다. 생성 객체 제거와 별개로 route/component split이 필요하다.\n` +
    `- 자동 QA는 실제 사용자 검증을 대신하지 않는다.\n`;
  writeFileSync(path.join(outputDirectory, 'audit.md'), audit, 'utf8');

  const cards = capturedScenarios.map((scenario) => `
    <article>
      <h2>${escapeHtml(String(scenario.label))}</h2>
      <p><code>${escapeHtml(String(scenario.route))}</code> · ${scenario.width}px · HTTP ${scenario.status}</p>
      <img src="${escapeHtml(String(scenario.screenshot))}" alt="${escapeHtml(String(scenario.label))}" loading="lazy">
    </article>`).join('');
  const reviewHtml = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FlowMe 런타임 콘텐츠 재고 분리</title>
<style>
body{margin:0;background:#f5f6f8;color:#171717;font-family:Arial,"Noto Sans KR",sans-serif;letter-spacing:0}main{max-width:1240px;margin:auto;padding:32px 20px 64px}header{border-bottom:1px solid #d9dde4;padding-bottom:24px}h1{font-size:clamp(28px,4vw,48px);margin:8px 0 12px}p{line-height:1.65}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:24px 0}.metric{background:#fff;border:1px solid #d9dde4;padding:16px;border-radius:6px}.metric strong{display:block;font-size:28px;margin-top:6px}.policy{background:#fff;border-left:4px solid #2563eb;padding:16px;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin-top:28px}article{background:#fff;border:1px solid #d9dde4;border-radius:6px;padding:16px}article h2{font-size:18px;margin:0 0 4px}img{display:block;width:100%;height:auto;border:1px solid #e5e7eb;margin-top:12px}code{font-size:12px}@media(max-width:420px){main{padding:20px 12px}.grid{grid-template-columns:1fr}}
</style></head><body><main>
<header><p>2026-07-12 · 현재 소스 기준</p><h1>공개 실행 재고와 내부 샘플 분리</h1><p>오래된 페이지를 단순 삭제하지 않고 공개 승인, 검토 게이트, 내부 생성 샘플로 나눠 실제 사용자 노출 경계를 확인합니다.</p></header>
<section class="metrics">
  <div class="metric">공개 승인<strong>${summary.publicIndexableCount}</strong></div>
  <div class="metric">검토 게이트<strong>${summary.publicReviewGatedCount}</strong></div>
  <div class="metric">내부 생성 샘플<strong>${summary.generatedPreviewInternalIdCount}</strong></div>
  <div class="metric">runtime 생성 샘플<strong>${summary.generatedPreviewRuntimeCount}</strong></div>
  <div class="metric">archive route<strong>${summary.archivedRuntimeFlowCount}</strong></div>
  <div class="metric">legacy 잔존<strong>${summary.legacyPreviewMigrationRemainingCount}</strong></div>
  <div class="metric">생성 URL 상태<strong>${summary.generatedPreviewPublicRouteStatus}</strong></div>
</section>
<section class="policy"><strong>정책</strong><p>승인 Flow만 공개 실행 표면으로 센다. 검토 게이트는 noindex와 행동 차단을 유지한다. 생성 샘플과 명시적 archive는 내부 재고에서만 보고 사용자 draft는 마이그레이션에서 보존한다.</p></section>
<section class="grid">${cards}<article><h2>생성 샘플 direct URL</h2><p>공개 shell 없이 HTTP ${summary.generatedPreviewPublicRouteStatus}</p><img src="screenshots/generated-preview-404-mobile.png" alt="생성 샘플 404"></article><article><h2>출처 불충분 archive URL</h2><p>공개 shell 없이 HTTP 404</p><img src="screenshots/archived-flow-404-mobile.png" alt="archive Flow 404"></article></section>
</main></body></html>`;
  writeFileSync(path.join(outputDirectory, 'review.html'), reviewHtml, 'utf8');
} finally {
  await browser.close();
}

console.log(JSON.stringify({ outputDirectory, runtimeSeed: runtimeSeedBundles.length, internalReview: internalPublishedBundles.length }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
