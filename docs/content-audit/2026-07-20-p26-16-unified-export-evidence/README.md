# P26-16 Unified Export Evidence

P26-16은 public 저장 전 Flow, My Flow의 Flow 전체/직접 선택, 현재 항목 가져가기를 하나의 `scope -> expected result -> format -> receipt` 계약으로 맞춘다. 실제 출력 builder는 유지하고, 화면의 예고 수치와 완료 receipt가 그 builder 결과를 다시 확인하도록 연결했다.

## 결과

- public `/f`는 `Flow 전체` 고정 범위와 실제 날짜/반복/제외 수를 먼저 보여준다.
- My Flow는 `Flow 전체`, `직접 선택`, `현재 항목`을 같은 용어와 count 규칙으로 사용한다.
- Calendar는 날짜 있는 항목만 세며, 날짜가 하나도 없으면 `날짜 있는 항목이 없어요`와 함께 비활성화된다.
- 실행 후에는 destination, 실제 출력 수, 제외 수, 파일명 또는 clipboard 결과가 같은 receipt에 남는다.
- moving 전체는 24개, 직접 선택은 2개, 현재 항목은 1개로 예고와 결과가 일치한다.
- 차량 점검은 날짜 없음 상태에서 Calendar 0개이며, 한 항목을 배치하면 ICS 1개가 된다.
- 세탁조 월간 루틴은 `반복 일정 1개 · 표시 회차 4개`로 읽히고 실제 ICS는 VEVENT 1개와 월간 RRULE 1개다.
- 개인 draft의 effective item은 checklist 3개, sheet 4줄(헤더 1 + 항목 3), memo 3개, scheduled ICS 1개를 유지한다.
- source item, personal overlay, execution state, export 저장 스키마는 변경하지 않았다.

## 화면 계약

1. 범위: 무엇을 가져갈지 고른다.
2. 예상 결과: 포함 수, 날짜 있음/없음, 반복 series, destination 제외 수를 본다.
3. 형식: 현재 surface가 지원하는 Calendar/checklist/sheet/memo 형식을 실행한다.
4. 완료: 실제 출력 수와 파일명 또는 복사 결과를 확인한다.

public은 Flow 전체 고정 범위이며 기존 capability인 Calendar, sheet, memo를 유지한다. My Flow는 Flow 전체/직접 선택과 네 destination을 제공한다. 현재 항목은 1개 고정 범위를 같은 receipt 계약으로 사용한다.

## Evidence

- [상세 감사](./audit.md)
- [구조화 marker](./route-evidence.json)
- [출력 fixture](./export-fixtures.json)
- [public Flow 전체 24개, mobile](./screenshots/01-public-whole-flow-mobile.png)
- [직접 선택 2개, mobile](./screenshots/02-selected-items-mobile.png)
- [반복 series 1개와 표시 회차 4개, mobile](./screenshots/03-routine-series-mobile.png)
- [My Flow export preview, wide](./screenshots/04-whole-flow-wide.png)

## 검증 경계

근거 종류는 `current_source`, `current_command`, `current_browser`, `prior_design_artifact`로 나눈다. 자동화된 Playwright와 fixture는 실제 사용자 관찰이 아니다. 실제 관찰 세션은 0건이다.

구형 `p24-execution-trust`의 메모 draft 1개 시나리오는 현재 post-save hub와 overview card 이전 DOM을 기다려 실패했다. 같은 제품 계약은 최신 `p26-memo-segmentation`과 `url-first-user-surface` 시나리오에서 통과했으며, 구형 selector 정리는 P26-19 harness 통합 범위로 남긴다.
