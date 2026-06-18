# 2026-06-11 School/Dorm Share Packet Version Lock

Purpose: lock the exact `school-or-dorm-prep-share-packet` version before recipient observation sessions so all three people see the same material.

Status: version locked for prep, `not run`, not observation evidence, not participant consent, not validation, not public-route approval, and not integration readiness.

HTML view: [School/Dorm Share Packet Version Lock Korean HTML](./2026-06-11-school-dorm-share-packet-version-lock-ko.html)

## Current State

- Current decision: `no signal`
- Observation sessions recorded: `0 / 3`
- Locked packet version: `school-dorm-share-packet-v2-2026-06-11-readable-preview`
- Change policy: restart all sessions or split rollup if the packet changes after any session
- Private data: none

## Lock Fields

Fill this before sending final invitations or running any session.

| Field | Value | Required before session? |
|---|---|---|
| Version label | `school-dorm-share-packet-v2-2026-06-11-readable-preview` | yes |
| Source handoff opened | `2026-06-11-distribution-channel-handoff-current-state-handoff-ko.html` | yes |
| Date checked | `2026-06-11` | yes |
| Packet preview opened | `2026-06-10-school-dorm-share-packet-preview-ko.html` | yes |
| Response labels included | four recipient reply labels in the packet, with observer coding as `pass` / `fail` / `unclear` | yes |
| Latest-notice priority included | latest school/dorm notice wins | yes |
| No-store list included | name, phone, messenger ID, room/password/key, payment, health, identity, invite links, webhook URLs, chat logs | yes |
| Manual-copy boundary included | no posting, sending, scraping, contact storage, or channel analytics | yes |
| Observer edit rule accepted | do not edit packet mid-run | yes |

## Change Rule

- Before the first session, edits are allowed only if the version label is updated.
- After any session starts, do not silently change the packet.
- If the packet changes after one or more sessions, choose one:
  - restart all three sessions with the new version; or
  - keep old and new sessions in separate rollups.
- Do not mix different packet versions into one pass/fail/unclear rollup.
- A version change is not evidence by itself. It is only a session-quality control note.

## Version Lock Checklist

- Same preview file opened for all sessions.
- Same response labels are visible.
- Same caution text is visible.
- Same latest-notice rule is visible.
- Same manual-copy boundary is visible.
- Same no-store list is visible.
- Scheduling tracker uses the same version label.
- Worksheet/session log uses the same version label.

## What To Open Next

1. Confirm the packet in the [preview](./2026-06-10-school-dorm-share-packet-preview-ko.html).
2. Send invitations with the [recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy-ko.html).
3. Record only role/status in the [scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html).
4. On session day, use the [observation-day quick start](./2026-06-11-school-dorm-share-packet-observation-day-quick-start-ko.html).
5. During sessions, fill the [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet-ko.html).
6. After sessions, move role-level notes into the [session log starter](./2026-06-10-school-dorm-share-packet-session-log-starter-ko.html).

Until 3 completed usable sessions with the same packet version are recorded, the evidence board remains `no signal`.
