# 2026-06-11 School/Dorm Share Packet Rollup Template

**Status:** blank rollup template, `not run`, not observation evidence  
**HTML view:** [School/Dorm Share Packet Rollup Template Korean HTML](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html)

This template is used after the `school-or-dorm-prep-share-packet` pilot has at least 3 completed usable recipient sessions. It turns session notes into one decision: `no signal`, `friction`, or `candidate signal`.

It must not be filled before real sessions exist. A blank rollup is not evidence.
Do not start the evidence board update from this template until all 3 sessions are completed and usable.

## Inputs Required

- Same packet version used across sessions: `school-dorm-share-packet-v2-2026-06-11-readable-preview` for the first run.
- At least 3 completed usable recipient sessions.
- Role labels only, not names.
- Session notes from the pilot worksheet or session log starter.
- No health, payment, identity, room, channel, invite, form edit, webhook, contact, or chat-log values.

## Session Summary

| Session | Role label | Usable? | First action | Four labels | Latest notice | No-store boundary | Manual-copy boundary | Main confusion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | student-like | not run | not run | not run | not run | not run | not run |  |
| 02 | parent/guardian-like | not run | not run | not run | not run | not run | not run |  |
| 03 | coordinator/group-manager-like | not run | not run | not run | not run | not run | not run |  |

Allowed cell values: `pass`, `fail`, `unclear`, `not run`.

## Decision Rules

Choose exactly one.

| Decision | Use when | Next action |
| --- | --- | --- |
| `no signal` | Fewer than 3 completed usable sessions exist, setup was inconsistent, or notes are too vague. | Run or rerun sessions before changing product status. |
| `friction` | Sessions exist but label, latest-notice, no-store, manual-copy, or mobile-readability confusion remains. | Revise packet copy and rerun the pilot. |
| `candidate signal` | 3 first-run sessions pass label comprehension, latest-notice priority, no-store boundary, and manual-copy boundary. | Prepare a `/content-flows` review candidate only. Do not create a public route. |

## Forbidden Conclusions

Do not write:

- `validated`
- `public route ready`
- `integration ready`
- `channel ready`
- `KakaoTalk ready`
- `Naver Cafe ready`
- `automatic posting ready`
- `reply ingestion ready`

## Rollup

- Sessions run:
- Usable sessions:
- Packet version:
- Overall decision: no signal / friction / candidate signal
- Main evidence:
- Main confusion:
- Copy changes needed:
- Next action:

## Evidence Board Update

After filling this rollup from 3 completed usable sessions:

1. Use the [Evidence Board Update Runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook.md).
2. Update the evidence board only with the selected decision label and non-private summary.
3. Keep original session notes in the worksheet or session log.
4. If decision is `candidate signal`, prepare only a `/content-flows` review candidate.
5. Do not create a public route, account integration, automatic posting, reply ingestion, contact store, or channel analytics.

## Connected Documents

- [Post-Rollup Decision Guide](./2026-06-11-school-dorm-share-packet-post-rollup-decision-guide.md)
- [Response Coding Guide](./2026-06-11-school-dorm-share-packet-response-coding-guide.md)
- [Evidence Board Update Runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook.md)
- [Distribution Channel Handoff HTML Hub](./2026-06-11-distribution-channel-handoff-html-hub.md)
- [Pilot Worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet.md)
- [Session Log Starter](./2026-06-10-school-dorm-share-packet-session-log-starter.md)
- [Evidence Board](./2026-06-10-school-dorm-share-packet-evidence-board.md)
- [Pilot Run Pack](./2026-06-10-school-dorm-share-packet-pilot-run-pack.md)
