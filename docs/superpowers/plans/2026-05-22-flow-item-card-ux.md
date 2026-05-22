# Flow Item Card UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Improve Flow item cards so users can clearly scan, check, expand, memo, and skip tasks on timeline, routine, and checklist Flow pages.

**Architecture:** Keep the change scoped to the existing `components/flow/AppClient.tsx` renderers. Introduce small shared item-card helpers inside the same file to avoid a broad component split in this PR, then update tests and PR history.

**Tech Stack:** Next.js 15, React 19, TypeScript, Playwright E2E, Node test runner.

---

### Task 1: Capture Expected Item Card Behavior

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [x] **Step 1: Add failing E2E assertions**

Add assertions to the existing wedding Flow test so it proves:

```ts
const firstCard = page.locator('[data-testid="flow-item-card"]').first();
await expect(firstCard.getByLabel(/완료: /)).toBeVisible();
await expect(firstCard.getByRole('button', { name: '메모 추가' })).toBeVisible();
await expect(firstCard.getByRole('button', { name: '해당 없음' })).toBeVisible();
await expect(firstCard.getByRole('button', { name: '자세히' })).toBeVisible();
await expect(firstCard.getByText(/D-180/)).toBeVisible();
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm run test:e2e -- --grep "wedding flow answers"
```

Expected: fail because the current item card uses old labels and layout affordances.

### Task 2: Implement Shared Item Card UI

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [x] **Step 1: Add shared helpers**

Add compact helpers near the existing item detail helpers:

```tsx
function ItemMetaText({ timing, date }: { timing: string; date?: string }) {
  return <span className="text-xs font-semibold text-gray-500">{[timing, date].filter(Boolean).join(' · ')}</span>;
}
```

- [x] **Step 2: Update item card shells**

Update `TimelineRenderer`, `RoutineRenderer`, and `ChecklistRenderer` so each card has:

- left aligned checkbox with `aria-label="완료: {item.title}"`
- title beside checkbox
- timing/date meta on the right
- clear action row with `메모 추가` or `메모`, `해당 없음`, and `자세히`/`접기`

- [x] **Step 3: Move duplicate completion text into details only**

Keep short descriptions visible only when they are not duplicate completion criteria. Completion criteria remains inside the expanded detail panel.

### Task 3: Improve Memo And Skip Affordance

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [x] **Step 1: Make memo collapsed by default**

Show a button first:

```tsx
<button type="button">메모 추가</button>
```

When there is a note or the user opens it, show the textarea with helper text:

```tsx
<p>자동 저장됨 · 이 기기에만 저장</p>
```

- [x] **Step 2: Make skip action explicit**

Use `해당 없음` when unskipped and `다시 포함` when skipped. Keep skipped cards visually muted and disabled for completion checks.

### Task 4: Verify And Record

**Files:**
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [x] **Step 1: Run focused checks**

```powershell
npm run test:e2e -- --grep "wedding flow answers|public moving flow|routine flow highlights"
```

- [x] **Step 2: Run broad checks**

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

- [x] **Step 3: Update PR history**

Record commands, risks, and known not-done items in `docs/pr-history/2026-05-22-flow-item-card-ux.md`.
