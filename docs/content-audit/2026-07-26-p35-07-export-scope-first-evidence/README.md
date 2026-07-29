# FlowMe P35-07 Export Scope-first Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- 판정: `pass`
- 실제 관찰 사용자: `0`

## 결과

개인 Flow의 전체, 직접 선택, 현재 항목 export가 같은 scope plan,
artifact recommendation, result receipt를 사용한다.

사용자는 형식보다 먼저 범위와 실제 포함 개수를 확인한다. 범위가 정해지면
실제로 결과가 있는 형식만 primary 1개와 secondary 최대 2개로 먼저 보며,
나머지 유효 형식은 `다른 형식`에서 연다. 각 형식은 결과 개수와 제외되는
정보를 실행 전에 표시한다.

## Acceptance marker

- `P35-EXPORT-SCOPE-FIRST`
- `P35-EXPORT-COUNT-PARITY`

## 실제 parity

| 범위 | 예고 | 실제 결과 | 영수증 |
| --- | --- | --- | --- |
| 전체 | Calendar 5개 | ICS VEVENT 5개 | 5개 |
| 선택 | Checklist 2개 | checklist row 2개 | 2개 |
| 선택 | Sheet 2행 | TSV data row 2행 | 2행 |
| 현재 | Memo 1개 | 현재 item 1개 | 1개 |

날짜 없는 현재 항목은 Calendar 형식을 빈 tab으로 노출하지 않는다.
대신 `Flow로 돌아가 날짜를 정해 주세요`라는 복구 경로를 제공하며
Checklist, Sheet, Memo는 계속 사용할 수 있다.

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [전체 범위 모바일](./screenshots/p35-07-export-whole-390.png)
- [선택 범위 모바일](./screenshots/p35-07-export-selected-390.png)
- [현재 항목 와이드](./screenshots/p35-07-export-current-1024.png)
- [결과 영수증 데스크톱](./screenshots/p35-07-export-receipt-1440.png)

## 현재 slice 검증

- P35-07 전용 E2E: 2/2 pass
- P26 whole/selected/current 회귀: 1/1 pass
- export scope/recommendation unit: 13/13 pass
- production build: pass
- 390/1024/1440 horizontal overflow: 0
- visible unnamed interactive control: 0
- console/page error: 0

자동화, fixture, screenshot 검증은 실제 사용자 관찰이 아니다.
