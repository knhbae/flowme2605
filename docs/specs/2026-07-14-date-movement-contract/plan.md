# P24 날짜 이동 구현 순서

## 1. S1 계약

- [x] linked/fixed/unscheduled 소유권 정의
- [x] single/selected/anchor/occurrence/future/whole scope 정의
- [x] 영향 수치와 원자적 preview 계약
- [x] stale apply와 undo 방어
- [x] Calendar/ICS/list export membership 정책
- [x] 반복 revision과 execution history 보존 정책

## 2. U3 Calendar 날짜 없음 트레이

- Calendar가 동일 effective Item 목록에서 날짜 없는 항목을 계산한다.
- compact tray에는 개수와 접힌 목록을 제공한다.
- 첫 구현은 drag-and-drop이 아니라 선택 후 `날짜 지정`이다.
- 적용 전에 선택 개수와 목표 날짜를 보여주고 적용 직후 undo를 제공한다.
- 모바일 390px keyboard/touch 경로를 먼저 닫는다.

## 3. S2 공통 다중 선택

- 날짜 이동의 선택 모델을 Flow 전체/선택/현재 항목 export 범위에서도 재사용한다.
- 범위와 결과 항목 수를 format 선택보다 먼저 보여준다.

## 4. 반복 cutover 후속

- 미래 series를 과거 방향으로 이동하려면 recurrence revision에 `cutoverFrom`과 `newStartDate`를 분리할지 결정한다.
- 과거 완료 기록과 미래 미실행 회차의 경계를 fixture로 먼저 고정한다.
- 이 계약 전에는 UI에서 지원한다고 표시하지 않는다.
