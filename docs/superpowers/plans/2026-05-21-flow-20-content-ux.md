# Flow 20 Content UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the 20 real-source creator-channel Flow bundles with tailored item details and improve the public UX around source confidence and first actions.

**Architecture:** Keep the current static seed architecture. Add optional source precision to the shared Flow type, enrich the real-source batch in place, and surface the new metadata through existing React components. Tests should guard that the 20 manually sourced flows do not regress into generic generated content.

**Tech Stack:** Next.js App Router, React, TypeScript, Node test runner, Playwright.

---

## File Structure

- Modify `lib/flow/types.ts`
  - Add `SourcePrecision`.
  - Add optional `source_precision` to `Flow`.
- Modify `lib/flow/real-source-channel-batch.ts`
  - Replace `actions: string[]` with `actions: RealSourceAction[]`.
  - Generate items from `action.title`.
  - Generate details from each structured action.
  - Add `source_precision` to every real-source spec.
- Modify `components/flow/AppClient.tsx`
  - Add source-status and source-precision label helpers.
  - Localize real/preview/review labels.
  - Show first action on Flow cards.
  - Show source checked date, conversion note, and precision on public Flow pages.
  - Improve no-anchor checklist copy.
- Modify `lib/flow/seed-flows.test.ts`
  - Assert all 20 real-source flows include source precision.
  - Assert each real-source flow has exactly 5 items and 5 details.
  - Assert detail fields are tailored per item.
- Modify `tests/e2e/flow-mvp.spec.ts`
  - Update label expectations from English to Korean.
  - Add source panel and first-action expectations.

---

### Task 1: Add Failing Data Quality Tests

**Files:**
- Modify: `lib/flow/seed-flows.test.ts`

- [ ] **Step 1: Replace the real-source attribution test with stricter assertions**

Find the test named `real source-backed flows include attribution and executable details` and replace it with:

```ts
test('real source-backed flows include precision and tailored executable details', () => {
  const real = seedBundles.filter((bundle) => bundle.flow.source_status === 'real');
  assert.ok(real.length >= 20);

  for (const bundle of real) {
    assert.ok(bundle.flow.source_url, `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_title, `${bundle.flow.slug} missing source_title`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(bundle.flow.conversion_note, `${bundle.flow.slug} missing conversion_note`);
    assert.ok(bundle.flow.source_precision, `${bundle.flow.slug} missing source_precision`);
    assert.ok(['exact', 'broad'].includes(bundle.flow.source_precision), bundle.flow.slug);
    assert.equal(bundle.items.length, 5, `${bundle.flow.slug} expected exactly 5 items`);
    assert.equal(bundle.itemDetails?.length, 5, `${bundle.flow.slug} expected exactly 5 item details`);

    const detailByItem = new Map(bundle.itemDetails?.map((detail) => [detail.item_id, detail]));
    const whyTexts = new Set<string>();
    const howTexts = new Set<string>();
    const completionTexts = new Set<string>();

    for (const item of bundle.items) {
      const detail = detailByItem.get(item.id);
      assert.ok(detail, `${bundle.flow.slug} missing detail for ${item.title}`);
      assert.ok(detail.why && detail.why.length >= 20, `${bundle.flow.slug} weak why for ${item.title}`);
      assert.ok(detail.how && detail.how.length >= 20, `${bundle.flow.slug} weak how for ${item.title}`);
      assert.ok(
        detail.completion_criteria && detail.completion_criteria.length >= 15,
        `${bundle.flow.slug} weak completion criteria for ${item.title}`,
      );
      assert.ok(detail.links?.length, `${bundle.flow.slug} missing detail link for ${item.title}`);
      whyTexts.add(detail.why);
      howTexts.add(detail.how);
      completionTexts.add(detail.completion_criteria);
    }

    assert.ok(whyTexts.size >= 4, `${bundle.flow.slug} uses generic why text`);
    assert.ok(howTexts.size >= 4, `${bundle.flow.slug} uses generic how text`);
    assert.ok(completionTexts.size >= 4, `${bundle.flow.slug} uses generic completion text`);
  }
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
npm test -- --test-name-pattern "real source-backed flows include precision"
```

Expected: FAIL because `source_precision` is not defined yet and item details are generic.

- [ ] **Step 3: Commit the failing test**

```powershell
git add lib/flow/seed-flows.test.ts
git commit -m "test: tighten real source flow content quality"
```

---

### Task 2: Add Source Precision Type

**Files:**
- Modify: `lib/flow/types.ts`

- [ ] **Step 1: Add the shared type**

In `lib/flow/types.ts`, below `SourceStatus`, add:

```ts
export type SourcePrecision = 'exact' | 'broad';
```

Then add this optional field to `Flow` near the existing source metadata:

```ts
source_precision?: SourcePrecision;
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npm test -- --test-name-pattern "real source-backed flows include precision"
```

Expected: still FAIL because the data does not yet populate `source_precision`.

- [ ] **Step 3: Commit the type change**

```powershell
git add lib/flow/types.ts
git commit -m "feat: add source precision metadata"
```

---

### Task 3: Convert Real-Source Batch to Structured Actions

**Files:**
- Modify: `lib/flow/real-source-channel-batch.ts`

- [ ] **Step 1: Import the new type**

Update the import from `./types` to include:

```ts
SourcePrecision,
```

- [ ] **Step 2: Add `RealSourceAction`**

Above `RealSourceSpec`, add:

```ts
type RealSourceAction = {
  title: string;
  why: string;
  how: string;
  completion_criteria: string;
  caution?: string;
  link_label?: string;
  link_url?: string;
};
```

- [ ] **Step 3: Update `RealSourceSpec`**

Change:

```ts
actions: string[];
```

to:

```ts
source_precision: SourcePrecision;
actions: RealSourceAction[];
```

- [ ] **Step 4: Generate items from action titles**

In `makeItems`, change the map callback from:

```ts
return spec.actions.map((title, index) => ({
```

to:

```ts
return spec.actions.map((action, index) => ({
```

Then change:

```ts
title,
```

to:

```ts
title: action.title,
```

Also replace the item description with a clear user-facing description:

```ts
description: `${spec.source_title} 기준으로 실행할 항목입니다.`,
```

- [ ] **Step 5: Generate details from structured actions**

Replace `makeDetails` with:

```ts
function makeDetails(spec: RealSourceSpec, items: FlowItem[]): FlowItemDetail[] {
  const linkType =
    spec.source_type === 'official'
      ? 'official'
      : spec.source_type === 'creator_experience'
        ? 'creator'
        : 'reference';

  return items.map((item, index) => {
    const action = spec.actions[index];
    return {
      item_id: item.id,
      why: action.why,
      how: action.how,
      completion_criteria: action.completion_criteria,
      caution: action.caution ?? spec.warning,
      links: [
        {
          label: action.link_label ?? spec.source_title,
          url: action.link_url ?? spec.source_url,
          type: linkType,
        },
      ],
    };
  });
}
```

- [ ] **Step 6: Add source precision to bundle output**

In `buildBundle`, add:

```ts
source_precision: spec.source_precision,
```

near `source_status: 'real'`.

- [ ] **Step 7: Convert all 20 specs**

For each spec in `realSourceSpecs`, add:

```ts
source_precision: 'exact',
```

or:

```ts
source_precision: 'broad',
```

Use `broad` for channel/homepage surfaces such as YouTube channels, creator sites, and index pages. Use `exact` for specific official or reference pages.

Replace every `actions: ['...', '...']` list with five action objects:

```ts
actions: [
  {
    title: '사용자가 실제로 할 첫 번째 행동',
    why: '이 단계가 필요한 이유를 해당 Flow 맥락에 맞게 설명합니다.',
    how: '사용자가 지금 어떤 화면, 문서, 물건, 기록을 확인하면 되는지 구체적으로 씁니다.',
    completion_criteria: '완료 여부를 눈으로 확인할 수 있는 기준을 씁니다.',
    caution: '민감하거나 출처가 넓은 경우 주의할 점을 씁니다.',
  },
]
```

No spec should keep plain string actions.

- [ ] **Step 8: Run the focused test**

Run:

```powershell
npm test -- --test-name-pattern "real source-backed flows include precision"
```

Expected: PASS.

- [ ] **Step 9: Commit the data model and content conversion**

```powershell
git add lib/flow/real-source-channel-batch.ts
git commit -m "feat: tailor real source flow details"
```

---

### Task 4: Improve User-Facing UX

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Add source label helpers**

Near `getSourceStatusLabel`, replace that function with:

```ts
function getSourceStatusLabel(bundle: FlowBundle) {
  if (bundle.flow.source_status === 'real') return '출처 확인';
  if (bundle.flow.source_status === 'preview') return '샘플';
  if (bundle.flow.source_status === 'needs_review') return '검수 필요';
  return bundle.flow.source_url ? '출처 연결' : '초안';
}

function getSourcePrecisionLabel(bundle: FlowBundle): string | undefined {
  if (bundle.flow.source_precision === 'exact') return '정확한 출처 페이지';
  if (bundle.flow.source_precision === 'broad') return '넓은 출처';
  return undefined;
}

function getFirstActionTitle(bundle: FlowBundle): string | undefined {
  return bundle.items.find((item) => item.is_active !== false)?.title ?? bundle.items[0]?.title;
}
```

If `FlowItem` has no `is_active` field in TypeScript, use this instead:

```ts
function getFirstActionTitle(bundle: FlowBundle): string | undefined {
  return bundle.items[0]?.title;
}
```

- [ ] **Step 2: Localize directory and profile stats**

Replace visible `Real source` stat labels with `출처 확인`.

Replace visible `Preview` stat labels with `샘플`.

Replace the filter labels:

```ts
['real', 'Real source'],
['preview', 'Preview'],
```

with:

```ts
['real', '출처 확인'],
['preview', '샘플'],
```

- [ ] **Step 3: Show first action on flow cards**

In the card component that renders each Flow link and metadata, compute:

```ts
const firstActionTitle = getFirstActionTitle(bundle);
```

Then render this compact line inside the card body:

```tsx
{firstActionTitle ? (
  <p className="text-sm text-gray-700">
    <span className="font-semibold text-gray-900">첫 행동:</span> {firstActionTitle}
  </p>
) : null}
```

- [ ] **Step 4: Show source precision in badges**

Inside `FlowBadges`, compute:

```ts
const sourcePrecisionLabel = getSourcePrecisionLabel(bundle);
```

Then add:

```tsx
{sourcePrecisionLabel ? (
  <Badge className="border-indigo-100 bg-indigo-50 text-indigo-800">{sourcePrecisionLabel}</Badge>
) : null}
```

- [ ] **Step 5: Improve no-anchor copy**

Change the `getAnchorLabel` branch for `anchor_type === 'none'` to:

```ts
if (bundle.flow.anchor_type === 'none') return '날짜 입력 없이 바로 체크';
```

- [ ] **Step 6: Improve public source panel**

On the public Flow page, near the source link block, render:

```tsx
{bundle.flow.source_checked_at ? (
  <p className="text-sm text-gray-600">출처 확인일: {bundle.flow.source_checked_at}</p>
) : null}
{bundle.flow.conversion_note ? (
  <p className="text-sm text-gray-600">Flow 전환 방식: {bundle.flow.conversion_note}</p>
) : null}
{getSourcePrecisionLabel(bundle) ? (
  <p className="text-sm text-gray-600">출처 정밀도: {getSourcePrecisionLabel(bundle)}</p>
) : null}
```

- [ ] **Step 7: Run TypeScript build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit UX changes**

```powershell
git add components/flow/AppClient.tsx
git commit -m "feat: improve real source flow ux"
```

---

### Task 5: Update E2E Coverage

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Update English label expectations**

Replace assertions for:

```ts
Real source
Preview
Needs review
```

with the Korean labels:

```ts
출처 확인
샘플
검수 필요
```

- [ ] **Step 2: Add card first-action assertion**

In `creator channel can filter real source-backed flows`, after loading `/u/samsung-service`, add:

```ts
await expect(page.getByText('첫 행동:').first()).toBeVisible();
```

- [ ] **Step 3: Add public source panel assertion**

In `preview creator flow route opens encoded Korean slug`, or a new test for `/f/real-samsung-aircon-seasonal-care`, add:

```ts
await page.goto('/f/real-samsung-aircon-seasonal-care');
await expect(page.getByText('출처 확인일: 2026-05-21')).toBeVisible();
await expect(page.getByText('Flow 전환 방식:')).toBeVisible();
await expect(page.getByText('출처 정밀도: 정확한 출처 페이지')).toBeVisible();
await expect(page.getByText('첫 행동:').first()).toBeVisible();
```

- [ ] **Step 4: Run E2E tests**

Run:

```powershell
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 5: Commit E2E updates**

```powershell
git add tests/e2e/flow-mvp.spec.ts
git commit -m "test: cover real source flow ux"
```

---

### Task 6: Final Verification

**Files:**
- No direct file edits expected.

- [ ] **Step 1: Run unit tests**

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run E2E**

```powershell
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Inspect git status**

```powershell
git status --short --branch
```

Expected: clean working tree on `codex/flow-20-content-ux`, ahead of `origin/main`.

- [ ] **Step 5: Final report**

Report:

- 20 real-source flows now have tailored item details.
- UX labels are Korean and user-facing.
- Source precision and conversion metadata are visible.
- This is heuristic UX/content QA, not real-user validation.
- List the verification commands and outcomes.
