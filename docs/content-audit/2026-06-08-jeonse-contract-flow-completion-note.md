# 2026-06-08 Jeonse Contract Flow Completion Note

## Purpose

`jeonse-contract-precheck-docs` is the first completed representative sample for checking whether online Korean content can become an executable Flow.

The goal is not to validate user behavior yet. The goal is source-to-Flow QA:

- Can a user start from an external source and save a light execution artifact?
- Does the public screen show what survived from the source without review-only explanation?
- Can the artifact be used through calendar/checklist/memo/URL surfaces without making FLOW a legal or document-storage app?

## Applied Principles

- User need first: a renter preparing for a jeonse contract needs a short date-based check path before signing, on the contract day, and after move-in.
- Destination before layout: primary destination is hybrid, led by calendar dates and supported by checklist, memo, and source URL.
- Minimum complexity: the setup asks only for contract date. The undecided/example path remains available.
- Source shape preserved: the source's before-contract, contract-day, and after-contract cues become D-3, D-Day, and D+1 items.
- Details move down: long why/how/caution/source details stay in memo/detail/URL surfaces, not the first screen.
- Risk separation: FLOW does not decide contract safety, legal validity, insurance eligibility, or whether the user should sign.
- User screen and review screen separated: the public route hides the shared source/review/warning cards and old item-card stack.

## Public Route Behavior

- Route: `/f/jeonse-contract-precheck-docs`
- First setup: compact contract date input with `날짜 미정` and `예시 보기` as secondary choices.
- Main workbench: `contract date -> 일정 보기 -> selected date detail -> calendar save`.
- `일정 보기`: three generated dates first, then the selected day's checklist and caution/link details.
- Each generated date shows completion progress, so the user can keep using the Flow after the date has passed instead of treating it as a one-time calendar export.
- Past incomplete dates use a light `지난 일정 · 확인 필요` state. Completed dates use `확인 완료`.
- Selected date detail includes a collapsed `보류 사유 남기기` memo. This keeps the first screen calendar-simple while supporting FlowMe users who actively check and manage the contract path.
- `전체 보기`: a separate tab for all 7 check items grouped by D-3, D-Day, and D+1.
- `전체 보기` also shows group-level progress, making it the management tab rather than another explanation block.
- `캘린더 미리보기`: a collapsed helper under schedule view that shows where the 3 saved dates land in the month.
- Calendar action copy: `캘린더에 넣기`, keeping the destination clear without making the calendar grid the main object.
- Hidden from public route: `ArtifactPreview`, `flow-item-card`, `flow-source-card`, `flow-warning-card`, and review-only conversion copy.
- Also hidden on this representative route: the generic public search affordance, generic browser-storage notice, and copy/draft helper buttons under the full checklist.

## Source-To-Artifact Trace

| Source cue | Flow artifact |
|---|---|
| 계약 전 시세와 등기부등본 확인 | D-3 calendar/checklist item |
| 전세보증보험 가능 여부 확인 | D-3 and D+1 check item with caution in memo |
| 중개사와 표준계약서 확인 | D-Day checklist item |
| 계약서 정보 일치 확인 | D-Day checklist item, with sensitive data excluded |
| 계약 후 보호 절차 | D+1 확정일자/임대차신고 and 보증보험 follow-up |
| 이상 항목 발견 | 보류 사유 and 문의 대상 memo, not a contract decision |

## Rubric Note

- User need fit: 4
- Execution clarity: 4
- Content fidelity: 4
- Portability: 4
- Cognitive load: 4
- Copy specificity: 4
- Source/safety separation: 4
- Accessibility/operability: 4

Lowest remaining risk:

- This is still source-to-Flow QA evidence, not actual user validation.
- The static HTML preview and public route are review artifacts, while the public route remains the authoritative user screen.
- Calendar-only users may still stop after export. That is acceptable for this sample as long as FlowMe users can continue with check/progress/memo without heavier setup.

## Verification Evidence

- Current screenshots:
  - `output/playwright/jeonse-contract-final-desktop.png`
  - `output/playwright/jeonse-contract-final-mobile.png`
- File review artifact:
  - `docs/content-audit/2026-06-08-jeonse-contract-public-cleanup-review.html`
- Previous static preview:
  - `docs/content-audit/2026-06-08-jeonse-contract-precheck-flow-preview.html`

## Next Step

After this sample, do not add another housing/legal/checklist variant first. Move to a different category representative, preferably `elementary-school-entry-d30`, to test whether the same source-to-Flow rules work for a parent/life-transition calendar.
