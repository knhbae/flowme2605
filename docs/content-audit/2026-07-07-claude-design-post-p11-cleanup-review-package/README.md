# FlowMe Claude Design Post-P11 Final Review Package

- Generated: 2026-07-06T22:55:07.298Z
- Branch: `codex/flowme-uxui-second-loop`
- UI baseline commit: `fcd96e4`
- Package generated from commit: `fcd96e4`
- Package commit ref: `git commit containing this generated package`
- Viewport: 390x844
- Base scenario screenshots: 26
- URL-first/manual QA supplement screenshots: 6
- Total screenshots for Claude review: 32

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails, the P8-01 generalized scan rules, the P8-02 restart/prototype promotion gate, the P8-03/P8-04 My Flow overdue label/status corrections, the P8-05/P8-06/P8-08 evidence/package metadata cleanup, the P8-07 restart date-display decision, the P8-09 field-checklist source-density rule, and the P8-10/P9-02 public share CTA/tab-order rule.

It also keeps the P9-01 to P9-07 coverage closed: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

For P10, this package closes P10-01 to P10-07: guardrail/capture canonicalization, public share primary save/setup path evidence, actionable My Flow continuation, Calendar agenda group-header density, shorter visible control labels with accessible names, GitHub link-base cleanup, and visible-text/input-value raw ISO separation.

For P10-07 specifically, the scan separates raw ISO visible text from raw ISO input values. Native `input[type=date]` ISO values are treated as technical browser control values and recorded in an explicit exemption bucket; non-date input values with raw ISO remain guardrail hits.

P11-02 adds JSON-level evidence markers for the P10-03/P10-04/P10-05 claims: `continuationActionable`, `agendaGroupMeta`, and `rowControlAccessibleNames`. Claude Design can now judge the continuation row, Calendar/My Flow group metadata, and short visible labels with preserved accessible names from `route-evidence.json` without relying only on screenshots.

P11-04/P11-09 reduce My Flow inventory metric noise. Each saved-content row exposes one primary progress label, and the mobile all-tab header avoids large total remaining-count copy. The capture output records `inventoryProgressMetrics` and `inventoryHeaderMetrics` so duplicate progress metrics and large remaining-count headers can be judged from JSON markers.

P11-05/P11-06 keep the capture pipeline aligned with the canonical guardrail library and make native date input exemptions traceable by test id. P11-07/P11-10 keep fridge/washer setup paths measurable and allow the fridge first-action title to wrap to two lines on mobile. P11-08/P11-11 lower repeated field-checklist detail caution copy and extend public workbench export-label evidence so duplicate visible export entry points are caught.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [review-brief-ko.md](./review-brief-ko.md)
- [review-intake-ko.html](./review-intake-ko.html)
- [prompt-copy-ko.md](./prompt-copy-ko.md)
- [url-first-supplement-evidence.json](./url-first-supplement-evidence.json)
- [screenshots/](./screenshots/)

## Post-P11 Supplement

The base capture contains 26 mobile screenshots for Home, Flow finding, Flow Map save, public `/f`, My Flow, Calendar, workbench, and restart/prototype scenarios.

This Post-P11 review package also adds 6 supplemental screenshots for the URL-first P0 and source-backed manual registration flow:

- `27-url-first-hit-mobile.png`
- `28-url-first-custom-start-mobile.png`
- `29-url-first-miss-candidate-form-mobile.png`
- `30-url-first-candidate-handoff-mobile.png`
- `31-url-first-p0-lab-mobile.png`
- `32-source-backed-manual-registration-report-mobile.png`

Use `review-intake-ko.html` as the Korean human-facing index and `prompt-copy-ko.md` as the copy-paste Claude Design request.

## Guardrail Summary

- Normal route internal copy hits: 0
- Normal route source slug hits: 0
- Normal route trailing Flow/map phrase hits: 0
- Normal route raw ISO hits: 0
- Normal route input raw ISO hits: 0
- Normal route native date input raw ISO exemptions: 2
- Normal route first task repetition hits: 0
- Normal route continuation actionable count: 4
- Normal route continuation explanation-only count: 0
- Normal route agenda/status group marker count: 2
- Normal route agenda/status repeated date meta rows: 0
- Normal route row control accessible name samples: 4
- Normal route row control samples with context: 4
- Normal route queue label scope: my-flow-queue-label-surfaces
- Normal route legacy overdue label hits: 0
- Normal route horizontal overflow count: 0
- Field workbench row-detail source link count: 0
- Field workbench source access link count: 5
- Field workbench repeated detail caution count: 0
- Public workbench duplicate export visible-label count: 0
- Public share route count: 9
- Public share secondary browse focusable count: 9
- Public share secondary browse after-primary count: 9
- Public share secondary browse before-primary count: 0
- Public share primary path focusable count: 9
- Public share primary path visible count: 9
- Restart prototype raw ISO hits: 0
- Restart prototype input raw ISO hits: 0
- Restart prototype native date input raw ISO exemptions: 4
- Restart prototype raw route slug hits: 0
- Restart prototype English weekday hits: 0
- Restart prototype English UI verb hits: 0
- Restart prototype English month/time hits: 0
- Restart prototype mixed export-language hits: 0
- Restart prototype duplicate export-entry hits: 0
- Restart source/export and bottom frames distinct: true
- Restart first 3 rows are one D-30 milestone group: true
- Restart D-30 milestone group heading visible: true
- Restart full schedule unique date labels: 5

## GitHub Links

- [Source root](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop)
- [E2E guardrails](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/flow-mvp.spec.ts)
- [Workbench source density E2E](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/workbench-source-density.spec.ts)
- [Public share CTA/tab-order E2E](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/public-share-cta-order.spec.ts)
- [Capture script](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/scripts/content-audit/capture-claude-p7-final-review-package.mjs)
