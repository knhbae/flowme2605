# ThankyouBUBU Video Reminder Detail Audit

Date: 2026-05-26

## Trigger

After the export-first redesign batch, the next highest-risk gap was Screen 4 routine/video behavior: repeated workout video Flows must tell the user what to do when a calendar reminder appears. Earlier cleanup covered the two former broad-source ThankyouBUBU routes, but the ten exact-video routes still needed the same reminder-ready standard.

## Scope

- `real-thankyou-bubu-video-full-body-no-jump`
- `real-thankyou-bubu-video-daily-stretch-9min`
- `real-thankyou-bubu-video-belly-side-all-in-one`
- `real-thankyou-bubu-video-no-knee-cardio-strength`
- `real-thankyou-bubu-video-arm-back-shoulder`
- `real-thankyou-bubu-video-waist-8cm`
- `real-thankyou-bubu-video-8min-cardio`
- `real-thankyou-bubu-video-3min-arm`
- `real-thankyou-bubu-video-3min-abs`
- `real-thankyou-bubu-video-lower-belly-8min`
- Regression coverage retained for `real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine`.

## Conversion Decision

- User need: As a user scheduling a creator workout video repeatedly, I need each reminder to say how to start, what to open, what to record, and when to stop, so that I can act from my calendar without reopening FLOW.
- Content shape: repeated single workout video.
- Primary destination: calendar.
- Structure: one routine action per source video.
- Action count: one action.
- Playbook: Single Fitness Video, repeated single-video calendar rule.
- Exceptions: no movement sequence is invented; detailed posture, pace, and sequence stay in the original YouTube video.
- Risk/source handling: source video link remains creator experience; stop/consult guidance remains caution text.

## Issues Addressed

- High: the ten exact-video routes had preparation, execution, source link, and record fields, but did not explicitly say that this text should travel with every calendar reminder.
- Medium: export tests only protected the two former broad-source routes, so regressions on the ten exact-video routes could slip through.
- Medium: the UX cleanup backlog still pointed to the already-started ThankyouBUBU audit instead of the next Screen 4 routine setup UX problem.

## Fixes

- Added `캘린더 알림` guidance to the generated ThankyouBUBU workout-video detail text.
- Expanded seed and calendar export tests to cover all twelve ThankyouBUBU repeated workout video routes.
- Updated the cleanup backlog next action toward Screen 4 routine setup, while keeping the route family unvalidated.

## Excluded

- No start-date/weekday/session-count UI redesign.
- No automatic 12-session generation.
- No direct calendar integration beyond existing export.
- No invented movement sequence, intensity prescription, or outcome claim.
- No validation claim.

## Figma

Figma was considered because the user asked to use it for UX/UI work. This batch changed content/export behavior only and used no Figma artifact. Use Figma for the next Screen 4 layout batch where start date, weekdays, session count, and mobile routine setup need a shared visual design.
