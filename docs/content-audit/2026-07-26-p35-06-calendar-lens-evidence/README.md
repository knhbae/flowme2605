# FlowMe P35-06 Calendar Lens Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- 판정: `pass`
- 실제 관찰 사용자: `0`

## 결과

Calendar를 날짜가 있는 실행 항목을 보는 하나의 lens로 단순화했다.
월간 grid는 compact marker와 초과 개수만 보여주고, 선택한 날짜에서는
Flow별 전체 실행 항목을 보여준다.

Calendar 안의 별도 날짜 이동, 날짜 없는 항목 tray, 메모 작성, item 상세
편집은 제거했다. 완료와 다시 열기만 My Flow와 동일한 실행 control을
재사용하며, 다른 조정은 `Flow에서 열기`로 선택한 Flow와 item을 직접 연다.

## Acceptance marker

- `P35-CALENDAR-LENS-ONE-TOGGLE`

## 확인한 계약

| 항목 | 결과 |
| --- | --- |
| Calendar 직접 수정 종류 | 완료 / 다시 열기 1종 |
| 날짜 없는 항목 관리 | My Flow에서 수행 |
| 월간 grid | 주요 2개 + `+N` compact summary |
| 선택일 | Flow별 group과 전체 dated item |
| Flow scope | 닫힌 상태에서 버튼 1개, dialog 안에서 검색·선택 |
| 편집 이동 | 선택한 Flow와 stable item을 My Flow에서 직접 열기 |
| source/personal/run identity | 변경 없음 |

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [모바일 월간 grid](./screenshots/p35-06-calendar-month-390.png)
- [모바일 선택일 agenda](./screenshots/p35-06-calendar-agenda-390.png)
- [20 Flow 와이드 Calendar](./screenshots/p35-06-calendar-multi-flow-1024.png)
- [60 Flow 데스크톱 Calendar](./screenshots/p35-06-calendar-60-flow-1440.png)

## 현재 slice 검증

- P35-06 전용 E2E: 3/3 pass
- 390/1024/1440 horizontal overflow: 0
- visible unnamed interactive control: 0
- console/page error: 0
- Calendar 내부 날짜 이동 entry: 0
- Calendar 내부 날짜 없는 tray: 0
- Calendar item detail sheet: 0

자동화, fixture, screenshot 검증은 실제 사용자 관찰이 아니다.
