# P26-15 상세 감사

## 원인 판단

기존 Calendar에는 전체/일정/반복 category filter와 별도의 저장 Flow select가 함께 있었다. 이 구조는 사용자가 보고 싶은 실제 Flow와 화면 category가 서로 다른 축이라 grid, agenda, count가 같은 범위로 읽히는지 확인하기 어려웠다. 날짜 drag는 즉시 mutation되어 여러 항목 이동의 영향 범위, 반복 occurrence 여부, rollback 결과를 commit 전에 확인할 수 없었다.

## 구현

### Flow scope

- `CalendarFlowScope`를 `all | routine | flow:{slug}`로 고정했다.
- source/personal row를 변경하지 않고 현재 Calendar projection 위에서 scope를 판정한다.
- 개별 Flow option은 marker color, initial, title, 현재 월 count를 한 control에 둔다.
- scope가 바뀌면 grid events, selected-day rows, agenda groups, undated tray가 함께 바뀐다.
- Calendar route의 별도 saved-Flow select는 숨겼다.

### 날짜 이동

- 선택일의 현재 scope row만 이동 후보가 된다.
- 같은 source date의 item만 한 commit으로 이동할 수 있다.
- preview는 선택 수, 영향 Flow 수, 일반 할 일 수, 반복 occurrence 수, 완료 항목 수를 계산한다.
- ordinary item은 personal/source date override를, occurrence는 occurrence date override key를 사용한다.
- user-created personal draft item은 structural schedule을 갱신하고 source item은 덮어쓰지 않는다.
- apply 실패 시 부분 저장하지 않으며, 성공 후 undo snapshot으로 기존 overlay/date override를 복구한다.
- demo fixture는 localStorage를 쓰지 않는 in-memory mutation으로 같은 interaction을 검증한다.

## 사용자 여정 재현

### 다중 Flow

1. 이사 Flow를 `2026-08-28` 기준일로 저장했다.
2. 날짜 없는 차량 점검 10개 중 2개를 `2026-07-29`에 놓았다.
3. 같은 날짜에 이사 4개, 차량 점검 2개, Flow group 2개를 확인했다.
4. 차량 점검 filter에서 grid 2개와 agenda group 1개를 확인했다.
5. 이사 filter에서도 현재 날짜를 유지하고 agenda group 1개만 보이는지 확인했다.
6. 차량 점검 한 항목을 완료한 뒤 이사 한 항목과 함께 `2026-07-30`으로 옮겼다.
7. target date에서 Flow 2개와 완료 상태가 유지되는지 확인했다.
8. undo로 원래 날짜를 복구한 뒤 다시 옮기고 reload persistence를 확인했다.

### 반복 occurrence

1. routine filter를 선택했다.
2. 선택일 agenda에서 occurrence row와 routine group을 확인했다.
3. 한 occurrence를 다음 날짜로 drag했다.
4. 즉시 mutation 대신 `반복 회차` label과 `반복 1회` impact가 있는 preview를 확인했다.
5. keyboard Enter로 commit하고 undo receipt를 확인했다.

## 모바일 390x844

- 선택일 실행은 Flow header -> item title -> 완료 checkbox/열기/메모 순서로 읽힌다.
- Flow filter는 horizontal segmented strip이며 page horizontal overflow는 0이다.
- 날짜 이동 panel은 선택, impact, target date, commit 순서로 한 column에 배치된다.
- 완료 snackbar가 focus를 가진 동안 유지되는 기존 P26-12 정책을 보존했다. 날짜 이동 evidence는 snackbar timeout 뒤 독립적으로 캡처했다.

## Wide 1024x768

- 날짜 없는 할 일 rail, month grid, selected-day agenda의 3-pane을 유지한다.
- 중복 saved-Flow select는 제거하고 month grid 위 Flow filter만 남겼다.
- agenda는 선택 Flow 한 group과 해당 row만 보여준다.
- horizontal overflow는 0이다.

## 접근성

- scope button은 `aria-pressed`와 `Flow 이름 + 월 항목 수` accessible name을 가진다.
- 선택일 제목과 summary는 `aria-live`로 날짜/범위/남은 수 변경을 알린다.
- date move checkbox는 `{제목} 날짜 옮길 항목으로 선택`을 사용한다.
- drag와 button entry가 같은 preview로 수렴한다.
- apply는 native button으로 keyboard Enter 동작을 검증했다.

## 소유권과 위험

- source mutation: 0
- storage schema change: 없음
- execution completion membership change: 0
- occurrence series identity change: 0
- unknown/malformed ID는 pure preview에서 selection 밖으로 무시하고 source row를 삭제하지 않는다.
- 관찰 사용자 수: 0. Flow filter의 명칭과 날짜 이동 preview의 이해도는 실제 사용자 검증이 아니다.

## 후속

P26-16은 Calendar만의 범위 제어를 export scope/count/format/result receipt까지 확장한다. 전체/선택/Flow 범위와 destination별 포함 수가 다운로드 전후에 동일해야 한다.
