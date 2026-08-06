# Text Authoring v2 ↔ P35 연결 게이트

> `TA-R2-INT-GATE`의 현재 계약 판정 문서다. Text Authoring과 P35를 자동 병합하지 않고, 두 모델 사이의 ID·필드·개수·손실·소유권 경계를 먼저 고정한다.

## 0. 판정 요약

| 항목 | 판정 |
|---|---|
| 권장 연결 방식 | **분리 유지 + 명시적 adapter contract** |
| cross-worktree 자동 merge | **금지** |
| 현재 runtime 연결 준비도 | **`HOLD_NOT_READY`** |
| 현재 가능한 조치 | 계약 문서화, golden fixture 설계, adapter 출력 검증 |
| 아직 불가능한 조치 | P35 route/storage/component 편입, integration branch 생성·merge, 게시 |

판정의 의미는 다음과 같다.

1. Text Authoring은 `SourceRow → Item → Step → Flow`와 원문·작성 revision을 계속 소유한다.
2. P35는 `FlowBundle → effective authoring/execution snapshot → projection manifest`와 personal/execution overlay를 계속 소유한다.
3. 두 구현을 파일 단위로 합치지 않는다. Text Authoring의 순수 adapter가 `FlowBundle + projection options + loss manifest`를 만들고, P35가 그 결과를 자기 effective contract로 다시 검증하는 단방향 경계를 둔다.
4. 현 Text Authoring adapter는 유효한 출발점이지만 `repeat`, Step identity, source/resource 분리, structured property, authoring revision version을 P35 effective contract까지 완전하게 운반하지 못한다. 따라서 **현재 adapter v1을 곧바로 production 연결 계약으로 승격하지 않는다.**
5. 양쪽 독립 gate, 공통 fixture, 별도 사용자 승인, 깨끗한 integration base가 준비되기 전에는 분리 상태를 유지한다.

P35 정본 자체도 Text Authoring을 별도 worktree 결과로 취급하고 BBB 단계에 자동 편입·stage·commit하지 말라고 명시한다. 또한 P35 bounded correction의 범위 밖에 Text Authoring/creator publishing 재설계를 둔다.

## 1. 조사 기준과 소유권

### 1.1 읽은 기준

| 구분 | checkout / 기준 | 조사 시점 상태 |
|---|---|---|
| Text Authoring | `D:\flowme2605\flow-text-authoring-ta` | branch `codex/text-authoring-ta-implementation-20260729`, HEAD `c09f859b30b854f6f897b8ec1eb781fd774fbeca`, upstream `origin/main`, dirty |
| P35 | `D:\flowme2605\flow-p35-production-mobile-p0` | branch `codex/p35-production-mobile-p0`, HEAD `d5f693776f7cebbce72a247ddb33ca6c5d550900`, upstream `origin/codex/p35-production-mobile-p0`, dirty, **읽기 전용** |

두 checkout 모두 조사 시점 working tree가 dirty다. 아래 판정은 **현재 working-tree 파일**을 읽은 결과이며, 두 HEAD만으로 재현되는 통합 base라는 뜻이 아니다. 이 문서 외의 파일을 stage·commit·merge하거나 P35 checkout을 수정하지 않는다.

### 1.2 주요 근거

| 근거 | 확인한 계약 |
|---|---|
| P35 `00-development-goals-summary-and-links-ko.md:17, 93-97` | Text Authoring은 별도 worktree이며 BBB에 자동 편입·stage·commit하지 않는다. |
| P35 `spec.md:65-77` | source/base, session draft, personal overlay, execution overlay, artifact/receipt를 분리한다. |
| P35 `spec.md:87-103` | 자동 merge 금지, capability 결과, Item ID·count parity, 날짜 없는 Item의 가짜 VEVENT 금지. |
| P35 `spec.md:123-133` | source/base mutation, stable identity rewrite, Text Authoring 재설계는 bounded correction 범위 밖이다. |
| Text Authoring `types.ts:63-80, 270-377` | immutable SourceRow와 canonical Item/Step/Flow 계층. |
| Text Authoring `flow-bundle-adapter.ts:15-48, 284-510` | `FlowBundle + projectionOptions + lossManifest`, source mutation 0인 기존 단방향 adapter. |
| P35 `types.ts:55-146, 219-228` | 현재 `FlowBundle`의 Flow/Section/Item/ItemDetail 구조. |
| P35 `flow-experience-projection.ts:26-67, 181-266` | P35 effective row의 Item 필드, 포함/제외, shape, count 계산. |
| P35 `effective-flow-snapshot.ts:100-152, 530-605, 642-710` | source/personal/execution layer version과 committed result/count. |
| P35 `effective-flow-contract.ts:11-47, 317-379, 446-598` | 형식별 loss, held/unavailable, scope별 ID/count manifest. |
| P35 `projection-identity.ts:25-94, 153-207` | `flowId + itemId` 기반 projection/execution/export identity. |

### 1.3 현재 contract drift 확인

| 비교 | 결과 | 통합 의미 |
|---|---|---|
| 두 checkout의 `lib/flow/types.ts` | 현재 working tree 기준 byte diff 없음 | 기존 adapter의 `FlowBundle` DTO를 공통 경계 후보로 쓸 수 있음 |
| 두 checkout의 `flow-experience-projection.ts` | P35가 Text Authoring checkout 대비 `+26/-1` | P35에는 `completionCriterion`과 meal-plan fallback이 추가되어 있어 TA의 로컬 projection 결과만으로 P35 parity를 주장할 수 없음 |
| `effective-flow-snapshot.ts` / `effective-flow-contract.ts` | P35에만 존재 | adapter 다음 단계의 source/personal/execution version, held/unavailable, manifest count는 P35 쪽에서 검증해야 함 |

따라서 타입 파일이 현재 같다는 사실은 직접 merge 근거가 아니다. DTO 호환 가능성을 뜻할 뿐이며, P35 working tree의 더 최신 projection/effective 계층을 adapter 뒤의 검증자(authority)로 둬야 한다.

## 2. 권장 경계

```text
Text Authoring 소유
rawText
  → SourceRow (immutable provenance)
  → canonical Item
  → canonical Step
  → canonical Flow
  → TextAuthoringDocument revision
            │
            │ pure adapter, source mutation 0
            ▼
경계 DTO
FlowBundle + projectionOptions + adapter loss manifest
            │
            │ P35가 자기 계약으로 검증
            ▼
P35 소유
FlowExperienceProjectionRow
  → EffectiveFlowSnapshot
  → projection manifest
  → Calendar / checklist / sheet / memo artifact
  → personal overlay / execution overlay / receipt
```

핵심은 `TextAuthoringDocument`를 P35 저장소에 그대로 넣거나, P35 `EffectiveFlowSnapshot`을 Text Authoring canonical model로 삼지 않는 것이다. 연결점은 versioned adapter DTO 하나다.

## 3. 계층·ID 매핑

| Text Authoring canonical | adapter 출력 | P35 현재 계약 | 판정 |
|---|---|---|---|
| `SourceRow.sourceRowId` | `FlowItemDetail.source_fragment_ids[]` | effective row에는 직접 필드가 없음 | provenance는 Bundle detail에만 보존. P35 effective Item ID로 사용하지 않는다. |
| `SourceRow.rawText` | `FlowItemDetail.source_fragment_text`, Flow `raw_text` | effective row에는 직접 필드가 없음 | 원문은 adapter 경계에서 보존되지만 projection payload 필드는 아니다. |
| `CanonicalAuthoringItem.itemId` | `FlowItem.id` | row `id` = `sourceItemId`; projection identity `itemId` | **동일 문자열을 보존해야 하는 핵심 stable ID.** 재발급·index ID 금지. |
| `CanonicalAuthoringItem.stepId` | `FlowItem.section_id` | row에는 section 제목만 있고 stable section ID는 없음 | Bundle까지 보존, effective row에서 ID 손실. 필요 시 manifest extension이 필요하다. |
| `CanonicalAuthoringStep.stepId` | `FlowSection.id` | Item `section_id`가 참조 | Bundle hierarchy key로 보존. P35 execution identity의 주 키는 아니다. |
| `CanonicalAuthoringStep.itemIds[]` | Item의 `section_id` 역참조 | projection rows의 `section` 제목 | 배열 자체를 복사하지 않고 참조 무결성으로 재구성한다. |
| `CanonicalAuthoringFlow.flowId` | `Flow.id` | snapshot `identity.flowId`, projection identity `flowId` | **동일 문자열 보존.** adapter slug는 별도 route key다. |
| `CanonicalAuthoringFlow.stepIds[]` | `FlowBundle.sections[]` 순서 | effective row 집합 | Flow hierarchy 정보이며 artifact count에 직접 포함하지 않는다. |
| `document.revision.revisionId` | 현재 adapter v1에 명시 필드 없음 | P35 source/personal/execution version과 artifact hash | **갭.** adapter contract v2에서 source version 입력으로 명시해야 한다. |

### 3.1 stable identity 규칙

1. adapter는 `flowId`, `itemId`, 유효한 `stepId`를 그대로 운반한다.
2. P35는 `flowId::itemId`로 item/export key를 만들고 occurrence가 있을 때만 별도 projection/execution key를 만든다.
3. SourceRow ID는 provenance ID이지 실행 Item ID가 아니다.
4. 작성 source의 `- [x]` 상태인 `sourceChecked`는 개인 실행 완료가 아니다. adapter가 이를 P35 `completedItemIds`나 execution state로 변환하면 hard fail이다.
5. 동일 source revision의 재변환은 동일 Flow/Item ID를 내야 한다. 제목·순서·날짜 변경 때문에 ID를 재발급하지 않는다.
6. split/merge처럼 canonical entity 자체가 달라진 경우만 Text Authoring revision과 receipt가 ID 변화를 설명해야 한다.

## 4. 필드 매핑과 손실 경계

| 의미 | Text Authoring | adapter / FlowBundle | P35 effective row | 현재 판정 |
|---|---|---|---|---|
| 제목 | Item `title` | `FlowItem.title` | `title` | 보존 |
| 설명 | `detail` | `FlowItem.description`, `FlowItemDetail.why` | `description` | 보존. 단, property/schedule 원문도 description에 합쳐질 수 있어 구조는 일부 평탄화 |
| 완료 기준 | `completion.doneWhen` | `FlowItemDetail.completion_criteria` | `completionCriterion` | P35 현재 projection에서 독립 필드 보존. TA 쪽 구형 projection과 contract drift가 있으므로 cross-check 필요 |
| source 체크 | `sourceChecked` | 원문/source fragment만 | `completed`와 연결하지 않음 | **의도적 분리** |
| 절대 날짜 | `schedule.date` | `type=calendar` + `itemOverrides.date` | `schedule.date` | 유효 날짜는 보존 |
| 상대 날짜 | `schedule.dayOffset` + source 기준일 | `day_offset` + adapter anchor | anchor가 있으면 `schedule.date`, 없으면 unscheduled | 기준일 없으면 Calendar `held`; 날짜 추론 금지 |
| 시간 | `schedule.time` | 구조 필드 없이 description/source에 평탄화 | 전용 필드 없음 | **구조 손실**, 원문 보존 |
| timezone | `schedule.timezone` | 구조 필드 없음 | 전용 필드 없음 | **구조 손실**, 새 값 발명 금지 |
| duration | `schedule.durationMinutes` | 구조 필드 없음 | 전용 필드 없음 | **구조 손실**, 원문 보존 여부 fixture 필요 |
| 반복 | `schedule.repeat` / repeat property | 현재 adapter가 `FlowItem.repeat_rule`로 승격하지 않음 | `schedule.repeatRule` 없음 | **통합 blocker.** 현재는 description/source 보존만 가능 |
| 순서 | Item `order` | `FlowItem.order` | `orderRank` | 보존. P35 personal order는 이후 overlay |
| 포함/제외 | Item `included` | `projectionOptions.excludedItemIds` | `included`, `excludedRows` | 보존 |
| nesting | `nestingLevel` | 전용 필드 없음 | 전용 필드 없음 | 현재 nested execution 미지원. 평탄화해 연결하지 말고 held/unsupported 처리 |
| 역할 | `role` + `intent` | P35 `FlowItemRole`로 제한 매핑 | `role`, `completable`, eligible shapes | 변환. `guide→reference`, `caution→warning`, `completion→confirmation` |
| 일반 속성 | `properties[]` | `label: value` 설명 문자열 | description | **구조 손실**, adapter loss manifest에 `flattened_property` |
| 자료 링크 | `resources[]` | `FlowItemDetail.links(type=tool 등)` | `resources[]` | URL·라벨 보존 |
| 출처 링크 | `sources[]` | item link `reference` + 첫 source는 Flow `source_url` | row `resources[]`와 Flow direct source | 링크는 보존되지만 **자료/출처 그룹 구분은 effective row에서 약화** |
| 가이드 | `guides[]` | `FlowItemDetail.how` | row 전용 필드 없음 | Bundle detail에만 보존. effective artifact 운반 규칙 추가 필요 |
| 주의 | `cautions[]` | `FlowItemDetail.caution` | `caution` | 독립 필드 보존 |
| source provenance | `sourceRowIds`, refs | fragment IDs/text, Flow source URL | row ID/count manifest에는 없음 | source layer에서 유지, artifact receipt에 원문 전체를 복제하지 않음 |

### 4.1 형식별 손실 판정

| 형식 | 보존 가능한 핵심 | held / transformed / unavailable |
|---|---|---|
| Calendar | Item ID manifest, title, 유효 날짜, warning/source/resource를 DESCRIPTION으로 변환 가능 | 날짜 없음은 held, incompatible role은 unavailable, item order는 외부 표시 순서 보장 불가, time/timezone/repeat는 현 adapter 구조 갭 |
| 할 일 / checklist | Item ID, title, 설명, 완료 기준, 순서, 포함, 링크 | source 체크는 execution 완료로 변환하지 않음; non-completable role은 Text Authoring UI 정책과 P35 eligibility를 맞춰야 함 |
| Sheet | Item ID, row order, 공통 필드, 링크 | Text Authoring은 원본 표 또는 공유 필드가 충분할 때만 활성; P35 일반 sheet eligibility보다 더 엄격한 TA 규칙을 adapter 앞단에서 유지 |
| Memo | 포함 Item의 제목·설명·세부를 portable text로 보존 | raw source copy는 Text Authoring whole-memo 전용이며 P35 portable memo와 동일 형식으로 간주하지 않음 |

## 5. ID·count parity 계약

Text Authoring과 P35는 count 이름이 같지 않다. 같은 의미끼리 비교해야 한다.

| 의미 | Text Authoring | P35 | 비교 규칙 |
|---|---|---|---|
| 해석된 전체 canonical Items | `projection.counts.interpreted` | source layer `itemIds` 전체 | source revision 기준 집합이 같아야 함 |
| 포함 Items | `projection.counts.included`, `flowExperienceProjection.outlineRows` | result `rows`, manifest `canonicalItemIds` | ID 순서와 count가 같아야 함 |
| 제외 Items | `projection.counts.excluded`, `excludedRows` | result `excludedRows`, manifest `excludedItemIds` | ID 집합과 count가 같아야 함 |
| 선택 요청 | preflight `sourceItemCount`, 선택 ID | manifest `requestedItemIds/counts.requested` | 존재하지 않는 ID를 조용히 추가하지 않음 |
| 형식 적격 | preflight `itemIds/count` | manifest `eligibleItemIds/counts.eligible` | 동일 destination 정책을 적용한 경우 순서·ID가 같아야 함 |
| 보류 | preflight loss reason | manifest `heldItemIds/counts.held` | undated Calendar, review hold 이유를 Item ID별로 보존 |
| 형식 불가 | artifact loss | manifest `unavailableItemIds/counts.unavailable` | role/shape 불가 이유를 Item ID별로 보존 |
| 실제 출력 | export receipt count | manifest `counts.output` | 일반 형식은 eligible count와 같음. routine Calendar series는 여러 Item을 출력 1개로 합칠 수 있어 별도 규칙 필요 |

주의할 점:

- P35 manifest의 `canonicalItemIds`는 committed result의 **포함 rows**다. Text Authoring의 `interpreted` 전체와 직접 비교하면 제외 Item 때문에 오판한다.
- Text Authoring Calendar는 화면에서 날짜 오름차순으로 보일 수 있지만 stable Item ID와 source/canonical 순서를 바꾸지 않는다. manifest 비교는 UI 정렬과 canonical order를 구분한다.
- 현재 Text Authoring adapter test는 canonical Item 5개의 ID·order, 제외 ID, 날짜 override, source 불변을 확인한다. 이것은 adapter 내부 증거이며 P35 effective manifest까지의 cross-contract PASS 증거는 아니다.

## 6. 공통 golden fixture 게이트

| fixture | 입력 핵심 | 기대 TA 결과 | 기대 P35 결과 | 현재 상태 |
|---|---|---|---|---|
| `dated` | 절대 날짜 1개 | Calendar item ID 1, date 보존 | eligible 1, output 1 | 설계 가능, cross-check 미실행 |
| `undated` | 날짜 없는 실행 Item 1개 | Todo/Memo 가능, Calendar loss | Calendar held 1/output 0; checklist/memo eligible | 설계 가능, cross-check 미실행 |
| `mixed` | dated 1 + undated 1 | Calendar 1, omitted/held 1 | Calendar availability conditional, eligible 1/held 1 | 설계 가능, cross-check 미실행 |
| `routine` | repeat가 있는 여러 Item | 현재 repeat는 구조화 전달되지 않음 | routine Calendar는 eligible Items 여러 개여도 series output 1 가능 | **BLOCKED: adapter v2 repeat/series contract 필요** |
| `memo` | 설명·가이드·자료·출처·주의 | raw source + portable memo 경계 보존 | portable memo field rules와 source URL 보존 | 가이드·source/resource 분리 cross-check 필요 |
| `invalid-date` | 잘못된 날짜 원문 | issue + source 보존, Calendar 비활성 | 가짜 날짜 없음, Calendar held/unavailable, output 0 | 설계 가능, reason parity 미실행 |

각 fixture는 최소한 다음 assertion을 가져야 한다.

1. `flowId`, ordered `itemIds`, excluded IDs가 adapter 전후 동일하다.
2. TA preflight IDs/count = P35 manifest requested/eligible IDs/count다.
3. preview IDs/count = artifact IDs/count = receipt IDs/count다.
4. 날짜 없는 Item으로 VEVENT를 만들지 않는다.
5. `sourceChecked`가 P35 `completed`로 바뀌지 않는다.
6. adapter loss와 P35 field rule이 서로 모순되지 않는다.
7. source document 직렬화 결과가 adapter 호출 전후 동일하다.

## 7. write target 분리

| 행위 | write owner | 쓰면 안 되는 곳 |
|---|---|---|
| 원문 입력·creator correction | Text Authoring `rawText`, SourceRow, canonical revision | P35 personal/execution overlay |
| creator source checkbox | Text Authoring `sourceChecked` | P35 완료 상태 |
| 게시/import용 base 생성 | versioned adapter output → P35 source/base 후보 | 기존 P35 source/base 직접 overwrite |
| 공개 저장 전 조정 | P35 public session draft | Text Authoring immutable SourceRow |
| 개인 제목·날짜·메모·제외·순서 | P35 personal overlay | creator source/canonical revision |
| 실행 완료·회차·실행 메모 | P35 execution overlay | source 체크, personal authoring 값 |
| artifact/receipt | P35 manifest/receipt 또는 TA local receipt의 각 소유 lane | canonical plan을 결과 파일 상태로 역변경 |

동일 source의 기존 P35 저장본이 있을 때도 adapter가 자동 merge/overwrite하지 않는다. P35가 `덮어쓰기 / 사본 만들기 / 취소`를 먼저 결정하고, source update reconciliation은 별도 transaction으로 수행해야 한다.

## 8. 결과 rail 결합 규칙

Text Authoring의 고정 4-slot rail과 P35 capability 모델은 UI 코드를 공유하지 않고 다음 의미만 맞춘다.

| Text Authoring 고정 슬롯 | P35 destination | 상태 계산 |
|---|---|---|
| 캘린더 | `calendar` | 날짜·role·anchor로 eligible/held/unavailable |
| 할 일 | `checklist` | portable checklist 결과. Today는 별도 외부 형식이 아님 |
| 시트 | `sheet` | TA의 표 정체성 gate를 먼저 통과한 rows만 eligible |
| 메모 | `memo` | portable memo. raw source copy는 별도 TA 행동 |

표시 규칙:

1. rail 위치는 고정한다.
2. 네 슬롯 중 추천은 1개만 강조한다.
3. 바로 가능한 보조 결과는 최대 2개다.
4. 나머지는 조건부 또는 비활성 상태와 한 줄 이유를 가진다.
5. P35의 `primary 1 + secondary 최대 2 + conditional + unavailable`은 상태 계산 원칙으로만 가져온다.
6. P35 route, public quick, saved transfer, receipt CTA, editor component는 가져오지 않는다.

## 9. 선택지 판정

| 선택지 | 판정 | 근거 |
|---|---|---|
| 완전 분리, 계약도 없음 | 기각 | 동일 FlowBundle 타입과 기존 adapter가 있는데 필드·ID·loss drift를 방치하게 됨 |
| **분리 유지 + adapter contract** | **채택** | source/overlay 소유권을 지키면서 stable ID/count/loss를 검증할 수 있음 |
| 현재 working tree끼리 직접 merge | 기각 | 양쪽 dirty, 독립 gate 미완료, P35 정본이 자동 편입 금지, effective contract가 TA checkout에 없음 |
| P35 component/storage를 TA에 복사 | 기각 | route/lifecycle 결합과 source/personal/execution 소유권 혼선을 만듦 |
| 별도 integration branch 즉시 시작 | 보류 | 양쪽 독립 PASS, adapter v2, golden fixtures, 사용자 승인, clean base commit이 먼저 필요 |

## 10. adapter contract v2 최소 요구

다음은 향후 별도 승인된 integration ticket의 입력이다. 이 문서 작성만으로 구현을 승인하지 않는다.

1. 입력은 immutable `TextAuthoringDocument`와 선택적 source 기준일이다.
2. 출력은 versioned `FlowBundle`, `FlowExperienceProjectionOptions`, machine-readable loss manifest다.
3. `flowId`, `itemId`, 유효 `stepId`, source revision/version을 명시적으로 운반한다.
4. `sourceChecked`와 P35 execution completion을 타입 수준에서 분리한다.
5. repeat/time/timezone/duration을 구조화 전달할지, source-only/description transform으로 둘지 필드별 정책을 고정한다.
6. resource와 source의 의미 구분을 effective row 또는 manifest까지 운반한다.
7. Step ID/description이 artifact에 필요하면 manifest extension으로 운반하고, 필요 없으면 명시적 loss로 기록한다.
8. 모든 default/flatten/omit/hold/unavailable을 Item ID와 path가 있는 loss entry로 남긴다.
9. adapter는 source mutation 0이며 동일 입력에 deterministic한 결과를 낸다.
10. P35는 adapter 결과를 `EffectiveFlowSnapshot`/projection manifest builder로 다시 검증하고, consumer가 원본 Bundle을 임의로 재해석하지 않는다.

## 11. integration을 열기 위한 증거

아래가 모두 충족되기 전에는 `HOLD_NOT_READY`를 유지한다.

- [x] Text Authoring Round 2 독립 gate PASS와 closeout
- [ ] P35 독립 gate PASS와 closeout
- [ ] 별도 사용자 승인
- [ ] 두 checkout의 clean integration base commit 확정
- [ ] adapter contract v2와 schema version 확정
- [ ] 6개 golden fixture cross-contract PASS
- [ ] Item IDs/count/scope/version/hash parity PASS
- [ ] repeat·Step·source/resource·structured property 손실 정책 확정
- [ ] source/personal/execution write-target test PASS
- [ ] legacy no-write와 rollback 증거
- [x] dependency/security gate 결과 기록

## 12. hard-fail

다음 중 하나라도 발생하면 integration을 중단한다.

1. adapter가 Item ID를 index 또는 제목으로 재발급한다.
2. SourceRow ID를 P35 실행 Item ID로 사용한다.
3. `sourceChecked`가 개인 실행 완료로 바뀐다.
4. 날짜 없는 Item에 가짜 날짜/VEVENT를 만든다.
5. repeat/time/timezone 손실을 표시하지 않고 성공 처리한다.
6. resource와 source가 합쳐졌는데 receipt/loss에 경계가 남지 않는다.
7. TA preview/export와 P35 manifest의 ID/count가 다르다.
8. excluded/held/unavailable을 한 count로 합친다.
9. 기존 P35 personal/execution state를 source update로 덮어쓴다.
10. dirty working tree끼리 자동 stage·commit·merge한다.
11. P35 내부 QA 수치를 Text Authoring 통과 증거로 재사용한다.
12. 자동 QA를 관찰 사용자 검증으로 표현한다.

## 13. 현재 종료 상태

- 계약 판정: **`SEPARATE_WITH_ADAPTER_CONTRACT`**
- runtime integration: **미실행**
- P35 checkout 변경: **0개**
- 코드 변경: **0개**
- commit/push/PR/merge/deploy: **미실행**
- 관찰 사용자 검증: **범위 밖 / 0명**

이 게이트의 다음 행동은 merge가 아니라 adapter v2 schema와 공통 golden fixture를 별도 승인된 integration 작업으로 여는 것이다.
