# P24 Remaining Goals

## P24-00OPS2 Controlled Dependency Upgrade

**Status:** completed on the isolated Next `15.5.20` dependency set. Evidence: [P24-00OPS2](../2026-07-14-p24-00ops2-controlled-dependency-upgrade-evidence/README.md).

**Goal:** 실제 사용자에게 전달할 production baseline의 known high dependency advisory를 `0`으로 낮춘다.

**Scope:**

- Next `15.3.8 -> 15.5.20`
- Playwright `1.52.0 -> 1.61.1`
- PostCSS `8.5.3 -> 8.5.16`
- package/lockfile and only compatibility changes required by those versions
- ExcelJS moderate advisories are separately assessed; unsafe forced downgrade is prohibited

**Steps:**

1. clean `origin/main` branch and rollback commit record;
2. exact dependency update with lockfile;
3. audit before/after JSON;
4. docs, 514+ unit, build;
5. P24/URL-first/public/workbench E2E at one worker;
6. full E2E in serial or bounded shards;
7. 390px/1024px smoke for Home, Flow finding, My Flow, Calendar and public `/f`;
8. Vercel preview, anonymous production after merge;
9. separate commit, PR, rollback notes.

**Done when:** high `0`, no product behavior regression, build/E2E pass, production alias points to the merged SHA.

## P24-00B1 Two-Person First-Session Pilot

**Goal:** two real participants use the public app without interface explanation and validate the script before scaling.

**Participants:** one anchor-date persona and one personal-draft or undated-checklist persona.

**Tasks:** home entry, save, first edit, Calendar check, one completion and undo, whole/selected export prediction.

**Evidence:** consent state, participant ID, task outcome, first-action time, wrong turns, hint count, exact quotes, screenshot/video reference where consented.

**Adjustment rule:**

- stop immediately for data loss, wrong date, wrong export scope or inaccessible production;
- fix a blocker before recruiting the remaining cohort;
- do not redesign from one preference comment;
- count the sessions only if they were genuinely observed.

**Done when:** `2 / 15` valid sessions and the moderator script is either retained or revised with reasons.

## P24-00B2 Complete First-Use Cohort

**Goal:** the remaining three personas complete session 1 and establish five-user first-use evidence.

**Personas:** recurrence routine, public share/reuse, and whichever of draft/undated was not used in the pilot.

**Focus:** first action, copy density, Today/All role, unscheduled discovery, recurrence occurrence understanding, preview versus completion.

**Done when:** `5 / 15` valid sessions, repeated findings are counted, and no unresolved Blocking issue remains.

## P24-00B3 Return and Reuse Sessions

**Goal:** the same five participants return twice so persistence and reuse are tested rather than inferred.

**Session 2:** edit title/date/memo, date movement scope, completion/reopen, item note, Calendar projection.

**Session 3:** whole/selected/current export, completion review, private versus correction note, new run reuse, prior history.

**Done when:** `15 / 15` valid sessions, all session records link to evidence, and each persona has a three-session journey result.

## P24-00C1 Keep / Change / Defer

**Goal:** turn observations into decisions without averaging away trust failures.

**Rules:**

- any wrong date/data loss/wrong export is Blocking regardless of average success;
- two or more participants at the same point creates a High discovery issue;
- preference-only comments with successful task completion remain Medium/Low hypotheses;
- untouched features are not called validated.

**Done when:** Today/All, completion undo, progressive editor, unscheduled tray, export scope, date movement and item notes each have keep/change/defer status.

## P24-00C2 Observed Fixes

**Goal:** implement only confirmed Blocking and High findings, one state contract or user action per slice.

**Required per slice:** detailed goal, current evidence, Claude/reference comparison, UI implementation, accessibility, mobile/wide screenshots, unit/E2E/build, PR/deploy and rollback.

**Done when:** all Blocking findings are closed and every High item is fixed or explicitly deferred with a documented tradeoff.

## P24-00C3 Final Closeout

**Goal:** prove the merged production baseline satisfies every P24 completion requirement.

**Required:** completion matrix, 15-session scorecard, final screenshots, dependency audit, docs/unit/build/full E2E, public production smoke, status/roadmap/decisions/backlog sync, final Claude Design comparison.

**Done when:** no missing evidence, no open Blocking item, production is public, P24 is marked complete, and the next version backlog is based on observed evidence.
