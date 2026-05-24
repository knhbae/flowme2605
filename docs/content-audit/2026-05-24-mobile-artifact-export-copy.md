# Mobile Artifact Export Copy Audit

**Date:** 2026-05-24
**Scope:** mobile sticky export and bottom sheet copy

## Findings

1. **Medium / Copy specificity:** Mobile still used `내보내기와 백업`, `텍스트로 복사`, and `캘린더 파일 받기` after artifact-card exports landed. This made mobile feel like a separate backup feature instead of the same natural artifact flow.
2. **Low / Cognitive load:** The sticky bar correctly stayed compact, but the action label `내보내기` was broader than the user's actual goal.

## Natural Artifact Simulation

Route: `moving-d30-basic`

User input:

- `이사일=2026-07-15`
- checked `이사 방식 정하기`
- user scrolls after reviewing the list.

Expected artifact behavior:

- The sticky bar shows progress and one shortcut.
- The sheet gathers the same artifacts: checklist copy, Excel, calendar, editable draft.

Current Flow/UX gap before this batch:

- The sheet copy still framed the feature as backup, while the rest of the UI had moved to artifact-specific actions.

Content/UX reinforcement:

- Use `산출물 받기` for the sheet and sticky action.
- Use `체크리스트 복사`, `엑셀로 받기`, `캘린더 받기`, and `내 버전` to match workbench cards.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

## Recommended Next Fixes

1. Review whether the sticky sheet should remain on all routes after more artifact-card usage data.
2. Add route-specific helper copy only if users confuse checklist copy with Excel export.

