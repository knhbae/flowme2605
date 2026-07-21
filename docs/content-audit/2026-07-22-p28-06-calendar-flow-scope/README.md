# P28-06 Calendar Flow Scope Evidence

**Date:** 2026-07-22
**Evidence kind:** current source, current browser, automated simulation
**Observed users:** 0

## Verdict

Calendar의 Flow 수에 따라 표시 방식을 바꾸고, routine을 별도 필터 체계로 분리하지 않았다.

- 1개: scope control 숨김
- 2~5개: 줄바꿈 가능한 compact Flow shortcut
- 6개 이상: 하나의 `볼 Flow 선택` trigger와 검색 가능한 다중 선택 sheet
- 선택하지 않음은 전체 보기다.
- stale/duplicate slug는 정규화하며 선택은 새로고침 후 유지된다.
- 같은 selection이 month grid, selected-day agenda, counts, 날짜 없는 할 일 tray에 적용된다.

## Markers

| Marker | Result |
| --- | --- |
| `oneFlowScopeControlVisible` | false |
| `twoToFiveScopePresentation` | `compact` |
| `sixPlusScopePresentation` | `picker` |
| `largeLibraryHorizontalFlowChipCount` | 0 |
| `searchablePickerVisible` | true |
| `multiFlowSelectionSupported` | true |
| `selectionPersistedAfterReload` | true |
| `staleSelectionItemLossCount` | 0 |
| `keyboardEscapeReturnsFocus` | true |
| `calendarHorizontalOverflowCount` | 0 |

## Screenshots

- `screenshots/07-mobile-calendar-flow-picker.png`
- `screenshots/08-mobile-calendar-selected-flows.png`
- `screenshots/09-wide-calendar-selected-flows.png`

자동화는 실제 사용자 관찰이 아니다.
