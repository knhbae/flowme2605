# URL-to-Flow Backend Readiness Contract

**Date:** 2026-07-12<br>
**Status:** Approved decision package; production fetch, DB, and real LLM remain gated<br>
**Owner:** FlowMe product / content / backend<br>
**Primary review artifact:** [예시 중심 PPT형 한국어 HTML](../../content-audit/2026-07-12-flow-content-backend-goal-presentation-ko.html)

## Executive Decision

URL-to-Flow의 다음 단계는 특정 DB나 LLM SDK를 먼저 붙이는 일이 아니다. 먼저 한 원문에서 근거가 추적되는 canonical proposal을 만들고, 사용자가 검토한 뒤 같은 effective Item을 Calendar, checklist/todo, sheet, memo로 투영할 수 있다는 계약을 증명한다.

현재 판단은 두 갈래다.

| Scope | Decision | Why |
| --- | --- | --- |
| Canonical validator, compatibility adapter, projection parity, fake provider | **GO** | 계약과 10 positive + 2 negative golden fixtures가 이미 존재하고 다음 위험을 실데이터 없이도 줄일 수 있다. |
| Repository/DB shadow-write | **CONDITIONAL GO** | adapter parity, SQL/RLS, migration, rollback, redaction 테스트 후에만 연다. |
| Arbitrary URL production fetch/extract, real LLM provider, automatic retry | **NO-GO** | 비용 상한, URL-ingestion security, provider retention, rights operation, failure fixtures가 아직 닫히지 않았다. |
| Direct Calendar/Sheets/Notion/Todo account integration | **NO-GO** | 현재는 export/import friction이 반복 사용자 행동으로 증명되지 않았다. |

## User Need

```text
As a person who found a useful URL,
I need the source-backed parts worth doing converted into my own execution items,
so that I can review them and move them into the calendar, checklist, sheet, or memo I already use.
```

## Product Definition

FLOW는 콘텐츠 소비나 범용 AI 요약이 아니다. FLOW는 외부 콘텐츠의 **따라 할 부분**을 사용자의 실행 도구로 옮기는 transfer layer다.

```text
one primary source
-> one user job
-> one natural artifact
-> minimum execution UI
```

Example:

```text
SourceRow: "극세 필터는 4주에 한 번 청소"
-> Item: "에어컨 극세 필터 청소하기"
-> Calendar: 4주 반복 ICS
-> Checklist: occurrence completion
-> Memo: 세척 방법과 공식 source URL
```

The ICS event is not the canonical content. It is one projection of the Item.

## Canonical Hierarchy

```text
SourceRow -> Item -> Step -> Flow -> Bundle / Flow Map
```

| Unit | Contract | Example | Does not own |
| --- | --- | --- | --- |
| `SourceRow` | Minimum evidence unit extracted from the primary source snapshot | `극세 필터 4주에 한 번 청소` | User completion state |
| `Item` | Minimum source-derived unit with independent check, decision, or record state | `필터 청소하기` | Unrelated source prose |
| `Step` | Semantic and ordering group for related Items | `검진 전 확인` | Completion state or schedule authority |
| `Flow` | One user job controlled by one primary source | `건강검진 D-7 준비` | Multi-source synthesis |
| `Bundle / Flow Map` | A parent composition of separately source-owned Flows | `해외여행 준비` | Child Item execution state |

Canonical authority: [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md). API and persistence authority: [Storage/API Contract](../2026-07-11-canonical-flow-data-model/storage-api-contract.md).

## Content Kind Is A Composition Of Axes

Do not create one overloaded `category` enum. A Flow kind is composed from independent axes.

| Axis | Canonical values | Example |
| --- | --- | --- |
| `lifeArea` | 9 user-problem shelves | `health_fitness` |
| `planningPattern` | date preparation, ordered procedure, repeating routine, source rows, resource queue, compare/decide, phase lifecycle | `date_preparation` |
| `Item.intent` | `act`, `inspect`, `decide`, `record`, `use_resource` | `inspect` |
| `primaryArtifact` | calendar, checklist, todo, sheet, memo, hybrid | `hybrid` |
| hierarchy | Item, Step, Flow, Bundle/Flow Map | one Flow with two Steps |
| source/risk/readiness | source type, locale, rights, risk, lifecycle, readiness | official + medical sensitive + second wave |

### Legacy compatibility mapping

| Legacy concept | Canonical mapping | Rule |
| --- | --- | --- |
| `timeline` | `planningPattern=date_preparation`; scheduled Items use `absolute`, `anchor_offset`, or `date_window` | Keep only as UI/adapter shorthand. |
| `phase` | `planningPattern=phase_lifecycle` or source row groups | Phase does not create Items by itself. |
| `routine` | `planningPattern=repeating_routine` + Item recurrence | Source must define cadence or user must explicitly supply it. |
| `checklist` | primary artifact or projection | It is not the hierarchy minimum. |
| old user-facing/runtime `Step` row | usually canonical `Item` | Preserve label compatibility; do not make it the new storage schema. |
| old `Item` detail text | canonical Field, Memo, SourceRef, or explicit Item when independently stateful | Never split prose mechanically. |

## Coverage Envelope

### Supported in v1

| Source shape | Example | Natural artifact | Conversion boundary |
| --- | --- | --- | --- |
| D-day or date preparation | health check D-7, moving D-30 | calendar + checklist | Use explicit source offsets only. |
| Ordered procedure | official job-support registration | checklist/todo | Preserve order; no private form values in public content. |
| Explicit repeating routine | air-conditioner filter every 4 weeks | recurring calendar + check | Source cadence or explicit user cadence only. |
| Source checklist rows | travel packing, field inspection | checklist | One Item per independently checkable row. |
| Table/curriculum rows | K-MOOC weekly rows | sheet + checklist | Item is row; Field is stable column. |
| Compare/decide | used-car candidate hold/buy/reject | sheet + checklist + memo | FLOW never makes the purchase decision. |
| Single resource/video | one recipe or follow-along video | memo + one checklist Item | Do not invent sub-actions from the media. |
| Sparse official lifecycle | vehicle inspection due window | one calendar Item + memo | Agency-internal phases stay omitted. |
| Imported resource queue | P09 Day 1–2 contract sample from a 30-day prompt source | calendar/sheet/checklist | The sample verifies row-to-Item and projection behavior only; a complete 30-day Flow requires all source rows. |

P09 (`gf-pos-09-resource-queue`) contains exactly two SourceRows and two Items. Its `ready_for_internal_canary` review value means the **two-row contract sample** is usable for adapter/validator canary tests; it is not evidence that the complete 30-day source was acquired or that a 30-day user Flow is publishable. Any product attempt presented as the full 30-day queue remains `outcome='partial'`, `readiness='source_import_required'`, with full export/publish blocked until all 30 source rows are imported and checked.

### Generation state, outcome, readiness, and error

Do not overload one `status` value. The integrated backend response carries four independent dimensions:

```ts
type ConversionStatus = {
  generationState: 'ready' | 'generating' | 'proposal' | 'partial' | 'failed' | 'reviewed' | 'saved';
  outcome: 'complete' | 'partial' | 'no_proposal' | 'rejected' | 'cancelled' | null;
  readiness:
    | 'ready_for_internal_canary'
    | 'ready_second_wave'
    | 'source_import_required'
    | 'hold'
    | null;
  errorCode: string | null;
};
```

- `generationState` answers where the request is in the workflow. To preserve the authoritative storage/API state machine, a usable incomplete terminal proposal is `generationState='partial'` and is paired with `outcome='partial'`.
- `outcome` records what the latest generation attempt produced. It does not approve publication or a destination projection.
- `readiness` is the content-review/promotion gate. It is set or changed by the review contract, not by provider completion alone.
- `errorCode` is a normalized machine reason such as `missing_source_rows`, `rights_unresolved`, or `proposal_validation_failed`; it never doubles as a state or readiness value.

| Case | `generationState` | `outcome` | `readiness` | `errorCode` | Result |
| --- | --- | --- | --- | --- | --- |
| File/table/playlist rows are incomplete and no valid proposal exists | `failed` | `no_proposal` | `source_import_required` | `missing_source_rows` | Preserve intake and request the missing source; no canonical content or projection. |
| A valid subset exists but the claimed source scope is incomplete | `partial` | `partial` | `hold` or `source_import_required` after review | `partial_source_rows` | Show the missing scope; no full-content claim or full export/publish. |
| Rights, freshness, locale applicability, sensitive context, or source fidelity is unresolved | `failed` | `no_proposal` | `hold` | normalized gate code | No save/publish/export; route to review. |
| No executable user job exists, or conversion would require invented/custom-app structure | `failed` | `rejected` | `null` | `no_executable_user_job` | End conversion with a user-safe reason. |
| LLM invents an Item, schedule, fact, or sensitive conclusion | `failed` | `no_proposal` | `hold` until a valid retry/review | `proposal_validation_failed` | Keep input, discard the invalid proposal, and block save/projection. |

## SourceRow Traceability Rules

Every source section ends in one of four destinations.

| Destination | Use when | Required evidence |
| --- | --- | --- |
| `Item` | User can independently check, decide, or record it | One or more SourceRows plus completion semantics |
| `Field` | Needed for schedule, generation, sort, filter, record, or export | owner, value type, purpose, value source |
| `Memo` | Method, context, link, caution, exception, quantity, user note | scope, kind, source relation when source-derived |
| `omit` | Agency-internal phase, marketing CTA, duplicated prose, unsupported judgment | explicit omission reason |

Hard invariants:

- every publishable Item has a valid SourceRef except an explicit private `user_request`;
- no invented action, date, recurrence, official fact, or sensitive conclusion;
- unscheduled Item emits no ICS event;
- one primary source controls each Flow;
- supporting sources may add boundary, safety, or utility links, but not structure;
- user-facing content and internal review/provider metadata remain separate.

## Canonical Core And Projection Contract

The canonical model is a rich internal core, not the lowest common denominator of external formats.

```text
effective canonical Item
-> target adapter
-> target artifact
-> explicit loss/fallback manifest
```

See [Projection and Loss Matrix](./projection-loss-matrix.md).

Required adapter invariants:

- stable Item ID drives ICS `UID` and internal export identity;
- Step title/order is grouping metadata, not state ownership;
- Fields become typed columns only when the target supports them;
- unsupported structured data travels in description/note/Memo fallback;
- source URL, caution, completion criterion, and hold boundary travel when relevant;
- provider, prompt, score, rights-review notes, and extraction internals never enter user export;
- file import is a snapshot, not synchronization or round-trip ownership.

## Conversion Engine Contract

```text
URL intake and canonicalization
-> existing conversion lookup / dedupe
-> safe fetch and immutable snapshot
-> structural extraction and SourceRow creation
-> source shape and natural-artifact classification
-> deterministic normalization
-> bounded LLM semantic proposal where useful
-> schema + provenance + source + risk + rights validation
-> user review and overlay
-> explicit save
-> effective projection
```

See [Algorithm-vs-LLM Decision Table](./conversion-decision-table.md).

Key policy:

- deterministic parsing owns URL normalization, dates, explicit recurrence, tables, ordering, stable IDs, schema, projection, and state transitions;
- LLM may propose titles, semantic row classification, grouping, Memo extraction, and ambiguity explanations;
- human review owns rights, sensitive/local applicability, disputed omissions, and final save;
- item count is source-derived. `maxItems=7` is an interactive processing cap, not a target count;
- if valid rows exceed the cap, return `partial` or source-import/table mode with omission evidence;
- LLM failure never authorizes general-knowledge filling or invented sequential dates.

## State And Failure Contract

The detailed API/state authority remains [Storage/API Contract](../2026-07-11-canonical-flow-data-model/storage-api-contract.md). The integrated sequence is:

```text
generationState:
ready -> generating -> proposal | partial | failed
proposal | partial -> reviewed -> saved
failed -> ready only after explicit retry or valid deterministic fallback selection

attempt completion attaches outcome:
proposal + complete
partial + partial
failed + no_proposal | rejected
ready + cancelled (after cancellation)
```

Compatibility note: the existing storage contract's `status='partial'` remains `generationState='partial'` and is paired with `outcome='partial'`; `terminal_reason/error_code` maps to the separate `outcome` and `errorCode` fields. The duplicated word is intentional compatibility, but the dimensions are not interchangeable: `source_import_required`, `hold`, `reject`, and validator codes never become workflow states.

Required failure semantics:

| Failure | User-visible result | Required backend behavior |
| --- | --- | --- |
| duplicate URL/request | Reuse or open existing proposal | Idempotency key and canonical URL uniqueness |
| timeout/provider error | Input preserved; not complete | New attempt only after policy/user decision |
| partial extraction | Missing scope explained | No implicit full-content claim |
| cancellation | Returns to ready | Late result cannot mutate cancelled run |
| invalid schedule | Schedule removed | Item remains unscheduled; no default date invention |
| rights/locale/sensitive block | Review-required reason | No proposal save, publish, or projection |
| cost/rate limit | Budget message and fallback choice | `429`, feature flag, attempt-level cost retained internally |
| DB/provider outage | Input and last safe state preserved | Retryable state and rollback path |

## Cost And Capacity Contract

Provider prices are inputs, not hardcoded product truth. The machine-readable planning assumptions live in [cost-model-v1.json](./cost-model-v1.json), and the review deck provides an interactive simulator.

```text
variable cost per intake
= lookup
+ miss_rate * (
     fetch_extract
     + llm_call_rate * llm
     + validate_store
     + retry_rate * failed_attempt
   )
+ human_review_rate * review_minutes * reviewer_minute_cost

monthly cost
= requests * variable cost per intake
+ fixed database, worker, storage, observability cost

fully loaded cost per request/intake
= monthly cost / requests
```

In this model one `monthlyRequest` is one accepted intake request, whether it becomes a cache hit or a miss. Retry attempts are not counted as new intakes; their expected cost is folded into the original intake's variable cost. `variableCostPerIntakeKrw` is therefore a marginal/routing diagnostic, while `fullyLoadedCostPerRequestKrw` allocates fixed monthly cost and is the value compared with `ownerDecisionThresholds.maxCostPerIntakeKrw`.

Decision metrics:

1. variable cost per intake for routing/capacity diagnosis;
2. fully loaded cost per accepted intake for the owner Go/No-Go threshold;
3. fully loaded cost per saved Flow;
4. fully loaded cost per first completed Item;
5. p50/p95 end-to-end proposal latency;
6. cache hit, LLM call, fallback, retry, and human-review rates.

Scenario `p95LatencySeconds` values are editable planning assumptions, not outputs of the cost formula or measured SLO evidence. They represent the uncached generation path from accepted explicit generate action through queue/fetch/extract/semantic proposal/validation to `proposal` or `failed`; they exclude human review, save, and external import. `maxP95LatencySeconds` applies to that same cohort and must be replaced with measured canary p95 before a real-provider Go decision. Cache-hit lookup latency is reported separately.

No real-provider Go decision is allowed while any of these owner thresholds is `null`:

- maximum fully loaded cost per accepted intake (`maxCostPerIntakeKrw`);
- maximum cost per saved Flow;
- maximum cost per first completed Item;
- maximum p95 latency;
- daily/monthly budget and per-user quota.

## Rights, Security, Privacy, And Operations

See [Risk and QA Checklist](./risk-qa-checklist.md).

Minimum controls before arbitrary URL intake:

- rights policy for allowed extraction, attribution, snapshot retention, robots/terms review, and takedown;
- SSRF protection: scheme allowlist, DNS/IP checks before and after redirects, private/reserved address block, redirect cap;
- content controls: MIME allowlist, byte/decompression/time limits, sandboxed parser, script removal, prompt-injection isolation;
- privacy: query-secret detection, PII redaction, log minimization, user deletion, provider retention/training review;
- security: server-only credentials, RLS, least privilege, audit events, no raw prompt/provider detail in exports;
- reliability: idempotency, attempt isolation, cancellation, late-result guard, feature flag, deterministic-only mode, rollback;
- freshness: checked date, snapshot hash, stale policy, source-change review, user overlay preservation;
- localization: translation is not evidence of local medical/legal/admin applicability.

## Version And Ownership Precedence

```text
pinned immutable content version
-> reviewed source-version resolution
-> user overlay
-> execution run
-> occurrence override
-> unsaved UI buffer
```

- a new source version never silently rewrites a saved user copy;
- added Item starts `pending review`;
- removed Item with user state remains retained/orphaned until resolved;
- changed source schedule, title, destination, or caution creates an explicit conflict;
- snapshot, extractor, prompt, model, validator, schema, and hash versions remain auditable.

## Golden Fixture Contract

Canonical content evidence: [golden-fixtures-v1.json](../2026-07-11-canonical-flow-data-model/golden-fixtures-v1.json). Failure/state evidence: [failure-state-golden-fixtures-v1.json](./failure-state-golden-fixtures-v1.json).

Current validated coverage:

- 10 positive shapes;
- 2 negative content-gate shapes;
- 9 life areas;
- 7 planning patterns;
- 5 projection targets;
- expected and forbidden projection declarations.
- 8 provider-neutral content-gate, source-access, proposal-validation, projection-validation, and runtime failure contracts;
- independent generation state, outcome, readiness, error code, retry, save, human-review, and projection assertions.

Before a real provider, extend the representative failure contract with provider- and fetch-harness stress fixtures for:

- fetch denied, redirect loop, private-IP target, unsupported MIME, oversize body;
- incomplete extraction and missing rows;
- timeout, empty, partial, malformed, prompt-injected, and over-budget provider output;
- duplicate attempt, cancellation, late result, offline, DB outage;
- rights block, locale mismatch, sensitive review block;
- unscheduled Item attempting ICS projection.

## User Validation Contract

Automated QA proves contract behavior, not product validation. The first backend canary must measure:

```text
open intake
-> source fidelity review
-> Item edit/exclude
-> explicit save
-> export or My Flow open
-> first Item completion
-> correction/feedback
```

Required pilot metrics:

- source-to-Item correction and omission rate;
- proposal review and save rate;
- time to review;
- export destination chosen;
- first completion rate;
- repeated URL/cache reuse;
- rights/sensitive escalation rate;
- user-reported wrong action/date/source boundary.

Do not call the backend validated until observed users complete the loop.

## Implementation Order

See [plan.md](./plan.md).

1. Contract convergence and validator; no DB/provider.
2. Canonical-to-current compatibility adapter and projection parity.
3. Safe intake/fetch/extract harness with fake provider, deterministic-only mode, and failure fixtures; no production URL exposure or real provider.
4. Conditional repository/SQL/RLS, migration/rollback, and shadow-write only after projection parity and fake-provider state/failure evidence pass.
5. Human review/save canary with full cost/latency instrumentation.
6. Real provider only after all Go/No-Go owner thresholds and risk gates close.
7. Direct platform integration only after repeated export friction is observed.

## Acceptance Criteria

- [x] FLOW definition, independent type axes, canonical hierarchy, and coverage envelope are explicit.
- [x] Item is the minimum independently stateful unit and SourceRow is the minimum evidence unit.
- [x] Step-first legacy documents are marked or updated as compatibility, not the new storage contract.
- [x] Target adapters use rich core + explicit loss/Memo fallback.
- [x] Rules, LLM, and human responsibilities are separated.
- [x] Fixed 3-7 content count and invented sequential-date fallback are removed from the future AI contract.
- [x] Provider-neutral cost formula, scenarios, and unresolved threshold gates are explicit.
- [x] Rights, freshness, localization, privacy, security, reliability, observability, versioning, migration, and user validation are covered.
- [x] The current implementation scope has a split GO / CONDITIONAL GO / NO-GO decision.
- [x] Eight representative failure/state golden fixtures pass an independent validator.
- [ ] Runtime schema validator is wired into API, worker, import, and repository boundaries.
- [ ] Compatibility adapter and effective projection parity pass.
- [ ] SQL/RLS, migration, rollback, and shadow-write pass.
- [ ] Provider-specific fetch/LLM stress fixtures and threat controls pass in the harness.
- [ ] Owner cost/latency thresholds are numeric and accepted.
- [ ] Observed-user canary evidence exists.

The unchecked items are implementation gates. They keep production backend and real provider status at **NO-GO** without invalidating the contract package itself.

## Related Artifacts

- [PPT-style Korean decision deck](../../content-audit/2026-07-12-flow-content-backend-goal-presentation-ko.html)
- [Canonical Flow contract](../2026-07-11-canonical-flow-data-model/canonical-flow-contract.ts)
- [Canonical golden fixtures](../2026-07-11-canonical-flow-data-model/golden-fixtures-v1.json)
- [Failure/state golden fixtures](./failure-state-golden-fixtures-v1.json)
- [Storage and API state contract](../2026-07-11-canonical-flow-data-model/storage-api-contract.md)
- [URL-first AI Draft Gate](../2026-07-11-url-first-ai-draft-gate/spec.md)
- [Projection and loss matrix](./projection-loss-matrix.md)
- [Algorithm-vs-LLM decision table](./conversion-decision-table.md)
- [Cost model](./cost-model-v1.json)
- [Risk and QA checklist](./risk-qa-checklist.md)
- [Implementation plan](./plan.md)
- [Tasks](./tasks.md)
- [QA evidence](./qa.md)
