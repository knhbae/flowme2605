# P28-05 My Flow Library IA Evidence

**Date:** 2026-07-22
**Evidence kind:** current source, current browser, automated simulation
**Observed users:** 0

## Verdict

My Flow의 Flow 목록을 카드 대시보드가 아니라 저장 콘텐츠 라이브러리와 한 개의 선택 상세로 재구성했다.

- 모바일은 compact 목록에서 한 Flow를 열고 `Flow 목록`으로 돌아오는 drill-in이다.
- wide는 고정 폭 library rail과 한 개의 detail workspace를 사용한다.
- Flow 수가 많아지면 rail 안에 검색과 상태 filter가 나타난다.
- 이전의 별도 선택 dropdown, 20개 전용 그룹 카드, 동시에 펼쳐진 다수 상세를 제거했다.
- detail은 저장 전과 같은 whole-Flow outline, item detail, 조정, 가져가기, 보관 계약을 재사용한다.

## Markers

| Marker | Result |
| --- | --- |
| `mobileLibraryDrillIn` | true |
| `mobileVisibleDetailCount` | 1 |
| `wideLibraryLayout` | `rail_detail` |
| `wideVisibleDetailCount` | 1 |
| `duplicateFlowSelectorCount` | 0 |
| `twentyFlowSearchVisible` | true |
| `twentyFlowVisibleLibraryRows` | 27 |
| `legacyGroupedDashboardVisible` | false |
| `horizontalOverflowCount` | 0 |

## Screenshots

- `screenshots/05-mobile-my-flow-drill-in.png`
- `screenshots/06-wide-my-flow-library-detail.png`

자동화는 구조와 동작을 검증했으며, 실제 사용자가 browse와 search를 어떻게 선택하는지는 아직 관찰하지 않았다.
