# P26-14 날짜 없는 할 일 배치 Evidence

P26-14는 Calendar에서 날짜 없는 실행 항목을 찾고 한 개 또는 여러 개를 날짜에 놓는 흐름을 닫는다. 모바일은 접힌 drawer, wide는 항상 보이는 rail을 사용한다. 날짜를 제거한 항목은 같은 tray로 돌아오며 즉시 되돌릴 수 있다.

이 slice는 기존 personal date override와 export projection을 재사용한다. source item, 반복 series 정의, 완료 상태, 저장 schema는 변경하지 않았다.

## 결과

- public 차량 점검 Flow에서 `날짜 없이 시작` 결과를 `Calendar에는 넣지 않고 My Flow에 저장합니다.`로 명시했다.
- Calendar는 `날짜 없는 할 일`과 `아직 일정에 놓지 않은 실행 항목`이라는 이름으로 10개 항목을 보여준다.
- 한 항목 배치는 `10 -> 9`, 되돌리기는 `9 -> 10`으로 원자적으로 동작한다.
- 세 항목 배치는 `10 -> 7`이며 새로고침 후에도 7개가 유지된다.
- 날짜를 지우면 tray가 `7 -> 8`로 바뀌고, 즉시 되돌리면 같은 날짜와 항목 identity로 `8 -> 7`이 된다.
- 배치 전 Calendar export count는 0, 세 항목 배치 후 ICS VEVENT는 3개다.
- 반복 series 정의와 완료 항목은 tray에 들어오지 않는다.
- 모바일에서 선택 10개 전환 전후 주요 배치 버튼의 위치와 폭이 바뀌지 않는다.
- 모바일/와이드 horizontal overflow와 console/page error는 0이다.

## 화면 정책

- 모바일: 선택일 agenda 다음에 접힌 날짜 없는 할 일 drawer, 그다음 월간 grid.
- wide: 날짜 없는 할 일 rail, 월간 grid, 선택일 agenda.
- tray의 checkbox는 완료가 아니라 일정에 놓을 항목 선택이다.
- 항목이 0개이고 되돌리기 상태도 없으면 tray를 숨긴다.

## Evidence

- [상세 감사](./audit.md)
- [구조화 marker](./route-evidence.json)
- [상태 전이 fixture](./schedule-fixtures.json)
- [모바일 public 날짜 의도](./screenshots/01-public-undated-intent-mobile.png)
- [모바일 접힌 tray](./screenshots/02-undated-inbox-collapsed-mobile.png)
- [한 항목 배치 preview](./screenshots/03-single-date-preview-mobile.png)
- [세 항목 배치 결과](./screenshots/04-three-items-scheduled-mobile.png)
- [날짜 제거 undo](./screenshots/05-date-removal-undo-mobile.png)
- [wide rail](./screenshots/06-undated-inbox-wide.png)
- [세 항목 ICS](./downloads/vehicle-inspection-three-items.ics)

`D:\flowme2605\flow-mvp\docs\content-audit\2026-07-19-flow-content-usage-preview-ko.html`의 compact artifact/result 패턴은 로컬 참고 자료로만 읽었다. 해당 dirty-worktree 파일을 복사하거나 stage하지 않았다.

## 검증 경계

근거 종류는 `current_source`, `current_command`, `current_browser`, `prior_design_artifact`다. 실제 사용자 관찰 세션은 0건이다.
