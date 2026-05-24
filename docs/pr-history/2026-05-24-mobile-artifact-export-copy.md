# Mobile Artifact Export Copy PR History

**Date:** 2026-05-24
**Branch:** `codex/mobile-artifact-export-copy`
**PR:** Pending
**Status:** In progress
**Related spec:** [2026-05-24-mobile-artifact-export-copy](../specs/2026-05-24-mobile-artifact-export-copy/spec.md)
**Related audit:** [mobile artifact export copy](../content-audit/2026-05-24-mobile-artifact-export-copy.md)

## Why

PR #39 moved desktop and workbench exports into artifact cards. The mobile sticky sheet was intentionally preserved for thumb reach, but its labels still used generic backup language. This batch aligns mobile copy with the same artifact-first language without changing behavior.

## What Changed

- Renamed mobile sticky action from `내보내기` to `산출물 받기`.
- Renamed mobile sheet heading to `산출물 받기`.
- Replaced backup-oriented sheet copy with artifact shortcut copy.
- Aligned sheet buttons with card labels: `체크리스트 복사`, `엑셀로 받기`, `캘린더 받기`, `내 버전`.

## Not Done

- Did not remove the mobile sticky sheet.
- Did not change export handlers or file outputs.
- Did not change desktop UI.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile export actions open from a bottom sheet"` failed while the sticky action was still `내보내기`.
- GREEN: `npm run build` passed.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile export actions open from a bottom sheet"` passed.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 193 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 46 tests.
- Screenshot: [mobile bottom sheet](../screenshots/2026-05-24-mobile-artifact-export-copy-sheet.png)

## Risks

- `산출물 받기` is more artifact-specific, but may still need user testing against `내 도구로 받기` or `파일 받기`.
- Keeping the bottom sheet means mobile still has both card-level export controls and a sticky shortcut.
