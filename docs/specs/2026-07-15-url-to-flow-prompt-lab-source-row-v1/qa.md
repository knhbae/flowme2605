# SourceRow-only Corrected Lane QA

**Status:** Evidence run complete · protocol conformance **FAIL** · Prompt Lab v1 **FAIL** · production backend **No-Go**

## Evidence checks

- [x] legacy contaminated evidence is frozen separately and excluded from corrected completion;
- [x] 12/12 pipeline packets and 10/10 positive generator prompts exist;
- [x] 2/2 negatives record `modelInvoked=false` and exact deterministic disposition;
- [x] forbidden generator semantic key/value/provenance-ID hits are zero in the original leakage report;
- [ ] full generator input contract: FAIL because canonical `case-01...10` remained generator-visible instead of an opaque remap;
- [x] compact schema budget passes;
- [x] bare proposal and run-envelope proposal diagnostics are byte-equivalent;
- [x] Round 1–3 raw outputs and logs are preserved;
- [x] Round 2 and Round 3 blind-review fingerprints and allowed-field boundaries pass;
- [x] provider/model/tier/token/cost/latency values remain null and `humanReviewer=false`;
- [x] report data, comparison Markdown, Korean HTML, and 10 FLOW previews recompute from raw evidence;
- [x] completion verifier file/hash integrity: PASS with zero file-integrity failures;
- [ ] completion verifier protocol conformance: FAIL on opaque case ID, Round 1 batch shape, Round 3 prerequisite, and run-input/fresh-context proof;
- [ ] completion verifier quality gates: FAIL on input contract, Round 2 keep/unsupported, and Round 3 schema/accounting/unsupported — intentionally unchecked because the experiment failed.

## Quality checks

- [x] Round 2 schema-valid: 12/12;
- [x] Round 2 SourceRow accounting: 16/16;
- [ ] Round 2 unsupported action/date/repeat/fact: 15, required 0;
- [x] Round 2 negative gate: 2/2;
- [x] Round 2 positive proposal coverage: 10/10;
- [ ] Round 2 Item keep rate: 73.3%, required at least 80%;
- [x] Round 2 seven-axis average: 4.49, required at least 3.5;
- [x] Round 2 Execution Clarity: 4.4, required at least 4.0;
- [x] Round 2 Content Fidelity/Coverage: 4.3, required at least 4.0;
- [x] Round 2 Source/Safety Separation: 4.4, required at least 4.0;
- [ ] Round 3 schema-valid: 11/12, required 12/12;
- [ ] Round 3 SourceRow accounting: 15/16, required 16/16;
- [ ] Round 3 unsupported action/date/repeat/fact: 7 facts, required 0;
- [x] Round 3 negative gate: 2/2;
- [x] Round 3 Item keep rate: 81.25%;
- [x] Round 3 seven-axis average: 4.36;
- [x] Round 3 Execution/Fidelity/Safety: 4.4 / 4.2 / 4.1.

Round 3 ran as a disclosed failure-replication comparison after Round 2 failed, but this violated the preregistered “Round 2 passes first” condition. It cannot rescue Round 2 and is not completion authority. Recorded-output signature match was 5/12 overall, **3/10 positive model-generated cases (30%)**, and 2/2 deterministic negatives. Run logs do not bind outputs to packet hashes or prove fresh contexts, so this is not verified same-input model stability.

## Independent audit corrections

- [ ] Round 1 batching: actual output envelopes are 4+4+2+2, not the preregistered 4+4+4;
- [ ] Round 3 prerequisite: Round 2 did not pass before Round 3;
- [ ] run binding: packet/prompt/schema files are reusable, but recorded runs do not contain their hashes;
- [ ] reviewer policy robustness: prompt v1.1 permits `resource -> use_resource`, while case-06 received edit and case-09 keep. Reclassifying case-06 alone would move keep from 73.3% to 80%, so the keep failure is policy-sensitive; unsupported=15 remains a decisive failure;
- [x] one-defect revision: normalized prompt diff proves v1.1 differs only by version labels and the `required_output_contract_compliance` lock;
- [x] lane metadata now lists both prompt v1.0 and v1.1 and labels the lane experimental evidence, not completion authority.

## Browser QA

- [x] Korean report opens as a 16-slide deck at 1440×1000, 1024×768, and 390×844;
- [x] no document-level horizontal overflow, slide-child clipping, or console/page errors at those viewports;
- [x] previous/next buttons are 44×44 and change the counter `1 / 16 -> 2 / 16 -> 1 / 16` by click and keyboard;
- [x] the preview index exposes 10 cards on desktop/mobile;
- [x] an initial broken `previews/previews/...` relative link was found, fixed in the generator, regenerated, and reverified by normal click;
- [x] case-01 opens with two visible Items, original-source link, and an explicit “not saved/published” notice.
- [x] final navigation controls occupy a reserved top safe area; no slide-start content/control overlap at desktop, tablet, or mobile.

Evidence: [browser-qa.json](../../content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/qa/browser-qa.json).

Machine verdict: [completion-verification.json](../../content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/completion-verification.json) records `evidenceFileIntegrityPassed=true`, `protocolConformancePassed=false`, `evidenceIntegrityPassed=false`, `completionGatesPassed=false`, and `completionPassed=false`.

## Repository checks

- [x] `node scripts/sync-skills.mjs --check`: PASS (`Skill sync check passed.`);
- [x] `node --check` on all eight corrected-lane scripts: PASS;
- [x] all 95 JSON files under the corrected spec/audit roots parse successfully;
- [ ] `node scripts/check-docs.mjs`: FAIL on three links already present in `HEAD`, outside this Prompt Lab slice:
  - `docs/content-audit/2026-07-12-flowme-public-flow-visual-system-evidence/README.md` -> missing `2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`;
  - `docs/DECISIONS.md` -> missing `../my_tests/260616_check_01.md`;
  - `docs/IDEAS.md` -> missing `2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`;
- [x] `git diff --check`: exit 0; only existing LF-to-CRLF warnings were emitted.

The two Node commands above are the exact constituents of `npm.cmd run docs:check`; they were invoked directly because PowerShell and batch-command startup were unavailable in the full system drive condition.

Machine evidence: [command-qa.json](../../content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/qa/command-qa.json) and [json-parse-qa.json](../../content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/qa/json-parse-qa.json).
