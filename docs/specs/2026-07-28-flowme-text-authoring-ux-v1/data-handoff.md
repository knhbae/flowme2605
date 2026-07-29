# Data Handoff

## 1. 구현 전략

첫 구현은 기존 canonical Flow schema를 바꾸지 않는다. authoring 전용 draft와 mapping을
별도 계약으로 두고, 승인 또는 개인 저장 시 기존 projection layer로 변환한다.

Migration:

- TA-01: 없음
- local draft persistence 도입 시 새 namespaced storage key 필요
- 기존 Flow/personal/run/occurrence/export key는 변경하지 않음

## 2. Entity candidates

### TextAuthoringDocument

- documentId
- ownership: personal | creator | suggestion
- rawText
- inputKind
- sourceRefs
- parseResultId
- activeRevisionId
- createdAt/updatedAt

### AuthoringBlock

- blockId
- documentId
- parentBlockId
- order
- sourceRange
- rawText
- interpretedRole
- confidenceBand
- included

### AuthoringParseResult

- parseResultId
- parserVersion
- fixtureVersion
- blocks
- mappings
- issues
- artifactEligibility

### BlockToCanonicalMapping

- mappingId
- blockIds
- targetKind: flow | step | item | detail | completion | field | resource | guide | source
- targetDraftId
- sourceLineage
- userCorrected

### UnresolvedAuthoringIssue

- issueId
- type
- sourceRange
- messageKey
- options
- blocking
- resolution

### DraftRevision

- revisionId
- parentRevisionId
- operations
- actorLane
- timestamp

### RoundTripReceipt

- receiptId
- format
- exportedCount
- matchedCount
- changedCount
- unresolvedCount
- lossFields

## 3. Ownership

| 값 | 소유자 | 저장 |
|---|---|---|
| source text/range | source snapshot | immutable reference |
| parser proposal | parse result | replaceable |
| creator correction | creator draft | revision |
| personal structure | personal structural overlay/draft | revision |
| personal date/place/memo | personal overlay | existing compatible layer |
| completion/reopen | execution run | authoring 밖 |
| occurrence completion | occurrence | authoring 밖 |
| export count/identity | receipt | export layer |

## 4. Conflict resolution

- source와 user 값은 둘 다 보존한다.
- projection은 personal lane에서 user override를 우선한다.
- creator lane은 source correction을 creator draft에만 반영한다.
- source update는 자동 merge하지 않고 compare state를 만든다.
- deleted source block은 tombstone으로 보존하고 lineage를 끊지 않는다.

## 5. Events

| Event | 발생 | 주요 payload | 실패 |
|---|---|---|---|
| `authoring_started` | composer 진입 | lane, entry, draftId | none |
| `text_pasted` | paste 완료 | charCount, lineCount, containsUrl | storage failure |
| `input_kind_detected` | parse 시작 후 | kinds, confidenceBand | partial |
| `structure_previewed` | outline 표시 | flow/step/item counts, issueCount | render |
| `mapping_corrected` | merge/split/role/reorder | operation, affected IDs | revision conflict |
| `user_value_added` | personal property 변경 | field, owner, itemId | validation |
| `artifact_previewed` | projection 표시 | artifact, eligibleCount, loss | projection |
| `draft_saved` | personal/creator 저장 | ownership, counts, revision | persistence |
| `creator_review_requested` | gate 제출 | issue/rights/safety status | gate blocked |
| `export_preflight_opened` | scope 확인 | scope, artifact, count | none |
| `export_completed` | 결과 생성 | receiptId, count, loss | retryable |
| `round_trip_checked` | re-import 비교 | matched/changed/unresolved | parse |
| `unsaved_draft_recovered` | reload 복구 | draftAge, revision | corrupt draft |
| `blocked_reason_viewed` | detail 펼침 | reasonType | none |

Event payload에 raw source 전문이나 민감 메모를 기본 포함하지 않는다.

## 6. API response needs

UX가 기대하는 최소 응답:

- accepted input snapshot ID
- parser/fixture version
- stable block/mapping IDs
- normalized structure
- unresolved issue list
- artifact eligibility, counts, loss fields
- save revision/ownership
- export receipt
- recovery revision

## 7. Rollback boundary

- authoring draft namespace만 제거하면 기존 Flow 실행은 그대로여야 한다.
- parser proposal은 canonical Flow에 직접 쓰지 않는다.
- feature flag off 시 기존 Input Composer route로 복귀한다.
- new draft data가 있어도 old app이 기존 Flow storage를 읽는 데 영향이 없어야 한다.

## 8. Test contract

Unit:

- input detection
- block range preservation
- split/merge/reorder stable IDs
- role mapping
- artifact eligibility/loss
- owner precedence
- round-trip receipt

E2E:

- 제주 memo 5 Items
- 이사 relative date
- table 14/38 row preservation
- resource/guide role
- blocked source states
- draft recovery
- keyboard flow
- 390/1024/1440 overflow
