# 2026-06-11 School/Dorm Share Packet Response Coding Guide

Purpose: define how observers should code `pass`, `fail`, `unclear`, and `not run` for `school-or-dorm-prep-share-packet` recipient observation sessions.

Status: blank coding guide, `not run`, not observation evidence, not validation, not public-route approval, and not integration readiness.

HTML view: [School/Dorm Share Packet Response Coding Guide Korean HTML](./2026-06-11-school-dorm-share-packet-response-coding-guide-ko.html)

## Current State

- Current decision: `no signal`
- Observation sessions recorded: `0 / 3`
- Allowed check values: `pass`, `fail`, `unclear`, `not run`
- Evidence shape: role-level note without private details
- Not allowed: real names, phone numbers, messenger IDs, room/password/key details, payment, health, identity, invite links, form edit links, webhook URLs, contact lists, or chat logs

## Global Coding Rules

- Use `pass` only when the recipient says the needed behavior without extra FlowMe explanation.
- Use `fail` when the recipient expects FlowMe to act as the source of truth, store sensitive values, send/post automatically, collect replies, store contacts, or track channels.
- Use `unclear` when the recipient gives a vague or partial answer that cannot safely be counted as pass.
- Use `not run` only before the check is asked.
- If the answer includes private details, stop the session and record only the non-private stop category.
- Do not use a strong phrase from the observer as evidence if the recipient did not say it.

## Check-Level Coding

| Check | `pass` | `fail` | `unclear` |
|---|---|---|---|
| First action | Recipient starts from the latest school/dorm notice or official source. | Recipient treats FlowMe memory or the packet as the authority. | Recipient says "check somewhere" but does not identify the latest notice or official source. |
| Four labels | Recipient explains all four response labels as manual response states. | Recipient treats a label as an automatic action, delivery guarantee, or full task completion. | Recipient explains only some labels or needs extra product explanation. |
| Latest-notice priority | Recipient says the latest official notice overrides the packet. | Recipient says the packet, FlowMe, or older saved content wins. | Recipient says "depends" without a clear update rule. |
| No-store values | Recipient avoids health, payment, identity, room, channel, invite, form edit, webhook, contact, and chat-log values. | Recipient suggests entering or storing any blocked private value. | Recipient avoids some values but misses one or more blocked categories. |
| Manual-copy boundary | Recipient says the user manually copies/sends and manually checks replies. | Recipient expects FlowMe to send, post, collect replies, store contacts, or track channels. | Recipient is unsure whether FlowMe or the user performs the channel action. |

## Session-Level Coding

A session is `usable` only when:

- the same locked packet version was used;
- FlowMe was not explained before the task;
- no private details were recorded;
- all five checks were asked;
- every check has `pass`, `fail`, or `unclear`, not `not run`.

Session decision:

| Session decision | Use when | What happens next |
|---|---|---|
| `pass` | All five checks are `pass`. | Keep the session for rollup. |
| `friction` | At least one check is `fail` or `unclear`, but the session can be summarized without private details. | Keep the session as friction evidence and revise packet copy after rollup. |
| `stopped` | Private values, automation misunderstanding, or safety confusion makes the session unsafe to continue. | Stop and record only the stop category. |
| `not usable` | Packet version, setup, or notes are inconsistent. | Do not count it toward candidate signal. |

## Rollup Guardrail

Do not select `candidate signal` unless at least 3 completed usable sessions have:

- the same packet version;
- no private details;
- `pass` for first action;
- `pass` for all four labels;
- `pass` for latest-notice priority;
- `pass` for no-store values;
- `pass` for manual-copy boundary.

If any usable session has `fail` or `unclear`, the rollup is either `friction` or `no signal`, not `candidate signal`.

## What To Open Next

1. Fill the [version lock](./2026-06-11-school-dorm-share-packet-version-lock-ko.html) before sessions.
2. During sessions, write only role-level notes in the [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet-ko.html).
3. After sessions, move coded notes into the [session log starter](./2026-06-10-school-dorm-share-packet-session-log-starter-ko.html).
4. Use the [rollup template](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html) only after at least 3 completed usable sessions exist.

Until 3 completed usable sessions pass the coding guide, the evidence board remains `no signal`.
