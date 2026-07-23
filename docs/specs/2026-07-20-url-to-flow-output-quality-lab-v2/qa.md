# QA

## Evidence labels

Every claim must be labeled as one of:

- `verified_source`: checked against the original source/snapshot
- `deterministic_qa`: schema, validator or rule result
- `independent_agent_review`: blind model/agent judgment, not human validation
- `browser_qa`: render/interaction evidence, not user validation
- `user_review`: direct feedback from the product owner
- `observed_user`: only a real target-user session

## Required checks

### Per case

- Source URL/snapshot and bounded scope are recorded.
- Expected full row count and landmarks are frozen before generation.
- Every SourceRow has exactly one accounted role or an explicit multi-role justification.
- Every Item has direct SourceReferences or an explicitly private user-request boundary.
- No unsupported date, repeat, condition, fact or outcome is generated.
- Feasibility status, readiness, blocker and error code are not collapsed.
- Primary artifact is justified by the retained user result, not the source title.
- Each projection states availability, essential retained fields and loss.
- Safety/rights/locale/privacy/publication remain independent gates.

### Per batch

- Schema/validator: 100% for valid envelopes.
- Source scope and role accounting: 100%.
- Negative disposition: 100%.
- Checkability precision: 95% overall and 100% for safety cases.
- Core taxonomy/primary-artifact gold match: 90%.
- Three-way exact agreement: 85%, with zero blocking disagreement.
- Applicable projection essential-field retention: 100%.
- Core positive no/minor edit: at least 7/8.
- Median correction time: at most 5 minutes.
- No ready-labeled case requires major structural regeneration.
- Two consecutive batches have zero control regression.

## Executed checks

```powershell
npm.cmd run docs:check
node --test docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/validate-output-quality-v2.test.mjs
node --test docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/compile-review-results-v2.test.mjs docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/correction-timer-v2.test.mjs
node docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/compile-review-results-v2.mjs --check --json
node docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/validate-output-quality-v2.mjs --all --json
node scripts/content-audit/verify-url-to-flow-output-quality-lab-v2.mjs --json
```

For the final HTML:

- parse the inline JavaScript
- open at desktop and 390px widths
- check horizontal overflow and console errors
- inspect K-MOOC, 농사로, one strong Calendar case, one decision Sheet case and every boundary disposition

## Final automated evidence

- `npm.cmd run workflow:session-start`: current branch and dirty ownership recorded on 2026-07-20.
- Portfolio: 18 source-backed cases and 152 frozen SourceRows; exact-once role accounting 152/152.
- Round 1 actual payload retention 89.66%; Round 2 88.52%. The strengthened validator diagnosed the historical losses instead of rewriting their timing ledger.
- Round 3 and Round 4: four-axis three-way agreement 100%, gate three-way agreement 100%, actual payload retention 100%, negative/hold disposition 100%, unsupported inference 0, control regression 0.
- Round 3 stopwatch: core 8/8 measured, median 38.675 seconds, P75 40.547 seconds.
- Round 4 stopwatch: core 8/8 measured, median 34.966 seconds, P75 51.198 seconds; 5 `none`, 3 copy-only `minor`, 0 major/full. All three minor copy corrections were applied to the final DTO.
- Purpose-built verifier: 32/32 gates pass.
- Unit tests: validator 30/30; compiler/timer 5/5.
- Browser QA at 1280x720 and 390x844: 18 gallery controls, six opening examples, four-round timeline, K-MOOC 14 rows, five projection states per case, no document-level horizontal overflow and zero console errors.
- 농사로: external projections remain blocked while the internal Memo preserves two normal Items, three conditional responses and two decision references.
- Low-cost/high-capability labels are independent agent profiles, not measured provider tiers. Token, latency and monetary cost evidence remains unavailable.
- Product-owner review and observed-user usefulness evidence remain pending.
