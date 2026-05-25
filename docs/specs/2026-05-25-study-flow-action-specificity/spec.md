# Study Flow Action Specificity

Date: 2026-05-25

## Problem

`computer-skills-d30-study` has the right export-first shape: exam-date anchor, D-30 calendar, source-derived chapter rows, and score/wrong-answer logs. The remaining risk is that dated study items can still feel vague when moved into a calendar.

## Scope

- Make every `computer-skills-d30-study` item explain what to do and where to record the result.
- Preserve source boundaries: the D-30 schedule is FLOW conversion, not a source-authored curriculum.
- Carry item action guidance into dated ICS calendar events.
- Keep representative-eligible status unchanged and avoid validation claims.

## Out Of Scope

- Automatic curriculum generation.
- New source rows beyond the current source-supported table.
- Full page redesign or Figma canvas creation.
- Native study dashboard or login-based record management.

## Acceptance Criteria

- All nine study items have `실행:` and `기록:` guidance.
- Calendar export event descriptions include executable item guidance.
- D-30 conversion boundary is visible in Flow copy.
- Tests cover seed copy and calendar export behavior.
