# 2026-06-08 Remote Support Adjacent Service Comparison

Purpose: compare the AnyDesk remote-support candidate against adjacent official remote-support and screen-share products before deciding whether FlowMe should promote the digital setup axis beyond `/content-flows` review.

Status: source/platform comparison, not user-behavior validation.

HTML view: [2026-06-08 Remote Support Adjacent Service Comparison 한국어 HTML](./2026-06-08-remote-support-adjacent-service-comparison-ko.html)

## Decision Summary

Keep AnyDesk as a `/content-flows` review candidate, but do not promote a public route yet.

The durable FlowMe opportunity is not "AnyDesk setup." It is a lightweight remote-help precheck that helps a user choose the lowest sufficient support method:

1. screen share only;
2. one-time remote control with manual approval;
3. repeated or unattended remote management.

FlowMe should stay at Stage 0 as an export/checklist surface. It should not store remote IDs, passwords, access codes, session links, tokens, screenshots, support chats, or device lists.

## Official Source Snapshot

Checked on 2026-06-08.

| Service | Official source | Evidence cue | FlowMe reading |
|---|---|---|---|
| AnyDesk | [Connecting to a remote device](https://support.anydesk.com/docs/connect-to-a-remote-client), [Set up Unattended Access](https://support.anydesk.com/docs/unattended-access) | connection requires an AnyDesk ID or alias, then either an unattended-access password or manual acceptance; unattended access is disabled by default and can enable repeated access | useful source candidate, but sensitive values must stay outside FlowMe |
| TeamViewer | [Provide attended remote support](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-remote/remote-control/provide-attended-remote-support/), [Provide unattended remote support](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-remote/remote-control/provide-unattended-remote-support/), [Start a screen sharing session via browser](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-remote/remote-control/start-a-screen-sharing-session-via-browser/) | separates attended support, unattended support, and browser-based screen sharing; unattended support requires host setup while screen sharing can start without installation | strongest comparator for the permission ladder, not a Stage 0 integration target |
| Chrome Remote Desktop | [Access another computer with Chrome Remote Desktop](https://support.google.com/chrome/answer/1649523?co=GENIE.Platform%3DDesktop&hl=en-en) | support sharing uses a generated one-time code; the code grants full access after confirmation and the user can stop sharing; remote access has a PIN path | good one-time code model; FlowMe should remind the user that code sharing is full access |
| Zoom | [Requesting or giving remote control](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065790) | remote control sits inside an active screen share, requires approval, can be stopped by stopping remote control or the share, and may include clipboard options | useful "screen share before remote control" distinction; not a remote-support setup integration |
| Microsoft Quick Assist | [Solve PC problems remotely using Quick Assist](https://support.microsoft.com/en-us/windows/solve-pc-problems-remotely-using-quick-assist-b077e31a-16f4-2529-1a47-21f6a9040bf3), [Use Quick Assist to help users](https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist) | helper shares a 6-digit code; the sharer allows screen sharing, can allow or cancel full control, and Microsoft warns users to verify who they are connecting to | strong built-in comparator for one-time support and trust-gate copy |

## Permission Ladder

The comparison shows three user jobs that should not be collapsed into one checklist.

| User job | Typical services | Natural artifact | FlowMe Stage 0 behavior | Product decision |
|---|---|---|---|---|
| Show a problem without handing over control | Zoom screen share, TeamViewer browser screen share | short memo/checklist | ask user to share only the needed screen/window/tab and stop share after support | `stage0_export_only` |
| Let a trusted helper control once | Chrome Remote Desktop support code, Quick Assist, AnyDesk manual acceptance, TeamViewer attended session, Zoom remote control | internal checklist + closeout memo | verify helper, confirm purpose, generate/share code or approve request, stop session, review access | `stage0_export_only` |
| Let a known operator manage a device repeatedly | AnyDesk unattended access, TeamViewer unattended support, Chrome Remote Desktop remote access | setup policy memo | document owner, purpose, access window, revoke date, and offboarding check without storing credentials | `future_platform` |

## Conversion Decision

Potential generic candidate: `remote-help-session-precheck`.

- User need: As a user about to get remote help, I need to choose the least-permission support method and close access afterward, so that I do not share more control than needed.
- Content shape: official remote support, screen share, and quick-assist help documents.
- Primary destination: `internal_check`, with a short memo/share-text output.
- Structure: `checklist`.
- Action count: 4 source-derived actions.
- Playbook: source-specific setup checklist.
- Exceptions: do not claim to detect fraud; do not provide security scoring; do not replace vendor, employer, school, or family IT policies.
- Risk/source handling: keep official product steps, practical caution, and FlowMe product boundaries separate.

Suggested actions:

| Step | Action | Completion |
|---:|---|---|
| 1 | Confirm who requested support and why | The user initiated or independently verified the helper/vendor and the exact support scope. |
| 2 | Choose the lowest sufficient method | Screen share only, one-time remote control, or repeated management is selected before opening a tool. |
| 3 | Prepare the tool without storing secrets | The user prepares a code, session link, ID, or approval dialog, but FlowMe stores none of those values. |
| 4 | Close and review access | The session/share is stopped, temporary access is reviewed, and repeated access is revoked or scheduled for review if no longer needed. |

## Phase 5 Compression

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision |
|---|---|---|---|---|---|---|
| AnyDesk remote-support setup | AnyDesk official help + Korean setup/security sources | User prepares remote PC help and must avoid leaving access unmanaged | internal checklist | support time or none | open, choose support type, copy checklist, check closeout | `stage0_export_only` as review candidate |
| TeamViewer permission ladder comparator | TeamViewer attended, unattended, and browser screen-share docs | User decides whether screen share, attended support, or unattended access is appropriate | decision checklist | none | compare method, copy method-choice checklist | `stage0_export_only` comparator |
| Chrome Remote Desktop one-time support | Google Chrome Help | User shares a support code and must understand it grants full access | closeout checklist | none | code/share reminder, stop-session check | `stage0_export_only` reference |
| Zoom screen-share remote control | Zoom Support | User is already in a meeting and needs to decide whether screen sharing is enough | meeting-control memo | meeting time | approval and stop-share checklist | `stage0_export_only` reference |
| Microsoft Quick Assist trust gate | Microsoft Support/Learn | Windows user receives or gives one-time help through a code | trust-gate checklist | none | verify helper, allow/cancel control, leave session | `stage0_export_only` reference |

## Product Decision

- Current decision: keep AnyDesk as `/content-flows` review, but do not create a public `/f/[slug]` route yet.
- Stronger next candidate: a generic remote-help precheck that includes AnyDesk as one example source rather than the destination itself.
- Why: official sources converge on the same permission-choice problem, while a product-specific AnyDesk route could look like FlowMe endorses or manages a remote-access tool.
- Next action: keep this as a product boundary note and compare it with the non-remote digital setup axis in [2026-06-08 Search Console Digital Setup Comparison](./2026-06-08-search-console-digital-setup-comparison.md).

Do not build:

- AnyDesk, TeamViewer, Chrome Remote Desktop, Zoom, or Quick Assist integration;
- device/address-book storage;
- password, access-code, session-link, or token storage;
- remote session log or screenshot archive;
- support ticketing;
- fraud detection, security scoring, or security guarantee;
- automated permission changes inside any remote-support tool.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 5
- Source/Safety: 5
- Accessibility/Operability: 4

The candidate is useful because the user's next action is clear. It remains risky because the category can be misread as security advice. The public route should wait until the FlowMe artifact is framed around method choice and closeout, not tool setup.
