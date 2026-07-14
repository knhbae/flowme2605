# P24-00F2B Audit

## 원인

`startFlowRunFromCompleted`는 `keep_fixed_dates`일 때 개인 날짜 값을 보존하고 있었다. 그러나 source-backed 상대 일정의 override key에는 당시 source 날짜가 포함된다. 기준일을 바꾸면 같은 Item의 source 날짜가 달라지므로, 새 실행은 보존된 값을 찾지 못하고 재계산 날짜를 표시했다.

예:

- 이전 key: `moving-d30-basic::moving-method-quotes::2026-07-11`
- 고정한 개인 날짜: `2026-07-15`
- 새 기준일의 source 날짜: `2026-09-21`
- 새 실행이 읽어야 할 key: `moving-d30-basic::moving-method-quotes::2026-09-21`

## 수정 정책

`rekeyMyFlowPersonalExecutionStateForAnchor`가 Item ID를 기준으로 `itemDrafts`와 `dateOverrides`를 새 source 날짜 key로 옮긴다.

1. 완료 직전 상태는 먼저 completed run snapshot으로 복제한다.
2. 과거 completed run snapshot은 수정하지 않는다.
3. `keep_fixed_dates`인 새 실행만 새 기준일 key로 rekey한다.
4. 개인이 고정한 실제 날짜 값, 제목, 메모는 유지한다.
5. stable key와 occurrence execution record는 그대로 유지한다.
6. `reset_to_anchor` 경로는 rekey하지 않고 기존 초기화 정책을 유지한다.

source Item, source order, source schedule은 변경하지 않는다.

## 사용자 경로 검증

1. 이사 준비 Flow의 24개 항목을 완료한 상태를 준비한다.
2. 첫 할 일의 source 날짜를 개인 날짜 `2026-07-15`로 고정한다.
3. `이 Flow 다시 쓰기`를 연다.
4. 새 이사일 `2026-10-20`을 입력한다.
5. `내가 바꾼 날짜 유지`를 선택하고 새 실행을 시작한다.
6. 새 active run에는 새 source 날짜 key와 개인 날짜 값이 저장되는지 확인한다.
7. completed run에는 이전 key가 그대로 남는지 확인한다.
8. Today가 `7월 15일`을 표시하는지 확인한다.
9. Calendar의 `2026-07-15`에 같은 Item이 한 번 나타나는지 확인한다.

초기 완료 상태는 deterministic localStorage fixture로 준비했지만, 재사용 정책 선택부터는 실제 visible UI 경로로 수행했다.

## 회귀 검증

- unit: 481/481 pass
- P24 keep-fixed-date Playwright: 1/1 pass
- 기존 reset-to-anchor Playwright: 1/1 pass
- production build: pass, 18 routes
- mobile 390px: 정책 선택, Today, Calendar 확인
- wide 1024px: Calendar 확인
- horizontal overflow: 0
- console/page error: 0

## 다음 slice

P24-00F3A에서 저장 전 recurrence preview와 저장 후 My Flow, Calendar, ICS가 같은 occurrence 집합을 읽도록 정리한다. 한 occurrence에 실행 control이 하나만 존재하도록 U1과의 경계도 함께 고정한다.

