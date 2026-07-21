# P28-01 Architecture Audit

## Evidence

| Evidence | Kind | Use |
| --- | --- | --- |
| current `AppClient.tsx`, `ArtifactWorkbench.tsx`, `FlowSaveBeforeFrame.tsx` | `current_source` | route별 composition과 특례 확인 |
| P27 production closeout screenshots | `current_package_screenshot` | 현재 mobile/wide hierarchy 확인 |
| P28-00 Claude Design board | `prior_design_artifact` | Hybrid와 actual-data preview 대안 확인 |
| P28 promise-delivery prior preview | `prior_design_artifact` | 다섯 콘텐츠 shape의 사용자 약속 확인 |
| official Calendar/Todo/workout/trip help | `reference_pattern` | scope, browse, edit 범위 비교 |
| 이 패키지의 task replay | `heuristic_simulation` | 조작 단계와 hard fail 비교 |

자동화와 heuristic simulation은 실제 사용자 검증이 아니다. observed-user count는 `0`이다.

## Current findings

### Blocking: 같은 Flow가 route마다 다른 object처럼 보인다

- `/flows`와 public `/f`는 artifact workbench를 먼저 보여준다.
- 저장 전 개인 조정은 별도 mode picker와 다른 row anatomy를 사용한다.
- My Flow는 Today row, mobile structure row, wide overview card가 서로 다르다.
- Calendar routine은 또 다른 occurrence rail을 사용한다.

영향: 사용자는 저장 전 확인한 구조가 저장 후 어디에 갔는지 다시 해석해야 한다.

### High: 홈트가 두 번째 실행 시스템을 만든다

`ExactVideoTodayResultCard`는 `완료`, `강도 낮춤`, `휴식으로 변경`을 같은 selector에 넣는다. 완료는 occurrence run 상태이고, 강도는 개인 메모/조정이며, 휴식은 skip/hold다. 서로 다른 소유권을 한 UI 상태로 합쳤다.

### High: actual-data destination preview가 없다

`FlowSaveBeforeFrame`은 최대 다섯 행만 보여주고 나머지를 `외 N개`로 끝낸다. `artifact-plan`은 surface 제목과 설명을 고르지만 실제 Calendar event, Todo row, Sheet row, Memo 내용을 비교하지 않는다.

### High: Calendar scope가 보유량에 따라 무한히 자란다

모든 Flow를 `grid-flow-col auto-cols-max overflow-x-auto`로 렌더링한다. 2개에서는 쓸 수 있지만 8개와 25개에서 검색, 최근 항목, 선택 요약이 없다.

### High: My Flow browse와 detail의 우선순위가 불분명하다

소수 Flow, searchable library, selected workspace의 조건은 존재하지만 mobile card, wide select, 전체 list가 다른 문법을 사용한다. 다음 행동과 전체 구조도 동일한 row를 공유하지 않는다.

## Alternatives

### A. Outline-first

전체 Flow와 수정 가능 범위를 먼저 보여준다. source 확인에는 강하지만 Calendar/Todo/Sheet/Memo 결과가 늦고 mobile에서 긴 outline이 primary action을 밀어낸다.

### B. Artifact-first

content-native 결과를 먼저 보여준다. export 목적은 선명하지만 무엇이 생략됐는지, 어떤 원본 item을 수정하는지 이해하기 어렵다.

### C. Hybrid - selected

compact whole outline과 actual-data primary preview를 같은 viewport 흐름에 두고, 선택한 item 또는 Flow 범위에 대한 contextual editor만 연다. 저장 후 My Flow와 Calendar에서도 같은 row와 detail vocabulary를 재사용한다.

## Responsive decision

| Width | Composition |
| --- | --- |
| 390 | header -> outline -> preview -> contextual edit -> sticky primary |
| 1024 | library/outline + selected preview/editor, 주요 pane 최대 2개 |
| 1280~1440 | 세 번째 contextual pane은 content와 공간이 충분할 때만 허용 |

고정 3열은 1024px에서 사용하지 않는다.

## Shared grammar

### Flow header

제목, source/개인 상태, 핵심 범위, 현재 필요한 값만 둔다. 긴 소개와 같은 의미의 chip 반복을 삭제한다.

### Item row

완료 control 또는 role marker, 제목, 날짜/시간, context, `열기` 순서를 유지한다. edit/delete/reorder/export는 기본 row에서 숨기고 contextual mode에서만 제공한다.

### Routine

- 완료/다시 열기: 공통 checkbox
- 휴식: skip/hold
- 강도 조정: occurrence note
- 영상/URL/공식 안내: 공통 resource block
- 통증/중단 기준: safety block
- 4주: preview horizon이며 source/user가 종료를 정한 경우만 series end

### Five shapes

`Flow execution`, `Calendar`, `Checklist/Todo`, `Sheet`, `Memo`를 같은 effective item projection에서 만든다. 한 Flow에는 primary 하나와 의미 있는 secondary 최대 두 개만 보여준다.

## Replan gates

1. P28-02 projection이 slug-specific view policy를 요구하면 contract를 재설계한다.
2. P28-03에서 390px contextual edit가 primary action을 가리면 composition을 다시 시뮬레이션한다.
3. P28-04에서 routine이 공통 occurrence row로 표현되지 않으면 recurrence contract와 content role을 다시 분리한다.
4. P28-05/06에서 20~50 Flow가 browse/picker로 처리되지 않으면 navigation은 유지하되 library/scope architecture를 대폭 변경한다.

## Decision

Hybrid score는 `4.5/5`, hard fail은 `0`이다. P28-02~08 구현을 승인한다. owner acceptance와 observed-user validation은 P28-08 이후 별도다.
