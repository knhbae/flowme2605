# P28-03 Audit

## Before

`FlowSaveBeforeFrame`은 `previewRows.slice(0, 5)`만 렌더링하고 `외 N개`를 정적인 문구로 표시했다. 같은 public route 아래에서 `ArtifactWorkbench`가 동일 Flow를 다시 길게 렌더링했다. 조정 화면은 날짜 또는 제목 편집에서도 최대 24개 입력 row를 동시에 펼쳤다.

## Implemented interaction

### Whole outline

- 첫 5개는 즉시 스캔한다.
- 나머지는 한 번의 native disclosure로 모두 확인한다.
- 각 row의 `수정`은 해당 stable item ID를 선택한 contextual editor를 연다.
- 기존 P26/P27 test ID와 처음 5개 contract는 유지했다.

### Actual-data preview

- `buildFlowExperienceProjection`이 primary와 최대 2개 secondary shape를 정한다.
- Calendar와 Checklist 버튼의 count는 같은 effective row에서 계산한다.
- anchor를 변경하면 Calendar preview count와 row 날짜가 즉시 갱신된다.
- applicable하지 않은 다섯 shape를 빈 tab으로 늘어놓지 않는다.

### Contextual adjustment

- include/order mode는 whole structure를 다룬다.
- title+memo/date mode는 선택한 item 하나만 다룬다.
- outline row에서 직접 열면 해당 item이 미리 선택된다.
- Flow 개인 이름, item title/date/memo, include, order는 기존 personal overlay/saved record 경로로 commit한다.
- cancel은 source 및 local persistence에 쓰지 않고 개인 이름 draft를 마지막 저장값으로 되돌린다.

### URL-first hit

준비된 child Flow가 하나인 lookup result는 `/f/{slug}`의 공통 workspace로 연결한다. inline quick start는 기능 호환을 위해 접힌 보조 경로로 남겼다. 이를 통해 Flow 찾기와 public Flow가 서로 다른 조정 UI를 첫 경로로 경쟁하지 않는다.

## Ownership

| Data | Owner | P28-03 behavior |
| --- | --- | --- |
| source title/order/schedule | source | mutation 0 |
| Flow 개인 이름 | saved personal record | optional additive field |
| item title/date/memo/include/order | existing personal overlay | existing keys reused |
| completion/reopen | execution state | unchanged |
| artifact count | P28 projection | actual effective rows |

## Remaining for later slices

- routine frequency/end and occurrence grammar: P28-04
- My Flow library/detail reconstruction: P28-05
- Calendar scope picker: P28-06
- five representative shape/export parity: P28-07
- full browser matrix and independent review: P28-08
