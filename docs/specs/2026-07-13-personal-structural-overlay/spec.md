# P23-01A Personal Structural Overlay Contract

**Date:** 2026-07-13
**Status:** Implemented contract; UI integration deferred to P23-01B
**Scope:** Local personal structure only

## Decision

FlowMe는 source-backed 원본을 수정하지 않고, 개인 구조 변경을 별도 overlay로 저장한다. 구조 변경과 실행 상태를 분리하고, 모든 화면과 projection이 같은 pure resolver 결과를 읽을 수 있는 기반을 만든다.

이번 단계에서는 UI를 노출하지 않는다. P23-01B가 개인 draft Flow에 항목 추가·삭제·즉시 undo를 연결하기 전까지 runtime 화면은 기존 동작을 유지한다.

## Current Inventory

### Source-backed personal copy

현재 `SourceBackedFlowMapPersonalCopy`는 다음을 저장한다.

- Flow별 included/excluded Step ID
- Step 제목 alias
- fixed date override
- 사용자 메모
- source version review에서 제거된 Step의 retained snapshot

표현할 수 없는 상태:

- 사용자 생성 Item
- source Item을 원본 삭제 없이 숨기는 tombstone
- 삭제 복구
- source Item과 user Item의 혼합 순서
- source v2 신규 Item을 개인 순서에 안전하게 합치는 규칙

### URL draft

URL-first miss draft는 로컬 `FlowBundle`로 저장되며, source-backed personal copy와 다른 경로를 사용한다. P23-01A는 두 runtime 저장 포맷을 합치지 않는다. 대신 두 경로가 향후 같은 structural overlay adapter를 사용할 수 있는 독립 계약을 제공한다.

### Current local persistence

| Data | Current location | Owner |
|---|---|---|
| saved Flow | `flow:saved:{slug}` | saved copy metadata |
| source-backed map snapshot | `flow:map:saved:*`, `flow:map:persistence:*` | source-backed personal copy |
| title/date/memo edits | embedded `stepOverridesByFlow`, `flow:my-flow:item-drafts`, `flow:my-flow:date-overrides` | personal value overlay |
| included/excluded rows | `includedStepIdsByFlow`, `excludedStepIdsByFlow` | legacy structural selection |
| completion and run history | checks, item state, `flow:run-registry:*` | execution run |
| P23 structural change | `flow:my-flow:structural-overlay:{savedCopyId}` | personal structural overlay |

새 key는 기존 key를 대체하지 않는다. P23-01B adapter가 준비될 때까지 runtime은 기존 저장 경로를 계속 읽는다.

### Identity constraint

현재 runtime `FlowItem.id`와 source-backed Step ID는 저장된 personal value/execution state의 join key다. P23-01A resolver는 전달된 ID가 version 간 안정적이라는 전제만 사용한다. Step에서 canonical Item으로의 자동 변환은 하지 않는다. source version에서 ID가 바뀌는 경우는 version review가 필요한 충돌로 남긴다.

## Ownership Boundary

### Source/version owns

- canonical title, detail, order, schedule
- source URL, source reference, caution
- published version and source evidence

### Personal structural overlay owns

- user-created Item
- source/user Item tombstone and restore
- personal order override
- included/excluded selection
- structure-level identity and provenance

### Personal value overlay owns

- title alias
- personal memo
- personal schedule override or explicit date removal

### Execution run owns

- pending
- done and reopened
- skipped
- held
- occurrence state and run history

Completion, skip, hold, occurrence state는 structural overlay에 저장하지 않는다. normalizer는 계약에 없는 execution 필드를 유지하지 않는다.

## Contract

Runtime contract source: `lib/flow/personal-structural-overlay.ts`.

```text
PersonalStructuralOverlay
  schemaVersion: 1
  savedCopyId
  flowId
  userItems[]
  itemTombstones[]
  orderOverride[]
  selection
  updatedAt
  migration?
```

### User item

- stable `itemId`
- `provenance: user_created`
- title
- optional personal memo
- optional fixed-date or anchor-offset schedule
- createdAt
- orderKey

### Tombstone

삭제는 source/user Item 객체를 제거하는 작업이 아니다. `{ itemId, ownership, deletedAt }` tombstone을 추가한다.

- source Item: source object는 보존되고 effective list와 projection에서 숨겨진다.
- user Item: user item record는 보존되고 effective list와 projection에서 숨겨진다.
- restore: tombstone을 제거하며 같은 stable ID와 personal order를 재사용한다.
- current source version에 없는 ID의 tombstone도 보존한다. 후속 version에서 같은 ID가 다시 나타나면 숨김 정책이 유지된다.

### Selection compatibility

- `all_except_excluded`: 새 source Item을 기본 포함한다.
- `only_included`: legacy explicit selection을 보존하며 새 source Item은 resolver에서 유실되지 않지만 effective/projection에서는 제외한다.
- excluded가 included보다 우선한다.
- 기존 Step ID 기반 selection은 adapter가 현재 resolution 단위의 ID로 전달한다. 자동 Step-to-Item 변환은 이 단계에서 하지 않는다.

## Resolver Policy

입력:

- immutable source Items
- personal structural overlay
- optional personal value overlays
- optional execution states

출력:

- `allItems`: source와 user Item을 포함한 ordered state
- `effectiveItems`: included이며 tombstoned가 아닌 Item
- `tombstonedItems`: 복구 가능한 Item
- ownership, inclusion, tombstone, projection eligibility, execution metadata
- malformed/unknown ID warning

### Merge order

1. 유효한 `orderOverride` ID를 순서대로 배치한다.
2. override에 없는 source Item을 source canonical order로 뒤에 추가한다.
3. override에 없는 user Item을 `orderKey` 순서로 추가한다.
4. unknown ID는 경고만 남기고 source Item을 제거하지 않는다.
5. source ID와 충돌하는 user Item은 무시하고 source Item을 보존한다.
6. duplicate user ID는 첫 유효 record를 보존한다.

Execution state를 resolver에 전달해도 membership, order, projection eligibility는 달라지지 않는다.

## Persistence And Migration

Storage prefix:

```text
flow:my-flow:structural-overlay:{encoded savedCopyId}
```

정책:

- 기존 localStorage key는 읽거나 삭제하지 않는다.
- 새 record는 additive하게 저장한다.
- legacy included/excluded ID는 schema v1 selection으로 migration한다.
- migration 저장 실패 시 in-memory migrated overlay를 반환하고 legacy data는 유지한다.
- malformed 새 overlay는 원문을 덮어쓰지 않고 safe empty overlay를 반환한다.
- explicit Flow clear는 해당 Flow의 structural overlay를 제거한다.
- execution run reset/reuse는 structural overlay를 제거하지 않는다.
- local backup allowlist에 새 prefix를 포함한다.

## Source Version Merge

- source v2 신규 Item: override에 없어도 source order의 후속 위치에 추가한다.
- source v2 제거 Item: current effective list에는 없지만 user Item, tombstone, order ID는 overlay에 유지한다.
- source Item의 personal value overlay는 stable ID로 계속 결합한다.
- ID 변경은 자동 추론하지 않으며 version review 대상으로 남긴다.

## Projection Policy

P23-01A는 기존 export builder를 교체하지 않는다. resolver가 제공할 새 projection eligibility만 고정한다.

| State | Calendar | Checklist | Sheet | Memo |
|---|---:|---:|---:|---:|
| included source/user Item | schedule이 있을 때 | 포함 | 포함 | 포함 |
| tombstoned | 제외 | 제외 | 제외 | 제외 |
| excluded | 제외 | 제외 | 제외 | 제외 |
| skipped run state | 구조상 유지 | 구조상 유지 | 구조상 유지 | 구조상 유지 |
| completed run state | 구조상 유지 | 구조상 유지 | 구조상 유지 | 구조상 유지 |
| unscheduled | 제외 | 포함 | 포함 | 포함 |

Destination별 skipped/completed export 처리 정책은 execution projection 단계가 결정한다. personal order는 checklist/sheet/memo에 사용하고, Calendar는 날짜와 event identity를 우선한다.

## Recovery And Reset

- 삭제 복구: tombstone 제거
- user Item 삭제 복구: 기존 user item record와 stable ID 재사용
- malformed record: 자동 overwrite 금지
- explicit copy clear: 해당 copy key 제거
- Flow progress clear: 해당 flowId의 structural overlays 제거
- run reuse/reset: structural overlay 유지
- local backup/restore: structural overlay 포함

## P23-01B Gate

첫 UI slice는 개인 draft Flow로 제한한다.

- 모바일 390px My Flow 상세
- 항목 1개 추가
- 항목 삭제
- 삭제 직후 undo
- My Flow effective list 반영
- reorder UI 제외
- source-backed Flow 편집 제외
- Calendar/export 연결은 resolver adapter 검증 후 후속 slice로 분리

P23-01B는 이 계약의 stable ID, user-created provenance, tombstone, restore helper만 사용해야 한다.

## Non-goals

- UI 추가
- account/DB/cloud sync
- AI 생성
- OAuth
- canonical source mutation
- automatic ID similarity matching
- execution completion state migration into structural overlay

## P23-01D1 Projection Contract

P23-01D1 adds a pure adapter between the structural resolver and future
Calendar/export consumers. It does not replace any current consumer.

The adapter returns one stable row contract for these destinations:

- `myFlow`
- `calendarScreen`
- `calendarIcs`
- `checklist`
- `sheet`
- `memo`

Each row carries the stable Item ID, source or user ownership, effective title,
personal memo, effective schedule, resolved calendar date, personal order rank,
membership flags, destination eligibility, and optional execution metadata.
Execution metadata is read-only and cannot change structural membership.

### Destination Rules

| Item state | My Flow | Calendar screen | Calendar ICS | Checklist | Sheet | Memo |
|---|---:|---:|---:|---:|---:|---:|
| included and scheduled | yes | yes | yes | yes | yes | yes |
| included and unscheduled | yes | no | no | yes | yes | yes |
| tombstoned | no | no | no | no | no | no |
| excluded | no | no | no | no | no | no |

Personal fixed-date or anchor-offset overrides take precedence over source
schedules. An explicit `null` schedule override removes Calendar and ICS
eligibility without removing the Item from list projections.

List projections preserve personal order. Calendar projections sort by resolved
date first and use personal order as the same-date tie-breaker. Source v2 Items
that do not appear in an older order override remain present.

### Integration Boundary

- `calendarStructuralProjectionConnected`: `false`
- `exportStructuralProjectionConnected`: `false`
- application UI changed: `false`

P23-01D2 will connect Calendar consumers. P23-01D3 will connect ICS,
checklist, sheet, and memo builders after each consumer's existing behavior is
covered by integration tests.
