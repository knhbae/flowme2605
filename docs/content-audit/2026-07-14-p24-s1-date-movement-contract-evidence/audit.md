# P24-00S1 감사

## 현재 문제

기존 구현은 기준일 변경, 개별 날짜 override, 반복 회차 override가 서로 다른 consumer에 있었다. 사용자가 여러 항목을 옮기거나 기준일을 바꿀 때 무엇이 재계산되고 무엇이 유지되는지를 한 계약으로 미리 설명할 수 없었다.

## 적용 판단

1. 개별·선택 날짜 지정은 사용자의 명시적 결정이므로 결과를 `fixed`로 저장한다.
2. 기준일 이동은 `linked`만 재계산하고 `fixed`와 `unscheduled`를 보존한다.
3. bulk 이동은 영향 수치를 먼저 계산하고 원자적으로 적용한다.
4. 반복은 항목 전체 날짜 변경과 분리해 회차/series scope를 먼저 선택한다.
5. 실행 이력이 있는 반복 cutover는 과거 기록을 변경하지 않고 새 revision을 만든다.
6. 현재 recurrence 모델이 안전하게 표현하지 못하는 과거 방향 future-series 이동은 차단한다.

## Mockup 반영

Claude Design `(8)`의 화면 제안 중 다음을 계약으로 채택했다.

- Flow 상단 기준일을 날짜 이동의 정식 entry로 사용
- `연동`과 `고정`을 별도 상태로 표시
- 적용 전 `연동 N개 재계산 / 고정 N개 유지` 수치 표시
- 날짜 없는 할 일을 숨기지 않고 Calendar tray로 연결
- 선택 이동과 선택 export가 같은 다중 선택 interaction을 재사용

drag-and-drop은 mockup에 있지만 keyboard/touch 대안과 undo가 준비되기 전에는 채택하지 않는다.

## 잔여 위험

- source-backed concrete row가 linked인지 fixed인지 알려 주는 adapter가 U3 consumer 연결 때 필요하다.
- future series를 과거 방향으로 옮기려면 cutover 날짜와 새 시작 날짜를 분리하는 recurrence 계약이 필요하다.
- UI copy와 badge가 실제 사용자에게 이해되는지는 최소 5명 관찰 전까지 미확정이다.
- 다중 선택을 날짜 이동과 export가 실제로 공유하는 것은 S2 범위다.
