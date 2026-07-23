# FlowMe Taxonomy v1.1 — Canonical URL-to-Flow Contract

**Status:** approved documentation contract

**Date:** 2026-07-20

**Runtime status:** not implemented

**Schema:** `flowme-taxonomy-v1.1`

## Decision In One Example

`가족여행 D-7`을 예전에는 `family_parenting + date_preparation + hybrid`처럼 읽을 수 있었다. v1.1은 다음처럼 서로 다른 질문을 분리한다.

```json
{
  "primaryLifeArea": "travel_outings",
  "secondaryLifeAreas": ["family_parenting"],
  "sourceShape": "date_offsets",
  "primaryExecutionPattern": "date_preparation",
  "primaryArtifact": "calendar",
  "secondaryArtifacts": ["checklist"]
}
```

- 여행 완료가 즉시 결과이므로 `travel_outings`가 primary다. 가족은 적용 맥락이다.
- 원문이 실제 D-7 행을 제공했을 때만 `date_offsets`다. P0 아이디어 행만 있다면 `sourceShape=null`, `sourceRowStatus=missing`이다.
- 날짜를 잃으면 준비가 실패하므로 Calendar가 primary다. 체크는 Calendar 설명이나 별도 checklist projection이다.
- 공개 페이지, 실제 행 접근, 개인 변환, 공개 배포는 이 분류와 별도 gate다.

이 예시가 v1.1 전체의 핵심이다. **주제, 원문 생김새, 사용자 실행, 결과물, 접근, 권리, 검토 상태를 한 필드에 섞지 않는다.**

## Goal And Scope

Taxonomy v1.1은 기존 canonical model을 다시 만드는 작업이 아니다. 다음 결정을 보존한다.

```text
SourceRow -> Item -> Step -> Flow -> Bundle / Flow Map
```

- `SourceRow`: 원문 근거의 최소 단위
- `Item`: 독립 완료·판정·기록·소비·보류 상태를 갖는 최소 실행/투영 단위
- `Step`: Item의 의미 그룹; schedule/completion state를 소유하지 않음
- `Flow`: 한 사용자 일, 한 primary source, 한 primary execution pattern, 한 primary artifact
- `Calendar / Checklist / Todo / Sheet / Memo`: Item에서 만드는 projection

이번 목표는 taxonomy, reclassification, schema, validator, legacy mapping, backend DTO, 독립 분류 QA와 검토 HTML까지다. app runtime, DB, LLM API, crawler, 실제 URL fetch, 공개 콘텐츠 승인은 범위 밖이다.

## Evidence Labels

| Label | Meaning | Example |
| --- | --- | --- |
| `verified_fact` | 현재 파일에서 직접 확인한 구조/행/값 | deep set의 named SourceRow |
| `current_implementation` | 현재 앱이 실제로 쓰는 타입/seed 동작 | `category: string`, `structure_type`, `primary_destination` |
| `strategy_proposal` | v1.1에서 승인한 향후 canonical 규칙 | `sourceShape`와 execution pattern 분리 |
| `unverified_hypothesis` | 원문 행이 없어 확정할 수 없는 분류 | P0 creator 아이디어의 source shape |

`reclassified-content-v1.json`은 레코드마다 이 label을 보존한다. 자동 QA나 agent agreement를 실제 사용자 검증으로 표현하지 않는다.

## Current Taxonomy Audit

### Verified canonical strengths

- Canonical v1은 `SourceSnapshot -> SourceRow -> SourceReference -> Item -> Step -> Flow -> Bundle` 책임을 이미 분리한다.
- Item은 최소 상태·실행 단위이고, ICS/checklist/sheet/memo는 projection이다.
- 9개 life area, 7개 planning pattern, 6개 natural artifact가 있다.
- source/published content, user overlay, run state, internal review ownership이 분리돼 있다.
- URL-to-Flow readiness 문서는 generation state, outcome, readiness, error를 한 enum에 섞지 말라고 고정한다.

### Verified drift and mixed axes

| Existing field | Observed problem | v1.1 decision |
| --- | --- | --- |
| canonical `lifeArea` vs runtime `category: string` | 153 seed에 category 문자열 90종 | 9개 life area + topicTags; exact alias도 제안만 하고 즉시 사용자 결과로 확정 |
| `planningPattern=source_table_rows` | 다른 값은 실행 방식, 이 값만 원문 모양 | `sourceShape=table_rows` + 실제 사용자 상태에 맞는 execution pattern |
| `primaryArtifact=hybrid` | 어떤 결과물이 주 결과인지 숨김 | primary 1개 + secondary 배열; 신규 hybrid 금지 |
| `targetConditions` | user job, 불편, 접근 조건이 혼재 | `userNeedSignals`, `frictionSignals`, applicability/access로 분리 |
| `public_html / official_api / rss / user_authorized / creator_file` | 발견 접근과 획득 방식 혼재 | `discoveryAccess`, `rowAccess`, `acquisitionMethods[]` |
| `allowed / needs_review / blocked` 또는 seed `rightsMode` | 권리 근거와 허용 행위가 손실 | `rightsBasis`, `allowedUse[]`, territory, review status |
| conversion/promotion/review status | 원문·권리·지역·안전·공개 상태가 한 값에 압축 | 8개 병렬 review/gate + cumulative blockers |
| `providerType`, `sourceFormat` | 확장 36건에서 각각 35종/34종 자유문 | 통제된 상위 enum + `sourceFormat.detail` metadata |

### Current runtime inventory

| Axis | Count |
| --- | ---: |
| FlowBundle | 153 |
| Item | 847 |
| category label | 90 |
| structure | checklist 62 / routine 52 / timeline 37 / phase 2 |
| primary destination | calendar 37 / hybrid 25 / internal_check 10 / memo 38 / sheet 19 / missing 24 |
| raw Item type | todo 734 / calendar 113 |

`structure_type=checklist`는 ordered procedure, progress table, resource queue, compare/decide를 구분하지 못한다. `item.type=calendar|todo`도 intent, schedule, completion, record, decision, caution의 복합 facet을 복원하지 못한다.

## Taxonomy v1.1 Layers

### A. Content meaning

```ts
primaryLifeArea: LifeArea
secondaryLifeAreas: LifeArea[] // unique, max 2
topicTags: string[]
```

9개 life area는 유지한다. primary는 **즉시 완료 결과**로 고른다. publisher, 형식, 동반자, 문서에 등장한 모든 주제로 고르지 않는다.

### B. Source anatomy

```ts
sourceShape:
  | single_action
  | checklist_rows
  | date_offsets
  | date_window
  | recurrence_rule
  | procedure_rows
  | table_rows
  | lesson_rows
  | resource_collection
  | decision_criteria
  | narrative_guidance
  | template_fields
secondarySourceShapes: SourceShape[]
```

`SourceRow.rowType`과 `sourceShape`은 다르다. rowType은 개별 행의 action/date/resource 같은 성격이고, sourceShape은 한 Flow를 지배하는 **행 집합의 모양**이다. sourceShape은 실제 획득한 행에서만 판정한다. P0 title이나 marketing page로 추정하지 않는다.

### C. User execution

```ts
primaryExecutionPattern:
  | date_preparation
  | ordered_procedure
  | repeating_routine
  | progress_tracking
  | resource_queue
  | compare_decide
  | phase_lifecycle
secondaryExecutionPatterns: ExecutionPattern[] // unique, max 2
```

같은 표도 다르게 실행될 수 있다.

- course rows의 현재 위치/상태를 바꾸면 `progress_tracking`
- product columns로 선택/제외하면 `compare_decide`
- distinct resource link를 다음 순서로 소비하면 `resource_queue`
- 서로 다른 단계 결과물이 다음 단계를 열면 `phase_lifecycle`

### D. Retained result

```ts
primaryArtifact: calendar | checklist | todo | sheet | memo
secondaryArtifacts: Artifact[]
```

primary는 “잃으면 사용자 일이 실패하는 결과물”이다.

| Loss question | Primary |
| --- | --- |
| 날짜·주기를 잃으면 실패하는가? | `calendar` |
| 닫힌 항목의 누락 상태를 잃으면 실패하는가? | `checklist` |
| 재정렬·추가 가능한 다음 행동 큐를 잃으면 실패하는가? | `todo` |
| 행·열·상태/값을 잃으면 실패하는가? | `sheet` |
| 맥락·판단 이유·출처 경계를 잃으면 실패하는가? | `memo` |

모든 Item은 5개 projection으로 직렬화될 수 있다는 뜻이 아니다. `secondaryArtifacts`에는 실제 default output만 넣는다. 기술적으로 가능한 projection은 DTO의 loss manifest에서 `not_applicable`로 표시한다.

### E. Audience and applicability

```ts
audienceAndApplicability: {
  roles[]
  ageBands[]
  skillLevel
  contentLocale
  applicableLocales[]
  applicability
  prerequisites[]
  accountOrEntitlement
  collaborationContext
  userNeedSignals[]
  frictionSignals[]
}
```

- audience는 누가 실행/수혜하는지 말한다.
- applicability는 어느 지역·제도·언어에 바로 적용되는지 말한다.
- prerequisites와 entitlement는 실행 전 조건이다.
- userNeedSignals는 사용자가 원하는 지원이고, frictionSignals는 현재 불편이다.
- collaboration은 life area나 audience role과 독립이다.

### F. Source access

```ts
access: {
  providerType
  platformRoles[]
  discoveryAccess
  rowAccess
  acquisitionMethods[]
  sourceFormat: { category, mediaType, detail }
}
```

| Field | Question | Example |
| --- | --- | --- |
| `platformRoles[]` | 이 플랫폼이 발견/호스팅/실행/권한/목적지 중 무엇을 하는가? | Todoist는 discover+host+execute+entitlement 가능 |
| `discoveryAccess` | landing/discovery page를 볼 수 있는가? | `public` |
| `rowAccess` | 실제 변환 행을 확보했는가? | `partial` |
| `acquisitionMethods[]` | 행을 어떤 통로로 가져오는가? | `oauth_api` |
| `sourceFormat.category` | 통제된 상위 형식은 무엇인가? | `template` |
| `sourceFormat.detail` | MIME, 페이지/행 수 같은 설명 metadata는 무엇인가? | `{fullTasks: "after authorization"}` |

공개 template page + 로그인 후 full rows는 `discoveryAccess=public`, `rowAccess=partial`, `acquisitionMethods=[oauth_api]`, `accountOrEntitlement=free_account`다.

### G. Rights

```ts
rights: {
  basis
  allowedUse[]
  territoryScope
  territories[]
  reviewStatus
  personalTransformAllowed
  publicReleaseAllowed
  rationale
}
```

접근 가능은 권리 허용이 아니다. `publicReleaseAllowed=true`는 다음을 모두 요구한다.

1. rights review approved
2. `allowedUse`에 `public_derived` 또는 `public_republish`
3. personal transform allowed
4. complete source rows
5. freshness/locale/safety/privacy gate 통과
6. promotion gate 통과

개인 변환과 공개 배포는 독립이다. `false`는 현재 근거가 부족하다는 fail-closed product policy이며 법률 결론이 아니다.

### H. Parallel review and production state

```ts
review: {
  sourceRowStatus
  conversionReadiness
  freshnessReview
  localeReview
  safetyReview
  privacyReview
  rightsReview
  promotionState
  blockers[]
  portfolioRole
  editorialAction
  backendStorable
}
```

blocker는 배열이며 누적된다. 원문 import와 권리 허가가 모두 필요하면 둘 다 기록한다.

```json
{
  "sourceRowStatus": "missing",
  "rightsReview": "pending",
  "conversionReadiness": "source_import_required",
  "blockers": ["source_import_required", "rights_permission_required"]
}
```

## Tie-break Rules For Required Ambiguous Cases

| Case | Final rule | Example result |
| --- | --- | --- |
| 가족여행 | 여행 완료가 결과면 travel primary, 가족은 secondary | `travel_outings + [family_parenting]` |
| 개발 강의 | lesson completion은 study, professional deliverable/job state는 work | K-MOOC=`study_reading`; portfolio=`work_career` |
| 영상 강좌 | fixed homogeneous lesson status=progress; flexible links=queue; heterogeneous outputs=lifecycle | course table=`progress_tracking` |
| 계약 전 확인 | multiple valid terminal states=compare; one inevitable sequence=procedure | 진행/보류/거절=`compare_decide` |
| 반복 그림책 | 같은 책/행동 반복=routine; 서로 다른 imported book=queue | 주말 같은 책=`repeating_routine` |
| 일정+체크 | 잃으면 실패하는 artifact를 primary, 다른 하나를 secondary | 이사 D-day=`calendar + checklist` |
| 원문+권리 동시 필요 | blocker를 합치지 말고 둘 다 기록 | source import + permission required |
| 공개 page+로그인 원문 | discovery와 row access 분리 | public + partial + oauth |

추가 재현성 규칙:

- P0 ledger에는 SourceRow가 없으므로 sourceShape을 null로 둔다.
- `metadata_only`는 없는 lesson/template row shape을 확정하지 못한다.
- homogeneous `service_step`은 ordered procedure다. 서로 다른 phase output만 lifecycle이다.
- fixed curriculum + prerequisite/status는 progress다. flexible resource collection은 queue다.
- fixed route는 ordered procedure, flexible places는 resource queue다.
- fixed long resource sequence with stable duration/status는 sheet primary + todo secondary다.

## Reclassification Result

`reclassified-content-v1.json`은 다음 84건을 한 형식으로 저장한다.

| Dataset | Records | Evidence boundary |
| --- | ---: | --- |
| P0 portfolio | 24 | 아이디어/포트폴리오 원장; SourceRow 없음 |
| source expansion | 36 | 접근·권리·형식·후보 상태 원장 |
| deep set | 12 | named source rows와 gate가 가장 구체적 |
| representative runtime seed | 12 | 현재 구현 구조; first-class SourceRow 없음 |

모든 레코드는 기존 분류, v1.1 분류, 변경 이유, 애매 후보, tie-breaker, 손실/보류 이유, backend 저장 여부, 개인 변환 여부, 공개 여부를 포함한다.

현재 결과:

- 신규 hybrid: 0
- backend에 research/canonical metadata로 저장 가능: 84/84
- 개인 변환 허용 근거 확인: 6/84
- 공개 허용: 0/84
- P0 24는 전부 source import 전 sourceShape 확정 금지

## Legacy Mapping Boundary

`legacy-mapping-v1.json`은 앱 코드를 바꾸지 않는 future adapter 계약이다.

| Axis | Automatic | Proposal only | Human review |
| --- | ---: | ---: | ---: |
| category -> life area | 0/153 | 143 | 10 |
| structure -> execution | 51/153 | 37 | 65 |
| destination -> artifact | 35/153 | 67 | 51 |
| three legacy axes intersection | 0/153 | 강한 제안 17 | 최종 확인 153 |
| full v1.1 backend-ready | 0/153 | — | 153 |

full 자동 변환이 0인 이유는 현재 runtime에 first-class SourceRow/sourceShape, access, rights, parallel review가 없기 때문이다. 이는 기존 데이터가 쓸모없다는 뜻이 아니라, adapter가 source import/review를 건너뛸 수 없다는 뜻이다.

### Required adapter decisions

- `category`: exact alias만 primaryLifeArea로; 원문 label은 topicTag로 보존
- `structure_type=timeline`: schedule provenance가 source/user임을 증명할 때만 date preparation 자동
- `structure_type=routine`: explicit source/user recurrence가 있을 때만 repeating routine 자동
- `structure_type=checklist`: 자동 pattern 없음
- `primary_destination=internal_check`: checklist + compatibility delivery surface
- `primary_destination=hybrid`: artifact loss test로 primary 재판정
- `item.type`: intent/schedule/completion/field/memo/caution facet으로 분해; direct mapping 0

## Backend DTO Contract

`representative-backend-dto-v1.json`은 URL-to-Flow가 출력할 10개 DTO를 제공한다.

```text
source identity
  + source snapshot identity/hash
  + taxonomy assignment
  + audience/applicability
  + access
  + rights
  + parallel review
  + SourceRows
  + SourceReferences and omitted-row accounting
  + Flow + Steps
  + canonical Items with sourceRefIds
  + five-target projection preview/loss manifest
```

| Scenario | Real example | Primary output |
| --- | --- | --- |
| 날짜 역산 | 찾기쉬운 생활법령 이사 체크리스트 | Calendar |
| 순서형 절차 | NASA Build a Crane | Checklist |
| 반복 루틴 | 농사로 온열질환 작업 전·중·후 | Checklist; 출처 없는 recurrence 일정은 생성하지 않음 |
| 표·진도 | OSSU curriculum | Sheet |
| 자료 큐 | LibriVox 38장 원문 중 검증한 3행 대표 fixture | Sheet + Todo |
| 비교·결정 | 오늘의집 리모델링 계약 10 criteria | Sheet |
| 단계형 프로젝트 | 개발 포트폴리오 4주 | Sheet + Todo |
| 공식 날짜창 | TS 자동차검사 유효기간 | Calendar |
| 권리 제한 | VisitKorea 변경금지 유형 route | blocked projection |
| source import | Todoist Podcast Workflow | zero Item until OAuth import |

DTO 10건은 58 SourceRows와 43 Items를 담는다. LibriVox DTO는 원문 페이지의 총 38장 중 확인한 3행만 담아 `sourceRowStatus=partial`로 기록한다. source-import-required DTO는 공개 phase metadata만 보존하고 Item은 0개이며 taxonomy assignment도 `provisional`/`sourceShape=null`이다.

## Validator Invariants

`validate-taxonomy-v1-1.mjs`와 Node test가 다음을 자동 검증한다.

- catalog enum과 JSON Schema enum parity
- required controlled values and no free-text enum growth
- primary/secondary uniqueness
- new hybrid rejection
- cumulative blockers
- SourceSnapshot/SourceRow/SourceReference/Item/Step/Flow bidirectional integrity and omission accounting
- public release and personal transform separation
- locale/safety/privacy fields always present
- legacy key/value leakage into canonical assignment blocked
- missing/metadata source rows cannot become canary-ready
- source-import-required cannot fabricate Items
- legacy inventory counts reconcile
- two-round classifier comparison core axes >=85%

## Contract Ownership And Compatibility

Taxonomy v1.1은 **additive editorial/backend DTO contract**다. canonical v1 TypeScript/runtime을 이번 목표에서 수정하지 않았다.

- 기존 canonical SourceRowType, Item intent/schedule/completion은 그대로 쓸 수 있다.
- v1의 `planningPattern/secondaryPatterns`는 adapter에서 v1.1 execution pattern으로 옮긴다.
- v1의 `NaturalArtifact=hybrid`는 legacy input에서만 읽고 v1.1 output에는 쓰지 않는다.
- canonical v1 rights `allowed|needs_review|blocked`는 v1.1 evidence가 있을 때만 더 구체적으로 승격한다.
- generation state/outcome/readiness/errorCode와 editorial review/promotion은 끝까지 별도다.

## What This Proves — And Does Not Prove

This package proves:

- a stable, machine-readable v1.1 taxonomy and DTO boundary;
- deterministic validation and representative reclassification;
- measured inter-classifier consistency on a frozen 20-case set;
- a numerical legacy auto/manual boundary.

It does not prove:

- production crawler or arbitrary URL safety;
- real LLM provider quality/cost/privacy;
- database/RLS/migration behavior;
- legal clearance or public-content approval;
- target-user behavior validation.

## Next Backend Goal

Implement a **provider-neutral fake intake and canonical adapter slice**, not a real crawler/LLM yet:

1. `URL/request -> normalized lookup -> source snapshot fixture`
2. `source snapshot -> SourceRows` with `sourceShape` and omission accounting
3. deterministic classifier -> v1.1 taxonomy/access/rights/review proposal
4. canonical Item builder with SourceRow refs and no invented schedule/action
5. validator gate -> `proposal | source_import_required | hold`
6. five projections + loss manifest
7. explicit review-before-save

Exit only when the 10 DTOs round-trip through the adapter, all failure fixtures pass, and no internal review/provider metadata leaks into projections.

## Artifact Index

- [Taxonomy catalog](./taxonomy-v1.1.json)
- [JSON Schema](./taxonomy-v1.1.schema.json)
- [84-record reclassification](./reclassified-content-v1.json)
- [Legacy mapping](./legacy-mapping-v1.json)
- [Representative backend DTOs](./representative-backend-dto-v1.json)
- [Independent classification comparison](./classification-comparison-v1.json)
- [Validator](./validate-taxonomy-v1-1.mjs)
- [Validator tests](./validate-taxonomy-v1-1.test.mjs)
- [Reclassification builder](./build-reclassified-content-v1.mjs)
- [DTO builder](./build-representative-backend-dto-v1.mjs)
- [Comparison builder](./build-classification-comparison-v1.mjs)
- [PPT-style Korean review](../../content-audit/2026-07-20-flowme-taxonomy-v1-1-review-ko.html)
- [Plan](./plan.md)
- [Tasks](./tasks.md)
- [QA](./qa.md)
