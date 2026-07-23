# UX State Model v1.1

The canonical machine-readable contract is [ux-state-contract-v1-1.json](./ux-state-contract-v1-1.json). User-facing labels below are examples; internal state keys must not appear in UI.

| State | User-facing title | Primary action | Typical next state | Persistence |
|---|---|---|---|---|
| empty | 무엇을 실행 가능한 Flow로 바꿀까요? | `내용 붙여넣기` | typing | none |
| typing | 입력 내용을 확인하고 있어요 | `형식 확인` | detecting | raw draft |
| detecting | 입력 형식과 원문 범위를 찾는 중 | cancel | found/error | raw draft |
| source_found | 원문과 확인한 범위를 찾았어요 | `확보한 범위 확인` | needs_confirmation | source candidate |
| existing_flow_found | 이 원문으로 만든 Flow가 있어요 | case-specific use CTA | personalized/exported/saved | reference only |
| proposal_ready | 첫 Flow 초안을 만들었어요 | `항목 검토` | needs_confirmation | creator draft candidate |
| needs_confirmation | 이 범위와 결과가 맞는지 확인해 주세요 | `이 범위로 계속` | proposal/personalized | confirmation |
| partial_source | 일부만 확인했어요 | `확인한 범위로 검토` | proposal/source import | scope + missing |
| source_import_required | 실제 항목을 더 가져와야 해요 | `권한 있는 원문 가져오기` | detecting/source_found | request metadata |
| rights_review_required | 공개 전 권리 확인이 필요해요 | `검토 내용 확인` | hold/proposal | review record |
| safety_review_required | 실행 전에 안전 검토가 필요해요 | `검토가 필요한 범위 확인` | hold/proposal | review record |
| unsupported | 이 입력은 아직 Flow로 바꿀 수 없어요 | `메모로 보관` | saved/empty | raw memo optional |
| provider_error | 원문 제공 서비스에 연결하지 못했어요 | `나중에 다시 시도` | detecting | safe draft |
| retryable_error | 처리를 마치지 못했어요 | `다시 시도` | prior state | safe draft |
| personalized | 내 값이 반영됐어요 | case-specific export/save | exported/saved | user overlay draft |
| exported | 내 도구로 옮길 준비가 끝났어요 | format-specific open/copy | saved/personalized | export receipt |
| saved_to_my_flow | My Flow에 저장했어요 | `내 Flow 열기` | execution | overlay + run |
| source_updated | 원문 또는 Flow가 업데이트됐어요 | `변경 내용 비교` | personalized/saved | old/new refs + overlay |

## Required state behavior

Every state must provide:

- one clear status title and short reason
- no more than one primary action
- secondary action(s) with lower visual weight
- editable fields only if they can resolve or advance that state
- deterministic next state(s)
- cancel/back behavior that preserves safe input
- explicit persisted data and data that remains ephemeral
- hidden internal diagnostics that never leak taxonomy enum/provider payloads

## No dead ends

- `partial_source`: continue with declared scope or import more
- `source_import_required`: file/import path or candidate save
- `rights_review_required`: inspect review and keep private draft; no public export
- `safety_review_required`: inspect boundary; no executable projection
- `unsupported`: keep as memo or edit input
- `provider_error`: retry later without retyping
- `retryable_error`: retry same action or use a safe fallback

## Transition safeguards

1. `existing_flow_found` is resolved before generating a duplicate proposal.
2. `rights_review_required` and `safety_review_required` cannot transition directly to exported or saved executable state.
3. `source_import_required` cannot contain invented Item titles.
4. `personalized` writes only user overlay.
5. `exported` writes only a receipt; it does not mark Items complete.
6. `source_updated` preserves overlay/run state until explicit reconciliation.
