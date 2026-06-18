# 2026-06-11 School/Dorm Share Packet Evidence Board Update Runbook

Purpose: define the exact update procedure for the `school-or-dorm-prep-share-packet` evidence board after a real rollup exists.

Status: blank update runbook, `not run`, not observation evidence, not validation, not public-route approval, and not integration readiness.

HTML view: [School/Dorm Share Packet Evidence Board Update Runbook Korean HTML](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook-ko.html)

## Current State

- Current board decision: `no signal`
- Rollup available: `no`
- Sessions recorded: `0 / 3`
- Board update allowed now: `no`
- Completed usable sessions required before update: `3`
- Allowed board labels: `no signal`, `friction`, `candidate signal`
- Forbidden board labels: `validated`, `public route ready`, `integration ready`, `channel ready`

## Entry Condition

Do not update the evidence board from this runbook unless all are true:

- at least 3 completed usable sessions exist;
- those sessions are completed and recorded with role labels only;
- the same packet version was used;
- the response coding guide was applied;
- the rollup template has one selected decision;
- no private details are copied into the board;
- the post-rollup decision guide has selected the allowed next action.

If any item is missing, keep the board at `no signal`. A blank rollup, an incomplete rollup, or scheduling states such as `invited`, `agreed`, or `scheduled` are not enough to update the board.

## Board Update Fields

Update only these board fields:

| Board field | Allowed value |
|---|---|
| Current decision | `no signal`, `friction`, or `candidate signal` |
| Evidence source | link to filled rollup, not raw private notes |
| Sessions summary | count of usable sessions and role labels only |
| Main evidence | one short non-private pattern |
| Main confusion | one short non-private pattern, if any |
| Next action | rerun sessions, revise packet, or prepare `/content-flows` review candidate |
| Blocked moves | public route, integrations, automation, contact storage, channel analytics |

## Do Not Copy

Do not copy these into the evidence board:

- real names;
- phone numbers;
- messenger IDs;
- school room, password, key, payment, health, identity, invite link, form edit link, webhook URL, or chat-log values;
- exact chat quotes that include private details;
- raw worksheet notes;
- claim words such as `validated`, `launched`, `ready`, `integration ready`, or `channel ready`.

## Decision-Specific Update

| Rollup decision | Evidence board update | Next action |
|---|---|---|
| `no signal` | Keep board decision as `no signal`; link the incomplete or inconsistent rollup only if useful. | Rerun sessions with stable packet version. |
| `friction` | Set board decision to `friction`; summarize the confusion category without private details. | Revise packet copy and rerun. |
| `candidate signal` | Set board decision to `candidate signal`; link the rollup and prepare candidate prep only. | Fill `/content-flows` review candidate prep. |

## Update Steps

1. Open the filled rollup.
2. Check the response coding guide for any `fail` or `unclear`.
3. Check the post-rollup decision guide.
4. Update only the allowed board fields.
5. Keep forbidden product claims out.
6. Link the board back to the rollup and post-rollup guide.
7. Do not create a public route or integration from this update.

## What To Open Next

1. [Rollup template](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html)
2. [Response coding guide](./2026-06-11-school-dorm-share-packet-response-coding-guide-ko.html)
3. [Post-rollup decision guide](./2026-06-11-school-dorm-share-packet-post-rollup-decision-guide-ko.html)
4. [Evidence board](./2026-06-10-school-dorm-share-packet-evidence-board-ko.html)
5. [Content-flows candidate prep](./2026-06-11-school-dorm-share-packet-content-flows-candidate-prep-ko.html) only after `candidate signal`

Until the entry condition is met, the board remains `no signal`.
