# Video Flow Action Specificity Audit

Date: 2026-05-25

## Trigger

The current video Flows can preserve a source link while still failing the user question: "When this item appears in my calendar, sheet, checklist, or memo, what exactly do I do now?"

This audit follows the export-first Stage 0 direction and the current external review synthesis. The deciding standard is user core-scenario fit: FLOW must help the user move outside content into an external artifact they can act on without signup.

## Final Judgment

- Repeated single-video workout Flow: needs one compact action, but that action must export as a standalone calendar reminder with preparation, execution, source link, record cue, and stop/consult condition.
- Multi-video study or tutorial sequence: needs source-derived rows or items per video/lesson/stage, usually as a sheet or hybrid artifact, not one vague "study" action.
- Page UI can stay visually compact, but export payloads cannot depend on hidden context.
- No video route is validated without observed user behavior.

## Blocking / High / Medium / Low Issues

- Blocking: none in this batch; the affected routes stay below representative/public-MVP/validated framing.
- High: repeated video calendar exports were not guaranteed to carry action-specific reminder detail.
- Medium: conversion rules did not explicitly split repeated single-video Flow behavior from multi-video sequence behavior.
- Low: future visual review should use Figma when layout density or hierarchy changes are proposed.

## Repeated Common Problems

- Source links alone are not execution guidance.
- Generic item wording breaks when copied into calendar alarms.
- A video Flow's natural artifact differs by source shape: repeated workout videos are not the same as sequential study playlists.
- UI simplification must not remove the details that make exports executable.

## Small Fix In This Batch

- `real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine` now keep one calendar-first action but include reminder-ready preparation, execution, source-video, post-workout record, and stop/consult guidance.
- Calendar export tests now assert that repeated workout reminders remain executable after export.
- Conversion docs now distinguish repeated single-video calendar Flows from multi-video sequence Flows.

## Larger Work Excluded

- Automatic study plan generation from videos.
- Direct calendar, Notion, Excel, or todo app integration.
- Full Flow detail page redesign.
- Native long-term workout or study records.
- Login, payment, community, or AI publishing.

## Figma Use

Figma should be used for future UX/UI batches that change screen layout, mobile density, component hierarchy, or artifact placement. This batch changed content/export behavior and rules only, so no Figma file was created.
