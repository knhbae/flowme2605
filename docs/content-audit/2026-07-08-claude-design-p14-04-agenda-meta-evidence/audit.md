# Claude Design P14 Guardrail Audit

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

## Summary

```json
{
  "totalScreenshots": 38,
  "uiBaselineCommit": "2a0b8b3",
  "packageGeneratedFromCommit": "2a0b8b3",
  "packageCommitRef": "git commit containing this generated package",
  "wideViewportEvidenceCount": 7,
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
    }
  ],
  "wideViewportHorizontalOverflowCount": 0,
  "wideLayoutRouteCount": 7,
  "wideLayoutFixedOverlapCount": 0,
  "wideLayoutPrimaryCtaVisibleCount": 7,
  "wideLayoutMyFlowVisibleFlowFindingLinkMax": 1,
  "wideLayoutHomeRecommendationWidthRatioMin": 1,
  "wideViewportGuardrailRouteCount": 7,
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
  "normalRouteInputRawIsoExemptCount": 6,
  "normalRouteFirstTaskRepetitionHitCount": 0,
  "normalRouteContinuationActionableCount": 5,
  "normalRouteContinuationExplanationOnlyCount": 0,
  "normalRouteAgendaGroupMetaCount": 2,
  "normalRouteAgendaGroupRepeatedDateMetaRowCount": 0,
  "normalRouteAgendaGroupRepeatedTimingMetaRowCount": 0,
  "normalRouteStatusSheetGroupMetaCount": 1,
  "normalRouteStatusSheetUngroupedRowCount": 0,
  "normalRouteRowControlAccessibleNameSampleCount": 4,
  "normalRouteRowControlAccessibleNameContextCount": 4,
  "normalRouteInventoryDuplicateProgressMetricCount": 0,
  "normalRouteInventoryHeaderLargeRemainingCount": 0,
  "urlFirstScenarioCount": 4,
  "urlFirstStatesCaptured": [
    "hit",
    "custom-start",
    "miss",
    "candidate"
  ],
  "urlFirstScenarioTriggerUrlCount": 4,
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
  "urlFirstNormalInputRawIsoExemptCount": 2,
  "urlFirstInputRawIsoExemptions": [
    {
      "route": "/flows",
      "state": "hit",
      "label": "시작일",
      "inputType": "date",
      "value": "2026-07-17",
      "testId": "url-first-start-date-input",
      "reason": "native-date-input-value"
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "label": "시작일",
      "inputType": "date",
      "value": "2026-07-17",
      "testId": "url-first-start-date-input",
      "reason": "native-date-input-value"
    }
  ],
  "urlFirstVisibleMarkdownHitCount": 0,
  "urlFirstVisibleMarkdownHits": [],
  "urlFirstExportModeEvidenceCount": 6,
  "urlFirstExportModeScannedCount": 6,
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
    }
  ],
  "urlFirstExportModeVisibleMarkdownHitCount": 0,
  "urlFirstExportModeVisibleMarkdownHits": [],
  "urlFirstCandidateUserCopyEvidenceCount": 1,
  "urlFirstCandidateUserCopyInternalHitCount": 0,
  "urlFirstCandidateUserCopyForbiddenHits": [],
  "urlFirstCandidateUserCopySamples": [
    {
      "route": "/flows",
      "state": "candidate",
      "copiedTextLength": 281,
      "copiedTextHash": "ad7117a95a85cb06bff0088ffd945baeed98bd3c2aacd454af3a5e8baa68aba1",
      "sample": "# 요청 정리본\r\n\r\n- 원문 링크: https://example.com/source-to-convert?utm_source=review\r\n- 요청 제목: 새로 보고 싶은 준비 체크리스트\r\n- 요청 메모: URL에서 따라 할 순서만 남겨두고 싶음\r\n- 저장일: 7월 7일\r\n- 현재 상태: 아직 실행 가능한 Flow가 없어 요청 내용을 보관했어요.\r\n- 마지막 확인: 7월 7일 · 아직 준비 전이에요\r\n\r\n필요하면 이 내용을 바탕으로 FlowMe에서 다시 찾아보거나 요청 내용을 수정할 수 있어요.\r\n"
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
  "urlFirstStartDateInputVisibleCount": 2,
  "urlFirstStartDateInputMarkers": [
    {
      "route": "/flows",
      "state": "hit",
      "visible": true,
      "testId": "url-first-start-date-input",
      "inputType": "date",
      "valuePresent": true,
      "rawIsoValuePresent": true
    },
    {
      "route": "/flows",
      "state": "custom-start",
      "visible": true,
      "testId": "url-first-start-date-input",
      "inputType": "date",
      "valuePresent": true,
      "rawIsoValuePresent": true
    }
  ],
  "urlFirstMarkerVisibleCount": 4,
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
  "normalRouteQueueLabelCount": 12,
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
| 14-calendar-after-moving-save-mobile | `/calendar` | Calendar agenda-first after moving save | OK | 0 | 0 | 0 | 0 | 0 |
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
| 32-home-wide | `/` | Home wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 33-flows-wide | `/flows` | Flow finding wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 34-flow-map-moving-wide | `/flow-maps/moving-d30` | Moving map wide viewport spot check | OK | 0 | 0 | 0 | 0 | 1 |
| 35-public-vehicle-wide | `/f/vehicle-inspection-prep` | Public share wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 36-post-save-my-moving-wide | `/my?savedMap=moving-d30` | Post-save My Flow wide viewport spot check | OK | 0 | 0 | 0 | 0 | 0 |
| 37-url-first-hit-wide | `/flows` | URL-first hit wide viewport guardrail spot check | OK | 0 | 0 | 0 | 0 | 1 |
| 38-url-first-candidate-detail-wide | `/flows` | URL-first candidate detail wide viewport guardrail spot check | OK | 0 | 0 | 0 | 0 | 0 |

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

- UI baseline commit: `2a0b8b3`
- Package generated from commit: `2a0b8b3`
- Package commit ref: `git commit containing this generated package`

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
