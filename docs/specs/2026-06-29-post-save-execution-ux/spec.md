# Post-save Execution UX Spec

**Date:** 2026-06-29
**Status:** Proposed
**Owner:** Codex agent, pending user review
**Related roadmap:** Not yet on roadmap; current Stage 0 UX planning workstream.

## Goal

Keep the 4-tab service IA, but redesign the post-save execution path before implementation so users can understand today work, next work, dated calendar work, and Flow structure without seeing review-oriented or project-management-heavy surfaces.

## Stage Fit

This belongs in Stage 0 because saved execution is the return loop after a user saves or exports a Flow. The work must not become a full productivity suite, project-management board, account system, or direct third-party calendar integration. It should stay near calendar, reminder, and to-do app complexity.

## User Need

As a user who saved a source-backed Flow, I need to see what to do today, what comes next, and where the full Flow lives, so that I can continue execution without rereading the original content.

## Scope

In:
- Planning the `내 Flow` today/next execution structure.
- Planning the global `캘린더` selected-date structure.
- Planning the public Flow detail save CTA and preview boundary.
- Planning the `Flow 찾기` card labels and card-shell consistency.
- Producing Korean planning and clickable wireframe HTML artifacts for user review before code changes.

Out:
- Full visual redesign of Home.
- Usage stats, reviews, creator trust signals, or recommendation systems.
- Account-backed publish, server persistence, direct Google Calendar/Todo/Sheet integrations.
- Save-before-edit bulk Step/Item customization.
- Production validation claims without user behavior data.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | From a public Flow detail, enter the minimal anchor if needed, then save. After saving, open the first Step or inspect the full Flow. |
| Completion signal | The saved user can identify today work, next work, and the relevant calendar date without guessing where to go. |
| Artifact destination | Dated Step rows go to `캘린더`; saved structure, Step detail, memo, source, and regenerated exports stay in `내 Flow`. |
| Source/risk boundary | Public/user screens show source links and cautions inside Step detail; creator/source-row review stays out of user execution screens. |
| Natural artifact | A moving D-30 Flow becomes dated calendar Steps with Item text fallback; a progress map can stay date-less until individual Steps are scheduled. |
| Verification | Korean planning HTML and clickable wireframe review first; after approval, targeted E2E, mobile screenshots, `npm run docs:check`, `npm test`, `npm run build`, and preview deploy. |

## Acceptance Criteria

- A planning HTML explains the current problems, user journey, information structure, and proposed screen frames before implementation.
- A clickable wireframe lets the reviewer move through Flow finding, public detail, saved state, My Flow, Calendar, and Flow view before implementation.
- `내 Flow` design distinguishes `오늘` from `다음` work.
- Step base cards show only compact calendar/todo-level information.
- Step detail contains Item/checklist, memo, source URL, completion, caution, and edit/export controls only after opening.
- Global `캘린더` design keeps selected-date items close to the calendar interaction on mobile.
- Public Flow detail design separates save preview from save CTA and proposes a mobile sticky save action.
- `Flow 찾기` user labels avoid AI/internal-sounding copy such as `바로 실행 Flow` when a simpler label works.
