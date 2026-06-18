# 2026-06-11 School/Dorm Share Packet Post-Rollup Decision Guide

**Status:** decision guide, not observation evidence  
**HTML view:** [School/Dorm Share Packet Post-Rollup Decision Guide Korean HTML](./2026-06-11-school-dorm-share-packet-post-rollup-decision-guide-ko.html)

Use this guide only after the rollup template has been filled from at least 3 completed usable recipient sessions.

It maps the rollup decision to the next allowed action for `school-or-dorm-prep-share-packet`.

## Entry Condition

Do not use this guide unless all are true:

- the same packet version was used across sessions;
- at least 3 completed usable recipient sessions exist;
- the rollup template has one selected decision;
- no private values were recorded;
- the selected decision is exactly one of `no signal`, `friction`, or `candidate signal`.

## Decision To Action

| Rollup decision | What it means | Allowed next action | Still blocked |
| --- | --- | --- | --- |
| `no signal` | The observation set is missing, inconsistent, or too vague. | Keep evidence board at `no signal`; rerun sessions with a stable packet version. | Product status change, candidate prep, public route, integration. |
| `friction` | Sessions exist, but label, latest-notice, no-store, manual-copy, or mobile-readability confusion remains. | Revise the share packet copy, record the change, rerun the pilot. | Candidate prep, public route, integration, automation. |
| `candidate signal` | 3 completed usable first-run sessions pass the comprehension criteria. | Prepare a `/content-flows` review candidate only. | Public `/f/...` route, KakaoTalk/Naver/Forms/Sheets/Notion integration, automatic posting, reply ingestion, contact storage, channel analytics. |

## Candidate Signal Prep Checklist

Use this only if the rollup decision is `candidate signal`.

Fill the [Content-Flows Candidate Prep Template](./2026-06-11-school-dorm-share-packet-content-flows-candidate-prep.md) before any implementation work.

The `/content-flows` review candidate must include:

- source URL;
- caution text;
- completion criteria;
- response labels;
- latest-notice priority copy;
- no-store copy for health, payment, identity, room, channel, invite, form edit, webhook, contact, and chat-log values;
- manual-copy/export boundary;
- explicit statement that FlowMe does not send, post, collect replies, store contacts, or track channels.

## Friction Revision Checklist

Use this if the rollup decision is `friction`.

Revise only the packet copy or layout that caused confusion:

- response label wording;
- latest official notice priority;
- no-store warning;
- manual-copy boundary;
- mobile first-screen readability;
- channel-specific phrasing that sounds like automation.

Then rerun the same pilot. Do not prepare a review candidate from a friction rollup.

## Evidence Board Update

After applying this guide:

1. Open the [Evidence Board Update Runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook.md).
2. Update the evidence board decision label only.
3. Link the filled rollup.
4. Record whether the next action is rerun, revise packet, or prepare `/content-flows` review candidate.
5. Keep forbidden product claims out of the board.

## Forbidden Moves

Do not do any of these from this guide:

- create a public route;
- connect KakaoTalk, Naver Cafe, Forms/Sheets, Notion, Slack, Teams, or Discord accounts;
- store contacts, channel IDs, invite links, form edit links, webhook URLs, room values, payment values, identity values, health values, or chat logs;
- post automatically;
- collect replies;
- create channel analytics;
- call the result validation.

## Connected Documents

- [Rollup Template](./2026-06-11-school-dorm-share-packet-rollup-template.md)
- [Evidence Board Update Runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook.md)
- [Content-Flows Candidate Prep Template](./2026-06-11-school-dorm-share-packet-content-flows-candidate-prep.md)
- [Evidence Board](./2026-06-10-school-dorm-share-packet-evidence-board.md)
- [Pilot Worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet.md)
- [Distribution Channel Handoff HTML Hub](./2026-06-11-distribution-channel-handoff-html-hub.md)
