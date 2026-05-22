# FLOW Execution Model Follow-up Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` and `superpowers:test-driven-development`. Keep each behavior covered by a failing test before production changes.

**Goal:** Close the remaining demo-critical gaps after execution-model P0: decision flows need a real editable comparison table, and legacy representative/migration-candidate flows need a visible path toward the new content model without pretending all 500+ catalog flows are fully migrated.

**Stage 0 Constraints:** Client-only state, localStorage persistence, no login, no database, no external calendar API, no copyright policy work.

---

## Task 1: Editable Decision Comparison Table

**Behavior**

- Decision flows show a real `후보 비교표`, not only a static preview.
- Users can edit candidate names.
- Users can write candidate notes per comparison row.
- Users can add one or more candidates.
- Candidate names and notes persist after reload in the same browser.
- The normal checklist remains the execution surface below the comparison table.

**Files**

- Modify: `components/flow/AppClient.tsx`
- Modify: `lib/flow/storage.ts`
- Modify: `lib/flow/types.ts`
- Modify: `tests/e2e/flow-mvp.spec.ts`

**Verification**

- Focused E2E for used-car comparison table.
- Full E2E.

---

## Task 2: Comparison Data Export Hook

**Behavior**

- Text/Excel export should have a clear future hook for comparison data.
- In this pass, record the comparison state in a reusable type and storage helper so export integration can be added without changing the UI state shape again.

**Files**

- Modify: `lib/flow/types.ts`
- Modify: `lib/flow/storage.ts`
- Optional: `lib/flow/export.ts` if the change remains small.

**Verification**

- Unit or E2E coverage, depending on whether export output changes in this pass.

---

## Task 3: Legacy Flow Migration Status Surface

**Behavior**

- Older migration-candidate flows are not hidden, but the product is honest about what is fully upgraded.
- Flow cards or detail pages can distinguish representative/upgraded flows from migration candidates using execution-model metadata.
- Do not remove channel discovery or catalog breadth.

**Files**

- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

**Verification**

- E2E confirms a migration-candidate flow is still reachable and shows a clear migration status.

---

## Task 4: PR History And Deployment

- Update `docs/pr-history/2026-05-22-flow-item-card-ux.md`.
- Run `npm run docs:check`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm run test:e2e`.
- Commit, push, update PR #9, deploy to Vercel production, smoke test.
