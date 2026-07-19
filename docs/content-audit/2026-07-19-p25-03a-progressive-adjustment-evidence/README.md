# P25-03A Progressive Item Adjustment Evidence

P25-03A는 My Flow의 항목 편집을 `할 일 조정` 한 화면으로 정리하고, 자주 바꾸는 값과 드문 일정 설정을 분리했다.

## Result

- 기본 편집: 할 일, 날짜 또는 날짜 없음 상태, 내 메모
- 세부 일정: 시간, 소요 시간, 장소, 반복, 해당 항목 유형에 필요한 추가 기록
- 저장된 세부 값은 접힌 버튼의 짧은 요약으로 보존한다.
- 편집을 다시 열어도 세부 일정 폼은 자동으로 펼쳐지지 않는다.
- `메모 크게 보기` 같은 편집 전용 보조 제어는 제거했다.
- 일반 항목에는 결정/기록 필드가 나타나지 않는다.

Source-backed 원본은 바뀌지 않는다. 기존 개인 제목, 날짜, 메모, 일정 overlay와 Calendar/export projection을 그대로 사용한다.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)
- [ICS downloads](./downloads/)

## Verification Boundary

Playwright가 source-backed Flow와 개인 초안의 편집, 저장, reload, Calendar/export 회귀를 자동 검증했다. 이는 실제 사용자 관찰이 아니며 observed-user session 수는 `0`이다.

P25-03B는 이 단일 항목 편집면을 늘리지 않고, 전체 Flow outline에서 명시적으로 진입하는 선택 모드와 일괄 날짜 조정을 구현한다.
