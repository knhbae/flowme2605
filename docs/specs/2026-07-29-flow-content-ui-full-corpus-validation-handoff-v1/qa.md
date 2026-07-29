# QA contract

## Current evidence ledger

| Evidence | Current state | Meaning |
| --- | --- | --- |
| Machine-readable corpus | `GENERATED` | 156 Gallery / 110 normal / 893 Item / 1,172 SourceRow / 550 projection cells |
| Current integrated machine validator | `61/61 PASS` | Corpus, projection, semantic/manual adjudication, planning handoff, final Gallery/report fingerprints and browser evidence satisfy the integrated machine contract |
| Final schema, validator and targeted test rerun | `14/14 PASS` | `validate-v1.test.mjs` and `semantic-provenance-audit-v1.test.mjs` |
| Manual semantic adjudication self-validation | `13/13 PASS` | Frozen 141-field queue and 37 / 87 / 17 / 0 distribution reconcile exactly |
| Current integrated docs check | `PASS_FINAL_SNAPSHOT` | `npm.cmd run docs:check`; 14 required files and 2,578 local links after the stable Gallery/report fingerprints |
| Independent review surface | `FROZEN_PRE_NORMALIZATION` | A2/B2 inspected Gallery SHA `9be4105d…c1d7d0b`, view SHA `25aacc34…05b9` and projection SHA `10a76006…74eb`; final source-field/tier/display normalization was not mislabeled as a rerun |
| Current Gallery surface | `FINAL_BROWSER_QA_PASS` | Final SHA `021667d19d042a5dfd418f3dbcbf553fd871a08b0fd47703fe716538419aaf56`; all current routes were rechecked after the final normalization |
| Desktop/tablet/mobile browser QA | `PASS` | 1440×900, 768×1024 and 390×844: horizontal overflow 0, broken asset 0, console error 0 |
| Local user review | `NOT_REVIEWED_BY_USER` | No agent result may populate it |
| Observed-user validation | `NOT_RUN` | Browser automation is not observed use |
| External Calendar/VTODO round-trip | `NOT_RUN` | No Google/Outlook/Apple account round-trip evidence exists |

The final closeout replaces the pending rows only with commands and evidence
actually produced after the final rebuild.

## Claims

- Automated validator, agent review and browser QA are internal evidence.
- `observedUserValidation` remains `NOT_RUN` until the user submits review data.
- `externalCalendarVtodoRoundTrip` remains `NOT_RUN`.
- Draft pacing previews are never reported as confirmed source schedules.

## Corpus

- Product candidate + Structure probe `>= 80`.
- New source URLs directly inspected `>= 24`.
- New source-backed normal content `>= 16`.
- Boundary count is excluded from the normal count.
- Duplicate `normalizedCanonicalUrl + normalizedUserJob` is zero.
- Every omitted eligible record has an exclusion reason.
- All included records have input artifact hashes.

## Canonical and provenance

- Every Item references an existing Step and SourceRow.
- Every Step references existing Items.
- Every generated record references canonical Item/Occurrence IDs.
- Source/user/system schedules remain separate.
- Unsupported source rows are explicitly omitted with a reason.
- The frozen trace-only queue has 141 manual decisions: 37
  `verified_equivalent`, 87 `bounded_normalization`, 17 `needs_modify` and 0
  `unknown`.
- The 17 `needs_modify` fields affect 11 contents and remain linked to their
  content, gap and planning records.
- Completion owner/provenance remains open for 412 Items; schedule
  owner/derivation remains open for 124 Items.
- Therefore the full-corpus zero-invention claim remains `NOT_PROVEN`. Passing
  deterministic projection and pacing invariants must not be restated as
  semantic proof for every action, date, recurrence or completion field.

## Projection

- Exactly five cells for every normal content.
- At least 400 cells when normal content is 80.
- No blank `N/A`.
- Every cell has recommendation, availability, fidelity and generation state.
- Every cell has output, draft preview, or prohibition reason.
- Checklist grouping and Todo queue structure differ.
- Undated source Item source-derived VEVENT count is zero.
- Due-only automatic time-block count is zero.
- VEVENT/VTODO nesting count is zero.
- VTODO-unsupported fallback is never missing.
- Calendar bundle child IDs are complete and completion loss is declared.
- Sheet has stable ID columns.
- Memo has `canonicalRawData=false`.

## Pacing

- Target Item duplication and omission are zero.
- Source order and dependency reversal are zero.
- Source schedule overwrite is zero.
- Same input yields the same result hash.
- Draft remains unconfirmed until explicit apply.
- Locked past/completed occurrence changes are zero.

## Event

- Series/Edition/Occurrence references are valid.
- Occurrence/Window/Milestone provenance is row-specific.
- User-intent Item is not created before intent.
- Cancelled occurrence export count is zero.
- False yearly RRULE count is zero.
- Ticket/application windows are not fabricated time blocks.

## UI and review

- Every included content has one direct link.
- Every direct link opens the correct content and mode.
- Every Item can be expanded.
- Filter counts match JSON-derived counts.
- Initial user review state is `NOT_REVIEWED_BY_USER`.
- Internal-agent review never populates user review.
- localStorage reload and JSON export/import round trips pass.
- Foreign corpus fingerprints produce a warning.
- Unknown content IDs are reported.
- Review text is rendered safely.
- Placeholder and empty detail count is zero.

## Browser and visual

- 1440×900, 768×1024 and 390×844 are tested.
- Horizontal page overflow is zero.
- Broken assets and console errors are zero.
- Focus, Escape and return-focus behavior work for drawers/dialogs.
- The final screenshot is compared with the accepted design concept in the same
  visual QA pass.

The final pass is recorded in `browser-qa-v1.json`. It covers:

- normal detail 110/110;
- boundary and historical detail 46/46;
- normal projection 550/550;
- pacing 53/53;
- event 14/14;
- review 156/156;
- lineage 156/156;
- report representative sections 24/24.

All failed-route counts are zero. The clean final origin still contains zero
user reviews.

## Required final command/evidence sequence

1. Rebuild the final corpus, review synthesis, Gallery and summary report.
2. Run the strict schema/validator command and targeted test file.
3. Run `npm.cmd run docs:check`.
4. Open direct links and exercise filters, list/card view, projection tabs,
   pacing, event intent, review save/reload and review import/export.
5. Check 1440×900, 768×1024 and 390×844 for page overflow, broken assets,
   empty details and console errors.
6. Record a browser-QA JSON and visual-fidelity ledger before closing the
   corresponding task boxes.
