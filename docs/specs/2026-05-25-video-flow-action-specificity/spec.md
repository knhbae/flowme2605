# Video Flow Action Specificity

Date: 2026-05-25

## Problem

Some video-based Flows preserve the source link but still leave the user asking what to do when the item appears in a calendar, sheet, checklist, or memo. This is especially visible for repeated workout videos and study/video sequences.

Stage 0 needs the exported artifact to carry the next action. FLOW should not require signup or internal record management before the user can act.

## Scope

- Tighten repeated single-video workout Flows so each calendar reminder includes preparation, execution, original video, post-session record, and stop/consult guidance.
- Document the difference between repeated single-video Flows and multi-video sequence Flows.
- Keep exact source fidelity: do not invent movement sequences, study rows, or creator claims that are not in the source.
- Keep visual/UX redesign work Figma-ready, but do not create a Figma file for copy/export-only changes.

## Out Of Scope

- Automatic progress-plan generation.
- Direct integrations with external apps.
- Login, payment, community, or native long-term FLOW records.
- AI-generated creator publishing.
- Redesigning the full Flow detail page in this batch.

## Acceptance Criteria

- Repeated workout video seed content has one calendar-first action that can stand alone in an exported reminder.
- Calendar export includes the same action-specific reminder detail.
- Docs define repeated single-video and multi-video sequence conversion rules.
- No route is described as validated without real user behavior.
