# URL-to-Flow Backend Implementation Plan

## Phase 0 — Contract Convergence

Deliver:

- canonical runtime schema/validator shared by API, worker, import, and repository;
- canonical hash and stable identity tests;
- legacy mapping: `FlowSection -> Step`, `FlowItem -> Item`, detail -> Field/Memo/SourceRef;
- content coverage envelope and algorithm-vs-LLM contract;
- projection loss manifest type;
- cost model loader and threshold config.

Exit:

- 10 positive + 2 negative canonical fixtures and 8 failure/state contract fixtures pass;
- no source-less Item, invented schedule, Step-owned state, or internal export metadata;
- all current Step-first docs are compatibility-marked or updated.

## Phase 1 — Compatibility And Projection Parity

Deliver:

- canonical-to-current `FlowBundle` adapter;
- effective canonical state reducer;
- deterministic ICS/checklist/todo/sheet/memo projections;
- per-artifact loss manifest;
- semantic parity comparison with current export builders.

Exit:

- fixture Item counts, order, SourceRefs, schedule, completion semantics, and user overlays remain stable;
- unscheduled Items emit zero ICS events;
- Google/Apple/Outlook ICS and Sheets/Excel/Todoist/Markdown import smoke checks pass;
- no runtime route or persistence migration yet.

## Phase 2 — Fake Provider And Safe Intake Harness

Deliver:

- URL validation/canonicalization and existing-result lookup against fixture/local repositories;
- SSRF/redirect/MIME/size/decompression/time controls exercised in a non-production harness;
- immutable safe snapshot and structural extraction boundaries;
- SourceRow creation and source-shape routing;
- fake semantic provider and deterministic-only mode;
- execute the 8 provider-neutral failure/state fixtures and extend them with fetch/provider/security/cost stress cases.

Exit:

- private IP, redirect loop, oversize, unsupported MIME, prompt injection, partial extraction, timeout, empty, malformed, cancellation, late result, duplicate, offline, rights, locale, sensitive, and over-budget cases pass;
- generation state, outcome, readiness, and errorCode are asserted independently;
- no production URL exposure, real provider call, DB shadow-write, or pre-review save/projection.

## Phase 3 — Conditional Repository, SQL/RLS, And Migration

Open only after Phase 1 projection parity and Phase 2 fake-provider/state/failure evidence are green.

Deliver:

- repository interfaces with local and server adapters;
- immutable snapshots and content versions;
- temporary proposals, user overlays, execution runs, typed projection indexes;
- SQL constraints, RLS, idempotency, ETag/revision, audit events;
- legacy import, shadow-write, parity dashboard, rollback.

Exit:

- two-user isolation, service-role boundary, concurrency, rollback, overlay preservation, and migration parity pass;
- logs are redacted;
- server remains feature-flagged and not primary;
- shadow-write cannot open unless its feature flag, parity dashboard, and rollback drill pass.

## Phase 4 — Human Review And Internal Canary

Deliver:

- proposal review/edit/include/omit/source UI;
- explicit reviewed revision and save transaction;
- review queue for rights/sensitive/localization cases;
- attempt and product-funnel observability;
- calibrated cost simulator and numeric owner thresholds.

Exit:

- review-before-save E2E passes at 390/1024px;
- user input survives all retry/failure paths;
- reviewer SLA and operations dashboard exist;
- internal canary generates no invented action/date and records correction rate, cost, latency, save, export, and first completion.

## Phase 5 — Real Provider Decision

Open only when:

- provider retention/training/security and current official pricing are reviewed;
- all owner thresholds in `cost-model-v1.json` are non-null;
- rights/retention/takedown and URL threat controls are approved;
- fake-provider and rollback evidence is green;
- feature flag, per-user limit, daily/monthly budget, and kill switch pass.

Rollout:

1. employee/internal allowlist;
2. low-risk Korean HTML sources only;
3. small percentage canary with automatic shutdown on gate breach;
4. source-shape expansion one class at a time;
5. sensitive and nonlocal sources remain human-gated.

## Phase 6 — External Integration Decision

Do not start from API capability. Reopen one target only when observed users repeatedly export the same stable artifact and manual import is the bottleneck.

Required evidence:

- repeated destination use;
- import friction;
- stable artifact schema;
- permission clarity;
- reversibility;
- source/safety boundary travels.

Until then, keep ICS, CSV/XLSX, Markdown/text, and optional task CSV.
