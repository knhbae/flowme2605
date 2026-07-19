# P25-05B audit

## Previous failure mode

The Flow export surface already offered whole and selected export, but labels and counts came from more than one calculation. The whole-scope tab used the raw item-array length, the selected summary used a separate checkbox count, and the current-item surface did not expose destination counts. A user therefore could not know whether the number described the saved Flow, visible rows, selected rows, or the eventual output.

## Product contract

| Scope | Visible label | Count source | Eligible rows |
| --- | --- | --- | --- |
| Whole Flow | `Flow 전체 · N개` | canonical plan `includedCount` | all effective non-excluded, non-tombstoned list rows |
| Direct selection | `직접 선택 · N개` | canonical selected plan `includedCount` | selected effective list rows only |
| Current item | `현재 항목 가져가기 · 1개` | canonical item plan `includedCount` | the open effective row only |

Format comes after scope. Each format uses `countByDestination`: Calendar counts only dated eligible rows, while checklist, sheet, and memo count the current list projection.

## Browser scenarios

### Personal memo draft

1. Parse three user phrases, exclude one, rename one, and save two accepted rows.
2. Open `가져가기` in My Flow at `390x844`.
3. Verify `Flow 전체 · 2개`, Calendar `1개`, and all list formats `2개`.
4. Choose `직접 선택`, select both rows, and verify the same plan counts.
5. Download ICS and verify exactly one dated VEVENT.
6. Reload at `1024x768` and verify whole scope remains two effective rows.

### Source-backed moving Flow

1. Enter `/my?demo=source-backed` and open the moving Flow export.
2. Verify `Flow 전체 · 5개`.
3. Choose two rows and verify Calendar/checklist/sheet/memo each report `2개`.
4. Open one row detail and verify current-item scope and four one-item formats.

## Membership and ownership

- Completion and reopen change execution state only; a unit fixture proves destination membership and counts remain identical.
- Exclusion and tombstone are structural decisions and remain the only membership removals in this scope contract.
- The change does not mutate source items or replace source-backed/public export builders.
- Calendar count is allowed to differ from list counts when selected rows are undated; that is eligibility, not a mismatch.

## Visual review

- Mobile keeps scope controls above selection and format without horizontal overflow.
- Wide uses a two-segment scope control and four format columns inside the existing Flow workspace.
- Current-item export no longer combines `원문` with the scope label; the source link remains available inside the disclosure.
- No explanatory card or new export destination was added.

## Evidence boundary

Automated checks prove plan counts, copied/downloaded membership, accessible scope labels, overflow, and route behavior. They do not prove that users prefer the words `Flow 전체` and `직접 선택`, or can predict why Calendar has fewer rows than list formats. Those remain future owner and observed-user questions.

## Verification results

- `npm.cmd test`: `526 / 526` passed.
- `npm.cmd run build`: passed.
- Targeted P24 export scenarios: `2 / 2` passed; the source-backed scenario also passed after final count assertions.
- Updated Flow MVP detail scenario: `1 / 1` passed.
- `git diff --check`: line-ending conversion warnings only.
