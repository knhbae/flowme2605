# ThankyouBUBU Video Reminder Detail Spec

Date: 2026-05-26

## Problem

Repeated workout videos are calendar-first Flows. If a user exports the Flow to a calendar, each event description must be enough to start the workout without returning to FLOW. Earlier work fixed the two former broad-source ThankyouBUBU routes; the ten exact-video routes need the same standard.

## Scope

- Cover all twelve ThankyouBUBU repeated workout video routes in tests.
- Change the generated workout-video detail copy so each route states that the text is intended for calendar reminders.
- Preserve the one-action shape for single workout videos.
- Keep source video links as the authority for movement sequence, posture, and pace.
- Update cleanup backlog status and next action.

## Out Of Scope

- Screen 4 routine setup redesign.
- Automatic session generation.
- Direct external app integrations.
- Login, payment, community, or native long-term FLOW records.
- New source facts or exercise prescriptions.

## Acceptance Criteria

- All twelve ThankyouBUBU repeated workout-video routes have one calendar-first action.
- Each route detail includes `캘린더 알림`, `준비`, `실행`, `원본 영상`, `운동 후 기록`, and a stop/consult condition.
- Calendar export includes the same reminder-ready fields for every covered route.
- The cleanup backlog no longer says the next batch is to audit the ten exact-video routes.
- No route is called validated.
