아래 GitHub 소스/문서/screenshot만 보고 FlowMe P18 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

검토 기준:
1. P4~P9 기준선이 P10 이후에도 실제 화면 기준으로 유지되는지 확인
2. P10-01 guardrail/capture 정본 단일화가 충분한지 확인
3. P10-02 공개 /f workbench primary save/setup path evidence가 충분한지 확인
   - `내 Flow에 저장` 또는 입력/setup path가 visible/focusable primary인지
   - `콘텐츠 더 보기`가 접근 가능하지만 primary 뒤의 보조 탐색인지
4. P10-03 My Flow `지금 이어하기`가 explanation-only card로 보이지 않는지 확인
5. P10-04 Calendar selected-day agenda에서 같은 날짜의 공통 metadata/chip이 과하게 반복되지 않는지 확인
6. P10-05 restart/My Flow row control label이 짧게 보이고 aria-label에는 전체 맥락이 보존되는지 확인
7. P10-06 GitHub link base가 실제 repository path에서 열리는지 확인
8. P10-07 raw ISO evidence가 visible text, user-visible input hit, native date input exemption을 올바르게 분리하는지 확인
9. 정상 사용자 route에서 아래 회귀가 다시 생길 위험이 있는지 확인
   - seed/source metadata에서 동적으로 추출되는 source slug가 제목/부제/주요 문구로 노출
   - 콘텐츠 제목 끝 Flow 접미
   - 일정 지도, 저장한 지도 같은 내부 구조형 표현
   - raw ISO 날짜
   - non-date input value의 raw ISO 날짜
   - My Flow 첫 할 일 제목 반복
   - 모바일 390px 좌우 overflow
   - 하단 fixed/sticky가 마지막 버튼/행/agenda를 가림
10. prototype tier 분리가 충분한지 확인
   - /restart/moving-d30 = release-preview, display gate 0
   - /flow-lab/url-first-p0 = internal-console, noindex + user nav link 0 + 내부 콘솔 맥락 visible
   - internal-console hit가 정상 route 또는 release-preview hit와 섞이지 않는지
11. P8-09 field checklist workbench source-density guardrail이 충분한지 확인
   - new-car / used-car row detail source link count가 0인지
   - source/reference access link count가 0보다 크게 유지되는지
12. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P18 review package README: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-09-claude-design-p18-07-date-anchor-evidence/README.md
- Audit markdown: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-09-claude-design-p18-07-date-anchor-evidence/audit.md
- Review HTML: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-09-claude-design-p18-07-date-anchor-evidence/review.html
- Route evidence JSON: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-09-claude-design-p18-07-date-anchor-evidence/route-evidence.json
- Screenshots folder: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-09-claude-design-p18-07-date-anchor-evidence/screenshots
- E2E guardrails: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/flow-mvp.spec.ts
- Workbench source density E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/workbench-source-density.spec.ts
- Public share CTA/tab-order E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/public-share-cta-order.spec.ts

현재 guardrail scan 요약:
```json
{
  "totalScreenshots": 47,
  "uiBaselineCommit": "90e83ab",
  "packageGeneratedFromCommit": "90e83ab",
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
  "normalRouteAgendaGroupMetaCount": 6,
  "normalRouteAgendaGroupRepeatedDateMetaRowCount": 4,
  "normalRouteAgendaGroupRepeatedTimingMetaRowCount": 0,
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
  "normalRouteRowControlAccessibleNameSampleCount": 13,
  "normalRouteRowControlAccessibleNameContextCount": 13,
  "normalRouteInventoryDuplicateProgressMetricCount": 0,
  "normalRouteInventoryHeaderLargeRemainingCount": 0,
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
        "새 콘텐츠 요청",
        "준비 중",
        "7월 7일",
        "새로 보고 싶은 준비 체크리스트",
        "URL에서 따라 할 순서만 남겨두고 싶음",
        "원문 URL 저장됨",
        "아직 실행 가능한 Flow 아님 · 준비 중",
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
        "아직 바로 실행할 수 없어 원문과 요청 내용을 보관합니다.",
        "요청 정리본 복사",
        "요청 정리본 복사됨",
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

요청 산출물:
1. route별 UX/UI 문제 목록
2. Blocking/High/Medium/Low 우선순위
3. 바로 개발 가능한 P19 backlog
4. 유지해야 할 기준선
5. 화면별 구체 수정 지시
6. evidence가 부족한 시나리오
