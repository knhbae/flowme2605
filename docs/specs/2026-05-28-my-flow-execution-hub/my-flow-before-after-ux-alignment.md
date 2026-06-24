# My Flow Before/After UX Alignment

**Date:** 2026-06-24  
**Status:** Review draft before further product-code changes  
**Scope:** `/my`, `/f/[slug]`, source-backed Flow Map routes, creator/public/review surface separation  
**Related:** [source-backed-step-contract.md](./source-backed-step-contract.md), [tasks.md](./tasks.md), [Flow execution types](../../flow-rules/flow-execution-types.md), [Export destination fit](../../flow-rules/export-destination-fit.md), [v11 user PoC](../../content-audit/2026-06-24-my-flow-saved-execution-v11-ko.html), [v11 rehearsal](../../content-audit/2026-06-24-my-flow-saved-execution-v11-rehearsal-ko.html)

## Why This Document Exists

The next product step should not treat the new My Flow / Flow Map UX as a replacement for the existing product. The existing product already has substantial execution, export, storage, and route behavior. The right next move is to decide which new UX principles should be layered onto that product, which current behavior should be preserved, and which prototype-only ideas should stay out of production code.

This document is the handoff checkpoint before deeper implementation.

## Current Judgment

The current product is not empty or failed. It already supports a working single-Flow execution model and a saved-Flow management model.

The new UX work is trying to solve a narrower problem:

```text
How should source-backed Flow Maps and saved multi-Flow content enter My Flow without making the user surface heavier than a calendar, reminder, todo, or light spreadsheet app?
```

The answer is not to expose the whole internal hierarchy everywhere. The current direction is:

```text
Flow Map > Flow > Step > Item
```

But `/my` should still behave like a lightweight execution surface. Users should mostly see today's Step, the selected date, the selected Flow, or the selected Map path. Creator/review/source structure should stay on creator, public save-before, or review pages.

## What The Existing Product Already Had

### 1. Public Flow Execution Routes

Surface:

- `/f/[slug]`
- `components/flow/AppClient.tsx`

Already working:

- Public Flow pages with source, category, risk, status, and conversion metadata.
- Anchor/date setup for timeline, routine, and dated flows.
- No-anchor flows that open directly into checklist, memo, or sheet-style artifacts.
- Artifact workbench patterns for calendar, checklist, sheet, memo, decision, evidence, and routine-like flows.
- Export actions such as text, ICS/calendar, and workbook-like outputs.
- Source/risk cues for sensitive official or quasi-official content.

Preserve:

- Public Flow should remain artifact-first.
- A source-backed Flow should still produce a concrete calendar/checklist/sheet/memo artifact.
- Sensitive flows should keep source and risk context separated from user action.
- User-facing public pages should not become developer review pages.

Do not preserve blindly:

- Any public-page explanation that only exists to justify an internal test or review.
- Any generic checklist/card generated because the shared workbench supports it.

### 2. My Flow Saved Execution Surface

Surface:

- `/my`
- `components/flow/AppClient.tsx`
- `lib/flow/storage.ts`

Already working:

- Saved Flow records in browser storage.
- Today, Calendar, Flow, Checklist, and Routine views.
- Mobile simplification for one saved Flow.
- Larger saved inventories that collapse into search/filter flows.
- FullCalendar-backed calendar interactions.
- Selected date detail and selected item detail.
- Check state, memo state, routine occurrence movement, skipped/hold-like item states, and local draft behavior.
- Demo modes such as `?demo=ux12`, `?demo=ux20`, and now `?demo=source-backed`.

Preserve:

- My Flow should start from execution, not from management taxonomy.
- Mobile should stay lighter than desktop.
- A single saved Flow should not expose the full global management UI by default.
- Dense inventories should have search/filter or collapsed entry points.
- Calendar remains useful as a secondary date-finding view.

Do not preserve blindly:

- Repeated progress bars inside already-progressed parent cards.
- Repeated Flow/Map labels where the parent context is already visible.
- Buttons whose result is not obvious.
- Static information cards that look like tappable action cards.

### 3. Item Type And Export Model

Surface:

- `lib/flow/types.ts`
- `lib/flow/export.ts`
- `lib/flow/storage.ts`
- `docs/specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md`
- `docs/specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md`

Already working:

- Existing `FlowBundle`, `FlowItem`, and `FlowItemDetail` carry most execution data.
- Existing item behavior can derive scheduled tasks, routine sessions, decision/hold rows, memo/evidence rows, log rows, check tasks, and caution flags.
- Export code can shape Flow content for text, ICS/calendar, and workbook-like destinations.
- `FlowItem.date_window` now represents official date ranges without inflating one source row into many daily completion rows.

Preserve:

- `Step` should map to one `FlowItem`.
- `Item` should stay inside `FlowItemDetail`, memo/detail text, event descriptions, sheet notes, or fallback text.
- A Step may carry calendar-event-compatible metadata without exposing raw ICS fields in the default user detail UI.

Do not add yet:

- A first-class visible `progress_step` type.
- Raw ICS/calendar editor fields on every Step.
- Separate tasks for every Item unless the source treats them as independent execution rows.

### 4. Review, Lab, And Content-Audit Artifacts

Surface:

- `/flow-lab`
- `docs/content-audit/*.html`
- `docs/flow-rules/*`
- `docs/DECISIONS.md`

Already working:

- Content-lab and content-audit documents capture source-to-Flow judgment, candidate quality, UX rehearsals, and internal review.
- Decisions document durable product rules such as `Flow Map > Flow > Step > Item`, source-backed bridge boundaries, date-window behavior, and My Flow card affordance rules.

Preserve:

- Review artifacts should continue to exist.
- Review artifacts should not be confused with the user product.
- Polished PoC HTML is evidence for direction, not real user validation.

Do not preserve blindly:

- Review score, source-fit labels, developer notes, or rehearsal commentary inside user-facing screens.

## What The New UX Work Is Trying To Add

### 1. Flow Map As A Parent Layer

New requirement:

- Some creator/source content is not a single Flow.
- It is a parent map containing related Flows.
- Examples: 중1 수학 목차, 영유아 검진·접종 일정.

Product implication:

- A Flow Map should be visible before save/publication as a parent structure.
- After save, My Flow should not show every internal relationship at once.
- My Flow should show the user's current execution context and allow drilldown when needed.

Current bridge:

- `/flow-maps/[map]`
- `/flow-maps/[map]/creator`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `lib/flow/source-backed-my-flow.ts`

Do next:

- Treat the current implementation as a bridge package.
- Decide whether it becomes a durable creator/public map schema later.

Do not do yet:

- Rebuild all saved My Flow inventory around Flow Map before real creator/public schema needs it.

### 2. Surface Separation

New requirement:

```text
Creator surface != Public save-before surface != My Flow execution surface != Review/report surface
```

Expected behavior:

- Creator surface shows source rows, generated Step rows, publish checks, versioning, and source review.
- Public surface shows what the user will save and the minimum input needed.
- My Flow surface shows saved execution, checks, memo, date, source link, and next action.
- Review/report surface shows scoring, concerns, simulation notes, and product critique.

Why it matters:

- The user repeatedly flagged that user-facing Flow UX, developer review, and explanation screens were mixed.
- Mixed surfaces make a usable Flow look like a review document.

Production rule:

- If a UI element says or implies `source fit`, `PoC`, `review`, `developer`, `evaluation`, `전세급`, or `score`, it does not belong in the user execution surface.

### 3. Step-Centered Execution

New requirement:

- `Step` is the minimum row that can become a calendar event, todo task, checklist row, sheet row, memo row, or progress row.
- `Item` is supporting detail inside a Step.

Product implication:

- My Flow should not force every Step to expose nested checklists by default.
- A Step detail can show Item checks when useful.
- External apps may only receive Items as text fallback.

Good:

```text
Step: 1차 건강검진 · 생후 14~35일
Items: 예약, 문진표, 방문, 결과 위치 메모
External calendar description: the Items as plain text
```

Bad:

```text
Create four separate calendar events only because the UI has four checklist items.
```

### 4. Lighter Card Affordance

New requirement from v11:

- Static summary cards and clickable action cards must look different.
- Clickable cards should say what will happen, such as `열기`, `접기`, `보기`, or `선택됨`.
- Static cards should not carry active/selected styling.

Why:

- In the v11 rehearsal, users could not reliably tell whether some cards were buttons or explanation blocks.
- The product should feel closer to a calendar/todo app than a dashboard.

Do next:

- Audit `/my` for summary/action ambiguity before adding more controls.

## What PR #114 Actually Represents

PR #114 should be understood as a bridge and evidence PR, not as final product UX completion.

It includes:

- Source-backed Flow Map public and creator routes.
- Source-backed bundle adapter and tests.
- Public Flow Map save into real `/my`.
- Parent map saved snapshot metadata.
- Date-window metadata for official range schedules.
- My Flow source-backed demo path.
- E2E coverage for the public save-to-My-Flow path.
- Content-audit artifacts from Flow Map and My Flow UX iteration.

It does not prove:

- Real user validation.
- Final creator authoring UX.
- Final Flow Map persistence schema.
- Final saved-library IA for many mixed Flow Maps.
- That every PoC screen should be copied into production.

## Before/After Decision Table

| Area | Previous product | New UX pressure | Decision before code changes |
| --- | --- | --- | --- |
| Public `/f/[slug]` | Artifact-first single Flow execution | Source-backed maps add parent/child context | Keep existing route pattern. Add map public pages only when the source truly has parent structure. |
| `/my` Today | Aggregates saved execution rows | Flow Map children may create more rows | Keep Today Step-first. Do not show creator map structure by default. |
| `/my` Calendar | Month grid plus selected-day detail | Many mixed Steps may crowd dates | Keep calendar as date-finding view. Group crowded date detail by Flow/Map path if needed. |
| `/my` Flow tab | Saved Flow cards, filters, inventory collapse | Flow Map child Flows need context | Small inventory can show cards directly. Large inventory needs filter/search. Child Flow display should not duplicate Map display. |
| `/my` Map tab | Not fully durable yet | Parent map is needed for source-backed content | Add only when map persistence/creator workflow is clear. Do not fake a heavy map dashboard. |
| Step detail | Checks, memo, detail, source/advanced info | Items and source links need fallback | Keep detail hidden until selection. Show item checks/memo/source link only when useful. |
| Export | Text, ICS, workbook | Step/Item portability must be explicit | Keep Step as export row. Items become description/note text unless source requires separate rows. |
| Creator/public map | Bridge route exists | Need source-row editing/versioning later | Keep creator prep separate from user execution. Do not make `/my` a creator review surface. |
| Review docs | Content-audit and Flow Lab exist | PoCs look polished and may be mistaken as validation | Keep review artifacts separate. Label as internal evidence, not behavior validation. |

## Keep / Change / Hold

### Keep

- Existing single-Flow execution and artifact workbench.
- Existing My Flow saved execution foundation.
- Existing localStorage bridge for current MVP-scale PoC.
- Existing export destinations.
- Existing item-type derivation until a specific type cannot be represented.
- Calendar/todo/reminder-level input complexity.

### Change

- Make clickable vs static cards more visually and textually distinct.
- Keep user/review/creator/public surfaces separate.
- Ensure source-backed public save goes to real `/my`, not only demo mode.
- Preserve parent map snapshot metadata without showing it everywhere.
- Keep official date ranges as one Step with period metadata.

### Hold

- First-class production Flow Map database schema.
- Full creator editor for source-row editing/version review.
- First-class `progress_step`.
- Raw ICS event editor on default Step detail.
- Public claims that PoCs are validated.
- Global My Flow controls for every possible Flow category.

## Product-Code Alignment Checklist

Use this before further My Flow or Flow Map code changes.

1. Does the change preserve the existing `/f/[slug]` artifact-first model?
2. Does `/my` still start from current execution rather than source/review explanation?
3. Is the visible user input no more complex than a calendar, reminder, todo, or light sheet?
4. Can the user tell which cards are clickable and what will happen?
5. Is `Step` still the minimum exportable/schedulable row?
6. Are `Items` kept inside Step detail, memo, event description, sheet note, or text fallback?
7. Are creator, public save-before, My Flow, and review surfaces separated?
8. Are source/risk/official facts separated from user action?
9. Does the change avoid raw internal terms such as `source fit`, `bundle`, `anchor`, or review score in user-facing copy?
10. Does the change avoid claiming real validation without observed user behavior?

## Recommended Next Work

### Step 1: Product audit before more UI changes

Audit current actual routes against this document:

- `/my`
- `/my?demo=source-backed`
- `/flow-maps/middle-school-math-1`
- `/flow-maps/middle-school-math-1/creator`
- `/flow-maps/baby-health-schedule`
- `/flow-maps/baby-health-schedule/creator`

Output:

- What already matches the new UX direction.
- What is product-ready enough to keep.
- What is bridge-only.
- What should stay in docs/content-audit.

### Step 2: Decide the next code slice

Do not start with more visible My Flow controls. The stronger next slice is likely one of:

1. Creator-side source-row editing/version review.
2. Real Flow Map persistence shape.
3. A production-safe Map tab rule for `/my`.
4. A smaller `/my` affordance cleanup that only separates static cards from action cards.

### Step 3: Keep validation language conservative

Current status is:

```text
Internal PoC, route integration, and automated behavior evidence.
```

Not:

```text
User-validated product UX.
```

## Bottom Line

The previous product should be treated as a working execution product, not as disposable prototype code. The new UX should be applied as a selective alignment layer:

- preserve the single-Flow execution foundation,
- add source-backed Flow Map bridges where the source structure truly requires it,
- keep `/my` simple and Step-centered,
- keep creator/public/review/user surfaces separate,
- defer heavier schemas and controls until creator workflow or real user behavior forces them.

