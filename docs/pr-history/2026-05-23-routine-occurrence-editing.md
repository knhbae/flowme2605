# PR: Routine Occurrence Editing

- Date: 2026-05-23
- Branch: `codex/routine-occurrence-editing`
- Status: `Draft`
- Production deploy: pending

## Why

Routine Flows need to feel like real recurring schedules, not a checklist with a decorative calendar. Users should be able to open a routine Flow, see repeated sessions on the month calendar, check a specific session, add a short note, come back later, and export those records.

## What Changed

- Added a routine-specific monthly occurrence calendar inside `ArtifactWorkbench`.
- Each visible routine occurrence now has:
  - `회차 완료: N회차` checkbox
  - `N회차 메모` textarea
- Kept calendar cells compact on mobile by moving memo editing into a wider `회차 기록` list below the month grid.
- Calendar occurrence completion and notes reuse the existing `FlowWorkbenchState.occurrences` localStorage model.
- Renamed the right-side next-session controls to `다음 세션 체크` / `다음 세션 메모` so accessible labels do not collide with calendar occurrence controls.
- Extended E2E coverage so `2회차` can be checked, memoed, reloaded, and restored.
- Extended export coverage for multiple Workbench occurrence records.

## Not Done

- Did not add multi-month navigation.
- Did not add rest-day editing, intensity fields, or weekly completion charts.
- Did not add external calendar or Todo app sync.
- Did not move routine progress math from source-item completion to occurrence-level completion.

## Decisions

- Reused `YYYY-MM-DD:sessionIndex` occurrence keys to avoid a new storage migration.
- Kept the right-side session guide because it still helps explain what each session contains.
- Made the calendar itself editable first, because the user-facing gap was that recurring sessions were visible but not operable.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `lib/flow/export.test.ts`
- `docs/superpowers/specs/2026-05-23-routine-occurrence-editing-design.md`
- `docs/superpowers/plans/2026-05-23-routine-occurrence-editing.md`

## Verification

- `npx tsx --test lib/flow/export.test.ts` passed: 14 tests.
- `npm run test:e2e -- --grep "artifact workbench saves local execution entries"` first failed because `2회차` was not exposed, then passed after adding calendar occurrence controls.
- `npm run build` passed after implementation.
- `npm run docs:check` passed: 12 required files, 50 local links.
- `npm test` passed: 87 tests.
- `npm run test:e2e` passed: 38 tests.
- Mobile screenshot captured: `test-results/manual/routine-occurrence-mobile.png`.

## Risks

- The routine calendar is longer now because the first 12 occurrence records appear under the month grid. A follow-up should test whether this should become an accordion or bottom sheet on small screens.
- Current occurrence data is still browser-local and not synced across devices.

## Follow-Ups

- Add mobile-friendly occurrence editing if the inline calendar feels too cramped.
- Add weekly completion summary for routine Flows.
- Add rest-day and intensity adjustment states for workout routines.
- Apply the same artifact-operable principle to spreadsheet/log and timeline proof memo surfaces.
