# Routine Occurrence Editing Design

> Date: 2026-05-23  
> Branch: `codex/routine-occurrence-editing`  
> Source design: `docs/superpowers/specs/2026-05-22-artifact-first-flow-ux-design.md`

## Goal

Routine Flow pages should let users operate the monthly routine calendar itself. The visible calendar sessions should not be passive chips; users must be able to mark any occurrence complete, attach a short occurrence memo, reload the page, and export those records.

## Scope

This pass only targets routine-calendar Workbench behavior. It does not add login, server sync, external calendar APIs, or multi-month navigation.

## User Behavior

For a routine Flow such as `english-study-30day-routine`, a user expects this path:

1. Open the Flow and see a month calendar with repeated sessions.
2. Mark a specific session, such as `2회차`, complete directly from the calendar area.
3. Add a memo for that session, such as `듣기 20분, 단어 30개`.
4. Refresh or return later and see the same session still complete with its memo.
5. Copy or download the Flow and find the session record in the exported artifact.

## UX Design

The routine Workbench keeps its current two-column layout:

- Left: `반복 캘린더`
- Right: `한 회차에 하는 일`

The left calendar changes from passive text chips to compact session controls. Each visible occurrence row shows:

- A checkbox labeled `회차 완료: N회차`
- The session label, date, and weekday
- A short `N회차 메모` textarea

The right panel remains a session guide and highlights the next session, but it is no longer the only editable occurrence.

## Data Model

No new storage key is needed. Reuse `FlowWorkbenchState.occurrences`.

Occurrence keys stay stable:

```text
YYYY-MM-DD:sessionIndex
```

Stored value:

```ts
{
  done?: boolean;
  note?: string;
}
```

This keeps existing export logic and `/my` progress detection compatible.

## Export Behavior

Text and workbook exports already read `workbenchState.occurrences`. This pass verifies that multiple routine occurrence records from the calendar appear in:

- Text export section: `## 실행판 기록`
- Workbook sheet: `실행판 기록`

## Acceptance Criteria

- A routine Workbench exposes `회차 완료: 2회차`.
- The user can mark `2회차` complete from the calendar area.
- The user can enter `2회차 메모`.
- Completion and memo persist after reload.
- Export tests cover multiple occurrence rows.
- Existing next-session controls continue to work.
