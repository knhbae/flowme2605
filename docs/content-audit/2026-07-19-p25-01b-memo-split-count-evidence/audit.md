# P25-01B Detailed Audit

## Root Cause

`buildMemoDraftItemSuggestions` and `buildUrlFirstDraftItemSuggestions` added generic scope, sequence, and first-action tasks until a minimum count was reached. `createPersonalDraftFlowPackage` also fell back to generated suggestions when its accepted list was empty. The visible claim that only user-written text was used was therefore false.

## Implemented Contract

- A pure parser extracts only user-authored phrases.
- Comma splitting occurs only when every segment reads as an action clause.
- Known application state sentences are rejected as executable input.
- Draft suggestions carry deterministic IDs, source phrases, and review state.
- Pre-save rows have explicit inclusion checkboxes and editable titles.
- The save button requires at least one selected, non-empty title.
- Package creation consumes only accepted rows and throws on an empty accepted list.
- Saved IDs derive from intake IDs, not the final accepted-list index.

## Representative Journey

Input:

1. `이사 견적을 비교한다.`
2. `관리사무소에 연락한다.`
3. `주소 변경 대상을 확인한다.`

Action:

- rename item 1 to `이사 업체 견적 비교하기`;
- exclude item 2;
- keep item 3;
- set the optional first-task date to 2026-08-30;
- save, reload, inspect My Flow, Calendar, and exports.

Result:

| Stage | Count |
| --- | ---: |
| Parsed preview | 3 |
| Accepted preview | 2 |
| Saved bundle | 2 |
| Reloaded effective list | 2 |
| Whole checklist/memo/sheet eligibility | 2 |
| Calendar/ICS eligibility | 1 |
| Undated Calendar tray | 1 |
| Generic filler | 0 |

## Visual Review

The mobile acceptance list keeps selection and title adjustment in one compact row, shows `2/3개 선택`, and has no horizontal overflow. The saved My Flow screenshots confirm correct counts but also show that the existing dashboard summary, whole Flow, and export panel are vertically long and weakly integrated. That is recorded as a P25-02 workspace issue, not treated as a P25-01B regression.

## Evidence Boundary

All results here are current unit or automated browser evidence. No observed-user session was run. Discoverability and perceived confidence still require later owner and user review after the P25 workspace frame is implemented.
