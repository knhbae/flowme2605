# QA

## Data

- complete fixture count is at least 40,
- baseline fixture count remains 8,
- every complete fixture has source rows,
- executable fixtures have at least one Item,
- a structure-only Field/Memo fixture may have zero Items when the decision is
  explicitly `structure_only_no_items` and no synthetic action is introduced,
- every Item SourceRef resolves,
- every SourceRow is accounted for as Item, Field, Memo, or omitted,
- every omission has a reason,
- canonical and source IDs are unique,
- URL duplicates are excluded from complete-fixture counts,
- primary and secondary projections do not overlap,
- `hybrid` is absent from new primary artifacts,
- structure fixtures use `publicReadiness: not_assessed`.

## Source fidelity

- invented action count: 0,
- invented date/recurrence count: 0,
- invented completion-criterion count: 0,
- source values re-requested from users: 0,
- incomplete boundary rows never become complete Items.

## Projection

- undated `VEVENT`: 0,
- nested `VEVENT`/`VTODO`: 0,
- scheduled Item calendar records retain stable Item IDs,
- step bundles retain child Item IDs,
- VTODO fallback is explicit,
- no-Calendar cases have Checklist, Todo, Sheet, or Memo output.

## Contract coverage

- all seven execution patterns,
- all five primary artifacts,
- all controlled Item intents and completion modes,
- absolute/date-window/anchor-offset/no-schedule paths,
- recurrence and occurrence identity policy,
- at least three shared-context or grouping cases,
- settled/configurable/open decision register.

## Report

- 30–40 main-deck screens,
- exactly 12 representative cases with two screens each,
- explorer card count equals complete fixture count,
- structural filters return real results,
- no empty image source or duplicate section ID,
- HTML below 2 MB,
- 1440×900 and 390×844 readable,
- no document-level horizontal overflow,
- no broken image or console error.

## Required checks

```powershell
node docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/build-corpus-v1.mjs
node docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/validate-v1.mjs
node --test docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/validate-v1.test.mjs
node docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/build-report-v1.mjs
npm.cmd run docs:check
```

External Calendar account round trip and observed-user validation remain
`NOT_RUN`.

## Final results

### Generated corpus

- complete fixtures: 42
- boundary controls: 4
- frozen Qualified v2 baseline fixtures: 8
- Bundle / Flow Map: 42 / 42
- Flow / Step: 55 / 225
- SourceRow / Item / Field / Memo: 484 / 406 / 246 / 19
- scheduled / undated Items: 144 / 262
- representative backend DTOs: 15
- duplicate exclusions: 8
- structurally redundant candidates: 0
- all structural coverage contract checks: PASS

### Automated checks

- schema and semantic validator: 1,308 / 1,308 PASS
- validator regression tests: 37 / 37 PASS
- docs check: PASS — 14 required files, 2,576 local links
- 38 main-deck screens, 12 two-screen representative cases, 42 explorer
  cards, and 11 filter families: PASS

### Browser checks

- 1440×900: document horizontal overflow 0, screen overflow 0, broken images
  0
- 390×844: document horizontal overflow 0, screen overflow 0, broken images
  0
- browser console errors / warnings: 0 / 0
- explorer filters checked: structure-only, many-to-many, Qualified v2
  baseline, canonical extension candidate

These are automated and visual artifact checks, not observed-user validation.
External Calendar account import/edit/re-export remains `NOT_RUN`.
