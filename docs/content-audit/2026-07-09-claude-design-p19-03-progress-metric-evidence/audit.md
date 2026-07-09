# Claude Design P19 Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. P8-01 generalizes the same guardrails for new seed/source/route additions, P8-02 expands the restart/prototype promotion gate, P8-03/P8-04 fix My Flow overdue labeling/status accuracy, P8-05/P8-06/P8-08 clean up evidence duplication, label-count scope, and commit metadata, P8-07 confirms the `/restart/moving-d30` first-three-row date repetition as an intentional D-30 milestone group rather than a date-distribution bug, P8-09 lowers repeated row-level source links in field checklist workbenches, and P8-10/P9-02 keeps public share browse navigation accessible but after the primary save/input path. P9-01 to P9-07 then close the remaining guardrail coverage, accessibility ordering, structural-copy, punctuation, prototype gate, restart grouping, and guardrail-unit-test gaps.

P10-01 to P10-07 close the current review loop: capture uses the canonical `user-surface-guardrails.ts` rules, public share workbenches expose a visible/focusable primary save/setup path, My Flow continuation cards remain actionable, Calendar same-day agenda metadata is grouped, repeated visible control labels stay short while aria labels retain context, GitHub package links use the correct base, and raw ISO input values are separated from visible text. This does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

P10-07 extends the same evidence gate to input values: visible text raw ISO remains a failure, non-date input values with raw ISO remain a failure, and native `input[type=date]` values are recorded separately as technical browser control exemptions.

P11-02 keeps the UI unchanged and strengthens the evidence layer. The capture output now records `continuationActionable`, `agendaGroupMeta`, and `rowControlAccessibleNames` so P10-03/P10-04/P10-05 can be reviewed from JSON markers as well as screenshots. Calendar agenda groups and My Flow status-sheet groups use the same marker shape.

P11-04/P11-09 lower My Flow inventory density without changing progress calculations. Inventory rows keep a single visible progress label, the mobile all-tab header avoids large total remaining-count copy, and `inventoryProgressMetrics`/`inventoryHeaderMetrics` markers make those claims auditable from JSON.

P11-05/P11-06 keep capture/evidence rules centralized and traceable: internal-copy scans use the canonical guardrail helper, the browser context is Korean locale/Asia-Seoul timezone, and date inputs carry stable test ids for native raw ISO exemption evidence. P11-07/P11-10 keep fridge/washer setup paths visible and measurable, and the fridge first-action title can wrap to two lines. P11-08/P11-11 move repeated field-checklist caution copy into a common note and record public workbench export visible-label duplication as JSON evidence.

P12-01~P12-04 bring URL-first hit/custom-start/miss/candidate states into the normal user-route capture schema. The same guardrail buckets now cover `/flows` URL-first user surfaces, including source slug leakage such as `Mathbang`, raw ISO dates in candidate cards, production-only copy such as `Canonical URL`/`handoff`, and roadmap/queue/pipeline wording such as `P0`, `대기열`, or `파이프라인`.

P12-05/P12-10 keep `/flow-lab/url-first-p0` and source-backed manual registration QA outside the normal user route set. P13-03 makes the prototype bucket policy explicit: `/restart/moving-d30` is release-preview and must keep user-display gate hits at zero, while `/flow-lab/url-first-p0` is internal-console and may show lab labels only inside a noindex route with zero normal-route links.

P13-04/P13-07 make URL-first evidence reproducible as a state-by-control matrix. Hit and custom-start scenarios now record export-mode scan rows for calendar/markdown/checklist, all URL-first states record their trigger URL, and the candidate detail scenario records both expanded-request evidence and the resolved-hit candidate branch.

P13-05/P13-06 add wide viewport spot checks and a post-save confirmation marker. P14-03 extends that evidence with wide-layout sanity markers for primary CTA visibility, visible Flow-finding link count, and home recommendation card width ratio. The audit records the wide-route list, wide overflow count, and whether the saved confirmation repeats the first task title.

P14-05/P14-06 replace URL-first candidate/miss/hit wording that sounded like system operation copy with user-value copy. The audit records old mechanism-copy hits, value-focused mechanism-copy hits, legacy candidate system-copy hits, and user-tone candidate copy hits so this low-level copy polish is measurable without relying only on screenshots.

P15-01/P15-02 add the creator-profile destination behind the My Flow `스튜디오` link to the evidence set. `/u/my-flow-studio` is captured at 390px and 1024px as a user-facing secondary surface outside the 4-tab IA, normal user-surface guardrails are applied to that route, and `studioEntryVisibleByViewport`/`studioEntryReachableByViewport` record the mobile/wide entry policy.

P15-03 scans URL-first candidate resolved card headline/status/body text directly. Legacy state-machine wording such as `기존 콘텐츠로 닫힌 상태` or `실행 가능한 ... 후보` is measured as candidate card legacy status hits, separate from the internal production handoff bucket.

P18-01 adds a same-date multi-Flow Calendar fixture. The selected date agenda records Flow marker groups, the month grid records visible Flow labels, and the summary exposes `calendarSameDateDistinctFlowGroupCount`, `calendarSameDateGridDistinctFlowLabelCount`, and `calendarAgendaGroupByFlow` so Calendar Flow identity can be judged without relying only on screenshots.

P18-02 merges My Flow's today execution/status framing. The package records `myFlowTodayFrameCount`, `myFlowTodayRemainingCountSourceCount`, `myFlowTodayInlineCompleteControlCount`, `myFlowTodayOpenBeforeCompleteRequired`, and `myFlowTodayGenericMetaChipCount` so Claude Design can verify that today's work has one count source and can be completed inline without opening detail first.

P18-03 keeps public share `/f` save/export/item responsibilities auditable. The summary records Flow-level save primary count, one secondary export entry per public share route, export format option count, item-level export-like label count, and pre-save preview control counts.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar should read as the date-first execution surface, My Flow as the task-first execution hub, and primary labels should not fall back to generic type copy such as `월간 일정`, `저장한 일정`, or `일정 흐름`.

P18-07 makes URL-first and My Flow date-anchor copy contextual. The evidence records URL-first date-anchor labels, My Flow anchor edit-entry labels, item-level date override labels, and whether the copy distinguishes whole-Flow anchor changes from one-item date overrides.

P18-08 frames URL-first miss as a draft-preparation request without pretending that live AI generation already exists. The miss state should show a visible draft gate and a clear CTA, while `urlFirstMissDraftImpliesLiveAi` and `urlFirstMissCandidateCopyInternalHitCount` stay at zero.

P19-01 keeps Calendar mobile agenda rows readable after same-date multi-Flow grouping. Row-level date, timing, Flow, and progress metadata stay at zero while the group header owns Flow identity and the row keeps title, completion checkbox, and `열기`.

P19-02 keeps task completion controls unified around row-left checkboxes, with sub-checklists measured separately from task completion.

P19-03 clarifies progress metrics in My Flow and Calendar. Whole-Flow progress must include `전체`, routine counters must include `반복 항목`, detail checklist counters must include `확인 항목` or `개념 항목`, and row-level Flow progress chips must stay at zero.

## Baselines Covered

- P7-01: `/restart/moving-d30` uses user-facing date text and a quieter export hierarchy.
- P7-02: My Flow today/overdue/next queues are deduped.
- P7-03: My Flow 5+ saved list bottom clearance is verified.
- P7-04: Home shows a small curated recommendation set, not a single fixed experiment.
- P7-05: Public `/f` browse links remain secondary to `내 Flow에 저장`.
- P7-06/P8-01: Normal route scan buckets stay at zero for internal labels, dynamic source slug leaks, structural title suffixes, raw ISO dates, first-task repetition, and mobile overflow.
- P8-02/P9-05: Restart/prototype routes must also avoid raw route slugs, English weekday/month-time labels, English UI verbs, mixed export-language copy, and duplicate export entry points before promotion.
- P8-03/P8-04: My Flow uses `지난 할 일` consistently for overdue work, and past rows in the saved-content list are not labeled as `다음 할 일`.
- P8-05: Restart source/export and true-bottom frames are captured at separate scroll positions and carry screenshot hashes.
- P8-06: My Flow label repetition counters use `my-flow-queue-label-surfaces`, not full page body text.
- P8-07/P9-06: `/restart/moving-d30` first three visible rows share the same D-30 date because all three source rows are D-30 milestones; the full schedule now labels that cluster as a D-30 milestone group and later dates remain distributed.
- P8-08: UI baseline commit and package generation commit metadata are separated.
- P8-09: field checklist row details keep execution criteria/details, but repeated row-level source links are suppressed; source access remains available in the source/reference area.
- P8-10/P9-02: public `/f/[slug]` share screens keep `콘텐츠 더 보기` as an accessible secondary link, but place it after the primary save/input path in DOM/tab order.
- P9-01/P9-04/P9-05/P9-07: guardrail coverage is data-driven, source slug punctuation and prototype English UI classes are covered, and helper-level positive/negative unit tests lock the rules.
- P9-03: My Flow structural terms such as `Flow 상태판` are removed from user-facing copy and covered by structural-display guardrails.
- P9-06: restart full schedule groups same-day D-30 items under a visible milestone heading instead of repeating the date as unexplained row text.
- P10-01: capture/package evidence uses the canonical `lib/flow/user-surface-guardrails.ts` implementation rather than copied regex rules.
- P10-02: public `/f/[slug]` workbenches keep `내 Flow에 저장` or setup/input as visible, focusable primary paths before `콘텐츠 더 보기`.
- P10-03: My Flow `지금 이어하기` evidence is tied to an actionable first row, not an explanation-only card.
- P10-04: Calendar selected-day agenda groups shared same-day metadata in the group header instead of repeating chips on every row.
- P10-05: restart/My Flow visible row controls stay short, while accessible labels preserve the row title and action context.
- P10-06: generated GitHub links use the repository root base and avoid duplicate `/flow-mvp` path segments.
- P10-07: visible raw ISO text, raw ISO input hits, and native date input exemptions are counted separately.
- P11-01: My Flow overdue status sheets group shared date/content/timing metadata once per group.
- P11-02: continuation actionable state, Calendar/status-sheet group metadata, and row-control accessible-name samples are recorded as route-evidence markers.
- P11-04/P11-09: My Flow inventory rows avoid duplicate progress metrics, and the mobile all-tab header avoids large total remaining-count copy.
- P11-05/P11-06: capture guardrail logic stays canonical, locale/timezone are fixed, and native date input exemptions include concrete test ids.
- P11-07/P11-10: fridge/washer setup paths are visible/focusable evidence targets, and the fridge first-action title supports two-line mobile wrapping.
- P11-08/P11-11: field checklist repeated caution copy is common-note only, and public workbench export labels do not duplicate as ambiguous visible entry points.
- P12-01/P12-04: URL-first hit, custom-start, miss, and candidate states are captured as normal user-route scenarios and must keep URL-first internal/source/raw-ISO buckets at zero.
- P12-05/P12-10/P13-03: `/restart/moving-d30` and `/flow-lab/url-first-p0` stay out of normal navigation, but their prototype tiers are separate. Restart is `release-preview` with a zero-hit display gate; flow-lab is `internal-console` with noindex, zero user-nav links, visible internal-console context, and allowed lab-label hits.
- P13-04/P13-07: URL-first route evidence records trigger URLs, export-mode scan rows, candidate expanded detail, and the resolved-hit candidate branch so state reproduction does not depend on screenshot interpretation alone.
- P14-05/P14-06: URL-first candidate/miss/hit copy avoids system-operation wording such as `AI 자동 생성 없이`, `사용자 제목/메모`, and `마지막 다시 조회`, while preserving lookup, candidate storage, copy output, and export behavior.

- P18-01/P18-02: Calendar distinguishes same-date multi-Flow work by Flow marker/group, and My Flow today work uses one frame/count source with inline completion before detail opening.
- P18-04/P18-06: Calendar role copy is date-first, My Flow role copy is task-first, and primary Calendar/My Flow labels avoid generic type copy such as `월간 일정`, `저장한 일정`, and `일정 흐름`.
- P19-01/P19-02/P19-03: Calendar mobile rows stay low-density, task completion uses one checkbox pattern, and progress metrics are contextual instead of standalone `1/5`-style labels.

## Summary

```json
{
  "totalScreenshots": 47,
  "uiBaselineCommit": "8ad8522",
  "packageGeneratedFromCommit": "8ad8522",
  "packageCommitRef": "git commit containing this generated package",
  "wideViewportEvidenceCount": 10,
  "wideViewportWidth": 1024,
  "wideViewportRoutesCaptured": [
    {
      "id": "32-home-wide",
      "route": "/",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "33-flows-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "34-flow-map-moving-wide",
      "route": "/flow-maps/moving-d30",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "35-public-vehicle-wide",
      "route": "/f/vehicle-inspection-prep",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "37-url-first-hit-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "38-url-first-candidate-detail-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "40-creator-profile-my-flow-studio-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "42-creator-profile-flow-curation-team-wide",
      "route": "/u/flow-curation-team",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    }
  ],
  "wideViewportHorizontalOverflowCount": 0,
  "wideLayoutRouteCount": 10,
  "wideLayoutFixedOverlapCount": 0,
  "wideLayoutPrimaryCtaVisibleCount": 7,
  "wideLayoutMyFlowVisibleFlowFindingLinkMax": 1,
  "wideLayoutHomeRecommendationWidthRatioMin": 1,
  "wideViewportGuardrailRouteCount": 10,
  "wideViewportInternalHitCount": 0,
  "wideViewportSourceSlugHitCount": 0,
  "wideViewportStructuralDisplayHitCount": 0,
  "wideViewportRawIsoHitCount": 0,
  "wideViewportInputRawIsoHitCount": 0,
  "wideViewportVisibleMarkdownHitCount": 0,
  "wideViewportCandidateCopyInternalHitCount": 0,
  "wideViewportUrlFirstScenarioCount": 2,
  "wideViewportUrlFirstStatesCaptured": [
    "hit",
    "candidate"
  ],
  "studioNavDestination": "/u/my-flow-studio",
  "studioNavDestinationTier": "creator-profile",
  "studioNavDestinationEvidence": [
    {
      "recordId": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "14-calendar-after-moving-save-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    }
  ],
  "studioEntryAllowedRoutePrefixes": [
    "/my",
    "/calendar"
  ],
  "studioEntryPlacementEvidence": [
    {
      "recordId": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "14-calendar-after-moving-save-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    }
  ],
  "studioEntryUnexpectedRouteCount": 0,
  "studioEntryVisibleByViewport": {
    "390": 11,
    "1024": 2
  },
  "studioEntryReachableByViewport": {
    "390": 11,
    "1024": 2
  },
  "studioEntryDestination": "/u/my-flow-studio",
  "studioEntryDestinationTier": "creator-profile",
  "studioEntryPolicy": "visible as a saved-work header action on /my and /calendar when saved content exists; creator profile remains outside the 4-tab IA",
  "creatorProfileRouteCount": 4,
  "creatorProfileViewportWidths": [
    390,
    1024
  ],
  "creatorProfileTier": "creator-profile",
  "creatorProfilePolicy": "user-facing secondary surface outside the 4-tab IA; not a fifth tab; current-user studio is noindex, public creator channels may be indexable; normal user-surface guardrails apply",
  "creatorProfileNoindex": [
    {
      "recordId": "39-creator-profile-my-flow-studio-mobile",
      "route": "/u/my-flow-studio",
      "viewportWidth": 390,
      "noindex": true
    },
    {
      "recordId": "41-creator-profile-flow-curation-team-mobile",
      "route": "/u/flow-curation-team",
      "viewportWidth": 390,
      "noindex": false
    },
    {
      "recordId": "40-creator-profile-my-flow-studio-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "noindex": true
    },
    {
      "recordId": "42-creator-profile-flow-curation-team-wide",
      "route": "/u/flow-curation-team",
      "viewportWidth": 1024,
      "noindex": false
    }
  ],
  "creatorProfileFilledRouteCount": 4,
  "creatorProfileEmptyRouteCount": 0,
  "creatorProfileContentCardCount": 160,
  "creatorProfileDraftContentCardCount": 2,
  "creatorProfilePublishedContentCardCount": 158,
  "creatorProfileGuardrailHitCount": 0,
  "creatorProfileEvidence": [
    {
      "recordId": "39-creator-profile-my-flow-studio-mobile",
      "route": "/u/my-flow-studio",
      "viewportWidth": 390,
      "tier": "creator-profile",
      "kind": "current-user-studio",
      "noindex": true,
      "surfaceVisible": true,
      "heading": "나의 스튜디오",
      "contentCardCount": 5,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 4,
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    },
    {
      "recordId": "41-creator-profile-flow-curation-team-mobile",
      "route": "/u/flow-curation-team",
      "viewportWidth": 390,
      "tier": "creator-profile",
      "kind": "public-channel",
      "noindex": false,
      "surfaceVisible": true,
      "heading": "FLOW 큐레이션팀",
      "contentCardCount": 75,
      "draftContentCardCount": 0,
      "publishedContentCardCount": 75,
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    },
    {
      "recordId": "40-creator-profile-my-flow-studio-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "tier": "creator-profile",
      "kind": "current-user-studio",
      "noindex": true,
      "surfaceVisible": true,
      "heading": "나의 스튜디오",
      "contentCardCount": 5,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 4,
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    },
    {
      "recordId": "42-creator-profile-flow-curation-team-wide",
      "route": "/u/flow-curation-team",
      "viewportWidth": 1024,
      "tier": "creator-profile",
      "kind": "public-channel",
      "noindex": false,
      "surfaceVisible": true,
      "heading": "FLOW 큐레이션팀",
      "contentCardCount": 75,
      "draftContentCardCount": 0,
      "publishedContentCardCount": 75,
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    }
  ],
  "userNavLeakScanRouteCount": 18,
  "userNavLeakScanViewports": [
    390,
    768,
    1024
  ],
  "flowLabPrototypeLinkedFromUserNavCountByViewport": {
    "390": 0,
    "768": 0,
    "1024": 0
  },
  "manualRegistrationQaUserLinkCountByViewport": {
    "390": 0,
    "768": 0,
    "1024": 0
  },
  "postSaveConfirmationVisible": true,
  "postSaveConfirmationText": [
    "내 Flow에 저장됨"
  ],
  "postSaveConfirmationRepeatsFirstTaskTitle": false,
  "postSaveConfirmationEvidence": [
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "visible": true,
      "text": "내 Flow에 저장됨",
      "repeatsFirstTaskTitle": false
    },
    {
      "id": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "visible": false,
      "text": "",
      "repeatsFirstTaskTitle": false
    },
    {
      "id": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "visible": false,
      "text": "",
      "repeatsFirstTaskTitle": false
    },
    {
      "id": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "visible": true,
      "text": "내 Flow에 저장됨",
      "repeatsFirstTaskTitle": false
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "visible": true,
      "text": "내 Flow에 저장됨",
      "repeatsFirstTaskTitle": false
    }
  ],
  "normalRouteInternalHitCount": 0,
  "normalRouteSourceSlugHitCount": 0,
  "normalRouteStructuralDisplayHitCount": 0,
  "normalRouteRawIsoHitCount": 0,
  "normalRouteInputRawIsoHitCount": 0,
  "normalRouteInputRawIsoExemptCount": 9,
  "normalRouteFirstTaskRepetitionHitCount": 0,
  "normalRouteContinuationActionableCount": 5,
  "normalRouteContinuationExplanationOnlyCount": 0,
  "myFlowTodayFrameCount": 1,
  "myFlowTodayRemainingCountSourceCount": 1,
  "myFlowTodayInlineCompleteControlCount": 5,
  "myFlowTodayOpenBeforeCompleteRequired": false,
  "myFlowTodayGenericMetaChipCount": 0,
  "myFlowTodayFrameEvidence": [
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "1개 예정"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "이사 방식과 견적 후보 정하기 완료 체크"
    },
    {
      "id": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "1개 대기"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "1. 소인수분해 완료 체크"
    },
    {
      "id": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "오늘 2개 남음"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "필기와 실기 시험 범위 나누기 완료 체크"
    },
    {
      "id": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "오늘 2개 남음"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "필기와 실기 시험 범위 나누기 완료 체크"
    },
    {
      "id": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "1개 예정"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "이사 방식과 견적 후보 정하기 완료 체크"
    }
  ],
  "taskCompleteCheckboxCount": 23,
  "taskCompleteButtonCount": 0,
  "taskCompleteMixedControlCount": 0,
  "subChecklistCheckboxCount": 85,
  "taskCompleteControlPatternEvidence": [
    {
      "id": "06-public-vehicle-mobile",
      "route": "/f/vehicle-inspection-prep",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 8,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "07-public-moving-mobile",
      "route": "/f/moving-d30-basic",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 8,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "08-public-moving-bottom-mobile",
      "route": "/f/moving-d30-basic",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 8,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "09-workbench-fridge-mobile",
      "route": "/f/fridge-cleanout-weekly-plan",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "10-workbench-washer-mobile",
      "route": "/f/washer-tub-clean-monthly",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "11-workbench-new-car-mobile",
      "route": "/f/new-car-delivery-check",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 10,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "12-workbench-used-car-mobile",
      "route": "/f/used-car-buying-check",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 15,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "25-workbench-new-car-open-details-mobile",
      "route": "/f/new-car-delivery-check",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 10,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "26-workbench-used-car-open-details-mobile",
      "route": "/f/used-car-buying-check",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 15,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "이사 방식과 견적 후보 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 3,
      "checkboxSamples": [
        {
          "surface": "route",
          "accessibleName": "이사 방식과 견적 예약 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "14-calendar-after-moving-save-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "이사 방식과 견적 예약 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 5,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "정부24 전입신고 처리 결과 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "임대차 계약 확정일자 부여 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "임대차 계약 확정일자 부여 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "필기와 실기 시험 범위 나누기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "매일 공부 가능한 시간 블록 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "1. 소인수분해 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 4,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "필기와 실기 시험 범위 나누기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "매일 공부 가능한 시간 블록 정하기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "기출 회독 목표 정하기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "총예산을 차량가, 이전비, 보험료, 정비비로 나누기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 4,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "필기와 실기 시험 범위 나누기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "매일 공부 가능한 시간 블록 정하기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "기출 회독 목표 정하기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "총예산을 차량가, 이전비, 보험료, 정비비로 나누기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "35-public-vehicle-wide",
      "route": "/f/vehicle-inspection-prep",
      "viewportWidth": 1024,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 8,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "pattern": "checkbox",
      "checkboxCount": 5,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "정부24 전입신고 처리 결과 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "임대차 계약 확정일자 부여 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "임대차 계약 확정일자 부여 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "필기와 실기 시험 범위 나누기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "매일 공부 가능한 시간 블록 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "이사 방식과 견적 후보 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    }
  ],
  "normalRouteAgendaGroupMetaCount": 6,
  "normalRouteAgendaGroupRepeatedDateMetaRowCount": 0,
  "normalRouteAgendaGroupRepeatedTimingMetaRowCount": 0,
  "calendarMobileAgendaRowCount": 4,
  "calendarMobileAgendaDenseRowCount": 0,
  "calendarMobileAgendaRowDateMetaCount": 0,
  "calendarMobileAgendaRowTimingMetaCount": 0,
  "calendarMobileAgendaRowFlowMetaCount": 0,
  "calendarMobileAgendaRowProgressMetaCount": 0,
  "calendarMobileAgendaOpenLabelRowCount": 4,
  "calendarFlowMarkerCount": 5,
  "calendarDistinctFlowMarkerCount": 2,
  "calendarSameDateDistinctFlowGroupCount": 2,
  "calendarAgendaGroupByFlow": true,
  "calendarFlowMarkerContrastChecked": true,
  "calendarSameDateGridDistinctFlowLabelCount": 2,
  "calendarSameDateFlowEvidence": [
    {
      "id": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "selectedDate": "2026-06-03",
      "flowMarkerCount": 2,
      "distinctFlowMarkerCount": 2,
      "selectedDateGridFlowLabels": [
        "컴퓨터활용능력...",
        "이사 준비",
        "이사 준비"
      ],
      "agendaGroupByFlow": true
    },
    {
      "id": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "selectedDate": "2026-06-03",
      "flowMarkerCount": 2,
      "distinctFlowMarkerCount": 2,
      "selectedDateGridFlowLabels": [
        "컴퓨터활용능력...",
        "이사 준비",
        "이사 준비"
      ],
      "agendaGroupByFlow": true
    }
  ],
  "calendarTitleContainsMyFlowCount": 0,
  "calendarPrimaryGenericTypeLabelCount": 0,
  "myFlowPrimaryGenericFlowLabelCount": 0,
  "calendarTaskRoleCopyPresent": true,
  "myFlowTaskRoleCopyPresent": true,
  "calendarMyFlowRoleLabelEvidence": [
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "14-calendar-after-moving-save-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": [
        "날짜 항목"
      ]
    },
    {
      "id": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": [
        "날짜 항목"
      ]
    },
    {
      "id": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": [
        "모든 저장 콘텐츠",
        "월간 날짜 보기",
        "날짜 항목"
      ]
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    }
  ],
  "normalRouteStatusSheetGroupMetaCount": 1,
  "normalRouteStatusSheetUngroupedRowCount": 0,
  "normalRouteRowControlAccessibleNameSampleCount": 4,
  "normalRouteRowControlAccessibleNameContextCount": 4,
  "normalRouteInventoryDuplicateProgressMetricCount": 0,
  "normalRouteInventoryHeaderLargeRemainingCount": 0,
  "progressMetricAmbiguousCount": 0,
  "progressMetricContextLabelCount": 23,
  "rowLevelFlowProgressChipCount": 0,
  "detailChecklistProgressLabelCount": 1,
  "todayRemainingCountVisible": 5,
  "calendarSelectedDayRemainingCountVisible": 1,
  "progressMetricSemanticsEvidence": [
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 1,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/5 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 2,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/5 완료"
        },
        {
          "testId": "my-flow-detail-checklist-progress",
          "text": "확인 항목 0/3"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 1,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "14-calendar-after-moving-save-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "15-post-save-my-math-mobile",
      "route": "/my?savedMap=middle-school-math-1",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 1,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "16-my-multi-queue-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 1,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "17-my-multi-queue-overdue-sheet-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 1,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "18-my-long-list-top-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 4,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/24 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/33 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/18 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/15 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "19-my-long-list-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 4,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/24 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/33 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/18 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/15 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "20-my-long-list-inventory-bottom-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 12,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/24 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/33 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/18 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/15 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/12 완료"
        },
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/9 완료"
        },
        {
          "testId": "my-flow-inventory-progress-summary",
          "text": "전체 0/24 완료"
        },
        {
          "testId": "my-flow-inventory-progress-summary",
          "text": "전체 0/33 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 1
    },
    {
      "id": "36-post-save-my-moving-wide",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 1024,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 0,
      "progressMetricContextLabels": [],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 1,
      "calendarSelectedDayRemainingCountVisible": 0
    }
  ],
  "urlFirstScenarioCount": 5,
  "urlFirstStatesCaptured": [
    "hit",
    "custom-start",
    "moving-custom-start",
    "miss",
    "candidate"
  ],
  "urlFirstScenarioTriggerUrlCount": 5,
  "urlFirstScenarioTriggers": [
    {
      "recordId": "27-url-first-hit-mobile",
      "route": "/flows",
      "state": "hit",
      "scenarioName": "hit-default-start",
      "triggerUrl": "https://mathbang.net/13?utm_source=share"
    },
    {
      "recordId": "28-url-first-custom-start-mobile",
      "route": "/flows",
      "state": "custom-start",
      "scenarioName": "hit-custom-start",
      "triggerUrl": "https://mathbang.net/13?utm_source=share"
    },
    {
      "recordId": "28b-url-first-moving-custom-start-mobile",
      "route": "/flows",
      "state": "moving-custom-start",
      "scenarioName": "hit-moving-custom-start",
      "triggerUrl": "https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363"
    },
    {
      "recordId": "29-url-first-miss-candidate-form-mobile",
      "route": "/flows",
      "state": "miss",
      "scenarioName": "miss-candidate-form",
      "triggerUrl": "https://example.com/source-to-convert?utm_source=review"
    },
    {
      "recordId": "30-url-first-candidate-detail-mobile",
      "route": "/flows",
      "state": "candidate",
      "scenarioName": "candidate-detail-expanded",
      "triggerUrl": "https://example.com/source-to-convert?utm_source=review"
    }
  ],
  "urlFirstNormalInternalHitCount": 0,
  "urlFirstNormalSourceSlugHitCount": 0,
  "urlFirstNormalStructuralDisplayHitCount": 0,
  "urlFirstNormalRawIsoHitCount": 0,
  "urlFirstNormalInputRawIsoHitCount": 0,
  "urlFirstNormalInputRawIsoExemptCount": 3,
  "urlFirstInputRawIsoExemptions": [
    {
      "route": "/flows",
      "state": "hit",
      "label": "학습 시작일",
      "inputType": "date",
      "value": "2026-07-17",
      "testId": "url-first-start-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "label": "학습 시작일",
      "inputType": "date",
      "value": "2026-07-17",
      "testId": "url-first-start-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "label": "이사일",
      "inputType": "date",
      "value": "2026-08-01",
      "testId": "url-first-start-date-input",
      "reason": "native-date-input-value"
    }
  ],
  "urlFirstVisibleMarkdownHitCount": 0,
  "urlFirstVisibleMarkdownHits": [],
  "urlFirstMechanismCopyOldHitCount": 0,
  "urlFirstMechanismCopyOldHits": [],
  "urlFirstMechanismCopyValueHitCount": 4,
  "urlFirstMechanismCopyValueHits": [
    {
      "route": "/flows",
      "state": "hit",
      "line": "이미 만든 준비가 있는지 먼저 찾아봤어요"
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "line": "이미 만든 준비가 있는지 먼저 찾아봤어요"
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "line": "이미 만든 준비가 있는지 먼저 찾아봤어요"
    },
    {
      "route": "/flows",
      "state": "miss",
      "line": "이미 만든 준비가 있는지 먼저 찾아봤어요"
    }
  ],
  "urlFirstCandidateLegacySystemCopyHitCount": 0,
  "urlFirstCandidateLegacySystemCopyHits": [],
  "urlFirstCandidateUserToneCopyHitCount": 3,
  "urlFirstCandidateUserToneCopyHits": [
    {
      "route": "/flows",
      "state": "candidate",
      "line": "내가 쓴 제목·메모"
    },
    {
      "route": "/flows",
      "state": "candidate",
      "line": "마지막 확인"
    },
    {
      "route": "/flows",
      "state": "candidate",
      "line": "이미 Flow로 준비됨 · Flow 결과로 이동해 바로 시작할 수 있어요."
    }
  ],
  "urlFirstCandidateCardTextScanned": true,
  "urlFirstCandidateCardTextSamples": [
    {
      "route": "/flows",
      "state": "candidate",
      "scenarioName": "candidate-detail-expanded",
      "lines": [
        "초안 요청",
        "초안 준비 중",
        "7월 7일",
        "새로 보고 싶은 준비 체크리스트",
        "URL에서 따라 할 순서만 남겨두고 싶음",
        "원문 URL 저장됨",
        "아직 실행 가능한 Flow 아님 · 초안 준비 중",
        "요청 내용 닫기",
        "원 URL 열기",
        "다시 조회",
        "제목/메모 수정",
        "삭제",
        "요청 내용",
        "원 URL",
        "원문 링크 저장됨",
        "내가 쓴 제목·메모",
        "새로 보고 싶은 준비 체크리스트 · URL에서 따라 할 순서만 남겨두고 싶음",
        "마지막 확인",
        "7월 7일 · 아직 준비 전",
        "원문과 요청 내용을 보관했어요. 초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.",
        "초안 요청 정리본 복사",
        "초안 요청 정리본 복사됨",
        "이제 실행 가능",
        "이미 준비된 Flow가 있어요"
      ]
    }
  ],
  "urlFirstCandidateCardLegacyStatusHitCount": 0,
  "urlFirstCandidateCardLegacyStatusHits": [],
  "urlFirstExportModeEvidenceCount": 9,
  "urlFirstExportModeScannedCount": 9,
  "urlFirstExportModesCaptured": [
    {
      "route": "/flows",
      "state": "hit",
      "exportMode": "calendar",
      "exportModeScanned": true,
      "optionLabel": "캘린더",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "hit",
      "exportMode": "markdown",
      "exportModeScanned": true,
      "optionLabel": "메모 문서",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "hit",
      "exportMode": "checklist",
      "exportModeScanned": true,
      "optionLabel": "체크리스트",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "exportMode": "calendar",
      "exportModeScanned": true,
      "optionLabel": "캘린더",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "exportMode": "markdown",
      "exportModeScanned": true,
      "optionLabel": "메모 문서",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "exportMode": "checklist",
      "exportModeScanned": true,
      "optionLabel": "체크리스트",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "exportMode": "calendar",
      "exportModeScanned": true,
      "optionLabel": "캘린더",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "exportMode": "markdown",
      "exportModeScanned": true,
      "optionLabel": "메모 문서",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "exportMode": "checklist",
      "exportModeScanned": true,
      "optionLabel": "체크리스트",
      "visibleButtons": [
        "그대로 시작",
        "조금 고쳐 시작",
        "메모 문서 받기",
        "시작하기"
      ]
    }
  ],
  "urlFirstExportModeVisibleMarkdownHitCount": 0,
  "urlFirstExportModeVisibleMarkdownHits": [],
  "urlFirstCandidateUserCopyEvidenceCount": 1,
  "urlFirstCandidateUserCopyInternalHitCount": 0,
  "urlFirstMissCandidateCopyInternalHitCount": 0,
  "urlFirstCandidateUserCopyForbiddenHits": [],
  "urlFirstCandidateUserCopySamples": [
    {
      "route": "/flows",
      "state": "candidate",
      "copiedTextLength": 283,
      "copiedTextHash": "57dc21dfd13688da5483e186e9d44b21974d96db6b11ab10ede141205da3f203",
      "sample": "# 초안 요청 정리본\r\n\r\n- 원문 링크: https://example.com/source-to-convert?utm_source=review\r\n- 요청 제목: 새로 보고 싶은 준비 체크리스트\r\n- 요청 메모: URL에서 따라 할 순서만 남겨두고 싶음\r\n- 저장일: 7월 7일\r\n- 현재 상태: 아직 바로 시작할 Flow가 없어 초안 요청으로 보관했어요.\r\n- 마지막 확인: 7월 7일 · 아직 준비 전이에요\r\n\r\n초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.\r\n"
    }
  ],
  "urlFirstCandidateInternalHandoffPreserved": true,
  "urlFirstCandidateExpandedDetailCaptured": true,
  "urlFirstCandidateResolvedHitScenarioCaptured": true,
  "urlFirstCandidateResolvedHitScenarioStatus": "executable",
  "urlFirstCandidateResolvedHitScenarios": [
    {
      "recordId": "30-url-first-candidate-detail-mobile",
      "route": "/flows",
      "state": "candidate",
      "captured": true,
      "triggerUrl": "https://mathbang.net/13?utm_source=share",
      "canonicalUrl": "https://mathbang.net/13",
      "availabilityState": "executable",
      "lastLookupStatus": "hit",
      "routeHref": "/flow-maps/middle-school-math-1"
    }
  ],
  "urlFirstMissDraftGateVisible": true,
  "urlFirstMissDraftCtaLabel": "초안 요청 저장",
  "urlFirstMissDraftImpliesLiveAi": false,
  "urlFirstMissDraftLiveAiHitCount": 0,
  "urlFirstMissDraftGateEvidence": [
    {
      "recordId": "29-url-first-miss-candidate-form-mobile",
      "route": "/flows",
      "state": "miss",
      "scenarioName": "miss-candidate-form",
      "visible": true,
      "ctaLabel": "초안 요청 저장",
      "copyLines": [
        "초안 준비 요청",
        "아직 실행 가능한 Flow 아님",
        "URL과 메모를 저장해 두면 초안으로 만들 때 제목, 날짜, 메모를 손볼 기준으로 씁니다. 지금 바로 Flow를 만들지는 않습니다.",
        "요청 제목",
        "요청 메모",
        "초안 요청 저장",
        "브라우저에만 저장"
      ],
      "impliesLiveAi": false,
      "liveAiLines": []
    }
  ],
  "urlFirstStartDateInputVisibleCount": 3,
  "urlFirstStartDateInputMarkers": [
    {
      "route": "/flows",
      "state": "hit",
      "visible": true,
      "testId": "url-first-start-date-input",
      "inputType": "date",
      "label": "학습 시작일",
      "helpText": "학습 시작일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다.",
      "valuePresent": true,
      "rawIsoValuePresent": true
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "visible": true,
      "testId": "url-first-start-date-input",
      "inputType": "date",
      "label": "학습 시작일",
      "helpText": "학습 시작일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다.",
      "valuePresent": true,
      "rawIsoValuePresent": true
    },
    {
      "route": "/flows",
      "state": "moving-custom-start",
      "visible": true,
      "testId": "url-first-start-date-input",
      "inputType": "date",
      "label": "이사일",
      "helpText": "이사일을 기준으로 D-30부터 D-Day까지 배치합니다.",
      "valuePresent": true,
      "rawIsoValuePresent": true
    }
  ],
  "dateAnchorLabelByFlow": [
    "학습 시작일",
    "이사일"
  ],
  "urlFirstDateAnchorLabelEvidence": [
    {
      "recordId": "27-url-first-hit-mobile",
      "route": "/flows",
      "state": "hit",
      "scenarioName": "hit-default-start",
      "triggerUrl": "https://mathbang.net/13?utm_source=share",
      "label": "학습 시작일",
      "helpText": "학습 시작일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다.",
      "visible": true
    },
    {
      "recordId": "28-url-first-custom-start-mobile",
      "route": "/flows",
      "state": "custom-start",
      "scenarioName": "hit-custom-start",
      "triggerUrl": "https://mathbang.net/13?utm_source=share",
      "label": "학습 시작일",
      "helpText": "학습 시작일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다.",
      "visible": true
    },
    {
      "recordId": "28b-url-first-moving-custom-start-mobile",
      "route": "/flows",
      "state": "moving-custom-start",
      "scenarioName": "hit-moving-custom-start",
      "triggerUrl": "https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363",
      "label": "이사일",
      "helpText": "이사일을 기준으로 D-30부터 D-Day까지 배치합니다.",
      "visible": true
    }
  ],
  "myFlowAnchorEditEntryVisible": true,
  "myFlowAnchorEditLabels": [
    "이사일 바꾸기"
  ],
  "myFlowAnchorEditEvidence": [
    {
      "recordId": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "anchorEditEntryVisible": true,
      "anchorEditLabel": "이사일 바꾸기",
      "anchorInputLabel": "이사일",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": true,
      "helpText": "이사일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다. 이사일은 전체 일정 기준이고, 이 할 일 날짜는 해당 할 일만 바꿉니다."
    },
    {
      "recordId": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "이 할 일 날짜",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": ""
    }
  ],
  "itemDateOverrideLabels": [
    "이 할 일 날짜"
  ],
  "anchorVsItemOverrideCopyPresent": true,
  "urlFirstMarkerVisibleCount": 5,
  "prototypeReleasePreviewRouteCount": 4,
  "prototypeReleasePreviewGuardrailHitCount": 0,
  "prototypeReleasePreviewUnexpectedGuardrailHitCount": 0,
  "prototypeInternalConsoleRouteCount": 1,
  "prototypeInternalConsoleGuardrailHitCount": 7,
  "prototypeInternalConsoleAllowedDisplayGateHitCount": 7,
  "prototypeInternalConsoleUnexpectedGuardrailHitCount": 0,
  "prototypeInternalConsoleContextVisibleCount": 1,
  "flowLabPrototypeRouteCount": 1,
  "flowLabPrototypeTier": "internal-console",
  "flowLabPrototypeTierPolicy": {
    "tier": "internal-console",
    "label": "내부 실험 콘솔",
    "allowInternalDisplayGateHits": true,
    "requiresNoindex": true,
    "requiresNoUserNavLinks": true
  },
  "flowLabPrototypeBucket": true,
  "flowLabPrototypeGuardrailHitCount": 1,
  "flowLabPrototypeAllowedDisplayGateHitCount": 7,
  "flowLabPrototypeUnexpectedGuardrailHitCount": 0,
  "flowLabPrototypeNoindex": true,
  "flowLabPrototypeMetaRobots": [
    {
      "route": "/flow-lab/url-first-p0",
      "metaRobots": "noindex, nofollow"
    }
  ],
  "flowLabPrototypeInternalConsoleContextVisible": true,
  "flowLabPrototypeLinkedFromUserNavCount": 0,
  "manualRegistrationQaUserLinkCount": 0,
  "normalRouteQueueLabelScope": "my-flow-queue-label-surfaces",
  "normalRouteQueueLabelCount": 9,
  "normalRouteLegacyOverdueLabelCount": 0,
  "normalRouteHorizontalOverflowCount": 0,
  "fieldWorkbenchRowDetailSourceLinkCount": 0,
  "fieldWorkbenchSourceAccessLinkCount": 5,
  "fieldWorkbenchOpenDetailCounts": [
    10,
    15
  ],
  "fieldWorkbenchRepeatedDetailSentenceCount": 0,
  "publicWorkbenchDuplicateExportVisibleLabelCount": 0,
  "publicWorkbenchStickyFirstActionCount": 9,
  "publicWorkbenchStickyFirstActionSaveOrSetupCount": 9,
  "publicFlowFlowLevelSavePrimaryCount": 10,
  "publicFlowExportSingleSecondaryEntryCount": 10,
  "publicFlowExportFormatOptionCount": 26,
  "publicFlowItemLevelExportLikeLabelCount": 0,
  "publicFlowPreSaveItemCheckboxPreviewCount": 89,
  "publicFlowPreSavePreviewControlCount": 121,
  "publicWorkbenchStickyFirstActionNonPrimaryLabels": [],
  "publicShareRouteCount": 10,
  "publicShareSecondaryBrowseFocusableCount": 10,
  "publicShareSecondaryBrowseAfterPrimaryCount": 10,
  "publicShareSecondaryBrowseBeforePrimaryCount": 0,
  "publicSharePrimaryPathFocusableCount": 10,
  "publicSharePrimaryPathVisibleCount": 10,
  "restartPrototypeRawIsoHitCount": 0,
  "restartPrototypeInputRawIsoHitCount": 0,
  "restartPrototypeInputRawIsoExemptCount": 4,
  "restartPrototypeInputRawIsoExemptions": [
    {
      "route": "/restart/moving-d30",
      "scrollPurpose": null,
      "label": "이사일",
      "inputType": "date",
      "testId": "moving-restart-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/restart/moving-d30",
      "scrollPurpose": "full-schedule-date-distribution",
      "label": "이사일",
      "inputType": "date",
      "testId": "moving-restart-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/restart/moving-d30",
      "scrollPurpose": "source-export-mid-frame",
      "label": "이사일",
      "inputType": "date",
      "testId": "moving-restart-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/restart/moving-d30",
      "scrollPurpose": "true-page-bottom",
      "label": "이사일",
      "inputType": "date",
      "testId": "moving-restart-date-input",
      "reason": "native-date-input-value"
    }
  ],
  "restartPrototypeRawRouteSlugHitCount": 0,
  "restartPrototypeEnglishWeekdayHitCount": 0,
  "restartPrototypeEnglishUiVerbHitCount": 0,
  "restartPrototypeEnglishMonthTimeHitCount": 0,
  "restartPrototypeMixedExportLanguageHitCount": 0,
  "restartPrototypeDuplicateExportEntryHitCount": 0,
  "restartPrototypeHorizontalOverflowCount": 0,
  "restartPrototypeInlineExportButtonCounts": [
    4,
    4,
    4,
    4
  ],
  "restartPrototypeExportButtonCounts": [
    1,
    1,
    1,
    1
  ],
  "restartPrototypeSourceBottomFramesDistinct": true,
  "restartPrototypeSourceExportScrollY": 2503,
  "restartPrototypeBottomScrollY": 2798,
  "restartPrototypeFirstThreeSameD30Milestone": true,
  "restartPrototypeD30MilestoneGroupHeadingVisible": true,
  "restartPrototypeFirstThreeDateLabels": [
    "5월 28일 (목) · D-30",
    "5월 28일 (목) · D-30",
    "5월 28일 (목) · D-30"
  ],
  "restartPrototypeFirstThreeTitles": [
    "버릴 물건과 대형폐기물 정리",
    "이사 방식과 업체 후보 정하기",
    "이사할 집 하자 사진 남기기"
  ],
  "restartPrototypeFullScheduleUniqueDateLabelCount": 5,
  "restartPrototypeFullScheduleUniqueOffsetLabelCount": 5,
  "restartPrototypeDateDistributionJudgment": "intentional-d30-milestone-group"
}
```

## Scenario Matrix

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO | Input ISO | Native date input exempt |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 01-home-mobile | `/` | Home entry and lightweight recommendations | OK | 0 | 0 | 0 | 0 | 0 |
| 02-flows-mobile | `/flows` | Flow catalog scan with lightweight CTAs | OK | 0 | 0 | 0 | 0 | 0 |
| 27-url-first-hit-mobile | `/flows` | URL-first hit result on Flow finding | OK | 0 | 0 | 0 | 0 | 1 |
| 28-url-first-custom-start-mobile | `/flows` | URL-first lightweight custom start panel | OK | 0 | 0 | 0 | 0 | 1 |
| 28b-url-first-moving-custom-start-mobile | `/flows` | URL-first moving custom start with contextual move date | OK | 0 | 0 | 0 | 0 | 1 |
| 29-url-first-miss-candidate-form-mobile | `/flows` | URL-first miss candidate form | OK | 0 | 0 | 0 | 0 | 0 |
| 30-url-first-candidate-detail-mobile | `/flows` | URL-first saved candidate request detail | OK | 0 | 0 | 0 | 0 | 0 |
| 03-flow-map-moving-top-mobile | `/flow-maps/moving-d30` | Moving map save screen top | OK | 0 | 0 | 0 | 0 | 1 |
| 04-flow-map-moving-bottom-mobile | `/flow-maps/moving-d30` | Moving map bottom sticky clearance | OK | 0 | 0 | 0 | 0 | 1 |
| 05-flow-map-math-mobile | `/flow-maps/middle-school-math-1` | Math source-backed map screen | OK | 0 | 0 | 0 | 0 | 0 |
| 06-public-vehicle-mobile | `/f/vehicle-inspection-prep` | Public share save screen | OK | 0 | 0 | 0 | 0 | 0 |
| 07-public-moving-mobile | `/f/moving-d30-basic` | Public moving share screen | OK | 0 | 0 | 0 | 0 | 0 |
| 08-public-moving-bottom-mobile | `/f/moving-d30-basic` | Public moving bottom sticky clearance | OK | 0 | 0 | 0 | 0 | 0 |
| 09-workbench-fridge-mobile | `/f/fridge-cleanout-weekly-plan` | Fridge workbench active rows | OK | 0 | 0 | 0 | 0 | 0 |
| 10-workbench-washer-mobile | `/f/washer-tub-clean-monthly` | Washer workbench | OK | 0 | 0 | 0 | 0 | 0 |
| 11-workbench-new-car-mobile | `/f/new-car-delivery-check` | New car checklist workbench | OK | 0 | 0 | 0 | 0 | 0 |
| 12-workbench-used-car-mobile | `/f/used-car-buying-check` | Used car checklist workbench | OK | 0 | 0 | 0 | 0 | 0 |
| 25-workbench-new-car-open-details-mobile | `/f/new-car-delivery-check` | New car checklist row details without repeated source links | OK | 0 | 0 | 0 | 0 | 0 |
| 26-workbench-used-car-open-details-mobile | `/f/used-car-buying-check` | Used car checklist row details without repeated source links | OK | 0 | 0 | 0 | 0 | 0 |
| 13-post-save-my-moving-mobile | `/my?savedMap=moving-d30` | Post-save My Flow for moving map | OK | 0 | 0 | 0 | 0 | 0 |
| 13b-my-moving-personal-anchor-settings-mobile | `/my?savedMap=curated-ajd-moving-d30` | My Flow moving personal copy anchor edit entry | OK | 0 | 0 | 0 | 0 | 1 |
| 13c-my-moving-personal-step-date-override-mobile | `/my?savedMap=curated-ajd-moving-d30` | My Flow moving personal copy item date override label | OK | 0 | 0 | 0 | 0 | 1 |
| 14-calendar-after-moving-save-mobile | `/calendar` | Calendar agenda-first after moving save | OK | 0 | 0 | 0 | 0 | 0 |
| 43-calendar-same-date-multi-flow-mobile | `/calendar` | Calendar same-date multi-Flow markers mobile | OK | 0 | 0 | 0 | 0 | 0 |
| 15-post-save-my-math-mobile | `/my?savedMap=middle-school-math-1` | Post-save My Flow for undated math content | OK | 0 | 0 | 0 | 0 | 0 |
| 16-my-multi-queue-mobile | `/my` | My Flow with today overdue next queues | OK | 0 | 0 | 0 | 0 | 0 |
| 17-my-multi-queue-overdue-sheet-mobile | `/my` | My Flow overdue sheet dedupe evidence | OK | 0 | 0 | 0 | 0 | 0 |
| 18-my-long-list-top-mobile | `/my` | My Flow 5+ saved list top | OK | 0 | 0 | 0 | 0 | 0 |
| 19-my-long-list-bottom-mobile | `/my` | My Flow 5+ list bottom before sheet | OK | 0 | 0 | 0 | 0 | 0 |
| 20-my-long-list-inventory-bottom-mobile | `/my` | My Flow 5+ inventory sheet bottom clearance | OK | 0 | 0 | 0 | 0 | 0 |
| 21-restart-moving-top-mobile | `/restart/moving-d30` | Restart prototype top with user date format | OK | 0 | 0 | 0 | 0 | 1 |
| 24-restart-moving-full-schedule-mobile | `/restart/moving-d30` | Restart prototype full schedule date distribution | OK | 0 | 0 | 0 | 0 | 1 |
| 22-restart-moving-source-export-mobile | `/restart/moving-d30` | Restart prototype source and export hierarchy | OK | 0 | 0 | 0 | 0 | 1 |
| 23-restart-moving-bottom-mobile | `/restart/moving-d30` | Restart prototype bottom clearance | OK | 0 | 0 | 0 | 0 | 1 |
| 31-flow-lab-url-first-p0-mobile | `/flow-lab/url-first-p0` | URL-first lab prototype bucket gate | OK | 2 | 2 | 1 | 0 | 0 |
| 39-creator-profile-my-flow-studio-mobile | `/u/my-flow-studio` | Creator profile studio mobile surface with filled local content | OK | 0 | 0 | 0 | 0 | 0 |
| 41-creator-profile-flow-curation-team-mobile | `/u/flow-curation-team` | Filled public creator profile mobile surface | OK | 0 | 0 | 0 | 0 | 0 |
| 32-home-wide | `/` | Home wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 33-flows-wide | `/flows` | Flow finding wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 34-flow-map-moving-wide | `/flow-maps/moving-d30` | Moving map wide viewport spot check | OK | 0 | 0 | 0 | 0 | 1 |
| 35-public-vehicle-wide | `/f/vehicle-inspection-prep` | Public share wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 44-calendar-same-date-multi-flow-wide | `/calendar` | Calendar same-date multi-Flow markers wide | OK | 0 | 0 | 0 | 0 | 0 |
| 36-post-save-my-moving-wide | `/my?savedMap=moving-d30` | Post-save My Flow wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 37-url-first-hit-wide | `/flows` | URL-first hit wide viewport guardrail spot check | OK | 0 | 0 | 0 | 0 | 1 |
| 38-url-first-candidate-detail-wide | `/flows` | URL-first candidate detail wide viewport guardrail spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 40-creator-profile-my-flow-studio-wide | `/u/my-flow-studio` | Creator profile studio wide surface with filled local content | OK | 0 | 0 | 0 | 0 | 0 |
| 42-creator-profile-flow-curation-team-wide | `/u/flow-curation-team` | Filled public creator profile wide surface | OK | 0 | 0 | 0 | 0 | 0 |

## Restart Prototype Bucket

`/restart/moving-d30` remains outside the primary 4-tab IA. It is tracked as prototype tier `release-preview`, so it must still pass the display gate before any future promotion:

- no user-facing raw ISO dates
- no raw route slug such as `restart / moving-d30`
- no English weekday labels such as `Sun Mon Tue`
- no English month/time labels such as `Jan`, `Feb`, `AM`, or `PM`
- no English UI verbs such as `download`, `copy`, `sync`, or `import`
- no mixed export-language copy such as `export` plus Korean copy
- no duplicated primary export entry labels
- no source brand slug as title/subtitle copy
- no horizontal overflow at 390px
- native `input[type=date]` values may remain ISO as technical browser control values, but they are recorded in an explicit exemption bucket and must not appear as primary label/help/card text

The restart source/export frame and bottom frame must remain distinct:

- source/export scrollY: 2503
- bottom scrollY: 2798
- distinct hash/scroll evidence: yes
- first-three date labels: ["5월 28일 (목) · D-30","5월 28일 (목) · D-30","5월 28일 (목) · D-30"]
- first-three row titles: ["버릴 물건과 대형폐기물 정리","이사 방식과 업체 후보 정하기","이사할 집 하자 사진 남기기"]
- D-30 milestone group heading visible: yes
- full schedule unique date labels: 5
- full schedule unique offset labels: 5
- date distribution judgment: intentional-d30-milestone-group
- visible raw ISO hit count: 0
- input raw ISO hit count: 0
- native date input ISO exemption count: 4
- native date input ISO exemptions: [{"route":"/restart/moving-d30","scrollPurpose":null,"label":"이사일","inputType":"date","testId":"moving-restart-date-input","reason":"native-date-input-value"},{"route":"/restart/moving-d30","scrollPurpose":"full-schedule-date-distribution","label":"이사일","inputType":"date","testId":"moving-restart-date-input","reason":"native-date-input-value"},{"route":"/restart/moving-d30","scrollPurpose":"source-export-mid-frame","label":"이사일","inputType":"date","testId":"moving-restart-date-input","reason":"native-date-input-value"},{"route":"/restart/moving-d30","scrollPurpose":"true-page-bottom","label":"이사일","inputType":"date","testId":"moving-restart-date-input","reason":"native-date-input-value"}]

## Prototype Tier Split

- release-preview route count: 4
- release-preview guardrail hits: 0
- release-preview unexpected guardrail hits: 0
- internal-console route count: 1
- internal-console guardrail hits: 7
- internal-console allowed display-gate hits: 7
- internal-console unexpected guardrail hits: 0
- internal-console context visible count: 1

## Flow Lab Internal Console Bucket

`/flow-lab/url-first-p0` remains outside the primary 4-tab IA and normal user-route guardrail bucket. It is tracked as prototype tier `internal-console`, where P0/HIT/needs_review/canonical-style lab labels are allowed only because the route is a noindex internal console with no normal user-route links:

- prototype route count: 1
- prototype tier: internal-console
- prototype tier policy: {"tier":"internal-console","label":"내부 실험 콘솔","allowInternalDisplayGateHits":true,"requiresNoindex":true,"requiresNoUserNavLinks":true}
- prototype bucket marker: yes
- noindex metadata: yes
- meta robots records: [{"route":"/flow-lab/url-first-p0","metaRobots":"noindex, nofollow"}]
- display-gate hit count while in prototype bucket: 1
- allowed display-gate hit count while in internal console: 7
- unexpected guardrail hit count: 0
- internal-console context visible: yes
- links from normal user routes to flow-lab: 0
- links from normal user routes to manual registration QA docs: 0

## Field Checklist Source Density

- row detail source link count: 0
- source/reference access link count: 5
- open detail counts: [10,15]

## Public Share CTA / Tab Order

- public share route count: 10
- secondary browse focusable count: 10
- secondary browse after-primary count: 10
- secondary browse before-primary count: 0
- primary save/input path focusable count: 10
- primary save/input path visible count: 10
- expected: `콘텐츠 더 보기` remains keyboard/screen-reader reachable as a quiet secondary link, but it should follow `내 Flow에 저장` or the input/setup path.

## Commit Metadata

- UI baseline commit: `8ad8522`
- Package generated from commit: `8ad8522`
- Package commit ref: `git commit containing this generated package`

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
