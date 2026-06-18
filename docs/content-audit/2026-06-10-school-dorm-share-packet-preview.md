# School/Dorm Prep Share Packet Preview

**Created:** 2026-06-10  
**Updated:** 2026-06-11  
**Status:** file-based preview, not public route, not validation  
**Packet version:** `school-dorm-share-packet-v2-2026-06-11-readable-preview`  
**HTML view:** [School/Dorm Share Packet Korean HTML](./2026-06-10-school-dorm-share-packet-preview-ko.html)  
**Next observation:** [School/Dorm Share Packet Observation Script](./2026-06-10-school-dorm-share-packet-observation-script.md)

This preview follows the [distribution-channel-handoff platform gate](./2026-06-10-distribution-channel-handoff-platform-gate.md). It turns the existing `college-dorm-move-in-checklist` review candidate into a manual share packet that a student, parent, or coordinator can copy into an external channel such as KakaoTalk, Naver Cafe, a form prompt, a sheet row, or a memo page.

It does not create a public route, platform integration, auto-posting feature, reply collector, contact store, or channel analytics.

## Conversion Decision

- User need: As a student or parent preparing for dorm move-in, I need to send a short source-backed checklist to the right group before move-in, so that documents, prohibited items, first-day supplies, and entry-day steps are confirmed without storing private school or health details in FlowMe.
- Content shape: official dorm entry guide and term-specific dorm notices.
- Primary destination: `hybrid` plus external share packet.
- Structure: D-day checklist with manual channel handoff.
- Action count: 5 share-visible rows.
- Playbook: moving/admin timeline + distribution-channel-handoff gate.
- Exceptions: the packet must not claim that one school rule applies to every dorm.
- Risk/source handling: source URL, latest-notice caution, completion criteria, and no-store copy travel with the packet.

## Source Basis

Primary review candidate:

- `college-dorm-move-in-checklist`

Existing source and gate:

- [Dorm Move-In Public Promotion Gate](./2026-06-09-dorm-move-in-public-promotion-gate.md)
- [Dorm Move-In Flow Candidate](./2026-06-08-dorm-move-in-flow-candidate.md)
- [Current candidate preview](./flow-content-ux-candidates-previews/college-dorm-move-in-checklist.html)

The current candidate uses school/dorm pages and term-specific PDFs as pattern evidence. The public promotion gate says a future public route still needs one selected current primary source. This preview therefore stays file-based and does not claim public-route readiness.

## Share Packet

Use this exact packet for the first observation run.

```text
[기숙사 입사 준비 확인 요청]

대상: 학생 / 보호자 / 기숙사 준비 담당자
마감: 입사 D-7까지 1차 확인, D-Day에는 현장 절차 확인
출처: 최신 학교/기숙사 공지 링크를 먼저 확인하세요.

해야 할 일
1. D-14 최신 학교/기숙사 공지에서 입사일, 제출서류, 반입금지 품목, 택배 주소, 입사 시간 변경 여부 확인
2. D-10 제출서류 목록, 제출 방법, 제출 기한 확인
3. D-7 침구, 세면도구, 수건, 슬리퍼, 첫날 생활용품 준비
4. D-5 전열기구, 취사도구, 위험물, 주류 등 학교별 반입금지 품목 제외
5. D-Day 호실/동선 확인, 서류 제출, 카드/키 수령, 시설 점검

주의
- 학교/기숙사별 최신 공지가 이 패킷보다 우선입니다.
- 건강검진 결과, 결제 정보, 방 비밀번호, 학생번호, 주민번호, 카드키 번호, 채팅방 ID, 초대 링크는 공유 채널에 올리지 마세요.
- 확인이 끝나면 아래 중 하나로 답해주세요.
  1. 공지 확인 완료
  2. 서류 준비 완료
  3. 반입금지 제외 완료
  4. 당일 절차 확인 필요
```

## Channel Variants

| Destination | Packet shape | Response shape | Do not include |
| --- | --- | --- | --- |
| KakaoTalk family/group chat | Short text packet with source URL and D-day rows | Reply with one of four completion labels | phone numbers, student IDs, health document images, room password |
| Naver Cafe post/comment | Post title + source-attached checklist + comment prompt | Comment with completion status or local notice difference | duplicated source body if sharing is blocked, private dorm details, member data |
| Google Forms prompt | Form question copy and allowed response choices | Form response or linked sheet row reviewed manually | verified email collection, private documents, form edit links |
| Sheet row handoff | CSV-ready row labels for status and owner | One row per recipient/family member or task owner | medical files, payment data, resident numbers |
| Notion/Markdown memo | Markdown note with checklist and source boundary | Manual checklist status in workspace | Notion API, workspace schema, synced comments |

## Response Choices

Use four short response choices so the sender does not need to read long replies:

1. `공지 확인 완료`
2. `서류 준비 완료`
3. `반입금지 제외 완료`
4. `당일 절차 확인 필요`

Optional memo:

- "학교 공지와 다른 점"
- "아직 못 찾은 항목"
- "기숙사 사무실에 물어볼 질문"

## No-Store Boundary

The packet must explicitly avoid:

- health certificate images;
- tuberculosis test result images;
- payment account data;
- room password;
- card key number;
- student ID;
- resident registration number;
- private medical details;
- KakaoTalk room IDs;
- Naver Cafe member names;
- form edit links;
- invite links;
- webhook URLs.

## FLOW UX Review

Findings:

1. [Medium] Portability: the dorm checklist is already portable to calendar/checklist, but external channel handoff needs shorter rows than the internal Flow preview.
2. [Medium] Cognitive load: a full D-14 to D-Day checklist is too long for a chat message. The packet should carry five rows and push details back to the source/Flow preview.
3. [High] Source/safety: health and school identity values must be excluded from the external channel, not only from FlowMe storage.
4. [Blocking fixed] Readability: the previous Korean packet body was mojibake and could not be used for recipient observation. Version `v2` replaces it with readable Korean before any session starts.

Rubric:

- User Need Fit: 5
- Execution Clarity: 5
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 5
- Source/Safety: 5
- Accessibility/Operability: 4

Recommended fixes before any runtime candidate:

1. Use `school-dorm-share-packet-v2-2026-06-11-readable-preview` for all three first-run sessions.
2. Test whether the share packet fits the first mobile screen.
3. Observe whether recipients understand the four response labels without extra explanation.

The observation script for step 3 is captured in [School/Dorm Share Packet Observation Script](./2026-06-10-school-dorm-share-packet-observation-script.md) and [Korean HTML](./2026-06-10-school-dorm-share-packet-observation-script-ko.html).

## Product Decision

`school-or-dorm-prep-share-packet` remains a file-based preview.

It can be used as the next review artifact for the distribution/channel axis, but it should not enter `/content-flows` or public `/f/[slug]` until a source-specific packet and response shape are observed with real users.
