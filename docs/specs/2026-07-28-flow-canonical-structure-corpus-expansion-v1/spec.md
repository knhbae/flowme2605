# Flow Canonical Structure Corpus Expansion & Planning Handoff v1

**Date:** 2026-07-28  
**Status:** Complete — local research/data-contract handoff  
**Runtime impact:** None  
**Primary output:** source-backed canonical corpus, conversion contract, planning handoff, Korean review HTML

## Objective

Expand the frozen Qualified v2 baseline from 8 source-backed fixtures to at least
40 unique structure fixtures and use the larger corpus to decide the reusable
contract for:

```text
SourceRow -> Item -> Step -> Flow -> Bundle / Flow Map -> Projection
```

The corpus is a planning and backend-contract evidence set. It is not a public
content catalog, legal clearance, medical review, observed-user validation, or
external Calendar interoperability test.

## User need

As a FlowMe planner defining URL-to-Flow output, I need many different real
source shapes represented by one traceable contract, so that backend and UX work
can share stable Item, schedule, state, grouping, input, and projection rules.

## Working hypothesis

- `SourceRow` is the minimum evidence unit.
- `Item` is the minimum independently stateful execution unit.
- `Step` groups Items but does not own completion.
- `Flow` owns one user job and one primary source.
- `Bundle / Flow Map` groups related Flows without absorbing their execution state.
- Calendar, Checklist, Todo, Sheet, and Memo are projections.
- Calendar export may group source-equal same-date Items at projection time, but
  child Item IDs and independent completion remain canonical.
- An undated Item never becomes a `VEVENT`.

The hypothesis may be extended only when the same structural need recurs across
independent fixtures. A one-off source does not earn a new canonical enum.

## Evidence lanes

1. **Frozen canonical baseline:** the 8 Qualified v2 bundles and their 210
   SourceRows.
2. **Row-complete research packets:** deep-set and value-qualified gold contracts.
3. **Live reverified source packets:** public source pages reopened for this
   goal and converted only from the captured rows. Prior P0 `currentItems`
   summaries remain candidate evidence and are not counted as SourceRows until
   the original source is reverified.
4. **Boundary controls:** incomplete subscriber/lazy-loaded sources; retained only
   to prove omission/stop logic and excluded from complete-fixture counts.
5. **Candidate-only and vertical opportunities:** lineage only; never counted as
   converted fixtures without rows.

## Minimal review boundary

Sensitive domains are not rejected merely because they are medical, parenting,
legal, administrative, vehicle, food, or safety related. When source rows exist,
they can be represented as `research_only` structure fixtures.

The structure lab stores only:

- source access/evidence tier,
- observed date,
- `reviewFlags`,
- `publicReadiness: not_assessed`.

It does not calculate public Go/Modify/Hold, rights scores, or safety promotion
scores. Source cautions remain source facts. No external advice is added.

## Hard structural stops

A candidate is not a complete fixture when:

- the required source rows are unavailable,
- access restrictions would need to be bypassed,
- an action, date, recurrence, or completion rule must be invented,
- Item provenance cannot be maintained, or
- unrelated sources must be blended into one Flow.

## Corpus contract

Every complete fixture contains:

- stable identity and input lineage,
- one primary source and snapshot evidence,
- complete captured SourceRows for the bounded job,
- taxonomy v1.1 classification,
- Bundle/Map, Flow, Step, and Item references,
- Item intent, completion, optional schedule, Fields, conditions, dependencies,
  Memos, and SourceRefs,
- required, optional, auto-filled, and never-reask input values,
- projection eligibility and loss/fallback notes,
- SourceRow-to-Item/Field/Memo/omission accounting,
- evidence-tier and structure-only claim boundary.

## Coverage dimensions

Coverage is structural, not category-quota based:

- all controlled source shapes where actual rows exist,
- all seven execution patterns,
- Item intents `act`, `inspect`, `decide`, `record`, `use_resource`,
- completion modes `check`, `decision`, `record`,
- no schedule, absolute, date window, anchor offset, and recurrence metadata,
- 1:1, many:1, many:many, Field, Memo, and omitted row accounting,
- single Item, multi-Item Step, multi-Step Flow, multi-Flow Map, variants,
  shared context, and projection-time grouping,
- Calendar, Checklist, Todo, Sheet, Memo, and no-Calendar outcomes,
- zero-input, one-anchor, one-choice, two-input, source-filled, and run-time Field
  paths.

## Saturation rule

The corpus is considered planning-ready when:

- at least 40 complete unique fixtures exist,
- all seven execution patterns have real cases,
- all five projection families have natural cases,
- major schedule, intent, completion, and grouping paths are present,
- recent confirmation batches require no new mandatory field or common rule, and
- remaining gaps are explicitly source-acquisition or observed-user questions.

## Runtime boundary

This goal does not change:

- `lib/flow/types.ts`,
- `lib/flow/export.ts`,
- app routes/components,
- database/schema migrations,
- seeds,
- production API/crawler/LLM,
- authentication or provider integrations.

The runtime is compared through a crosswalk only.

## Deliverables

All required JSON, Markdown, schema, validator, tests, and the review HTML are
generated or maintained under this spec folder and `docs/content-audit/`.

The Korean HTML contains:

- a 30–40 screen explanatory main deck,
- 12 representative cases shown across two screens each,
- a separate filterable explorer for every complete fixture,
- structure-first filters rather than public/rights filters.

## Claim boundary

Passing schema, provenance, document, and browser checks means the research
artifact is internally consistent. It does not prove user usefulness, public
clearance, medical/legal correctness, or Google/Outlook/Apple Calendar round trip.
