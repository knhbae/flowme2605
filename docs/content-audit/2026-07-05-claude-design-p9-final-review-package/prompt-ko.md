아래 GitHub 소스/문서/screenshot만 보고 FlowMe P9 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

검토 기준:
1. P7-01~P7-05가 실제 화면 기준으로 유지되는지 확인
2. P7-06/P8-01 guardrail 일반화가 충분한지 확인
3. P8-05/P8-06/P8-08의 evidence cleanup이 충분한지 확인
   - /restart source/export frame과 bottom frame이 서로 다른 scroll position/screenshot인지
   - My Flow 반복 라벨 카운터가 실제 queue/section label surface를 세는지
   - UI baseline commit과 package generation metadata가 헷갈리지 않는지
4. 정상 사용자 route에서 아래 회귀가 다시 생길 위험이 있는지 확인
   - seed/source metadata에서 동적으로 추출되는 source slug가 제목/부제/주요 문구로 노출
   - 콘텐츠 제목 끝 Flow 접미
   - 일정 지도, 저장한 지도 같은 내부 구조형 표현
   - raw ISO 날짜
   - My Flow 첫 할 일 제목 반복
   - 모바일 390px 좌우 overflow
   - 하단 fixed/sticky가 마지막 버튼/행/agenda를 가림
5. /restart/moving-d30 prototype bucket을 별도 관리하는 기준이 충분한지 확인
6. P8-09 field checklist workbench source-density guardrail이 충분한지 확인
   - new-car / used-car row detail source link count가 0인지
   - source/reference access link count가 0보다 크게 유지되는지
7. P8-10 public share CTA/tab-order guardrail이 충분한지 확인
   - 공개 /f 저장 전 화면에서 `내 Flow에 저장` 또는 입력/setup path가 primary인지
   - `콘텐츠 더 보기`가 시각적으로도 tab order/accessibility에서도 보조 링크로만 남는지
8. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P9 review package README: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-05-claude-design-p9-final-review-package/README.md
- Audit markdown: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-05-claude-design-p9-final-review-package/audit.md
- Review HTML: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-05-claude-design-p9-final-review-package/review.html
- Route evidence JSON: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-05-claude-design-p9-final-review-package/route-evidence.json
- Screenshots folder: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-05-claude-design-p9-final-review-package/screenshots
- E2E guardrails: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/flow-mvp.spec.ts
- Workbench source density E2E: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/workbench-source-density.spec.ts
- Public share CTA/tab-order E2E: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/tests/e2e/public-share-cta-order.spec.ts

현재 guardrail scan 요약:
```json
{
  "totalScreenshots": 26,
  "uiBaselineCommit": "706b67f",
  "packageGeneratedFromCommit": "706b67f",
  "packageCommitRef": "git commit containing this generated package",
  "normalRouteInternalHitCount": 0,
  "normalRouteSourceSlugHitCount": 0,
  "normalRouteStructuralDisplayHitCount": 0,
  "normalRouteRawIsoHitCount": 0,
  "normalRouteFirstTaskRepetitionHitCount": 0,
  "normalRouteQueueLabelScope": "my-flow-queue-label-surfaces",
  "normalRouteQueueLabelCount": 8,
  "normalRouteLegacyOverdueLabelCount": 0,
  "normalRouteHorizontalOverflowCount": 0,
  "fieldWorkbenchRowDetailSourceLinkCount": 0,
  "fieldWorkbenchSourceAccessLinkCount": 5,
  "fieldWorkbenchOpenDetailCounts": [
    10,
    15
  ],
  "publicShareRouteCount": 9,
  "publicShareSecondaryBrowseFocusableCount": 9,
  "publicShareSecondaryBrowseAfterPrimaryCount": 9,
  "publicShareSecondaryBrowseBeforePrimaryCount": 0,
  "publicSharePrimaryPathFocusableCount": 9,
  "publicSharePrimaryPathVisibleCount": 9,
  "restartPrototypeRawIsoHitCount": 0,
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

8. P9-01~P9-07 마감 기준이 충분한지 확인
   - seed/source 데이터 기반 guardrail coverage가 새 콘텐츠 추가에도 회귀를 잡을 수 있는지
   - source slug punctuation, prototype English UI gate, My Flow structural copy, restart D-30 milestone grouping, guardrail helper unit tests가 충분히 닫혔는지

요청 산출물:
1. route별 UX/UI 문제 목록
2. Blocking/High/Medium/Low 우선순위
3. 바로 개발 가능한 P10 backlog
4. 유지해야 할 기준선
5. 화면별 구체 수정 지시
