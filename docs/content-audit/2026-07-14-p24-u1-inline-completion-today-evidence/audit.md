# P24-U1 Audit

## Problem

기존 화면은 같은 할 일의 완료 체크박스를 실행 행과 펼친 상세에 동시에 표시했다. `다음 항목`도 실행 행과 같은 체크박스를 가져 Today에서 지금 할 일과 미래 예고가 같은 강도로 보였다. 반복 상세 전용 undo는 상세 안에만 있었고 일반 할 일에는 동일한 즉시 취소 경로가 없었다.

## Implemented Interaction

### One occurrence, one completion control

- Today primary row, Today completed row, Calendar agenda row의 왼쪽 체크박스를 실행 상태의 정본 control로 유지한다.
- 위 행에서 펼친 inline detail은 완료 체크박스를 다시 렌더링하지 않는다.
- Flow 관리 탭처럼 부모 행에 완료 control이 없는 상세는 기존 완료 체크박스를 유지한다.
- `열기`는 상세 이동, 체크박스는 완료/완료 취소 역할만 맡는다.

### Completion feedback

- 일반 항목과 반복 occurrence가 같은 하단 스낵바를 사용한다.
- 문구는 `“할 일 제목” 완료`, 행동은 `실행 취소` 한 개다.
- 5초 뒤 자동으로 닫힌다. 새 완료가 오면 가장 최근 완료 한 건으로 교체된다.
- undo는 generic check를 false로 돌리거나 occurrence execution state를 `reopened`로 전환한다.
- 완료 시 다음 상세로 자동 이동하던 routine 동작은 제거했다.

### Today hierarchy

- primary continuation 한 행은 기존 완료 체크박스를 유지한다.
- 후속 항목은 `다음 예정` 아래 compact preview로 렌더링한다.
- preview에는 완료 체크박스가 없고 Flow 이름, 날짜, 제목, `보기`만 보인다.
- 완료 목록은 `완료 N`과 `보기/접기`로 줄여 같은 상태를 반복 설명하지 않는다.

## State Ownership

- 일반 완료: 기존 Flow check persistence
- 반복 회차 완료/재개: occurrence execution record
- 스낵바: 현재 화면의 일시적 UI state, 영속 undo history가 아님
- Item 구조, 일정, source-backed 원본: 변경 없음

## Visual Review

### Mobile 390px

- primary checkbox, title, `열기`가 한 행 안에서 겹치지 않는다.
- snackbar는 하단 4탭 위에 위치한다.
- 후속 preview는 divider list로 낮아지고 checkbox가 없다.
- horizontal overflow 0.

### Wide 1024px

- Today primary와 추가 due rows는 스캔 가능한 행으로 유지한다.
- 미래 preview는 실행 행보다 낮은 시각 강도를 갖는다.
- horizontal overflow 0.

## Regression Boundary

- 완료/완료 취소 저장 방식 유지
- 반복 occurrence stable ID 유지
- Calendar structural membership 유지
- source-backed/public Flow persistence 유지
- 4탭 IA 유지
- 사용자 화면 내부 구조어 추가 0

## Residual Risks

1. 스낵바는 최근 완료 한 건만 되돌린다. 다중 undo history는 범위 밖이다.
2. Calendar overflow에서 완료 행이 보이는 순서 뒤로 이동할 수 있다. undo 후 같은 occurrence는 복귀하지만 실제 사용자가 이를 이해하는지는 관찰이 필요하다.
3. wide Today는 여러 due item을 동시에 보여준다. 이는 데스크톱 스캔 효율을 위한 의도이며, 관찰에서 과밀하다고 확인되면 U1 후속으로 제한한다.

