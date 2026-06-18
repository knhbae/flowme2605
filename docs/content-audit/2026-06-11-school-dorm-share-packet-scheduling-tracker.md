# 2026-06-11 School/Dorm Share Packet Scheduling Tracker

Purpose: provide a non-identifying 3-slot scheduling tracker for the first `school-or-dorm-prep-share-packet` recipient observations.

Status: blank scheduling tracker, `not run`, not participant consent record, not observation evidence, not validation, not public-route approval, and not integration readiness.

HTML view: [School/Dorm Share Packet Scheduling Tracker Korean HTML](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html)

## Current State

- Current decision: `no signal`
- Observation sessions recorded: `0 / 3`
- Target sessions: `3`
- Allowed statuses: `not invited`, `invited`, `agreed`, `declined`, `completed`, `stopped`
- Allowed record shape: role label, time window if needed, packet version, status, non-private stop category
- Not allowed: name, phone, messenger ID, room number, password, key, payment, health, identity, invite link, form edit link, webhook URL, or chat log

## Tracker Rules

- Use only the role labels in the tracker.
- Keep the same packet version for all agreed sessions.
- Do not store contact details in this document.
- If someone declines, record only `declined`.
- If someone stops, record only the stop category.
- Do not count `invited`, `agreed`, or `scheduled` as evidence.
- Do not move to rollup until 3 completed usable sessions exist.

## Scheduling Tracker

| Slot | Role label | Status | Time window | Packet version | Stop category | Next action |
|---|---|---|---|---|---|---|
| 01 | student-like recipient | not invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | send recruiting copy |
| 02 | parent-or-guardian-like recipient | not invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | send recruiting copy |
| 03 | coordinator-like recipient | not invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | send recruiting copy |

## After-Invite Row Snippets

After sending the recruiting copy, replace only the matching slot row with one of these non-identifying rows:

```md
| 01 | student-like recipient | invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | wait for agree/decline |
```

```md
| 02 | parent-or-guardian-like recipient | invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | wait for agree/decline |
```

```md
| 03 | coordinator-like recipient | invited |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | wait for agree/decline |
```

Do not add the recipient name, messenger handle, phone number, invite link, message text, or exact reply.

## After-Reply Row Snippets

If the recipient agrees to a 15-minute window, replace only the matching slot row with one of these rows and keep the time window broad:

```md
| 01 | student-like recipient | agreed | YYYY-MM-DD HH:MM window | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | run preflight before session |
```

```md
| 02 | parent-or-guardian-like recipient | agreed | YYYY-MM-DD HH:MM window | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | run preflight before session |
```

```md
| 03 | coordinator-like recipient | agreed | YYYY-MM-DD HH:MM window | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | run preflight before session |
```

If the recipient declines or does not respond, replace only the matching slot row with one of these rows:

```md
| 01 | student-like recipient | declined |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | recruit another role-labeled slot if needed |
```

```md
| 02 | parent-or-guardian-like recipient | declined |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | recruit another role-labeled slot if needed |
```

```md
| 03 | coordinator-like recipient | declined |  | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | none | recruit another role-labeled slot if needed |
```

Do not paste why they agreed or declined if it includes a private detail. Use only the status row.

## Status Meanings

| Status | Meaning | Does it count as evidence? |
|---|---|---|
| `not invited` | No invitation has been sent. | no |
| `invited` | Recruiting copy was sent, but no session is agreed. | no |
| `agreed` | A 15-minute session is agreed, but not run. | no |
| `declined` | The person declined or did not respond. | no |
| `completed` | A session ran and notes moved to the worksheet/session log. | only after notes are recorded |
| `stopped` | The session stopped due to a risk or misunderstanding category. | no, but it may become friction evidence after notes |

## Status Update Recipe

Use this sequence after sending the recruiting copy:

| Moment | Change status to | Time window | Stop category | Next action |
|---|---|---|---|---|
| Before invite | `not invited` | blank | `none` | send recruiting copy |
| Invite sent, no reply yet | `invited` | blank unless a window is agreed | `none` | wait for agree/decline |
| 15-minute slot agreed | `agreed` | broad date/time window only | `none` | run preflight before session |
| Recipient declines or does not respond | `declined` | blank | `none` | recruit another role-labeled slot if needed |
| Session starts but stops | `stopped` | optional broad window | nearest non-private stop category | do not continue more sessions if the same stop repeats twice |
| Session completed and notes moved | `completed` | optional broad window | `none` unless a stop happened | continue until 3 completed usable sessions exist |

Do not paste the message thread, names, handles, phone numbers, invite links, room values, form edit links, or exact private quotes into the tracker.

## Stop Categories

Use only these categories:

- `none`
- `sensitive-value concern`
- `automation misunderstanding`
- `latest-notice confusion`
- `role mismatch`
- `other non-private note`

If the reason includes a private detail, do not copy the detail. Use the nearest category.

## What To Open Next

1. Use the [version lock](./2026-06-11-school-dorm-share-packet-version-lock-ko.html) before final invitations or sessions.
2. Use the [recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy-ko.html) to send invitations.
3. Use this tracker until three slots are agreed or declined.
4. Before the first session, confirm the [preflight checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist-ko.html).
5. On the session day, open the [observation-day quick start](./2026-06-11-school-dorm-share-packet-observation-day-quick-start-ko.html).
6. During sessions, fill the [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet-ko.html).
7. After sessions, move role-level notes into the [session log starter](./2026-06-10-school-dorm-share-packet-session-log-starter-ko.html).
8. Fill the [rollup template](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html) only after 3 completed usable sessions.

Until 3 completed usable sessions are recorded, the evidence board remains `no signal`.
