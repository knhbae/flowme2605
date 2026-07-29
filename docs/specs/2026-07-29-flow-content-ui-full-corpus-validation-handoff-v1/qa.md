# QA contract

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
- Invented action, date, recurrence and completion count is zero.

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

