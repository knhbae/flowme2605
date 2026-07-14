# My Flow v2 Execution UX Spec

> **Canonical compatibility notice (2026-07-12):** User-facing rows in this July 1 UX spec still use the existing Step-first runtime vocabulary. The backend contract is now [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md): canonical `Item` is the minimum independently stateful execution/projection unit and canonical `Step` is grouping. This notice does not rename the current UI; it prevents the UX label from becoming the new storage schema.

## Goal

Redesign the saved execution experience for `/my` so a user can save a Flow, open the next actionable work, review upcoming work, and inspect the full saved Flow structure without seeing a mixed planning, review, export, and inventory surface.

## Problem

The current 4-tab IA is acceptable: `홈 / Flow 찾기 / 캘린더 / 내 Flow`. The weak point is the saved-work handoff. After saving, `/my` exposes a saved confirmation panel, a preview list, today work, Flow structure, Step detail, edit fields, and export controls close together. Users can technically proceed, but the page asks them to interpret too many levels at once.

## Product Principles

- Keep `캘린더` as the global dated execution tab.
- Keep `/my` as saved Flow execution inbox and full saved-structure management.
- Separate post-save confirmation from normal ongoing use.
- Treat Step as the minimum executable/exportable unit.
- Treat Item as nested checklist/memo/detail that appears only after opening a Step.
- Use user language in user screens: `할 일`, `일정`, `체크`, `전체 Flow`.
- Keep internal review language, source conversion evaluation, and design rationale out of user screens.

## v2 Surface Roles

| Surface | Primary job | Should show by default | Should not show by default |
|---|---|---|---|
| Post-save `/my` | Confirm save and route user to one next action | Saved title, count, next actionable Step CTA, full Flow CTA | Preview inventory, all Steps, export/edit controls |
| Normal `/my` Today | Continue execution | One `지금 이어하기` Step, today rows, near-term next rows | Full Flow tree, full Item list, calendar grid |
| Normal `/my` Flow | Manage saved structure | Saved Flow cards, progress, next Step, expandable full structure | Today-only empty states, global calendar CTA |
| Step detail | Execute or adjust one Step | Item checklist, memo, source URL, completion | Bulk Flow controls, review explanation |
| `/calendar` | Date-first execution | Month/week schedule, selected date rows near the calendar | Saved inventory management |

## User Journeys

### Save and continue

1. User opens a public Flow detail from `/flows`.
2. User enters only anchor-level input, such as moving date.
3. User saves.
4. `/my` shows a compact saved banner and one primary action: `지금 할 일 열기`.
5. The Step opens inside the normal Today workspace, not inside a separate review-like preview list.

### Daily return

1. User opens `내 Flow`.
2. User sees one continuation Step first.
3. User can open the Step, check Items, edit memo/date only if needed, and close it.
4. User sees near-term upcoming work below.
5. Full structure is available through the `Flow` local tab.

### Calendar return

1. User opens global `캘린더`.
2. User taps a date.
3. Items for that date appear close to the selected calendar area.
4. Opening a Step uses the same Step detail pattern as `/my`.

## P0/P1 Implementation Scope

P0:

- Collapse the post-save panel into a compact confirmation and action router.
- Remove post-save mini inventory from the default screen.
- Route the primary post-save action into the normal Today detail surface.
- Keep `/my` local tabs to `오늘` and `Flow`; do not add local calendar.

P1:

- Rewrite post-save copy in user language.
- Keep Flow full structure behind `전체 Flow 보기`.
- Keep Step detail read-first; edit/export controls should remain secondary.
- On mobile, Step detail defaults to the Step title, date, completion state, and checklist. If there is no checklist, it must still show one concise source-backed `바로 할 일` hint before memo/export support rows. Memo, schedule, source, copy/export, and edit actions are collapsed support information.
- Update E2E assertions to match the lighter post-save model.

Deferred:

- Real usage/review/completion signals in `/flows`.
- Account-backed persistence.
- Bulk scheduling/editing before save.
- Direct Google Calendar/Todo/Sheet integrations.
- Full visual polish of Home/catalog cards.

## Acceptance

- The post-save screen does not render a second inventory list.
- The normal `/my` Today workspace remains visible after saving.
- The primary post-save action opens the normal Today Step detail.
- The Flow view is the place where saved structure is managed, but long Step lists are previewed first and expanded only on request.
- Mobile Step detail does not expose internal `Step`/`Item` wording, generic `수정`, `할 일 상태`, or export controls in the primary action row.
- Today labels future-only queues as `다음 할 일` / scheduled work rather than presenting future Steps as due today.
- `/calendar` remains the only global calendar tab.
- Mobile screen density stays near calendar/todo app complexity.
