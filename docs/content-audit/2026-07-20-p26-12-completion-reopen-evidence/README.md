# P26-12 완료·다시 열기·즉시 되돌리기 evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준선: `be9a5b1`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

완료를 별도 버튼이나 구조 편집 상태로 만들지 않고 실행 행의 체크박스 하나로 유지했다. 체크하면 즉시 `되돌리기`가 나타나고, 시간이 지난 뒤에는 `완료` 탭의 같은 체크박스를 풀어 `다시 열기`로 전환한다. 반복 일정은 series 전체가 아니라 날짜가 붙은 한 occurrence만 완료·다시 열기 대상으로 삼는다.

## 동작 계약

- 일반 할 일: `완료 체크` ↔ `다시 열기`
- 반복 할 일: `{날짜} 이번 회차 완료 체크` ↔ `{날짜} 이번 회차 다시 열기`
- 완료 직후: 하단 탭 위 status bar에 `되돌리기`, action으로 keyboard focus 이동
- 즉시 undo: 같은 row identity와 체크박스 focus 복구
- 완료 탭 reopen: `다시 열림` receipt와 `항목 보기`, 같은 item detail로 복귀
- 완료·reopen: structural membership, personal order, Calendar/portable export membership을 변경하지 않음
- series definition: 완료 control `0`

## 화면

### 모바일 390x844

- 완료 receipt는 4탭 위에 고정되고 nav overlap이 없다.
- Today 행이 이동해도 `되돌리기`가 keyboard focus를 받는다.
- undo 뒤 같은 행의 체크박스로 focus가 돌아간다.
- 완료 탭에서도 별도 버튼 없이 같은 체크박스로 다시 연다.

### wide 1024x768

- whole-Flow outline에서 완료·undo 뒤 같은 item ID와 detail pane을 유지한다.
- 반복 occurrence는 선택일 agenda에서 날짜와 회차 범위를 함께 읽는다.
- horizontal overflow와 console/page error는 `0`이다.

## 현재 검증

- completion presentation 단위 테스트: `3 / 3` pass
- 일반 완료·undo·persistent reopen Playwright: `1 / 1` pass
- 반복 occurrence 완료·undo·reopen Playwright: `1 / 1` pass
- affected My Flow/Calendar/whole-Flow/identity 시나리오: `9 / 9` pass
- full unit: `552 / 552` pass
- docs check: `2,626` local links pass
- production build: `18 / 18` routes
- 실제 사용자 관찰: 수행하지 않음

## 캡처

- [Today 완료 직후 undo](./screenshots/00-today-completion-undo-mobile.png)
- [완료 탭 persistent reopen](./screenshots/01-persistent-completed-mobile.png)
- [반복 series definition](./screenshots/02-recurrence-series-definition-mobile.png)
- [반복 occurrence 완료 control](./screenshots/03-recurrence-occurrence-control-mobile.png)
- [wide 반복 occurrence](./screenshots/04-recurrence-occurrence-wide.png)
- [wide item focus 복구](./screenshots/05-wide-completion-undo-focus.png)

## 다음 범위

P26-13은 새 실행에서 기준일에 연결된 날짜와 사용자가 고정한 날짜를 명시적으로 구분한다. 완료·reopen history는 새 실행 정책과 섞지 않고 보존한다.
