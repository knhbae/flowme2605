# QA contract

## Corpus

- [x] Baseline contains exactly 42 complete fixtures.
- [x] Baseline totals remain 406 Item and 484 SourceRow.
- [x] New fixture count is at least 18.
- [x] New canonical URL count is at least 12.
- [x] Event-native fixture count is at least 12.
- [x] No new URL duplicates a baseline URL.

## Projection matrix

- [x] Frozen baseline has exactly 210 fixture/projection cells.
- [x] Every cell has recommendation, availability, fidelity, generated,
      minimumUserInputs, capability, loss, prohibition reason, and fallback.
- [x] Checklist and Todo use different schemas and grouping.
- [x] A misleading/prohibited cell emits zero records.
- [x] Memo is never labelled canonical raw data.

## Scheduling

- [x] Undated source Item produces zero source-derived VEVENT.
- [x] Due-only task produces zero time-block VEVENT.
- [x] Every generated schedule records source/user/system provenance.
- [x] Pacing has zero duplicate or missing Item.
- [x] Pacing preserves order and dependencies.
- [x] Identical pacing input produces an identical result.
- [x] Policy revision leaves completed past occurrences unchanged.
- [x] Variable annual festivals produce no yearly RRULE.
- [x] VEVENT and VTODO never nest.
- [x] Every VTODO-unsupported destination has a fallback.

## Grouping

- [x] Bundles preserve every child Item ID.
- [x] Calendar completion loss is explicit.
- [x] Incompatible time, place, or context prevents bundling.

## Agreement

- [x] Checklist/Todo agreement is at least 90%.
- [x] Primary projection agreement is at least 90%.
- [x] Disagreements include an adjudication reason.

## Report

- [x] First three cases are WEB1, moving day, and event/exam content.
- [x] At least five cases show all five projection outputs.
- [x] Each section answers one question or presents one case.
- [x] 1440×900: no overflow, broken image, or console error.
- [x] 390×844: no overflow, broken image, or console error.

## Claim boundary

- [x] Automated QA is not described as observed-user validation.
- [x] External Calendar/VTODO round-trip is `NOT_RUN`.
- [x] Runtime, DB, production API, seed, and UX files are unchanged.
