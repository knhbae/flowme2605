# My Flow Management Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add saved Flow filtering, checklist status filtering, and a usable routine weekly view to `/my`.

**Architecture:** Keep data persistence unchanged and derive all new views inside `components/flow/AppClient.tsx`. Reuse existing saved Flow progress, check state, schedule row, and routine recurrence helpers so `/my` remains a thin management surface over the current local storage model.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Playwright E2E.

---

## File Structure

- Modify `components/flow/AppClient.tsx`
  - Add local state for selected saved Flow and checklist status filter.
  - Derive filtered saved Flow, calendar, checklist, and routine collections.
  - Add compact controls and empty states.
- Modify `tests/e2e/flow-mvp.spec.ts`
  - Add coverage for multi-Flow `/my` filtering and routine view behavior.
- Modify `next_job2.md`
  - Record implementation and verification.

## Task 1: E2E For Filters And Routine Surface

- [ ] Add a Playwright test that seeds `flow:saved:moving-d30-basic`, `flow:moving-d30-basic:anchorDate`, `flow:saved:home-workout-20min`, and `flow:home-workout-20min:anchorDate` in `localStorage`.
- [ ] Open `/my` and assert both saved Flows appear.
- [ ] Select the `home-workout-20min` Flow filter and assert the moving Flow card is hidden.
- [ ] Open `루틴` and assert `주간 루틴` plus a weekday row appears.
- [ ] Open `체크리스트`, check one routine row, select `완료`, and assert only the checked row remains visible.
- [ ] Select `남은 항목` and assert the checked row is hidden.

## Task 2: Filtered Saved Flow State

- [ ] In `MyFlows`, add `selectedSavedFlowSlug` state with default `all`.
- [ ] Add `checklistFilter` state with default `all`.
- [ ] Derive `visibleSavedFlows` from `savedFlows` and the selected slug.
- [ ] Reset the selected slug to `all` if the selected saved Flow no longer exists.
- [ ] Render compact saved Flow filter buttons only when two or more saved Flows exist.

## Task 3: Calendar And Checklist Filtering

- [ ] Build `calendarRows`, `calendarAnchor`, and `calendarCells` from `visibleSavedFlows` instead of all saved Flows.
- [ ] Add checklist status filter buttons.
- [ ] Filter checklist rows by checked state for `all`, `open`, and `done`.
- [ ] Add quiet empty states for no calendar rows and no checklist rows after filtering.

## Task 4: Routine Weekly Surface

- [ ] Build `routineFlows` from `visibleSavedFlows`.
- [ ] For each routine Flow, render weekday chips from `getRoutineWeekdayLabels`.
- [ ] Show progress, a continue action, and direct checkbox rows.
- [ ] Keep the existing empty state when no routine Flows match the current saved Flow filter.

## Task 5: Verify And Ship

- [ ] Run targeted Playwright for `/my` management tests.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Run `npm run docs:check`.
- [ ] Run `npm run test:e2e`.
- [ ] Run mobile screenshot QA for `/my` at 390px and confirm no horizontal overflow.
- [ ] Update `next_job2.md`.
- [ ] Commit, pull --rebase, push, and create a Vercel preview deployment.
