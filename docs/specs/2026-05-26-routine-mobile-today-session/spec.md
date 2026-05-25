# Routine Mobile Today Session Spec

**Date:** 2026-05-26
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** v0.1.0 Stage 0 First Flag MVP in `docs/ROADMAP.md`

## Goal

Routine Flow mobile pages should open on the next actionable routine session instead of a calendar grid. Desktop can keep the routine calendar as the primary artifact, but mobile should make the first viewport answer what to do or record today.

## Stage Fit

This belongs in Stage 0 because it improves the export-first and check-first loop without adding accounts, native long-term records, direct calendar integration, or new automatic plan generation. The change must stay inside existing routine preview/check/export behavior.

## User Need

As a mobile user opening a routine Flow, I need to see the next routine session and a direct record action first, so that I can act before scanning the full calendar or checklist.

## Scope

In:
- Add mobile-first ordering for routine workbenches: today/next session card before the month calendar.
- Keep desktop routine calendar copy and artifact-near exports available.
- Preserve existing selected weekday and 4-week preview behavior.
- Cover `running-5k-4week`, `home-workout-20min`, `english-study-30day-routine`, `car-care-monthly-routine`, and `real-thankyou-bubu-video-full-body-no-jump`.

Out:
- Full Flow page redesign.
- Replacing the mobile bottom export sheet globally.
- Creating unsupported exercise/study/car-care content.
- Claiming validation or user evidence.
- Direct external app integrations.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | On mobile, review or mark the today/next routine session. |
| Completion signal | The session checkbox or record CTA is visible before the calendar artifact. |
| Artifact destination | Calendar stays `.ics`; session/check records stay exportable through sheet/text paths. |
| Source/risk boundary | No source/risk boundary changes; warnings and source panels remain separate below the workbench. |
| Natural artifact | With start date `2026-06-01` and selected weekdays, the user gets a 4-week routine calendar plus a current session record row. |
| Verification | RED/GREEN Playwright, `npm test`, `npm run build`, `npm run docs:check`, related screenshots. |

## Acceptance Criteria

- At mobile width `390x844`, routine pages show the next-session card before `반복 캘린더 · primary`.
- The first routine card contains a visible next-session record action inside the first viewport.
- Desktop still exposes `반복 캘린더 · primary` and existing calendar/sheet exports.
- No route shows a validation claim.
