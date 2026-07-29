# Flow Canonical Structure 기획 Handoff v1

**작성일:** 2026-07-28  
**대상:** FlowMe 제품 기획, URL-to-Flow backend, 실행 UX, export 담당  
**상태:** 구조·데이터 계약 handoff / 앱 구현 전  
**한계:** 공개 심사, 실제 사용자 검증, 외부 Calendar 왕복 검증은 포함하지 않음

## 0. 결론부터

기본 구조는 바꾸지 않는다.

```text
원문 Source
  └─ Source document / snapshot
       └─ SourceRow  ── 근거
            ↓ N:M
          Item       ── 독립 완료·결정·기록·회차 상태
            ↓
          Step       ── 기간·주차·단계·행 묶음
            ↓
          Flow       ── 사용자 일 1개 + 주 원문 1개
            ↓
          Bundle / Flow Map ── 독립 Flow의 묶음·변형
            ↓
          Projection ── Calendar / Checklist / Todo / Sheet / Memo
```

이번 확장 corpus에서 backend에 새로 꼭 필요한 것은 “더 큰 canonical
계층”이 아니라 다음 두 **conversion-audit sidecar**다.

1. 모든 SourceRow가 Item·Field·Memo·생략 중 어디로 갔는지 기록
2. Item의 제목·완료 기준·일정·조건 등이 각각 어떤 SourceRow에서
   나왔는지 property 단위로 기록

즉, `Item` 중심 구조는 유지한다. 다만 생성 과정의 근거와 손실을
backend가 재검토할 수 있게 해야 한다.

### 이번 handoff를 지지하는 실제 구조 corpus

```text
완전 변환 fixture 42개
Bundle / Flow Map 42개
Flow 55개
Step 225개
SourceRow 484개
Item 406개
Field 246개
Memo 19개

일정 Item 144개
날짜 없는 Item 262개
구조 경계 control 4개 (완전 변환 수치에서 제외)
```

42개는 기존 Qualified v2 8개를 덮어쓴 수치가 아니다. 동결된 baseline,
기존 gold source contract, 중복을 제거한 deep set, value-qualified gold,
이번에 원문을 다시 연 live packet을 동일한 계약으로 합친 결과다.
이 수치는 공개 허가나 실제 사용자 효용을 뜻하지 않는다.

## 1. Flow 콘텐츠는 무엇인가

Flow 콘텐츠는 “ICS 여러 개”도, “체크리스트 문서”도 아니다.

> 원문에서 가져온 실행·결정·기록·자료 사용 항목을 사용자가 독립적으로
> 상태 관리하고, 필요한 도구 형태로 옮길 수 있게 만든 버전형 콘텐츠

한 Item의 기본 모습은 다음과 같다.

```text
해야 할 것
상세 설명
완료 기준

+ 필요한 경우에만
  일정 / 날짜창 / 반복
  장소
  기록 Field
  조건·의존성
  SourceRef와 주의 Memo
```

Calendar 일정이 없어도 Item은 유효하다. 반대로 날짜가 있다는 이유만으로
설명이나 체크 문장을 VEVENT 안의 “하위 ICS”로 만들지 않는다.

## 2. 실제 사례로 보는 데이터 차이

### 사례 A. 생활코딩 WEB1

```text
원문 강의 목차 26행
→ SourceRow 26개
→ 날짜 없는 진도 Item 26개
→ Step에서 강의 순서 유지
→ Sheet 또는 Checklist
→ VEVENT 0개
```

사용자는 원문에서 이미 가져온 강의명과 순서를 다시 입력하지 않는다.
나중에 “이번 주부터 시작”을 선택하면 개인 overlay에 일정만 추가한다.
원본 Item과 목차는 바뀌지 않는다.

### 사례 B. 이사 D-30

```text
원문 체크행 52개
→ 함께 끝내는 행은 27개 Item으로 묶음
→ D-30 / D-10 / D-3 / D-1 / 당일 Step
→ 사용자가 이사일 1개 입력
→ Item의 anchor_offset 일정 계산
→ Calendar + Checklist
```

같은 D-10에 여러 Item이 있어도 완료 상태는 각각 Item에 남는다. Calendar는
기본적으로 Item별 일정을 만들고, 사용자가 compact 표시를 원하며 모든
일정이 정확히 같을 때만 Step bundle로 보여줄 수 있다.

### 사례 C. 신차 구매 비교

```text
원문 확인·비교 행 29개
→ 독립 결정 단위 14개 Item
→ 날짜 없음
→ 결정/확인 Checklist + 비교 Sheet
→ 실제 재검토일을 사용자가 넣기 전에는 Calendar 없음
```

“결정”은 체크박스 한 개로 뭉개지 않는다. 선택지가 결과라면
`intent=decide`, `completion.mode=decision`을 쓴다.

### 사례 D. Dyson 필터 월간 관리

```text
원문에 있는 최소 월 1회 규칙 + 세척 절차 5행
→ canonical Item + structured recurrence
→ 회차별 (itemId, occurrenceKey)
→ Calendar 반복 일정 또는 제한된 개별 일정
→ 완료는 회차마다 별도 기록
```

반복할 때 canonical Item을 매번 복제하지 않는다. 콘텐츠 정의와 사용자의
실행 기록을 분리한다.

### 사례 E. Jotform 공개 입력 템플릿

```text
원문 입력 Field 11행
→ SourceRow 11개
→ Field 11개
→ Item 0개
→ Sheet의 field definition 11행
```

입력 칸만 있는 원문을 “폼 작성하기”라는 합성 할 일로 바꾸지 않는다.
이 fixture의 상태는 `structure_only_no_items`이며 실행 가능한 Flow가
아니다. Item은 여전히 최소 실행 단위이고, Item이 없는 구조 템플릿은
Field 계약과 projection을 검증하는 별도 예외다.

## 3. 계층별 소유권

| 계층 | 소유하는 것 | 소유하지 않는 것 |
|---|---|---|
| Source/Snapshot | URL, 문서 버전, hash, 관찰 시점 | 사용자 완료 |
| SourceRow | 최소 원문 사실·행·locator | 실행 상태 |
| Item | 완료·결정·기록·보류·회차 상태 | 원문 문서 버전 |
| Step | 기간·주차·단계·row group | 완료 상태 |
| Flow | 사용자 일 1개, 주 원문 1개, 기본 결과물 | 여러 출처를 섞은 종합 지식 |
| Bundle/Map | 관련 Flow·variant·단계 묶음 | child Item 상태 |
| User copy | 개인 제목·포함 여부·일정·메모 | published source fact |
| Execution run | 완료·skip·hold·결정값·기록값 | published Item 정의 |
| Projection | 외부 도구용 표현 | canonical 원본 |
| Review sidecar | 구조·출처·향후 공개 검토 상태 | 사용자 export |

## 4. SourceRow를 Item으로 만드는 규칙

### 4.1 네 가지 정상 관계

| 관계 | 언제 쓰나 | 예 |
|---|---|---|
| 1행 → 1 Item | 행 하나가 독립 완료 단위 | 강의 1개, 체크행 1개 |
| 여러 행 → 1 Item | 여러 사실이 한 행동을 설명 | 재료 여러 행 → 요리 한 번 |
| 1행 → 여러 Item | 한 행에 독립 행동이 명시 | “예약하고 서류 제출”처럼 각각 완료 가능 |
| 여러 행 → 여러 Item | 행 그룹과 행동이 N:M | 비교 기준 여러 개가 여러 결정 Item 지원 |

한 행을 여러 Item으로 나누는 것은 문장 안에 실제 독립 행동이 있을 때만
허용한다. “더 자세해 보이게” 쪼개지 않는다.

### 4.2 Item이 아닌 것

- 날짜·점수·수량처럼 입력/정렬/기록에 필요한 값 → **Field**
- 방법, 링크, 재료, 예외, 제작자 경험, 주의 → **Memo**
- 현재 사용자 일 밖의 행, 중복 행, 불완전 조각 → **omitted + reason**

모든 SourceRow는 네 결과 중 하나로 설명되어야 한다.

### 4.3 근거는 Item 전체가 아니라 property까지

다음 Item은 불합격이다.

```text
제목은 원문에서 왔지만
날짜와 완료 기준은 모델이 일반 지식으로 붙인 Item
```

따라서 backend는 최소한 다음을 별도로 추적한다.

```json
{
  "targetEntityId": "item-123",
  "targetPath": "completion.doneWhen",
  "sourceRowIds": ["row-7", "row-8"],
  "supportLevel": "direct",
  "transformation": "merge",
  "reason": "두 원문 확인행을 한 번의 완료 판단으로 묶음"
}
```

이 기록은 생성·수정 QA용 sidecar다. 사용자에게 전체 audit를 보여주거나
Calendar 설명에 넣지 않는다.

## 5. Item의 최소 계약

### 필수

- `itemId`
- `stepId`
- `title`
- `intent`
- `completion`
- `order`
- `sourceRefIds`

### 선택

- `description`
- `schedule`
- `fieldIds`
- `memoIds`
- `cautionMemoIds`

### 이번 corpus에서 sidecar로만 연구

- `optional`
- `conditions`
- `dependencies`
- `location`
- `sharedContextBindings`

이 다섯 항목은 원문에 명시된 경우만 보존한다. 아직 canonical v1의 새
필수 필드로 올리지 않는다. 세 콘텐츠 이상에서 같은 필요가 반복되고
Flow setup Field나 Memo로 해결되지 않을 때 승격을 검토한다.

## 6. intent와 completion을 섞지 않는다

| 사용자의 목적 | intent | 완료 방법 예 |
|---|---|---|
| 실행 | `act` | `check` |
| 확인 | `inspect` | `check` 또는 `record` |
| 선택 | `decide` | `decision` |
| 값 남기기 | `record` | `record` |
| 강의·영상·자료 사용 | `use_resource` | `check` 또는 `record` |

`consume`을 새 completion enum으로 만들지 않는다. 강의 시청은
`use_resource`이고, “시청 완료”면 check, 진도/점수를 남겨야 하면
record다.

`held`는 개인 실행 상태다. 콘텐츠 변환의 `hold`나 source 부족 상태와
같은 필드로 쓰지 않는다.

## 7. 일정·반복·회차 계약

### 7.1 실제 schedule

| 원문/사용자 값 | canonical 처리 | Calendar |
|---|---|---|
| 일정 없음 | `schedule` 없음 | 만들지 않음 |
| 고정 날짜 | `absolute` | 가능 |
| 신청 가능 기간 | `date_window` | 기간 정보 + 최대 1개 reminder |
| D-30 | `anchor_offset` | 기준일 입력 후 가능 |
| 반복 주기 | schedule의 structured recurrence | 가능 |
| “1주차”, “3회차”만 있음 | 순서/Step/Field | 기준일 없으면 만들지 않음 |
| 조건 충족 후 N일 | condition sidecar | 조건이 실제 해소되기 전에는 만들지 않음 |

날짜창은 기간 내 매일 할 일을 생성하지 않는다.

### 7.2 occurrence

반복 Item의 실행 상태 키:

```text
copyId + runId + itemId + occurrenceKey
```

비반복 Item은 `once`, 날짜창 reminder는 `window-reminder`, 반복 일정은
현지 날짜/시간과 timezone을 반영한 키를 쓴다. exact UID 문자열·hash와
기존 ICS UID migration은 backend 구현 때 확정한다.

원칙은 이미 확정됐다.

- 제목을 UID로 쓰지 않는다.
- 지난 회차 상태는 반복 규칙 변경 후에도 보존한다.
- 하나의 canonical Item에 여러 회차 상태가 붙는다.
- Calendar는 FlowMe 회차 완료의 소유자가 아니다.

## 8. Projection 선택

다음 질문 하나로 primary artifact를 정한다.

> 이 결과물을 빼면 사용자의 일이 실패하는가?

| 실패 이유 | primary |
|---|---|
| 날짜를 놓치면 실패 | Calendar |
| 빠뜨리지 않고 한 묶음을 끝내야 함 | Checklist |
| 다음 행동·자료를 계속 꺼내야 함 | Todo |
| 행·상태·비교·진도를 보존해야 함 | Sheet |
| 방법·기준·맥락을 보존해야 함 | Memo |

신규 데이터에 `hybrid`를 쓰지 않는다. 나머지는
`secondaryArtifacts`에 둔다.

### Calendar 정책

- 기본: `per_item`
- 모든 child Item이 같은 실제 schedule과 한 user moment를 가질 때:
  `step_bundle` 선택 가능
- 일정이 없을 때: `none`

Step bundle에도 child Item ID를 모두 넣는다. 묶인 VEVENT가 각 child의
완료를 왕복 보존한다고 주장하지 않는다.

### VTODO

현재 `lib/flow/export.ts`는 VEVENT만 만든다. 실제 Calendar client의
VTODO·RELATED-TO·X-property 왕복은 검증하지 않았다.

따라서:

```text
destination capability 확인 전
VTODO 기본 OFF
→ Checklist / Todo / Sheet / Memo fallback
```

## 9. 사용자에게 묻는 값

backend 응답은 다음 다섯 묶음으로 입력을 반환해야 한다.

```text
requiredBeforeStart
optionalBeforeStart
autoFilledFromSource
capturedDuringRun
neverAskAgain
```

예:

- 이사: `이사일` 1개만 필수
- WEB1: 시작 전 필수 입력 0개
- 비교표: 후보 이름은 사용자 값, 원문 비교 기준은 자동 입력
- 공식 날짜창: 원문 날짜를 다시 묻지 않음
- 강의 진도: 완료/점수/메모는 실행 중 입력

source URL, 강의 제목, 공식 날짜, 원문 반복 주기처럼 이미 확보한 값은
입력 폼에 올리지 않는다.

## 10. canonical과 conversion audit를 분리한 backend 응답

권장 응답 골격:

```json
{
  "decision": {
    "state": "ready_for_structure_handoff",
    "reason": "원문 행과 실행 단위가 확보됨"
  },
  "sourceEvidence": {
    "source": {},
    "sources": [],
    "sourceSnapshots": [],
    "sourceRows": [],
    "sourceRefs": []
  },
  "canonicalContent": {
    "schemaVersion": "flowme-canonical-flow-v1",
    "contentId": "...",
    "version": "...",
    "contentHash": "sha256:...",
    "bundle": {},
    "flows": [],
    "steps": [],
    "items": [],
    "fields": [],
    "memos": []
  },
  "conversionAudit": {
    "rowAccounting": [],
    "itemProvenanceClaims": [],
    "relationTypes": [],
    "canonicalExtensionCandidates": [],
    "occurrenceIdentityExamples": []
  },
  "inputContract": {
    "required": [],
    "optional": [],
    "duringExecution": [],
    "autoFilled": [],
    "neverAskAgain": []
  },
  "projectionPlan": {
    "primaryArtifact": "sheet",
    "secondaryArtifacts": ["checklist"],
    "calendarPolicy": "none",
    "calendar": {},
    "vtodo": {},
    "checklist": {},
    "todo": {},
    "sheet": {},
    "memo": {},
    "forbidden": [],
    "lossNotes": []
  },
  "structureReview": {
    "researchUseStatus": "research_only",
    "reviewFlags": [],
    "publicReadiness": "not_assessed",
    "claimBoundary": "..."
  }
}
```

`canonicalContent`는 읽기·실행의 원본이고, `conversionAudit`는 생성 근거와
손실을 재검토하는 문서다. 공개/권리/안전 scorecard는 이 응답의 구조
성공 여부와 별도다.

실제 15개 이상 사례의 DTO는
`representative-backend-dto-v1.json`을 단일 근거로 사용한다.

## 11. Discovery부터 Personal Run까지

| 단계 | 입력 | 출력 | 통과 조건 | 주 책임 | runtime 현황 |
|---|---|---|---|---|---|
| Discovery | URL·후보 metadata | candidate | 구체 URL·사용자 일 후보 | 콘텐츠 운영 | 일부 자료만 존재 |
| Admission | candidate·가치/구조 근거 | acquire / reject / park | 원문 대비 실행 가치 | 기획·운영 | 앱 계약 없음 |
| Source acquisition | 원문 | source/snapshot/rows | 필요한 행 확보 | 수집 backend·운영 | 없음 |
| Canonical conversion | SourceRows | proposal + audit sidecar | 발명 0, provenance 완전 | 변환 backend | 없음 |
| Structure review | proposal | accepted/revise/boundary | schema·규칙 통과 | 기획·편집 | 없음 |
| Personal run | published version | copy + run + occurrence | 사용자 setup 저장 | 사용자·runtime | 부분 지원 |
| Projection/export | effective state | ICS/text/sheet/memo + loss | 대상별 규칙 통과 | export backend/runtime | 부분 지원 |
| Promotion review | accepted content + 별도 근거 | public decision | 권리·안전·locale 등 | 운영·전문 검토 | 이번 목표 미수행 |

`logic readiness`, `public readiness`, `rights status`는 canonical 구조
상태와 합치지 않는다.

## 12. 현재 runtime과의 차이

`runtime-crosswalk-v1.json`은 56개 field/기능 mapping을 기록한다.

| 판정 | 수 | 의미 |
|---|---:|---|
| direct | 9 | 현재 값의 의미를 거의 그대로 사용 |
| automatic_adapter | 11 | 근거가 있을 때 자동 변환 가능 |
| lossy_adapter | 10 | 제안은 가능하지만 의미·근거 손실 |
| new_backend_field | 18 | 새 backend 저장 계약 필요 |
| human_decision | 4 | 원문·사용자 일 판정 필요 |
| not_implemented | 4 | 계약만 있고 이번 목표에서 구현 안 함 |

가장 큰 누락:

- SourceSnapshot·SourceRow·SourceRef
- property-level provenance와 row accounting
- generic Field/Memo
- decision/record completion
- recurrence occurrence identity
- creator version / user overlay / run 분리
- projection request/result와 loss manifest
- VTODO capability·fallback
- Map과 cross-Flow shared context

현재 `buildText`, `buildIcsCalendar`, `buildCalendarIcs`,
`buildWorkbookSheets`는 버리지 않는다. canonical effective state를 현재
`FlowBundle` 형식에 투영하는 adapter 뒤에서 비교 사용한다.

## 13. 기획 결정 상태

전체 기계 판정은 `planning-decision-register-v1.json`에 있다.

### 확정

- canonical 계층과 Item 최소 단위
- SourceRow N:M mapping과 omission
- property provenance sidecar
- Item/Field/Memo 경계
- intent 5개, completion 3개
- 일정 없는 VEVENT 금지
- 한 primary artifact + secondary
- creator/user/run/review 분리
- occurrence state
- VTODO 기본 OFF와 fallback

### 설정 가능

- Calendar per-item / Step bundle
- RRULE master / 개별 occurrence export
- 날짜창 reminder
- Step 묶음 기준
- export detail·source·caution 포함 수준
- Sheet column
- 입력 문구·기본값
- Memo 문서 단위

### 아직 열림

- first-class SharedContext
- optional/condition/dependency canonical 승격
- condition-triggered schedule 식
- 사용자 추가 private Item
- property provenance를 core에 넣을지 sidecar로 유지할지
- Calendar client별 실제 VTODO/RELATED-TO
- legacy ICS UID migration
- 실제 사용자의 기본 projection·묶음 선호

### 이번 corpus가 아직 충분히 못 닫은 구조

- `single_action` 원문은 완전 변환 fixture가 0개다. 단일 행동을 억지로
  여러 Item으로 늘리지 않는 규칙은 있으나 독립 사례 보강이 필요하다.
- 완전 변환 corpus 안의 SourceRow omission은 0개이고, omission 통제는
  boundary fixture에서만 확인했다. 일부 행만 안전하게 생략하는 정상
  콘텐츠 사례가 더 필요하다.
- 조건 충족 시에만 날짜가 생기는 due-date 식은 first-class schedule
  계약으로 확정하지 않았다.
- 장소를 공통 context로 두는 구조는 독립 사례가 부족하다.
- yearly, business-day, 예외일을 포함한 고급 반복은 아직 열려 있다.

이 항목은 현재 계층을 폐기할 이유가 아니라, 다음 corpus에서
`SharedContext`, 조건 일정, 위치, 고급 recurrence를 집중 검증해야 한다는
의미다.

## 14. backend 구현 순서

### 1단계 — 생성 계약

- source/snapshot/row 저장
- canonical proposal 저장
- row accounting / property provenance sidecar 저장
- schema·enum·reference validator

### 2단계 — read-only adapter

- canonical → 현재 FlowBundle
- 기존 text/ICS/workbook 결과와 비교
- projection loss manifest 계산
- 앱 UI는 아직 변경하지 않음

### 3단계 — 개인 실행

- UserFlowCopy
- ExecutionRun
- occurrence state
- source update와 개인 수정의 version resolution

### 4단계 — projection API

- target capability
- effective-state resolver
- Calendar/Checklist/Todo/Sheet/Memo
- step_bundle·VTODO fallback

### 5단계 — 외부 검증

- Google/Outlook/Apple 실제 import/edit/re-export
- VTODO·RELATED-TO·RRULE·UID 확인
- 관찰 사용자 open/setup/export/check/return/correction

## 15. 구현 시작 전에 받아야 할 기획 결정

backend v1을 시작하기 위해 open 항목을 모두 닫을 필요는 없다. 다음
기본값만 승인하면 된다.

1. property provenance는 우선 sidecar로 저장한다.
2. optional/condition/dependency/shared context는 sidecar 실험 필드로 둔다.
3. Calendar는 `per_item` 기본, `step_bundle`은 명시 조건에서만 허용한다.
4. VTODO는 기본 비활성화한다.
5. 사용자 추가 Item은 v1 backend 범위에서 제외한다.
6. public promotion gate는 canonical conversion API 뒤의 별도 workflow로 둔다.

## 16. 이번 handoff가 증명하지 않는 것

- 40개 이상 구조 fixture의 schema 일관성은 실제 사용자 효용이 아니다.
- source-backed 구조는 공개 재사용 허가가 아니다.
- 위험 콘텐츠의 원문 보존은 의학·법률 검증이 아니다.
- 로컬 ICS parser 성공은 Google·Outlook·Apple 왕복 성공이 아니다.
- PPT형 HTML의 이해 가능성은 관찰 사용자 검증이 아니다.

위 수치는 문서 작성 시점의 snapshot이다. 재생성 후 최종 수치는
`canonical-corpus-v1.json`의 계산값을 단일 근거로 사용한다.

## 관련 파일

- `conversion-rules-v1.md`
- `conversion-decision-tree-v1.json`
- `schedule-and-occurrence-contract-v1.json`
- `projection-contract-v1.json`
- `runtime-crosswalk-v1.json`
- `planning-decision-register-v1.json`
- `representative-backend-dto-v1.json`
- `canonical-corpus-v1.json`
- `source-row-item-mapping-v1.json`
- `validation-results-v1.json`
