# Cross-entry Canonical Flow Review Scenarios

이 시나리오는 agent simulation과 browser QA를 위한 것이다. 실제 사용자 관찰을 대체하지 않는다.

## 공통 실행 규칙

1. 각 persona는 독립된 browser profile 또는 localStorage clear 상태에서 시작한다.
2. 같은 persona의 Session 1 결과는 Session 2와 Session 3으로 이어간다.
3. session 사이에 reload, route 재진입, Home/Find/URL lookup 재탐색을 포함한다.
4. destructive action은 disposable profile에서만 수행한다.
5. 화면 pass와 end-to-end identity pass를 별도로 판정한다.
6. 같은 source에서 title/count/artifact/save object가 달라지면 화면이 각각 정상이어도 journey는 `partial` 이하로 판정한다.
7. prior screenshot이나 기존 audit 수치를 current production 결과로 복사하지 않는다.

## P1 Home-first moving

상황: 이사를 앞두고 홈의 사용 예에서 바로 시작한다. Flow Map이라는 내부 개념을 모른다.

### Session 1 - Home에서 이해·조정·저장

Route: `/ -> /f/moving-d30-basic`

1. Home card에서 title, result, 필요한 입력을 예측한다.
2. detail에서 source, title, 전체 항목 수, primary artifact를 확인한다.
3. Calendar/Checklist result choice를 각각 조작한다.
4. 이사일을 입력하고 날짜 범위와 item count를 확인한다.
5. `조정`에서 include, date, title/memo, order의 도달성과 밀도를 확인한다.
6. 저장하고 receipt의 title/count/range/source/next action을 기록한다.

### Session 2 - My Flow·Calendar 실행

1. receipt에서 My Flow로 이동한다.
2. 저장한 title/count가 save-before와 같은지 확인한다.
3. 첫 할 일을 완료하고 다시 연다.
4. Calendar에서 날짜와 title을 비교한다.
5. whole export preflight count를 확인한다.

### Session 3 - 다른 entry 재발견

1. Home으로 돌아가 같은 card를 다시 연다.
2. `/flows`에서 이사 Flow를 검색한다.
3. AJD source URL을 URL lookup에 붙여넣는다.
4. 세 entry가 같은 saved state와 하나의 My Flow object를 가리키는지 확인한다.

## P2 Find-first moving

상황: Home을 거치지 않고 Flow 찾기에서 여러 콘텐츠를 비교한다.

### Session 1 - Catalog에서 선택

Route: `/flows -> /flow-maps/moving-d30`

1. card의 title, source link, representative rows, required input, result를 기록한다.
2. `더보기` 후 shell, title, item count, artifact, global navigation을 확인한다.
3. `조정`에서 가능한 수정 범위를 기록한다.
4. `그대로 시작`과 조정 저장의 결과를 비교한다.

### Session 2 - 저장 후 실행

1. 저장 후 receipt가 있는지, 어느 route로 이동하는지 확인한다.
2. My Flow object ID/title/count를 기록한다.
3. date/complete/reopen/export가 가능한지 확인한다.

### Session 3 - Home과 비교

1. Home의 이사 card를 연다.
2. Find에서 저장한 상태가 Home target에 나타나는지 확인한다.
3. Home target도 저장한 뒤 My Flow object count를 확인한다.
4. duplicate가 생기면 어느 쪽을 계속 사용해야 하는지 UI가 설명하는지 확인한다.

## P3 URL-first moving source

상황: AJD 원문을 읽다가 URL을 FlowMe에 붙여넣는다.

### Session 1 - URL lookup

Route: `/flows`

1. AJD moving source URL을 입력한다.
2. lookup 결과의 title, item count, route, source를 기록한다.
3. Home/Find의 moving 결과와 같은 object로 인식 가능한지 평가한다.

### Session 2 - 저장·projection

1. URL lookup result에서 detail을 연다.
2. 저장 후 My Flow와 Calendar를 확인한다.
3. item count, date, title, stable identity를 기록한다.

### Session 3 - alias continuity

1. `/f/moving-d30-basic`, `/f/curated-ajd-moving-d30`, `/f/source-backed-moving-d30`, `/flow-maps/moving-d30`를 차례로 연다.
2. 저장 상태, 완료 상태, 개인 날짜, 메모가 공유되는지 확인한다.
3. canonical route를 사용자가 설명 없이 식별할 수 있는지 판정한다.

## P4 Existing duplicate returner

상황: 이미 24-item moving과 5-item moving을 모두 저장했다.

### Session 1 - 중복 인지

1. disposable profile에서 두 entry를 모두 저장한다.
2. My Flow 목록에서 title/count/next action을 비교한다.
3. 같은 source라는 단서와 중복 경고가 있는지 확인한다.

### Session 2 - 상태 분기

1. 첫 Flow의 한 항목을 완료한다.
2. 날짜와 메모를 수정한다.
3. 두 번째 Flow에서 상태가 반영되는지 확인한다.
4. Calendar와 export에 중복 event/row가 생기는지 확인한다.

### Session 3 - reconciliation 요구

1. 한 Flow를 보관하고 다른 Flow를 유지한다.
2. source 재발견 시 어떤 상태가 열리는지 확인한다.
3. 제안할 reconciliation에서 보존할 personal/run/export data를 기록한다.
4. 자동 병합, 사용자 선택, alias-only 세 대안의 위험을 비교한다.

## P5 Vehicle checklist expectation

상황: Home에서 `필요할 때 쓰는 차량 점검 체크리스트`를 기대한다.

### Session 1 - Promise와 target

Route: `/ -> /f/vehicle-inspection-prep`

1. Home card의 user job과 result를 기록한다.
2. target의 title, source, required input, primary artifact를 비교한다.
3. Calendar와 Checklist button을 각각 누르고 selected state, heading, preview, CTA 변화를 기록한다.

### Session 2 - 날짜 intent와 저장

1. example, custom date, undated를 비교한다.
2. undated 저장 후 My Flow와 Calendar tray를 확인한다.
3. custom date 저장 후 Calendar projection을 확인한다.

### Session 3 - Find rediscovery

1. `/flows`에서 `차량`, `차량 점검`, `자동차검사`를 검색한다.
2. Home target과 같은 card/route가 나오는지 확인한다.
3. server fallback과 hydrated catalog의 차이가 사용자에게 flicker 또는 inventory 변경으로 보이는지 확인한다.

## P6 Recurring workout

상황: Home 또는 Find에서 주 3회 운동을 설정하고 회차별로 실행한다.

### Session 1 - Entry·series 설정

1. Home과 Find의 workout card가 같은 route/title/source를 여는지 확인한다.
2. Flow/Calendar/Memo choice가 실제로 바뀌는지 확인한다.
3. weekday, time, duration, end mode를 설정한다.
4. next three occurrences와 save receipt를 기록한다.

### Session 2 - My Flow·Calendar

1. dated save와 undated save를 각각 disposable profile에서 확인한다.
2. My Flow summary, raw recurrence copy, Calendar occurrences를 비교한다.
3. 한 occurrence를 완료하고 다시 연다.
4. series definition이 변하지 않는지 확인한다.

### Session 3 - Export·재진입

1. ICS와 list export에서 series/item/occurrence count를 확인한다.
2. Home/Find에서 재진입했을 때 설정과 실행 상태가 이어지는지 확인한다.
3. video resource와 executable item의 역할이 화면별로 일관적인지 평가한다.

## P7 Wedding positive control

상황: 현재 artifact choice와 별도 entry가 작동하는 control 사례로 사용한다.

### Session 1 - Independent cards

1. `/flows`에서 wedding timeline과 four-item sheet를 찾는다.
2. 두 card가 source/job/result 기준으로 분리되어 읽히는지 확인한다.
3. each detail의 primary/secondary artifact를 조작한다.

### Session 2 - Save continuity

1. 각 Flow를 저장한다.
2. receipt, My Flow object, Calendar/export eligibility를 확인한다.
3. moving/vehicle과 다른 이유가 content-shape 때문인지 implementation gate 때문인지 분리한다.

### Session 3 - Pattern extraction

1. wedding에서 잘 작동하는 card/detail/choice grammar를 추출한다.
2. moving/vehicle에 그대로 적용할 수 있는 부분과 적용하면 안 되는 부분을 기록한다.
3. category hardcode 없이 표현할 projection contract를 제안한다.

## P8 Keyboard and responsive

상황: 키보드 중심 또는 확대된 모바일 화면에서 entry를 비교한다.

### Session 1 - 390x844

1. Home card -> detail -> adjust -> save를 keyboard-only로 실행한다.
2. Find card -> detail -> adjust -> save를 같은 방식으로 실행한다.
3. visible label, accessible name, focus order, fixed layer overlap을 비교한다.

### Session 2 - 1024x768 / 1440x900

1. Home, Find, public `/f`, `/flow-maps`, My Flow, Calendar를 비교한다.
2. artifact canvas, context inspector, global/local navigation의 역할을 기록한다.
3. 동일 Flow anatomy가 viewport에 따라 달라지는지 확인한다.

### Session 3 - Failure and recovery

1. 잘못된 date, empty adjustment, repeated save, browser back/reload를 실행한다.
2. focus return, preserved input, duplicate object, recovery message를 기록한다.
3. 접근성 문제와 canonical identity 문제를 별도 finding으로 분류한다.

## 공통 cross-entry invariant matrix

각 route에 대해 반드시 채운다.

| Entry | Route | Source URL | Canonical Flow ID | Title | Item count | Primary artifact | Secondary artifacts | Adjust capability | Save object/key | Receipt | My Flow object | Calendar/export |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |

## 실제 사용자에게만 확인 가능한 질문

- 서로 다른 24-item/5-item 이사 Flow를 같은 원문으로 인식하는가?
- example Calendar와 `날짜 없이 시작`을 동시에 보면 실제 저장 결과를 예측하는가?
- Home의 차량 card를 보고 법정검사 D-14 준비를 기대하는가?
- 중복 Flow가 생겼을 때 어느 것을 지우거나 유지할지 판단할 수 있는가?
- Home과 Find의 역할 차이는 유용한가, 아니면 중복으로 느끼는가?

이 질문은 agent simulation 결과로 답하지 않는다.
