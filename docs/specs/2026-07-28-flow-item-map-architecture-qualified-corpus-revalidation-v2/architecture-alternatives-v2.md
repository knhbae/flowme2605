# Architecture Alternatives v2

**Input:** `docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json`  
**SHA-256:** `aa85b1da3b4403694895cc0647e462daefaec47930a7f43611a489c29db5a16f`  
**Evidence:** deterministic contract comparison; observed-user validation and external calendar account round-trip are **NOT RUN**

## Frozen corpus

- 8 Bundle / 21 Flow / 49 Step
- 160 Item / 210 SourceRow
- 112 scheduled / 48 undated Item
- All three alternatives use the same Item boundaries, schedules, completion modes, and SourceRow refs.

## Result

| Alternative | Recomputed score | Verdict | Failed hard gates |
| --- | ---: | --- | ---: |
| Current canonical | 95/100 | Go | 0 |
| Literal ICS-first | 46/100 | Hold | 2 |
| Item-first shared context | 89/100 | Modify | 0 |

The v1 values 96/51/95 were not reused. Every v2 dimension is calculated as
`round(max × factor)`; projection loss is calculated from six target projections
and seven semantic paths. See `architecture-scorecard-v2.json` for every formula
and factor.

## A. Current canonical

`SourceRow → Item → Step → Flow → Bundle/Flow Map → projection`

- Keeps 160 independent completion owners and 210 direct SourceRow references.
- Scheduled Items can become VEVENT; 48 undated Items remain valid without a fake date.
- Rights, review, and private overlay remain outside user exports.
- Adopt with an explicit projection-time `none | per_item | step_bundle` policy.

## B. Literal ICS-first

`VCALENDAR → VJOURNAL/VEVENT/VTODO + RELATED-TO + X-properties`

- Local syntax checks can represent 112 VEVENT and 48 VTODO as siblings.
- It recovers 210 references only because the lab parser understands
  `X-FLOWME-SOURCE-ROWS`.
- 112 VEVENT Items have no native FlowMe manual completion state.
- VTODO, RELATED-TO, VJOURNAL, and X-property client round-trip are unproven.
- A sidecar is still required for rights, review, and private overlay, defeating
  the claim that ICS is the complete canonical model.

## C. Item-first shared context

`SourceRow → Item → sharedContextRef → Step/Flow/Map → projection`

- Semantic rehydration passes and Item remains the state owner.
- 6 equal-schedule groups bind
  27 Items.
- Those groups occur in only one distinct Bundle, below the frozen three-Bundle
  adoption gate.
- Persisting a new entity does not reduce current setup fields enough to justify
  schema and migration cost. Keep the idea at projection time.

## Projection decision

- Per-item Calendar: 112 VEVENT.
- Compact moving Calendar: 91
  VEVENT, reducing 21 calendar
  entries while declaring independent-completion loss for
  27
  child Items.
- Undated: 48 VTODO candidates,
  default-disabled until a target capability check passes; every one has
  Checklist/Todo/Sheet/Memo fallback.

## Decision

Keep current canonical v1 and add projection-time schedule grouping. The larger
undated share (48/160, 30%) strengthens—not weakens—the rule that ICS is a
projection rather than the Flow content unit.
