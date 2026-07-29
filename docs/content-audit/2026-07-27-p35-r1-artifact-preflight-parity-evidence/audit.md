# P35-R1 상세 감사

## 1. 문제

기존 public 저장 전 preview는 콘텐츠에 맞는 Calendar, Checklist, Sheet,
Memo 결과를 먼저 보여주지만, 아래의 가져가기 영역은 별도 destination
목록을 하드코딩했다. 그 결과 preview와 export가 서로 다른 결과 종류나
수량을 약속할 수 있었다.

특히 반복 Flow는 아래 세 수량이 다른데도 한 숫자처럼 읽힐 위험이 있었다.

- source Item 수
- ICS에 저장되는 반복 series event 수
- 선택한 범위에서 실제로 보이는 occurrence 수

## 2. 선택한 해결책

새 export 모델을 만들지 않고 기존 `FlowExperienceProjection`에서 만든
artifact recommendation을 public preflight의 정본으로 재사용했다.

```text
source Flow
  -> FlowExperienceProjection
  -> primary 1 + secondary 최대 2
  -> artifact destination
  -> existing FlowExportPanel
```

이 구조는 public Flow 전체 범위에만 적용된다. My Flow의
whole/selected/current 범위와 export builder, receipt identity는 변경하지
않았다.

## 3. Route 결과

### `/f/moving-d30-basic`, 390x844

- preview: Calendar 24개
- 날짜 확정 후 schedule state: `committed`
- preflight primary: Calendar
- Calendar export count: 24
- secondary: Checklist 24
- 보이는 disabled result: 0

### `/f/vehicle-inspection-prep`, 1024x768

- preview: Checklist 10개
- schedule state: `not_applicable`
- preflight primary: Checklist 10
- Calendar result는 노출하지 않음

### `/f/source-backed-middle-school-math-1`, 1024x768

- preview: Sheet 8개
- preflight primary: Sheet 8
- eligible secondary만 노출

### `/f/overseas-safety-register`, 1024x768

- preview: Memo 4개
- preflight primary: Memo 4
- eligible secondary만 노출

### `/f/curated-allblanc-morning-workout`, 1024x768

- preview source Item: 1개
- 날짜 확정 전: `provisional`
- provisional occurrence preview: 12개
- Calendar action: hidden + disabled
- 날짜 확정 후: `committed`
- ICS series event: 1개
- 표시 occurrence: 12개
- source Item count와 occurrence count를 합치거나 바꾸지 않음

## 4. 접근성 및 반응형

- disclosure는 `summary`로 keyboard 접근 가능하다.
- 보이는 result action의 accessible name에 scope, destination, count가 있다.
- primary action은 결과별 1개다.
- unsupported/disabled action은 화면에 보이지 않는다.
- 390px과 1024px에서 horizontal overflow가 없다.
- 새 fixed layer를 추가하지 않았다.

## 5. 데이터 영향

| 영역 | 변경 |
| --- | --- |
| source snapshot | 없음 |
| personal overlay | 없음 |
| execution run | 없음 |
| occurrence identity | 없음 |
| export identity | 없음 |
| localStorage key/schema | 없음 |
| migration | 불필요 |

## 6. Rollback

R1 변경은 `artifact-recommendation`의 preflight adapter와 public export
presentation 입력에 한정된다. `public-flow-export-secondary-entry`가 이
입력을 사용하지 않도록 되돌리면 기존 화면으로 복귀하며 저장 데이터와
export builder는 영향을 받지 않는다.

## 7. 잔여 위험

1. routine의 `VEVENT 1개 + RRULE`과 표시 회차 수는 올바르게 분리됐지만,
   실제 외부 Calendar 앱별 RRULE 렌더링 차이는 이번 자동 QA 범위 밖이다.
2. public preflight copy가 실제 사용자에게 충분히 짧고 이해 가능한지는
   관찰 사용자 `0명` 상태이므로 확인되지 않았다.
3. receipt와 My Flow의 같은 artifact 연속성은 `P35-R3`에서 닫는다.
4. full E2E와 독립 five-shape final gate는 `P35-R7`에서 재실행한다.
