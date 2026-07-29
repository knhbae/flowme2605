# QA contract

## Current evidence ledger

| Evidence | Current state | Meaning |
| --- | --- | --- |
| Machine-readable corpus | `GENERATED` | 156 Gallery / 110 normal / 893 Item / 1,172 SourceRow / 550 projection cells |
| Current integrated machine validator | `54/54 PASS` | Final A2/B2 synthesis, manual semantic adjudication, planning handoff and gap register satisfy the integrated machine contract |
| Final schema, validator and targeted test rerun | `13/13 PASS` | `validate-v1.test.mjs` and `semantic-provenance-audit-v1.test.mjs` |
| Manual semantic adjudication self-validation | `13/13 PASS` | Frozen 141-field queue and 37 / 87 / 17 / 0 distribution reconcile exactly |
| Current integrated docs check | `PASS_CURRENT_SNAPSHOT` | `npm.cmd run docs:check`; 14 required files and 2,578 local links. Rerun after any later Gallery/report rebuild |
| Independent review surface | `FROZEN_PRE_SYNTHESIS` | A2/B2 both inspected Gallery SHA `9be4105dcf5a62a82dc31ddc3a6b37acaa87b9e886d70d27c9fc5f979c1d7d0b`; view and projection SHA match the final machine inputs |
| Current Gallery surface | `POST_SYNTHESIS_BROWSER_QA_PENDING` | Current SHA `9c6732991ac455d65d693550cf8e9de54f1cdf4d6906713633f94ea17117b86c`; the added combined internal verdict display requires a final browser pass |
| Desktop/tablet/mobile browser QA | `PENDING` | Do not infer from screenshots already present |
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

Until that pass exists, report and handoff files must render final browser QA
as `PENDING`, not `PASS`.

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
