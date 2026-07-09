# FlowMe Claude Design P19 Final Review Package

- Generated: 2026-07-09T23:49:27.198Z
- Branch: `main`
- UI baseline commit: `9319e5a`
- Package generated from commit: `9319e5a`
- Package commit ref: `git commit containing this generated package`
- Viewport: 390x844
- Wide viewport spot check: 1024x768

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails, the P8-01 generalized scan rules, the P8-02 restart/prototype promotion gate, the P8-03/P8-04 My Flow overdue label/status corrections, the P8-05/P8-06/P8-08 evidence/package metadata cleanup, the P8-07 restart date-display decision, the P8-09 field-checklist source-density rule, and the P8-10/P9-02 public share CTA/tab-order rule.

It also keeps the P9-01 to P9-07 coverage closed: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

For P10, this package closes P10-01 to P10-07: guardrail/capture canonicalization, public share primary save/setup path evidence, actionable My Flow continuation, Calendar agenda group-header density, shorter visible control labels with accessible names, GitHub link-base cleanup, and visible-text/input-value raw ISO separation.

For P10-07 specifically, the scan separates raw ISO visible text from raw ISO input values. Native `input[type=date]` ISO values are treated as technical browser control values and recorded in an explicit exemption bucket; non-date input values with raw ISO remain guardrail hits.

P11-02 adds JSON-level evidence markers for the P10-03/P10-04/P10-05 claims: `continuationActionable`, `agendaGroupMeta`, and `rowControlAccessibleNames`. Claude Design can now judge the continuation row, Calendar/My Flow group metadata, and short visible labels with preserved accessible names from `route-evidence.json` without relying only on screenshots.

P11-04/P11-09 reduce My Flow inventory metric noise. Each saved-content row exposes one primary progress label, and the mobile all-tab header avoids large total remaining-count copy. The capture output records `inventoryProgressMetrics` and `inventoryHeaderMetrics` so duplicate progress metrics and large remaining-count headers can be judged from JSON markers.

P11-05/P11-06 keep the capture pipeline aligned with the canonical guardrail library and make native date input exemptions traceable by test id. P11-07/P11-10 keep fridge/washer setup paths measurable and allow the fridge first-action title to wrap to two lines on mobile. P11-08/P11-11 lower repeated field-checklist detail caution copy and extend public workbench export-label evidence so duplicate visible export entry points are caught.

P12-01~P12-04 add the URL-first first-execution slice to the normal user-route guardrail set. The package captures hit, custom-start, miss, and saved-candidate states on `/flows` and records URL-first-specific buckets for internal copy, dynamic source slug, structural title, raw ISO text, and input raw ISO hits. These scenarios should remain at zero while preserving canonical lookup, source-backed reuse, and non-executable local candidate storage.

P12-05/P12-10 keep `/flow-lab/url-first-p0` and source-backed manual registration QA outside the normal user route set. P13-03 splits the old prototype bucket into two tiers: `/restart/moving-d30` is a release-preview route that must keep display-gate hits at zero before promotion, while `/flow-lab/url-first-p0` is an internal-console route where lab labels are allowed only inside the noindex, non-nav-linked console.

P13-04/P13-07 make URL-first evidence reproducible as a state-by-control matrix. Hit and custom-start scenarios now record export-mode scan rows for calendar/markdown/checklist, all URL-first states record their trigger URL, and the candidate detail scenario records both expanded-request evidence and the resolved-hit candidate branch.

P13-05/P13-06 add a wide-viewport spot-check slice and a measured post-save confirmation signal. The package records >=768px captures for core routes and confirms `/my?savedMap=...` shows a short saved confirmation without repeating the first task title.

P14-05/P14-06 soften URL-first candidate/miss/hit copy that was technically clean but operational in tone. The package now records old mechanism-copy hits, value-focused mechanism-copy hits, legacy candidate system-copy hits, and user-tone candidate copy hits so Claude Design can judge the wording from JSON as well as screenshots.

P18-01 adds a same-date multi-Flow Calendar fixture. The selected date agenda records Flow marker groups, the month grid records visible Flow labels, and the summary exposes `calendarSameDateDistinctFlowGroupCount`, `calendarSameDateGridDistinctFlowLabelCount`, and `calendarAgendaGroupByFlow` so Calendar Flow identity can be judged without relying only on screenshots.

P18-02 merges My Flow's today execution/status framing. The package records `myFlowTodayFrameCount`, `myFlowTodayRemainingCountSourceCount`, `myFlowTodayInlineCompleteControlCount`, `myFlowTodayOpenBeforeCompleteRequired`, and `myFlowTodayGenericMetaChipCount` so Claude Design can verify that today's work has one count source and can be completed inline without opening detail first.

P18-03 separates public share save/export/item units. Sticky public `/f` actions remain save/setup-first, export is recorded as one Flow-level secondary entry with format options, and item-level export-like labels are counted separately so they stay at 0.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar should read as the date-first execution surface, My Flow as the task-first execution hub, and `calendarMyFlowRoleLabels` records role copy plus primary generic label counts for Calendar cards/groups and My Flow compact rows.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar is measured as a date-first execution surface, My Flow as a task-first execution hub, and the summary records whether primary labels fall back to generic type copy such as `월간 일정`, `저장한 일정`, or `일정 흐름`.

P18-07 makes the URL-first and My Flow date anchor copy contextual. The summary records URL-first date-anchor labels, My Flow anchor edit-entry labels, item-level date override labels, and whether the copy distinguishes whole-Flow anchor changes from one-item date overrides.

P18-08 keeps URL-first miss as a draft-preparation gate instead of implying live AI generation. The miss state records a visible draft-gate entry, the CTA label, whether copy implies live AI, and the candidate user-copy output guardrail count so the future AI draft path can be judged before real API integration.

P19-01 keeps Calendar mobile agenda rows readable after same-date multi-Flow grouping. Row-level date, timing, Flow, and progress metadata stay at zero; Flow identity stays in the group header/marker, and each row keeps the task title, completion checkbox, and short open action.

P19-02 keeps task completion controls unified around a row-left checkbox pattern. Open remains the detail/navigation action, while detail-level checklist checkboxes and public share pre-save preview checkboxes are tracked outside the task-completion-control bucket.

P19-03 clarifies progress metrics in My Flow and Calendar. Whole-Flow progress uses contextual whole-Flow labels, routine counters use routine-item labels, detail checklists use checklist-context labels, and Today/Calendar rows avoid row-level whole-Flow progress chips.

P19-06 makes the Home URL/memo entry discoverable without adding a second lookup implementation. The Home primary entry points to `/flows`, uses explicit URL/memo copy, and records its label, destination, viewport visibility, and whether it remains above the first fold.

P19-07 keeps the post-save editing model discoverable without moving full editing into URL-first. My Flow personal copies expose Flow-wide anchor/name editing as a contextual button such as `이사일·이름 바꾸기`, item detail edit entries expose title/date/memo editing with row-title accessible names, and the evidence records anchor-vs-item edit entry visibility by viewport.

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
- Normal route native date input raw ISO exemptions: 9
- Normal route first task repetition hits: 0
- Normal route continuation actionable count: 5
- Normal route continuation explanation-only count: 0
- Normal route agenda/status group marker count: 6
- Normal route agenda/status repeated date meta rows: 0
- Normal route agenda/status repeated timing meta rows: 0
- Calendar mobile agenda row count: 4
- Calendar mobile agenda dense row count: 0
- Calendar mobile agenda row date meta count: 0
- Calendar mobile agenda row timing meta count: 0
- Calendar mobile agenda row Flow meta count: 0
- Calendar mobile agenda row progress meta count: 0
- Calendar mobile agenda open-label rows: 4
- Calendar same-date distinct Flow groups: 2
- Calendar same-date grid Flow labels: 2
- Calendar agenda grouped by Flow: yes
- Calendar title contains My Flow count: 0
- Calendar primary generic type label count: 0
- Calendar heading duplicate count: 0
- My Flow primary generic flow label count: 0
- Calendar date-first role copy present: yes
- My Flow task-first role copy present: yes
- My Flow today frame count: 1
- My Flow today remaining-count sources: 1
- My Flow today inline complete controls: 5
- My Flow today open-before-complete required: false
- My Flow today generic meta chips: 0
- Progress metric ambiguous count: 0
- Progress metric contextual label count: 23
- Row-level Flow progress chip count: 0
- Detail checklist progress label count: 1
- Today remaining-count visible count: 5
- Calendar selected-day remaining-count visible count: 1
- Date anchor labels by Flow: ["학습 시작일","이사일"]
- Home URL-first entry visible: yes
- Home URL-first entry labels: ["URL이나 메모로 Flow 찾기링크 붙여넣기 · 요청 메모 · 준비된 Flow 확인"]
- Home URL-first entry destination: ["/flows"]
- Home URL-first entry above fold: yes
- Home memo entry visible: yes
- Home primary entry competes with recommendations: no
- My Flow anchor edit entry visible: yes
- My Flow anchor settings open labels: ["이사일·이름 바꾸기"]
- My Flow anchor settings open accessible names: ["이사 준비 이사일·이름 바꾸기"]
- My Flow anchor edit labels: ["이사일 바꾸기"]
- Item date override labels: ["이 할 일 날짜"]
- Anchor vs item override copy present: yes
- My Flow item edit entry visible: yes
- My Flow item edit accessible names: ["임대차 계약 확정일자 부여 여부 확인하기 제목·날짜·메모 수정"]
- Edit entry visible by viewport: {"390":{"anchor":2,"item":1},"1024":{"anchor":0,"item":1}}
- Normal route row control accessible name samples: 4
- Normal route row control samples with context: 4
- Wide viewport evidence count: 10
- Wide viewport width: 1024
- Wide viewport horizontal overflow count: 0
- Wide layout route count: 10
- Wide layout primary CTA visible count: 7
- Wide layout My Flow visible Flow finding link max: 1
- Wide home recommendation width ratio min: 1
- Wide viewport guardrail route count: 10
- Wide viewport internal copy hits: 0
- Wide viewport source slug hits: 0
- Wide viewport raw ISO hits: 0
- Wide viewport visible Markdown hits: 0
- Wide viewport candidate copy internal hits: 0
- Wide viewport URL-first states captured: ["hit","candidate"]
- Wide viewport routes captured: [{"id":"32-home-wide","route":"/","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"33-flows-wide","route":"/flows","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"34-flow-map-moving-wide","route":"/flow-maps/moving-d30","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"35-public-vehicle-wide","route":"/f/vehicle-inspection-prep","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"44-calendar-same-date-multi-flow-wide","route":"/calendar","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"36-post-save-my-moving-wide","route":"/my?savedMap=moving-d30","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"37-url-first-hit-wide","route":"/flows","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"38-url-first-candidate-detail-wide","route":"/flows","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"40-creator-profile-my-flow-studio-wide","route":"/u/my-flow-studio","viewportWidth":1024,"noHorizontalOverflow":true},{"id":"42-creator-profile-flow-curation-team-wide","route":"/u/flow-curation-team","viewportWidth":1024,"noHorizontalOverflow":true}]
- Studio nav destination: /u/my-flow-studio
- Studio nav destination tier: creator-profile
- Studio entry visible by viewport: {"390":11,"1024":2}
- Studio entry reachable by viewport: {"390":11,"1024":2}
- Studio entry policy: visible as a saved-work header action on /my and /calendar when saved content exists; creator profile remains outside the 4-tab IA
- Studio entry unexpected route count: 0
- Creator profile route count: 4
- Creator profile viewport widths: [390,1024]
- Creator profile tier: creator-profile
- Creator profile guardrail hits: 0
- Creator profile filled route count: 4
- Creator profile empty route count: 0
- Creator profile content card count: 160
- Creator profile draft content card count: 2
- Creator profile policy: user-facing secondary surface outside the 4-tab IA; not a fifth tab; current-user studio is noindex, public creator channels may be indexable; normal user-surface guardrails apply
- User nav leak scan route count: 18
- User nav leak scan viewports: [390,768,1024]
- Flow-lab user nav links by viewport: {"390":0,"768":0,"1024":0}
- Manual QA user links by viewport: {"390":0,"768":0,"1024":0}
- Post-save confirmation visible: true
- Post-save confirmation text: ["내 Flow에 저장됨"]
- Post-save confirmation repeats first task title: false
- URL-first normal scenarios captured: 5
- URL-first states captured: ["hit","custom-start","moving-custom-start","miss","candidate"]
- URL-first scenario trigger URL count: 5
- URL-first internal copy hits: 0
- URL-first source slug hits: 0
- URL-first structural/trailing title hits: 0
- URL-first raw ISO hits: 0
- URL-first input raw ISO hits: 0
- URL-first native date input raw ISO exemptions: 3
- URL-first visible Markdown hits: 0
- URL-first old mechanism-copy hits: 0
- URL-first value mechanism-copy hits: 4
- URL-first export mode evidence count: 9
- URL-first export mode scanned count: 9
- URL-first export mode visible Markdown hits: 0
- URL-first candidate user-copy evidence count: 1
- URL-first candidate user-copy internal hits: 0
- URL-first candidate legacy system-copy hits: 0
- URL-first candidate user-tone copy hits: 3
- URL-first candidate card text scanned: true
- URL-first candidate card legacy status hits: 0
- URL-first candidate internal handoff preserved: true
- URL-first candidate expanded detail captured: true
- URL-first candidate resolved-hit scenario captured: true
- URL-first candidate resolved-hit scenario status: executable
- URL-first miss draft gate visible: yes
- URL-first miss draft CTA label: 초안 요청 저장
- URL-first miss draft implies live AI: no
- URL-first miss draft live-AI copy hits: 0
- URL-first miss/candidate user-copy internal hits: 0
- URL-first start date input visible count: 3
- URL-first visible marker count: 5
- Prototype release-preview route count: 4
- Prototype release-preview guardrail hits: 0
- Prototype internal-console route count: 1
- Prototype internal-console guardrail hits: 7
- Prototype internal-console allowed display-gate hits: 7
- Prototype internal-console unexpected guardrail hits: 0
- Prototype internal-console context visible count: 1
- Flow-lab prototype route count: 1
- Flow-lab prototype tier: internal-console
- Flow-lab prototype bucket: true
- Flow-lab prototype noindex: true
- Flow-lab prototype linked from user nav count: 0
- Flow-lab prototype display-gate hit count: 1
- Flow-lab prototype allowed display-gate hit count: 7
- Flow-lab prototype unexpected guardrail hit count: 0
- Flow-lab prototype internal-console context visible: true
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
- Public pre-save checkbox count: 89
- Public pre-save completion-like checkbox label count: 0
- Public pre-save preview checkbox label count: 89
- Public share route count: 10
- Public share secondary browse focusable count: 10
- Public share secondary browse after-primary count: 10
- Public share secondary browse before-primary count: 0
- Public share primary path focusable count: 10
- Public share primary path visible count: 10
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

- [Source root](https://github.com/knhbae/flowme2605/blob/main)
- [E2E guardrails](https://github.com/knhbae/flowme2605/blob/main/tests/e2e/flow-mvp.spec.ts)
- [Workbench source density E2E](https://github.com/knhbae/flowme2605/blob/main/tests/e2e/workbench-source-density.spec.ts)
- [Public share CTA/tab-order E2E](https://github.com/knhbae/flowme2605/blob/main/tests/e2e/public-share-cta-order.spec.ts)
- [Capture script](https://github.com/knhbae/flowme2605/blob/main/scripts/content-audit/capture-claude-p7-final-review-package.mjs)
