# P26-12 audit

## 원인

기존 구현은 완료 직후 5초 undo와 완료 탭 체크박스를 제공했지만 세 가지 경계가 약했다.

1. 체크된 control의 이름이 `완료 취소`여서 사용자가 돌아갈 상태를 알기 어려웠다.
2. 반복 occurrence의 accessible name에 날짜가 없어 같은 series의 어느 회차인지 구분하기 어려웠다.
3. Today에서 완료 후 행이 이동하면 keyboard focus가 사라졌고, persistent reopen 뒤 같은 항목으로 돌아갈 receipt가 없었다.

## 구현

### 공통 presentation 계약

`completion-presentation.ts`가 일반/반복, 미완료/완료 상태의 control 이름과 완료/reopen receipt를 만든다. My Flow, Calendar, detail, completed view는 모두 기존 `renderTaskCompletionCheckbox`를 통해 이 계약을 사용한다.

### 즉시 undo와 persistent reopen

- 완료 결과는 8초 status bar로 표시한다.
- action에 focus가 있거나 pointer가 올라오면 자동 닫힘을 멈춘다.
- 완료 receipt의 action은 `되돌리기`, reopen receipt의 action은 `항목 보기`다.
- undo 뒤 현재 화면에 같은 row가 있으면 그 체크박스로 focus를 복구한다.
- 완료 탭에서 다시 연 경우 해당 Flow, reading group, item detail을 다시 연다.

### identity

- 일반 할 일은 stable item ID로 detail identity를 확인한다.
- 반복 일정은 stable occurrence ID, series ID, revision ID를 유지한다.
- detail root에 `data-item-id`와 `data-row-key`를 추가해 viewport 전환과 optimistic movement 뒤 같은 항목인지 직접 판정한다.
- source, personal structural overlay, execution run schema는 변경하지 않았다.

## 재현과 결과

| route | viewport | 재현 | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| `/my` | 390x844 | Today 일반 할 일 완료 | action-focused undo bar, nav overlap 0 | `current_browser` |
| `/my` | 390x844 | undo | 같은 row와 checkbox focus 복구 | `current_browser` |
| `/my?view=completed` | 390x844 | reload 뒤 체크 해제 | `다시 열림`, `항목 보기`, 같은 detail 복귀 | `current_browser` |
| `/my?view=flows` | 1024x768 | detail 열린 상태에서 완료·undo | item ID, detail pane, checkbox focus 유지 | `current_browser` |
| `/calendar` | 390x844 | 반복 occurrence 완료·undo·다시 열기 | 날짜 포함 회차 label, occurrence ID 유지 | `current_browser` |
| `/calendar` | 1024x768 | 반복 occurrence detail | series definition control 0, occurrence control 1 | `current_browser` |

## 접근성

- 완료 notice는 `role=status`, `aria-live=polite`다.
- ordinary checked checkbox는 `{제목} 다시 열기`다.
- recurring checkbox는 `{제목} {날짜} 이번 회차 ...`다.
- notice action은 표시 직후 focus를 받고, focus 중에는 사라지지 않는다.
- undo 뒤 같은 visible completion control로 focus를 복구한다.
- detail identity는 화면 문구를 늘리지 않고 DOM marker로 확인한다.

## projection과 export

완료·reopen은 execution state만 바꾼다. 기존 list-export 회귀는 pending/done/reopened 모두 같은 item membership을 유지하고 상태 표현만 바뀌는 것을 검증한다. Calendar row membership, ICS/list destination eligibility, personal order, source item은 변경하지 않는다.

## 검증 경계

자동 브라우저 검증은 control 수, focus, identity, reload, recurrence, overflow를 증명한다. 실제 사용자가 `다시 열기`, 8초 receipt, 완료 탭을 설명 없이 발견하고 선호하는지는 증명하지 않는다. observed-user session은 `0`이다.

## 남은 위험

1. 완료 notice action을 자동 focus하는 정책은 keyboard 복구에는 안전하지만 실제 사용자가 pointer 흐름에서 과하다고 느끼는지는 관찰 전 알 수 없다.
2. 완료/reopen의 장기 기록과 새 실행 이관은 P26-13 reuse 정책에서 별도로 닫아야 한다.
3. source-backed Flow slug 호환 경로가 둘 이상이므로 UI identity는 route slug가 아니라 canonical item/run identity를 계속 사용해야 한다.
