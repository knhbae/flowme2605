# School/Dorm Share Packet Observation Script

**Created:** 2026-06-10  
**Updated:** 2026-06-11  
**Status:** observation script, not validation, not route approval  
**HTML view:** [School/Dorm Share Packet Observation Korean HTML](./2026-06-10-school-dorm-share-packet-observation-script-ko.html)  
**Log template:** [School/Dorm Share Packet Observation Log Template](./2026-06-10-school-dorm-share-packet-observation-log-template.md)

This script follows the [School/Dorm Prep Share Packet Preview](./2026-06-10-school-dorm-share-packet-preview.md). The first run uses `school-dorm-share-packet-v2-2026-06-11-readable-preview` for all 3 recipient sessions.

It does not create a public route, platform integration, account connection, automatic posting, reply ingestion, contact storage, channel analytics, or a validation claim.

Do not start this script until the matching role-labeled slot is `agreed` in the scheduling tracker and the preflight checklist passes. `not invited`, `invited`, `scheduled`, and `not run` are not observation evidence.

## Observation Decision

- User need: As a sender preparing dorm move-in coordination, I need to know whether recipients understand the packet and response labels, so that FlowMe can decide whether the packet is readable enough before any `/content-flows` review candidate.
- Content shape: manual share packet for dorm move-in preparation.
- Primary destination: `hybrid` plus external manual channel.
- Structure: observation script with task prompts and pass/fail criteria.
- Action count: 4 observed tasks plus one no-store check.
- Playbook: distribution-channel-handoff gate plus source/risk separation.
- Exceptions: this is a comprehension check, not proof that users will adopt or repeatedly use the flow.
- Risk/source handling: source, latest-notice caution, no-store values, and no-automation boundary must be understood by recipients.

## Objective

Observe whether a student, parent/guardian, or coordinator-like recipient can read `school-dorm-share-packet-v2-2026-06-11-readable-preview` and answer three questions without extra explanation:

1. What should I do next?
2. Which response label should I send?
3. What information should I avoid posting in the external channel?

## Participants

Recommended first run:

- 3 proxy recipients;
- one student or student-like reader;
- one parent or guardian-like reader;
- one coordinator, dorm assistant, or group manager-like reader if possible.

If fewer than 3 completed usable sessions are available, use the notes only as internal observation material and keep the evidence board at `no signal`.

## Setup

Show only the share packet preview text or HTML section. Do not explain FlowMe, the roadmap, or the platform gate before the task.

Moderator instructions:

1. Ask the participant to read the packet as if it arrived in a KakaoTalk group, Naver Cafe post, form prompt, sheet row, or memo page.
2. Ask where they would send or paste it.
3. Ask what each response label means.
4. Ask which values they would not post.
5. Ask whether they think FlowMe is supposed to send/post automatically.

## Task Script

### Task 1. Identify The Next Action

Prompt:

> You received this packet before dorm move-in. What would you do first?

Expected signal:

- Participant says they would open/check the latest school or dorm notice first.
- Participant does not assume the packet replaces the official notice.

### Task 2. Choose The Correct Response Label

Give four mini situations and ask the participant to choose one label.

| Situation | Expected label |
| --- | --- |
| I opened the latest notice and checked the move-in date/time. | `공지 확인 완료` |
| I checked the required documents and submission deadline. | `서류 준비 완료` |
| I removed electric heaters, cooking tools, and other prohibited items. | `반입금지 제외 완료` |
| I still need to check room, card key, or facility check location. | `당일 절차 확인 필요` |

### Task 3. Choose The Channel Shape

Prompt:

> If you had to use this packet today, would you send it by KakaoTalk, Naver Cafe, form/sheet, or memo?

Expected signal:

- Participant can choose one channel without expecting FlowMe to connect an account.
- Participant understands that sending/posting happens outside FlowMe.

### Task 4. Identify No-Store Values

Prompt:

> Which of these should not be posted in the chat, cafe, form, sheet, or memo?

Check whether they mention:

- health certificate images;
- tuberculosis test result images;
- payment account data;
- student ID;
- resident registration number;
- room password or card key number;
- channel IDs, invite links, form edit links, webhook URLs;
- private chat logs or member data.

### Task 5. Automation Boundary Check

Prompt:

> After reading this packet, do you think FlowMe will send the message or collect replies automatically?

Expected signal:

- Participant says no, or says the user manually copies/sends and manually checks replies.

## Pass Criteria

Use this as a readiness check, not validation.

The packet can move to a `/content-flows` review candidate only if:

1. all 3 first-run participants are completed usable sessions and correctly interpret all four response labels;
2. no participant suggests posting health, payment, student identity, resident identity, room/password, channel ID, form edit link, webhook URL, or chat-log values after reading the caution;
3. participants can state that the latest school/dorm notice overrides the packet;
4. participants understand that FlowMe is not sending, posting, collecting replies, or storing contacts automatically;
5. the packet remains readable in the first mobile viewport without opening a long source explanation.

## Failure Signals

Do not promote the packet if any of these appear repeatedly:

- `공지 확인 완료` is interpreted as all tasks done.
- `당일 절차 확인 필요` is interpreted as asking FlowMe to find a room number, password, or key.
- Participants try to upload health certificates, payment proof, or student identity values.
- Participants expect FlowMe to send/post automatically.
- Participants cannot tell whether the school/dorm notice or the packet is the source of truth.
- The first mobile viewport reads like a product explanation instead of a share packet.

## Product Decision Ladder

| Observation result | Product decision |
| --- | --- |
| Fails label comprehension or no-store check | Revise the share packet labels and caution copy. Keep file-based preview only. |
| Partially passes but automation expectations remain | Add stronger manual-copy boundary and rerun observation. Keep outside `/content-flows`. |
| Passes all criteria with 3 completed usable first-run recipients | Prepare a `/content-flows` review candidate, still not a public route and not validation. |
| Repeated real use later shows copy/send/reply/check behavior | Consider promotion evidence for the distribution-channel-handoff axis. |

## Connected Documents

- [Distribution Channel Handoff Platform Gate](./2026-06-10-distribution-channel-handoff-platform-gate.md)
- [School/Dorm Prep Share Packet Preview](./2026-06-10-school-dorm-share-packet-preview.md)
- [School/Dorm Share Packet Scheduling Tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker.md)
- [School/Dorm Share Packet Preflight Checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist.md)
- [School/Dorm Share Packet Observation Log Template](./2026-06-10-school-dorm-share-packet-observation-log-template.md)
- [Dorm Move-In Public Promotion Gate](./2026-06-09-dorm-move-in-public-promotion-gate.md)
- [Dorm Move-In Flow Candidate](./2026-06-08-dorm-move-in-flow-candidate.md)
- [External Ecosystem Analysis Room Index](./2026-06-09-external-ecosystem-analysis-room-index.md)

## FLOW UX Review

Findings:

1. [High] Source/safety: the packet cannot move forward unless recipients understand that private health, payment, student, and channel values stay out of FlowMe and out of the external channel.
2. [Medium] Copy: the four response labels are useful only if `공지 확인 완료` does not imply the entire move-in preparation is complete.
3. [Medium] Journey: the first action must remain latest-notice confirmation, not reading FlowMe as the authority.
4. [Medium] Boundary: channel handoff must remain manual-copy until behavior evidence exists.

Rubric:

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Recommended fixes if the script fails:

1. Rename confusing response labels before adding more channels.
2. Move the latest-notice caution above the action rows.
3. Put no-store values in one short line inside the packet.
4. Add a visible "manual copy/send only" line before any `/content-flows` review candidate.
