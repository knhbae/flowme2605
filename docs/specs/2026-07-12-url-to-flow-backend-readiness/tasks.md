# URL-to-Flow Backend Readiness Tasks

## Decision package

- [x] Define FLOW, canonical hierarchy, independent type axes, and coverage envelope.
- [x] Confirm SourceRow as evidence minimum and Item as execution/projection minimum.
- [x] Update current rules that still described Step as the new export minimum.
- [x] Mark historical Step-first specs as compatibility vocabulary.
- [x] Remove fixed 3-7 Item contract and invented sequential-date fallback from the future AI gate.
- [x] Define target projection/loss/fallback matrix.
- [x] Define algorithm-vs-LLM-human decision table.
- [x] Add provider-neutral cost model and pilot/launch/scale assumptions.
- [x] Add a planning cost validator for monthly, request, saved-Flow, first-completion, and NO-GO threshold behavior.
- [x] Add rights/security/privacy/reliability/operations/user-evidence checklist.
- [x] Add eight representative failure/state golden fixtures and an independent validator.
- [x] Add implementation sequence and integrated Go/No-Go.
- [x] Create example-first PPT-style Korean HTML review deck.

## Phase 0 implementation

- [ ] Wire one runtime schema validator into API, worker, import, and repository boundaries.
- [ ] Implement canonical semantic hash and stable Item ID policy.
- [ ] Implement canonical-to-current compatibility adapter.
- [ ] Implement loss-manifest type and projection result contract.
- [ ] Load and validate `cost-model-v1.json` in tests.

## Phase 1 projection

- [ ] Implement effective user-state reducer.
- [ ] Consolidate ICS/checklist/todo/sheet/memo projections.
- [ ] Add normalized semantic parity tests against current builders.
- [ ] Add destination import smoke fixtures.

## Phase 2 intake/fake-provider harness

- [ ] Add safe fetch threat controls in a non-production harness.
- [ ] Add snapshot and SourceRow extractor boundaries against fixture/local repositories.
- [ ] Add fake semantic provider and delayed/cancelled behaviors.
- [ ] Add rights, privacy, prompt injection, cost, and provider failure fixtures.
- [ ] Assert generation state, outcome, readiness, and errorCode separately.

## Phase 3 conditional repository

- [ ] Open this phase only after projection parity and fake-provider/state/failure evidence pass.
- [ ] Add repository interfaces and local adapter parity.
- [ ] Add SQL, indexes, constraints, RLS, and audit events.
- [ ] Add migration, shadow-write, comparison, and rollback behind a feature flag.
- [ ] Prove user overlay and removed-Item state preservation.

## Phase 4 canary

- [ ] Add proposal review and explicit save UI/API.
- [ ] Add redacted attempt cost/latency logs and product funnel.
- [ ] Set numeric cost, latency, quota, daily, and monthly thresholds.
- [ ] Run internal canary and record correction/save/export/first-completion evidence.

## Production gates

- [ ] Select and review DB provider/runtime.
- [ ] Select and review LLM provider retention, security, region, and current price.
- [ ] Approve rights/robots/terms/retention/takedown operation.
- [ ] Approve incident, feature-flag, deterministic-only, kill-switch, and rollback runbooks.
- [ ] Collect observed-user evidence before any validation claim.
