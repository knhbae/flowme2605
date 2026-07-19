# URL-to-Flow Backend Readiness QA

**Evidence refreshed:** 2026-07-13 KST<br>
**Decision package date:** 2026-07-12

## Evidence Scope

This QA proves the FLOW content/data/pipeline/economics/risk decision contract and the example-first review artifact. It does **not** prove a production DB, arbitrary-URL fetcher, real LLM provider, direct platform integration, numeric owner budget approval, or observed-user validation. Those remain explicit implementation or production gates.

## Required Checks

| Check | Evidence | Current result |
| --- | --- | --- |
| Canonical content fixtures | `node scripts/content-audit/validate-canonical-flow-model.mjs` | **PASS** — 10 positive, 2 negative, 9 life areas, 7 planning patterns, 5 projection targets. |
| Failure/state fixtures | `node scripts/content-audit/validate-url-to-flow-failure-fixtures.mjs` | **PASS** — 8 fixtures; 7 failed, 1 sanitized partial; state/outcome/readiness/error, 5 projections, retry/save rules asserted separately. |
| Cost model | `node scripts/content-audit/validate-url-to-flow-cost-model.mjs` | **PASS** — Pilot 76,896원, Launch 287,281원, Scale 1,452,392원/month; fully loaded request/save/first-completion metrics finite; null thresholds keep real provider NO-GO. |
| Documentation graph | `npm.cmd run docs:check` | **PASS** — 14 required files and 2,068 local links. |
| Conflict scan | targeted `rg` over `SERVICE_STRUCTURE`, flow rules, `DECISIONS`, and AI gate | **PASS** — active minimum is Item; Step-first statements are marked legacy/compatibility; 3–7 exists only as the memo fallback and `maxItems=7` cap, not a source-backed target. |
| HTML static shell | inline Node parse of the deck | **PASS** — 20 slides, 2 valid inline scripts, 0 `TODO/TBD/FIXME/PLACEHOLDER`. |
| Browser matrix | `npx.cmd --yes --package @playwright/cli playwright-cli -s=flowdeck run-code --filename scripts/content-audit/qa-flow-content-backend-deck.js` | **PASS** — 1440×900, 1280×720, 1024×768 all 20 slides have zero horizontal/vertical overflow; 390×844 has zero horizontal overflow and intentional slide scroll only. |
| Interaction/accessibility shell | same Playwright run | **PASS** — Arrow/Home/End, hash, overview open/close, range-key isolation, inactive-slide `inert`, 20-slide no-JS fallback, and 0 console warnings/errors. |
| Mobile composition | same Playwright run | **PASS** — opening slide second output ends at y=782 and decision rail starts at y=802; no overlap. |
| Cost simulator UI | same Playwright run | **PASS** — Launch 287,281원 and Pilot 76,896원 snapshots match the cost validator; changing a range does not change slides. p95 is explicitly a scenario assumption. |
| Artifact links | same Playwright run | **PASS** — 6/6 supporting links return HTTP 200 from the local review server. |
| Print artifact | Playwright `page.pdf` plus PDF object count | **PASS** — `output/playwright/flow-content-backend-goal.pdf`, 20 `/Type /Page` objects for 20 slides. |
| Static hygiene | `git diff --check` | **PASS** — no whitespace errors; pre-existing line-ending warnings only. |

## Visual Fidelity Ledger

**Accepted concept:** `docs/content-audit/assets/url-to-flow-contract-concepts/01-opening-example.png`<br>
**Latest implementation captures:** `output/playwright/flow-content-backend-goal-1440.png`, `flow-content-backend-goal-cost-1440.png`, `flow-content-backend-goal-final-1440.png`, `flow-content-backend-goal-390.png`

The accepted concept and latest captures were inspected together with `view_image` at original detail. The concept was checked at its native 1672×941 image size. The implementation was checked at 1440×900 with a native 1280×720 deck and at the actual 390×844 mobile viewport.

| Comparison point | Concept intent | Implemented result |
| --- | --- | --- |
| Brand/header | FlowMe mark, thin rule, page number | Preserved with a code-native mark and restrained mono section label. |
| Opening copy | Three-line `URL을 넣으면, 무엇이 FLOW가 되는가` | Same above-fold copy and deliberate three-line rhythm. |
| Data story | Source evidence → Item → Calendar/Checklist | Same sequence, with SourceRow and Item fields readable in real HTML. |
| Visual grammar | White field, dark green, thin borders, little decoration | Preserved; coral is reserved for blocked/NO-GO meaning. |
| Decision rail | One strong bottom conclusion | Preserved as `ICS는 결과이고, Item이 기준이다`. |
| Responsive composition | Wide explanatory board | Reflowed to a single executable reading order on mobile, with no card/rail overlap. |
| Review controls | Not shown in the concept | Added keyboard, overview, fullscreen, print, progress, hash, touch, and no-JS support without entering the slide canvas. |

### Above-fold copy diff

- **Concept:** title + a literal source table excerpt + JSON-like Item + two destination mockups.
- **Implementation:** the title is unchanged; the table/JSON treatment is simplified into semantic SourceRow and Item cards so the same DOM remains readable at 390px. The user-facing claim and example outcome are unchanged.

### Remaining intentional deviations

- The concept's literal table, curved branch, and decorative destination mockups became accessible cards and straight arrows. This is a responsive implementation choice, not a content loss.
- The concept used coral inside the opening decision sentence; the implementation keeps the opening rail green and reserves coral for rejection/NO-GO gates.
- The concept had no presentation chrome; the implementation adds controls outside the deck.
- Fullscreen permission itself is browser-controlled, so the guarded request path exists but headless permission acceptance is not treated as product evidence.

### Browser method and fallback

The in-app browser successfully opened the local HTTP deck and exposed the first-slide DOM. Its screenshot call timed out twice and its 20-slide batch timed out, so final visual and interaction QA used the persistent Playwright CLI session. This fallback is recorded rather than treating the failed capture path as proof.

## Completion Audit Map

| Goal requirement | Proving artifact |
| --- | --- |
| FLOW definition, kinds, hierarchy, coverage boundary | `spec.md`, slides 1–8, canonical contract |
| Item-centered canonical and external tools | `projection-loss-matrix.md`, slides 7–10 |
| URL lookup/fetch/extract/rules/LLM/review/save/projection | storage/API contract, `conversion-decision-table.md`, slides 11–13 |
| Unit cost, scenarios, cache, routing, thresholds | `cost-model-v1.json`, cost validator, interactive slide 14, slides 15 and 20 |
| Rights, freshness, localization, privacy, security, QA, observability, version/migration, operations, user validation | `risk-qa-checklist.md`, slides 16–17 |
| Positive, exclude/hold, proposal/projection/runtime failures | canonical golden fixtures, `failure-state-golden-fixtures-v1.json`, both validators, slide 18 |
| Implementation order | `plan.md`, slide 19 |
| Integrated Go/No-Go | `spec.md` Executive Decision, slides 3 and 20 |

## Current Decision After QA

- **GO:** runtime contract validator, compatibility adapter, projection parity, fake provider/state harness, cost instrumentation.
- **CONDITIONAL GO:** DB/repository shadow-write after parity, fake-provider failure evidence, RLS, migration, rollback, and redaction.
- **NO-GO:** arbitrary production fetch, real LLM, automatic retry, automatic save/publish/calendar write, and direct OAuth integration.

The decision package itself is complete and current QA is green. Production remains NO-GO because numeric owner thresholds, provider/rights/security approvals, runtime threat evidence, and observed-user canary evidence are intentionally unresolved.
