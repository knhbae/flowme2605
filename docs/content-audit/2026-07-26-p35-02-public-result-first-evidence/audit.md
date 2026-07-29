# P35-02 Public Result-first Audit

## 1. 문제와 변경 범위

기존 public 저장 전 화면은 실제 저장 결과보다 설명, 요약 칩, 결과 형태 선택, 전체 Flow outline, 행별 세부 내용이 먼저 읽혔다. 같은 항목이 outline, artifact preview, legacy 실행 renderer에서 반복돼 사용자가 무엇을 저장하는지 한눈에 판단하기 어려웠다.

이번 slice는 public save-before composition만 바꿨다.

- 자연스러운 primary artifact를 실제 데이터로 먼저 표시
- 항목 수와 날짜·반복 요약을 결과 제목에 결합
- 처음 3개 항목과 같은 영역의 나머지 항목 disclosure 제공
- 필요한 Flow에만 최소 입력 노출
- 실제 수량이 포함된 primary action 한 개 유지
- 저장 성공 후 별도 receipt frame으로 전환
- 중복 outline과 legacy 상세 renderer 제거

변경하지 않은 것:

- source-backed content
- canonical identity
- saved Flow key와 schema
- personal overlay
- execution run과 occurrence
- Calendar, checklist, sheet, memo, ICS builder
- public source, safety, rights 정보
- 3개 primary navigation과 4탭 이전 호환 route

## 2. 대표 route 판정

| route | viewport | 자연스러운 결과 | 전체 항목 | 첫 노출 | 최소 입력 | 판정 |
| --- | --- | --- | ---: | ---: | --- | --- |
| `/f/moving-d30-basic` | 390x844 | Calendar | 24 | 3 | 이사일 1개 | pass |
| `/f/vehicle-inspection-prep` | 390x844 | Checklist | 10 | 3 | 없음 | pass |
| `/f/curated-allblanc-morning-workout` | 1024x768 | Flow 실행 | 1 | 1 | 시작일 1개 | pass |
| `/f/source-backed-middle-school-math-1` | 1440x900 | Sheet | 8 | 3 | 없음 | pass |

모든 route에서 제목 다음에 원문 링크, 실제 결과, 필요 입력, 저장 명령 순서가 유지됐다. 원문 링크는 한 개이며 새 창에서 열리고, sourceTrace와 안전·권리 정보는 접힌 보조 정보로 남았다.

## 3. 제거한 중복

| 항목 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| 결과 형태 선택 탭 | route에 따라 여러 개 | 0 |
| 상단 요약 칩 | 3 | 0 |
| `전체 흐름` heading | 1 이상 | 0 |
| `한눈에 보는 전체 루트` | 1 | 0 |
| legacy 상세 실행 renderer | 1 | 0 |
| visible primary action | route에 따라 경쟁 | 1 |

사용자는 같은 artifact preview 안에서 처음 3개를 보고 `나머지 N개 보기`로 전체를 확인한다. 별도 전체 Flow 카드나 같은 데이터를 다시 그리는 renderer는 없다.

## 4. 저장 전과 저장 후 경계

저장 전:

- 실제 result preview 1개
- 필요한 setup input 0개 또는 1개
- mobile 또는 desktop primary save action 1개
- 완료 checkbox 0개

저장 후:

- saved receipt heading 1개
- 저장된 개인 이름, 항목 수, 날짜 범위, source 표시
- 다음 primary action 1개
- save-before hero, preview, input, fixed save CTA 0개

receipt의 주 행동은 같은 저장 record를 My Flow에서 여는 경로다.

## 5. responsive와 접근성

### 390x844

- title, source, actual result, setup, primary action이 첫 viewport 안에 들어옴
- fixed mobile CTA와 다른 interactive element overlap 0
- horizontal overflow 0
- primary action 1개
- result disclosure accessible name에 숨은 항목 수 포함

### 1024x768

- routine result와 setup이 역할별 두 영역으로 읽힘
- 중복 outline 0
- 긴 반복 설정은 기존 progressive disclosure 유지
- horizontal overflow 0

### 1440x900

- 학습 Sheet의 8개 row를 같은 preview에서 확인
- 불필요한 setup input 0
- source/safety/export는 secondary disclosure로 유지
- nested whole Flow card 0

## 6. honest hold

검토 보류 source route는 public save frame에 진입하지 않는다.

- public hero 0
- save action 0
- 실제 원문 확인 action 유지
- live AI 또는 자동 생성으로 읽히는 문구 0

## 7. 검증 결과

| 검증 | 결과 |
| --- | --- |
| docs check | pass, required 14 / local links 3183 |
| pretest | 73/73 pass |
| unit | 590/590 pass |
| production build | pass, BUILD_ID present |
| P35-02 E2E | 6/6 pass |
| 관련 회귀 E2E | 119/119 pass |
| root/catalog/routine targeted E2E | 4/4 pass |
| diff check | pass, line-ending warning only |
| horizontal overflow | 0 |
| fixed overlap | 0 |
| console error | 0 |
| page error | 0 |
| duplicate whole Flow heading | 0 |
| public result-shape tab | 0 |

## 8. 평가와 다음 경계

P35-02는 실제 결과를 먼저 보여주는 frame을 닫았다. 그러나 `Flow 조정`을 열면 이름, 날짜, 포함 항목, 반복 설정이 한꺼번에 나타날 수 있다. 이는 P35-03의 범위이며, P35-02 완료를 이유로 조정 UX가 완료됐다고 보지 않는다.

P35-03에서는 한 번에 한 종류만 수정하고 적용·취소·focus return을 명확히 해야 한다. 이번 slice의 result-first preview와 저장 계약은 그대로 재사용해야 한다.

실제 관찰 사용자 수는 0이다.
