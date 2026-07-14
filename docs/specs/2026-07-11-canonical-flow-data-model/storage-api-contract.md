# Canonical Flow Storage and Backend API Contract v1

**Date:** 2026-07-11<br>
**Status:** Approved implementation contract; runtime and database not started<br>
**Schema:** `flowme-canonical-flow-v1`<br>
**Related:** [Canonical model spec](./spec.md), [TypeScript reference contract](./canonical-flow-contract.ts), [URL-first AI draft gate](../2026-07-11-url-first-ai-draft-gate/spec.md)

## 1. Purpose

이 문서는 `CanonicalFlowContent`를 PostgreSQL/Supabase에 저장하고 URL intake, source extraction, draft generation, user review, My Flow 저장, version update, export projection까지 연결하기 위한 서버 계약이다.

핵심 경계는 다음과 같다.

```text
immutable source evidence
  -> immutable published content version
  -> temporary conversion proposal
  -> private user copy overlay
  -> private execution run state
  -> destination projection (ICS/checklist/sheet/memo)
```

- ICS, Markdown, CSV, XLSX는 저장 정본이 아니다. effective Item을 읽어 생성하는 projection이다.
- `Item`은 최소 상태 보유 실행 단위다. `Step`은 grouping이며 completion state를 소유하지 않는다.
- source evidence, published content, internal review, user overlay, run state를 한 JSON이나 한 테이블에 섞지 않는다.
- published content와 finalized source snapshot은 immutable이다.
- 사용자 수정과 실행 기록은 source/content update가 자동으로 덮어쓰지 않는다.
- 첫 서버 구현은 현재 localStorage 경로를 제거하지 않고 feature flag 뒤에서 진행한다.

## 2. Current Compatibility Boundary

현재 브라우저 저장은 다음 종류로 분산되어 있다.

- bundles: `flow_builder_mvp_bundles_v11`
- per-Flow execution: checks, item state, anchor, comparison, workbench, reaction
- saved content: `flow:saved:*`, `flow:map:saved:*`, `flow:map:persistence:*`
- My Flow overlays: item drafts, date overrides, Step-item checks, hidden state
- run history: `flow:run-registry:*`, completion snapshots and feedback
- URL intake: `flow:url-first:supply-candidates`

기존 `flow:map:saved:*` compatibility snapshot과 `flow:map:persistence:*` V1 productization record는 서버 전환 전까지 유지한다. 새 서버 schema가 정본이 된 뒤 snapshot은 서버 응답에서 파생할 수 있지만, parity와 rollback이 증명되기 전에는 삭제하지 않는다.

과거 contract의 `Step = minimum saved/exportable row`는 compatibility bridge로만 남긴다. 새 storage와 API에서는 다음처럼 매핑한다.

```text
FlowSection -> Canonical Step
FlowItem    -> Canonical Item
FlowItemDetail -> Memo / Field / SourceRef
```

기존 Step bridge의 prose를 기계적으로 여러 Item으로 분할하지 않는다. 명시적인 source row이며 독립적으로 check/decide/record할 가치가 있는 행만 Item이 된다.

## 3. PostgreSQL Conventions

### 3.1 General conventions

- primary key는 UUID를 사용한다.
- 모든 mutable row에는 `revision bigint NOT NULL DEFAULT 1`, `created_at`, `updated_at`을 둔다.
- API는 UUID를 노출하고 slug는 lookup alias로만 사용한다.
- lifecycle enum은 PostgreSQL enum 대신 `text + CHECK`로 시작한다. 값 추가가 migration-blocking DDL이 되지 않게 한다.
- timestamp는 `timestamptz`, source-defined local date는 `date`, local time은 `time`을 사용한다.
- canonical JSON은 `jsonb`로 보존하지만, owner, version, state, ordering, source relation, schedule eligibility처럼 조회/무결성에 필요한 값은 typed column으로 index한다.
- canonical URL uniqueness는 정규화 함수의 version과 함께 관리한다. URL canonicalization 규칙이 바뀌면 기존 source identity를 조용히 합치지 않는다.
- 사용자 입력과 source body는 application log에 남기지 않는다.

### 3.2 Version vocabulary

서로 다른 버전을 한 `version` 문자열로 합치지 않는다.

| Field | Meaning |
| --- | --- |
| `schema_version` | canonical contract 호환성, 예: `flowme-canonical-flow-v1` |
| `version_no` | 한 content identity 안의 monotonic published/draft revision |
| `content_hash` | canonical JSON의 deterministic hash |
| `snapshot_no` / `snapshot_hash` | source extraction version |
| `prompt_version` | LLM instruction contract |
| `validator_version` | runtime validation contract |
| `revision` | mutable user/request row의 optimistic concurrency token |

### 3.3 Canonical hash contract

Content hash는 구현체의 object insertion order나 공백에 의존하면 안 된다.

1. top-level `contentHash`, `contentId`, `version`, `lifecycleStatus`, `createdAt`, `updatedAt`을 제외한 canonical content payload를 만든다.
2. top-level entity collection은 각 primary ID로 정렬하고, set 성격의 tag/enum/ref 배열은 문자열 오름차순으로 정렬한다. 반면 `bundle.flowIds`, `flow.stepIds`, `step.itemIds`, decision/Field option, source-row order처럼 표시·실행 의미가 있는 배열은 작성 순서를 유지한다.
3. RFC 8785 JSON Canonicalization Scheme(JCS)로 직렬화한다.
4. UTF-8 bytes에 SHA-256을 적용한다.
5. 소문자 hex에 `sha256:` prefix를 붙인다.

동일한 semantic payload는 draft/publish 시각이나 version label이 달라도 같은 hash를 가져야 한다. source descriptor, snapshot/row data, caution, schedule, order, projection profile처럼 사용자 실행·신뢰·export 의미를 바꾸는 값은 payload에 포함한다. `item_hash`는 같은 방식으로 Item과 그 Item이 참조하는 Field, Memo, SourceRef의 정렬된 subdocument를 hash한다. hash algorithm 변경은 `schema_version` 또는 별도 `hash_version` 변경 없이 조용히 적용하지 않는다.

## 4. Database Schema

아래 이름과 필드는 v1 migration의 기준이다. 구현 시 모든 FK에는 명시적인 delete policy를 둔다. source/content/user history는 기본적으로 `RESTRICT`; ephemeral proposal child만 parent delete에 `CASCADE`를 허용한다.

### 4.1 Source evidence plane

#### `sources`

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `id` | uuid | PK |
| `canonical_url` | text | NOT NULL |
| `canonicalization_version` | text | NOT NULL |
| `original_url` | text | first submitted URL; canonical URL로 대체하지 않음 |
| `title` | text | nullable until fetched |
| `source_type` | text | official, creator_experience, reference, user_supplied |
| `publisher` | text | nullable |
| `locale` | text | nullable |
| `rights_status` | text | allowed, needs_review, blocked |
| `risk_level` | text | canonical risk vocabulary |
| `created_at`, `updated_at` | timestamptz | required |

Unique index:

```sql
create unique index sources_canonical_url_uq
  on sources (canonicalization_version, canonical_url);
```

Redirect/alias URL은 `source_url_aliases(source_id, url, alias_kind, observed_at)`에 저장하며 normalized alias URL도 unique 처리한다. canonical collision은 자동 merge하지 않고 internal review row를 만든다.

#### `source_snapshots`

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `id` | uuid | PK |
| `source_id` | uuid | FK `sources` |
| `snapshot_no` | bigint | source 안에서 monotonic |
| `status` | text | fetching, extracted, partial, unavailable, blocked |
| `final_url` | text | required after fetch |
| `fetched_at`, `checked_at` | timestamptz | nullable until available |
| `content_hash` | text | required when finalized |
| `extractor_version` | text | required when finalized |
| `metadata_json` | jsonb | title/byline/content-type/headers의 allowlisted subset |
| `body_object_path` | text | private object storage path, optional |
| `retention_until` | timestamptz | optional raw body TTL |
| `finalized_at` | timestamptz | non-null이면 immutable |

Constraints:

```sql
unique (source_id, snapshot_no)
unique (source_id, content_hash)
```

raw HTML/full extracted text는 기본 장기 보존 대상이 아니다. source rows, locator, hash는 보존하되 raw body는 rights/privacy 결정에 따라 private bucket과 TTL을 사용한다.

#### `source_rows`

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `id` | uuid | PK and canonical `sourceRowId` |
| `snapshot_id` | uuid | FK `source_snapshots` |
| `stable_key` | text | snapshot 내부 stable locator key |
| `row_type` | text | date, offset, check, table_row, procedure, resource, reference |
| `title`, `detail`, `locator` | text | evidence payload |
| `order_index` | integer | non-negative |
| `row_hash` | text | deterministic row hash |

`(snapshot_id, stable_key)`와 `(snapshot_id, order_index)`를 unique 처리한다. finalized snapshot의 row는 UPDATE/DELETE하지 않는다.

### 4.2 Canonical content plane

#### `flow_contents`

안정적인 content identity다. Bundle/Flow Map 또는 single Flow package 모두 하나의 `CanonicalFlowContent` identity를 사용한다.

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `id` | uuid | PK and canonical `contentId` |
| `slug` | text | nullable unique public alias |
| `owner_kind` | text | system, creator, user |
| `owner_id` | uuid | nullable for system content |
| `visibility` | text | private, unlisted, public |
| `current_published_version_id` | uuid | nullable FK added after version table |
| `created_at`, `updated_at` | timestamptz | required |

#### `flow_content_versions`

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `id` | uuid | PK |
| `content_id` | uuid | FK `flow_contents` |
| `version_no` | bigint | monotonic per content |
| `display_version` | text | human-facing optional label |
| `schema_version` | text | exact canonical schema version |
| `lifecycle_status` | text | draft, in_review, published, retired |
| `canonical_json` | jsonb | complete validated `CanonicalFlowContent` |
| `content_hash` | text | deterministic canonical hash |
| `primary_snapshot_id` | uuid | nullable FK `source_snapshots` |
| `created_by` | uuid | nullable for migration/system |
| `generation_run_id` | uuid | nullable, added after generation table |
| `created_at`, `published_at`, `retired_at` | timestamptz | lifecycle timestamps |

Constraints:

```sql
unique (content_id, version_no)
unique (content_id, content_hash)
check ((lifecycle_status = 'published') = (published_at is not null))
```

published row는 immutable trigger로 UPDATE/DELETE를 차단한다. retire는 기존 row 수정이 아니라 `flow_contents.current_published_version_id`를 새 published version으로 옮기고 lifecycle event를 기록한다. 법적 삭제가 필요한 경우 별도 privileged erasure workflow를 사용한다.

#### Stable identity and indexed projections

`canonical_json`이 lossless 정본이고 아래 테이블은 transaction 안에서 함께 생성하는 typed index다.

##### `flow_nodes`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | canonical bundle/flow/step/item/field/memo ID |
| `content_id` | uuid | FK |
| `node_kind` | text | bundle, flow, step, item, field, memo |
| `stable_key` | text | stable across content versions |
| `created_in_version_no` | bigint | lineage |
| `retired_in_version_no` | bigint | nullable; identity는 삭제하지 않음 |

Unique: `(content_id, node_kind, stable_key)`.

##### `flow_version_flows`

`content_version_id`, `flow_node_id`, `bundle_node_id`, title, `life_area`, `planning_pattern`, `primary_artifact`, `risk_level`, `primary_source_id`, `order_index`를 저장한다.

##### `flow_version_steps`

`content_version_id`, `step_node_id`, `flow_node_id`, title, `grouping_hint`, `order_index`를 저장한다. Step에는 completion state column을 두지 않는다.

##### `flow_version_items`

`content_version_id`, `item_node_id`, `step_node_id`, title, intent, `completion_json`, `schedule_json`, `order_index`, `projection_mask`, `item_hash`를 저장한다. `(content_version_id, item_node_id)`가 PK이며 `order_index >= 0`이다.

##### `flow_version_fields`

`content_version_id`, `field_node_id`, owner node, key, label, value type, purposes, value source, required/sensitive, definition JSON, order를 저장한다.

##### `flow_version_memos`

`content_version_id`, `memo_node_id`, scope node, kind, title, text, order를 저장한다. user-entered memo value는 이 테이블에 저장하지 않는다.

#### `source_refs` and `source_ref_rows`

`source_refs`는 content version과 entity를 source evidence에 연결한다.

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | canonical sourceRefId |
| `content_version_id` | uuid | FK |
| `entity_kind`, `entity_node_id` | text, uuid | flow/step/item/field/memo target |
| `relation` | text | derived_from, supports, caution, boundary |
| `support_level` | text | direct, creator_interpretation, user_request, inferred_draft |
| `note` | text | optional |

`source_ref_rows(source_ref_id, source_row_id, order_index)`가 다대다 row relation을 저장한다.

Publish gate는 다음을 거부한다.

- source row가 없는 `direct` 또는 `creator_interpretation` ref
- `inferred_draft` Item
- `user_request`가 아닌데 source ref가 없는 Item
- `rights_status=blocked` source
- unresolved sensitive review

#### `review_records`

Internal only table이다.

- `id`, `content_version_id`
- readiness, review status
- eight quality score/comment JSON
- omitted source rows and reasons
- hard fails, rights decision, risk decision
- reviewer identity and reviewed timestamp

review record는 public content JSON, My Flow response, export projection에 포함하지 않는다.

#### `content_lifecycle_events`

publish/retire/update pointer change의 append-only audit log다. actor, action, from/to version, reason, timestamp를 저장한다.

### 4.3 Conversion and generation plane

#### `conversion_requests`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | requestId |
| `owner_id` | uuid | authenticated user; internal canary may use allowlisted service owner |
| `source_id`, `source_snapshot_id` | uuid | nullable until resolved |
| `submitted_url` | text | private |
| `canonical_url` | text | lookup key |
| `user_title`, `user_memo` | text | private; length limited |
| `locale`, `risk_level` | text | request contract |
| `status` | text | ready, generating, proposal, partial, failed, reviewed, saved |
| `phase` | text | idle, lookup, fetch, extract, generate, validate, persist |
| `terminal_reason`, `error_code` | text | nullable |
| `current_generation_run_id`, `current_proposal_id` | uuid | nullable |
| `overlay_revision`, `reviewed_revision`, `revision` | bigint | concurrency/save gate |
| `idempotency_key` | text | unique per owner |
| timestamps | timestamptz | created, updated, cancelled, saved |

Unique: `(owner_id, idempotency_key)`. Canonical URL alone is not unique because one user may intentionally request a new private draft; lookup reuse is a product decision, not destructive request dedupe.

#### `generation_runs`

- request and attempt identity; `(request_id, attempt_no)` unique
- `generation_kind`: llm or deterministic_fallback
- provider, model, prompt/contract/validator/extractor version
- queued/started/completed timestamps, latency, token/cost totals
- result status and normalized error code
- request/input/output hashes; raw provider response is not durable by default
- optional worker lease owner and expiry for async-compatible processing

#### `conversion_proposals`

- immutable validated proposal JSON
- source snapshot ID and generation run ID
- proposal schema/validator version and checksum
- validation result and incomplete reason
- `supersedes_proposal_id`

#### `conversion_draft_overlays`

저장 전 사용자 수정본이다. request, proposal, revision, overlay JSON, edited timestamp를 저장한다. proposal raw data를 수정하지 않는다.

#### `api_idempotency_records`

owner, endpoint scope, idempotency key, request hash, response status/body reference, resource ID, expiry를 저장한다. 같은 key와 다른 request hash는 `409 idempotency_conflict`다.

### 4.4 Private user execution plane

#### `user_flow_copies`

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | uuid | copyId |
| `owner_id` | uuid | FK Auth user |
| `content_id`, `pinned_version_id`, `flow_node_id` | uuid | immutable base reference |
| `source_request_id` | uuid | nullable provenance |
| `title_override` | text | nullable |
| `setup_values` | jsonb | validated Field values |
| `preferred_artifact` | text | optional UI preference, not canonical type |
| `status` | text | active, archived, deleted |
| `revision` | bigint | optimistic concurrency |
| timestamps | timestamptz | required |

한 사용자는 같은 content/Flow를 여러 번 저장할 수 있으므로 `(owner_id, content_id)`를 unique 처리하지 않는다.

#### `user_item_overlays`

Composite PK `(copy_id, item_node_id)`.

- base version ID and base item hash
- included boolean
- title override
- schedule override JSON or explicit null/remove marker
- private memo
- field override values
- revision and timestamps

source URL/row/hash, published caution, risk level은 overlay column으로 제공하지 않는다.

#### `execution_runs`

- copy, pinned content version
- active/completed/archived status
- anchor/setup snapshot
- previous run and reuse mode
- overlay snapshot hash
- started/completed timestamps

`user_flow_copies`당 active run은 하나만 허용하는 partial unique index를 둔다.

```sql
create unique index one_active_run_per_copy
  on execution_runs (copy_id)
  where status = 'active';
```

#### `execution_item_states`

Composite uniqueness: `(run_id, item_node_id, occurrence_key)`.

- state: pending, done, skipped, held
- decision value, field values, user memo
- completed/updated timestamp
- occurrence-specific schedule override
- revision

content update는 이 row를 수정하거나 삭제하지 않는다.

#### `version_reviews` and `version_review_decisions`

`version_reviews`는 copy, from/to content version, status, sensitive flag, conflict counts, created/resolved timestamps를 저장한다.

`version_review_decisions`는 stable Item별 다음 선택을 저장한다.

- `use_latest`
- `keep_personal`
- `retain_removed`
- `include`
- `exclude`

각 결정은 conflict field(title, memo, schedule, source), prior item hash, new item hash, preserved overlay snapshot을 함께 기록한다.

#### `user_feedback`

private completion reflection과 아직 제출되지 않은 source correction draft를 구분한다. source correction은 명시적 submit 전에는 internal review queue로 이동하지 않는다.

### 4.5 Local import plane

#### `local_import_batches`

- owner, client installation ID
- backup format/schema version
- backup checksum
- status: previewed, importing, committed, rollback_pending, rolled_back, conflict
- manifest/counts/warnings JSON
- created/committed/rolled-back timestamps

Unique: `(owner_id, client_installation_id, backup_checksum)`.

#### `local_import_records`

batch, legacy key, legacy value hash, target table/ID, import outcome, warning을 저장한다. raw localStorage value는 migration 완료 후 장기 audit에 보존하지 않아도 된다.

서버 row에는 nullable `import_batch_id`와 `imported_at` provenance를 둔다. import 후 사용자가 서버에서 수정한 row는 자동 rollback 삭제 대상이 아니다.

## 5. Immutability and Publish Transaction

### 5.1 Immutable rows

- finalized `source_snapshots`와 그 `source_rows`
- published `flow_content_versions`와 typed version projections
- `conversion_proposals`
- completed `generation_runs`
- completed execution run의 completion snapshot/history
- lifecycle event records

수정이 필요하면 새 snapshot/version/proposal/run을 만든다.

### 5.2 Publish transaction

Publish service는 한 transaction에서 다음을 수행한다.

1. canonical JSON runtime validation
2. content hash 재계산과 제출 hash 비교
3. node ID와 parent/order/reference 무결성 확인
4. 모든 publishable Item의 source gate 확인
5. rights/risk/review gate 확인
6. immutable version insert
7. typed projection rows insert
8. `current_published_version_id` conditional update
9. lifecycle event append

`current_published_version_id`는 caller가 읽은 prior pointer와 일치할 때만 변경한다. 다른 publish가 먼저 완료됐으면 `409 version_conflict`를 반환한다.

### 5.3 Three-way update resolution

사용자 copy update는 다음 세 값을 비교한다.

```text
base version saved by user
new published version
user overlay / execution state
```

- unchanged Item은 새 version으로 연결 가능하지만 자동 apply하지 않는다.
- added Item은 기본 `pending review`; 자동 포함하지 않는다.
- changed Item은 title/detail/schedule/destination/source conflict를 나눈다.
- removed Item에 overlay나 execution state가 있으면 retained/orphaned로 보존한다.
- risk/source/caution change와 sensitive content는 항상 manual review다.
- completion, skip, record, decision state는 version apply가 변경하지 않는다.

## 6. Row Level Security and Grants

### 6.1 Public read surface

브라우저가 base table을 직접 읽지 않도록 sanitized view/RPC를 제공한다.

- public/unlisted published content의 canonical user payload
- source title, canonical/original URL, source type, checked date, risk/caution처럼 사용자에게 필요한 trust fields
- public creator profile에 허용된 metadata

다음은 anonymous/authenticated client에게 직접 grant하지 않는다.

- raw source body/object path and full snapshot metadata
- review records and omitted-row rationale
- conversion request inputs, provider metadata, generation cost/error detail
- other users' overlays/runs/feedback/import manifests
- draft/in-review content versions

### 6.2 Ownership policies

Private tables의 기본 policy는 아래 조건이다.

```sql
using (owner_id = auth.uid())
with check (owner_id = auth.uid())
```

child table은 parent ownership `exists` policy를 사용한다. 예:

```sql
create policy user_item_overlays_owner_all
on user_item_overlays
for all
using (
  exists (
    select 1 from user_flow_copies c
    where c.id = copy_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from user_flow_copies c
    where c.id = copy_id and c.owner_id = auth.uid()
  )
);
```

### 6.3 Server-only writes

source fetch/extraction, generation result, review, publish, migration administration은 Next.js server route/service에서만 수행한다. Supabase service role key와 LLM provider key는 server-only 환경변수다. service role을 client bundle, public error, logging metadata에 포함하지 않는다.

내부 reviewer 권한은 v1에서 client JWT custom role에 의존하지 않고 authenticated internal route + server authorization으로 제한한다. reviewer UI를 직접 Supabase base table에 연결하지 않는다.

## 7. API Conventions

- Base path: `/api/v1`
- JSON mutation은 `Content-Type: application/json`
- 모든 mutation은 `Idempotency-Key`를 지원한다.
- mutable resource response는 `ETag: \"<revision>\"`를 반환한다.
- update는 `If-Match` 또는 body `expectedRevision`을 요구한다.
- error body는 `application/problem+json`을 사용한다.

```json
{
  "type": "https://flowme.example/problems/revision-conflict",
  "title": "The draft changed before this request was saved.",
  "status": 409,
  "code": "revision_conflict",
  "requestId": "..."
}
```

권장 status code:

- `400` malformed request
- `401/403` authentication/authorization
- `404` resource not visible to caller
- `409` revision, version, state, or idempotency conflict
- `422` schema/source/risk gate failure
- `429` rate/cost limit
- `503` extractor/provider temporary failure; deterministic fallback availability를 body에 표시

## 8. URL Intake and Generation API

### `POST /api/v1/url-intakes`

Request:

```json
{
  "url": "https://example.com/article",
  "userTitle": "이사 준비",
  "userMemo": "이번 달 말 이사",
  "anchorDate": "2026-08-31",
  "locale": "ko-KR"
}
```

Behavior:

1. validate and canonicalize URL
2. lookup existing published conversion first
3. return `hit`, `needs_review`, or `miss`
4. create/reuse idempotent request for non-hit flow
5. do not start generation without explicit generate action

Response includes request ID, lookup result, generation UX status, allowed actions, and existing Flow reference when hit. Duplicate idempotency key returns the original result; canonical URL duplicate without the same key returns lookup reuse guidance, not silent request deletion.

### `GET /api/v1/url-intakes/{requestId}`

Returns lookup, UX status, backend phase, allowed actions, proposal reference, revision, and user-safe failure/fallback information. Provider/model/cost metadata is internal-only.

### `POST /api/v1/url-intakes/{requestId}/generate`

Preconditions:

- status `ready` or explicitly retryable `failed`
- feature flag enabled
- source/privacy/risk gate passed
- no active attempt
- rate/cost limit available

The contract is async-compatible. It may process inline in the first canary, but returns `202` when work continues and the client polls the request. It must not require an API change when a worker/queue is introduced later.

### `POST /api/v1/url-intakes/{requestId}/cancel`

Cancels the current attempt conditionally. Existing contract behavior is preserved: user input and prior proposal remain, UX status returns to `ready`, and `terminal_reason=cancelled`. Late provider output cannot attach to a cancelled/non-current attempt.

### `GET /api/v1/url-intakes/{requestId}/proposal`

Returns validated proposal plus current user overlay and revision. Raw provider response is not returned.

### `PATCH /api/v1/url-intakes/{requestId}/overlay`

Edits inclusion, title, schedule, memo, and allowed Field values only. It increments `overlay_revision` and request `revision`. Any edit after review invalidates review by making `reviewed_revision != overlay_revision`.

### `POST /api/v1/url-intakes/{requestId}/review`

Records explicit user review against `expectedOverlayRevision`. At least one included Item and all source/risk/save gates must pass. Sets `reviewed_revision = overlay_revision` and status `reviewed`.

### `POST /api/v1/url-intakes/{requestId}/save`

Single transaction:

1. lock request row
2. require status `reviewed`
3. require `reviewed_revision = overlay_revision`
4. validate proposal and overlay again
5. create private content/version when no published base exists, or pin existing published version
6. create `user_flow_copy` and overlays
7. create initial active execution run
8. set request `saved` and resource ID
9. persist idempotent response

It never publishes content, marks Item done, or writes an external calendar.

## 9. My Flow, Version, and Projection API

### `GET /api/v1/my-flows`

Returns caller-owned copy summaries and effective progress. Internal review/generation fields are excluded.

### `GET /api/v1/my-flows/{copyId}`

Returns pinned version, effective Flow/Step/Item content, overlay, active run state, update availability, and ETag revision.

### `PATCH /api/v1/my-flows/{copyId}`

Allows personal title, setup values, Item inclusion, allowed schedule/memo/Field overrides, and archive state. It does not edit published source/content.

### `PATCH /api/v1/my-flows/{copyId}/runs/{runId}/items/{itemId}`

Updates pending/done/skipped/held, decision, record Fields, user memo, or occurrence override with optimistic concurrency.

### `POST /api/v1/my-flows/{copyId}/runs/{runId}/complete`

Freezes completion snapshot and conditionally closes the active run. Double completion with the same idempotency key returns the original completed run.

### `POST /api/v1/my-flows/{copyId}/runs`

Starts reuse/new-anchor/reviewed-version run. Only one active run per copy. Fixed personal dates require explicit keep/reset policy.

### `POST /api/v1/my-flows/{copyId}/version-reviews`

Creates or returns a deterministic three-way diff for pinned vs current published version and the user's overlay/state.

### `POST /api/v1/my-flows/{copyId}/version-reviews/{reviewId}/apply`

Requires an explicit decision for every relevant added/changed/removed conflict. Apply updates the pinned version and overlays in one transaction; execution history is unchanged.

### `GET /api/v1/my-flows/{copyId}/projection`

Query:

```text
target=calendar|checklist|todo|sheet|memo
format=ics|plain_text|markdown|csv|tsv|xlsx
runId=<optional>
```

Projection reads exactly:

```text
pinned immutable version
  + reviewed version resolution
  + saved copy overlay
  + selected run state
  + occurrence override
```

The response/export must not contain review score, provider/model, raw prompt/response, extraction internals, or rights-review notes. ICS UID is stable Item ID + occurrence key, not title.

## 10. Generation State Machine

UX status and backend phase are separate columns.

```text
ready
  -> generating
       -> proposal
       -> partial
       -> failed
proposal|partial
  -> reviewed
       -> saved
```

Backend phase may progress through `lookup -> fetch -> extract -> generate -> validate -> persist` while UX remains `generating`.

Allowed transitions:

| From | To | Required condition |
| --- | --- | --- |
| ready | generating | explicit action, gates and limits pass |
| generating | proposal | complete valid proposal |
| generating | partial | partial proposal with `incompleteReason` |
| generating | failed | normalized failure; no auto-save |
| generating | ready | user cancellation |
| proposal/partial | reviewed | explicit review of current overlay revision |
| reviewed | proposal/partial | any later overlay edit invalidates review |
| reviewed | saved | atomic save gate passes |
| failed | ready | explicit retry or deterministic fallback selection |

`saved` is terminal for that conversion request. Regeneration creates a new request or explicit revision request; it does not mutate the saved result.

Sensitive gate failure uses `failed + error_code=sensitive_gate_failed`; it does not invent a separate public lifecycle state. Offline is detected before generation and preserves local input.

## 11. Concurrency, Idempotency, and Worker Safety

### Optimistic concurrency

- mutable resources expose monotonically increasing `revision`.
- update SQL uses `... where id = $id and revision = $expected` and increments revision.
- affected row count 0 returns `409 revision_conflict`.
- last-write-wins is prohibited for overlay, run state, version review, and save.

### Idempotency

- every POST/PATCH mutation accepts `Idempotency-Key`.
- identical key + identical request hash returns stored response.
- identical key + different hash returns `409 idempotency_conflict`.
- save, complete run, import commit, publish, and version apply must be transactionally idempotent.

### Generation attempt safety

- `(request_id, attempt_no)` unique.
- request row points to one `current_generation_run_id`.
- provider result is accepted only when attempt is current and request remains `generating`.
- worker claims use conditional lease update; expired lease may be reclaimed.
- retry creates a new attempt; it does not overwrite completed run metadata.
- provider retry is not automatic unless the retry policy and cost budget explicitly allow it.

### Canonical URL races

Source insertion uses the unique canonical URL index. A race loser re-reads the existing source. Conflicting canonicalization versions or redirect ownership do not auto-merge source histories.

## 12. localStorage Migration

### 12.1 Rollout modes

```text
local -> shadow-write -> server-primary
```

- `local`: current behavior only.
- `shadow-write`: local remains read authority; server receives idempotent shadow mutations and parity is measured.
- `server-primary`: server is write/read authority; local data remains recovery/cache input until explicit cleanup.

Do not operate permanent dual-master storage. After server-primary, a mutation is successful only after server commit; local mirror is a cache and cannot silently overwrite a newer server revision.

### 12.2 Import flow

1. build current allowlisted backup v1
2. validate size, entry count, schema version, and keys client-side and server-side
3. upload to `/api/v1/local-imports/preview`
4. show counts, unmapped keys, collisions, and copies/runs that will be created
5. explicit `/commit` with idempotency key
6. import in one batch transaction or resumable batch with per-record outcomes
7. compare imported counts and effective projections
8. retain local data and downloadable backup

### 12.3 Legacy mapping

| Legacy key | Server target |
| --- | --- |
| `flow_builder_mvp_bundles_v11` | existing published content reference or private imported content/version |
| `flow:saved:*` | `user_flow_copies` |
| `flow:map:saved:*` | copy/base version and compatibility metadata |
| `flow:map:persistence:*` | base Step contracts migrated to canonical content/item refs and personal overlay |
| `flow:*:anchorDate` | copy setup value and active run anchor snapshot |
| `flow_builder_mvp_checks_*` | legacy-import execution Item state |
| `flow_builder_mvp_item_state_*` | include/skip state; preserve `excluded_on_start` provenance |
| `flow:my-flow:step-item-checks` | Item/Field completion data after explicit key mapping |
| `flow:my-flow:item-drafts` | user Item overlay or run-private value by key scope |
| `flow:my-flow:date-overrides` | Item/occurrence schedule override |
| comparison/workbench/reaction keys | typed Field/run values; unrecognized shape in `legacy_payload` |
| `flow:run-registry:*` | execution runs and frozen completion history |
| `flow:my-flow:completion-feedback:*` | private reflection/source correction draft |
| `flow:url-first:supply-candidates` | conversion request with `legacy_manual_candidate` provenance |

Unknown or internal browser keys are rejected, not imported.

### 12.4 Collision rules

- identical backup checksum is idempotent.
- published seed/bundle identity maps to the current server content only after stable ID/slug mapping succeeds.
- local-only authored content becomes a private imported content/version.
- existing server copy and local copy are not destructively merged in v1; create a separately labelled imported copy unless they have an identical origin/hash.
- local run and existing server run stay separate; completion state is never unioned into an unrelated run.
- malformed/ambiguous keys are reported and preserved in the local backup rather than guessed.

### 12.5 Rollback

- local keys are never deleted automatically by migration.
- application rollback flips feature flag back to `local` without DB rewrite.
- DB migrations are additive; no table/column drop in the same release as introduction.
- imported rows keep `import_batch_id`.
- rollback may soft-delete untouched batch-owned rows.
- if a row has a later server mutation, batch rollback stops with `conflict` and preserves the row.
- production DB rollback is forward-fix/additive migration, not destructive down migration.
- import UI always keeps a pre-import downloadable backup.

## 13. Deployment and Secrets

Current runtime has no Supabase or LLM dependency. The first implementation package should add only what the selected lane needs:

- Supabase server/browser client and SSR auth adapter
- one runtime schema validator used by API, worker, fixtures, and import
- SQL migrations under `supabase/migrations/`
- repository interfaces with local and server adapters
- fake generation provider before a real provider SDK

Environment boundary:

- public Supabase URL/anon key only when browser auth/read requires them
- Supabase service role key server-only
- LLM provider key server-only
- feature flags and cost/timeout limits server-controlled
- no secret, source body, memo, or provider raw response in public env or logs

Next.js route handlers that access DB/provider use Node runtime. Production persistence must not write repo files or depend on the current internal review route's filesystem behavior. Database migrations run as an explicit deploy step before compatible application code becomes server-primary; `next build` must not mutate a database.

The contract is queue-compatible but does not require a queue in the first canary. Real provider integration remains gated until retention/privacy/security review, runtime validation, fake-provider fixtures, fallback tests, and cost/latency limits pass.

## 14. QA Contract

### 14.1 Schema and content validation

- compile the TypeScript reference contract in strict mode
- validate every canonical JSON at API and persistence boundary
- assert stable IDs, parent references, order uniqueness, source refs, Field/Memo ownership
- assert published Item source gate and no `inferred_draft`
- assert Step has no execution state
- assert no invented schedule for unscheduled Item
- recalculate and verify deterministic content/snapshot/item hashes

### 14.2 SQL and RLS

- migration applies to empty DB and representative prior schema
- FK, unique, check, partial unique, immutable trigger tests
- anonymous can read only sanitized published content
- user A cannot read/write user B request, copy, overlay, run, feedback, or import batch
- authenticated normal user cannot read draft/review/provider/source-body data
- service write path remains server-only
- direct table access and RPC/view paths have the same visibility boundary

Use pgTAP or equivalent SQL integration tests plus API-level authorization tests.

### 14.3 API state and failure tests

- every allowed and forbidden transition
- no proposal/partial/review state auto-saves to My Flow
- overlay edit invalidates reviewed revision
- timeout, empty, partial, invalid date, duplicate, cancel, offline, sensitive gate fail
- deterministic fallback creates a normal reviewed proposal path, not a bypass save
- malformed and oversized input
- consistent problem codes without leaking provider/raw input

### 14.4 Concurrency and idempotency tests

- duplicate URL intake with same key returns same request
- same key/different body returns conflict
- concurrent source canonical insert produces one source
- concurrent overlay edits produce one success and one 409
- double save creates one copy/run
- double completion creates one completed snapshot
- late provider response after cancel/new attempt is ignored
- concurrent publish pointer update detects conflict
- one active run partial index holds under race

### 14.5 Version precedence tests

Golden cases cover unchanged, added, changed, removed, sensitive, and source-only changes.

Assert that:

- personal title/date/memo/include selection wins in effective view and export
- source URL/row/hash/risk/caution cannot be removed by overlay
- added Item requires explicit include decision
- removed Item with state remains retained/orphaned
- execution completion/decision/record state survives version apply
- every unresolved conflict blocks apply
- export uses the newly pinned version only after successful resolution

### 14.6 Migration and rollback tests

- bundle keys v3 through v11 and backup schema v1 fixtures
- current seed replacement plus local-only draft preservation
- invalid JSON, unsupported version, unknown key, too many entries, oversized backup
- preview is read-only
- commit is idempotent and count-reconciled
- partial/import failure leaves no untracked half-imported state
- rollback of untouched batch succeeds
- rollback with later server edit reports conflict and preserves data
- local fallback remains usable after server/API failure
- no local key is deleted by automatic migration

### 14.7 Projection parity tests

For all positive golden fixtures and selected current source-backed content:

- one effective content input drives calendar/checklist/todo/sheet/memo
- ICS UID remains stable across title edit
- recurrence/window semantics are preserved
- unscheduled Item emits no ICS event
- checklist keeps Step grouping and Item order
- sheet row/Field columns preserve record values
- memo is lossless fallback for unsupported structure
- source/caution/user memo follow profile settings
- review/provider/extraction metadata never exports

Before server-primary, compare canonical projection with current legacy export semantically. Byte equality is required only where formatting is part of the existing contract; otherwise compare normalized events/rows/text fields.

### 14.8 Privacy, observability, and operations

- structured logs contain request ID, phase, status, latency, counts, normalized error, fallback flag only
- raw URL query secrets, source body, user memo, prompt/response, auth token are redacted
- audit events exist for publish, version apply, import, rollback, and privileged review
- DB/provider outage preserves user input and gives retry/fallback action
- rate/cost/timeout feature flags are verified in preview and production-like environment
- rollback drill proves `server-primary -> local` without data deletion

## 15. Implementation Sequence

> **Sequence aligned on 2026-07-12:** The URL-to-Flow readiness plan supersedes the earlier storage-first ordering. SQL/RLS and shadow-write stay conditional until canonical projection parity and fake-provider state/failure evidence are green.

1. Add the shared runtime validator; keep the current local runtime and persistence.
2. Implement canonical-to-current compatibility, the effective projection service, and semantic parity against current export builders.
3. Add fixture/local safe intake, SourceRow extraction boundaries, and a fake generator/state harness; do not expose arbitrary production URLs or a real provider.
4. Add repository interfaces, SQL migrations, immutable triggers, RLS, and SQL tests behind a feature flag.
5. Persist/read canonical fixtures, run migration/rollback, and verify local/server adapter parity.
6. Add authenticated internal canary and local import preview/commit.
7. Enable shadow-write for user copy/run mutations and compare effective projections.
8. Implement proposal review/save state machine and full cost/latency instrumentation.
9. Add a real provider only after cost, rights, security, retention, and failure gates pass; then move one canary cohort to server-primary with local rollback.
10. Consider direct platform integrations only after repeated file/export friction is observed.

## 16. Acceptance Criteria

- Tables and ownership boundaries represent Source/Snapshot/Row/Ref, immutable content version, review, proposal, overlay, and run separately.
- Stable Item identity and immutable versioning support three-way update review without losing user state.
- RLS prevents cross-user and internal-data leakage.
- API defines explicit review-before-save and no-auto-publish/no-auto-Calendar behavior.
- Mutation concurrency and idempotency rules are testable and return stable conflict codes.
- localStorage import is previewed, idempotent, non-destructive, count-reconciled, and rollback-capable.
- Calendar/checklist/todo/sheet/memo all read one effective projection; ICS remains serialization only.
- Fake-provider, schema, SQL/RLS, state, version, migration, rollback, privacy, and projection QA pass before server-primary.
- Feature flag rollback restores the current local path without deleting local or server data.
