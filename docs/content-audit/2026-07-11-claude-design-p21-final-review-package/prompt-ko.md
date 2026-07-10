아래 GitHub 소스/문서/screenshot만 보고 FlowMe P21 마감 상태를 검토해주세요. Vercel이나 로컬 앱을 직접 열 수 없다는 전제로 review package 안의 scenario별 screenshot과 route-evidence.json을 함께 보세요.

제품 전제:
- FlowMe는 URL/메모를 실행 가능한 Flow 초안으로 바꾸고 My Flow와 Calendar, 사용자 도구 export로 이어지는 개인 실행 도구입니다.
- 현재 P21 draft 제안은 실제 AI가 아니라 결정론적 파싱입니다. 실제 AI가 연결됐다고 평가하거나 전제하지 마세요.
- Studio는 5번째 탭이 아니라 draft를 다시 찾는 보조 선반입니다.

검토 기준:
1. P21-01 URL/메모 miss가 한 개 placeholder가 아니라 3~7개의 구체적 실행 항목으로 제안되는지 확인
   - 기준일에서 날짜가 배치되는지
   - 저장 후 제목, 날짜, 메모, 포함 여부를 My Flow에서 수정할 수 있는지
   - Calendar와 export가 같은 수정본을 읽는지
   - 실제 AI처럼 과장하지 않는지
2. P21-03 normal/wide 구조형 사용자 문구 hit가 0인지 확인
3. P21-04 draft lifecycle 5개 그룹을 시나리오별로 검토
   - 저장 실패: 입력 보존과 재시도 안내
   - 중복 draft: 추가 저장물 생성 없이 기존 draft로 이동하는 경로
   - 빈 My Flow/Calendar: 한 가지 Flow 찾기 recovery
   - 전체 완료: 남은 개수 0, 완료 상태, 다시 열 수 있는 완료 취소
   - 오프라인: 이미 열린 My Flow의 로컬 행동 범위만 정직하게 기록하는지
4. P21-02 실제 AI gate spec을 검토
   - source 원본, AI 제안, 사용자 overlay가 구분되는지
   - 사용자 검토 전 자동 저장·발행·완료가 금지되는지
   - 민감 콘텐츠, 실패, timeout, 비용, 개인정보, fallback 정책이 구현 가능하게 정의됐는지
5. P21-05 홈과 Calendar micro-polish가 기능 모델을 흔들지 않는지 확인
   - 홈 Flow 찾기와 링크 붙여넣기 문구가 붙어 읽히지 않는지
   - Calendar grid의 두 visible Flow가 색만이 아니라 글자 마커와 full accessible name으로 구분되는지
   - 3개 이상은 외 N개, selected-day agenda는 full detail인지
6. P18~P20 기준선 회귀 확인
   - 완료 checkbox 1종, 진행 숫자 맥락화, public 저장 전 preview와 저장 후 completion 경계
   - public save/setup-first, URL-first visible Markdown 0, internal copy hit 0, horizontal overflow 0
7. 단순 평가로 끝내지 말고 다음 P22 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P21 review README: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p21-final-review-package/README.md
- Audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p21-final-review-package/audit.md
- Review HTML: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p21-final-review-package/review.html
- Route evidence: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p21-final-review-package/route-evidence.json
- Screenshots: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p21-final-review-package/screenshots
- P21 AI gate spec: https://github.com/knhbae/flowme2605/blob/main/docs/specs/2026-07-11-url-first-ai-draft-gate/spec.md
- URL-first E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/url-first-user-surface.spec.ts
- My Flow/Calendar E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/flow-mvp.spec.ts

현재 marker summary:
{
  "totalScreenshots": 68,
  "uiBaselineCommit": "5762ee7",
  "packageGeneratedFromCommit": "5762ee7",
  "packageCommitRef": "git commit containing this generated package",
  "wideViewportEvidenceCount": 19,
  "wideViewportWidth": 1024,
  "wideViewportRoutesCaptured": [
    {
      "id": "39f-url-first-draft-studio-shelf-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "45-draft-save-failure-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "46-draft-duplicate-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "47b-draft-empty-calendar-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
    {
      "id": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "noHorizontalOverflow": true
    },
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
      "id": "44b-calendar-grid-flow-stack-wide",
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
  "wideLayoutRouteCount": 19,
  "wideLayoutFixedOverlapCount": 0,
  "wideLayoutPrimaryCtaVisibleCount": 9,
  "wideLayoutMyFlowVisibleFlowFindingLinkMax": 2,
  "wideLayoutHomeRecommendationWidthRatioMin": 1,
  "homeUrlFirstEntryVisible": true,
  "homeUrlFirstEntryLabel": [
    "URL이나 메모로 Flow 찾기· 링크 붙여넣기 · 요청 메모 · 준비된 Flow 확인"
  ],
  "homeUrlFirstEntryDestination": [
    "/flows"
  ],
  "homeUrlFirstEntryAboveFold": true,
  "homeMemoEntryVisible": true,
  "homePrimaryEntryCompetesWithRecommendations": false,
  "homeUrlFirstEntrySeparatorPresent": true,
  "homeUrlFirstEntryConcatenatedLabelCount": 0,
  "homeUrlFirstEntryByViewport": {
    "390": {
      "visible": true,
      "aboveFold": true,
      "destination": "/flows",
      "memoEntryVisible": true
    },
    "1024": {
      "visible": true,
      "aboveFold": true,
      "destination": "/flows",
      "memoEntryVisible": true
    }
  },
  "homeUrlFirstEntryEvidence": [
    {
      "recordId": "01-home-mobile",
      "route": "/",
      "viewportWidth": 390,
      "visible": true,
      "label": "URL이나 메모로 Flow 찾기· 링크 붙여넣기 · 요청 메모 · 준비된 Flow 확인",
      "destination": "/flows",
      "aboveFold": true,
      "rect": {
        "x": 20,
        "y": 304,
        "width": 350,
        "height": 62
      },
      "memoEntryVisible": true,
      "competesWithRecommendations": false,
      "separatorPresent": true,
      "concatenatedLabelHitCount": 0
    },
    {
      "recordId": "32-home-wide",
      "route": "/",
      "viewportWidth": 1024,
      "visible": true,
      "label": "URL이나 메모로 Flow 찾기· 링크 붙여넣기 · 요청 메모 · 준비된 Flow 확인",
      "destination": "/flows",
      "aboveFold": true,
      "rect": {
        "x": 20,
        "y": 448,
        "width": 304,
        "height": 62
      },
      "memoEntryVisible": true,
      "competesWithRecommendations": false,
      "separatorPresent": true,
      "concatenatedLabelHitCount": 0
    }
  ],
  "draftLifecycleScenarioCount": 5,
  "draftSaveFailureScenarioCaptured": true,
  "draftSaveFailureRecoveryVisible": true,
  "draftSaveFailureInputPreserved": true,
  "draftDuplicateScenarioCaptured": true,
  "draftDuplicateCreatesExtraSavedFlow": false,
  "draftDuplicateRecoveryVisible": true,
  "draftEmptyStateCaptured": true,
  "draftCompletedZeroStateCaptured": true,
  "draftCompletedRemainingCount": 0,
  "draftOfflineScenarioCaptured": true,
  "draftOfflineLocalActionsAvailable": true,
  "draftLifecycleInternalHitCount": 0,
  "draftLifecycleHorizontalOverflowCount": 0,
  "draftLifecycleEvidence": [
    {
      "recordId": "45-draft-save-failure-mobile",
      "route": "/flows",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "save-failure",
      "stateGroup": "failure",
      "captured": true,
      "userRecoveryVisible": true,
      "inputPreserved": true,
      "savedDraftCount": 0,
      "reason": null,
      "nextAction": "retry-after-storage-check"
    },
    {
      "recordId": "45-draft-save-failure-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "save-failure",
      "stateGroup": "failure",
      "captured": true,
      "userRecoveryVisible": true,
      "inputPreserved": true,
      "savedDraftCount": 0,
      "reason": null,
      "nextAction": "retry-after-storage-check"
    },
    {
      "recordId": "46-draft-duplicate-mobile",
      "route": "/flows",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "duplicate-draft",
      "stateGroup": "duplicate",
      "captured": true,
      "userRecoveryVisible": true,
      "createsExtraSavedFlow": false,
      "beforeSavedDraftCount": 1,
      "afterSavedDraftCount": 1,
      "existingDraftSlugPreserved": true,
      "reason": null,
      "nextAction": "open-existing-draft"
    },
    {
      "recordId": "46-draft-duplicate-wide",
      "route": "/flows",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "duplicate-draft",
      "stateGroup": "duplicate",
      "captured": true,
      "userRecoveryVisible": true,
      "createsExtraSavedFlow": false,
      "beforeSavedDraftCount": 1,
      "afterSavedDraftCount": 1,
      "existingDraftSlugPreserved": true,
      "reason": null,
      "nextAction": "open-existing-draft"
    },
    {
      "recordId": "47a-draft-empty-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "empty-my-flow",
      "stateGroup": "empty",
      "captured": true,
      "userRecoveryVisible": true,
      "surface": "my-flow",
      "reason": null,
      "nextAction": "open-flow-finding"
    },
    {
      "recordId": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "empty-my-flow",
      "stateGroup": "empty",
      "captured": true,
      "userRecoveryVisible": true,
      "surface": "my-flow",
      "reason": null,
      "nextAction": "open-flow-finding"
    },
    {
      "recordId": "47b-draft-empty-calendar-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "empty-calendar",
      "stateGroup": "empty",
      "captured": true,
      "userRecoveryVisible": true,
      "surface": "calendar",
      "reason": null,
      "nextAction": "open-flow-finding"
    },
    {
      "recordId": "47b-draft-empty-calendar-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "empty-calendar",
      "stateGroup": "empty",
      "captured": true,
      "userRecoveryVisible": true,
      "surface": "calendar",
      "reason": null,
      "nextAction": "open-flow-finding"
    },
    {
      "recordId": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "completed-zero",
      "stateGroup": "completed",
      "captured": true,
      "userRecoveryVisible": true,
      "completedCount": 3,
      "remainingCount": 0,
      "contextualProgressVisible": true,
      "reason": null,
      "nextAction": "uncheck-to-reopen"
    },
    {
      "recordId": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "completed-zero",
      "stateGroup": "completed",
      "captured": true,
      "userRecoveryVisible": true,
      "completedCount": 3,
      "remainingCount": 0,
      "contextualProgressVisible": true,
      "reason": null,
      "nextAction": "uncheck-to-reopen"
    },
    {
      "recordId": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "offline-local-action",
      "stateGroup": "offline",
      "captured": true,
      "userRecoveryVisible": true,
      "scope": "already-open-my-flow-route",
      "localActionsAvailable": true,
      "networkNavigationClaimed": false,
      "reason": null,
      "nextAction": "continue-local-work-or-reconnect-for-navigation"
    },
    {
      "recordId": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "internalHitCount": 0,
      "noHorizontalOverflow": true,
      "state": "offline-local-action",
      "stateGroup": "offline",
      "captured": true,
      "userRecoveryVisible": true,
      "scope": "already-open-my-flow-route",
      "localActionsAvailable": true,
      "networkNavigationClaimed": false,
      "reason": null,
      "nextAction": "continue-local-work-or-reconnect-for-navigation"
    }
  ],
  "wideViewportGuardrailRouteCount": 19,
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
      "recordId": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
    {
      "recordId": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "rawHref": "/u/my-flow-studio",
      "pathname": "/u/my-flow-studio",
      "label": "스튜디오",
      "accessibleName": "스튜디오",
      "destinationTier": "creator-profile"
    },
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
      "recordId": "43b-calendar-grid-flow-stack-mobile",
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
      "recordId": "44b-calendar-grid-flow-stack-wide",
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
      "recordId": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
    {
      "recordId": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "allowed": true,
      "destinations": [
        "/u/my-flow-studio"
      ]
    },
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
      "recordId": "43b-calendar-grid-flow-stack-mobile",
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
      "recordId": "44b-calendar-grid-flow-stack-wide",
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
    "390": 18,
    "1024": 6
  },
  "studioEntryReachableByViewport": {
    "390": 18,
    "1024": 6
  },
  "studioEntryDestination": "/u/my-flow-studio",
  "studioEntryDestinationTier": "creator-profile",
  "studioEntryPolicy": "visible as a saved-work header action on /my and /calendar when saved content exists; creator profile remains outside the 4-tab IA",
  "creatorProfileRouteCount": 6,
  "creatorProfileViewportWidths": [
    390,
    1024
  ],
  "creatorProfileTier": "creator-profile",
  "creatorProfilePolicy": "user-facing secondary surface outside the 4-tab IA; not a fifth tab; current-user studio is noindex, public creator channels may be indexable; normal user-surface guardrails apply",
  "creatorProfileNoindex": [
    {
      "recordId": "39e-url-first-draft-studio-shelf-mobile",
      "route": "/u/my-flow-studio",
      "viewportWidth": 390,
      "noindex": true
    },
    {
      "recordId": "39f-url-first-draft-studio-shelf-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "noindex": true
    },
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
  "creatorProfileFilledRouteCount": 6,
  "creatorProfileEmptyRouteCount": 0,
  "creatorProfileContentCardCount": 162,
  "creatorProfileDraftTabVisible": true,
  "creatorProfileDraftContentCardCount": 4,
  "creatorProfilePublishedContentCardCount": 158,
  "creatorProfileUrlFirstDraftCardCount": 2,
  "creatorProfileDraftEditPathVisible": true,
  "creatorProfileDraftEditDestinations": [
    {
      "label": "내 Flow에서 수정",
      "href": "/my",
      "pathname": "/my"
    }
  ],
  "creatorProfileGuardrailHitCount": 0,
  "creatorProfileEvidence": [
    {
      "recordId": "39e-url-first-draft-studio-shelf-mobile",
      "route": "/u/my-flow-studio",
      "viewportWidth": 390,
      "tier": "creator-profile",
      "kind": "current-user-studio-draft-shelf",
      "noindex": true,
      "surfaceVisible": true,
      "heading": "나의 스튜디오",
      "contentCardCount": 1,
      "draftTabVisible": true,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 0,
      "urlFirstDraftCardCount": 1,
      "draftEditPathVisible": true,
      "draftEditDestinations": [
        {
          "label": "내 Flow에서 수정",
          "href": "/my",
          "pathname": "/my"
        }
      ],
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    },
    {
      "recordId": "39f-url-first-draft-studio-shelf-wide",
      "route": "/u/my-flow-studio",
      "viewportWidth": 1024,
      "tier": "creator-profile",
      "kind": "current-user-studio-draft-shelf",
      "noindex": true,
      "surfaceVisible": true,
      "heading": "나의 스튜디오",
      "contentCardCount": 1,
      "draftTabVisible": true,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 0,
      "urlFirstDraftCardCount": 1,
      "draftEditPathVisible": true,
      "draftEditDestinations": [
        {
          "label": "내 Flow에서 수정",
          "href": "/my",
          "pathname": "/my"
        }
      ],
      "emptySummaryVisible": false,
      "internalHitCount": 0,
      "sourceSlugHitCount": 0,
      "structuralDisplayHitCount": 0,
      "rawIsoHitCount": 0,
      "visibleMarkdownHitCount": 0,
      "noHorizontalOverflow": true
    },
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
      "draftTabVisible": true,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 4,
      "urlFirstDraftCardCount": 0,
      "draftEditPathVisible": false,
      "draftEditDestinations": [],
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
      "draftTabVisible": true,
      "draftContentCardCount": 0,
      "publishedContentCardCount": 75,
      "urlFirstDraftCardCount": 0,
      "draftEditPathVisible": false,
      "draftEditDestinations": [],
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
      "draftTabVisible": true,
      "draftContentCardCount": 1,
      "publishedContentCardCount": 4,
      "urlFirstDraftCardCount": 0,
      "draftEditPathVisible": false,
      "draftEditDestinations": [],
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
      "draftTabVisible": true,
      "draftContentCardCount": 0,
      "publishedContentCardCount": 75,
      "urlFirstDraftCardCount": 0,
      "draftEditPathVisible": false,
      "draftEditDestinations": [],
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
  "normalRouteInputRawIsoExemptCount": 15,
  "normalRouteFirstTaskRepetitionHitCount": 0,
  "normalRouteContinuationActionableCount": 6,
  "normalRouteContinuationExplanationOnlyCount": 0,
  "myFlowTodayFrameCount": 1,
  "myFlowTodayRemainingCountSourceCount": 1,
  "myFlowTodayInlineCompleteControlCount": 6,
  "myFlowTodayOpenBeforeCompleteRequired": false,
  "myFlowTodayGenericMetaChipCount": 0,
  "myFlowTodayFrameEvidence": [
    {
      "id": "39a-url-first-draft-item-edit-entry-mobile",
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
      "id": "39b-url-first-draft-anchor-edit-mobile",
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
      "id": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "47a-draft-empty-my-flow-mobile",
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
      "id": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "48-draft-completed-zero-mobile",
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
      "id": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "49-draft-offline-local-action-mobile",
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
      "id": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "frameCount": 0,
      "remainingCountSourceCount": 0,
      "remainingCountLabels": [],
      "inlineCompleteControlCount": 0,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": ""
    },
    {
      "id": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "frameCount": 1,
      "remainingCountSourceCount": 1,
      "remainingCountLabels": [
        "1개 대기"
      ],
      "inlineCompleteControlCount": 1,
      "openBeforeCompleteRequired": false,
      "genericMetaChipCount": 0,
      "firstInlineCompleteAccessibleName": "계약서 옵션과 최종 견적 다시 확인하기 완료 체크"
    },
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
  "taskCompleteCheckboxCount": 52,
  "taskCompleteButtonCount": 0,
  "taskCompleteMixedControlCount": 0,
  "subChecklistCheckboxCount": 85,
  "taskCompleteControlPatternEvidence": [
    {
      "id": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "route",
          "accessibleName": "주말 준비 범위 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "39b-url-first-draft-anchor-edit-mobile",
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
      "id": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 2,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "내 일정에 맞춘 첫 단계 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "내 일정에 맞춘 첫 단계 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "47a-draft-empty-my-flow-mobile",
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
      "id": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "47b-draft-empty-calendar-mobile",
      "route": "/calendar",
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
      "id": "47b-draft-empty-calendar-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "48-draft-completed-zero-mobile",
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
      "id": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "pattern": "none",
      "checkboxCount": 0,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [],
      "buttonSamples": []
    },
    {
      "id": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "route",
          "accessibleName": "완료 상태를 확인할 주말 준비 범위 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
    {
      "id": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "pattern": "checkbox",
      "checkboxCount": 2,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "route",
          "accessibleName": "완료 상태를 확인할 주말 준비 범위 정하기 완료 체크",
          "checked": false
        },
        {
          "surface": "route",
          "accessibleName": "완료 상태를 확인할 주말 준비 범위 정하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    },
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
      "id": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 1,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "계약서 옵션과 최종 견적 다시 확인하기 완료 체크",
          "checked": false
        }
      ],
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
      "id": "43b-calendar-grid-flow-stack-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "pattern": "checkbox",
      "checkboxCount": 11,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "eSIM 구매 링크와 사용 가능 기기 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "QR 코드와 설치 안내 메일 저장하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "여권 잔여 유효기간 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "비자 또는 전자여행허가 필요 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "여행경보와 현지 안전 공지 확인하기 완료 체크",
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
      "id": "44b-calendar-grid-flow-stack-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "pattern": "checkbox",
      "checkboxCount": 11,
      "buttonCount": 0,
      "mixedControlCount": 0,
      "subChecklistCheckboxCount": 0,
      "checkboxSamples": [
        {
          "surface": "calendar-selected-day",
          "accessibleName": "eSIM 구매 링크와 사용 가능 기기 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "QR 코드와 설치 안내 메일 저장하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "여권 잔여 유효기간 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "비자 또는 전자여행허가 필요 여부 확인하기 완료 체크",
          "checked": false
        },
        {
          "surface": "calendar-selected-day",
          "accessibleName": "여행경보와 현지 안전 공지 확인하기 완료 체크",
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
  "normalRouteAgendaGroupMetaCount": 15,
  "normalRouteAgendaGroupRepeatedDateMetaRowCount": 0,
  "normalRouteAgendaGroupRepeatedTimingMetaRowCount": 0,
  "calendarMobileAgendaRowCount": 15,
  "calendarMobileAgendaDenseRowCount": 0,
  "calendarMobileAgendaRowDateMetaCount": 0,
  "calendarMobileAgendaRowTimingMetaCount": 0,
  "calendarMobileAgendaRowFlowMetaCount": 0,
  "calendarMobileAgendaRowProgressMetaCount": 0,
  "calendarMobileAgendaOpenLabelRowCount": 15,
  "calendarFlowMarkerCount": 14,
  "calendarDistinctFlowMarkerCount": 4,
  "calendarSameDateDistinctFlowGroupCount": 4,
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
      "id": "43b-calendar-grid-flow-stack-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "selectedDate": "2026-06-03",
      "flowMarkerCount": 4,
      "distinctFlowMarkerCount": 4,
      "selectedDateGridFlowLabels": [
        "해외여행 출국...",
        "일본 eSIM..."
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
    },
    {
      "id": "44b-calendar-grid-flow-stack-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "selectedDate": "2026-06-03",
      "flowMarkerCount": 4,
      "distinctFlowMarkerCount": 4,
      "selectedDateGridFlowLabels": [
        "해외여행 출국...",
        "일본 eSIM..."
      ],
      "agendaGroupByFlow": true
    }
  ],
  "calendarGridSameDateFlowCount": 4,
  "calendarGridVisibleFlowLabelCount": 2,
  "calendarGridDistinctVisibleMarkerIdentityCount": 2,
  "calendarGridOverflowSummaryVisible": true,
  "calendarGridHiddenFlowSummaryCount": 2,
  "calendarGridHorizontalOverflowCount": 0,
  "calendarSelectedDayAgendaShowsAllFlows": true,
  "calendarGridFlowStackEvidence": [
    {
      "id": "43b-calendar-grid-flow-stack-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "selectedDate": "2026-06-03",
      "sameDateFlowCount": 4,
      "visibleFlowLabelCount": 2,
      "visibleMarkerIdentityCount": 2,
      "visibleMarkerIdentities": [
        {
          "initial": "해",
          "key": "overseas-travel-d14"
        },
        {
          "initial": "일",
          "key": "japan-esim-setup-before-departure"
        }
      ],
      "overflowSummaryVisible": true,
      "hiddenFlowSummaryCount": 2,
      "overflowSummaryLabels": [
        "외 2개"
      ],
      "selectedDayAgendaShowsAllFlows": true,
      "noHorizontalOverflow": true
    },
    {
      "id": "44b-calendar-grid-flow-stack-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "selectedDate": "2026-06-03",
      "sameDateFlowCount": 4,
      "visibleFlowLabelCount": 2,
      "visibleMarkerIdentityCount": 2,
      "visibleMarkerIdentities": [
        {
          "initial": "해",
          "key": "overseas-travel-d14"
        },
        {
          "initial": "일",
          "key": "japan-esim-setup-before-departure"
        }
      ],
      "overflowSummaryVisible": true,
      "hiddenFlowSummaryCount": 2,
      "overflowSummaryLabels": [
        "외 2개"
      ],
      "selectedDayAgendaShowsAllFlows": true,
      "noHorizontalOverflow": true
    }
  ],
  "calendarTitleContainsMyFlowCount": 0,
  "calendarPrimaryGenericTypeLabelCount": 0,
  "calendarHeadingDuplicateCount": 0,
  "myFlowPrimaryGenericFlowLabelCount": 0,
  "calendarTaskRoleCopyPresent": true,
  "myFlowTaskRoleCopyPresent": true,
  "calendarMyFlowRoleLabelEvidence": [
    {
      "id": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": [
        "날짜 항목"
      ]
    },
    {
      "id": "47a-draft-empty-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "47b-draft-empty-calendar-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": []
    },
    {
      "id": "47b-draft-empty-calendar-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": []
    },
    {
      "id": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": false,
      "myFlowTaskRoleCopyPresent": true,
      "calendarPrimaryLabels": []
    },
    {
      "id": "13-post-save-my-moving-mobile",
      "route": "/my?savedMap=moving-d30",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
      "myFlowPrimaryGenericFlowLabelCount": 0,
      "myFlowPrimaryGenericFlowLabelHits": [],
      "calendarTaskRoleCopyPresent": true,
      "myFlowTaskRoleCopyPresent": false,
      "calendarPrimaryLabels": [
        "날짜 항목"
      ]
    },
    {
      "id": "43b-calendar-grid-flow-stack-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "id": "44b-calendar-grid-flow-stack-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "calendarTitleContainsMyFlowCount": 0,
      "calendarPrimaryGenericTypeLabelCount": 0,
      "calendarPrimaryGenericTypeLabelHits": [],
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
      "calendarHeadingDuplicateCount": 0,
      "calendarHeadingDuplicateHits": [],
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
  "progressMetricContextLabelCount": 30,
  "rowLevelFlowProgressChipCount": 0,
  "detailChecklistProgressLabelCount": 1,
  "todayRemainingCountVisible": 6,
  "calendarSelectedDayRemainingCountVisible": 2,
  "progressMetricSemanticsEvidence": [
    {
      "id": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 0/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-overview-progress-summary",
          "text": "전체 0/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "39d-url-first-draft-calendar-export-mobile",
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
      "id": "47a-draft-empty-my-flow-mobile",
      "route": "/my",
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
      "id": "47a-draft-empty-my-flow-wide",
      "route": "/my",
      "viewportWidth": 1024,
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
      "id": "47b-draft-empty-calendar-mobile",
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
      "id": "47b-draft-empty-calendar-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
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
      "id": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 3/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-overview-progress-summary",
          "text": "전체 3/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-mobile-structure-progress",
          "text": "전체 2/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "progressMetricAmbiguousCount": 0,
      "progressMetricAmbiguousHits": [],
      "progressMetricContextLabelCount": 1,
      "progressMetricContextLabels": [
        {
          "testId": "my-flow-overview-progress-summary",
          "text": "전체 2/3 완료"
        }
      ],
      "rowLevelFlowProgressChipCount": 0,
      "detailChecklistProgressLabelCount": 0,
      "todayRemainingCountVisible": 0,
      "calendarSelectedDayRemainingCountVisible": 0
    },
    {
      "id": "12b-public-new-car-post-save-my-flow-mobile",
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
      "id": "43b-calendar-grid-flow-stack-mobile",
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
      "id": "44b-calendar-grid-flow-stack-wide",
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
  "urlFirstNormalInputRawIsoExemptCount": 4,
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
    },
    {
      "route": "/flows",
      "state": "candidate",
      "label": "초안 기준일",
      "inputType": "date",
      "value": "2026-07-18",
      "testId": "flow-url-miss-draft-anchor-date",
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
        "앱 안에서 이어가기",
        "직접 손볼 초안으로 시작",
        "내가 쓴 제목과 메모에서 여러 할 일을 제안합니다. 저장 후 My Flow에서 필요한 것만 남기고 날짜와 메모를 고칠 수 있어요.",
        "초안 편집 시작",
        "초안 제목",
        "날짜를 넣으면 캘린더에 첫 할 일이 표시됩니다. 저장 후 My Flow에서 다시 바꿀 수 있습니다.",
        "제안한 할 일",
        "3개 · 저장 후 수정",
        "1",
        "준비 범위 정하기",
        "7월 18일 (토)",
        "2",
        "URL에서 따라 할 순서만 남겨두기",
        "7월 19일 (일)",
        "3",
        "준비 실행 순서를 기준일에 맞춰 나누기",
        "7월 20일 (월)"
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
  "urlFirstMissDraftEntryVisible": true,
  "urlFirstMissDraftEditableItemCount": 3,
  "urlFirstMissDraftSuggestedItemCount": 3,
  "urlFirstMissDraftStepDatesFromAnchor": true,
  "urlFirstMissDraftSavePathVisible": true,
  "urlFirstMissDraftInternalHitCount": 0,
  "urlFirstMissDraftFlowEvidence": [
    {
      "recordId": "30-url-first-candidate-detail-mobile",
      "route": "/flows",
      "state": "candidate",
      "scenarioName": "candidate-detail-expanded",
      "entryVisible": true,
      "editorVisible": true,
      "ctaLabel": "초안 편집 시작",
      "editableItemCount": 3,
      "suggestedItemCount": 3,
      "itemDayOffsets": [
        0,
        1,
        2
      ],
      "draftStepDatesFromAnchor": true,
      "savePathVisible": true,
      "savePathLabel": "내 Flow에 초안 저장",
      "copyLines": [
        "앱 안에서 이어가기",
        "직접 손볼 초안으로 시작",
        "내가 쓴 제목과 메모에서 여러 할 일을 제안합니다. 저장 후 My Flow에서 필요한 것만 남기고 날짜와 메모를 고칠 수 있어요.",
        "초안 편집 시작",
        "초안 제목",
        "날짜를 넣으면 캘린더에 첫 할 일이 표시됩니다. 저장 후 My Flow에서 다시 바꿀 수 있습니다.",
        "제안한 할 일",
        "3개 · 저장 후 수정",
        "1",
        "준비 범위 정하기",
        "7월 18일 (토)",
        "2",
        "URL에서 따라 할 순서만 남겨두기",
        "7월 19일 (일)",
        "3",
        "준비 실행 순서를 기준일에 맞춰 나누기",
        "7월 20일 (월)",
        "내 Flow에 초안 저장",
        "제안 항목은 저장 후 다시 손볼 수 있어요"
      ],
      "impliesLiveAi": false,
      "liveAiLines": [],
      "internalHitCount": 0,
      "internalHits": []
    }
  ],
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
    "기준일 바꾸기",
    "이사일 바꾸기"
  ],
  "myFlowAnchorSettingsOpenLabels": [
    "기준일·이름 바꾸기",
    "이사일·이름 바꾸기"
  ],
  "myFlowAnchorSettingsOpenAccessibleNameSamples": [
    "주말 준비 초안 기준일·이름 바꾸기",
    "완료 상태를 확인할 주말 준비 기준일·이름 바꾸기",
    "이사 준비 이사일·이름 바꾸기"
  ],
  "myFlowAnchorEditEvidence": [
    {
      "recordId": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "주말 준비 초안 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "주말 준비 범위 정하기 제목·날짜·메모 수정"
      ]
    },
    {
      "recordId": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "주말 준비 초안 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": true,
      "anchorEditLabel": "기준일 바꾸기",
      "anchorInputLabel": "기준일",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": true,
      "helpText": "기준일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다. 기준일은 전체 일정 기준이고, 이 할 일 날짜는 해당 할 일만 바꿉니다.",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "주말 준비 초안 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": true,
      "anchorEditLabel": "기준일 바꾸기",
      "anchorInputLabel": "기준일",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": true,
      "helpText": "기준일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다. 기준일은 전체 일정 기준이고, 이 할 일 날짜는 해당 할 일만 바꿉니다.",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": false,
      "anchorSettingsOpenLabels": [],
      "anchorSettingsOpenAccessibleNameSample": [],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "내 일정에 맞춘 첫 단계 제목·날짜·메모 수정"
      ]
    },
    {
      "recordId": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정"
      ]
    },
    {
      "recordId": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 기준일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정",
        "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정"
      ]
    },
    {
      "recordId": "13b-my-moving-personal-anchor-settings-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "이사일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "이사 준비 이사일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": true,
      "anchorEditLabel": "이사일 바꾸기",
      "anchorInputLabel": "이사일",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": true,
      "helpText": "이사일을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다. 이사일은 전체 일정 기준이고, 이 할 일 날짜는 해당 할 일만 바꿉니다.",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "13c-my-moving-personal-step-date-override-mobile",
      "route": "/my?savedMap=curated-ajd-moving-d30",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": true,
      "anchorSettingsOpenLabels": [
        "이사일·이름 바꾸기"
      ],
      "anchorSettingsOpenAccessibleNameSample": [
        "이사 준비 이사일·이름 바꾸기"
      ],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "이 할 일 날짜",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": []
    },
    {
      "recordId": "43-calendar-same-date-multi-flow-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "anchorSettingsOpenVisible": false,
      "anchorSettingsOpenLabels": [],
      "anchorSettingsOpenAccessibleNameSample": [],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "임대차 계약 확정일자 부여 여부 확인하기 제목·날짜·메모 수정"
      ]
    },
    {
      "recordId": "44-calendar-same-date-multi-flow-wide",
      "route": "/calendar",
      "viewportWidth": 1024,
      "anchorSettingsOpenVisible": false,
      "anchorSettingsOpenLabels": [],
      "anchorSettingsOpenAccessibleNameSample": [],
      "anchorEditEntryVisible": false,
      "anchorEditLabel": "",
      "anchorInputLabel": "",
      "itemDateOverrideLabel": "",
      "anchorVsItemOverrideCopyPresent": false,
      "helpText": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "임대차 계약 확정일자 부여 여부 확인하기 제목·날짜·메모 수정"
      ]
    }
  ],
  "itemDateOverrideLabels": [
    "이 할 일 날짜"
  ],
  "anchorVsItemOverrideCopyPresent": true,
  "myFlowItemEditEntryVisible": true,
  "myFlowItemEditAccessibleNameSamples": [
    "주말 준비 범위 정하기 제목·날짜·메모 수정",
    "내 일정에 맞춘 첫 단계 제목·날짜·메모 수정",
    "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정",
    "임대차 계약 확정일자 부여 여부 확인하기 제목·날짜·메모 수정"
  ],
  "editEntryVisibleByViewport": {
    "390": {
      "anchor": 6,
      "item": 4
    },
    "1024": {
      "anchor": 3,
      "item": 2
    }
  },
  "draftFlowMyFlowLandingVisible": true,
  "draftFlowEditEntryVisible": true,
  "draftFlowAnchorEditVisibleByViewport": {
    "390": 4,
    "1024": 3
  },
  "draftFlowItemEditEntryVisible": true,
  "draftFlowAnchorOverrideConflictPolicyVisible": true,
  "draftFlowCalendarProjectionUpdated": true,
  "draftFlowExportProjectionUpdated": true,
  "draftFlowEvidence": [
    {
      "recordId": "39a-url-first-draft-item-edit-entry-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-mobile-structure-row"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "주말 준비 범위 정하기 제목·날짜·메모 수정"
      ],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "39b-url-first-draft-anchor-edit-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-mobile-structure-row"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "기준일 바꾸기",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": [],
      "anchorOverrideConflictPolicyVisible": true,
      "anchorOverrideConflictPolicyText": "기준일을 바꾸면 초안의 전체 일정이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지돼요.",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "39c-url-first-draft-anchor-edit-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-overview-card"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "기준일 바꾸기",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": [],
      "anchorOverrideConflictPolicyVisible": true,
      "anchorOverrideConflictPolicyText": "기준일을 바꾸면 초안의 전체 일정이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지돼요.",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "39d-url-first-draft-calendar-export-mobile",
      "route": "/calendar",
      "viewportWidth": 390,
      "landingVisible": false,
      "rootCount": 0,
      "rootSurfaces": [],
      "editEntryVisible": false,
      "editEntryLabels": [],
      "anchorEditVisible": false,
      "anchorEditLabel": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": [],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": true,
      "exportProjectionUpdated": true,
      "exportSampleLength": 154,
      "exportSampleHash": "efd628cfe34da22a836093c7371a6c4ba08f06a4dd854ab1d87b05879c0f3d18"
    },
    {
      "recordId": "48-draft-completed-zero-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-mobile-structure-row"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": [],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "48-draft-completed-zero-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-overview-card"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "",
      "itemEditEntryVisible": false,
      "itemEditAccessibleNameSample": [],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "49-draft-offline-local-action-mobile",
      "route": "/my",
      "viewportWidth": 390,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-mobile-structure-row"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정"
      ],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    },
    {
      "recordId": "49-draft-offline-local-action-wide",
      "route": "/my",
      "viewportWidth": 1024,
      "landingVisible": true,
      "rootCount": 1,
      "rootSurfaces": [
        "my-flow-overview-card"
      ],
      "editEntryVisible": true,
      "editEntryLabels": [
        "기준일·이름 바꾸기"
      ],
      "anchorEditVisible": true,
      "anchorEditLabel": "",
      "itemEditEntryVisible": true,
      "itemEditAccessibleNameSample": [
        "완료 상태를 확인할 주말 준비 범위 정하기 제목·날짜·메모 수정"
      ],
      "anchorOverrideConflictPolicyVisible": false,
      "anchorOverrideConflictPolicyText": "",
      "calendarProjectionUpdated": false,
      "exportProjectionUpdated": false,
      "exportSampleLength": 0,
      "exportSampleHash": null
    }
  ],
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
  "normalRouteQueueLabelCount": 19,
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
  "publicPreSaveCheckboxCount": 89,
  "publicPreSaveCheckboxCompletionLikeLabelCount": 0,
  "publicPreSaveCheckboxPreviewLabelCount": 89,
  "publicFlowPreSaveItemCheckboxPreviewCount": 89,
  "publicFlowPreSavePreviewControlCount": 121,
  "publicPostSaveCompletionControlVisible": true,
  "publicPostSaveCompletionControlPattern": "checkbox",
  "publicPostSaveCompletionControlActive": true,
  "publicPostSaveCompletionCheckboxCount": 1,
  "publicPostSaveCompletionActiveCheckboxCount": 1,
  "publicPostSaveCompletionButtonCount": 0,
  "publicPostSaveCompletionEvidence": [
    {
      "id": "12b-public-new-car-post-save-my-flow-mobile",
      "route": "/my",
      "originSlug": "new-car-delivery-check",
      "viewportWidth": 390,
      "visible": true,
      "pattern": "checkbox",
      "active": true,
      "checkboxCount": 1,
      "activeCheckboxCount": 1,
      "buttonCount": 0,
      "checkboxSamples": [
        {
          "surface": "my-flow-now-section",
          "accessibleName": "계약서 옵션과 최종 견적 다시 확인하기 완료 체크",
          "checked": false
        }
      ],
      "buttonSamples": []
    }
  ],
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

요청 산출물:
1. P21-01~P21-05 완료/미완료 판정
2. route·persona별 UX 문제
3. Blocking/High/Medium/Low 우선순위
4. 유지해야 할 기준선
5. 실제 AI 도입 go/no-go 판단과 선행 조건
6. 바로 개발 가능한 P22 backlog
7. evidence가 부족한 시나리오
