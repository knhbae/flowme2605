# 근본 문제와 반증 가설 지도

## 1. 피드백 10개를 데이터 구조·네 제품 결정·두 횡단 규칙으로 묶기

| 결정 | 연결 피드백 | 먼저 답할 질문 |
|---|---|---|
| D0 · 데이터→UI 구조 | 이전 구조 우려, U07, U08, U09 | 콘텐츠마다 UI·상태를 따로 만들고 있는가, 하나의 canonical 모델과 공통 renderer가 capability만 다르게 표현하는가? |
| D1 · `내 Flow` IA | U03, U07, U08, U10 | 저장한 계획, 오늘 할 일, 선택한 계획은 어떤 상하 관계인가? |
| D2 · 생명주기·행동 소유권 | U01, U07, U08, U09 | 미리보기·수정·저장·실행·옮기기·완료를 어느 상태가 소유하는가? |
| D3 · canonical 계획과 결과 projection | U05, U07, U09 | 여러 형식은 같은 데이터의 투영인가, 콘텐츠별 별도 화면인가? |
| D4 · 공통 editor family | U04, U08, U09 | 같은 필드·취소·오류 문법을 쓰면서 공개 Apply와 저장 Save를 구분할 수 있는가? |
| D5 · 감산·도움·주의·접근성 | U02, U04, U05, U06 | 반복 설명을 줄이면서도 안전·비가역 영향과 접근 가능한 조작을 보존하는가? |
| D6 · 용어·CTA | U01, U04, U07, U09, U10 | 브랜드명이 아니라 현재 상태와 다음 결과를 동사로 예측할 수 있는가? |

D5~D6은 D0~D4 뒤에 적용하는 횡단 규칙이다. 구조가 잘못된 상태에서 helper를 추가하거나 색만 통일하지 않는다.

## 2. 검토 가설과 반증 조건

### H0. 콘텐츠별 UI가 아니라 공통 데이터→projection→surface 구조를 사용한다

- 지지 근거: canonical Item ID와 effective snapshot을 공유하고 surface는 content capability와 lifecycle에 따라 변형된다.
- 반증 조건:
  - slug·콘텐츠명이 실행 의미, 저장 payload, 형식 count를 직접 결정한다.
  - 같은 Item 수정값이 public·saved·Today·artifact에서 달라진다.
  - 새 콘텐츠를 추가할 때 renderer가 아니라 새 전용 화면·상태·handler가 필요하다.
  - 같은 기능 이름의 component가 실제로는 별도 데이터·commit 규칙을 가진다.
- 허용되는 차이: schedule·repeat·risk·hierarchy capability에 따른 field와 projection 차이.
- 허용되지 않는 차이: 콘텐츠마다 별도 canonical 상태를 만들거나 같은 action이 다른 version을 바꾸는 것.

### H1. `/my`는 저장 계획 library가 기준이고 Today는 파생 요약이다

- 지지 근거: 사용자가 저장한 원본 계획의 위치가 고정되고, Today는 날짜와 실행 상태로 자동 추릴 수 있다.
- 반증 조건: 0·1·5·20개 상태에서 다음 행동을 찾기가 Today-first보다 일관되게 느려지거나, 저장 직후 선택 계획을 찾지 못한다.
- 검토할 대안:
  - A: Today 우선 + library 보조
  - B: library 우선 + Today compact 파생
  - C: 저장 직후 selected detail, 일반 진입은 고정 shell
- 승인 기준: Q2-B의 B를 기본으로 평가하되 hard fail 근거가 있으면 `DECISION_REOPEN_REQUIRED`로 제출한다.

### H2. 저장 계획이 권위 있는 옮기기/재생성의 주 소유자다

- 지지 근거: 개인 수정·범위·완료 상태·재시도·receipt가 한 버전에서 이어진다.
- 반증 조건: 단순 local-only 결과도 무조건 저장하게 되어 export-first 진입이 크게 무거워지거나, 저장 전 미리보기만으로 충분한 사용을 막는다.
- 승인 기준: Q1-B에 따라 `미수정 + eligible + local-only + 이력 불필요 + remote 불필요`일 때만 session-only quick 후보를 허용한다.
- 반드시 구분:
  - 결과 미리보기
  - 실제 파일/클립보드 생성
  - 저장된 계획의 persistent transfer receipt
  - 자동 동기화가 아닌 단방향 결과

### H3. 형식은 고정 5개가 아니라 capability 기반 projection이다

- 지지 근거: 날짜 없는 계획에 가짜 캘린더를 만들지 않고, 같은 Item ID·제목·순서·메모를 목적지에 맞게 보존한다.
- 반증 조건: 중요한 형식을 지나치게 숨겨 사용자가 결과 가능성을 발견하지 못하거나, conditional 형식의 해결 행동이 없다.
- 검증할 기본 노출 가설이며 고정 acceptance는 아님:
  - primary 정확히 1개
  - 바로 가능한 available 최대 2개
  - conditional은 필요한 입력과 예상 결과 수 표시
  - unavailable은 정상 선택지처럼 클릭시키지 않고 이유 제공
- 검토자가 더 명확한 대안을 제시하면 실제 content capability·인지 부하·발견 가능성으로 비교한다.
- `Today/Todo`는 내부 실행 lens다. 외부 결과의 할 일·체크리스트와 별도 저장소처럼 다루지 않는다.

### H4. 공개·저장 Plan/Item은 한 editor family를 쓰되 commit 효과는 다르다

- 지지 근거: 필드 순서·닫기·취소·오류·Back·focus를 다시 배우지 않아도 된다.
- 반증 조건: 같은 표면이 공개 session Apply와 saved persistent Save를 구분하지 못하게 만들거나, 긴 계획에서 중첩 깊이와 복구가 더 어려워진다.
- 유지해야 할 차이:
  - Public Plan: 현재 세션 결과에 `변경 반영`
  - Public Item: 부모 공개 draft에 항목 변경 반영
  - Saved Plan: personal overlay `저장`
  - Saved Item: 부모 saved Plan draft에 반영 후 Plan 최종 저장
  - Item 실행: `완료`

## 3. 횡단 가설

### H5. 도움·주의는 먼저 감산하고 중요도별로 공개한다

| 정보 | 기본 처리 |
|---|---|
| 제목·선택값·버튼을 반복 설명 | 삭제 |
| 용어 정의·드문 사용법 | `? 도움말` popover/sheet |
| 조건·손실·선택 결과 | 행동 가까이에 한 줄, 필요 시 상세 확장 |
| 안전·개인정보·중복·비가역 영향 | 핵심 문장을 항상 inline, 상세만 확장 |

모든 설명을 modal로 만들지 않는다. 아이콘에는 접근 가능한 이름, 충분한 터치 영역, keyboard open/close, focus return이 필요하다.

### H6. 사용자 행동에는 `계획`과 결과 동사를 우선한다

- FLOW 브랜드·URL·내부 type·`flow:*` key는 유지한다.
- 핵심 내비게이션과 CTA는 `계획 찾기`, `내 계획`, `계획 수정`, `내 계획에 저장`, `내 도구로 옮기기`를 비교한다.
- `완료`는 Item 실행 상태에만 쓴다.
- 용어를 도움말로 장황하게 설명해야만 한다면 용어 자체를 다시 검토한다.
- 실제 이해도는 이번 내부 검토로 확정하지 않는다.

## 4. 사용자 해결안을 그대로 채택하지 않을 검토 항목

| 사용자 제안 | 그대로 적용할 위험 | 의도를 살린 검토안 |
|---|---|---|
| 내보내기는 전부 `내 Flow`에서 | 단순 결과에도 내부 저장 강제 | saved authoritative + 엄격한 quick-local 예외 |
| 모든 도움·주의를 `?`/`!` popup | 안전·비가역 영향 은폐, modal 과다 | 삭제/도움/조건/안전 4등급 |
| 모든 Flow에 5개 형식 | 빈 결과·가짜 날짜·손실 숨김 | primary/available/conditional/unavailable |
| 하단 `편집 / 완료` 통일 | 저장과 실행 완료 의미 충돌 | `수정 / 내 계획에 저장`, 실행에서만 `완료` |
| Flow Map 3칸 전부 삭제 | 선택 범위·저장 수까지 사라짐 | grid 삭제 + `선택 N / 전체 M` 한 줄 검토 |
| 공개/저장 편집을 완전히 동일화 | session Apply와 persistent Save 혼동 | 같은 family + context별 commit label |
| `Flow` 전면 치환 | 브랜드·URL·내부 계약까지 불필요한 변경 | 핵심 사용자 surface부터 단계 적용 |

두 검토자는 최소 세 행에 대해 `그대로 채택하지 않는 이유`, `유지할 사용자 의도`, `대안`을 제출한다.

## 5. 이전에 놓친 부분

- 저장 전·후가 같은 화면처럼 보이는지뿐 아니라 실제 snapshot version·Item IDs·count가 같은지
- 공개 quick 결과와 saved transfer receipt의 수명·저장·이력 차이
- 0·1·5·20개 계획에서 동일 IA가 유지되는지
- 날짜 없는 계획, mixed-date, memo-first, repeat routine의 capability 차이
- clipboard/file 생성 성공 후 receipt 저장 실패 같은 partial-local 상태
- 실패·권한 거절·중복 클릭·재시도·취소·Back 뒤 상태 보존
- 긴 한글·emoji·1/24/50 Item·390px sticky action·1440px inspector
- keyboard·screen reader·reduced motion·200% zoom
- flag-off와 legacy read-only open에서 storage rewrite가 0인지
- Production baseline과 미게시 local candidate를 섞어 평가하지 않는지

## 6. 검토 결론 형식

데이터 구조와 각 근본 결정은 다음 형식으로 제출한다.

```text
decision:
current production fact:
local P0-06 fact:
proposal under review:
supporting evidence:
falsifying evidence:
selected direction:
rejected alternatives and reasons:
data/storage impact:
accessibility/safety impact:
legacy/rollback impact:
implementation acceptance:
remaining TBD:
decision reopen required: yes/no
```
