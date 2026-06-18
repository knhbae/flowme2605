# School/Dorm Share Packet Pilot Run Pack

**Created:** 2026-06-10  
**Updated:** 2026-06-11  
**Status:** pilot run pack, not observation results  
**HTML view:** [School/Dorm Share Packet Pilot Run Korean HTML](./2026-06-10-school-dorm-share-packet-pilot-run-pack-ko.html)  
**Pilot worksheet:** [School/Dorm Share Packet Pilot Worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet.md)  
**Session log starter:** [School/Dorm Share Packet Session Log Starter](./2026-06-10-school-dorm-share-packet-session-log-starter.md)

This pack turns the current `no signal` evidence board into a concrete 3-session pilot plan. It tells the observer what to prepare, how to run each session, when to stop, and what handoff to write after the sessions.

Current execution gate: do not run a session from this pack until the matching role-labeled slot is `agreed` in the scheduling tracker and the preflight checklist passes. `not invited`, `invited`, `scheduled`, and `not run` are not observation evidence.

It does not record real participant data, create a public route, create platform integration, or claim validation.

## Run Decision

- User need: As a FlowMe reviewer, I need a small run pack for 3 recipient observations, so that the share packet can move from `no signal` to either `friction` or `candidate signal`.
- Content shape: pilot run sheet for internal observation.
- Primary destination: `internal_check`.
- Structure: prep checklist, 3 session slots, stop rules, rollup handoff.
- Action count: 3 observed sessions plus one rollup.
- Playbook: distribution-channel-handoff observation.
- Exceptions: this pack starts observation, but it is not the observation result.
- Risk/source handling: use role labels only and do not store sensitive values.

## Before The Pilot

Prepare these materials:

1. [Recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy.md)
2. [Scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker.md)
3. [Preflight checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist.md)
4. [School/Dorm Prep Share Packet Preview](./2026-06-10-school-dorm-share-packet-preview.md)
5. [Observation Script](./2026-06-10-school-dorm-share-packet-observation-script.md)
6. [Observation Log Template](./2026-06-10-school-dorm-share-packet-observation-log-template.md)
7. [Evidence Board](./2026-06-10-school-dorm-share-packet-evidence-board.md)

Set these defaults:

- Session count: 3 first.
- Roles: one student-like, one parent/guardian-like, one coordinator/group-manager-like if possible.
- Packet shown: `school-dorm-share-packet-v2-2026-06-11-readable-preview` for all sessions.
- Scheduling status before each session: matching role-labeled slot is `agreed`.
- FlowMe explanation before task: no.
- Real sensitive values: never collected.

## Moderator Run Sheet

Use the same sequence for each session.

| Minute | Action | Observer note |
| --- | --- | --- |
| 0-1 | State that this is a comprehension check, not a product test. | Do not explain FlowMe roadmap. |
| 1-3 | Show only the share packet. | Do not explain labels first. |
| 3-5 | Ask first action question. | Look for latest official notice priority. |
| 5-8 | Ask four label-choice situations. | Mark pass/fail/unclear only. |
| 8-10 | Ask channel choice. | Watch for account-connection expectations. |
| 10-12 | Ask no-store values. | Do not write actual private values. |
| 12-13 | Ask automation boundary question. | Look for manual-copy understanding. |
| 13-15 | Fill session decision and confusion notes. | Use `pass`, `revise copy`, `rerun`, or `discard signal`. |

## Session Slots

### Session 01

- Target role: student-like recipient
- Channel assumption: KakaoTalk or memo
- Required record: log template session section
- Stop if: participant expects FlowMe to find room/password/key information

### Session 02

- Target role: parent/guardian-like recipient
- Channel assumption: KakaoTalk or Naver Cafe
- Required record: log template session section
- Stop if: participant tries to post health, payment, student identity, or resident identity values

### Session 03

- Target role: coordinator/group-manager-like recipient
- Channel assumption: Naver Cafe, form/sheet, or memo
- Required record: log template session section
- Stop if: participant expects FlowMe to post, collect replies, store contacts, or manage members automatically

## Stop Rules

Stop the pilot and revise the packet before more sessions if any of these happen twice:

- `공지 확인 완료` means all tasks are done.
- `당일 절차 확인 필요` means FlowMe will find room/password/key information.
- Participants try to upload or record health, payment, student identity, resident identity, room, channel, invite, form edit, or webhook values.
- Participants think FlowMe sends, posts, collects replies, stores contacts, or tracks channels.
- Participants cannot tell that latest school/dorm notice overrides the packet.

## Rollup Handoff

After three completed usable sessions, write one rollup:

```md
## Pilot Rollup

- Sessions run:
- Roles covered:
- Packet version: school-dorm-share-packet-v2-2026-06-11-readable-preview
- Overall decision: no signal / friction / candidate signal
- Main evidence:
- Main confusion:
- Copy changes needed:
- Next action:
```

Decision guide:

- `no signal`: fewer than 3 completed usable sessions or inconsistent setup.
- `friction`: sessions were usable but confusion remains.
- `candidate signal`: all three sessions pass label, latest-notice, no-store, and manual-copy checks.

## Connected Documents

- [Pilot Worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet.md)
- [Recruiting Copy](./2026-06-11-school-dorm-share-packet-recruiting-copy.md)
- [Scheduling Tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker.md)
- [Preflight Checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist.md)
- [Session Log Starter](./2026-06-10-school-dorm-share-packet-session-log-starter.md)
- [Evidence Board](./2026-06-10-school-dorm-share-packet-evidence-board.md)
- [Observation Log Template](./2026-06-10-school-dorm-share-packet-observation-log-template.md)
- [Observation Script](./2026-06-10-school-dorm-share-packet-observation-script.md)
- [Share Packet Preview](./2026-06-10-school-dorm-share-packet-preview.md)

## FLOW UX Review

Findings:

1. [High] Evidence boundary: this pack must not be mistaken for observed evidence.
2. [High] Safety: stop rules protect health, payment, identity, room, and channel values.
3. [Medium] Journey: the run sheet makes the next action concrete enough for an observer to execute.
4. [Medium] Cognitive load: 3 sessions are enough for first signal without overbuilding a research program.

Rubric:

- User Need Fit: 5
- Execution Clarity: 5
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 5
- Copy Specificity: 5
- Source/Safety: 5
- Accessibility/Operability: 4
