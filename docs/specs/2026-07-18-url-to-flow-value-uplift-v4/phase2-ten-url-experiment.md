# Phase 2: ten-URL dual-tier evidence run

## Goal

Re-open the ten positive URL cases from the v3/v4 laboratory, freeze a current source snapshot for each case, and run the same source-to-Flow contract through a lower-cost and a higher-capability model lane. The result must make the exact source evidence, exact generated Flow, rendered destination artifacts, and every zero-output state visible before any score.

This is an evidence run for a later URL/AI backend decision. It does not authorize production fetching, automatic publication, OAuth, account writes, creator approval, or a public launch claim.

## Current strategy baseline

The run uses the newest CEO strategy-session artifact available in the workspace on 2026-07-19:

- `D:/flowme2605/flow-mvp/docs/content-audit/2026-07-18-flowme-flow-content-model-category-playbook-ceo-ko.html`
- content contract: `2026-07-18-flowme-flow-content-contract-v1.json`
- category/P0 ledger: `2026-07-18-flowme-flow-content-category-examples.json`

These files are untracked in the main worktree at capture time, so they are treated as a version-locked strategy input rather than a canonical roadmap override. SHA-256 values are recorded in `experiment-contract.json`.

Inherited rules:

- `Item` is the smallest independently stateful execution unit.
- A Flow has one user job, one primary source, and one primary artifact.
- Calendar, checklist, todo, sheet, and memo are projections of Items, not the minimum data unit.
- Life area, one of seven planning patterns, and primary artifact are separate axes.
- AI may propose evidence and structure; deterministic checks own traceability, completion, projection loss, and publish gates.

## Input set

Use `case-01` through `case-10` from the v4 report. These are the ten former positive cases, not ten previously product-ready Flows. `case-11` and `case-12` stay outside this run because the original file is unavailable and the locale-sensitive source is unsuitable.

Each input contains:

1. URL, publisher, source type, risk and rights status from the frozen case inventory;
2. current HTTP/final URL and capture timestamp;
3. page title, headings, selected text windows, image alt text, and a bounded body-text sample;
4. snapshot hash and explicit extraction failures.

## Two model lanes

Both lanes receive the same snapshot JSON and `phase2-generation-prompt.md`.

| Lane | Session proxy | Purpose |
|---|---|---|
| lower-cost | `gpt-5.6-terra` | test whether a cheaper proposal lane is sufficient |
| higher-capability | `gpt-5.6-sol` | test the quality ceiling and adjudication/escalation need |

The session model names are proxies, not API products with measured billing. Report prompt/output size, retries, elapsed wall-clock where observable, and escalation rate; leave actual provider price blank rather than inventing it.

## Required output per case

- source coverage: `full`, `bounded_complete`, `partial`, or `unusable`;
- exact SourceEvidence text plus a locator inside the frozen snapshot;
- one user job, life area, planning pattern, primary artifact, and risk/publication state;
- zero or more Steps and independently stateful Items;
- every Item has an action-first title, `doneWhen`, order, and SourceEvidence references;
- minimum input only when it changes the result;
- natural destination payloads with a loss ledger;
- rendered calendar/ICS, checklist, sheet/CSV, todo, or memo previews when supported;
- explicit `compile_candidate`, `draft_only`, `reextract_required`, or `blocked` disposition.

## Absolute gates

- 10/10 cases have a current snapshot or explicit access failure.
- Accepted candidates have 100% valid SourceEvidence references and zero unsupported claims.
- Accepted Items have observable completion and no generic filler.
- The primary artifact is natural for the user job; unsupported projections stay locked.
- Sensitive medical, financial, privacy, and safety cases cannot become auto-public candidates.
- Exact output and zero-output states appear before aggregate scores in the report.
- At least five planning patterns must be represented across accepted plus correctly held cases; no quota may force a Flow from insufficient evidence.

## Decision boundary

The backend decision is:

- `Go to minimum internal adapter` only if source capture is repeatable, at least six cases are editorially usable across at least four planning patterns, accepted candidates have zero unsupported claims, and the lower-cost lane can be accepted or deterministically escalated without hidden manual reconstruction.
- `Hold production URL/AI backend` whenever actual provider cost is unmeasured, creator rights/approval is missing, sensitive cases require human review, or the accepted-Flow rate is below the gate.

Passing this run never authorizes automatic publication. Human review remains mandatory.

## 2026-07-19 result

- Current snapshot or explicit fallback state: `10/10`; all ten were readable, with two static-HTML fallbacks recorded rather than hidden.
- Raw hard-gate pass: lower-cost session proxy `7/10`; higher-capability session proxy `3/10`.
- Raw exact-evidence failures: lower-cost `8`; higher-capability `36`. The richer lane was preferred in blind surface review but paraphrased or grouped evidence more often.
- Blind overall votes: higher-capability `13`, lower-cost `4`, tie `3`; both reviewers were model proxies, not humans.
- Selected set after hard gates: `9` generated Flows and `1` correct re-extraction hold across six planning patterns.
- Three lower-cost cases required a separately logged evidence-only repair proxy: eight operations, 48 weighted points, zero deletions. This is not human edit distance.
- Selected hard-gate validation: `10/10`; public-ready count remains `0`.

Decision:

- minimum internal snapshot/proposal/validation adapter: `conditional_go`;
- production URL/AI backend: `hold`;
- automatic publication: `no_go`.

The production hold remains because actual provider cost/latency/retry telemetry, human pairwise review, human edit distance, creator approval, and sensitive-content review are absent. See `docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark/report.html` and `case-gallery.html`.
