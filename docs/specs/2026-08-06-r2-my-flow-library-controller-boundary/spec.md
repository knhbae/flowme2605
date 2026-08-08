# FlowMe R2 My Flow Library Controller Boundary

**Date:** 2026-08-06

**Status:** Locally Complete

**Owner:** Codex

**Related work:** [R1 Calendar Controller Boundary](../2026-08-06-r1-calendar-controller-boundary/spec.md)

## Goal

Keep the current My Flow UI, copy, saved data, export results, and route bytes while moving
saved-library list, Plan, and Item navigation decisions behind a pure transition planner.
Fix the confirmed regression where an Item detail survives a query or filter transition and
reappears when the same Plan is reopened even though the URL has no `item` parameter.

## Stage Fit

R1 allowed this bounded R2 only when My Flow list/Plan/Item navigation changed or when a
route/query/Back/scroll/focus regression repeated. The confirmed Item-detail resurrection
meets that trigger. This remains an MVP PoC maintenance slice, not a general My Flow rewrite.

## User Need

As a user browsing saved plans, I need the URL, selected Plan, and visible Item detail to move
together so that search, filtering, reopening, and Back never restore an unrelated stale Item.

## Scope

In:

- Pure planning for query/filter, list -> Plan -> Item, direct entry, Back, and popstate.
- Existing document and rail scroll plus Plan/Item focus-return decisions.
- Atomic clearing of selected Plan, workspace target, and transient Item detail on a successful
  query or filter transition to the list.
- Existing unsaved-edit protection before any query, filter, URL, or selection mutation.
- Existing completion-notice Item navigation when it crosses from a dirty Item into another Plan.
- Unit characterization plus targeted and broad browser regression checks.

Out:

- UI, copy, DOM structure, test IDs, or interaction redesign.
- Item editing, completion, memo, archive, deletion, undo, or recovery semantics.
- localStorage keys, JSON formats, migrations, source-backed ownership, export, or receipts.
- Calendar, Text-to-Flow, new features, commit, push, PR, deployment, or user observation.

## Transition Contract

| Situation | Required result |
| --- | --- |
| Non-editing Item -> query/filter | Apply the control, replace the current entry with list state, remove `flow/item/date`, clear Plan/workspace/transient detail, preserve control focus and history length. |
| Dirty Item editor -> query/filter | Change no query/filter/URL/selection first; retain one pending control intent and show the existing discard prompt. |
| Dirty Item editor -> continue editing | Cancel the pending control intent and keep the Item URL, selection, and draft unchanged. |
| Dirty Item editor -> discard changes | Discard the draft, then apply the pending control intent exactly once so the URL and visible list state move together. |
| Saved Item editor -> query/filter | Once no dirty draft remains, use the ordinary non-editing transition and preserve the saved data. |
| List -> Plan -> Item | Preserve query/filter and exact history ordering; capture return scroll and focus. |
| Item -> Plan -> list Back | Restore the owning Plan, then the list query/filter/scroll/focus without leaving stale Item state. |
| Dirty Item A -> completion notice for Item B | Keep A's URL, selection, notice, and draft until the user decides; continue keeps A, while discard produces only list -> Plan B -> Item B history. |
| Direct Plan/Item entry | Do not send Back outside My Flow; replace the local route level when no internal history marker exists. |

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Search, filter, open a saved Plan, or open an Item. |
| Completion signal | URL, history level, selected Plan, and visible Item detail agree after every transition. |
| Artifact destination | Unchanged; this work owns navigation only. |
| Source/risk boundary | Source, personal overlay, execution, export, and receipt data are untouched. |
| Natural artifact | Existing saved-plan library data and `demo=ux20` browser fixture. |
| Verification | Pure unit tests, AppClient lock, full unit/contract, production build, saved-plan E2E, full Playwright, and 390/1024/1440 browser inspection. |

## Acceptance Criteria

- `Plan -> Item -> query/filter -> clear/reopen same Plan` never restores the old Item unless
  the URL contains that Item identity.
- A dirty Item editor blocks query/filter before controlled state or URL changes and shows the
  existing discard prompt.
- Continuing an edit cancels the pending query/filter, while confirming discard applies it once
  and leaves no Item-only URL or orphan draft.
- Query/filter changes preserve browser history length and current input focus.
- Existing direct-entry, Back, query/filter, rail/document scroll, and focus regressions pass.
- A cross-Flow completion notice cannot change selection before the dirty guard, and successful
  discard resumes its post-navigation effects exactly once.
- The pure planner imports no React, DOM, `window`, storage, AppClient, export, or receipt code.
- UI/copy, storage bytes, source/personal ownership, and result-generation rules do not change.
