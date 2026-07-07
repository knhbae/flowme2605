아래 GitHub 소스/문서/screenshot만 보고 FlowMe P12 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

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
10. /restart/moving-d30 prototype bucket을 별도 관리하는 기준이 충분한지 확인
11. P8-09 field checklist workbench source-density guardrail이 충분한지 확인
   - new-car / used-car row detail source link count가 0인지
   - source/reference access link count가 0보다 크게 유지되는지
12. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P12 review package README: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-p12-final-review-package/README.md
- Audit markdown: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-p12-final-review-package/audit.md
- Review HTML: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-p12-final-review-package/review.html
- Route evidence JSON: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-p12-final-review-package/route-evidence.json
- Screenshots folder: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-p12-final-review-package/screenshots
- E2E guardrails: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/flow-mvp.spec.ts
- Workbench source density E2E: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/workbench-source-density.spec.ts
- Public share CTA/tab-order E2E: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/public-share-cta-order.spec.ts

현재 guardrail scan 요약:
```json
{
  "totalScreenshots": 31,
  "uiBaselineCommit": "fc222df",
  "packageGeneratedFromCommit": "fc222df",
  "packageCommitRef": "git commit containing this generated package",
  "normalRouteInternalHitCount": 0,
  "normalRouteSourceSlugHitCount": 0,
  "normalRouteStructuralDisplayHitCount": 0,
  "normalRouteRawIsoHitCount": 0,
  "normalRouteInputRawIsoHitCount": 0,
  "normalRouteInputRawIsoExemptCount": 4,
  "normalRouteFirstTaskRepetitionHitCount": 0,
  "normalRouteContinuationActionableCount": 4,
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
  "flowLabPrototypeRouteCount": 1,
  "flowLabPrototypeBucket": true,
  "flowLabPrototypeGuardrailHitCount": 1,
  "flowLabPrototypeNoindex": true,
  "flowLabPrototypeMetaRobots": [
    {
      "route": "/flow-lab/url-first-p0",
      "metaRobots": "noindex, nofollow"
    }
  ],
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
  "publicWorkbenchStickyFirstActionNonPrimaryLabels": [],
  "publicShareRouteCount": 9,
  "publicShareSecondaryBrowseFocusableCount": 9,
  "publicShareSecondaryBrowseAfterPrimaryCount": 9,
  "publicShareSecondaryBrowseBeforePrimaryCount": 0,
  "publicSharePrimaryPathFocusableCount": 9,
  "publicSharePrimaryPathVisibleCount": 9,
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
3. 바로 개발 가능한 P13 backlog
4. 유지해야 할 기준선
5. 화면별 구체 수정 지시
6. evidence가 부족한 시나리오
