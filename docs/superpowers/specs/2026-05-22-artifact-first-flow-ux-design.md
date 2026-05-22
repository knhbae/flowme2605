# Artifact-First FLOW UX Design

> 작성일: 2026-05-22  
> 상태: Implementation-ready design  
> 기준 문서: `docs/content-audit/2026-05-22-real-source-flow-action-matrix.md`

## Goal

FLOW detail pages should prove, within the first screen, that the original content has become a usable artifact: a checklist, calendar, routine schedule, spreadsheet log, comparison table, or memo card. The page should not make users infer the artifact from badges or long explanatory copy.

## Product Principle

Every Flow must answer four questions before asking for long interaction:

1. What did the original content become?
2. What do I need to input?
3. What will FLOW generate from that input?
4. Where can I take the generated artifact: calendar, text, spreadsheet, memo, or todo list?

The default surface is no longer "a Flow page with sections." The default surface is "the artifact this Flow produces."

## Target Patterns

### 1. Timeline Calendar

Representative target: `moving-d30-basic` plus source-informed behavior from `real-ohouse-moving-d30-prep`.

User input:

- Anchor date: move date, exam date, travel date, inspection date.
- Optional constraints: available start date, weekend-only work, vendor candidates, official deadline.

Processing:

- Convert `day_offset` to actual dates.
- Group same-day tasks into agenda clusters.
- Keep list and month calendar in sync.
- If a task implies vendor/proof work, attach comparison or memo affordance.

First-screen output:

- A visible list of upcoming tasks.
- A compact month calendar preview with real or sample dates.
- Export targets: calendar, text, spreadsheet, memo.

### 2. Decision Checklist

Representative target: `used-car-buying-check`.

User input:

- Candidate names.
- Comparison row notes.
- Field checklist state, item memo, skip state.

Processing:

- Treat comparison table as the primary artifact.
- Keep field checklist as the execution artifact.
- Export both artifacts together.

First-screen output:

- Editable candidate comparison table.
- Immediate checklist rows below it.
- Export targets: text, spreadsheet, memo.

### 3. Routine Calendar

Representative target: `real-thankyou-bubu-video-full-body-no-jump`.

User input:

- Start date.
- Weekdays.
- Duration.
- Optional intensity, condition note, rest-day rule.

Processing:

- Expand recurrence into month calendar occurrences.
- Show rest days if the routine explicitly uses them.
- Track completion per occurrence, not only per source item.
- Keep per-session condition notes lightweight.

First-screen output:

- Monthly recurrence calendar.
- Next session card.
- Weekly completion summary.
- Export targets: calendar, text, spreadsheet.

### 4. Spreadsheet Log

Representative target: `real-fitvely-video-body-fat-6kg-method`.

User input:

- Date range.
- Measurement days.
- Daily meal/exercise record fields.
- Weekly review day.

Processing:

- Generate log rows before showing a checklist.
- Support multiple recurrence rules: daily logging, weekly measurement, weekly review.
- Avoid outcome promises; track execution and review notes instead.

First-screen output:

- Spreadsheet preview with columns.
- Calendar reminder preview.
- Weekly review memo.
- Export targets: spreadsheet, text, calendar.

### 5. Study Planner

Representative target: `real-sinagong-computer-d30-study`.

User input:

- Exam date.
- Daily study minutes.
- Subject or chapter buckets.
- Optional mock-test dates.

Processing:

- Generate D-30 study calendar.
- Generate score/wrong-answer log rows.
- Keep source material links attached to relevant tasks.

First-screen output:

- D-30 agenda list.
- Month calendar.
- Score and wrong-answer spreadsheet preview.
- Export targets: calendar, spreadsheet, text.

## Page Information Architecture

The Flow detail page should use this order:

1. Source confirmation and title.
2. Artifact promise: "This becomes a monthly calendar + checklist" or equivalent.
3. Required input block.
4. Primary artifact preview.
5. Secondary artifact preview, if needed.
6. Full execution list.
7. Export and backup actions.

The artifact preview must show real rows, dates, recurrence instances, or columns. It should not be a generic text explanation.

## Content Rules

- If the source is broad channel/site only, the Flow stays catalog review until exact source replacement.
- If the natural artifact is a spreadsheet, the Flow must not be represented as checklist-only.
- If the natural artifact is a routine, recurrence must be visible on a calendar.
- If the natural artifact is a comparison table, the comparison table appears before the checklist.
- If the natural artifact is a memo card, copy/export must include that memo as a structured section.

## UX Rules

- The first screen must expose at least three real task rows or calendar/log rows.
- Calendar views stay because they are a core proof of transformation.
- Tabs should describe artifacts, not abstract views. Use labels like `월간 캘린더`, `기록표`, `비교표`, `체크리스트`.
- Empty previews must explain which input unlocks them.
- Export controls should be artifact-aware:
  - Calendar export for dated or recurring events.
  - Spreadsheet export for logs and comparison tables.
  - Text copy for checklist and memo cards.

## Non-Goals

- No login or server sync.
- No external calendar API integration.
- No generated preview catalog audit.
- No copyright policy handling in this pass.
- No attempt to migrate all 500+ routes before the five representative patterns work.

## Acceptance Criteria

- The action matrix remains the source of truth for real-source Flow handling.
- Each representative target has a first-screen artifact preview that matches its natural artifact.
- Flow Lab shows all 40 real-source natural artifact audits as complete.
- Broad-source routes are not promoted as representative until exact source URLs are assigned.
- Existing public routes remain directly accessible.
