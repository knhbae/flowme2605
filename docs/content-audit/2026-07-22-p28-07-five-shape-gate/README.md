# P28-07 Five-shape Actual-data Gate

**Date:** 2026-07-22
**Evidence kind:** current source, current browser, automated simulation
**Observed users:** 0

## Verdict

다섯 결과 형태를 고정 tab으로 늘어놓지 않고, 콘텐츠마다 primary 1개와 의미 있는 secondary 최대 2개만 actual-data preview로 제공한다.

| Shape | Representative | Renderer |
| --- | --- | --- |
| Flow 실행 | `curated-allblanc-morning-workout` | 순서와 실행 맥락 |
| Calendar | `moving-d30-basic` | 날짜 group과 일정 |
| Checklist/Todo | `used-car-buying-check` | 미완료 preview checkbox와 할 일 |
| Sheet | `source-backed-middle-school-math-1` | 순서·항목·날짜 열 |
| Memo | `overseas-safety-register` | 제목·본문·자료/주의 note |

모든 renderer는 `buildFlowExperienceProjection`의 같은 stable row를 읽는다. 형태가 달라도 source item identity를 새로 만들지 않는다.

## Markers

| Marker | Result |
| --- | --- |
| `actualDataShapeCount` | 5 |
| `fixedFiveTabRouteCount` | 0 |
| `primaryShapeCountPerFlow` | 1 |
| `maximumSecondaryShapeCount` | 2 |
| `notApplicableFocusableControlCount` | 0 |
| `representativeShapeWithActualRowsCount` | 5 |
| `shapeSourceIdentityMismatchCount` | 0 |
| `sourceMutationCount` | 0 |
| `mobileHorizontalOverflowCount` | 0 |

## Screenshots

- `screenshots/10-mobile-shape-flow_execution.png`
- `screenshots/10-mobile-shape-calendar.png`
- `screenshots/10-mobile-shape-checklist.png`
- `screenshots/10-mobile-shape-sheet.png`
- `screenshots/10-mobile-shape-memo.png`
- `screenshots/11-wide-shape-sheet.png`

자동화는 실제 사용자 관찰로 계산하지 않았다.
