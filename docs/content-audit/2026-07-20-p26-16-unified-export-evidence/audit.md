# P26-16 Unified Export Audit

## 원인 판단

기존 export 기능 자체는 있었지만 surface마다 계약이 달랐다.

| Surface | 기존 문제 | P26-16 처리 |
| --- | --- | --- |
| public `/f` | bespoke format 버튼이 저장 CTA와 별도 언어를 사용 | Flow 전체 고정 scope와 공통 예상 결과/receipt 사용 |
| My Flow 전체 | scope와 destination count는 있었으나 실행 후 결과가 일시 문구로 끝남 | 실제 output count와 filename/clipboard receipt 연결 |
| My Flow 선택 | 선택 수와 Calendar eligibility가 소비자별로 갈릴 위험 | 하나의 export plan이 모든 destination count를 계산 |
| 현재 항목 | 별도 details UI와 별도 feedback 사용 | 1개 고정 plan과 공통 receipt 계약 사용 |
| 반복 Flow | 화면 회차 수와 ICS series 수가 같은 숫자로 보일 위험 | `반복 일정`과 `표시 회차`를 분리하고 ICS는 실제 VEVENT 수로 receipt 작성 |

핵심 원인은 `무엇을 가져가는지`, `각 형식에 몇 개가 들어가는지`, `실제로 무엇이 만들어졌는지`를 각 consumer가 따로 설명한 점이다. P26-16은 builder를 다시 만들지 않고 pure plan과 result receipt를 사이에 둔다.

## 구현 계약

### Export plan

`buildFlowExportScopePlan`은 다음 값을 정본으로 만든다.

- scope: `flow | selected | item`
- included item과 stable key
- dated/undated count
- recurring series count와 visible occurrence count
- destination별 eligible count와 omitted count
- destination별 filename

완료·다시 열기는 membership을 바꾸지 않는다. empty selection은 Flow 전체로 fallback하지 않는다. malformed/duplicate key는 출력 중복을 만들지 않는다.

### Result receipt

`buildFlowExportResultReceipt`은 button click 자체가 아니라 consumer가 반환한 실제 결과를 기록한다.

- success/error
- scope와 destination
- actual output count
- omitted count
- download filename 또는 clipboard message

복사 실패는 성공으로 표시하지 않고 output 0으로 남는다.

### Consumer 연결

- public Calendar: 실제 ICS 문자열의 `BEGIN:VEVENT` 수를 사용한다.
- public sheet: 기존 XLSX builder 성공 여부와 실제 filename을 사용한다.
- public memo: 기존 user-facing text builder의 clipboard 성공 여부를 사용한다.
- My Flow Calendar: scoped effective rows로 생성한 ICS의 실제 VEVENT 수를 사용한다.
- My Flow checklist/sheet/memo: scoped effective row 수와 copy 성공 여부를 사용한다.
- 현재 항목: 동일 plan을 1개 fixed scope로 만들고 기존 portable builder를 실행한다.

public scope는 항목 선택을 제공하지 않는 Flow 전체 고정 scope다. 날짜 있음 membership은 실제 schedule entry ID로 계산하고, Calendar event output 수는 membership과 분리해 실제 ICS VEVENT 수를 사용한다. 여러 날 일정과 반복 series에서도 `날짜 있는 항목 수`와 `생성 event 수`를 같은 숫자로 오해하지 않는다. item-level public export는 만들지 않았다.

## 현재 시나리오 결과

| Scenario | Preview | Actual | 판정 | Evidence kind |
| --- | ---: | ---: | --- | --- |
| `/f/moving-d30-basic`, Flow 전체 Calendar | 24 | VEVENT 24 | pass | current_browser |
| `/f/vehicle-inspection-prep`, 날짜 없음 Calendar | 0, disabled | download 없음 | pass | current_browser |
| 차량 점검 한 항목 날짜 배치 후 Calendar | 1 | VEVENT 1 | pass | current_browser |
| `/my?demo=source-backed`, 직접 선택 memo | 2 | ordered row 2 | pass | current_browser |
| source-backed 현재 항목 memo | 1 | row 1 | pass | current_browser |
| `/f/washer-tub-clean-monthly` | series 1, visible 4 | VEVENT 1, `FREQ=MONTHLY;BYMONTHDAY=20` | pass | current_browser |
| personal draft checklist | 3 | item line 3 | pass | current_browser |
| personal draft sheet | item 3 | header 포함 4줄 | pass | current_browser |
| personal draft memo | 3 | ordered item 3 | pass | current_browser |
| personal draft scheduled Calendar | 1 | VEVENT 1, stable UID | pass | current_browser |

Preview/output mismatch는 0건, duplicate row/event는 0건이다.

## 모바일·와이드·접근성

- 390px: public whole, selected, routine export panel에서 horizontal overflow 0.
- 1024px: scope selector, 선택 목록, 4-format grid가 panel 폭 안에 유지됨.
- 공통 section은 `1 · 범위`, `2 · 예상 결과`, `3 · 형식`, `4 · 완료` 순서다.
- format은 native button이며 disabled Calendar는 이유를 visible text로 제공한다.
- receipt는 `role=status`이고 scope/destination/result를 텍스트로 제공한다.
- 내부 구조어 user-facing hit는 fixture guardrail과 현재 UI 검사에서 0이다.

## Reference 사용

로컬 `2026-07-19-flow-content-usage-preview-ko.html`의 compact result preview와 destination-first disclosure를 `prior_design_artifact`로만 참고했다. 파일을 복사하거나 stage하지 않았고 current source/interaction보다 우선하지 않았다.

## 검증 투명성

- P26-16 전용 E2E: 3/3 pass.
- public/workbench/Calendar identity 회귀: 46/46 pass.
- post-save hub와 최신 memo segmentation: 5/5 pass.
- 최신 personal draft list export: 1/1 pass.
- 최신 personal draft Calendar/ICS: 1/1 pass.
- source-backed 선택 export와 batch export 구형 회귀: 2/2 pass.
- 전체 unit: 564/564 pass.

테스트 실행 중 두 번의 command timeout은 결과 없음으로 분리했다. 또한 구형 P24 memo draft test는 제품 화면에 저장된 2개 항목이 보였지만 제거된 DOM selector를 기다려 실패했다. 이를 current product failure나 pass로 집계하지 않고 P26-19 test debt로 기록한다.

## 남은 위험

1. public은 기존 capability를 유지해 checklist destination을 별도 제공하지 않는다. P26-17에서 label/component 일관성을 다시 점검하되 새 export product를 임의로 추가하지 않는다.
2. 현재 항목 UI는 detail에 맞춘 compact surface이며 visual component까지 완전히 동일하지 않다. 데이터/receipt 계약만 동일하다.
3. browser clipboard fallback과 실제 OS clipboard 정책은 자동화 환경 밖에서 다를 수 있다.
4. 반복 ICS의 실제 Calendar 앱 import와 중복 import는 사람/실앱 검증이 필요하다.
5. 구형 P24 E2E selector를 P26-19의 one-command harness에서 제거하거나 현재 journey로 이관해야 한다.
