# FlowMe Taxonomy v1.1 QA

**Status:** contract/data/validator/closeout complete; local browser visual inspection blocked by Browser URL policy

**Evidence date:** 2026-07-20 KST

## Claim Boundary

This QA covers a documentation/data contract, deterministic validators, independent classifier consistency and static structure of a review artifact. It does not prove a production database, crawler, LLM provider, legal clearance, public-content approval or observed-user validation.

## Required Checks

| Check | Command/evidence | Result |
| --- | --- | --- |
| Generator: 84 reclassifications | `node build-reclassified-content-v1.mjs` | PASS · 24/36/12/12, total 84 |
| Generator: 10 DTOs | `node build-representative-backend-dto-v1.mjs` | PASS · 10 DTO / 58 SourceRow / 43 Item |
| Comparison builder | `node build-classification-comparison-v1.mjs` | PASS · 20 cases / 2 rounds |
| Taxonomy validator | `node validate-taxonomy-v1-1.mjs` | PASS · 6 checks |
| Validator mutation tests | `node --test validate-taxonomy-v1-1.test.mjs` | PASS · 15/15 |
| JavaScript syntax | `node --check` on 5 generator/validator files | PASS |
| HTML static contract | one bounded Node read/syntax check | PASS · 16 slides, unique IDs, no external runtime assets, responsive CSS, keyboard/hash/overview/print hooks |
| Documentation graph | `npm.cmd run docs:check` | PASS · skill sync and 14 required files / 2,434 local links |
| Scoped whitespace | `git diff --check -- <owned paths>` | PASS |
| Work closeout | scoped workflow closeout | PASS · two untracked owned paths isolated; unrelated dirty state preserved |

## Independent Comparison

Metric definition: for one axis, matching decisions across three classifier pairs divided by 60 pair-comparisons. Exact match is case-level unanimous agreement, not correctness or user validation.

| Axis | Round 1 | Round 2 | Change |
| --- | ---: | ---: | ---: |
| lifeArea | 100.0% | 100.0% | 0.0%p |
| sourceShape | 78.3% | 93.3% | +15.0%p |
| executionPattern | 83.3% | 96.7% | +13.4%p |
| primaryArtifact | 90.0% | 93.3% | +3.3%p |
| core four-axis exact | 45.0% (9/20) | 80.0% (16/20) | +35.0%p |
| all eight-axis exact | 20.0% (4/20) | 65.0% (13/20) | +45.0%p |

Round 2 gate-axis pairwise agreement: sourceRowStatus 96.7%, discoveryAccess 100%, rightsReview 96.7%, conversionReadiness 90%.

## Data Reconciliation

| Dataset/state | Count |
| --- | ---: |
| P0 portfolio | 24 |
| Source expansion | 36 |
| Deep set | 12 |
| Representative runtime seed | 12 |
| Total | 84 |
| Confirmed / provisional / blocked missing source | 27 / 25 / 32 |
| Backend-storable | 84 |
| Personal transform supported by current evidence | 6 |
| Public release supported by current evidence | 0 |
| Legacy hybrid / new hybrid | 26 / 0 |

`false` is fail-closed from current evidence, not a legal conclusion. The reclassification ledger and representative DTOs are different evidence packets, so review/readiness values may differ when the DTO includes newer or narrower evidence.

## Browser And Visual QA Boundary

- Accepted concept: `C:\Users\HUBERT\.codex\generated_images\019f5145-830f-7873-847e-18a230e0d6c9\exec-25fb7bb5-4cd6-42a6-b7e7-548c1cb944ca.png`.
- The concept was inspected at original detail with `view_image`.
- Intended native desktop viewport: 1440 × 900. Intended mobile viewport: 390 × 844.
- In-app Browser was selected first as required. It rejected the local `file://` report URL under its URL security policy before the page loaded.
- The rejection explicitly prohibited alternate-browser or indirect workarounds, so standalone Playwright/Chrome fallback was not attempted.
- No implementation screenshot, runtime console log or observed desktop/mobile overflow result exists. Static HTML checks passed, but visual rendering remains unobserved.
- No temporary screenshot artifact was created.

## Concept Fidelity Ledger

| Concept property | HTML implementation | Status |
| --- | --- | --- |
| Fixed dark navy rail, FlowMe mark, large slide number, contract badge | Implemented in pure CSS with fixed desktop rail and compact mobile top bar | Matched by code; not visually observed |
| Warm paper, ink navy, mint primary, coral warning palette | Implemented as CSS tokens and applied across cards, metrics and warnings | Matched by code; not visually observed |
| Four-column `기존 → 문제/증거 → v1.1 → 실제 결과` first slide | Implemented with four `flow-card` panels | Matched by code; not visually observed |
| Bottom evidence strip | Expanded to SourceSnapshot → SourceRow → SourceReference → Item → Projection | Matched and made canonical-v1 faithful |
| Rounded editorial cards, subtle grid, restrained shadows, dense but readable hierarchy | Implemented across all 16 slides | Matched by code; not visually observed |

Intentional deviations:

- The generated concept used an illustrative family-museum URL. The HTML uses the verified EasyLaw moving source instead, because the P0 family-museum case has no SourceRows.
- The concept suggested D-7/D-1/day-of rows. The implementation uses the six verified EasyLaw periods and leaves `이사 후` unscheduled rather than inventing D+1.
- Decorative pictograms in the concept were reduced to CSS marks, numbers and typography so the report remains one standalone file with no external assets.

## Remaining Human Review

- Open the HTML in a user-controlled browser and inspect 1440 × 900 plus 390 × 844.
- Check first-slide vertical fit, table wrapping on slides 10/12/14, keyboard navigation, overview dialog and print pagination.
- Do not relabel this manual rendering check as observed-user validation.

## Local Publish State And Next Goal

- The scoped result remains local and uncommitted. No commit, push, PR, merge or deploy was performed.
- The repository had unrelated dirty state before this goal; the two owned paths are isolated in the workflow closeout output and those unrelated changes were not modified by this work.
- Recommended next backend goal: build a provider-neutral URL-to-Flow preview compiler around these fixtures: request -> SourceSnapshot -> SourceRow acquisition result -> Taxonomy v1.1 assignment -> AI Draft Gate -> five projections. Keep runtime persistence, real crawler and paid LLM provider integration out of that fixture-first increment.
