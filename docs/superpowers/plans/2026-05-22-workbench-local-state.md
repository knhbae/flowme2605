# Workbench Local State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first-screen `ArtifactWorkbench` persist checklist toggles, routine occurrence notes, and spreadsheet log entries locally and include them in exports.

**Architecture:** Extend the existing client-side storage model with `FlowWorkbenchState`, pass it from `AppClient` to `ArtifactWorkbench`, and keep item completion wired to the existing `checks` state. Add export support through optional `workbenchState` in `buildText` and `buildWorkbookSheets`.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage, existing export helpers, Playwright E2E, Node test runner.

---

## File Structure

- Modify: `lib/flow/types.ts`
  - Add `FlowWorkbenchState` and nested state types.
- Modify: `lib/flow/storage.ts`
  - Add `getWorkbenchState` and `saveWorkbenchState`.
  - Include non-empty Workbench state in active Flow detection.
- Modify: `lib/flow/export.ts`
  - Accept optional `workbenchState`.
  - Append text and workbook export rows when Workbench records exist.
- Modify: `components/flow/AppClient.tsx`
  - Own `workbenchState`, load/save it, pass it to Workbench and exports.
- Modify: `components/flow/ArtifactWorkbench.tsx`
  - Add timeline/checklist/decision item checkboxes.
  - Add routine occurrence completion and memo controls.
  - Add spreadsheet-log inputs and weekly review textarea.
- Modify: `tests/e2e/flow-mvp.spec.ts`
  - Add persistence checks for timeline, routine, and spreadsheet Workbench surfaces.
- Modify: `lib/flow/export.test.ts`
  - Add text/workbook export coverage for Workbench state.
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`
  - Record the PR and verification.

## Task 1: RED Tests

- [ ] Add an E2E test named `artifact workbench saves local execution entries`:
  - Moving Flow: check `실행판 완료: 이사 방식 정하기`, reload, assert it remains checked and progress shows `1 / 24`.
  - Study Flow: check `회차 완료: 1회차`, fill `1회차 메모`, reload, assert both remain.
  - FITVELY diet-log Flow: fill the first `식단` field and `주간 리뷰 메모`, reload, assert both remain.
- [ ] Add an export unit test named `workbench records are included in text and workbook exports`.
- [ ] Run `npm run test:e2e -- --grep "artifact workbench saves local execution entries"` and confirm RED.
- [ ] Run `npx tsx --test lib/flow/export.test.ts` and confirm RED.

## Task 2: Local Storage And Types

- [ ] Add `FlowWorkbenchOccurrenceState`, `FlowWorkbenchLogRow`, and `FlowWorkbenchState` in `lib/flow/types.ts`.
- [ ] Add `WORKBENCH_KEY_PREFIX = 'flow_builder_mvp_workbench_'` in `lib/flow/storage.ts`.
- [ ] Add safe JSON parsing helpers:
  - empty state is `{ occurrences: {}, logRows: {} }`.
  - invalid state falls back to empty.
- [ ] Include non-empty occurrence, log row, or weekly review data in `getActiveFlowProgress`.
- [ ] Run `npx tsx --test lib/flow/storage.test.ts lib/flow/export.test.ts` and confirm relevant tests still pass or only export RED remains.

## Task 3: App Wiring

- [ ] In `AppClient.tsx`, import `FlowWorkbenchState`, `getWorkbenchState`, and `saveWorkbenchState`.
- [ ] Add `const [workbenchState, setWorkbenchState] = useState<FlowWorkbenchState>(() => getWorkbenchState(slug));`.
- [ ] Load `getWorkbenchState(slug)` in the existing slug effect.
- [ ] Save state in a `useEffect`.
- [ ] Pass `workbenchState`, `onWorkbenchChange={setWorkbenchState}`, and `onToggleItem={toggle}` into `ArtifactWorkbench`.
- [ ] Pass `workbenchState` to `buildText` and `buildWorkbookSheets`.

## Task 4: Workbench UI

- [ ] Extend `ArtifactWorkbenchProps` with `workbenchState`, `onWorkbenchChange`, and `onToggleItem`.
- [ ] Timeline rows render checkbox inputs with `aria-label="실행판 완료: ${row.title}"`.
- [ ] Decision/checklist side rows render the same checkbox pattern.
- [ ] Routine next occurrence renders:
  - checkbox `aria-label="회차 완료: ${sessionLabel}"`.
  - textarea `aria-label="${sessionLabel} 메모"`.
  - calendar chips show `완료` when the occurrence is saved as done.
- [ ] Spreadsheet cells render inputs with labels `${date} ${column}` and persist into `logRows[date][column]`.
- [ ] Weekly review textarea uses `aria-label="주간 리뷰 메모"`.

## Task 5: Export Integration

- [ ] Add optional `workbenchState?: FlowWorkbenchState` to text and workbook export options.
- [ ] Text export appends `## 실행판 기록` when saved data exists.
- [ ] Workbook export adds an `실행판 기록` sheet with rows:
  - `유형`
  - `날짜/회차`
  - `항목`
  - `값`
- [ ] Run `npx tsx --test lib/flow/export.test.ts` and confirm GREEN.

## Task 6: Verification And PR

- [ ] Run focused E2E and confirm GREEN.
- [ ] Run `npm run docs:check`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:e2e`.
- [ ] Update PR history with summary, verification, and remaining gaps.
- [ ] Commit, push, open PR, wait for Vercel, merge if green, and smoke production.
