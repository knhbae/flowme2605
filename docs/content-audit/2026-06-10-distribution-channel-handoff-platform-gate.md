# Distribution Channel Handoff Platform Gate

**Created:** 2026-06-10  
**Status:** docs-level gate, not route approval  
**HTML view:** [Distribution Channel Handoff Korean HTML](./2026-06-10-distribution-channel-handoff-platform-gate-ko.html)

This gate follows [the next-axis selection matrix](./2026-06-09-external-ecosystem-next-axis-selection.md). It checks current official or primary platform docs for the `distribution-channel-handoff` axis and decides how far FlowMe can go before becoming a messaging, community, form, workspace, or automation platform.

## Decision

Keep `distribution-channel-handoff-precheck` as a docs-level gate for now.

FlowMe can prepare a portable share packet:

- short title;
- audience and deadline;
- source URL;
- caution note;
- completion criteria;
- optional attached artifact shape such as checklist text, Markdown memo, `.ics`, or CSV/XLSX-ready rows;
- one expected response shape: reply, comment, form response, sheet row, or checklist confirmation.

FlowMe should not build public routes, account connections, automatic posting, reply ingestion, contact storage, channel analytics, or workspace/community features for this axis yet.

## Official Source Findings

| Platform | Current official signal | FlowMe Stage 0 implication | Boundary |
| --- | --- | --- | --- |
| KakaoTalk Share | Kakao Developers distinguishes KakaoTalk Share from KakaoTalk Message. Share launches KakaoTalk and lets the user choose recipients; REST API and permission-based target selection belong to KakaoTalk Message. Share target picker can expose friends and chat rooms, with extra permission required to limit the picker. Source: [Kakao Developers KakaoTalk Share](https://developers.kakao.com/docs/latest/ko/kakaotalk-share/common). | FlowMe can prepare copy/share text and a source-attached packet. If a future app uses KakaoTalk Share, it must remain user-initiated and not store selected recipients. | No KakaoTalk Message API, friend-list lookup, chat-room targeting, bulk send, webhook success tracking, or recipient storage in Stage 0. |
| Naver Cafe | Naver Cafe help says posts can be shared from a post's share button; sharing can be disabled by the author; cafe sharing can create a body scrap while blog sharing is link-based; copied/scrapped content can lose access to original content if the original is deleted. Naver Cafe comments/replies are manual actions and comments/replies have a 3,000-character limit. Sources: [Cafe post sharing](https://help.naver.com/service/5622/contents/15217?lang=ko), [Cafe comments/replies](https://help.naver.com/service/5622/contents/15234?lang=ko). | FlowMe can generate a manual cafe post packet and a short comment/reply response prompt. It must keep the source URL and warn that original availability and sharing permission matter. | No cafe posting automation, scraping, comment ingestion, membership handling, search exposure control, or duplicated-content management. |
| Google Forms + Sheets | Google Forms help supports viewing responses, downloading responses as CSV, stopping response collection, setting close date/response limit, and collecting email addresses with explicit responder confirmation for verified email collection. Source: [Google Forms response management](https://support.google.com/docs/answer/139706?hl=en-en). | FlowMe can generate form-question copy, a deadline note, and sheet-ready row labels. It can suggest manual CSV export or Sheets review after responses. | No Google Form creation, responder email collection, response import, linked spreadsheet access, or Forms/Sheets API integration in Stage 0. |
| Notion / Markdown handoff | Notion help documents importing Markdown, text, HTML, CSV/XLSX, and related file types. Markdown/Text/HTML import as pages, while CSV/XLSX import as databases; imports can omit or flatten some content types such as comments, suggestions, color, or advanced layout. Source: [Notion import docs](https://www.notion.com/help/import-data-into-notion). | FlowMe can provide Markdown/plain-text handoff and CSV rows with source/caution/completion criteria. Notion remains a destination, not a FlowMe-owned workspace. | No Notion API, page/database creation, workspace schema builder, comment sync, or Notion clone. |
| Slack / Teams / Discord analogs | Slack incoming webhooks post messages into Slack and require webhook URLs/OAuth distribution for broader installs; Slack incoming webhooks do not delete posted messages. Microsoft Teams incoming webhooks are Workflows that post Adaptive Card or Message Card content to chosen chats/channels. Discord incoming webhooks are channel-tied endpoints for one-way posting; event listening or responding requires more app/bot infrastructure. Sources: [Slack incoming webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/), [Microsoft Teams incoming webhooks](https://support.microsoft.com/en-us/office/send-messages-in-teams-using-incoming-webhooks-323660ec-12ca-40b1-a1d3-a3df47e808c4), [Discord webhooks](https://docs.discord.com/developers/platform/webhooks). | These platforms are boundary references. They prove that automatic channel posting quickly becomes app/webhook/workflow infrastructure, so FlowMe should stay manual-copy first. | No webhook URLs, bot tokens, OAuth scopes, channel IDs, message deletion, event subscriptions, workflow setup, or server endpoints in Stage 0. |

## Candidate Scenario To Test Later

Use one Korean-first scenario before promotion:

`school-or-dorm-prep-share-packet`

User moment:

- A parent, student, or small group coordinator has a source-backed Flow artifact and needs to send it to a KakaoTalk group or Naver Cafe post before a deadline.

Natural artifact:

- Share packet: one title, one deadline, three to five action rows, source URL, caution, completion criteria.
- Optional response plan: "reply done", "leave a cafe comment", "submit form", or "update one sheet row".

Anchor:

- Audience + deadline.

Stage 0 behavior:

1. choose channel type;
2. copy share packet;
3. manually paste/send outside FlowMe;
4. choose expected response shape;
5. record whether the packet was understandable.

## Share Packet Requirements

A FlowMe share packet must include:

- the original source URL or source name;
- what the recipient should do next;
- a deadline or timing cue when relevant;
- a caution line that says local/source-specific rules may differ;
- a completion criterion;
- a short response request.

It must not include:

- phone numbers;
- private usernames;
- chat-room IDs;
- invite links;
- access tokens;
- form edit links;
- channel webhook URLs;
- private chat transcripts;
- child, school, health, payment, or resident identity values.

## Product Decision

`distribution-channel-handoff-precheck` remains `B+ docs gate`.

Reason:

- Real user need is plausible.
- Platform docs show copy/share, post, comment, form response, CSV, Markdown, and webhook patterns.
- But every integration path quickly touches permissions, recipients, private channels, response data, or automation.
- The safest Stage 0 test is a manual share packet with source/caution/completion criteria attached.

## Promotion Evidence Needed

Do not promote this axis into `/content-flows` until all of the following exist:

1. one Korean-first scenario with a real source and deadline;
2. one tested share packet that fits mobile first screen;
3. one response shape that works without integration;
4. explicit no-store copy for contacts, chat logs, invite links, channel IDs, and response data;
5. user-observation evidence that recipients understand the packet without extra explanation.

## Next Work

Next pass should design a single file-based preview for `school-or-dorm-prep-share-packet` using source-backed content already in the external ecosystem queue. The preview should not become a public route and should not call itself validated.

## 2026-06-10 Observation Script Pass

[School/Dorm Share Packet Observation Script](./2026-06-10-school-dorm-share-packet-observation-script.md) and [Korean HTML](./2026-06-10-school-dorm-share-packet-observation-script-ko.html) define the next evidence gate for the preview. The first run checks whether 3 recipients understand the four labels, latest-notice priority, no-store values, and manual-copy boundary without extra product explanation. Passing this script can support a `/content-flows` review candidate, but still does not approve a public route, platform integration, automatic posting, reply ingestion, contact storage, or validation claim.

[School/Dorm Share Packet Observation Log Template](./2026-06-10-school-dorm-share-packet-observation-log-template.md) and [Korean HTML](./2026-06-10-school-dorm-share-packet-observation-log-template-ko.html) define how to record each recipient session and the 3-person first-run rollup. The allowed decision labels are `no signal`, `friction`, and `candidate signal`; the log explicitly excludes `validated`, `integration ready`, `public route ready`, and `channel ready`.

[School/Dorm Share Packet Evidence Board](./2026-06-10-school-dorm-share-packet-evidence-board.md) and [Korean HTML](./2026-06-10-school-dorm-share-packet-evidence-board-ko.html) summarize the current status as `no signal` because no recipient sessions have been logged yet. It keeps the next action concrete: run 3 first-run observations, record them, and only then decide between `friction` and `candidate signal`.

## 2026-06-10 Share Packet Preview Pass

[School/Dorm Prep Share Packet Preview](./2026-06-10-school-dorm-share-packet-preview.md) now converts the existing `college-dorm-move-in-checklist` review candidate into a file-based manual share packet. It keeps the work outside `/content-flows` and public routes, uses four response labels (`공지 확인 완료`, `서류 준비 완료`, `반입금지 제외 완료`, `당일 절차 확인 필요`), and carries source URL, latest-notice caution, completion criteria, and no-store boundaries into the packet.
