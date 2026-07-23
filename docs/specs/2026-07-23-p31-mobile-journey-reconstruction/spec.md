# P31 Mobile Journey Reconstruction Spec

## 1. 목적

FlowMe의 현재 기능은 발견, 저장, 개인화, 실행, Calendar, export, 완료·재개, 재사용까지 연결돼 있다. 문제는 기능 부재보다 모바일 표면마다 다음 질문이 동시에 노출된다는 점이다.

- 이 Flow가 무엇인가?
- 어떤 형태로 쓸 것인가?
- 날짜를 어떻게 정할 것인가?
- 무엇을 수정할 것인가?
- 저장할 것인가, 내보낼 것인가?
- 지금 실행할 것인가?
- Flow를 관리하거나 없앨 것인가?

P31의 목적은 기능을 더 붙이는 것이 아니라, 사용자 여정의 각 frame이 **한 가지 질문과 한 가지 primary action**만 담당하도록 재구성하는 것이다.

## 2. 제품 위치

FlowMe는 Todoist, Notion, Google Calendar, Apple Calendar, 운동 앱을 대체하는 무거운 planner가 아니다.

```text
원문·URL·메모
-> 실행 가능한 Flow
-> 최소 개인화
-> 실제 결과 미리보기
-> My Flow/Calendar 실행 또는 기존 도구로 가져가기
-> 완료·복구·회고·재사용
```

따라서 P31은 다음을 우선한다.

- 원문에서 확보한 정보를 다시 입력시키지 않는다.
- 모든 콘텐츠에 같은 결과 종류를 강요하지 않는다.
- 콘텐츠별 자연스러운 primary artifact를 먼저 보여 준다.
- 고급 편집은 요청할 때만 연다.
- 화면마다 별도 상태·count·identity를 만들지 않는다.

## 3. 현재 증거와 한계

### 현재 확인된 것

- P30 production의 overflow, fixed overlap, console/page error 기본 gate는 통과했다.
- source, personal overlay, run, occurrence, export identity 계약은 자동 테스트로 안정적이다.
- Flow 카드, save-before, My Flow, Calendar는 기능적으로 도달 가능하다.
- archive/restore helper와 영구 삭제 helper 일부는 source에 존재한다.

### 현재 문제

- 설명 없이 이해 가능한 journey cell: `13/24`
- 설명이 필요한 journey cell: `11/24`
- 시나리오 interaction depth: `191`, 평균 `7.96`
- mobile save primary keyboard 도달: 약 `16 Tab`
- 펼친 My Flow focusable control: `74~90`
- public adjustment에서 저장한 Item 날짜가 이후 My Flow 날짜보다 우선해 Calendar/ICS와 불일치하는 Blocking이 있다.
- 모바일 archived Flow는 8초 undo 이후 직접 복구하기 어렵다.
- `removeSavedFlow`는 UI call site가 없고 삭제 범위 계약도 고정되지 않았다.

### evidence boundary

- production interaction, current source, screenshot, fixture, heuristic simulation을 구분한다.
- 자동화·agent simulation을 실제 사용자 검증이라고 부르지 않는다.
- 실제 관찰 사용자 수는 계속 `0`으로 기록한다.

## 4. 유지할 P30 계약

다음은 P31에서 기본적으로 재설계하지 않는다.

1. 4탭 global IA
2. public `/f` 공유 shell
3. one user-facing Flow object
4. source snapshot과 personal overlay 분리
5. execution run과 recurrence occurrence 분리
6. whole/selected/current export scope
7. stable Item, occurrence, export identity
8. reversible completion/reopen
9. 날짜 없는 Item의 My Flow 보존과 Calendar 배치 queue
10. primary artifact 1개, meaningful secondary 최대 2개

단, `P31-00C`에서 홈/찾기 역할 구분이 실패하면 **4탭 IA만 별도 structural reopen 후보**가 될 수 있다. 이 경우 즉시 구현하지 않고 새 결정 문서를 만든다.

## 5. 공통 frame 문법

### Discovery

질문: “이 Flow가 내 목적에 맞는가?”

- title
- 한 줄 결과
- source link
- 실제 범위와 primary artifact
- 대표 Item 1~2개
- `더보기`

날짜 입력, row edit, export format, completion은 노출하지 않는다.

### Save-before

질문: “어떤 실제 결과를 만들고, 무엇만 정하면 되는가?”

1. source와 전체 범위
2. 추천 primary artifact
3. 실제 데이터 preview
4. 필요한 개인 값
5. 결과가 명시된 primary action
6. `조정`
7. 의미 있는 secondary artifact

### Saved receipt

질문: “무엇이 저장됐고 다음 어디로 가는가?”

- 저장된 Flow 이름
- Item/event 수
- 날짜 범위 또는 날짜 없음 수
- next action 1개
- secondary 1개 이하

### My Flow

질문: “지금 무엇을 하고, 필요하면 전체를 어디서 조정하는가?”

- 목록은 Flow 찾기와 선택에 집중
- workspace는 한 Flow 실행에 집중
- Item detail은 한 Item 읽기·완료·수정에 집중
- lifecycle와 export는 contextual menu/drawer에 둔다

### Calendar

질문: “선택한 날짜에 무엇이 있고, Item을 어떻게 실행·이동하는가?”

- month grid는 밀도와 identity만 표시
- selected-day agenda는 전체 title과 Flow identity 표시
- Item detail은 sheet/inspector
- 날짜 없는 일은 placement mode

## 6. 홈과 Flow 찾기 역할

### 권장 역할

| 상태 | 홈 | Flow 찾기 |
| --- | --- | --- |
| 처음 사용자 | 실제 사용 예시 2~3개, URL/메모 진입 | 검색, 카테고리, 전체 catalog |
| 재방문 사용자 | 이어서 할 일, 최근 Flow, 날짜 없는 일 요약 | 새 Flow 발견 |
| 인기·최근 | 사용 데이터가 생기기 전 미노출 | 실제 telemetry가 있을 때만 |
| 리뷰 | 사용 데이터가 생기기 전 미노출 | 실제 review contract가 있을 때만 |

홈의 “사용 예시”는 가상의 후기 카드가 아니다. 저장 전후가 어떻게 이어지는지를 실제 source-backed Flow와 실제 artifact preview로 보여 주는 짧은 journey다.

### social proof 정책

- production에서 가짜 사용자 수·리뷰 수를 표시하지 않는다.
- prototype에서는 `시뮬레이션 데이터`라고 명시한 경우에만 hierarchy 평가에 사용할 수 있다.
- 실제 구현 전 필요한 계약:
  - usage event 정의
  - unique user/session 중복 제거
  - review 작성 자격
  - moderation
  - updatedAt와 source version 연결
- 그 전에는 source, 마지막 검토일, Item 수, artifact 종류 같은 검증 가능한 신뢰 신호를 사용한다.

## 7. Flow 찾기 카드 계약

### 필수 anatomy

1. category 또는 user job
2. title
3. 한 줄 결과
4. 별도 source 외부 링크
5. `12개 · Calendar 중심` 같은 실제 범위
6. 대표 Item 1~2개
7. 전체 card/detail action `더보기` 또는 chevron

### 제거·축소

- 번호가 붙은 1·2·3 목록
- `Flow 열기` 중복 label
- 입력·결과·카테고리 chip 동시 나열
- 근거 없는 사용 수·후기 수

현재 `FlowDiscoveryCard`는 card 전체가 하나의 Link이므로 내부 source 링크를 중첩할 수 없다. P31-02에서는 card container와 detail/source action을 분리하거나 semantic overlay link 패턴으로 재구성해야 한다.

## 8. 콘텐츠별 save-before 적용

### 이사

- primary: Calendar
- 필요한 값: 이사일
- preview: 계산된 일정 일부와 전체 범위
- secondary: checklist, memo 중 의미 있는 것만
- `D-30`, Item 수 등의 정보는 chip 나열이 아니라 결과 preview 안에서 읽히게 한다.

### 결혼

- 한 화면에 Calendar/Checklist/Memo 전체를 세로로 쌓지 않는다.
- 추천 primary를 먼저 선택한다.
- 다른 형식은 `다른 방식 2개`에서 연다.
- 사용자가 형식을 바꾸면 preview, 필요한 입력, CTA가 함께 바뀐다.
- Calendar: 결혼식 날짜와 계산된 date range, 예시 event, 제외 Item을 preview한다.
- Checklist: 날짜 없이 유지되는 구조를 preview한다.
- Memo: 실제로 별도 memo 가치가 있을 때만 노출한다.

### 운동/홈트

- resource 영상과 실행 Item을 분리한다.
- 기본 frame:
  - source/video
  - compact routine summary
  - 다음 3회
  - primary action 1개
- 반복 설정은 bottom sheet 또는 contained editor로 연다.
- 설정 전과 설정 후 artifact eligibility를 다르게 계산한다.
- 실행 상태는 공통 `완료 / 다시 열기`를 사용한다.
- 운동만의 별도 “오늘 결과” 상태 UI는 기본 실행 문법을 대체하지 않는다.
- Memo는 기록이 생긴 뒤 secondary 결과로 승격한다.

## 9. My Flow 계약

### 모바일 기본 구조

```text
지금 | Flow 목록 | 완료

Flow 목록
-> compact Flow row
-> dedicated Flow workspace
   실행 | 전체 계획 | 기록
-> Item bottom sheet/full-screen detail
```

### workspace header

- 뒤로
- Flow title
- progress
- overflow

### default 노출

- next action
- 가까운 일정
- completion/reopen
- 전체 계획 진입

### contextual 노출

- 제목·기준일·Item 조정
- 가져가기/export
- 재사용
- 보관
- source

### lifecycle 동사

| 상태 축 | 사용자 동사 |
| --- | --- |
| 실행 | `완료 / 다시 열기` |
| 일정 | `날짜 정하기 / 날짜 없애기` |
| source-backed 구성 | `Flow에서 제외 / 다시 포함` |
| 개인 draft 구조 | `항목 삭제 / 항목 복구` |
| 자료 | `자료 숨기기 / 다시 보이기` |
| Flow lifecycle | `보관 / 복구 / 이 기기에서 영구 삭제` |

### archive/restore

- active Flow workspace overflow에 `보관`
- 보관 직후 undo
- 보관 목록 row에 직접 `복구`
- `archive -> reload -> archived filter -> restore`가 390/1024에서 동일

### permanent delete

- 보관된 Flow의 danger zone에서만 제공
- source-backed Flow는 공개 원본/source를 삭제하지 않음
- 개인 저장 관계, personal overlay, run, 회고, archive lifecycle key를 제거
- 개인 draft는 원문 draft와 개인 구조도 함께 삭제됨을 별도 문구로 표시
- 확인 dialog:
  - Flow title
  - 삭제되는 데이터
  - 보존되는 공개 source
  - 복구 불가
  - 취소
  - 필요 시 `백업 먼저 받기`

## 10. Calendar 계약

### 모바일

- month grid와 agenda를 기본 surface로 유지
- Item 선택 시 60% 높이 bottom sheet
- 필요하면 full-screen으로 확장
- sheet 내용:
  - Flow identity
  - Item title
  - date/time
  - completion/reopen
  - memo
  - advanced source/export/detail
- 닫을 때 selected date, agenda scroll, trigger focus 복원

### wide

- 기존 side inspector 유지 가능

### keyboard

- month grid에 roving tabindex 또는 동등한 grid pattern
- agenda로 건너뛰는 skip path
- unnamed focusable 0

### lifecycle 경계

Calendar에서 Flow 보관·삭제를 중복 제공하지 않는다. `Flow에서 열기`로 My Flow의 canonical lifecycle surface에 연결한다.

## 11. 데이터·기술 경계

### 변경 가능

- component extraction
- route-level composition
- transient UI state
- derived view model
- focus/overlay controller
- copy vocabulary
- responsive layout

### 변경 금지 또는 별도 승인 필요

- source content 직접 수정
- personal overlay/run/occurrence 합치기
- export identity 변경
- 4탭 즉시 변경
- destructive migration

`AppClient.tsx`의 결합도가 UI 분리를 막으면 큰 component extraction을 허용한다. 단, 먼저 기존 projection과 persistence function을 그대로 소비하는 adapter를 만들고 no-diff test를 통과해야 한다.

## 12. 비범위

- 실제 review/usage telemetry backend
- account, DB, cloud sync
- AI API, crawler
- OAuth/direct Calendar sync
- creator marketplace
- public source 삭제
- full planner
- 새로운 export format
- 실제 사용자 관찰을 자동화로 대체
