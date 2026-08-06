# State Model

문법·이슈 유형의 현재 정본은
[text-authoring-contract-v2.json](./text-authoring-contract-v2.json)이다. v1 문서는
저장 초안과 대시 없는 속성을 읽는 호환 상태로만 유지한다.

## 공통 상태 필드

각 상태는 다음을 갖는다.

- 사용자에게 보이는 제목
- 한 줄 상태 설명
- primary action 하나
- secondary action
- 수정 가능한 값
- next state
- cancel/back
- 저장되는 데이터
- 숨기는 내부 정보

## State definitions

| State | 제목 | Primary action | 저장 | Next |
|---|---|---|---|---|
| `empty` | 무엇을 Flow로 만들까요? | 예시 사용 또는 입력 시작 | 없음 | typing |
| `typing` | 내용을 적고 있어요 | 구조 확인 | unsaved raw text | debounce 후 detecting |
| `pasting` | 붙여넣은 범위를 확인하세요 | 구조 확인 | unsaved raw text | detecting |
| `detecting` | 구조를 확인하고 있어요 | 없음 | raw text snapshot | detected/partial |
| `structure_detected` | 항목 구조 | 결과 보기 | parse result | proposal_ready |
| `table_detected` | 표의 행과 열을 확인하세요 | 14개 행으로 보기 | table mapping | proposal_ready |
| `source_link_detected` | 링크를 찾았어요 | 원문 범위 확인 | URL only | source state |
| `existing_flow_found` | 이미 실행 가능한 Flow가 있어요 | 기존 Flow 보기 | lookup result | public preview |
| `proposal_ready` | 실제 결과를 확인하세요 | concrete save/export | draft proposal | personalized/receipt |
| `needs_structure_confirmation` | 두 가지로 나눌 수 있어요 | 선택 적용 | issue decision | structure_detected |
| `needs_value_confirmation` | 결과에 필요한 값이 있어요 | 값 적용 | user override | personalized |
| `partial_parse` | 일부만 구조로 읽었어요 | 읽힌 결과 계속 보기 | raw + mapping + issues | proposal_ready |
| `unsupported_syntax` | 그대로 남겨 둔 문법이 있어요 | 원문으로 유지 | issue | proposal_ready |
| `unknown_property` | 지원하는 속성 이름인지 확인해 주세요 | 원문으로 유지 | raw + issue | proposal_ready |
| `unsupported_nested_item` | 들여쓴 하위 할 일은 아직 지원하지 않아요 | 원문으로 유지 | raw + issue | proposal_ready |
| `source_import_required` | 원문을 가져와야 해요 | 권한 있는 원문 가져오기 | URL/metadata only | detecting |
| `rights_review_required` | 공개 전에 권리 확인이 필요해요 | 개인용으로 계속 | creator issue | personal/creator |
| `safety_review_required` | 안전 검토 전에는 공개할 수 없어요 | 원문과 근거 보기 | safety issue | creator review |
| `conflict_source_vs_user` | 원문과 내 값이 달라요 | 내 값 사용 | override + source | personalized |
| `personalized` | 내 조건이 반영됐어요 | 개인 초안 저장 | personal draft | saved_personal_draft |
| `saved_personal_draft` | 개인 Flow로 저장했어요 | 내 Flow 열기 | personal draft | external route |
| `saved_creator_draft` | 제작자 초안으로 저장했어요 | 검토 준비 계속 | creator draft | creator review |
| `export_preflight` | 가져갈 범위를 확인하세요 | N개 항목 내보내기 | pending receipt | exported |
| `exported` | N개 항목을 만들었어요 | 결과 확인 | receipt | external |
| `source_updated` | 원문에 새 버전이 있어요 | 차이 확인 | source version ref | compare |
| `retryable_error` | 결과를 만들지 못했어요 | 다시 시도 | raw text retained | detecting |
| `provider_error` | 원문 서비스에 연결하지 못했어요 | 텍스트로 계속 | URL/raw retained | typing |
| `recovered_unsaved_draft` | 작성 중 내용을 복구했어요 | 계속 작성 | local draft | typing |

## Complete state contract

아래 `visible`은 제목 아래 한 줄 설명, `editable`은 해당 상태에서 바꿀 수 있는 값,
`persist`는 상태를 벗어나도 보존할 데이터다.

| State | Visible | Secondary | Editable | Next | Back/cancel | Persist | Hidden |
|---|---|---|---|---|---|---|---|
| `empty` | 메모·Markdown·URL을 같은 칸에 입력 | 표 가져오기 | raw text | typing | 이전 route | 없음 | parser/provider |
| `typing` | 작성 중 글자·줄 수 | 입력 지우기 | raw text | detecting | empty | unsaved raw | taxonomy |
| `pasting` | 붙여넣은 범위·형식 후보 | 원문으로 돌아가기 | raw text | detecting | typing | raw snapshot | clipboard metadata |
| `detecting` | 원문을 보존한 채 구조 확인 중 | 취소 | 없음 | detected/error | typing | raw snapshot | parser stages |
| `structure_detected` | Step·Item·issue 수 | 원문 보기 | mapping | proposal_ready | typing | parse result | confidence number |
| `table_detected` | header·row count·mapping | 다른 header 선택 | column mapping | proposal_ready | typing | table cells/mapping | file parser |
| `source_link_detected` | URL·domain·확보 범위 | 텍스트로 계속 | source scope | source state | typing | URL/raw | provider credentials |
| `existing_flow_found` | 기존 Flow 제목·version·count | 새 개인 초안 만들기 | 개인 이름 | public preview | source state | lookup identity | ranking internals |
| `proposal_ready` | primary artifact·count·날짜 범위 | 필요한 항목 조정 | personal values | personalized/preflight | structure | proposal | all ineligible tabs |
| `needs_structure_confirmation` | 충돌한 줄과 두 mapping | 원문으로 유지 | mapping choice | structure_detected | structure | issue resolution | raw confidence |
| `needs_value_confirmation` | 필요한 값과 사용처 | 날짜 없이 계속 가능 여부 | requested value | personalized | proposal | user override | backend field |
| `partial_parse` | 읽은 범위·읽지 못한 범위 | 원문 수정 | unresolved mapping | proposal/typing | typing | raw + partial map | stack/error code |
| `unsupported_syntax` | 그대로 남긴 syntax와 위치 | text로 유지 | resolution role | proposal | typing | raw + issue | parser token |
| `unknown_property` | 알 수 없는 속성 bullet과 위치 | 공식 속성으로 수정 | resolution role | proposal | typing | raw + issue | parser token |
| `unsupported_nested_item` | 지원하지 않는 하위 체크 항목과 위치 | 원문으로 유지 | resolution role | proposal | typing | raw + issue | parser token |
| `source_import_required` | URL만 있고 본문이 없음 | 설명으로 개인 초안 | authorized source input | detecting/typing | source state | URL/metadata | auth internals |
| `rights_review_required` | 공개 제한과 개인용 가능 범위 | source 근거 보기 | ownership lane | personal/creator review | proposal | rights issue | legal automation |
| `safety_review_required` | 검토 전 공개 불가·보존 결과 | 개인용으로 계속 | safety evidence note | personal/review | proposal | safety issue | risk enum |
| `conflict_source_vs_user` | source 값과 내 값 | source 값 사용 | precedence | personalized | item editor | both values | merge algorithm |
| `personalized` | 내 조건 반영 결과 | 다시 조정 | personal fields | saved/preflight | proposal | personal draft | creator fields |
| `saved_personal_draft` | 제목·count·artifact·source 보존 | Markdown 비교 | 없음 | My Flow/open | result | draft revision | storage key |
| `saved_creator_draft` | creator draft·gate 상태 | 편집 계속 | unresolved evidence | creator review | result | creator revision | publish internals |
| `export_preflight` | whole/selected/current·count·loss | format 변경 | scope/artifact | exported | result | pending export | encoder details |
| `exported` | 실제 생성 count·format·loss | Markdown 비교 | 없음 | result/external | result | receipt | blob internals |
| `source_updated` | old/new source version·개인 값 보존 | 나중에 보기 | update selection | compare/result | saved state | both source refs | auto merge |
| `retryable_error` | 실패 행동·보존 데이터 | 텍스트로 계속 | raw text | detecting/typing | previous | raw + last map | stack trace |
| `provider_error` | provider 연결 실패·URL 보존 | 다시 시도 | URL/raw text | typing/detecting | previous | URL/raw | provider response |
| `recovered_unsaved_draft` | 복구 시각·revision·선택 위치 | 초기화 | recovered raw/map | typing/structure | empty after confirm | recovered revision | local key |

## Review gate lifecycle

Review requirement는 source 문구를 자동으로 권리·안전 판정한 결과가 아니다. UI 또는
caller가 creator/suggestion outward use와 명시적 caution 범위를 근거로 만든다.
rights와 safety는 서로 독립된 gate다.

| Gate status | 의미 | 로컬 저장 | Export / creator review / suggestion submit |
|---|---|---|---|
| `required` | 근거를 아직 기록하지 않음 | 허용, `needs_review` | 차단 |
| `evidence_recorded` | 사용자가 확인 근거를 기록함 | 허용 | 다른 blocker가 없으면 허용 |
| `personal_only` | outward use 근거가 없어 개인용으로 제한 | 허용, `needs_review` | 계속 차단 |

- evidence note는 사용자의 기록이며 FlowMe의 검증·승인·법률·안전 판정이 아니다.
- gate는 reopen, undo, local save/load 후에도 status, source snapshot/row, actor,
  evidence를 유지한다.
- 비개인 lane에서 `personal_only`를 선택하면 기존 document를 덮어쓰지 않고 새
  personal document/revision으로 fork한다. rights는 `personal_only`, safety는
  별도 상태를 유지한다.

## Source update lifecycle

| Source state | 의미 | Active result | Outward action |
|---|---|---|---|
| `current` | 적용 대기 중인 incoming source 없음 | 현재 snapshot | 다른 blocker가 없으면 허용 |
| `source_updated` | changed/added/removed source candidate가 stage됨 | 이전 snapshot 유지 | apply/reject 전 차단 |
| `conflict_source_vs_user` | incoming 값이 user-owned 값·구조와 충돌 | 이전 snapshot과 user 값 유지 | apply/reject 전 차단 |

- 외부 watcher/crawler는 없다. 보호 revision이 없는 현재 입력은 짧은 debounce
  뒤 다시 해석한다.
- 저장된 browser-local 초안, correction revision, pending source state가 있는
  document는 자동으로 active result를 바꾸지 않는다. 변경 입력을 멈추면
  incoming snapshot을 stage하고 compare 결정을 요구한다.
- active, incoming, user-owned 값을 함께 보존하고 자동 merge하지 않는다.
- stable entity ID 또는 caller의 explicit match만 허용한다. title similarity와
  order는 match 근거가 아니다.
- compare 대상은 title/detail/completion/schedule,
  resource/source/guide/caution, role/include/nesting/order/Step mapping,
  added/removed다.
- 각 change를 `keep_user / use_incoming / include_added / exclude_added /
  keep_previous / remove_removed` 중 맞는 선택으로 resolve한 뒤 apply한다.
  reject는 incoming candidate를 버리고 기존 active 결과를 유지한다.
- pending source state도 local save/load와 receipt에 남고 lifecycle은
  `needs_review`다.

## Issue decision contract

v2의 `unknown_property`와 `unsupported_nested_item`은 구조 issue다. 두 유형 모두
원문을 유지하며 Item 수를 늘리지 않고, 아래 공통 decision lifecycle을 사용한다.

| Issue state | 사용자 선택/표시 | Outcome | Outstanding | Blocking |
|---|---|---|---|---|
| `open` | 결정 필요 | 없음 | 예 | 원래 issue 값 유지 |
| `held` | 나중에 정하기 | `hold` | 예 | 원래 issue가 blocking이면 유지 |
| `resolved` | 원문에만 남기기 | `keep_source_only` | 아니오 | issue blocker 해제 |
| `resolved` | 할 일로 만들기 | `convert_to_item` | 아니오 | issue blocker 해제 |

- `keep_source_only`는 raw/source row와 issue 이력을 보존하고 Item을 만들지 않는다.
- `convert_to_item`은 해당 source fragment에 연결된 canonical Item을 정확히 하나
  만든다.
- `hold`는 해결 outcome이 아니다. `held` issue는 outstanding count에 남고 기존
  blocking 값을 유지하며, 저장·복구 뒤에도 다시 결정할 수 있어야 한다.
- 각 선택은 revision으로 기록하고 undo하면 직전 issue state와 Item 연결 상태를
  복구한다.

## Error contract

blocked/error 화면은 다음 네 줄을 넘는 설명을 기본 노출하지 않는다.

1. 읽은 범위
2. 읽지 못한 범위
3. 보존된 내용
4. 다음 행동

상세 진단과 provider code는 사용자 화면에 노출하지 않는다.

## Transitions

```text
empty -> typing/pasting -> debounce -> detecting
detecting -> structure_detected/table_detected/source_link_detected
detecting -> partial_parse/unsupported_syntax/unknown_property/unsupported_nested_item/retryable_error
source_link_detected -> existing_flow_found/source_import_required/provider_error
structure_detected -> proposal_ready
issue_open -> issue_resolved/issue_held
issue_held -> issue_resolved
proposal_ready -> needs_value_confirmation/personalized/export_preflight
personalized -> saved_personal_draft/saved_creator_draft
export_preflight -> exported
any_dirty -> recovered_unsaved_draft after reload
saved_or_corrected + changed_input -> source_updated/conflict_source_vs_user
source_updated/conflict_source_vs_user -> current after apply/reject
review_required -> evidence_recorded/personal_only/reopened
non_personal + personal_only -> new saved_personal_draft fork
```

## Undo and recovery

- structural correction은 local command history에 기록한다.
- undo는 split/merge/reorder/`align_source_order`/role/date edit와 issue decision마다
  제공한다.
- save 이후 undo는 새 revision으로 기록한다.
- crash/reload recovery는 raw text, latest parse, corrections, selected Item,
  issue decision, held/outstanding, review gate, pending source update 상태를
  복구한다.
- receipt와 execution run은 authoring undo 대상이 아니다.
