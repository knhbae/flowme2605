# Artifact Workbench v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-screen `내 실행판` that shows the actual checklist, calendar, routine, record table, or comparison artifact each Flow produces.

**Architecture:** Add `components/flow/ArtifactWorkbench.tsx` as a focused client component. It reads `getArtifactPlan(bundle)` and renders the primary artifact surface using existing client state passed from `AppClient`. `AppClient` keeps ownership of localStorage, export, item check, memo, skip, and route state.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS, Playwright E2E, existing FLOW seed/state/export helpers.

---

## File Structure

- Create: `components/flow/ArtifactWorkbench.tsx`
  - Renders `내 실행판` for timeline, decision, routine, spreadsheet-log, and checklist primary surfaces.
  - Owns small display-only date/recurrence helpers local to the component.
  - Supports decision candidate editing by calling `onComparisonChange`.
- Modify: `components/flow/AppClient.tsx`
  - Import and render `ArtifactWorkbench` immediately after the setup/progress/export block.
  - Move creator/source/warning blocks below the main execution/list area.
  - Remove the old `TopExecutionPreview` render to avoid duplicate comparison/routine/timeline preview blocks.
- Modify: `tests/e2e/flow-mvp.spec.ts`
  - Add first-screen Workbench assertions for timeline, decision, routine, and spreadsheet-log surfaces.
  - Adjust any selectors made ambiguous by the new `내 실행판`.
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`
  - Record the Workbench v1 implementation, verification, and remaining gaps.

## Task 1: First-Screen Workbench E2E

**Files:**

- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Write failing E2E for Workbench surfaces**

Add a test near the existing artifact-first preview test:

```ts
test('artifact workbench shows the primary usable surface first', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');
  let workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('내 실행판');
  await expect(workbench).toContainText('전체 할 일');
  await expect(workbench).toContainText('월간 캘린더');

  await page.goto('/f/used-car-buying-check');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('후보 비교표');
  await expect(workbench.getByLabel('후보 1 이름')).toBeVisible();

  await page.goto('/f/home-workout-20min');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('반복 캘린더');
  await expect(workbench).toContainText('회차');

  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');
  workbench = page.getByLabel('Flow artifact workbench');
  await expect(workbench).toBeVisible();
  await expect(workbench).toContainText('기록표');
  await expect(workbench).toContainText('식단');
  await expect(workbench).toContainText('운동');
  await expect(workbench).toContainText('측정');
  await expect(workbench).toContainText('컨디션');
});
```

- [ ] **Step 2: Run focused E2E and confirm RED**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench"
```

Expected: FAIL because `Flow artifact workbench` does not exist yet.

- [ ] **Step 3: Commit RED test**

Do not commit the failing test alone. Keep it staged for the implementation commit.

## Task 2: ArtifactWorkbench Component

**Files:**

- Create: `components/flow/ArtifactWorkbench.tsx`
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Implement component contract**

Create `components/flow/ArtifactWorkbench.tsx` with:

```tsx
'use client';

import { addDays, formatDate, getRangeEnd } from '@/lib/flow/date';
import { getArtifactPlan } from '@/lib/flow/artifact-plan';
import { timingLabel } from '@/lib/flow/parser';
import type { FlowBundle, FlowComparisonState, FlowItemState } from '@/lib/flow/types';

export function ArtifactWorkbench(props: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
}) {
  const plan = getArtifactPlan(props.bundle);

  return (
    <section aria-label="Flow artifact workbench" className="my-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-blue-700">내 실행판</p>
      {/* Render by plan.primarySurface */}
    </section>
  );
}
```

Then fill in focused renderers:

- `timeline_calendar`: list rows + mini month calendar
- `decision_table`: editable candidate table + checklist preview
- `routine_calendar`: recurrence month calendar + next session summary
- `spreadsheet_log`: 7-row record table + weekly review memo
- default `checklist`: first 10 checklist rows

- [ ] **Step 2: Wire Workbench in AppClient**

In `components/flow/AppClient.tsx`:

```tsx
import { ArtifactWorkbench } from './ArtifactWorkbench';
```

Render it after the setup/progress/export section:

```tsx
<ArtifactWorkbench
  bundle={bundle}
  anchor={displayAnchor}
  weekdays={weekdaySelection}
  checks={checks}
  itemStates={itemStates}
  comparisonState={comparisonState}
  onComparisonChange={setComparisonState}
/>
```

Remove the existing `TopExecutionPreview ...` render line. Keep the helper function in this pass if deleting it creates too much churn.

- [ ] **Step 3: Move source/creator info below execution surface**

Move these blocks to after the main renderer branch:

- Creator card
- `SourceContentCard`
- warning banner

This makes the first screen focus on setup + Workbench before provenance details.

- [ ] **Step 4: Run focused E2E and confirm GREEN**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench"
```

Expected: PASS.

- [ ] **Step 5: Run related focused E2E**

Run:

```powershell
npm run test:e2e -- --grep "artifact-first previews|decision flow comparison|routine flow highlights|used-car checklist"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/flow/ArtifactWorkbench.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: add artifact workbench"
```

## Task 3: Documentation And Verification

**Files:**

- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [ ] **Step 1: Update PR history**

Add:

- Workbench v1 summary
- files changed
- verification commands
- remaining gaps: no occurrence-level persistence, no API integrations, no full catalog migration

- [ ] **Step 2: Run docs check**

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

- [ ] **Step 5: Run full E2E**

Run:

```powershell
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit docs**

```powershell
git add docs/pr-history/2026-05-22-flow-item-card-ux.md
git commit -m "docs: record artifact workbench v1"
```

- [ ] **Step 7: Push and open PR**

```powershell
git push -u origin codex/artifact-workbench-v1
```

Open a PR to `main` with summary, verification, not-done items, and deployment status.

