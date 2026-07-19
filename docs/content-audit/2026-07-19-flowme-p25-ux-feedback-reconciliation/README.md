# FlowMe P25 UX Feedback Reconciliation

**Date:** 2026-07-19
**Verdict:** `structural_correction_required`
**Product stage:** internal alpha; external observation remains deferred
**Runtime change:** none in this package

## Why This Package Exists

P24 improved artifact-first saving and connected many lifecycle actions, but the owner still cannot understand or trust several basic work patterns. This package reconciles three independent inputs before more development:

1. owner feedback about undated tasks, adjustment, post-save confidence, and whole-Flow quality;
2. Codex production/source review at `docs/content-audit/FlowMe UX 재검토 P24 마감 (P25 실행 백로그)_codex.dc.html`;
3. Claude Design review in `test-results/# FlowMe P25 UXUI 구조 평가.zip`.

The inputs are comparison evidence, not observed-user sessions.

## Main Decision

Do not continue with another route-by-route polish backlog. P25 must first make four product objects coherent:

```text
whole Flow artifact
-> bounded personal adjustment
-> task/occurrence execution
-> Calendar and export projections
```

The full direction and gates are in the [P25 foundation spec](../../specs/2026-07-19-execution-workspace-foundation/spec.md).

## Highest-Priority Findings

### Blocking: projection truth

The recurring washer Flow was reported with different dates/counts in public preview, My Flow/export, and Calendar. A polished UI cannot compensate for an execution artifact that changes meaning between destinations. P25-01A fixes the canonical projection before the core workspace consumes it.

### High: undated work has no clear user model

`날짜 없는 할 일` currently describes missing data. The proposed product model treats it as an actionable `언제든 할 일`; it remains usable in My Flow and list exports, while Calendar offers an `일정에 놓기` queue. A date is optional, not a prerequisite for execution.

### High: adjustment is field-first instead of need-first

The current editor can expose title, date, time, duration, recurrence, notes, decision fields, source context, and structural actions in one flow. P25 splits common item changes from advanced scheduling and adds selected-item batch actions for date move/clear, inclusion, and export.

### High: post-save and whole Flow are not a durable workspace

The first-save confirmation improved, but later My Flow hierarchy still mixes personal Flow identity, child/source identity, Today projections, Flow cards, and truncated item lists. P25 makes the complete Flow the primary saved artifact and treats Today and Calendar as projections of it.

## What P24 Keeps

- four global tabs;
- source / personal overlay / execution run separation;
- one task completion checkbox pattern;
- portable Calendar, checklist, sheet, and memo destinations;
- public share shell;
- date override, completion reversal, personal structure, and recurrence contracts already implemented;
- held content excluded from ordinary execution.

## What P25 Reopens

- My Flow local information architecture;
- whole-Flow and first-save presentation;
- meaning and placement of undated work;
- editor depth and batch adjustment;
- recurrence consumer parity;
- public preview representation and copy density;
- wide workspace composition;
- action labels and shared component states.

## Execution Order

1. **P25-00B:** prototype core screens and obtain owner keep/change/reject decisions.
2. **P25-01:** correct projection, recurrence, memo parsing, and count parity.
3. **P25-02:** build responsive whole-Flow workspace and post-save handoff.
4. **P25-03:** implement progressive and batch personal adjustment.
5. **P25-04:** implement Anytime tasks and Calendar placement.
6. **P25-05:** normalize completion/reopen and export scope.
7. **P25-06/07:** simplify public Flow and apply shared visual language.
8. **P25-08:** run internal simulated journeys and owner readiness review.

Do not begin external observation during this program.

## Files

- [Detailed audit](./audit.md)
- [Prioritized backlog](./backlog.md)
- [Structured feedback matrix](./feedback-matrix.json)
- [Korean review workboard](./review.html)
- [Mobile workboard screenshot](./screenshots/mobile-390.png)
- [Wide workboard screenshot](./screenshots/wide-1024.png)
- [Copy-paste next goal](./prompt-ko.md)
- [P25 spec](../../specs/2026-07-19-execution-workspace-foundation/spec.md)

## Current Verification

- `npm.cmd run docs:check`: pass (14 required files, 2410 local links)
- `git diff --check`: pass
- `review.html` at 390x844: horizontal overflow 0, console errors 0
- `review.html` at 1024x768: horizontal overflow 0, console errors 0
- app runtime tests: not run because this package changes planning and evidence documents only
- observed-user sessions: 0

## Evidence Boundary

- `owner_feedback`: direct product-direction judgment.
- `current_production_interaction` / `current_source`: Codex review evidence from the supplied artifact.
- `heuristic_design_review`: Claude Design evidence from the supplied ZIP.
- `official_reference`: official help/product documentation reviewed on 2026-07-19.
- `observed_user`: zero.

This package does not claim usability validation, retention, or observation readiness.
