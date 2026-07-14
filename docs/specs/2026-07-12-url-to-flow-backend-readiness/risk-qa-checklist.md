# URL-to-Flow Risk And QA Checklist

**Current verdict:** contract work may proceed; arbitrary production URL fetch and real LLM remain NO-GO.

Status legend:

- **Defined:** contract exists and current fixtures cover the rule.
- **Partial:** policy exists but failure fixtures/runtime proof are missing.
- **Missing:** owner, numeric threshold, or operational evidence is absent.

## 1. Source, Rights, And Freshness

| Check | Current | Exit evidence |
| --- | --- | --- |
| One primary source controls each Flow | Defined | Validator rejects multiple structural sources. |
| Every Item has SourceRef; every omitted executable row has a reason | Defined | Golden fixture and runtime validator pass. |
| Extraction/summary/attribution policy by source type | Partial | Written matrix for official, creator, blog, video, PDF, paywall, user-owned upload. |
| robots/terms/license review responsibility | Missing | Named owner, decision record, review expiry, and deny-by-default unknown state. |
| Raw snapshot retention and deletion/takedown | Missing | TTL by source class, user/source-owner deletion path, audit event, cache invalidation. |
| Source checked date and stale policy | Partial | Recheck interval, stale UI state, source-change diff, re-review SLA. |
| Supporting-source boundary | Defined | Supporting source cannot alter Items/ordering/schedule. |
| Sensitive localization | Defined as gate | Korean applicability review fixture before promotion. |

## 2. URL Fetch And Parser Security

| Check | Current | Exit evidence |
| --- | --- | --- |
| Scheme allowlist | Missing runtime | Only `http`/`https`; reject file, data, ftp, localhost aliases. |
| SSRF private/reserved address block | Missing | IPv4/IPv6/DNS rebinding tests before and after every redirect. |
| Redirect control | Missing | Max redirect count, per-hop host/IP revalidation, final URL log. |
| Port policy | Missing | Default web ports or explicit allowlist. |
| MIME and file-type allowlist | Missing | HTML/text/PDF/media-transcript policy; mismatch rejection. |
| Byte/decompression/time limits | Missing | Compressed and expanded size caps, streaming timeout, parser CPU/memory limits. |
| HTML/script sanitization | Partial concept | Scripts, forms, iframes, event handlers, active content removed before extraction. |
| Prompt-injection isolation | Missing | Source text is untrusted data; model/system instructions cannot be overridden; red-team fixture. |
| Authenticated/private page boundary | Defined as out | No cookies, login tokens, session headers, or private form values in v1. |
| File malware/sandbox policy | Missing | Sandbox or no-download rule by file class. |

## 3. Privacy, Secrets, And Provider

| Check | Current | Exit evidence |
| --- | --- | --- |
| URL query secret detection | Missing runtime | Token/key/password-like query warning and redaction fixture. |
| PII detection/redaction | Partial | Supported PII classes, false-positive escape, blocked-provider-send event. |
| Log minimization | Defined | Production log assertion excludes raw URL query, memo, body, prompt, response. |
| Provider retention/training policy | Missing provider | Current official policy review, DPA/region if required, owner approval. |
| Server-only credentials | Defined | Build/client bundle scan; secret rotation runbook. |
| RLS/least privilege | Defined contract | SQL policy tests with two-user isolation and service-role boundary. |
| User deletion/export | Partial | Delete intake/proposal/overlay/snapshot according to retention/legal policy. |
| Review/provider internals excluded from user export | Defined | Projection tests across ICS, checklist, todo, sheet, memo. |

## 4. Canonical Quality And Safety

| Check | Current | Exit evidence |
| --- | --- | --- |
| Item is minimum independent state unit | Defined | Contract and fixtures pass; legacy adapter mapping explicit. |
| Source-derived item count | Defined | No target count; over-cap returns partial/import state. |
| No invented action/date/recurrence/fact | Defined | Positive and negative validator fixtures. |
| Unscheduled Item emits no ICS | Defined | Projection test with zero VEVENT. |
| Field vs Memo boundary | Defined | Validator requires Field purpose and owner. |
| Sensitive conclusion block | Defined | Medical/legal/financial/safety negative fixtures. |
| Source facts, experience, caution separated | Defined | User artifact review and schema fields. |
| Quality rubric threshold/comments | Defined | Every score has a comment; hard fails block promotion. |
| Runtime schema shared by API/worker/import/repository | Missing | One runtime validator and canonical hash implementation. |

## 5. State, Reliability, And Concurrency

| Check | Current | Exit evidence |
| --- | --- | --- |
| `ready -> generating -> proposal/partial/failed -> reviewed -> saved` | Defined | State transition unit tests. |
| User review before save/projection | Defined | E2E proves zero pre-review persistence/export. |
| Idempotency and canonical URL race | Defined contract | Concurrent request integration test. |
| Cancellation and late-result guard | Partial | Fake-provider delayed result test cannot mutate cancelled run. |
| Retry policy and attempt isolation | Defined | No automatic retry by default; new attempt record and added cost. |
| Partial extraction/provider output | Partial | Missing scope and omission reason visible; no completion claim. |
| DB/provider outage | Partial | Input preserved, deterministic-only mode, recovery test. |
| Feature flag and kill switch | Missing runtime | Preview/production-like verification. |
| Rollback and shadow-write | Defined plan | Parity dashboard, rollback drill, no user overlay loss. |

## 6. Cost And Capacity

| Check | Current | Exit evidence |
| --- | --- | --- |
| Stage-level cost formula | Defined | `cost-model-v1.json` parses and simulator matches. |
| Pilot/launch/scale scenarios | Defined as assumptions | Owner reviews volume, cache, save, completion, review rates. |
| Provider price refresh | Missing | Official price date and selected model/provider entered before decision. |
| Cost per intake/saved Flow/first completion | Defined formula | Attempt and product event join in canary. |
| Numeric budget/latency thresholds | Missing | All `ownerDecisionThresholds` non-null and approved. |
| Per-user/day/month limits | Missing runtime | Rate-limit and `429` tests. |
| Cache/dedupe measurement | Partial | Canonical URL and snapshot hash hit metrics. |
| Human-review queue capacity | Missing | Reviewer minutes, SLA, escalation owner, backlog alert. |

## 7. Projection And External Tool Boundary

| Check | Current | Exit evidence |
| --- | --- | --- |
| Rich canonical core + adapter + loss manifest | Defined | Every canonical path gets explicit handling. |
| Stable ICS UID and timezone/recurrence subset | Defined | Google/Apple/Outlook import smoke plus normalized semantic parity. |
| Checklist/todo grouping/order/source/caution | Defined | Golden artifacts and destination import smoke. |
| Sheet Item=row and Field=column | Defined | CSV/XLSX parity and UTF-8/date tests. |
| Memo as lossless semantic fallback | Defined | Unsupported fields remain readable and attributable. |
| Import is snapshot, not sync | Defined | UX wording and no round-trip claim. |
| OAuth/direct write | NO-GO | Repeated destination use, proven import friction, permission clarity, reversibility, stable schema, source/safety transfer. |

## 8. Observability And Operations

| Check | Current | Exit evidence |
| --- | --- | --- |
| Attempt-level phase latency/cost/token/error | Defined contract | Dashboard and redacted logs. |
| Product funnel | Partial | intake, proposal review, edit/exclude, save, export/open, first completion events. |
| Quality correction metrics | Missing runtime | Source correction, omission, invalid schedule, fallback, escalation rates. |
| Audit trail | Defined contract | Source/snapshot/extractor/prompt/model/validator/schema/hash versions. |
| Alerting/SLO | Missing | p95 latency, failure, cost, queue backlog, rights block thresholds. |
| Incident runbook | Missing | provider off, fetch off, deterministic-only, rollback, takedown, privacy incident. |
| Owner matrix | Missing | Product, content review, rights/privacy, security, backend, on-call owner. |

## 9. Migration And User Ownership

| Check | Current | Exit evidence |
| --- | --- | --- |
| Legacy Step/Item mapping | Defined | `FlowSection -> Step`, `FlowItem -> Item`, detail -> Field/Memo/SourceRef. |
| Stable version/item identity | Defined | Same semantic payload hashes consistently. |
| User overlay precedence | Defined | Repository reducer/property tests. |
| Added/changed/removed Item review | Defined | Three-way update fixtures. |
| Removed Item with user state retained | Defined | Orphan/restore test. |
| Migration and rollback | Defined plan | Count, projection, state, and hash parity on canary data. |

## 10. Observed-User Evidence

| Check | Current | Exit evidence |
| --- | --- | --- |
| Source fidelity review by real user | Missing | User can identify what came from the URL and correct wrong rows. |
| Review burden | Missing | Median review time and edit/exclude rate recorded. |
| Save/export/first completion | Missing | Observed funnel, not only automated events. |
| Repeat URL/cache value | Missing | Repeated intake reuses a reviewed version without stale surprise. |
| Destination usefulness | Missing | Calendar/checklist/sheet/memo choice and import friction observed. |

## Integrated Go/No-Go Gate

### GO now

- contract convergence;
- runtime schema/validator;
- canonical-to-current compatibility adapter;
- projection/loss manifest and parity fixtures;
- fake provider and deterministic failure fixtures;
- cost instrumentation and simulator calibration.

### Conditional GO

- repository/SQL/RLS and shadow-write after adapter parity, migration, rollback, and redaction pass;
- internal canary after rights/security controls and numeric budget thresholds are approved.

### NO-GO now

- arbitrary production URL fetch;
- real LLM provider;
- automatic retries;
- automatic save/publish/calendar writes;
- broad source-body retention;
- direct external account integration;
- validation claims without observed users.

All Missing items in Sections 1-8 that affect production data, rights, security, privacy, cost, or rollback must close before production fetch/provider activation.
