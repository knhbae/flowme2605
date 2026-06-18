# FlowMe External Ecosystem Next Axis Selection

**Created:** 2026-06-09  
**Status:** roadmap selection artifact, not implementation approval  
**HTML view:** [Next Axis Selection Korean HTML](./2026-06-09-external-ecosystem-next-axis-selection-ko.html)

This document continues the external ecosystem analysis room after the operating index. It selects the next non-repetitive analysis axis before adding more apps, services, platforms, or competitors to the Phase 5 compression table.

## Decision

Select `distribution-channel-handoff` as the next analysis axis.

Reason: the current roadmap has already learned a lot from life-transition flows, digital setup flows, export destinations, and integration readiness. The next gap is what happens after a Flow artifact is created: users often need to send it to a family group, school/dorm group, team channel, cafe post, form, memo page, or sheet handoff without turning FlowMe into a community, messaging, or automation platform.

This is a docs/research axis first. It does not approve a public route, messaging integration, contact import, posting automation, or channel analytics.

## Axis Comparison

| Axis | Current coverage | Product-learning value | Main risk | Decision |
| --- | --- | --- | --- | --- |
| Creator material | Already represented by creator/PDF/video/template examples and source-selection rules | Useful for source preservation and creator boundary | Can drift into copying source files or creator-platform features | Hold as covered backup |
| Household table/sheet | Already represented by fridge, balcony, menu, care, and Sheets export rules | Useful for row artifacts and sheet import friction | Can become a spreadsheet/productivity clone | Hold as covered backup |
| Distribution/channel handoff | Under-covered in the external ecosystem roadmap | Tests how FlowMe travels through existing social, family, team, cafe, and form channels after export | Can drift into messaging, community, CRM, or automation | Select next |

## Candidate Shape

Working candidate name: `distribution-channel-handoff-precheck`

User moment:

- "I made or found a Flow artifact, but now I need to send it to the right people and collect the right kind of response."

Natural artifact:

- Share packet: short plain text or Markdown summary.
- Optional attached artifact: `.ics`, CSV/XLSX-ready rows, checklist text, or source/caution memo.
- Response plan: what reply, check, form, or sheet update should come back.

Anchor:

- Audience and deadline, not account connection.

Stage 0 behavior:

1. choose recipient/channel type;
2. copy a source-attached share packet;
3. choose one response shape: reply, form, sheet row, or checklist confirmation;
4. keep source URL, caution, and completion criteria visible;
5. record whether the external handoff was understandable.

## Platforms To Verify Next

The next research pass should use current official or primary sources before making claims about platform behavior.

| Platform/category | Why it matters | What to verify |
| --- | --- | --- |
| KakaoTalk sharing or group chat | Korean users often coordinate family, school, dorm, and small-team tasks here | Whether Stage 0 should stay copy/share only, and which data must never be stored |
| Naver Cafe or community post | Korean communities often coordinate notices, preparation lists, and feedback threads | Whether FlowMe can provide a source-attached post packet without scraping replies or becoming a cafe tool |
| Google Forms + Sheets | Common lightweight way to collect attendance, confirmations, or row updates | Whether FlowMe should export form-copy guidance or only sheet-ready rows |
| Notion/public memo page | Common destination for a shareable checklist or source note | Whether Markdown handoff is enough before any workspace integration |
| Existing messenger/team channels | Slack, Discord, Teams, or similar group channels can reveal non-Korean analog patterns | Whether this remains a future-platform pattern rather than Stage 0 integration |

## Do Not Build

- KakaoTalk, Naver Cafe, Slack, Discord, Teams, or Notion integration in Stage 0.
- Contact import, address book, member list, role permission system, or group management.
- Bulk sending, auto posting, scheduled posting, comment scraping, or reply ingestion.
- Engagement analytics, read receipts, community moderation, or CRM-like follow-up.
- Storage of private chat logs, phone numbers, usernames, session links, invite links, or private channel IDs.

## Why This Axis Comes Before More Content Candidates

Adding another strong content candidate would likely repeat the current pattern: source -> Flow artifact -> export. That is useful, but it does not answer whether FlowMe survives the next real step: moving the artifact through the user's existing social or work channel.

The selected axis keeps FlowMe small:

- FlowMe prepares the packet.
- The user chooses the external channel.
- FlowMe does not own the channel.
- FlowMe does not harvest replies.
- FlowMe only learns whether the packet shape was understandable enough to execute.

## Evidence Needed Before Promotion

Before `distribution-channel-handoff-precheck` can enter `/content-flows` review, a future pass must provide:

1. current primary-source checks for the chosen platforms;
2. one Korean-first scenario with a concrete audience and deadline;
3. one sample share packet that includes source URL, caution, and completion criteria;
4. a clear response shape that does not require integration;
5. a do-not-store list for channel identifiers, private messages, and contact data.

## Recommended Next Pass

Run a source-backed platform comparison for:

1. KakaoTalk copy/share behavior;
2. Naver Cafe/community post behavior;
3. Google Forms/Sheets response collection;
4. Notion or Markdown public memo handoff;
5. one non-Korean team/messenger analog for boundary contrast.

The output should be another Korean HTML summary and a docs-level gate. It should not create code, routes, account connections, or platform APIs.

## 2026-06-10 Platform Gate Pass

[Distribution Channel Handoff Platform Gate](./2026-06-10-distribution-channel-handoff-platform-gate.md) now checks current official/primary docs for KakaoTalk Share, Naver Cafe, Google Forms/Sheets, Notion import, and Slack/Teams/Discord webhook analogs. The decision is to keep `distribution-channel-handoff-precheck` as a `B+ docs gate`: FlowMe can prepare a source-attached share packet, but it must not build public routes, channel integrations, account connections, automatic posting, reply ingestion, contact storage, or channel analytics.
