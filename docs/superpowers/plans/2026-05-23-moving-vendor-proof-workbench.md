# Moving Vendor Proof Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add moving-company comparison and proof memo artifacts to the moving timeline Workbench.

**Architecture:** Add small artifact field helpers for comparison rows and memo-card fields. Reuse `FlowComparisonState` for candidate comparison, extend `FlowWorkbenchState` with `memoCards`, and render the extra moving artifacts only for moving timeline Flows.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage, Playwright E2E, Node test runner.

---

## Files

- Create: `lib/flow/artifact-fields.ts`
- Modify: `lib/flow/types.ts`
- Modify: `lib/flow/storage.ts`
- Modify: `lib/flow/export.ts`
- Modify: `lib/flow/export.test.ts`
- Modify: `components/flow/ArtifactWorkbench.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`
- Add: `docs/pr-history/2026-05-23-moving-vendor-proof-workbench.md`

## Tasks

### Task 1: RED tests

- [ ] Extend `lib/flow/export.test.ts` with a moving export test that expects:
  - `[후보 비교표]`
  - `이사 업체 견적 금액 | 한빛이사 | 빠른이사`
  - `견적서/계약서 위치: 문자 견적 캡처`
  - workbook `후보 비교` and `실행판 기록` rows.

- [ ] Extend `tests/e2e/flow-mvp.spec.ts` so moving Workbench:
  - fills `후보 1 이름`
  - fills `이사 업체 견적 금액 / 후보 1 메모`
  - fills `견적서/계약서 위치`
  - reloads and verifies all values.

### Task 2: Shared artifact fields

- [ ] Create `lib/flow/artifact-fields.ts`.
- [ ] Export `getComparisonRows(bundle)` and `getMemoCardFields(bundle)`.
- [ ] Return moving-specific rows for `moving-d30-basic` and `real-ohouse-moving-d30-prep`.

### Task 3: Workbench state

- [ ] Add `memoCards: Record<string, string>` to `FlowWorkbenchState`.
- [ ] Normalize and persist `memoCards` in `storage.ts`.
- [ ] Count non-empty `memoCards` as active progress.
- [ ] Include `memoCards` in `buildWorkbenchRows()`.

### Task 4: Moving Workbench UI

- [ ] Pass comparison and Workbench handlers into `TimelineWorkbench`.
- [ ] Render moving comparison table under the timeline list/calendar.
- [ ] Render moving proof memo fields under the comparison table.
- [ ] Keep non-moving timeline Flows unchanged.

### Task 5: Verification and PR

- [ ] Run focused tests:
  - `npx tsx --test lib/flow/export.test.ts`
  - `npm run test:e2e -- --grep "artifact workbench saves local execution entries"`
- [ ] Run full gates:
  - `npm run docs:check`
  - `npm test`
  - `npm run build`
  - `npm run test:e2e`
- [ ] Open PR, wait for Vercel, merge, wait for production deploy, smoke test production.
