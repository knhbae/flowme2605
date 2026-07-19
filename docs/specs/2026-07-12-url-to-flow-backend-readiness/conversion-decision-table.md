# Algorithm-vs-LLM Decision Table v1

## Core Rule

Rules own facts, identity, dates, state, and projection. LLM may propose semantic interpretation. Humans own disputed source boundaries, sensitive/local applicability, rights, and final save.

```text
deterministic when it can be parsed
-> LLM proposal only where meaning is ambiguous
-> validator for every path
-> human review before persistence/projection
```

## Decision Table

| Pipeline stage | Required input -> output | Deterministic owner | LLM allowed | Human-only / review | Fallback | Hard stop | Attempt telemetry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| intake validation | raw URL/memo -> accepted intake | scheme, length, query-secret warning, request ID | no | user removes secret/PII | preserve input | disallowed scheme, credential-like URL | accepted/rejected reason |
| URL canonicalization | URL -> canonical URL key | normalize host/path/query policy, redirect-independent key | no | resolve disputed identity | original URL retained | ambiguous unsafe canonicalization | canonicalization version |
| cache lookup/dedupe | canonical key -> hit/needs_review/miss | content/version/readiness lookup | no | review stale/held hit | miss path | held content cannot become saveable hit | hit state, cache age |
| fetch | URL -> response metadata/body | allowlist, DNS/IP checks, redirect cap, timeout, MIME/size/decompression limits | no | rights/access exceptions | user source import | private/reserved target, login wall, oversize, unsupported MIME | bytes, redirects, latency, final URL |
| snapshot | response -> immutable evidence record | hash, checked time, locale, extractor version | no | retention/takedown policy | metadata-only record when allowed | retention/rights policy fail | hash, TTL, storage bytes |
| structural extraction | snapshot -> blocks/tables/media refs | DOM/readability/table/list/heading/parser rules | bounded block labeling only | inspect partial/complex source | partial extraction | unreadable/paywall without rows | block count, coverage, parser version |
| SourceRow creation | blocks -> ordered evidence rows | table/list/date/check row segmentation and stable IDs | suggest row boundaries when prose is ambiguous | approve disputed row boundaries | hold/source_import | no evidence row | row count, inferred ratio |
| source-shape classification | rows -> planning shape + natural artifact | explicit date/table/list/repeat/procedure heuristics | propose among known enum with evidence | choose when confidence/risk boundary disputed | `hold` | no executable user job | rules/LLM choice, confidence |
| primary-source gate | source set -> one controlling source | source ownership IDs | no multi-source synthesis | select primary; supporting only for boundary/safety/utility | redo as separate child Flows | multiple primary sources | source count, decision |
| date/recurrence parsing | source value -> schedule | ISO/local date parser, anchor offset, date window, supported RRULE | may identify a date phrase span, never invent value | resolve ambiguous locale/date meaning | unscheduled Item | inferred date without evidence | parsed/removed schedules |
| Item boundary | SourceRows -> proposed Items | independently stateful check/decide/record rule | propose merge/split with SourceRefs and rationale | required for sensitive/disputed/over-cap rows | partial/hold | source-less Item, padded count | Item count, merge/split reasons |
| Item title | Item evidence -> action title | verb/length/empty/duplicate checks | rewrite title without adding fact | user edits final title | source row title | new object, number, date, outcome | edit distance, user correction |
| completion semantics | evidence -> doneWhen/mode | explicit check/decision/record mapping | concise wording only | approve ambiguous success criteria | manual check | guaranteed outcome or unsupported criterion | mode, correction rate |
| Field split | evidence -> Fields | create only for schedule, generation, sort, filter, record, export | propose key/label/type | approve sensitive/private Fields | Memo | occasional context promoted to required Field | Field count/purpose |
| Memo/caution split | evidence -> Memo/caution | source URL, extracted detail, known risk class | summarize bounded source detail; classify caution candidate | approve sensitive caution and omission | link-only Memo | copied paywalled body, medical/legal/financial conclusion | token span, source refs |
| omission | source section -> omit reason | duplicate/CTA/internal process/non-user action rules | propose reason | approve disputed omission | keep in source snapshot only | silent omission of executable row | omitted row count/reasons |
| rights/localization | source -> allowed/hold/reject | policy checks and locale metadata | no final decision | mandatory owner review for uncertain rights and sensitive locale | hold | unknown rights for stored body; nonlocal sensitive content | decision, reviewer, expiry |
| risk classification | content -> risk level/gates | topic/source/intent rules | propose risk tags | mandatory for sensitive cases | stricter gate | diagnostic/legal/financial/safety certainty | risk class, escalation |
| canonical validation | proposal -> valid/invalid | schema, enum, ID, ordering, SourceRef, schedule, projection invariants | no | user can revise invalid editable fields | return safe errors | source-less Item, invented schedule, internal leak | error codes, validator version |
| user review/overlay | proposal -> reviewed revision | revision/ETag and inclusion rules | no automatic acceptance | user explicitly reviews, edits, includes, and saves | preserve proposal | stale revision or zero included Items | review time, edits, exclusions |
| persistence | reviewed revision -> saved copy | transaction, immutable version, overlay separation, idempotency | no | explicit save action | retryable safe state | unreviewed revision, failed source/risk gate | DB latency, version, cost |
| projection | effective Item -> artifact + loss manifest | deterministic target adapter | no | user chooses target | Memo/checklist fallback | unscheduled ICS, dropped caution/source, internal metadata leak | rows/events, loss codes |
| retry/cancel | attempt state -> new attempt or stop | state machine, cost budget, cancellation token, late-result guard | provider retry only if policy allows | explicit retry by default | deterministic-only mode | automatic unbounded retry; cancelled result mutation | attempt ID, reason, added cost |

## LLM Request Contract

The provider-neutral request should contain the minimum needed evidence, not raw authenticated browsing state.

```ts
type SemanticProposalRequest = {
  requestId: string;
  schemaVersion: string;
  locale: string;
  source: {
    canonicalUrl?: string;
    title: string;
    checkedAt: string;
    rightsStatus: 'allowed' | 'needs_review';
    riskLevel: 'low' | 'medium' | 'sensitive';
  };
  sourceRows: Array<{
    sourceRowId: string;
    rowType: string;
    title: string;
    text?: string;
    order: number;
  }>;
  userJob?: string;
  maxItems: number;
};
```

`maxItems` is a processing cap. It does not authorize padding or silent truncation.

## LLM Output Contract

```ts
type SemanticProposal = {
  requestId: string;
  proposalTitle: string;
  sourceShape: string;
  primaryArtifact: string;
  items: Array<{
    proposalId: string;
    title: string;
    intent: 'act' | 'inspect' | 'decide' | 'record' | 'use_resource';
    sourceRowIds: string[];
    memoCandidate?: string;
    groupingCandidate?: string;
    scheduleCandidate?: {
      sourceText: string;
      parsedByRule: false;
    };
  }>;
  omittedRows: Array<{
    sourceRowId: string;
    reason: string;
  }>;
  incompleteReason?: string;
};
```

The LLM cannot return an authoritative parsed date or recurrence. It can point to source text for a deterministic parser or human review.

## Status Dimension Contract

The decision engine returns independent workflow, attempt, review, and error dimensions. Except for the explicitly documented storage-compatibility pair `generationState='partial'` + `outcome='partial'`, it must not reuse strings such as `hold` or `proposal_validation_failed` across those meanings.

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

- `generationState` changes only on workflow transitions. While an attempt runs, `outcome=null`; an incomplete terminal proposal uses the existing storage-compatible pair `generationState='partial'` and `outcome='partial'`.
- `outcome` is the normalized result of the latest attempt. It does not authorize save, publish, or projection.
- `readiness` is assigned by source/content review. Provider success cannot promote it.
- `errorCode` identifies a machine-actionable cause. Cancellation is an outcome, not an error; projection-only errors do not rewrite generation state or readiness.

Compatibility mapping for the current storage draft is explicit: `status='partial'` stays `generationState='partial'` and is accompanied by `outcome='partial'`; `terminal_reason/error_code` is normalized into `outcome` and `errorCode`. Readiness and validator codes remain separate and must never be written into `generationState`.

## Hard Validator Codes

| `errorCode` | Meaning | `generationState` | `outcome` | `readiness` | Required effect |
| --- | --- | --- | --- | --- | --- |
| `proposal_validation_failed` | Compatibility umbrella when a more specific validator code is unavailable | `failed` | `no_proposal` | `hold` | Preserve the typed validator detail internally; new runtime should emit the specific code below when known. |
| `item_without_source` | Publishable Item lacks SourceRef | `failed` | `no_proposal` | `hold` | Discard invalid proposal; preserve intake. |
| `invented_action` | Item introduces an unsupported action/object/outcome | `failed` | `no_proposal` | `hold` | Discard invalid proposal; preserve intake. |
| `invented_schedule` | Schedule has no source/user anchor evidence | `partial` if the Item remains valid without schedule; otherwise `failed` | `partial` or `no_proposal` | `hold` until review | Remove schedule and block Calendar projection; never invent a replacement date. |
| `silent_source_omission` | Executable SourceRow was neither mapped nor given an omission reason | `partial` | `partial` | `hold` | Show missing scope and require mapping or an approved omission reason. |
| `item_count_padded` | Items were added to meet a count | `failed` | `no_proposal` | `hold` | Discard padded proposal. |
| `item_count_truncated` | Source-derived rows exceed cap without an explicit partial/import path | `partial` | `partial` | `source_import_required` | Preserve all known row evidence; require complete import/table path before full-content claim. |
| `multiple_primary_sources` | More than one source controls structure | `failed` | `no_proposal` | `hold` | Split sources or select one primary source in review. |
| `rights_unresolved` | Retention/extraction/attribution path not approved | `failed` | `no_proposal` | `hold` | Block save/publish/projection pending rights review. |
| `locale_applicability_unverified` | Sensitive source is not proven applicable to target locale | `failed` | `no_proposal` | `hold` | Block promotion and projection pending local evidence. |
| `sensitive_conclusion` | Proposal makes medical/legal/financial/safety judgment | `failed` | `no_proposal` or `rejected` | `hold` when safe revision is possible; otherwise `null` | Discard the conclusion; require review or end conversion safely. |
| `internal_metadata_leak` | Prompt/provider/score/review data enters a user artifact | unchanged | unchanged | unchanged | Reject only the projection; generation/review records remain intact. |

## Provider Adapter Boundary

```ts
interface SemanticProposalProvider {
  propose(request: SemanticProposalRequest, signal: AbortSignal): Promise<SemanticProposal>;
}
```

Implement these adapters in order:

1. `FakeSemanticProposalProvider` backed by deterministic fixtures;
2. optional `DeterministicMemoProposalProvider` for explicit user-written actions only;
3. one real provider behind a server-only feature flag after Go/No-Go;
4. a provider switch must not change canonical schema, validator, review, save, or projection contracts.

## Review Gate

No proposal moves to `saved` until:

- at least one included Item exists;
- every included Item has SourceRefs or explicit private `user_request` provenance;
- every omitted executable row has a reason;
- no unresolved rights, localization, sensitive, or source gate exists;
- the proposal revision matches the reviewed revision;
- the user explicitly performs the save action.

Generation, review, save, publication, external write, and execution completion are separate states.
