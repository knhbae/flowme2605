# Data Handoff

현재 쓰기·파서 경계의 정본은
[text-authoring-contract-v2.json](./text-authoring-contract-v2.json)이다.
[text-authoring-contract-v1.json](./text-authoring-contract-v1.json)은 저장된 v1 초안과
대시 없는 속성을 읽기 위한 호환 계약으로 보존한다.

## 1. 구현 전략

첫 구현은 기존 canonical Flow schema를 바꾸지 않는다. authoring 전용 draft와 mapping을
별도 계약으로 두고, 승인 또는 개인 저장 시 기존 projection layer로 변환한다.

Migration:

- TA-01: 없음
- local draft persistence 도입 시 새 namespaced storage key 필요
- 기존 Flow/personal/run/occurrence/export key는 변경하지 않음

문법 v2 migration:

- 새 문서는 `flowme-text-authoring-v2`, 새 parser 결과는
  `flowme-text-authoring-parser-v2`를 쓴다.
- writer는 `flowme-authoring-markdown-v2`와
  `flowme-supported-markdown-v2`만 만든다.
- v1 document/parser/dialect 값과 대시 없는 들여쓴 속성은 읽되, 다시 내보낼 때
  `  - 공식 속성: 값`으로 정규화한다.
- 상대 날짜의 실제 기준일은 원문의 `- 기준일: YYYY-MM-DD`만 사용한다. UI 편집도
  이 줄을 추가하거나 수정해야 하며 별도 숨은 anchor 값만 넘기지 않는다.

## 2. Entity candidates

### TextAuthoringDocument

- schemaVersion: `flowme-text-authoring-v2` 또는 읽기 호환 v1
- documentId
- ownership: personal | creator | suggestion
- rawText
- inputKind
- sourceRefs
- parseResultId
- activeRevisionId
- reviewGates
- sourceState
- forkedFrom
- lifecycleStatus: draft | needs_review | previewed | archived
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
- parserVersion: `flowme-text-authoring-parser-v2` 또는 읽기 호환 v1
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
- type: unsupported_syntax | unknown_property | unsupported_nested_item |
  ambiguous_role | missing_parent | invalid_date | source_import_required |
  rights_review_required | safety_review_required
- sourceRange
- messageKey
- options
- blocking
- resolution

### DraftRevision

- revisionId
- parentRevisionId
- operations: 기존 correction + `align_source_order`
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

### AuthoringReviewGate

- gateId
- kind: rights | safety
- status: required | evidence_recorded | personal_only
- sourceSnapshotId
- sourceRowIds
- reasonKey
- evidenceNote
- actorLane
- decidedAt

### AuthoringSourceState

- status: current | source_updated | conflict_source_vs_user
- active snapshot ID/fingerprint/version
- incoming snapshot, raw text, parse result
- matches: stable_entity_id | explicit
- changes: changed | added | removed
- compare fields: title, detail, completion, schedule, resources, sources,
  guides, cautions, role, included, nesting, order, step_mapping
- stagedAt

### Save/ExportReceipt

- storage: local_only for draft save
- ownership, scope, artifact, format, count, item IDs
- reviewState: required/evidence-recorded/personal-only gate IDs
- sourceState: active/incoming snapshot IDs and open change count
- sourcePreserved, validationIssueCount

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
- source Item match는 stable entity ID 또는 caller의 explicit match만 사용한다.
  제목 유사도와 순서는 match 근거가 아니다.
- source update는 외부 watcher가 아니다. 보호 revision이 없는 현재 입력은 local
  deterministic parser가 debounce 뒤 replaceable proposal로 다시 계산한다.
  저장된 local draft 또는 correction revision의 변경 입력은 active proposal을
  바꾸지 않고 incoming compare state로 stage한다.
- review/source-update pending 상태에서도 local save는 허용하지만 export,
  creator review 요청, suggestion submit은 차단한다.
- 비개인 lane의 personal-only 선택은 새 personal document/revision을 만들고
  `forkedFrom`으로 원 document/revision을 가리킨다.

## 5. Events

| Event | 발생 | 주요 payload | 실패 |
|---|---|---|---|
| `authoring_started` | composer 진입 | lane, entry, draftId | none |
| `text_pasted` | paste 완료 | charCount, lineCount, containsUrl | storage failure |
| `input_kind_detected` | parse 시작 후 | kinds, confidenceBand | partial |
| `structure_previewed` | outline 표시 | flow/step/item counts, issueCount | render |
| `mapping_corrected` | merge/split/role/reorder/align_source_order | operation, affected IDs | revision conflict |
| `issue_classified` | 원문 유지/Item 전환/보류 | issueId, outcome, state, targetDraftId, actorLane | revision conflict |
| `user_value_added` | personal property 변경 | field, owner, itemId | validation |
| `artifact_previewed` | projection 표시 | artifact, eligibleCount, loss | projection |
| `draft_saved` | personal/creator 저장 | ownership, counts, revision | persistence |
| `creator_review_requested` | gate 제출 | issue/rights/safety status | gate blocked |
| `export_preflight_opened` | scope 확인 | scope, artifact, count | none |
| `export_completed` | 결과 생성 | receiptId, count, loss | retryable |
| `round_trip_checked` | re-import 비교 | matched/changed/unresolved | parse |
| `unsaved_draft_recovered` | reload 복구 | draftAge, revision | corrupt draft |
| `blocked_reason_viewed` | detail 펼침 | reasonType | none |
| `review_decision_recorded` | 권리·안전 선택 | gateId, status, evidence presence, actorLane | validation |
| `review_reopened` | 확인 다시 열기 | gateId | revision conflict |
| `source_update_staged` | 저장 초안 원문 재해석 | active/incoming snapshot, change count | compare |
| `source_change_resolved` | old/incoming/user 선택 | changeId, resolution, actorLane | revision conflict |
| `source_update_applied` | 모든 change 적용 | active snapshot, revision | validation |
| `source_update_rejected` | incoming candidate 거절 | retained snapshot, revision | none |

Event payload에 raw source 전문이나 민감 메모를 기본 포함하지 않는다.
현재 로컬 구현은 위 상태를 revision operation과 receipt에 보존한다. 이 표는 향후
analytics/API event 이름의 계약 후보이며 외부 event 전송이 구현됐다는 뜻이 아니다.

## 6. API response needs

UX가 기대하는 최소 응답:

- accepted input snapshot ID
- parser/fixture version
- source text의 ISO flow anchor와 relative-date 계산 가능 여부
- stable block/mapping IDs
- normalized structure
- unresolved issue list
- review requirements/gates
- active/incoming source snapshot과 explicit change list
- artifact eligibility, counts, loss fields
- save revision/ownership
- save/export receipt의 review/source state
- recovery revision

## 7. Rollback boundary

- authoring draft namespace만 제거하면 기존 Flow 실행은 그대로여야 한다.
- parser proposal은 canonical Flow에 직접 쓰지 않는다.
- feature flag off 시 기존 Input Composer route로 복귀한다.
- new draft data가 있어도 old app이 기존 Flow storage를 읽는 데 영향이 없어야 한다.

## 8. Test contract

Unit:

- input detection
- v2 속성 bullet이 직전 Item 소유로 남고 ghost Item을 만들지 않음
- 표식 없는 직접 작성 문장은 Item 0, 원문 보존
- unknown property와 nested checkbox의 전용 issue
- v1 읽기와 v2 쓰기 round-trip
- source ISO 기준일만 Calendar relative anchor로 사용
- block range preservation
- split/merge/reorder stable IDs
- role mapping
- artifact eligibility/loss
- owner precedence
- round-trip receipt
- rights/safety review policy, reopen, undo, personal fork
- source support/structure compare, explicit match, apply/reject

E2E:

- 제주 memo 5 Items
- 이사 relative date
- table 14/38 row preservation
- resource/guide role
- blocked source states
- creator review, personal-only fork, correction suggestion
- source old/incoming/user compare
- draft recovery
- keyboard flow
- 390/1024/1440 overflow
