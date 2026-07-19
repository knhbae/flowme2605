# P25-05B Export scope and count evidence

P25-05B makes portable export predictable before the user chooses a file or copy format. My Flow now presents `Flow 전체`, `직접 선택`, and `현재 항목` as explicit scopes, and every visible count comes from the canonical `buildFlowExportScopePlan` result.

The active scope is shown before format. Calendar may have fewer eligible rows than list formats because undated tasks remain valid in My Flow, checklist, sheet, and memo while Calendar and ICS require a date.

This package is current automated/browser evidence. It is not observed-user validation, and observed-user sessions remain `0`.

## Implemented behavior

- Whole-Flow export shows the effective included count, not the raw source array length.
- Direct selection shows only selected, structurally eligible rows.
- Current-item export states `현재 항목 가져가기 · 1개` before its formats.
- Calendar, checklist, sheet, and memo buttons expose destination-specific plan counts.
- Tombstoned and excluded rows remain outside every new export projection.
- Done and reopened states remain exportable and do not change membership.
- Source-backed and personal-draft exporters keep their existing payload builders and filenames.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)
- [Selected personal-draft ICS](./downloads/personal-draft-selected-calendar.ics)

## Current verification

- Unit tests: `526 / 526` passed.
- Export-scope unit tests: `6 / 6` passed.
- Production build: passed.
- Personal-draft whole/selected export browser scenario: passed.
- Source-backed whole/selected/current-item browser scenario: passed.
- Updated source-backed item-detail regression: passed after replacing its pre-P25 `먼저 할 일` locator with the current `언제든 할 일` path.
- Mobile `390x844` and wide `1024x768` captures: horizontal overflow `0`, console errors `0` in the exercised scenarios.
- Actual user observation: not run.
