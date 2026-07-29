# QA

## Automated contract checks

Run:

```powershell
npm.cmd run content:url-to-flow-v4:verify
```

The validator requires:

- live baseline count `7`;
- twelve reassessed cases;
- dispositions `1 compile_candidate / 9 reextract_required / 2 blocked`;
- v3 product-ready count `0`;
- worked candidate SourceEvidence accounting `100%`;
- unsupported claims `0`;
- generic actions `0`;
- observable completion `100%`;
- live-baseline capability coverage `100%`;
- three projection payloads with loss ledgers;
- four deliberate negative mutations rejected;
- two reversed-order blind packets;
- pairwise candidate wins `13/14`, overall choices `2/2`, unsafe findings `0`;
- sixteen report slides, one twelve-case content gallery, and twelve four-part case previews.
- an explicit `1 generated / 11 intentionally not generated` content count;
- one rendered example calendar/ICS, checklist, and memo payload.

## Visual checks

- Open `docs/content-audit/2026-07-18-url-to-flow-value-uplift-v4/report.html` through a local HTTP server.
- Verify the first viewport says `1 generated / 11 intentionally not generated` and shows the actual case-02 Flow content.
- Use next/previous buttons and keyboard arrows.
- Check the 16th slide, the twelve-case gallery, at least one hold preview, and the worked candidate preview.
- Verify desktop and mobile widths have no horizontal overflow or clipped primary text.
- Inspect the rendered first Flow, actual-output slide, and twelve-case gallery screenshots.

## Evidence boundary

Passing QA proves the contract and worked-example evidence are internally consistent. It does not prove production fetch safety, extractor quality across ten URLs, human preference, user behavior, public readiness, or actual provider cost.

## 2026-07-18 run result

- `npm.cmd run content:url-to-flow-v4:verify`: passed.
- Browser/IAB: 16 slides rendered; the next control moved through slides 1→2→3→4 and updated the counter correctly.
- Desktop: at explicit `1060x712`, all sixteen slides measured one viewport high and had zero horizontal overflow.
- Mobile: at explicit `390x844`, the report and gallery had zero horizontal overflow; the first Flow remains readable as a vertical sequence.
- Actual-content checks: slide 1 shows `1 generated / 11 intentionally not generated`; slide 3 shows the example calendar, checklist, and memo; slide 4 shows exact SourceRows and v3/v4 output states for cases 01–06.
- Gallery: twelve cases rendered, each with four sections (`source / v3 / v4 or zero output / decision`), and report/gallery console error and warning logs were empty.
- `npm.cmd run docs:check`: skill sync passed, then the repository-wide link check stopped on three pre-existing broken links outside this v4 package (`2026-07-12-flowme-public-flow-visual-system-evidence/README.md`, an older `DECISIONS.md` link to `my_tests`, and an older `IDEAS.md` link). No v4 path was reported.

## Content-visibility correction

- The first version explained the quality gate before showing the generated content and could be misread as twelve completed v4 Flows.
- The corrected report exposes the real count (`1 generated / 11 intentionally not generated`) on the first slide.
- Every case preview now follows the same four-part structure: source evidence, exact v3 output, actual v4 output or zero-output state, and decision/next extraction.
- The case-02 example uses `2026-07-20` only as a labeled user-input fixture and renders the resulting four-week calendar recurrence, checklist text, memo text, and ICS.

## 2026-07-19 ten-URL phase 2 evidence

- `node scripts/content-audit/capture-url-to-flow-ten-url-snapshots.mjs`: `10/10` current snapshots or explicit fallback states; ten readable snapshots.
- `node scripts/content-audit/validate-url-to-flow-ten-url-experiment.mjs`: intentionally exits non-zero on the frozen raw outputs and records 44 exact-evidence hard errors (`8` lower-cost, `36` higher-capability). This raw failure record must not be replaced by the repaired selection.
- Two isolated session-model generation lanes produced ten JSON cases each; both files pass `JSON.parse`.
- Two reversed-order blind model-proxy reviews produced `10/10` cases each and `20` overall choices (`13` higher-capability, `4` lower-cost, `3` tie). This is not human review.
- `node scripts/content-audit/assemble-url-to-flow-ten-url-benchmark.mjs`: selected set validates `10/10`, with nine generated Flows, one correct hold, six planning patterns, and zero unsupported claims.
- Evidence-repair proxy: three cases, eight exact-quote operations, 48 weighted points, zero deletions, and `actualHumanEdit: null`.
- Production decision remains `hold`; only the minimum internal adapter is `conditional_go`.
- `node scripts/content-audit/build-url-to-flow-ten-url-benchmark-report.mjs`: generated 15 report slides and ten detailed gallery cases with no UTF-8 replacement characters.
- `node scripts/content-audit/validate-url-to-flow-ten-url-report.mjs`: passed all report, gallery, selected-data, content-order, zero-output, decision, and non-claim checks.
- Playwright CLI desktop at `1440x900`: all 15 report slides stayed within one viewport height, report and gallery horizontal overflow were zero, slide buttons and keyboard navigation reached the correct hash/current state, and console errors/warnings were zero.
- Playwright CLI mobile at `390x844`: report and gallery document overflow were zero, the first viewport retained the case-02 source/Flow/calendar example, the ten-case index and case-06 hold were readable, and console errors/warnings were zero. The run found and fixed responsive nav-current drift after viewport changes plus long-URL gallery overflow.
- `npm.cmd run docs:check`: skill sync passed; the repository-wide link checker still stops on the same three pre-existing links outside this experiment package (`2026-07-12-flowme-public-flow-visual-system-evidence/README.md`, the older `DECISIONS.md` link to `my_tests`, and the older `IDEAS.md` value-chain link). No phase 2 path was reported.

Still required before production Go:

- provider request IDs, billed tokens/cost, latency and retry telemetry;
- human pairwise review and human edit-distance measurement;
- creator/reference rights approval and sensitive-content review;
