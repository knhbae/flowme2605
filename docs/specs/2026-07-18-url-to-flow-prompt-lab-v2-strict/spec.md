# URL-to-FLOW Prompt Lab v2 — Strict Authoritative Lane

**Date:** 2026-07-18  
**Status:** preregistered before any v2 model-proxy output  
**Lane:** `url-to-flow-source-row-v2-strict`  
**Prior evidence:** the 2026-07-15 lane remains failed experimental evidence and is not promoted or rewritten by this experiment.

## Question

Can the unchanged canonical set of 10 positive and 2 deterministic-negative examples produce useful, source-grounded FLOW drafts when the generator receives only opaque controls plus `SourceRow.rowType/title/detail/order`?

This experiment tests a provider-neutral prompt and a compact semantic proposal. It does not test live URL fetching, external model APIs, databases, application persistence, automatic save, publication, or direct Calendar/todo writes.

## Authority Boundary

```text
deterministic preflight
-> opaque SourceRow packet
-> bounded model-proxy semantic proposal
-> strict schema and grounding validator
-> blind review
-> explicit human review/save boundary
```

- Deterministic code owns intake, locale/risk/access gates, opaque remapping, negative results, schema validation, literal schedule checks, SourceRow accounting, hashes, and projection serialization.
- The model-proxy may propose only the narrow fields in `proposal-schema-v2.json`.
- Human review owns disputed meaning, rights, sensitive applicability, final save, and publication.
- The reusable schema retains `partial` and `insufficient` for future sparse inputs. The frozen ten positive packets are not sparse: they contain 15 Item-eligible primary rows, so this strict corpus requires `state=proposal` and one Item per eligible row. A complete-looking invented Flow is a failure.

## Frozen Case Set

- Audit lineage is exactly the same `case-01` through `case-12` set used by the corrected v1 lane.
- Cases 1-10 pass deterministic preflight and are model-proxy inputs.
- Case 11 is stopped as `missing_source_rows / source_import_required`.
- Case 12 is stopped as `locale_applicability_unverified / hold`.
- Generator-visible request, sample, source, and row references are new opaque values. Canonical audit IDs and hidden mappings never appear in generator packets.
- A packet contains only `requestRef`, `sampleRef`, `maxItems`, opaque source ownership, and SourceRows. The only semantic fields are `rowType`, `title`, `detail`, and `order`.

The generated `freeze-manifest.json` binds the raw bytes of the case set, prompt, schema, rubric, every packet, and each batch input before Round 1 begins.

## Row-Type License

These licenses are part of both generation and review policy. They are not hidden expected answers.

| rowType | Allowed Item behavior | Not allowed |
| --- | --- | --- |
| `check` | one checkable Item; an action phrase may stay unchanged; a noun phrase may add only `확인하기` | preparation, purchase, booking, or domain facts absent from the row |
| `procedure` | perform the named procedure; source detail may be copied into memo | extra substeps or tools not present in title/detail |
| `table_row` | one progress Item; may add only `완료하기` | invented dates, curriculum, or scoring rules |
| `resource` | one Item that opens the named resource; may add only `열어보기` | claiming to cook, watch, print, learn, or follow unseen resource contents |
| `date` | an explicit action may add only `하기`; a date/window label may add only `확인하기`; schedule evidence still requires a literal value | treating a label, ordinal, week number, or stage number as a real schedule |
| `reference` | memo/omission only; a supporting-source reference cannot control an Item | turning reference prose into user work |

Rows owned by a supporting source are always omitted as `supporting_source_boundary`. Every received row must appear exactly once across Item mappings and omissions.

## Uncertainty Policy

- `lifeArea`, `planningPattern`, `sourceShape`, generated user need, and generated Flow title are outside this strict semantic proposal. They remain controller/review metadata until richer extraction supports them; the model cannot fill them from topic guesses.
- `primaryArtifact` is nullable and follows the frozen row/schedule matrix only.
- A label such as `정기검사 유효기간` without an actual value may become `정기검사 유효기간 확인하기`, but it has no schedule and must expose `missing_date_value`; it is not a calendar event.
- A single resource can become a memo/open-resource Item, but its unseen contents cannot become actions.
- Every resource row exposes `resource_contents_unseen`; every missing-value date row exposes `missing_date_value`; every supporting-source row exposes `supporting_source_not_structural`, with the affected row in `humanCheckRowRefs`.
- `maxItems` is a cap, never a target. In this frozen corpus every eligible primary row is nevertheless required because all 15 were preregistered as structurally actionable.
- Only literal source detail may appear in `memo`.
- Only a literal source substring may appear in `scheduleEvidence.sourceText`.

## Three-Round Protocol

### Round 1 — baseline

1. Freeze cases, prompt v2.0, schema, rubric, packets, and batch inputs.
2. Execute exactly three isolated four-case pipeline envelopes: A=1-4, B=5-8, C=9-12.
3. Spawn one fresh-context generator for each envelope with `fork_turns=none`. Batch C gives the generator only the two positive packets; the controller adds the two deterministic negative outputs.
4. Record prompt/schema/case/packet/batch hashes, agent task ID, evidence class, timing availability, token/cost availability, and all raw outputs.
5. Run schema, accounting, literal-schedule, negative, and leakage validation; then run a blinded review of the ten model-positive outcomes.

The authoritative automatic report path is fixed by these exact commands (the review builder later recomputes and compares the stored JSON):

```powershell
node scripts/content-audit/validate-url-to-flow-strict-v2.mjs --all --round round-1 --out docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-1/validation.json
node scripts/content-audit/validate-url-to-flow-strict-v2.mjs --all --round round-2 --out docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-2/validation.json
node scripts/content-audit/validate-url-to-flow-strict-v2.mjs --all --round round-3 --out docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-3/validation.json
```

If Round 1 fails, select exactly one highest-risk defect class before changing anything. Round 2 may change only that prompt class. If Round 1 passes every quality gate, Round 2 is an unchanged confirmatory replication and records `revisionClass=null`.

### Round 2 — one revision or unchanged confirmation

- Re-run all 12 cases as three new isolated 4-case envelopes in fresh contexts.
- Do not edit individual outputs.
- Run the same automated and blinded gates.
- Round 2 is the first completion-quality authority.

### Round 3 — prerequisite-bound stability

- Run only if Round 2 passes every completion gate.
- Use byte-identical prompt, schema, cases, packets, and batch inputs from the passing Round 2 configuration.
- Run three new fresh-context envelopes and the same blind review.
- Round 3 must independently pass all quality gates.
- Compare the core-decision signature. Exact-match rate is diagnostic because no stability threshold was preregistered.

If Round 2 fails after the one permitted revision, the lane stops. It must not run Round 3 or call itself complete.

## Completion Gates

The lane completes only if Round 2 and Round 3 independently pass all applicable gates.

| Gate | Threshold |
| --- | ---: |
| SourceRow-only packets and forbidden semantic leakage | 10/10 clean positive packets; 2/2 stopped before model |
| Pipeline envelope shape | exactly 3 envelopes x 4 audit cases per round |
| Prompt/schema/case/packet/batch hash binding | 100% |
| JSON/schema valid | 100% |
| SourceRow accounting | 100% exactly once |
| unsupported action/date/repeat/fact | 0 |
| deterministic negative disposition | 2/2 exact |
| blind-review Item keep gate | >= 80%; minimum of proposed-Item keep and eligible-SourceRow keep coverage |
| seven-axis average | >= 3.5 |
| Execution Clarity | >= 4.0 |
| Content Fidelity/Coverage | >= 4.0 |
| Source/Safety Separation | >= 4.0 |
| compact schema and strict objects | all limits pass |
| bare single-result validator equivalence | PASS |

Quality averages use all ten model-positive proposals. The two deterministic negatives are judged only by exact disposition and no-model evidence, so they cannot inflate quality scores. The frozen positive set has 15 Item-eligible primary rows and one supporting/reference-only row. `rawItemKeep = kept proposed Items / all proposed Items`; `eligibleRowKeepCoverage = eligible rows mapped to kept Items / 15`; the gate uses the lower value so omission cannot improve the score.

## Core-Decision Signature

Round 2 and Round 3 compare:

- result state and reason code;
- nullable primary artifact;
- each Item's SourceRow grouping, intent, completion mode, schedule-evidence presence, and projection membership;
- omitted row and reason-code pairs;
- uncertainty codes and human-check row references.

Item-title wording differences that both remain inside the frozen row license do not by themselves create a signature mismatch. Generated user need and generated Flow title are not fields in the strict proposal.

## Evidence Labels

- This session's generators and reviewers are `current_session_model_proxy` evidence.
- The run log records agent task IDs and `spawn_agent(fork_turns=none)` isolation, but provider/model/tier identity remains `null` unless directly exposed.
- Latency, token use, and cost remain `null` unless directly measured.
- No conclusion about cheap versus premium models or production cost may be drawn from this lane.
- Real provider/model and cost comparison requires replaying the frozen packets later without changing the contract.

## Required Deliverables

- frozen spec, prompt, schema, rubric, cases, hidden mapping, and hash manifest;
- positive packets and exact A/B/C batch manifests;
- raw run envelopes for every executed round;
- automatic validations and blinded reviews;
- user-facing FLOW previews for all ten positive cases;
- comparison Markdown, Korean PPT-style HTML, completion verifier, and QA evidence;
- explicit local/commit/push/PR/deploy status.
