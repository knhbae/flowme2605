# Artifact-First FLOW UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed real-source natural artifact audit into visible artifact-first UX for five representative Flow patterns.

**Architecture:** Add a small artifact planning layer that maps each Flow to its primary artifact surfaces, then render those surfaces on the public Flow detail page. Keep the current client-only architecture and localStorage state, but split new artifact preview code into focused helpers/components instead of growing `AppClient.tsx` further.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Node test runner, Playwright, localStorage persistence, existing export helpers.

---

## File Structure

- Create: `lib/flow/artifact-plan.ts`
  - Defines artifact surface types and maps a `FlowBundle` to ordered artifact surfaces.
- Create: `lib/flow/artifact-plan.test.ts`
  - Unit tests for representative target mapping and broad-source gating.
- Create: `components/flow/ArtifactPreview.tsx`
  - Renders timeline, routine, spreadsheet, decision, and memo preview blocks from a normalized artifact plan.
- Modify: `components/flow/AppClient.tsx`
  - Replaces scattered top preview logic with `ArtifactPreview`.
  - Keeps existing item list, export, localStorage, and route behavior.
- Modify: `lib/flow/export.ts`
  - Ensures text/spreadsheet export sections match artifact plan priorities.
- Modify: `lib/flow/export.test.ts`
  - Covers spreadsheet-first and comparison-first exports.
- Modify: `tests/e2e/flow-mvp.spec.ts`
  - Adds first-screen proof tests for the five representative patterns.
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`
  - Records implementation choices, verification, and remaining gaps.

## Task 1: Artifact Plan Mapping

**Files:**

- Create: `lib/flow/artifact-plan.ts`
- Create: `lib/flow/artifact-plan.test.ts`
- Modify: `package.json` only if the test command list needs the new test file.

- [ ] **Step 1: Write failing tests for representative mapping**

Create `lib/flow/artifact-plan.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getArtifactPlan } from './artifact-plan';
import { seedBundles } from './seed-flows';

function bundle(slug: string) {
  const found = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(found, `missing seed bundle: ${slug}`);
  return found;
}

test('artifact plan maps moving timeline to list and month calendar first', () => {
  const plan = getArtifactPlan(bundle('moving-d30-basic'));

  assert.equal(plan.primarySurface, 'timeline_calendar');
  assert.deepEqual(plan.surfaces.slice(0, 2).map((surface) => surface.kind), ['execution_list', 'month_calendar']);
  assert.ok(plan.exportTargets.includes('calendar'));
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps used-car checklist to comparison before checklist', () => {
  const plan = getArtifactPlan(bundle('used-car-buying-check'));

  assert.equal(plan.primarySurface, 'decision_table');
  assert.deepEqual(plan.surfaces.slice(0, 2).map((surface) => surface.kind), ['comparison_table', 'execution_list']);
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps exact workout video to routine calendar and condition memo', () => {
  const plan = getArtifactPlan(bundle('real-thankyou-bubu-video-full-body-no-jump'));

  assert.equal(plan.primarySurface, 'routine_calendar');
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'routine_month'));
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'memo_card'));
});

test('artifact plan maps diet tracking to spreadsheet-first log', () => {
  const plan = getArtifactPlan(bundle('real-fitvely-video-body-fat-6kg-method'));

  assert.equal(plan.primarySurface, 'spreadsheet_log');
  assert.equal(plan.surfaces[0].kind, 'spreadsheet_preview');
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'routine_month'));
});

test('artifact plan keeps broad source routes out of representative promotion', () => {
  const plan = getArtifactPlan(bundle('real-fitvely-diet-record-routine'));

  assert.equal(plan.sourceHandling, 'catalog_review');
  assert.equal(plan.canBeRepresentative, false);
  assert.ok(plan.sourceAction.includes('exact'));
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
npx tsx --test lib/flow/artifact-plan.test.ts
```

Expected: FAIL because `lib/flow/artifact-plan.ts` does not exist.

- [ ] **Step 3: Implement artifact plan types and mapping**

Create `lib/flow/artifact-plan.ts`:

```ts
import type { FlowBundle } from './types';
import { getNaturalArtifactAudit } from './natural-artifact-audit';
import { normalizeExecutionModel, type FlowExportTarget } from './execution-model';

export type ArtifactSurfaceKind =
  | 'execution_list'
  | 'month_calendar'
  | 'routine_month'
  | 'spreadsheet_preview'
  | 'comparison_table'
  | 'memo_card';

export type PrimaryArtifactSurface =
  | 'timeline_calendar'
  | 'routine_calendar'
  | 'spreadsheet_log'
  | 'decision_table'
  | 'memo_card'
  | 'checklist';

export type SourceHandling = 'representative_candidate' | 'reshape_before_featured' | 'catalog_review';

export type ArtifactSurface = {
  kind: ArtifactSurfaceKind;
  title: string;
  description: string;
};

export type ArtifactPlan = {
  flowSlug: string;
  primarySurface: PrimaryArtifactSurface;
  sourceHandling: SourceHandling;
  canBeRepresentative: boolean;
  sourceAction: string;
  surfaces: ArtifactSurface[];
  exportTargets: FlowExportTarget[];
};

const decisionToHandling = {
  promote_to_manual_source_fit: 'representative_candidate',
  reshape_content_or_ux: 'reshape_before_featured',
  keep_catalog_review: 'catalog_review',
  replace_or_hide_source: 'catalog_review',
} as const;

function hasArtifact(bundle: FlowBundle, kind: string) {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  return audit?.naturalArtifacts.some((artifact) => artifact.kind === kind) ?? false;
}

function getSourceHandling(bundle: FlowBundle): SourceHandling {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  if (!audit) return 'reshape_before_featured';
  return decisionToHandling[audit.decision];
}

function getPrimarySurface(bundle: FlowBundle): PrimaryArtifactSurface {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  if (bundle.flow.slug === 'used-car-buying-check') return 'decision_table';
  if (hasArtifact(bundle, 'comparison_table') && bundle.flow.structure_type === 'checklist') return 'decision_table';
  if (hasArtifact(bundle, 'spreadsheet')) return 'spreadsheet_log';
  if (hasArtifact(bundle, 'routine_calendar') || bundle.flow.structure_type === 'routine') return 'routine_calendar';
  if (hasArtifact(bundle, 'monthly_calendar') || bundle.flow.structure_type === 'timeline') return 'timeline_calendar';
  if (audit?.naturalArtifacts.some((artifact) => artifact.kind === 'memo')) return 'memo_card';
  return 'checklist';
}

function surface(kind: ArtifactSurfaceKind, title: string, description: string): ArtifactSurface {
  return { kind, title, description };
}

function getSurfaces(primary: PrimaryArtifactSurface): ArtifactSurface[] {
  if (primary === 'decision_table') {
    return [
      surface('comparison_table', '후보 비교표', '선택지를 먼저 비교하고 그 다음 실행 체크리스트로 내려갑니다.'),
      surface('execution_list', '현장 체크리스트', '결정 후 바로 확인할 일을 한 줄씩 체크합니다.'),
    ];
  }
  if (primary === 'spreadsheet_log') {
    return [
      surface('spreadsheet_preview', '기록표', '날짜별 기록 열을 먼저 만들고 주간 리뷰로 이어갑니다.'),
      surface('routine_month', '반복 리마인더', '측정, 운동, 리뷰 일정을 월간으로 확인합니다.'),
      surface('memo_card', '조정 메모', '다음 주에 바꿀 기준을 따로 남깁니다.'),
    ];
  }
  if (primary === 'routine_calendar') {
    return [
      surface('routine_month', '반복 캘린더', '요일별 반복 회차와 쉬는 날을 월간으로 봅니다.'),
      surface('memo_card', '회차 메모', '컨디션, 강도, 다음 회차 조정을 기록합니다.'),
      surface('execution_list', '실행 순서', '원본 콘텐츠의 동작이나 순서를 확인합니다.'),
    ];
  }
  if (primary === 'timeline_calendar') {
    return [
      surface('execution_list', '실행 리스트', '다가오는 할 일을 먼저 훑습니다.'),
      surface('month_calendar', '월간 캘린더', '기준 날짜로 계산된 일정을 한눈에 봅니다.'),
      surface('memo_card', '증빙 메모', '예약, 상담, 제출 증빙을 남깁니다.'),
    ];
  }
  if (primary === 'memo_card') {
    return [
      surface('memo_card', '보관 메모', '나중에 다시 써야 하는 번호, 기준, 증빙을 저장합니다.'),
      surface('execution_list', '체크리스트', '메모를 만들기 위해 확인할 일을 체크합니다.'),
    ];
  }
  return [surface('execution_list', '체크리스트', '지금 확인할 일을 한 줄씩 체크합니다.')];
}

export function getArtifactPlan(bundle: FlowBundle): ArtifactPlan {
  const model = normalizeExecutionModel(bundle);
  const primarySurface = getPrimarySurface(bundle);
  const sourceHandling = getSourceHandling(bundle);
  const audit = getNaturalArtifactAudit(bundle.flow.slug);

  return {
    flowSlug: bundle.flow.slug,
    primarySurface,
    sourceHandling,
    canBeRepresentative: sourceHandling === 'representative_candidate',
    sourceAction:
      sourceHandling === 'catalog_review'
        ? 'Assign an exact source URL before representative promotion.'
        : audit?.nextContentAction ?? 'Keep content aligned to the selected artifact surface.',
    surfaces: getSurfaces(primarySurface),
    exportTargets: model.exportTargets,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
npx tsx --test lib/flow/artifact-plan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the new test file to `npm test`**

Modify `package.json` test script by appending:

```text
lib/flow/artifact-plan.test.ts
```

- [ ] **Step 6: Run all unit tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add package.json lib/flow/artifact-plan.ts lib/flow/artifact-plan.test.ts
git commit -m "feat: add artifact plan mapping"
```

## Task 2: Artifact Preview Component

**Files:**

- Create: `components/flow/ArtifactPreview.tsx`
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Write failing E2E assertions for first-screen artifact proof**

Modify `tests/e2e/flow-mvp.spec.ts` by adding a test near the existing public Flow tests:

```ts
test('representative flows show artifact-first previews on the first screen', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  await expect(page.getByText('실행 리스트')).toBeVisible();
  await expect(page.getByText('월간 캘린더')).toBeVisible();

  await page.goto('/f/used-car-buying-check');
  await expect(page.getByText('후보 비교표')).toBeVisible();
  await expect(page.getByText('현장 체크리스트')).toBeVisible();

  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');
  await expect(page.getByText('반복 캘린더')).toBeVisible();
  await expect(page.getByText('회차 메모')).toBeVisible();

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  await expect(page.getByText('기록표')).toBeVisible();
  await expect(page.getByText('반복 리마인더')).toBeVisible();
});
```

- [ ] **Step 2: Run focused E2E and confirm RED**

Run:

```powershell
npm run test:e2e -- --grep "artifact-first previews"
```

Expected: FAIL because `ArtifactPreview` is not yet rendered.

- [ ] **Step 3: Implement `ArtifactPreview`**

Create `components/flow/ArtifactPreview.tsx`:

```tsx
'use client';

import type { FlowBundle } from '@/lib/flow/types';
import { getArtifactPlan } from '@/lib/flow/artifact-plan';

export function ArtifactPreview({ bundle }: { bundle: FlowBundle }) {
  const plan = getArtifactPlan(bundle);

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4" aria-label="Flow artifact preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">이 Flow가 만들어주는 것</p>
          <h2 className="mt-1 text-lg font-semibold text-gray-950">{plan.surfaces[0]?.title ?? '실행 리스트'}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          {plan.sourceHandling === 'catalog_review' ? '원본 보강 필요' : '실행 산출물'}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {plan.surfaces.slice(0, 3).map((surface) => (
          <article key={surface.kind} className="rounded-lg border border-blue-100 bg-white p-3">
            <h3 className="text-sm font-semibold text-gray-950">{surface.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{surface.description}</p>
          </article>
        ))}
      </div>
      {plan.sourceHandling === 'catalog_review' ? (
        <p className="mt-3 text-xs leading-5 text-blue-800">{plan.sourceAction}</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Render the preview in public Flow detail**

Modify `components/flow/AppClient.tsx`:

```tsx
import { ArtifactPreview } from './ArtifactPreview';
```

Then render below the existing top execution setup area and before the full item list:

```tsx
<ArtifactPreview bundle={bundle} />
```

Place it near the current `TopExecutionPreview` block so the first screen shows the artifact promise before deep sections.

- [ ] **Step 5: Run focused E2E and confirm GREEN**

Run:

```powershell
npm run test:e2e -- --grep "artifact-first previews"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/flow/ArtifactPreview.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: show artifact-first flow previews"
```

## Task 3: Spreadsheet-First Export Alignment

**Files:**

- Modify: `lib/flow/export.ts`
- Modify: `lib/flow/export.test.ts`

- [ ] **Step 1: Write failing export tests**

Add to `lib/flow/export.test.ts`:

```ts
test('diet log text export starts with record table guidance', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  assert.ok(bundle);

  const text = buildText(bundle, {}, null, {}, undefined);

  assert.match(text, /기록표|식단|측정/);
});

test('decision text export includes comparison section before checklist items', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');
  assert.ok(bundle);

  const text = buildText(bundle, {}, null, {}, {
    candidates: [
      { id: 'candidate-1', name: '후보 A' },
      { id: 'candidate-2', name: '후보 B' },
    ],
    notes: {},
  });

  assert.ok(text.indexOf('후보 비교') > -1);
  assert.ok(text.indexOf('후보 비교') < text.indexOf('체크리스트'));
});
```

- [ ] **Step 2: Run export tests and confirm RED if behavior is missing**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: FAIL if diet guidance or comparison ordering is missing.

- [ ] **Step 3: Implement minimal export ordering**

Modify `lib/flow/export.ts` so `buildText` checks `getArtifactPlan(bundle)`:

```ts
const artifactPlan = getArtifactPlan(bundle);
if (artifactPlan.primarySurface === 'spreadsheet_log') {
  lines.push('## 기록표');
  lines.push('날짜별 식단, 운동, 측정, 컨디션을 기록하세요.');
}
```

Ensure decision comparison text is appended before checklist lines when `artifactPlan.primarySurface === 'decision_table'`.

- [ ] **Step 4: Run export tests**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all unit tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/flow/export.ts lib/flow/export.test.ts
git commit -m "feat: align exports with artifact priorities"
```

## Task 4: Flow Lab And Source Gating Copy

**Files:**

- Modify: `components/flow/ContentLab.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Write failing E2E for source gating copy**

Add to the Flow Lab E2E:

```ts
await expect(page.getByText('exact source')).toBeVisible();
await expect(page.getByText('catalog review')).toBeVisible();
```

- [ ] **Step 2: Run focused E2E and confirm RED**

Run:

```powershell
npm run test:e2e -- --grep "flow lab shows converted pilot"
```

Expected: FAIL if Flow Lab does not expose exact-source gating language.

- [ ] **Step 3: Add source gating copy to Flow Lab**

In `components/flow/ContentLab.tsx`, update the natural artifact audit section copy:

```tsx
<p className="mt-2 text-sm leading-6 text-gray-600">
  Broad channel/site sources stay in catalog review until an exact source URL is assigned.
</p>
```

Use the existing decision labels, but ensure `keep_catalog_review` is visibly explained as `catalog review`.

- [ ] **Step 4: Run focused E2E**

Run:

```powershell
npm run test:e2e -- --grep "flow lab shows converted pilot"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/flow/ContentLab.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: explain exact source gating"
```

## Task 5: Final Verification And PR History

**Files:**

- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [ ] **Step 1: Update PR history**

Add:

- artifact plan mapping
- artifact-first preview component
- spreadsheet/decision export alignment
- source gating copy
- commands run and results
- remaining gaps

- [ ] **Step 2: Run documentation check**

Run:

```powershell
npm run docs:check
```

Expected: PASS.

- [ ] **Step 3: Run unit tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run focused E2E**

Run:

```powershell
npm run test:e2e -- --grep "artifact-first previews|flow lab shows converted pilot"
```

Expected: PASS.

- [ ] **Step 6: Run full E2E**

Run:

```powershell
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit PR history**

```powershell
git add docs/pr-history/2026-05-22-flow-item-card-ux.md
git commit -m "docs: record artifact-first ux implementation"
```

- [ ] **Step 8: Push**

```powershell
git push origin codex/flow-item-card-ux
```

Expected: branch updates on GitHub and Vercel deploy starts if the project is connected to the branch.
