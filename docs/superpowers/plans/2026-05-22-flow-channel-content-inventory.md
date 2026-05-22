# Flow Channel Content Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify every existing Flow into manual source-fit, derived real-source review, generated preview candidate, or legacy accessible, then surface that distinction in Content Lab and creator channel UX.

**Architecture:** Add a focused inventory review module that reads existing `FlowBundle` metadata and delegates to the existing manual `source-fit.ts` audit when present. Keep public exposure gating in `execution-model.ts` unchanged for this pass, and use the new inventory review for lab/channel language and coverage metrics.

**Tech Stack:** Next.js, React, TypeScript, Node test runner via `tsx --test`, existing FLOW seed data and Tailwind UI.

---

## File Structure

- Create `lib/flow/content-inventory.ts`: pure review and summary functions for all seed bundles.
- Create `lib/flow/content-inventory.test.ts`: unit tests for manual, derived, preview, legacy, and full inventory coverage.
- Modify `lib/flow/content-lab.ts`: include inventory summary fields from `summarizeContentInventory`.
- Modify `lib/flow/content-lab.test.ts`: assert all real source flows are covered and preview generated flows are labeled as candidates.
- Modify `lib/flow/creator-channel-preview.ts`: add channel maturity fields and stop presenting generated previews as validated execution scores.
- Modify `lib/flow/seed-flows.test.ts`: assert channel summaries expose sample candidate and review-needed language metrics.
- Modify `components/flow/ContentLab.tsx`: show inventory coverage cards and rename manual source-fit table.
- Modify `components/flow/AppClient.tsx`: update creator directory/profile stats from "실행성 점수" to actual source/sample/review counts.
- Modify `tests/e2e/flow-mvp.spec.ts`: update Flow Lab/creator channel assertions.
- Modify `docs/pr-history/2026-05-22-flow-item-card-ux.md` and `docs/STATUS.md`: record policy, implementation, verification, and remaining work.
- Modify `package.json`: add `lib/flow/content-inventory.test.ts` to `npm test`.

---

### Task 1: Add Inventory Review Tests

**Files:**
- Create: `lib/flow/content-inventory.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `lib/flow/content-inventory.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reviewContentInventory,
  summarizeContentInventory,
} from './content-inventory';
import { seedBundles } from './seed-flows';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing bundle: ${slug}`);
  return bundle;
}

test('inventory review preserves manual source-fit decisions', () => {
  const review = reviewContentInventory(bundleBySlug('moving-d30-basic'));

  assert.equal(review.level, 'manual_source_fit');
  assert.equal(review.decision, 'keep_representative');
  assert.equal(review.publicHandling, 'representative_eligible');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.reason.includes('수동'));
});

test('inventory review marks unaudited real sources as derived reviews', () => {
  const review = reviewContentInventory(bundleBySlug('real-samsung-aircon-seasonal-care'));

  assert.equal(review.level, 'derived_real_source');
  assert.notEqual(review.decision, 'preview_candidate');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.nextAction.includes('수동'));
});

test('inventory review keeps exact health videos out of representative validation', () => {
  const review = reviewContentInventory(bundleBySlug('real-thankyou-bubu-video-daily-stretch-9min'));

  assert.equal(review.level, 'derived_real_source');
  assert.equal(review.publicHandling, 'catalog_preview');
  assert.ok(review.reason.includes('민감'));
});

test('inventory review labels generated channel flows as preview candidates', () => {
  const preview = seedBundles.find((entry) => entry.flow.source_status === 'preview');
  assert.ok(preview);

  const review = reviewContentInventory(preview);

  assert.equal(review.level, 'generated_preview_candidate');
  assert.equal(review.decision, 'preview_candidate');
  assert.equal(review.publicHandling, 'preview_candidate');
  assert.equal(review.score, 0);
});

test('inventory summary covers all current seed bundles', () => {
  const summary = summarizeContentInventory(seedBundles);

  assert.equal(summary.totalCount, seedBundles.length);
  assert.equal(summary.realSourceReviewedCount, summary.realSourceCount);
  assert.equal(summary.manualSourceFitCount, 10);
  assert.equal(summary.derivedRealSourceCount, summary.realSourceCount - summary.manualSourceFitCount);
  assert.equal(summary.generatedPreviewCandidateCount, summary.previewSourceCount);
  assert.equal(summary.generatedPreviewCandidateCount, 440);
});
```

Update `package.json` test script by inserting `lib/flow/content-inventory.test.ts` after `lib/flow/source-fit.test.ts`:

```json
"test": "tsx --test lib/flow/date.test.ts lib/flow/parser.test.ts lib/flow/seed-flows.test.ts lib/flow/export.test.ts lib/flow/content-lab.test.ts lib/flow/storage.test.ts lib/flow/execution-model.test.ts lib/flow/recurrence.test.ts lib/flow/source-fit.test.ts lib/flow/content-inventory.test.ts"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test
```

Expected: FAIL because `./content-inventory` does not exist.

---

### Task 2: Implement Content Inventory Module

**Files:**
- Create: `lib/flow/content-inventory.ts`
- Test: `lib/flow/content-inventory.test.ts`

- [ ] **Step 1: Add the module**

Create `lib/flow/content-inventory.ts`:

```ts
import { getSourceFitAudit, type SourceFitDecision } from './source-fit';
import type { FlowBundle, SourcePrecision } from './types';

export type ContentInventoryLevel =
  | 'manual_source_fit'
  | 'derived_real_source'
  | 'generated_preview_candidate'
  | 'legacy_accessible';

export type ContentInventoryDecision = SourceFitDecision | 'preview_candidate' | 'legacy_accessible';

export type ContentInventoryPublicHandling =
  | 'representative_eligible'
  | 'source_review'
  | 'catalog_preview'
  | 'preview_candidate'
  | 'legacy_accessible'
  | 'hidden';

export type ContentInventoryReview = {
  slug: string;
  title: string;
  level: ContentInventoryLevel;
  decision: ContentInventoryDecision;
  score: number;
  sourcePrecision: SourcePrecision | 'none';
  publicHandling: ContentInventoryPublicHandling;
  reason: string;
  nextAction: string;
};

export type ContentInventorySummary = {
  totalCount: number;
  realSourceCount: number;
  previewSourceCount: number;
  legacyAccessibleCount: number;
  manualSourceFitCount: number;
  derivedRealSourceCount: number;
  realSourceReviewedCount: number;
  generatedPreviewCandidateCount: number;
  averageDerivedScore: number;
  levelCounts: Record<ContentInventoryLevel, number>;
  publicHandlingCounts: Record<ContentInventoryPublicHandling, number>;
};

const emptyLevelCounts: Record<ContentInventoryLevel, number> = {
  manual_source_fit: 0,
  derived_real_source: 0,
  generated_preview_candidate: 0,
  legacy_accessible: 0,
};

const emptyHandlingCounts: Record<ContentInventoryPublicHandling, number> = {
  representative_eligible: 0,
  source_review: 0,
  catalog_preview: 0,
  preview_candidate: 0,
  legacy_accessible: 0,
  hidden: 0,
};

function handlingFromSourceFit(decision: SourceFitDecision): ContentInventoryPublicHandling {
  if (decision === 'keep_representative') return 'representative_eligible';
  if (decision === 'reshape_before_featured') return 'source_review';
  if (decision === 'catalog_preview_only') return 'catalog_preview';
  return 'hidden';
}

function hasDetailedItems(bundle: FlowBundle): boolean {
  return Boolean(
    bundle.itemDetails?.some(
      (detail) => detail.why || detail.how || detail.completion_criteria || detail.links?.length,
    ),
  );
}

function hasExternalManagementNeed(bundle: FlowBundle): boolean {
  if (bundle.flow.primary_destination && bundle.flow.primary_destination !== 'internal_check') return true;
  if (bundle.flow.structure_type === 'timeline' || bundle.flow.structure_type === 'routine') return true;
  if (bundle.items.some((item) => item.day_offset !== undefined || item.repeat_rule)) return true;
  return Boolean(bundle.mealSlots?.length || bundle.repeatRules?.length);
}

function isSensitive(bundle: FlowBundle): boolean {
  const risk = bundle.flow.risk_level;
  return risk === 'medical_sensitive' || risk === 'financial_sensitive';
}

function scoreDerivedReview(bundle: FlowBundle): number {
  let score = 0;
  if (bundle.flow.source_url) score += 20;
  if (bundle.flow.source_precision === 'exact') score += 20;
  if (bundle.flow.source_type === 'official' || bundle.flow.source_type === 'reference') score += 15;
  if (hasDetailedItems(bundle)) score += 15;
  if (hasExternalManagementNeed(bundle)) score += 15;
  if (!isSensitive(bundle) || Boolean(bundle.flow.warning)) score += 15;
  return Math.max(0, Math.min(100, score));
}

function derivedHandling(bundle: FlowBundle, score: number): ContentInventoryPublicHandling {
  if (isSensitive(bundle)) return 'catalog_preview';
  if (bundle.flow.source_precision === 'exact' && score >= 70) return 'source_review';
  return 'catalog_preview';
}

function decisionFromDerivedHandling(handling: ContentInventoryPublicHandling): SourceFitDecision {
  if (handling === 'source_review') return 'reshape_before_featured';
  if (handling === 'hidden') return 'hide_from_public_catalog';
  return 'catalog_preview_only';
}

export function reviewContentInventory(bundle: FlowBundle): ContentInventoryReview {
  const audit = getSourceFitAudit(bundle.flow.slug);
  if (audit) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'manual_source_fit',
      decision: audit.decision,
      score: audit.score,
      sourcePrecision: audit.sourcePrecision === 'mismatch' ? 'none' : audit.sourcePrecision,
      publicHandling: handlingFromSourceFit(audit.decision),
      reason: `수동 source-fit audit 완료: ${audit.sourceUsefulness}`,
      nextAction: audit.contentAction,
    };
  }

  if (bundle.flow.source_status === 'preview') {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'generated_preview_candidate',
      decision: 'preview_candidate',
      score: 0,
      sourcePrecision: 'none',
      publicHandling: 'preview_candidate',
      reason: '채널 확장 가능성을 보여주는 생성형 샘플 후보입니다.',
      nextAction: '실제 원본 URL을 지정하고 수동 source-fit audit을 진행합니다.',
    };
  }

  if (bundle.flow.source_status === 'real') {
    const score = scoreDerivedReview(bundle);
    const publicHandling = derivedHandling(bundle, score);
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'derived_real_source',
      decision: decisionFromDerivedHandling(publicHandling),
      score,
      sourcePrecision: bundle.flow.source_precision ?? 'none',
      publicHandling,
      reason: isSensitive(bundle)
        ? '민감 영역이 포함된 실제 원본 Flow라 대표 노출 전 수동 검토가 필요합니다.'
        : '실제 원본 metadata 기반으로 1차 분류했습니다.',
      nextAction: '원본을 열어 사용자 여정, 간극, 콘텐츠/UX 보강안을 수동 audit으로 남깁니다.',
    };
  }

  return {
    slug: bundle.flow.slug,
    title: bundle.flow.title,
    level: 'legacy_accessible',
    decision: 'legacy_accessible',
    score: 0,
    sourcePrecision: bundle.flow.source_precision ?? 'none',
    publicHandling: 'legacy_accessible',
    reason: '기존 데모 호환을 위해 직접 접근은 유지하지만 원본 검토 상태가 없습니다.',
    nextAction: '실제 source를 붙이거나 카탈로그에서 제외할지 결정합니다.',
  };
}

export function summarizeContentInventory(bundles: FlowBundle[]): ContentInventorySummary {
  const reviews = bundles.map(reviewContentInventory);
  const levelCounts = { ...emptyLevelCounts };
  const publicHandlingCounts = { ...emptyHandlingCounts };

  for (const review of reviews) {
    levelCounts[review.level] += 1;
    publicHandlingCounts[review.publicHandling] += 1;
  }

  const derivedReviews = reviews.filter((review) => review.level === 'derived_real_source');
  const realSourceCount = bundles.filter((bundle) => bundle.flow.source_status === 'real').length;
  const previewSourceCount = bundles.filter((bundle) => bundle.flow.source_status === 'preview').length;

  return {
    totalCount: bundles.length,
    realSourceCount,
    previewSourceCount,
    legacyAccessibleCount: levelCounts.legacy_accessible,
    manualSourceFitCount: levelCounts.manual_source_fit,
    derivedRealSourceCount: levelCounts.derived_real_source,
    realSourceReviewedCount: levelCounts.manual_source_fit + levelCounts.derived_real_source,
    generatedPreviewCandidateCount: levelCounts.generated_preview_candidate,
    averageDerivedScore: Math.round(
      derivedReviews.reduce((sum, review) => sum + review.score, 0) / Math.max(derivedReviews.length, 1),
    ),
    levelCounts,
    publicHandlingCounts,
  };
}
```

- [ ] **Step 2: Run test to verify it passes**

Run:

```powershell
npm test
```

Expected: all unit tests pass.

---

### Task 3: Add Content Lab Summary Fields

**Files:**
- Modify: `lib/flow/content-lab.ts`
- Modify: `lib/flow/content-lab.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/flow/content-lab.test.ts`:

```ts
test('content lab exposes full content inventory coverage', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.inventoryTotalCount, seedBundles.length);
  assert.equal(summary.realSourceInventoryReviewedCount, summary.realSourceFlowCount);
  assert.equal(summary.manualSourceFitAuditedCount, 10);
  assert.equal(
    summary.derivedRealSourceReviewedCount,
    summary.realSourceFlowCount - summary.manualSourceFitAuditedCount,
  );
  assert.equal(summary.previewCandidateFlowCount, summary.previewGeneratedFlowCount);
  assert.ok(summary.inventoryPublicHandlingCounts.preview_candidate >= 440);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```powershell
npx tsx --test lib/flow/content-lab.test.ts
```

Expected: FAIL because the new summary fields are missing.

- [ ] **Step 3: Implement summary integration**

In `lib/flow/content-lab.ts`, import:

```ts
import { summarizeContentInventory } from './content-inventory';
```

Inside `getContentLabSummary`, after `const sourceFitSummary = getSourceFitSummary();`, add:

```ts
const inventorySummary = summarizeContentInventory(bundles);
```

Return these fields:

```ts
inventoryTotalCount: inventorySummary.totalCount,
realSourceInventoryReviewedCount: inventorySummary.realSourceReviewedCount,
manualSourceFitAuditedCount: inventorySummary.manualSourceFitCount,
derivedRealSourceReviewedCount: inventorySummary.derivedRealSourceCount,
previewCandidateFlowCount: inventorySummary.generatedPreviewCandidateCount,
legacyAccessibleFlowCount: inventorySummary.legacyAccessibleCount,
inventoryLevelCounts: inventorySummary.levelCounts,
inventoryPublicHandlingCounts: inventorySummary.publicHandlingCounts,
inventoryAverageDerivedScore: inventorySummary.averageDerivedScore,
```

- [ ] **Step 4: Run the targeted test**

Run:

```powershell
npx tsx --test lib/flow/content-lab.test.ts
```

Expected: PASS.

---

### Task 4: Update Channel Summary Semantics

**Files:**
- Modify: `lib/flow/creator-channel-preview.ts`
- Modify: `lib/flow/seed-flows.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/flow/seed-flows.test.ts`:

```ts
test('creator channel summaries separate sample candidates from reviewed source inventory', () => {
  const summaries = getCreatorChannelSummaries(seedBundles);
  const samsung = summaries.find((summary) => summary.slug === 'samsung-service');
  const fitvely = summaries.find((summary) => summary.slug === 'fitvely');

  assert.ok(samsung);
  assert.ok(fitvely);
  assert.equal(samsung.sample_candidate_count, samsung.preview_flow_count);
  assert.ok(samsung.source_review_count >= samsung.real_flow_count);
  assert.ok(samsung.next_content_action.includes('원본'));
  assert.equal(fitvely.sample_candidate_count, fitvely.preview_flow_count);
  assert.ok(fitvely.sensitive_count > 0);
});
```

- [ ] **Step 2: Run targeted test to verify it fails**

Run:

```powershell
npx tsx --test lib/flow/seed-flows.test.ts
```

Expected: FAIL because the new fields are missing.

- [ ] **Step 3: Implement channel summary fields**

In `lib/flow/creator-channel-preview.ts`, import:

```ts
import { reviewContentInventory } from './content-inventory';
```

Extend `CreatorChannelSummary`:

```ts
  sample_candidate_count: number;
  manual_source_fit_count: number;
  derived_source_review_count: number;
  source_review_count: number;
  representative_ready_count: number;
  next_content_action: string;
```

Inside `getCreatorChannelSummaries`, after `needsReviewFlowCount`, add:

```ts
const inventoryReviews = channelBundles.map(reviewContentInventory);
const sampleCandidateCount = inventoryReviews.filter((review) => review.level === 'generated_preview_candidate').length;
const manualSourceFitCount = inventoryReviews.filter((review) => review.level === 'manual_source_fit').length;
const derivedSourceReviewCount = inventoryReviews.filter((review) => review.level === 'derived_real_source').length;
const representativeReadyCount = inventoryReviews.filter(
  (review) => review.publicHandling === 'representative_eligible',
).length;
const sourceReviewCount = manualSourceFitCount + derivedSourceReviewCount;
const nextContentAction =
  sampleCandidateCount > sourceReviewCount
    ? '샘플 후보에 실제 원본 URL을 붙이고 원본별 검토를 진행하세요.'
    : '대표 후보를 고르고 수동 source-fit audit을 보강하세요.';
```

Return the new fields:

```ts
sample_candidate_count: sampleCandidateCount,
manual_source_fit_count: manualSourceFitCount,
derived_source_review_count: derivedSourceReviewCount,
source_review_count: sourceReviewCount,
representative_ready_count: representativeReadyCount,
next_content_action: nextContentAction,
```

- [ ] **Step 4: Run targeted test**

Run:

```powershell
npx tsx --test lib/flow/seed-flows.test.ts
```

Expected: PASS.

---

### Task 5: Update Content Lab UI

**Files:**
- Modify: `components/flow/ContentLab.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Write E2E expectation first**

In `tests/e2e/flow-mvp.spec.ts`, update the Flow Lab test to expect:

```ts
await expect(page.getByText('전체 콘텐츠 인벤토리')).toBeVisible();
await expect(page.getByText('실제 원본 40')).toBeVisible();
await expect(page.getByText('샘플 후보 440')).toBeVisible();
await expect(page.getByText('수동 Source-Fit Audit')).toBeVisible();
```

- [ ] **Step 2: Run E2E to verify it fails**

Run:

```powershell
npm run test:e2e -- --grep "Flow Lab"
```

Expected: FAIL because Content Lab UI does not show the new inventory labels.

- [ ] **Step 3: Add inventory coverage section**

In `components/flow/ContentLab.tsx`, add a section before the source-fit table:

```tsx
<section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
  <p className="text-sm font-semibold text-blue-700">Content Inventory</p>
  <h2 className="mt-1 text-2xl font-semibold text-gray-950">전체 콘텐츠 인벤토리</h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
    실제 원본 Flow는 전수 분류하고, 생성형 채널 Flow는 검증 완료 콘텐츠가 아닌 샘플 후보로 분리합니다.
  </p>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-sm text-gray-500">전체</p>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{summary.inventoryTotalCount}</p>
    </div>
    <div className="rounded-lg bg-emerald-50 p-3">
      <p className="text-sm text-emerald-800">실제 원본</p>
      <p className="mt-1 text-2xl font-semibold text-emerald-950">{summary.realSourceFlowCount}</p>
    </div>
    <div className="rounded-lg bg-blue-50 p-3">
      <p className="text-sm text-blue-800">샘플 후보</p>
      <p className="mt-1 text-2xl font-semibold text-blue-950">{summary.previewCandidateFlowCount}</p>
    </div>
    <div className="rounded-lg bg-amber-50 p-3">
      <p className="text-sm text-amber-800">수동 검토</p>
      <p className="mt-1 text-2xl font-semibold text-amber-950">{summary.manualSourceFitAuditedCount}</p>
    </div>
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-sm text-gray-500">1차 분류</p>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{summary.derivedRealSourceReviewedCount}</p>
    </div>
  </div>
</section>
```

Change the source-fit heading text from `Source Fit Audit` to `수동 Source-Fit Audit`.

- [ ] **Step 4: Run E2E and unit tests**

Run:

```powershell
npm test
npm run test:e2e -- --grep "Flow Lab"
```

Expected: PASS.

---

### Task 6: Update Creator Channel UI Copy

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Write E2E expectation first**

In the creator/channel E2E coverage, assert the directory/profile shows:

```ts
await expect(page.getByText('샘플 후보')).toBeVisible();
await expect(page.getByText('원본 검토')).toBeVisible();
await expect(page.getByText('실행성 점수')).not.toBeVisible();
```

- [ ] **Step 2: Run E2E to verify it fails**

Run:

```powershell
npm run test:e2e -- --grep "creator|channel|채널"
```

Expected: FAIL where old copy still says `실행성 점수`.

- [ ] **Step 3: Update creator directory stats**

In `CreatorDirectory`, replace `averageScore` with:

```ts
const totalSourceReviewFlows = summaries.reduce((sum, item) => sum + item.source_review_count, 0);
const totalSampleCandidates = summaries.reduce((sum, item) => sum + item.sample_candidate_count, 0);
```

Replace header stats:

```tsx
<StatCard label="채널" value={`${summaries.length}`} />
<StatCard label="Flow 후보" value={`${totalFlows}+`} />
<StatCard label="실제 원본" value={`${totalRealFlows}`} />
<StatCard label="샘플 후보" value={`${totalSampleCandidates}`} />
<StatCard label="원본 검토" value={`${totalSourceReviewFlows}`} />
```

Replace card stats:

```tsx
<StatCard label="실제 원본" value={`${channel.real_flow_count}`} compact />
<StatCard label="샘플 후보" value={`${channel.sample_candidate_count}`} compact />
<StatCard label="원본 검토" value={`${channel.source_review_count}`} compact />
```

Change badge copy from `{channel.flow_count} flows` to:

```tsx
{channel.real_flow_count} 실제 · {channel.sample_candidate_count} 샘플
```

- [ ] **Step 4: Update creator profile stats**

In the `previewSummary` stat grid, replace source coverage/execution score cards with:

```tsx
<StatCard label="Flow 후보" value={`${previewSummary.flow_count}`} compact />
<StatCard label="실제 원본" value={`${previewSummary.real_flow_count}`} compact />
<StatCard label="샘플 후보" value={`${previewSummary.sample_candidate_count}`} compact />
<StatCard label="원본 검토" value={`${previewSummary.source_review_count}`} compact />
<StatCard label="수동 검토" value={`${previewSummary.manual_source_fit_count}`} compact />
<StatCard label="1차 분류" value={`${previewSummary.derived_source_review_count}`} compact />
<StatCard label="대표 후보" value={`${previewSummary.representative_ready_count}`} compact />
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test
npm run test:e2e
```

Expected: PASS.

---

### Task 7: Documentation And Verification

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [ ] **Step 1: Update status**

Add to `docs/STATUS.md` Recent Changes:

```md
- Content inventory review now separates manually audited real-source flows, metadata-derived real-source reviews, generated preview candidates, and legacy accessible routes.
```

- [ ] **Step 2: Update PR history**

Add a dated section to `docs/pr-history/2026-05-22-flow-item-card-ux.md`:

```md
## 2026-05-22 - Channel/content inventory policy

### Why
- 채널별 preview Flow가 검증된 콘텐츠처럼 보이지 않도록 real source와 generated sample candidate를 분리했다.

### Changed
- Added content inventory review and summary coverage.
- Updated Content Lab to show all 511 bundle classification coverage.
- Updated channel stats from execution score to source/sample/review counts.

### Not Done
- 30 unaudited real-source flows are derived reviews only, not manual source-page audits.
- 440 preview flows remain sample candidates until exact sources are assigned.

### Verification
- `npm run docs:check`
- `npm test`
- `npm run build`
- `npm run test:e2e`
```

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

Run:

```powershell
git add package.json lib/flow/content-inventory.ts lib/flow/content-inventory.test.ts lib/flow/content-lab.ts lib/flow/content-lab.test.ts lib/flow/creator-channel-preview.ts lib/flow/seed-flows.test.ts components/flow/ContentLab.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts docs/STATUS.md docs/pr-history/2026-05-22-flow-item-card-ux.md
git commit -m "feat: classify flow content inventory"
```

Expected: commit succeeds.

## Self Review

- Spec coverage: all approved option-2 requirements map to tasks: inventory classification, real-source coverage, preview candidate separation, Content Lab, channel UI, tests, docs.
- Placeholder scan: no empty tasks or unresolved choices remain.
- Type consistency: `ContentInventoryReview`, `ContentInventorySummary`, and channel summary field names are introduced before use.
- Scope control: public exposure gating remains unchanged; manual audits for the remaining 30 real sources and UX work for calendars/routines are separate follow-ups.
