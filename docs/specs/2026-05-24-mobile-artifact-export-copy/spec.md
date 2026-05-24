# Mobile Artifact Export Copy Spec

**Date:** 2026-05-24
**Branch:** `codex/mobile-artifact-export-copy`
**Status:** Landed in PR #40

## Goal

Keep the mobile sticky export affordance, but make its language match the artifact-specific export direction from PR #39.

The mobile sheet should not feel like a separate backup feature. It should read as a thumb-reachable shortcut to the same natural artifacts shown in the workbench cards.

## User Simulation

### Moving Timeline Flow

User input:

- `이사일=2026-07-15`
- Checks `이사 방식 정하기`
- Scrolls near the bottom after reviewing tasks.

Expected mobile behavior:

- Sticky bar stays compact: progress plus one action.
- Main action says `산출물 받기`, not generic `내보내기`.
- Bottom sheet heading says `산출물 받기`.
- Buttons match artifact-card labels: `체크리스트 복사`, `엑셀로 받기`, `캘린더 받기`, `내 버전`.

## Scope

- Rename mobile sticky export action.
- Rename mobile sheet heading and explanatory copy.
- Align mobile sheet button labels with artifact subcard labels.
- Preserve all handlers, export files, disabled state, and bottom sheet behavior.

## Non-goals

- No removal of the mobile sticky sheet.
- No export format change.
- No desktop UI change.
- No route status change.

