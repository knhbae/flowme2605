# ThankyouBUBU Source Replacement Spec

Date: 2026-05-25

## Goal

Replace the two remaining ThankyouBUBU real-source routes that still use the creator channel page with exact original video sources.

## User Story

As a FLOW editor, I need workout routes to identify the exact original video, so users are not asked to choose a source before they can act.

## In Scope

- Replace `real-thankyou-bubu-home-workout-starter` channel source with one exact ThankyouBUBU video.
- Replace `real-thankyou-bubu-20min-routine` channel source with one exact ThankyouBUBU video.
- Keep both routes out of representative/public-MVP/validated language.
- Update source-fit guard counts from 7 broad real sources to 5.
- Update natural-artifact audit records, Content Lab tests, Flow Lab E2E expectations, status, PR history, and content audit docs.

## Out Of Scope

- Automatic source discovery.
- Movement-sequence extraction from video.
- New public exposure.
- Direct YouTube integration.
- Native FLOW workout record storage.
- Validation claims.

## Acceptance Criteria

- Both ThankyouBUBU routes have `source_precision: exact`.
- Both routes use exact YouTube watch URLs as `source_url`.
- All item detail links for those routes preserve the exact source URL.
- Natural-artifact audit decisions are `reshape_content_or_ux`, not representative or validated.
- Content Lab broad real-source guard reports 5 routes and 0 representative leaks.
- Flow Lab broad-source panel E2E expects the updated count.
