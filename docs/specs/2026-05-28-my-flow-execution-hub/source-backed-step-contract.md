# Source-backed My Flow Step Contract

**Date:** 2026-06-22  
**Status:** Draft implementation bridge  
**Related artifacts:** [v9 source-backed My Flow](../../content-audit/2026-06-22-source-backed-my-flow-v9-ko.html), [v9 rehearsal](../../content-audit/2026-06-22-source-backed-my-flow-v9-rehearsal-ko.html), [Flow execution types](../../flow-rules/flow-execution-types.md)

## Goal

Bridge the accepted v9 source-backed My Flow UI into the existing product model without inventing a heavier user-facing hierarchy.

The user-facing hierarchy remains:

```text
Flow Map > Flow > Step > Item
```

The product implementation should map it mostly onto the existing `FlowBundle`, `FlowItem`, and `FlowItemDetail` types.

## Core Decision

Do not create a new visible user model for v9.

- `Flow Map` is a grouping layer for related `FlowBundle`s.
- `Flow` maps to `FlowBundle.flow`.
- `Step` maps to one `FlowItem`.
- `Item` maps to `FlowItemDetail`, event description lines, checklist detail lines, memo hints, links, or sheet note fields.
- `Item` should not become a separate `FlowItem` unless the source truly requires it as an independent calendar/todo row.

## Why

The v9 PoC became usable when the screen stayed close to a calendar/todo app:

- Today shows current Steps.
- Calendar shows dated Steps.
- Flow shows standalone saved Flows.
- Map shows parent maps first, then child Flows.
- Step detail shows source link, Item checks, and memo only after selection.

Adding a new visible data layer now would make the product drift back toward a dashboard. The richer model should sit behind export, source, and schedule metadata.

## Mapping

| v9 concept | Product object | Notes |
| --- | --- | --- |
| Flow Map | grouping record or parent plan relation | Existing `Flow` has no final public map schema yet. Keep map grouping outside the Step detail until a creator/public map spec lands. |
| Flow | `FlowBundle.flow` | Use `structure_type`, `anchor_type`, `primary_destination`, `source_title`, `source_url`, `risk_level`. |
| Step | `FlowItem` | Minimum executable/exportable row. Can become calendar event, todo, checklist row, sheet row, or progress row. |
| Item | `FlowItemDetail` plus export text | Internal checklist when useful; text fallback in calendar description, todo body, sheet note, or memo body. |
| Step source link | `FlowItemDetail.links` or flow-level `source_url` | Prefer item-level link when different per Step; flow-level is enough when one source backs all Steps. |
| Step memo hint | detail/memo placeholder | Not a separate field in shared production schema unless editing UX needs it. |
| Step completion | `FlowItemDetail.completion_criteria` | Keep concrete and observable. |

## ICS-ready Step Metadata

A Step may carry calendar-event-compatible metadata without exposing raw calendar fields by default.

Minimum metadata for export:

```ts
type MyFlowStepExportBridge = {
  stepId: string;
  flowId: string;
  mapId?: string;
  title: string;
  destination: 'calendar' | 'todo' | 'checklist' | 'sheet' | 'memo' | 'progress';
  sourceTitle?: string;
  sourceUrl?: string;
  sourceType?: 'official' | 'creator_experience' | 'reference';
  riskLevel?: 'low' | 'medium' | 'medical_sensitive' | 'financial_sensitive';
  calendar?: {
    mode: 'absolute' | 'anchor_offset' | 'routine' | 'none';
    anchorType?: 'start_date' | 'end_date' | 'baby_birth_date' | 'baby_age_month' | 'none';
    dayOffset?: number;
    startDate?: string;
    endDate?: string;
    allDay?: boolean;
    timezone?: string;
    repeatRule?: string;
  };
  textFallback: {
    title: string;
    description: string;
    items?: string[];
    memoHint?: string;
    url?: string;
    doneWhen?: string;
  };
};
```

This is a bridge shape, not necessarily a new production type. The existing production path can derive most of it from `FlowBundle`, `FlowItem`, and `FlowItemDetail`.

## v9 Fixture Interpretation

| Flow | Execution type | Natural artifact | Existing schema fit | Gap |
| --- | --- | --- | --- | --- |
| 전세계약 전 확인 3가지 | process/check | todo + memo + dated reminders | `FlowItem` todo/calendar plus `memo_evidence` secondary signal | Sensitive legal-ish caution should stay source/detail, not a checkable row. |
| 원룸 이사 D-30 준비 | timeline | calendar + checklist | Strong fit with `day_offset`, `duration_days`, ICS export | Vendor/contact notes stay memo, not top-level inputs. |
| 온라인 여권 재발급 | process | checklist + dated reminder | Existing `check_task`, `scheduled_task`, `memo_evidence` derivation works | Official source link should remain near Step detail/export body. |
| 중1 수학 목차 | progress | progress list + optional dates | First implementation slice can use `FlowItem` rows plus a derived `progress` destination bridge | Do not add `progress_step` until row state, wrong-answer memo, or progress export cannot be expressed cleanly. |
| 영유아 검진·접종 일정 | timeline/process | calendar + memo | Existing source/risk fields fit official data; one birthdate input can save multiple child Flows into My Flow | Medical-sensitive UI must not turn guidance into advice or diagnosis. Official date ranges should stay one Step with period text, not a multi-day progress span. |

## Product Gaps

### 1. Flow Map persistence

The v9 HTML uses `mapId`, but the current `Flow` type does not yet expose a final Flow Map/grouping schema. This should not block My Flow UI testing, but creator/public map work needs a durable parent relation.

Possible options:

- Use a parent map table.
- Use `parent_plan_id` style relation when the plan schema is promoted.
- Keep map grouping as a derived saved-library view until creator map publishing is implemented.

2026-06-23 implementation slice: `lib/flow/source-backed-my-flow.ts` now includes a minimal `sourceBackedMyFlowMaps` registry and `getSourceBackedMyFlowMapForBundle`. This keeps the parent map separate from executable `FlowItem` rows. It is still a bridge fixture, not the final creator/public map persistence schema.

2026-06-23 update/version slice: public Flow Map save now writes a parent saved snapshot in addition to child Flow records. The snapshot keeps `mapId`, `version`, `flowSlugs`, Step counts, risk levels, source checked dates, `savedAt`, and shared anchor. This is still local bridge storage, but it proves the minimum metadata needed for later creator/source update handling without showing extra controls in My Flow.

### 2. Progress Step type

`docs/flow-rules/flow-execution-types.md` defines `Progress Flow`, but `MyFlowExecutionItemType` currently does not include `progress_step`.

Do not add it blindly. First decide whether progress rows need behavior that `check_task` + progress context cannot provide:

- current row/next row display
- progress-specific sheet export
- wrong-answer memo
- row order as primary state

2026-06-23 implementation slice: `source-backed-middle-school-math-1` keeps Mathbang source rows as `FlowItem` rows and derives a `progress` bridge row with source URL, memo hint, and text fallback. This is enough for the current user-facing complexity target, so `progress_step` is **not needed yet**. Reopen this only if real My Flow/product code needs progress-specific state that cannot be represented by `FlowItem` plus bridge metadata.

### 3. Item fallback

Items must degrade cleanly outside FlowMe:

- Calendar: event description lines
- Todo: note/body text
- Sheet: note/detail columns
- Memo: bullet list

If an external app cannot represent nested checklists, the Item is still useful as plain text.

### 4. Official date windows

Some official sources define eligibility windows rather than one exact action date. Keep the window as text on the Step, detail, or export body unless the product has a real date-window object.

- Good: one Step titled `1차 건강검진 · 생후 14~35일`, with memo items for reservation, questionnaire, visit, and result location.
- Bad: `duration_days: 22` if My Flow then counts every eligible day as a separate completion row.

2026-06-23 implementation slice: `source-backed-baby-health-checkups` originally exposed this bug during Playwright verification. The fixture now stores each official checkup or oral checkup window as a single calendar Step and keeps the period in the title/detail text.

2026-06-23 date-window/export slice: `FlowItem.date_window` now carries the official eligibility window separately from the reminder row. ICS export keeps one all-day reminder event at the start of the window, while the event description and workbook row keep the official period and calculated date range. This prevents My Flow progress and calendar grids from turning one official window into dozens of daily tasks.

## Next Implementation Slice

Completed on 2026-06-23 for the first code slice:

1. Kept v9/v10 as the source-backed UX reference.
2. Added `lib/flow/source-backed-my-flow.ts` with two representative `FlowBundle` fixtures:
   - `source-backed-moving-d30`
   - `source-backed-middle-school-math-1`
3. Added `lib/flow/source-backed-my-flow.test.ts` proving:
   - Step -> `FlowItem`
   - Item -> `FlowItemDetail` / description / links / text fallback
   - dated Step -> calendar/ICS entry
   - date-less math Step -> derived `progress` row without inventing a first-class `progress_step`
4. No new user-facing controls were added.

Completed on 2026-06-23 for the second code slice:

1. Added `mergeSourceBackedMyFlowBundles` so `/my` can use source-backed bridge bundles without publishing them into the public seed catalog.
2. Added `/my?demo=source-backed` through the existing My Flow demo fixture path.
3. Added Playwright coverage proving:
   - the source-backed demo renders as saved My Flow content
   - `source-backed-moving-d30` opens as a calendar-oriented Flow
   - `source-backed-middle-school-math-1` opens as a sheet/checklist-oriented progress Flow
   - the demo separates `단일 Flow` from `중1 수학 지도`

Completed on 2026-06-23 for the third code slice:

1. Added `buildSourceBackedFlowMapPublishPackage` and `listSourceBackedFlowMapPublishPackages` to keep one map package split across:
   - creator publish preparation
   - public save-before detail
   - saved My Flow execution result
2. Added `/flow-maps/middle-school-math-1` as a public save-before Flow Map route.
3. Added `/flow-maps/middle-school-math-1/creator` as a creator publish-prep route.
4. Added Playwright coverage proving:
   - the public route stays focused on source, artifact, and save action
   - the creator route shows source rows and publish checks without mixing in user execution

Completed on 2026-06-23 for the fourth code slice:

1. Replaced the public Flow Map primary action from a demo link with a client-side save action.
2. The public route now writes `flow:saved:source-backed-middle-school-math-1` and sends the user to real `/my`, not `/my?demo=source-backed`.
3. `getActiveFlowProgress` can now receive an injected bundle list, so My Flow can include source-backed bridge bundles without adding them to the public seed catalog.
4. Added unit and Playwright coverage proving the saved record appears in `/my` without a demo badge.

Completed on 2026-06-23 for the fifth code slice:

1. Added `baby-health-schedule` as a second source-backed Flow Map using official health checkup and vaccination sources.
2. Added two child Flows:
   - `source-backed-baby-health-checkups`
   - `source-backed-baby-vaccination-schedule`
3. Added an input-bearing public save path: the public Flow Map takes one `아이 생년월일` input and saves both child Flows into real `/my` with the same anchor.
4. Added unit and Playwright coverage proving:
   - the official schedule map has 12 health checkup Steps and 6 vaccination lookup Steps
   - creator/public/My Flow surfaces remain separated
   - `/flow-maps/baby-health-schedule` saves to `/my` without demo mode
   - date ranges do not inflate progress counts

Completed on 2026-06-23 for the sixth code slice:

1. Added version and update policy metadata to source-backed Flow Maps.
2. Added `buildSourceBackedFlowMapSavedSnapshot` to capture parent map state when a public map is saved.
3. Added `assessSourceBackedFlowMapUpdate` to compare a saved map snapshot with the current package.
4. Added public save behavior that writes `flow:map:saved:{mapId}` alongside child `flow:saved:*` records.
5. Added unit and Playwright coverage proving:
   - same-version saved maps stay quiet
   - official/sensitive map changes require review before apply
   - public save records the parent map snapshot for both middle-school math and baby health maps

Completed on 2026-06-23 for the seventh code slice:

1. Added optional `FlowItem.date_window` metadata for source-defined official ranges.
2. Added date-window metadata to the source-backed 영유아 건강검진 Steps.
3. Updated source-backed bridge rows so `calendar.window` carries the official period and start/end offsets.
4. Updated text/workbook/ICS export so:
   - the calendar event remains one reminder,
   - the official period appears in the Step timing text,
   - the calculated date range appears in event descriptions and execution sheets,
   - the monthly calendar grid does not inflate the range into repeated completion rows.
5. Added unit coverage for the export behavior.

Next slice: decide whether this bridge package becomes a durable creator/public map schema or stays as a fixture adapter until real creator workflow evidence exists. The user-facing My Flow execution surface should not grow until creator/public data requirements force it. The next useful product gap is creator-side source-row editing/version review, not more visible My Flow controls.

## Guardrails

- Do not expose `source fit`, review score, or conversion notes in My Flow.
- Do not make Items separate tasks just to match a checklist UI.
- Do not add raw ICS fields to the user detail sheet by default.
- Do not treat the v9 click rehearsal as real validation.
- Do not collapse official health/legal-ish source facts into user advice.
