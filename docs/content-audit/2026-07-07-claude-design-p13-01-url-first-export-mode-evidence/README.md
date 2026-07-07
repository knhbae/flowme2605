# FlowMe Claude Design P13-01 Final Review Package

- Generated: 2026-07-07T14:55:50.799Z
- Branch: `codex/flowme-uxui-second-loop`
- UI baseline commit: `7cb89e4`
- Package generated from commit: `7cb89e4`
- Package commit ref: `git commit containing this generated package`
- Viewport: 390x844

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails, the P8-01 generalized scan rules, the P8-02 restart/prototype promotion gate, the P8-03/P8-04 My Flow overdue label/status corrections, the P8-05/P8-06/P8-08 evidence/package metadata cleanup, the P8-07 restart date-display decision, the P8-09 field-checklist source-density rule, and the P8-10/P9-02 public share CTA/tab-order rule.

It also keeps the P9-01 to P9-07 coverage closed: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

For P10, this package closes P10-01 to P10-07: guardrail/capture canonicalization, public share primary save/setup path evidence, actionable My Flow continuation, Calendar agenda group-header density, shorter visible control labels with accessible names, GitHub link-base cleanup, and visible-text/input-value raw ISO separation.

For P10-07 specifically, the scan separates raw ISO visible text from raw ISO input values. Native `input[type=date]` ISO values are treated as technical browser control values and recorded in an explicit exemption bucket; non-date input values with raw ISO remain guardrail hits.

P11-02 adds JSON-level evidence markers for the P10-03/P10-04/P10-05 claims: `continuationActionable`, `agendaGroupMeta`, and `rowControlAccessibleNames`. Claude Design can now judge the continuation row, Calendar/My Flow group metadata, and short visible labels with preserved accessible names from `route-evidence.json` without relying only on screenshots.

P11-04/P11-09 reduce My Flow inventory metric noise. Each saved-content row exposes one primary progress label, and the mobile all-tab header avoids large total remaining-count copy. The capture output records `inventoryProgressMetrics` and `inventoryHeaderMetrics` so duplicate progress metrics and large remaining-count headers can be judged from JSON markers.

P11-05/P11-06 keep the capture pipeline aligned with the canonical guardrail library and make native date input exemptions traceable by test id. P11-07/P11-10 keep fridge/washer setup paths measurable and allow the fridge first-action title to wrap to two lines on mobile. P11-08/P11-11 lower repeated field-checklist detail caution copy and extend public workbench export-label evidence so duplicate visible export entry points are caught.

P12-01~P12-04 add the URL-first first-execution slice to the normal user-route guardrail set. The package captures hit, custom-start, miss, and saved-candidate states on `/flows` and records URL-first-specific buckets for internal copy, dynamic source slug, structural title, raw ISO text, and input raw ISO hits. These scenarios should remain at zero while preserving canonical lookup, source-backed reuse, and non-executable local candidate storage.

P12-05/P12-10 keep `/flow-lab/url-first-p0` and source-backed manual registration QA outside the normal user route set. The flow-lab route is captured as a prototype bucket with noindex metadata, and normal user routes record zero links to the flow-lab lab or internal manual-registration QA report.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [screenshots/](./screenshots/)

## Guardrail Summary

- Normal route internal copy hits: 0
- Normal route source slug hits: 0
- Normal route trailing Flow/map phrase hits: 0
- Normal route raw ISO hits: 0
- Normal route input raw ISO hits: 0
- Normal route native date input raw ISO exemptions: 4
- Normal route first task repetition hits: 0
- Normal route continuation actionable count: 4
- Normal route continuation explanation-only count: 0
- Normal route agenda/status group marker count: 2
- Normal route agenda/status repeated date meta rows: 0
- Normal route row control accessible name samples: 4
- Normal route row control samples with context: 4
- URL-first normal scenarios captured: 4
- URL-first states captured: ["hit","custom-start","miss","candidate"]
- URL-first internal copy hits: 0
- URL-first source slug hits: 0
- URL-first structural/trailing title hits: 0
- URL-first raw ISO hits: 0
- URL-first input raw ISO hits: 0
- URL-first native date input raw ISO exemptions: 2
- URL-first visible Markdown hits: 0
- URL-first export mode evidence count: 6
- URL-first export mode visible Markdown hits: 0
- URL-first start date input visible count: 2
- URL-first visible marker count: 4
- Flow-lab prototype route count: 1
- Flow-lab prototype bucket: true
- Flow-lab prototype noindex: true
- Flow-lab prototype linked from user nav count: 0
- Flow-lab prototype display-gate hit count: 1
- Manual registration QA user route link count: 0
- Normal route queue label scope: my-flow-queue-label-surfaces
- Normal route legacy overdue label hits: 0
- Normal route horizontal overflow count: 0
- Field workbench row-detail source link count: 0
- Field workbench source access link count: 5
- Field workbench repeated detail caution count: 0
- Public workbench duplicate export visible-label count: 0
- Public workbench sticky first-action count: 9
- Public workbench sticky first-action save/setup count: 9
- Public workbench sticky first-action non-primary labels: 0
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
