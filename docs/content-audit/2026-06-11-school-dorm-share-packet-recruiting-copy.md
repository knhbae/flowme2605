# 2026-06-11 School/Dorm Share Packet Recruiting Copy

Purpose: provide safe Korean invitation copy and scheduling boundaries for the first 3 recipient observations of `school-or-dorm-prep-share-packet`.

Status: recruiting copy for observation setup only, `not sent`, not participant consent record, not observation evidence, not validation, not public-route approval, and not integration readiness.

HTML view: [School/Dorm Share Packet Recruiting Copy Korean HTML](./2026-06-11-school-dorm-share-packet-recruiting-copy-ko.html)

The Korean HTML view includes local copy buttons for the invite, scheduling, start-of-session, and decline/stop text. Copying the text is not evidence that an invitation was sent.

Immediate next move after copying/sending an invite: open the [scheduling tracker invited-row snippets](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html#snippets) and replace only the matching role-labeled slot with `invited`. Do not paste the recipient name, handle, phone number, invite link, message thread, or exact reply.

## Current State

- Observation state: `not run`
- Current decision: `no signal`
- Packet version: `school-dorm-share-packet-v2-2026-06-11-readable-preview`
- Target count: 3 recipient comprehension sessions
- Session length: about 15 minutes
- Allowed ask: understand a school/dorm share packet and say what is confusing
- Not allowed: collect private school/dorm values, contact lists, room/password/key information, payment, health, identity, invite links, form edit links, webhook URLs, or chat logs

## Who To Ask

Use role labels, not personal profiles:

| Slot | Role label | Why this role matters |
|---|---|---|
| Session 01 | student-like recipient | Checks whether the packet works for the person who receives and acts. |
| Session 02 | parent/guardian-like recipient | Checks whether caution and latest-notice priority are understandable. |
| Session 03 | coordinator/group-manager-like recipient | Checks whether manual sharing and no-automation boundaries are clear. |

Do not screen for real dorm, school, room, health, payment, or identity details. The observation can use a hypothetical or redacted packet context.

## Short Invite Copy

Use this when asking someone by message:

```text
혹시 15분 정도 학교/기숙사 준비 공유 패킷을 보고 이해되는지 확인해줄 수 있을까요?

제품 테스트나 가입 요청은 아니고, 패킷만 봤을 때 무엇을 먼저 확인할지, 어떤 문구가 헷갈리는지 보는 확인입니다.

이름, 연락처, 방 번호, 비밀번호, 결제, 건강, 신원 정보는 묻거나 기록하지 않습니다. 불편하면 언제든 중단해도 괜찮습니다.
```

## Scheduling Copy

Use this after the person agrees:

```text
고마워요. 가능한 시간 15분만 잡으면 됩니다.

진행할 때는 FlowMe를 먼저 설명하지 않고, 같은 공유 패킷을 보여드린 뒤 몇 가지 이해 질문만 할게요.

기록은 이름 없이 역할 라벨과 pass/fail/unclear 정도로만 남깁니다. 패킷 버전은 school-dorm-share-packet-v2-2026-06-11-readable-preview로 고정해서 진행합니다.
```

## Start-Of-Session Reminder

Read this before showing the packet:

```text
이건 제품 설명이나 평가가 아니라 공유 패킷 이해 확인입니다.

실제 개인정보나 학교/기숙사 값을 말하지 않아도 됩니다.

패킷만 보고 가장 먼저 무엇을 확인할지, 어떤 문구가 헷갈리는지만 말해주세요.
```

## Decline Or Stop Copy

Use this if someone declines or stops:

```text
괜찮습니다. 참여하지 않아도 아무 문제 없습니다.

혹시 중간에 멈춘 경우에는 구체적인 개인값 없이 "민감값 우려", "자동화 오해", "최신 공지 우선 혼동" 같은 범주만 기록하겠습니다.
```

## Do Not Say

- "FlowMe 검증에 참여해주세요."
- "서비스 출시 전 테스트입니다."
- "기숙사/학교 정보를 알려주세요."
- "카카오톡이나 카페 연동이 되는지 봐주세요."
- "응답이나 연락처를 자동으로 모으는 흐름입니다."
- "이 결과로 public route를 만들 예정입니다."

## Scheduling Log Shape

Keep the schedule record minimal:

| Field | Allowed value |
|---|---|
| Session slot | 01 / 02 / 03 |
| Role label | student-like / parent-or-guardian-like / coordinator-like |
| Time window | date and time only if needed |
| Packet version | `school-dorm-share-packet-v2-2026-06-11-readable-preview` |
| Status | invited / agreed / declined / completed / stopped |
| Stop category | none / sensitive-value concern / automation misunderstanding / latest-notice confusion / other non-private note |

Do not store personal identifiers in the analysis room document.

## Handoff After Recruiting

After three slots are scheduled or declined:

1. Keep the evidence board at `no signal`.
2. Confirm the [version lock](./2026-06-11-school-dorm-share-packet-version-lock-ko.html) before final invitations or sessions.
3. Update the [scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html) without personal identifiers.
4. Open the [preflight checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist-ko.html).
5. Open the [observation-day quick start](./2026-06-11-school-dorm-share-packet-observation-day-quick-start-ko.html).
6. Use the [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet-ko.html) during sessions.
7. Write session notes into the [session log starter](./2026-06-10-school-dorm-share-packet-session-log-starter-ko.html).
8. Fill the [rollup template](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html) only after at least 3 completed usable sessions exist.
9. Then use the [post-rollup decision guide](./2026-06-11-school-dorm-share-packet-post-rollup-decision-guide-ko.html).
