# Source-backed Flow Map Productization Baseline

**Date:** 2026-06-24  
**Status:** Productization planning baseline, with 2026-06-25 quality reset
**Scope:** `/flow-maps/[map]`, `/flow-maps/[map]/creator`, `/my`, source-backed map adapter, saved map snapshot, Step/Item export contract  
**Related:** [Source-backed Step contract](../2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [My Flow before/after UX alignment](../2026-05-28-my-flow-execution-hub/my-flow-before-after-ux-alignment.md), [FLOW quality gate](../../flow-rules/quality-gate.md), [Quality PRD](./quality-prd.md), [2026-06-25 candidate reassessment](../../content-audit/2026-06-25-source-backed-flow-map-candidate-reassessment-ko.html)

> **Canonical compatibility notice (2026-07-12):** This document preserves the June runtime/UX naming. New backend and export contracts follow [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md): canonical `Item` is the minimum independently stateful execution/projection unit and canonical `Step` is grouping. Map legacy `FlowSection -> Step`, `FlowItem -> Item`, and detail prose -> Field/Memo/SourceRef; do not use the Step-first wording below as the new storage contract.

## Goal

Turn the accepted source-backed Flow Map experiments into a productization baseline without making the user-facing surface heavier than a calendar, todo app, or light sheet.

This is not a claim that the product UX is user-validated. It is a checkpoint that says which source-backed patterns are strong enough to guide the next implementation slice.

## Product Question

Can FlowMe take a creator or official source, preserve its real structure, let a user save it, and then show the saved result in My Flow as executable Steps without mixing user screens, creator prep, and review commentary?

## Working Hierarchy

```text
Flow Map > Flow > Step > Item
```

- **Flow Map:** parent structure from a source or creator package.
- **Flow:** child artifact inside the map.
- **Step:** minimum executable/exportable row. A Step can become a calendar event, todo row, sheet row, memo row, or progress row.
- **Item:** supporting detail inside a Step. In FlowMe it may render as checklist detail; in external tools it should fall back to plain text.

## Representative Baseline Cases

These cases were the initial productization baseline. After the 2026-06-25 quality review, `moving-d30` remains the strongest representative baseline, `middle-school-math-1` remains a candidate for Flow Map structure, and `baby-health-schedule` is no longer treated as representative until its source-derived Step content is rebuilt. Code-level exposure now follows `sourceBackedFlowMapQualityDecisions` and `getSourceBackedHomepageFlowMaps()` rather than route existence.

| Case | Source shape | User job | Natural artifact | Input | Product decision |
| --- | --- | --- | --- | --- | --- |
| `middle-school-math-1` | Reference curriculum / table of contents | Save the curriculum as a progress table and mark source units already covered | Sheet-like progress list with source unit Steps and subtopic Items | None by default | Keep. Do not invent study coaching routines unless the source provides them. |
| `baby-health-schedule` | Official health schedule and lookup guide | Save official checkup and vaccination timing against one child birthdate | Calendar reminders plus memo/source detail | Child birthdate | Revise before representative use. Current Step actions are not information-rich enough for a user-facing baseline. |
| `moving-d30` | Creator moving checklist timeline | Turn one moving date into dated preparation reminders | Calendar timeline plus checklist/memo detail | Moving date | Keep as a strong timeline/hybrid comparison case. |

## Product-Ready Enough For The Next Slice

The current implementation is strong enough to guide the next product work in these areas:

- Public Flow Map pages can show source, child Flow artifacts, minimal setup input, and a save action.
- Saving a public map can create child saved Flow records and a parent map snapshot.
- My Flow can render saved source-backed Steps without forcing creator/review structure into the user surface.
- Step detail can hold Item checks, source links, memo hints, and text fallback.
- Official date windows can remain one executable Step while preserving the official period in detail/export text, but only when the Step detail gives users practical source-derived preparation, lookup, or booking context.
- Mobile post-save paths can bring the user to the relevant My Flow surface instead of leaving them at a dead end.
- My Flow Flow inventory can separate ready execution content from review, preview, and legacy content without changing Today or Calendar into review surfaces.
- My Flow Calendar selected-date detail can group Step rows by saved Flow Map or Flow, so many dated Steps do not appear as one flat, contextless list.
- My Flow Calendar can expose compact scope filters only when saved rows mix maps, schedules, and routines; simple one-type calendars stay control-light.
- My Flow can reassess saved source-backed map snapshots and show an update notice without automatically changing saved Steps.
- Creator pages can now review each source row as a generated Step with Item fallback preview, source/risk labels, completion/memo cues, and row-level publish readiness.

## Bridge-Only, Not Final Product

The following parts should not be treated as finished product architecture:

- `lib/flow/source-backed-my-flow.ts` is still a source-backed adapter/fixture registry, not final creator-map persistence.
- Local storage saved records are a bridge, not the final account or database model.
- Creator pages show publish preparation and source-row review, not a real authoring editor.
- Saved map update handling is a policy/metadata proof, not a complete user update UI.
- The current PoCs and automated tests are internal evidence, not observed user validation.

## Persistence Contract V1

The current bridge now writes two records when a public Flow Map is saved:

| Key | Purpose | Product status |
| --- | --- | --- |
| `flow:map:saved:{mapId}` | Backward-compatible saved map snapshot used by existing My Flow grouping | Bridge compatibility record |
| `flow:map:persistence:{mapId}` | Productization record with schema version, map metadata, saved source surface, readiness, update assessment, and child Flow bindings | V1 planning contract, not final DB schema |

The V1 persistence record is intentionally more explicit than the compatibility snapshot:

- `schemaVersion: 1`
- `recordType: saved_source_backed_flow_map`
- parent map metadata and update policy
- saved timestamp, anchor, and source surface
- readiness state for current My Flow use
- update assessment for future source/package changes
- child Flow bindings with structure type, anchor type, primary destination, risk, source, Step count, Item fallback count, and Step ids

This lets future DB or creator/editor work inherit a clear shape without making the user-facing My Flow screen heavier.

## Readiness Separation V1

My Flow now treats readiness as a display contract:

| Readiness | Source signal | User surface |
| --- | --- | --- |
| Ready | saved source-backed map, source-backed bundle, or `source_status: real` | Normal execution card |
| Review | `source_status: needs_review` | Review-needed section and lower-confidence card tone |
| Preview | `source_status: preview` | Sample/experiment section and lower-confidence card tone |
| Legacy | no source status or older unclassified content | Previous-standard section and lower-confidence card tone |

This separation is intentionally limited to Flow inventory surfaces. Today and Calendar still show executable rows because users may have saved those rows intentionally. Review wording should not be inserted into every date cell or Step detail.

## Creator Source-Row Review V1

Creator publish preparation now exposes a source-to-Step review row for each generated Step:

| Field | Purpose |
| --- | --- |
| review status | Shows whether the row is ready, missing a source link, or needs Item fallback review. |
| source/risk labels | Keeps official, reference, creator-experience, and sensitive-source boundaries visible to the creator. |
| detail Items | Shows the source-derived Item text that will become FlowMe checklist detail or outside-app text fallback. |
| completion and memo cues | Lets the creator check whether the generated Step has enough execution meaning without opening the user screen. |
| source link | Keeps source evidence near the generated row. |

This is still not a full creator editor. The current scope is review-before-publish clarity. Editing source rows, changing Step titles, and managing versions remain follow-up work.

## Stage Fit

This belongs in the current stage because it protects the next code slice from overbuilding:

- It keeps the saved execution surface Step-centered.
- It preserves source-backed content fidelity.
- It separates public, creator, My Flow, and review surfaces.
- It avoids adding a broad marketplace, heavy editor, or full persistence layer before the source-backed path is stable.

## First User Action

The first user action depends on the case:

- Math: save the progress table, then open the first source unit Step.
- Baby health: enter child birthdate, save official timing, then open the next relevant checkup or lookup Step.
- Moving: enter moving date, save dated timeline, then open the nearest preparation Step.

Completion looks like a Step check, memo entry, source link visit, export/copy action, or returning to the next relevant Step.

## Artifact Destination

| Case | Calendar | Sheet/progress | Memo/text | Internal check |
| --- | --- | --- | --- | --- |
| Math | Optional only if user dates a unit later | Primary | Source unit link and revisit memo | Unit/subtopic completion |
| Baby health | Primary for reminders and official windows | Optional lookup/status table later | Official period, source URL, caution text | Reservation/result status |
| Moving | Primary timeline | Optional execution table | Vendor/contact/reservation memo | Step completion |

## Source And Risk Boundary

- Official health facts remain source facts, not FlowMe advice.
- Creator checklist experience stays separate from official links such as government or registry sites.
- Reference study rows stay close to the source table of contents; FlowMe does not invent a study method.
- Review scores, source analysis, or PoC notes stay out of user-facing screens.

## Non-Goals

- Final database schema for Flow Map persistence.
- Full creator editor for source-row editing and version review.
- First-class visible `progress_step` type.
- Raw ICS/calendar editor fields on every Step.
- Production claims that this has been validated by real users.
- Expanding to more categories before this baseline is reflected cleanly in the product.

## Completion Criteria

This baseline is ready to guide implementation when:

- The three representative cases remain source-backed and do not rely on generic filler content.
- Each case has one clear natural artifact and no more setup input than necessary.
- User, creator, public, and review surfaces remain separate.
- Creator source-row review shows source, Step, Item, risk, and readiness without user execution controls.
- My Flow shows current execution first and reveals map/source hierarchy only when useful.
- Step stays the minimum exportable/schedulable row.
- Item stays detail/fallback text unless the source requires a separate Step.
- Automated tests cover public save, My Flow rendering, source-backed rows, date-window behavior, and mobile post-save navigation.
- Public save writes both the compatibility snapshot and the V1 persistence record without changing the current My Flow user surface.
- Mixed saved inventories show ready source-backed content apart from review-needed or legacy saved content.
- Calendar selected-date detail groups Steps by Flow Map or Flow and suppresses duplicate child Flow/progress chips when a single-Flow map already provides the context.
- Calendar scope filters narrow both month events and selected-date detail without appearing on simple one-type calendars.
- Saved map update notices appear in My Flow when a saved source-backed snapshot differs from the current map, but existing Step rows and check state are not auto-mutated.
