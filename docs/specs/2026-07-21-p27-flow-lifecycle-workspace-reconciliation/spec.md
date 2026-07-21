# P27 Flow Lifecycle Workspace Reconciliation Spec

상태: `implementation_complete_internal_evidence`

작성일: 2026-07-21

시작 source 기준: `origin/main` `63ea641`

구현 기준: `118dec9` + [P27 final package](../../content-audit/2026-07-21-p27-lifecycle-workspace-final/README.md)

관련 종합 근거: [P27 사용자 피드백 종합 판단](../../content-audit/2026-07-21-p27-user-feedback-synthesis/README.md)

## 1. 목표

FlowMe에서 같은 Flow가 저장 전과 저장 후에 서로 다른 제품처럼 보이는 문제를 해결한다. 사용자는 다음 여정을 별도 매뉴얼 없이 이어갈 수 있어야 한다.

`발견 -> 전체 결과 확인 -> 필요한 부분 조정 -> 저장/가져가기 -> 전체 Flow 확인 -> 지금 실행 -> Calendar/외부 도구 활용 -> 완료/재개 -> 보관/복구`

이번 프로그램은 새로운 planner 기능을 늘리는 작업이 아니다. 이미 확보한 콘텐츠를 이해하고 최소한으로 개인화한 뒤, 실행과 외부 활용으로 자연스럽게 옮기는 **portable execution layer**를 명확하게 만드는 작업이다.

## 2. 해결할 사용자 문제

### U1. 복구 가능한 제거

- 저장한 Flow를 목록에서 치우고 싶다.
- 실수로 치웠다면 바로 되돌리고 나중에도 복구하고 싶다.
- 원본 Flow의 일부 항목만 내 사본에서 빼고 싶다.
- 완료, 제외, 보관, 영구 삭제가 서로 다른 의미여야 한다.

### U2. 반복 Flow의 기간과 회차 이해

- 홈트가 실제 4주 프로그램인지, 4주만 미리 보여주는 것인지 알고 싶다.
- 반복 시작일, 요일, 시간, 종료 조건을 이해하고 조정하고 싶다.
- Calendar에서는 이번 회차를 빠르게 보고, 전체 series 설정은 별도로 찾고 싶다.

### U3. 저장 전 조정

- 저장할 전체 Flow를 먼저 보고 제대로 가져오는지 확인하고 싶다.
- 항목 제목, 날짜, 포함 여부, 순서, 자료를 필요한 만큼만 조정하고 싶다.
- 조정 UI가 편집 control 목록이 아니라 현재 작업 하나에 집중했으면 좋겠다.

### U4. 저장한 Flow 찾기와 이해

- 오늘 할 일과 저장한 Flow 전체를 구분하고 싶다.
- Flow가 적을 때 검색 UI를 먼저 배우고 싶지 않다.
- Flow가 많아지면 제목, 상태, 다음 일정으로 빠르게 찾고 싶다.
- 저장 직후와 며칠 뒤 다시 열었을 때 같은 화면 문법을 기대한다.

### U5. 할 일, 확인 항목, 자료 편집

- 영상/URL은 완료 체크 대상이 아니라 실행에 필요한 자료로 보고 싶다.
- 확인 항목은 완료 기준을 돕는 작은 체크로 이해하고 쉽게 수정하고 싶다.
- source-backed 원본은 보존하면서 내 사본에만 수정하고 싶다.

## 3. 비목표

- 계정, DB, cloud sync
- 외부 Calendar/Todo/Notion OAuth
- 실제 AI API 또는 crawler
- rich-text 문서 편집기
- 임의 깊이의 nested hierarchy
- Studio를 5번째 핵심 탭으로 승격
- 4탭 IA 변경
- source-backed 원본 덮어쓰기
- P26 identity/projection 계약 재작성
- 모든 문제를 Input Composer 하나로 해결

## 4. 유지할 기존 계약

### 4.1 Source

- canonical title, detail, source URL, published schedule, source order를 소유한다.
- 개인 제거·수정으로 source 자체를 삭제하거나 덮어쓰지 않는다.

### 4.2 Personal overlay

- Flow alias, anchor date, Item title/date/memo override를 소유한다.
- user-created Item, personal tombstone/exclusion, personal order를 소유한다.
- 새 nested confirmation/resource overlay는 additive 계약으로만 추가한다.

### 4.3 Execution run

- pending, done, reopened, skipped, held와 occurrence 실행 기록을 소유한다.
- Flow archive나 Item tombstone을 완료 상태로 표현하지 않는다.

### 4.4 Recurrence occurrence

- series, revision, occurrence identity를 유지한다.
- 화면에 보이는 preview range를 recurrence 종료 조건으로 사용하지 않는다.

### 4.5 Export

- Flow/selected/item scope plan과 output receipt를 유지한다.
- UI에서 count를 다시 계산하지 않고 기존 projection/plan을 소비한다.

## 5. 목표 정보 구조

## 5.1 저장 전 Flow setup workspace

기본 상태는 editor가 아니라 **읽을 수 있는 전체 Flow preview**다.

### 기본 노출

- Flow 제목과 출처/제작자 범위
- 가장 자연스러운 결과물 1개
- 전체 단계와 핵심 항목
- 날짜·반복 결과 요약
- 실행 자료 수
- 저장될 항목/event 수
- primary action 1개

### 조정 진입 후 노출

`조정`을 누르면 operation picker를 연다.

- 일정 조정
- 항목 포함/제외
- 항목 내용 조정
- 순서 조정
- 자료 확인

동시에 한 operation만 활성화한다. batch 선택은 operation을 고른 뒤에만 시작한다.

### 저장 surface

- sticky primary 1개만 둔다.
- CTA에는 결과와 다음 상태를 쓴다.
- 예: `내 Flow에 12개 할 일 저장`, `Calendar 일정 9개 확인`.
- 본문 중간에 같은 저장 CTA를 반복하지 않는다.

## 5.2 My Flow

### `지금`

- 오늘/기한 지난/다음 occurrence를 날짜별로 묶는다.
- 같은 날짜의 여러 Flow는 날짜 group 아래 Flow marker로 구분한다.
- 각 실행 row는 완료 체크, 제목, 시간/Flow, `열기`만 기본 노출한다.
- series 설정, export, 삭제는 row 기본 control이 아니다.

### `Flow`

- 저장한 Flow 전체를 `진행 중`, `최근 사용`, `보관됨`으로 찾는다.
- 1~4개 fixture에서는 검색 입력을 기본 노출하지 않는다.
- 5개 이상 또는 사용자가 `찾기`를 누른 경우 검색과 filter를 연다.
- 검색 기준은 제목, category, 다음 날짜, 상태다.
- 검색 threshold는 prototype gate에서 확정한다.

### Flow detail

- 저장 전 preview와 같은 header/outline/resource anatomy를 쓴다.
- 저장 직후에는 상단에 compact receipt band만 추가한다.
- 첫 실행 항목을 강조하되 전체 Flow를 가리지 않는다.
- `조정`, `가져가기`, `보관하기`는 secondary command menu 또는 명확한 별도 영역에 둔다.

## 5.3 Calendar

- 월간 grid는 marker와 compact summary만 담당한다.
- selected-day agenda는 전체 제목, 시간, Flow, 완료를 담당한다.
- 날짜 없는 항목은 `일정 배치` queue에서만 다루고 월간 cell에 억지로 넣지 않는다.
- routine mobile은 7열에 긴 제목을 밀어 넣지 않는다. 주간 strip 또는 agenda로 우선 표현한다.
- Flow filter는 grid, agenda, undated queue에 같은 scope를 적용한다.

## 6. 제거·복구 계약

## 6.1 Flow

| 행동 | 결과 | 기록 보존 | 복구 |
| --- | --- | --- | --- |
| 보관하기 | 기본 My Flow와 지금에서 숨김 | overlay/run/history/receipt 보존 | 보관됨에서 복구 |
| 즉시 되돌리기 | 방금 보관한 Flow 복귀 | 모두 보존 | snackbar/action |
| 영구 삭제 | local personal data 제거 | 정책에 따라 export receipt/history 별도 안내 | 기본 UI 비노출, data manager에서만 |

기존 `clearFlowLocalProgress()`를 `보관하기` CTA에 직접 연결하지 않는다.

## 6.2 Item

| Item 소유권 | 기본 제거 문구 | 저장 방식 | 복구 |
| --- | --- | --- | --- |
| source-backed | 내 Flow에서 빼기 | personal tombstone/exclusion | 뺀 할 일에서 복구 |
| user-created | 할 일 삭제 | personal tombstone | 삭제한 할 일에서 복구 |
| occurrence | 이번 회차 건너뛰기 | execution occurrence state | 회차 다시 열기 |

완료/미완료, 건너뜀, 개인 제외, Flow 보관, 영구 삭제는 서로 대체하지 않는다.

## 7. 반복 범위 계약

### 7.1 네 가지 별도 값

1. `series start`: 반복 시작일
2. `recurrence rule`: 요일/빈도/시간
3. `series end`: 없음, count, until, source-defined program length
4. `visible preview range`: 화면에 지금 펼쳐 보여주는 bounded range

### 7.2 4주 판정

- source가 4주 프로그램이라고 명시: `4주 프로그램`, occurrence count/end 저장.
- 사용자가 4주를 선택: personal recurrence end로 저장.
- 일반 주간 반복: series end 없음, 화면에는 `앞으로 4주 미리보기`로만 표시.
- provenance가 불명확: 저장 전 4주 종료로 확정하지 않고 review 필요 상태로 둔다.

### 7.3 수정 범위

- 이번 회차
- 이번 회차부터
- 전체 series

기존 occurrence history가 있으면 과거 기록을 보존하고 새 revision을 만든다.

## 8. Item anatomy와 편집

### 8.1 할 일

- action title
- schedule/recurrence
- completion criteria
- personal memo

### 8.2 확인 항목

- 짧고 binary한 확인 문장
- Item detail 안에서만 progress 표시
- personal overlay로 추가/제외/제목 수정/순서 변경 가능
- source subcheck는 원본 보존

### 8.3 실행 자료

- video, URL, document, phone/reference
- `열기`, `보기`, `전화` 등 resource action을 가진다.
- 완료 체크박스를 갖지 않는다.
- source resource와 personal resource를 구분한다.
- 사용자가 링크를 추가·제거해도 source link는 덮어쓰지 않는다.

### 8.4 contextual edit

- row의 `수정`은 compact sheet/drawer를 연다.
- 제목/날짜/메모를 먼저 보여준다.
- 확인 항목과 자료는 별도 disclosure다.
- 구조 변경·batch·export control을 같은 sheet에 모두 펼치지 않는다.

## 9. Input Composer의 위치

Input Composer v1.1은 `/flows`의 입력·감지·source recovery에 유효하다. 그러나 이번 사용자 피드백의 핵심인 저장 전 조정과 My Flow 이해를 단독으로 해결하지 못한다.

따라서 다음 순서를 지킨다.

1. P27-R00A에서 setup workspace와 My Flow prototype을 승인한다.
2. P27-R03A에서 composer의 useful preview를 setup workspace에 연결한다.
3. moving, conditional washer, source-import-required 3개 사례로 production vertical slice를 검증한다.
4. 실제 AI/crawler 없이 기존 lookup과 verified source만 사용한다.

## 10. 화면 원칙

- 설명 문단 대신 hierarchy, label, state, count, disclosure로 의미를 전달한다.
- 첫 화면 primary action은 1개 이하다.
- 기본 상태에서 destructive control을 노출하지 않는다.
- icon button은 익숙한 icon과 tooltip/accessibility name을 사용한다.
- 카드 안에 카드를 중첩하지 않는다.
- 모바일 first viewport에는 Flow 정체성, 실제 항목 일부, 다음 행동이 함께 보인다.
- wide는 mobile을 늘린 화면이 아니라 목록/상세 또는 preview/조정의 작업 구성을 사용한다.
- text truncation만으로 Item identity를 잃지 않는다.

## 11. 데이터·migration 원칙

- 새 Flow archive record는 additive version으로 추가한다.
- legacy saved progress는 active로 읽는다.
- malformed archive/overlay가 source Item이나 run history를 삭제하지 못하게 한다.
- nested confirmation/resource overlay를 추가할 경우 stable parent Item ID를 사용한다.
- resource/subcheck ID 충돌 시 source를 보존하고 personal record를 quarantine 또는 warning 처리한다.
- preview range는 recurrence rule에 migration하지 않는다.

## 12. 성공 기준

### 사용자 행동

- 저장 전 전체 Flow를 확인하고 2 tap 이내에 조정 시작.
- Flow 보관 후 즉시 undo 및 새로고침 뒤 복구 가능.
- 홈트 화면에서 program end와 preview range를 구분 가능.
- My Flow 1/3/5/12개 fixture에서 현재 할 일과 Flow 전체를 구분 가능.
- 영상 링크가 completion checkbox 없이 resource로 보임.
- 확인 항목을 source mutation 없이 개인 수정 가능.

### 정합성

- source mutation 0.
- archive/tombstone으로 execution history loss 0.
- recurrence preview horizon이 series end로 저장되는 건수 0.
- 동일 stable Item/occurrence identity가 My Flow, Calendar, export에서 유지.
- post-save outline count와 returning My Flow outline count 일치.

### 화면·접근성

- 390x844, 1024x768 horizontal overflow 0.
- fixed/sticky overlap 0.
- unnamed visible control 0.
- nested interactive 0.
- delete/archive/restore/reorder keyboard parity.
- `/flows` server document에 meaningful shell/entry가 존재.

## 13. 실제 관찰 전 제한

P27-R은 자동화와 stakeholder review로 구조적 결함을 줄이는 단계다. 다음 가설은 실제 사용자 관찰 전 확정하지 않는다.

- search threshold
- `보관`과 `삭제` 문구 선호
- setup workspace에서 가장 먼저 조정하는 operation
- resource와 확인 항목을 찾는 위치
- recurrence preview 기본 기간
