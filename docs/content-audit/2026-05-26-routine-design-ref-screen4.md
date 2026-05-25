# Routine Design Reference Screen 4 Audit

Date: 2026-05-26

## Inputs

- Local visual reference: `design-ref/260526`
- Applied reference principles:
  - First viewport should show first action plus natural artifact.
  - Routine structure maps to repeated calendar sessions plus session memo.
  - Export buttons should be destination/action labels inside the artifact card.
  - Mobile should keep the primary artifact understandable before secondary content.

## Final Judgment

`running-5k-4week`, promoted routine samples, and the ThankyouBUBU exact workout-video route now better match the Stage 0 export-first scenario. The first routine artifact is no longer framed as a generic preview; it is a 4-week repeated calendar with session count, calendar export, sheet backup, and per-session memo.

## Issues Addressed

- High: Routine pages did not clearly say what the user gets in their calendar. Fixed by naming the artifact `반복 캘린더 · primary` and `4주 반복 캘린더`.
- High: Exact workout videos still looked like a weekly preview instead of a repeated video routine. Fixed by showing `4주 12회차 미리보기`.
- Medium: Artifact export labels were generic for routine calendars. Fixed routine-specific labels to `캘린더에 넣기 · .ics` and `시트로 받기 · .xlsx`.
- Medium: The secondary routine panel used abstract labels. Fixed to `회차 메모 · secondary` and `다음 회차 메모`.

## Kept Out Of Scope

- Automatic routine generation beyond the existing selected weekday preview.
- Direct Google/Apple calendar integration.
- Native long-term FLOW record management.
- New exercise details not present in the source video.
- Broad redesign of the global sticky mobile export bar.

## Screenshots

- [Running routine desktop](../screenshots/2026-05-26-routine-design-ref-running-desktop.png)
- [Running routine mobile](../screenshots/2026-05-26-routine-design-ref-running-mobile.png)
- [ThankyouBUBU exact video desktop](../screenshots/2026-05-26-routine-design-ref-thankyou-video-desktop.png)
- [ThankyouBUBU exact video mobile](../screenshots/2026-05-26-routine-design-ref-thankyou-video-mobile.png)

## Figma Note

No new Figma file was created in this batch. The installed Figma UX/UI rules were applied by treating `design-ref/260526` as the approved design source for layout language, artifact naming, and export CTA hierarchy.
