# Claude Design P7 Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. P8-01 generalizes the same guardrails for new seed/source/route additions, P8-02 expands the restart/prototype promotion gate, P8-03/P8-04 fix My Flow overdue labeling/status accuracy, P8-05/P8-06/P8-08 clean up evidence duplication, label-count scope, and commit metadata, P8-07 confirms the `/restart/moving-d30` first-three-row date repetition as an intentional D-30 milestone group rather than a date-distribution bug, P8-09 lowers repeated row-level source links in field checklist workbenches, and P8-10/P9-02 keeps public share browse navigation accessible but after the primary save/input path. This does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

## Baselines Covered

- P7-01: `/restart/moving-d30` uses user-facing date text and a quieter export hierarchy.
- P7-02: My Flow today/overdue/next queues are deduped.
- P7-03: My Flow 5+ saved list bottom clearance is verified.
- P7-04: Home shows a small curated recommendation set, not a single fixed experiment.
- P7-05: Public `/f` browse links remain secondary to `내 Flow에 저장`.
- P7-06/P8-01: Normal route scan buckets stay at zero for internal labels, dynamic source slug leaks, structural title suffixes, raw ISO dates, first-task repetition, and mobile overflow.
- P8-02: Restart/prototype routes must also avoid raw route slugs, English weekday labels, mixed export-language copy, and duplicate export entry points before promotion.
- P8-03/P8-04: My Flow uses `지난 할 일` consistently for overdue work, and past rows in the saved-content list are not labeled as `다음 할 일`.
- P8-05: Restart source/export and true-bottom frames are captured at separate scroll positions and carry screenshot hashes.
- P8-06: My Flow label repetition counters use `my-flow-queue-label-surfaces`, not full page body text.
- P8-07: `/restart/moving-d30` first three visible rows share the same D-30 date because all three source rows are D-30 milestones; full schedule/export rows remain distributed across later dates.
- P8-08: UI baseline commit and package generation commit metadata are separated.
- P8-09: field checklist row details keep execution criteria/details, but repeated row-level source links are suppressed; source access remains available in the source/reference area.
- P8-10/P9-02: public `/f/[slug]` share screens keep `콘텐츠 더 보기` as an accessible secondary link, but place it after the primary save/input path in DOM/tab order.

## Summary

```json
{
  "totalScreenshots": 26,
  "uiBaselineCommit": "958a612",
  "packageGeneratedFromCommit": "958a612",
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
  "publicShareSecondaryBrowseAfterPrimaryCount": 5,
  "publicShareSecondaryBrowseBeforePrimaryCount": 0,
  "publicSharePrimaryPathFocusableCount": 5,
  "publicSharePrimaryPathVisibleCount": 7,
  "restartPrototypeRawIsoHitCount": 0,
  "restartPrototypeRawRouteSlugHitCount": 0,
  "restartPrototypeEnglishWeekdayHitCount": 0,
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
  "restartPrototypeSourceExportScrollY": 2846,
  "restartPrototypeBottomScrollY": 3141,
  "restartPrototypeFirstThreeSameD30Milestone": true,
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

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 01-home-mobile | `/` | Home entry and lightweight recommendations | OK | 0 | 0 | 0 |
| 02-flows-mobile | `/flows` | Flow catalog scan with lightweight CTAs | OK | 0 | 0 | 0 |
| 03-flow-map-moving-top-mobile | `/flow-maps/moving-d30` | Moving map save screen top | OK | 0 | 0 | 0 |
| 04-flow-map-moving-bottom-mobile | `/flow-maps/moving-d30` | Moving map bottom sticky clearance | OK | 0 | 0 | 0 |
| 05-flow-map-math-mobile | `/flow-maps/middle-school-math-1` | Math source-backed map screen | OK | 0 | 0 | 0 |
| 06-public-vehicle-mobile | `/f/vehicle-inspection-prep` | Public share save screen | OK | 0 | 0 | 0 |
| 07-public-moving-mobile | `/f/moving-d30-basic` | Public moving share screen | OK | 0 | 0 | 0 |
| 08-public-moving-bottom-mobile | `/f/moving-d30-basic` | Public moving bottom sticky clearance | OK | 0 | 0 | 0 |
| 09-workbench-fridge-mobile | `/f/fridge-cleanout-weekly-plan` | Fridge workbench active rows | OK | 0 | 0 | 0 |
| 10-workbench-washer-mobile | `/f/washer-tub-clean-monthly` | Washer workbench | OK | 0 | 0 | 0 |
| 11-workbench-new-car-mobile | `/f/new-car-delivery-check` | New car checklist workbench | OK | 0 | 0 | 0 |
| 12-workbench-used-car-mobile | `/f/used-car-buying-check` | Used car checklist workbench | OK | 0 | 0 | 0 |
| 25-workbench-new-car-open-details-mobile | `/f/new-car-delivery-check` | New car checklist row details without repeated source links | OK | 0 | 0 | 0 |
| 26-workbench-used-car-open-details-mobile | `/f/used-car-buying-check` | Used car checklist row details without repeated source links | OK | 0 | 0 | 0 |
| 13-post-save-my-moving-mobile | `/my?savedMap=moving-d30` | Post-save My Flow for moving map | OK | 0 | 0 | 0 |
| 14-calendar-after-moving-save-mobile | `/calendar` | Calendar agenda-first after moving save | OK | 0 | 0 | 0 |
| 15-post-save-my-math-mobile | `/my?savedMap=middle-school-math-1` | Post-save My Flow for undated math content | OK | 0 | 0 | 0 |
| 16-my-multi-queue-mobile | `/my` | My Flow with today overdue next queues | OK | 0 | 0 | 0 |
| 17-my-multi-queue-overdue-sheet-mobile | `/my` | My Flow overdue sheet dedupe evidence | OK | 0 | 0 | 0 |
| 18-my-long-list-top-mobile | `/my` | My Flow 5+ saved list top | OK | 0 | 0 | 0 |
| 19-my-long-list-bottom-mobile | `/my` | My Flow 5+ list bottom before sheet | OK | 0 | 0 | 0 |
| 20-my-long-list-inventory-bottom-mobile | `/my` | My Flow 5+ inventory sheet bottom clearance | OK | 0 | 0 | 0 |
| 21-restart-moving-top-mobile | `/restart/moving-d30` | Restart prototype top with user date format | OK | 0 | 0 | 0 |
| 24-restart-moving-full-schedule-mobile | `/restart/moving-d30` | Restart prototype full schedule date distribution | OK | 0 | 0 | 0 |
| 22-restart-moving-source-export-mobile | `/restart/moving-d30` | Restart prototype source and export hierarchy | OK | 0 | 0 | 0 |
| 23-restart-moving-bottom-mobile | `/restart/moving-d30` | Restart prototype bottom clearance | OK | 0 | 0 | 0 |

## Restart Prototype Bucket

`/restart/moving-d30` remains outside the primary 4-tab IA. It is tracked as a prototype route, but it must still pass the display gate before any future promotion:

- no user-facing raw ISO dates
- no raw route slug such as `restart / moving-d30`
- no English weekday labels such as `Sun Mon Tue`
- no mixed export-language copy such as `export` plus Korean copy
- no duplicated primary export entry labels
- no source brand slug as title/subtitle copy
- no horizontal overflow at 390px

The restart source/export frame and bottom frame must remain distinct:

- source/export scrollY: 2846
- bottom scrollY: 3141
- distinct hash/scroll evidence: yes
- first-three date labels: ["5월 28일 (목) · D-30","5월 28일 (목) · D-30","5월 28일 (목) · D-30"]
- first-three row titles: ["버릴 물건과 대형폐기물 정리","이사 방식과 업체 후보 정하기","이사할 집 하자 사진 남기기"]
- full schedule unique date labels: 5
- full schedule unique offset labels: 5
- date distribution judgment: intentional-d30-milestone-group

## Field Checklist Source Density

- row detail source link count: 0
- source/reference access link count: 5
- open detail counts: [10,15]

## Public Share CTA / Tab Order

- public share route count: 9
- secondary browse focusable count: 9
- secondary browse after-primary count: 5
- secondary browse before-primary count: 0
- primary save/input path focusable count: 5
- primary save/input path visible count: 7
- expected: `콘텐츠 더 보기` remains keyboard/screen-reader reachable as a quiet secondary link, but it should follow `내 Flow에 저장` or the input/setup path.

## Commit Metadata

- UI baseline commit: `958a612`
- Package generated from commit: `958a612`
- Package commit ref: `git commit containing this generated package`

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
