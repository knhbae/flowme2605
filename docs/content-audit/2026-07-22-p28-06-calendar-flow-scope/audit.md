# P28-06 Audit

## Selection policy

`normalizeCalendarFlowSelection`이 known Flow slug만 남기고 중복과 stale 값을 제거한다. 빈 selection은 전체를 뜻한다. 6개 이상일 때만 복수 selection을 local preference에 저장한다. 데이터가 hydration되기 전 빈 목록은 실제 0개 library로 간주하지 않아 저장된 선택을 지우지 않는다.

## Consumer parity

같은 predicate가 다음 입력을 필터링한다.

- month grid events
- selected-day agenda와 남은 개수
- undated placement tray
- 날짜 이동 대상

Calendar/ICS 데이터 소유권은 바꾸지 않는다. scope는 view preference이며 item, occurrence, completion record를 수정하지 않는다.

## Accessibility

- trigger: `aria-haspopup=dialog`, `aria-expanded`
- sheet: modal dialog label
- 각 Flow checkbox: Flow 이름과 선택/해제 행동
- 열릴 때 search focus
- Escape와 닫기 후 trigger focus 복귀
- Tab focus loop

## Removed special case

`반복만` 버튼은 일반 Flow 선택과 경쟁하는 별도 필터였으므로 큰 library UI에서 제거했다. routine occurrence는 다른 Flow와 같은 scope/item identity로 선택한다.

## Residual risk

최근 사용 Flow 자동 정렬은 아직 없다. 현재는 이번 달 일정 수가 많은 Flow를 먼저 두고 이름순으로 안정 정렬한다. 실제 관찰에서 자주 쓰는 Flow 탐색이 느릴 때 recent ranking을 검토한다.
