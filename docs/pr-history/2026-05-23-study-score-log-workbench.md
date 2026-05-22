# PR: Study Score Log Workbench

- Date: 2026-05-23
- Branch: `codex/study-score-log-workbench`
- PR: pending
- Status: `In progress`
- Production deploy: pending

## Why

The natural artifact audit for `real-sinagong-computer-d30-study` found that a certification-study Flow needs more than a dated checklist. A learner naturally creates a chapter progress table and a past-exam score/wrong-answer table. The previous Workbench only showed either generic logs or a timeline list/calendar, so the Sinagong study Flow did not yet show the artifact a user would expect to copy into a sheet or use as a study tracker.

## What Changed

- Added study-specific Workbench log-table metadata for `real-sinagong-computer-d30-study`.
- Added `챕터 진도표` with rows for weekly progress and columns for scope, target date, status, and memo.
- Added `기출 점수·오답 기록` with rows for past-exam rounds and columns for solved date, score, wrong answers, retry date, and weakness notes.
- Rendered those study tables under the timeline Workbench while keeping the list and month calendar first.
- Exported non-empty study table fields with Korean row and column labels in text and XLSX `실행판 기록`.
- Updated artifact planning so timeline Flows with both calendar and spreadsheet artifacts keep the timeline/calendar surface first when appropriate.
- Kept `study-exam-d30-plan` on the existing routine occurrence Workbench.
- Fixed a residual timeline Workbench issue where travel memo cards were showing the moving-vendor comparison table.

## Not Done

- Did not add automatic chapter distribution from exam date and chapter count.
- Did not add score analytics, pass/fail probability, or weak-area recommendations.
- Did not add source-material file upload.
- Did not add Google Sheets sync.
- Did not change the older `study-exam-d30-plan` source mismatch in this PR.

## Decisions

- Targeted `real-sinagong-computer-d30-study` instead of `study-exam-d30-plan` because the former is the real-source candidate identified by the audit.
- Reused `FlowWorkbenchState.logRows` so no localStorage migration is needed.
- Added a slug-keyed log-table registry rather than hardcoding study UI inside export code.
- Kept moving vendor comparison as an explicit timeline comparison artifact; travel memo cards now render without unrelated comparison rows.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/artifact-fields.ts`
- `lib/flow/artifact-plan.ts`
- `lib/flow/artifact-plan.test.ts`
- `lib/flow/export.ts`
- `lib/flow/export.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/specs/2026-05-23-study-score-log-workbench-design.md`
- `docs/superpowers/plans/2026-05-23-study-score-log-workbench.md`

## Verification

- `npx tsx --test lib/flow/export.test.ts` first failed because study logs exported raw ids, then passed after adding log-table label mapping.
- `npx tsx --test lib/flow/artifact-plan.test.ts` first failed because the Sinagong study Flow selected `spreadsheet_log`, then passed after prioritizing timeline calendar for timeline Flows.
- `npm run test:e2e -- --grep "artifact workbench saves local execution entries"` first failed because travel showed the moving comparison table and study tables did not render, then passed after gating comparison config and adding study log tables.
- `npm run build` passed during implementation.
- `npm run docs:check` passed: 12 required files, 50 local links.
- `npm test` passed: 91 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 38 tests.
- Local visual smoke captured `test-results/study-score-log-workbench.png` for `real-sinagong-computer-d30-study` after entering `시험일=2026-07-05`.

## Risks

- The study table rows are fixed starter rows. Users with more chapters or more past-exam rounds will need future add/remove row controls.
- The table does not yet distribute chapters automatically from the exam date.
- Score entries are free text, so later analytics will need normalization if we want charts or weak-area summaries.

## Follow-Ups

- Add row add/remove controls for study progress and past-exam rounds.
- Add optional inputs for `과목`, `평일공부`, `주말공부`, and `합격기준`.
- Add a study-specific sheet tab that separates progress rows from past-exam score rows.
- Revisit `study-exam-d30-plan` source mismatch and either rename it to an English-study routine or replace the source.
