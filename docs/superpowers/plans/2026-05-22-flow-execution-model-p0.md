# FLOW Execution Model P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore FLOW's core execution promise in the current demo: representative flows show a visible list spine, date/routine flows show calendar preview, routine/program flows show recurrence, and existing content is classified without deleting legacy data.

**Architecture:** Add a small execution-model normalization layer and recurrence helper under `lib/flow/`, then connect them to the existing `AppClient.tsx` UI. Keep Stage 0 client-only behavior and localStorage persistence. Do not add login, DB, external APIs, or copyright handling in this pass.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage, node:test, Playwright E2E.

---

## File Structure

- Create: `lib/flow/execution-model.ts`
  - Classifies a `FlowBundle` into `uxType`, `exposureStatus`, enabled views, export targets, and migration gaps.
  - Defines representative Flow slugs for landing and P0 QA.

- Create: `lib/flow/execution-model.test.ts`
  - Verifies classification for P0 representative flows, preview catalog flows, exact-video mini flows, and checklist/timeline/routine view sets.

- Create: `lib/flow/recurrence.ts`
  - Expands simple routine recurrence previews for daily, weekly, monthly, and program-like weekly sessions.

- Create: `lib/flow/recurrence.test.ts`
  - Verifies monthly calendar occurrence generation for routine/program flows.

- Modify: `components/flow/AppClient.tsx`
  - Use representative slugs for landing featured cards.
  - Add list preview and export target preview to Flow cards.
  - Default dated/routine flows to sample mode when the user has not entered a date.
  - Add compact output preview near the top of Flow detail.
  - Add routine/program monthly view.

- Modify: `package.json`
  - Include the two new unit test files in `npm test`.

- Modify: `tests/e2e/flow-mvp.spec.ts`
  - Add/adjust focused expectations for landing representative cards, moving sample calendar/list preview, running routine recurrence preview, used-car decision preview.

- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`
  - Record the product pivot, documents, implementation scope, not-done items, and verification.

---

### Task 1: Add Execution Model Tests

**Files:**
- Create: `lib/flow/execution-model.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that assert:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRepresentativeFlowSlugs,
  normalizeExecutionModel,
} from './execution-model';
import { seedBundles } from './seed-flows';

function bySlug(slug: string) {
  const bundle = seedBundles.find((item) => item.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

test('P0 representative flows are explicitly classified for landing and QA', () => {
  assert.deepEqual(getRepresentativeFlowSlugs(), [
    'moving-d30-basic',
    'used-car-buying-check',
    'running-5k-4week',
    'baby-food-menu-recipe',
    'overseas-travel-d14',
  ]);

  for (const slug of getRepresentativeFlowSlugs()) {
    assert.equal(normalizeExecutionModel(bySlug(slug)).exposureStatus, 'representative', slug);
  }
});

test('execution model maps representative flows to the correct UX views', () => {
  assert.equal(normalizeExecutionModel(bySlug('moving-d30-basic')).uxType, 'timeline');
  assert.deepEqual(normalizeExecutionModel(bySlug('moving-d30-basic')).views, [
    'list',
    'agenda',
    'month_calendar',
    'export_preview',
  ]);

  assert.equal(normalizeExecutionModel(bySlug('used-car-buying-check')).uxType, 'decision');
  assert.ok(normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('comparison_table'));
  assert.ok(!normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('running-5k-4week')).uxType, 'program');
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('routine_sessions'));
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).uxType, 'meal_plan');
  assert.ok(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).views.includes('agenda'));
});

test('preview and exact-video flows do not pollute representative landing set', () => {
  const preview = seedBundles.find((bundle) => bundle.flow.source_status === 'preview');
  assert.ok(preview);
  assert.equal(normalizeExecutionModel(preview).exposureStatus, 'catalog_preview');

  const exact = bySlug('real-thankyou-bubu-video-daily-stretch-9min');
  const model = normalizeExecutionModel(exact);
  assert.equal(model.uxType, 'mini_flow');
  assert.equal(model.exposureStatus, 'catalog_preview');
  assert.deepEqual(model.views, ['list', 'export_preview']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test lib/flow/execution-model.test.ts
```

Expected: fails because `./execution-model` does not exist.

---

### Task 2: Implement Execution Model

**Files:**
- Create: `lib/flow/execution-model.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement minimal model**

Create `normalizeExecutionModel(bundle)` with:

- `representative` for the five P0 slugs.
- `catalog_preview` for `source_status === 'preview'`.
- `mini_flow` for exact-video one-action real flows.
- `meal_plan` for `content_type === 'meal_plan'`.
- `program` for `running-5k-4week`.
- `decision` for `used-car-buying-check`, `wedding-d180-basic`, `job-change-risk-check`.
- fallback by `structure_type`.

- [ ] **Step 2: Add test file to package test script**

Include `lib/flow/execution-model.test.ts` in `npm test`.

- [ ] **Step 3: Run unit test**

Run:

```powershell
npx tsx --test lib/flow/execution-model.test.ts
```

Expected: pass.

---

### Task 3: Add Recurrence Tests

**Files:**
- Create: `lib/flow/recurrence.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that assert:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { expandRoutineOccurrences, getRoutineWeekdayLabels } from './recurrence';

test('weekly routine expands selected weekdays across the preview window', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '주 3회',
    weekdays: ['월', '수', '금'],
    weeks: 2,
  });

  assert.deepEqual(occurrences.map((item) => item.date), [
    '2026-06-01',
    '2026-06-03',
    '2026-06-05',
    '2026-06-08',
    '2026-06-10',
    '2026-06-12',
  ]);
});

test('daily routine expands every day', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '매일 30분',
    weekdays: ['월', '수', '금'],
    weeks: 1,
  });

  assert.equal(occurrences.length, 7);
  assert.equal(occurrences[6].date, '2026-06-07');
});

test('weekday label helper falls back to sensible defaults', () => {
  assert.deepEqual(getRoutineWeekdayLabels('주 3회', []), ['월', '수', '금']);
  assert.deepEqual(getRoutineWeekdayLabels('매일', []), ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual(getRoutineWeekdayLabels('월 1회', []), ['월']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test lib/flow/recurrence.test.ts
```

Expected: fails because `./recurrence` does not exist.

---

### Task 4: Implement Recurrence

**Files:**
- Create: `lib/flow/recurrence.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement recurrence helpers**

Add:

- `getRoutineWeekdayLabels(repeatLabel, selectedWeekdays)`
- `expandRoutineOccurrences({ startDate, repeatLabel, weekdays, weeks })`

Use Korean weekdays and local date math.

- [ ] **Step 2: Add test file to package test script**

Include `lib/flow/recurrence.test.ts` in `npm test`.

- [ ] **Step 3: Run unit test**

Run:

```powershell
npx tsx --test lib/flow/recurrence.test.ts
```

Expected: pass.

---

### Task 5: Write E2E Expectations For P0 UX

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add focused failing expectations**

Add/adjust expectations:

- Home landing shows representative P0 cards including `이사 D-30`, `중고차 구매`, `초보 러너`, `초기 이유식`, `해외여행`.
- Home Flow cards show at least one checklist preview line with `미리보기`.
- Moving Flow starts in sample mode and shows `월별 달력 preview` plus visible checklist items before date entry.
- Running Flow shows `반복 달력 preview`, `한 회차에 하는 일`, and `월별 달력`.
- Used-car Flow shows `후보 비교 preview` and no calendar tab by default.

- [ ] **Step 2: Run focused E2E to verify failure**

Run:

```powershell
npm run test:e2e -- --grep "home presents|public moving flow|routine flow highlights|no-anchor checklist"
```

Expected: fails on new expectations before UI implementation.

---

### Task 6: Implement Landing/Card P0 UX

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Import execution model**

Use `getRepresentativeFlowSlugs`, `normalizeExecutionModel`.

- [ ] **Step 2: Update landing featured selection**

Landing featured cards use P0 representative slugs, not old study/wedding default list.

- [ ] **Step 3: Update FlowCard**

Add:

- `미리보기` list of first 3 item titles or meal slots.
- `출력:` line from export targets.
- `Catalog Preview` source status still visible as sample on channel/catalog cards.

- [ ] **Step 4: Run focused E2E**

Run same focused E2E. Expected: home/card expectations pass; detail expectations may still fail.

---

### Task 7: Implement Detail First-Screen Preview

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Default dated and routine flows to sample mode**

When no stored anchor exists and `anchor_type !== 'none'`, default to `example`.

- [ ] **Step 2: Add `TopOutputPreview`**

Show:

- Timeline/meal: `월별 달력 preview`.
- Routine/program: `반복 달력 preview`.
- Checklist/decision: `후보 비교 preview` for used car, otherwise export preview.

- [ ] **Step 3: Add `ExecutionSpinePreview`**

Show first 5 execution items near top before the full section renderer.

- [ ] **Step 4: Run focused E2E**

Expected: moving/used-car first-screen expectations pass.

---

### Task 8: Implement Routine Month Preview

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Import recurrence helpers**

Use `expandRoutineOccurrences` and `getRoutineWeekdayLabels`.

- [ ] **Step 2: Change routine view set**

Routine views become:

- `전체 루틴`
- `월별 달력`

Program/running still uses routine structure but shows `한 회차에 하는 일`.

- [ ] **Step 3: Add `RoutineMonthRenderer`**

Render generated occurrences on a month grid using selected weekdays and sample/default anchor.

- [ ] **Step 4: Run focused E2E**

Expected: running routine expectations pass.

---

### Task 9: Docs, PR History, And Verification

**Files:**
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [ ] **Step 1: Force-add ignored docs before final commit/PR update**

Run:

```powershell
git add -f docs/superpowers/specs/2026-05-22-flow-execution-model-redesign.md `
  docs/superpowers/specs/2026-05-22-flow-execution-model-wireframes.md `
  docs/superpowers/specs/2026-05-22-existing-flow-content-migration.md `
  docs/superpowers/plans/2026-05-22-flow-execution-model-p0.md
```

- [ ] **Step 2: Run verification**

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

- [ ] **Step 3: Update PR history**

Record:

- Product pivot.
- New docs.
- Implementation changes.
- Tests/build/e2e results.
- Not done: full 511 migration, DB schema, login sync, external calendar API, copyright policy.

