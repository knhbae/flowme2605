# 데이터→UI Architecture Review

## 결론

일반 `/f/*` 3개 경로의 비반복 Item 행은 이미 한 canonical Item 투영으로 수렴했습니다. 다만 routine occurrence와 execution log는 snapshot 밖의 별도 runtime projection에서 조립됩니다. 문제는 이 경계 뒤의 **editor transaction, lifecycle router, export generator, legacy Flow Map adapter**가 더 분기돼 있다는 점입니다.

현재 구조를 유지하면서 고쳐야 할 우선순위는 다음과 같습니다.

1. `EffectiveFlowSnapshot`을 preview·save·My Flow·export의 공통 입력으로 유지합니다.
2. 공개·저장·Map editor의 transaction을 하나의 상태 기계로 묶습니다.
3. export generator를 public/saved별로 나누지 말고 같은 projection payload와 loss declaration을 사용합니다.
4. legacy Flow Map이 applied title/selection을 일반 projection adapter로 넘기게 합니다.

## 1. 현재 데이터 흐름

```text
Source / creator content
        ↓
FlowBundle
  Flow + FlowSection[] + FlowItem[] + FlowItemDetail[]
        ↓
 source snapshot + personal overlay + completion IDs/fingerprint
        ↓
 EffectiveFlowSnapshot
  identity + ordered base rows + eligibility + versions
        ├─ public preview / save / receipt
        ├─ My Flow selected plan
        └─ export projections

 routine definition + occurrence/log state
        ↓
 buildEffectiveRoutineProjection / expandSavedRoutineOccurrenceRows
        └─ Today / Calendar occurrence rows
```

| 층 | 현재 역할 | 코드 근거 |
|---|---|---|
| source | 원문에서 가져온 Flow·section·Item·detail | `lib/flow/types.ts:55-146,219-228` |
| personal | 제목·날짜·메모·포함·순서 등 사용자 overlay | `lib/flow/public-item-personalization.ts:53-154` |
| execution | snapshot은 완료 ID와 occurrence/log fingerprint를 보유. 실제 routine occurrence 행·상태는 별도 projection에서 조립 | `lib/flow/effective-flow-snapshot.ts:608-711`; `components/flow/AppClient.tsx:6483-6669` |
| projection | ordered row와 calendar/checklist/sheet/memo eligibility 계산 | `lib/flow/flow-experience-projection.ts:25-46,92-143,179-262` |
| presentation | public, My Flow, Today, Calendar, export | `components/flow/AppClient.tsx` |

`FlowSection`은 현재 UI에서 Step/group 역할을 하고 `FlowItem`이 독립 상태·투영 단위입니다. 개인화는 source row를 덮어쓰지 않고 overlay로 합성합니다. 따라서 “하나의 canonical projection” 판정은 base Item 행에는 맞지만 routine의 실제 회차·log까지 포함한다는 뜻은 아닙니다.

## 2. 일반 `/f` 경로

`app/f/[slug]/page.tsx:25-31,59-65`는 seed와 source-backed bundle을 합쳐 존재·색인 여부를 확인한 뒤 `slug`를 `PublicFlow`에 전달합니다. 실제 bundle은 `PublicFlow`가 다시 resolve합니다. 공개 화면은 다음을 구분합니다.

- 예시 일정: 사용자가 결과를 이해하기 위한 preview. 저장할 수 있는 개인 결과가 아님.
- working draft: 기준일, 이름, Item 포함/순서/제목·메모·날짜 조정.
- committed result: 저장·receipt·public export에 사용되는 적용 결과.

관련 분기는 `components/flow/AppClient.tsx:18577-18579,18913-19430,19753-19820`에 있습니다.

### 대표 3개 경로

| route | source→canonical | 기본 결과 | 저장 후 |
|---|---|---|---|
| `/f/moving-d30-basic` | AJD raw text의 6개 heading, 24개 bullet→6 section+24 Item (`lib/flow/seed-flows.ts:437-471,3488-3508`; `lib/flow/parser.ts:112-176`) | 예시 날짜 calendar 24. 실제 날짜 선택 시 calendar 24, 날짜 없이 checklist 24 | My Flow/checklist에는 24개가 보존됩니다. Calendar/ICS는 명시적 날짜 저장이면 24, `날짜 없이 저장`이면 0입니다. |
| `/f/vehicle-inspection-prep` | TS 공식 source, 3 section, 10 Item (`lib/flow/real-content-pilot-flows.ts:40-47,86-130,159-173,345-367`) | 날짜가 없어도 정책상 checklist가 주 결과 | 날짜를 정해 저장한 경우에만 My Flow shape resolver가 dated rows를 우선해 날짜 작업으로 전환합니다. 공개 의미와 저장 의미의 조건부 정책 차이입니다. |
| `/f/curated-allblanc-morning-workout` | exact YouTube 1편→1 section+1 Item+주 3회 규칙+주의 (`lib/flow/source-backed-curated-260630.ts:96-143,1022-1069`) | `Flow 실행 · 1개`, 반복 규칙 | 시작일을 정하면 Today occurrence와 Calendar 반복 회차가 생깁니다. public routine ICS는 Flow 제목 1개로, saved ICS는 이 1-Item Flow의 Item 제목 1개로 생성됩니다. 날짜 없이 저장하면 Calendar/ICS는 0입니다. |

## 3. My Flow 재구성

저장 시 `flow:saved:<slug>`에 개인 제목, artifact mode, date intent, anchor, routine rule을 기록합니다. Item 수정은 draft/date/memo/inclusion/order overlay에 남습니다.

- 저장: `lib/flow/storage.ts:68,106-116,555-580`
- My Flow 합성: `components/flow/AppClient.tsx:5812-6196`
- Today/Todo: `components/flow/AppClient.tsx:15186-15340`; `lib/flow/my-flow-cross-flow-todo.ts:91-201`
- Calendar: `components/flow/AppClient.tsx:6669-6710`

Todo는 export 포맷이 아니라 **저장된 Flow들의 실행 가능한 Item을 모은 내부 파생 뷰**입니다.

- dated/checklist Item은 row 단위로 노출
- routine은 current occurrence 1개만 노출
- sheet는 current row만 노출
- memo/resource/series는 실행 Inbox에서 제외

따라서 Todo와 checklist export를 같은 것으로 합치면 안 됩니다. checklist는 포함된 전체 실행 목록의 portable snapshot이며 undated/completed Item도 가질 수 있습니다.

## 4. Flow Map 분기

`/flow-maps/middle-school-math-1`은 일반 projection이 아닌 `composition="legacy"` 경로입니다.

- Mathbang 목차→8 canonical FlowItem: `lib/flow/source-backed-my-flow.ts:609-758,853-865,985-1019`
- 73개 하위 개념은 canonical Item이 아니라 detail bullet
- public route: `app/flow-maps/[map]/page.tsx:51-60`
- legacy UI: `components/flow/SourceBackedFlowMapPage.tsx:172-285`

저장 후에는 sheet 8개로 일반 My Flow snapshot에 합류하지만, 저장 전 editor는 별도입니다. 현재 `SourceBackedFlowMapSaveButton`의 applied title·selected IDs가 메인 `FlowSaveBeforeFrame`의 previewRows에 연결되지 않아 다음 불일치가 생깁니다.

| 값 | editor 적용 후 |
|---|---|
| 작은 결과 문장 | 새 제목·7개 |
| CTA | 선택한 7개로 시작 |
| 메인 preview | 원래 제목·8개 |
| 상단 3칸 | 저장 결과 8개·전체 8개 |

근거: `SourceBackedFlowMapSaveButton.tsx:55-80,112-188`; `SourceBackedFlowMapPage.tsx:271-285`.

## 5. projection 무결성

### 보존이 강한 값

| 값 | 일반 `/f` preview→save→My Flow→export |
|---|---|
| stable Item identity | underlying Item ID는 유지. public scope key는 `row.id`, saved scope key는 `flow slug::itemId`라 composite 문자열 자체는 동일하지 않음 |
| Item 제목 | 보존 |
| 포함/제외 | 보존 |
| 순서 | checklist/sheet/memo에서 보존; ICS 순서는 계약상 약함 |
| 날짜 | dated row 보존; undated는 ICS에서 의도적으로 제외 |
| 개인 메모 | 일반 row export에서 대체로 보존 |
| source | Flow/source description 또는 row source로 보존 |

### 현재 drift

| 경로 | 손실/차이 | 위험 |
|---|---|---|
| public checklist vs memo | 같은 text payload | 두 포맷을 나눈 사용자 가치가 없음 |
| saved Flow sheet TSV | Flow 제목 누락 | 파일만 보면 어느 계획인지 알기 어려움 |
| saved Flow/Item ICS | Item 실행 완료 상태 누락 | 현재 UI가 보존을 약속하지는 않아 Hard fail로 집계하지 않고, 미고지 projection loss로 분류 |
| saved Item checklist | 화면이 약속한 완료 기준과 실제 payload가 불일치; Item memo·실행 완료도 누락 | 화면 약속과 산출물의 직접 불일치로 Hard fail |
| public routine ICS | Flow 제목의 series 1개로 축약되어 Item 제목·per-item 메모·완료·순서 생략 | 의도된 축약이나 export 전에 손실 고지가 필요; saved routine ICS와 같은 generator라고 가정하면 안 됨 |
| Flow Map | applied selection/title가 main preview에 미반영 | Hard fail |

## 6. 권고 architecture

### A. 하나의 projection payload

```text
EffectiveFlowSnapshot
  → deriveProjection(scope, format)
  → { rows, includedFields, omittedFields, version, receipt }
  → public UI / My Flow UI / file generator
```

public/saved/Item별 별도 generator에서 의미를 다시 정의하지 않습니다. 각 포맷은 `includedFields`와 `omittedFields`를 UI와 artifact 모두에 남깁니다.

### B. 공통 editor transaction

```text
source snapshot
  → open editor
  → working transaction
  → apply | discard
  → public applied overlay OR saved persisted overlay
```

같은 필드 순서와 validation을 쓰고 결과만 구분합니다.

- public Apply: 현재 브라우저의 working result 갱신. 아직 저장되지 않음.
- saved Save: personal overlay version을 올리고 영구 저장.
- Cancel/Close/Back: dirty면 유지/폐기 선택, 아니면 즉시 닫기.

### C. Flow Map adapter

Flow Map editor가 legacy preview를 직접 그리지 않고 `selected child Item IDs + personal title`을 일반 `EffectiveFlowSnapshot` adapter에 넘깁니다. 메인 preview·CTA·save payload는 같은 결과를 소비해야 합니다.

### D. provenance

snapshot 내부에는 이미 `sourceVersion`, `personalVersion`, `executionVersion`이 있습니다. export artifact/receipt에는 다음을 남기는 안을 검토합니다.

- stable Flow/Item identity
- 세 version 또는 단일 derived snapshot hash
- export 시각
- scope와 format
- 단방향 copy인지 자동 동기화인지

이 정보가 없으면 사용자가 나중에 어느 개인 수정본을 내보냈는지 역추적하기 어렵습니다.
