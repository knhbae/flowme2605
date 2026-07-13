# P23-05A Source-backed Undated Optional Date

## Problem

저장한 날짜 없는 체크리스트는 제목과 메모를 바꿀 수 있지만 날짜 입력이 보이지 않았다. 수동 날짜 override, Calendar projection, portable export 경로는 이미 존재하므로 새 스키마를 만들지 않고 사용자 진입점과 Flow 탭 재진입만 연결한다.

## Scope

- 날짜가 원래 없던 저장 항목에서 날짜 지정, 변경, 날짜 없애기
- 기존 `flow:my-flow:date-overrides`와 `::none` manual schedule key 재사용
- My Flow, Calendar, memo/checklist/sheet/ICS가 같은 날짜를 읽는지 검증
- 모바일 390px과 wide 1024px에서 같은 수정 상태 확인

## Invariants

- source Item과 source schedule을 수정하지 않는다.
- 완료 상태는 execution state에 남고 날짜 override와 섞지 않는다.
- 날짜를 없애면 수동 override만 제거하고 원래 날짜 없는 상태로 돌아간다.
- source-backed 구조 add/delete/reorder는 열지 않는다.
- 원래 날짜가 있는 source Item을 날짜 없음으로 바꾸는 정책은 이번 범위가 아니다.

## Acceptance

1. 날짜 없는 저장 항목의 수정 화면에 날짜 input이 보인다.
2. 날짜 지정 후 새로고침과 Flow 탭 재진입에도 값이 유지된다.
3. Calendar에는 해당 날짜에 한 번만 나타난다.
4. memo/checklist/sheet/ICS가 같은 날짜를 읽는다.
5. 날짜 없애기 후 Calendar와 ICS에서 사라지고 My Flow 항목은 유지된다.
6. 모바일·wide horizontal overflow와 console error가 0이다.

