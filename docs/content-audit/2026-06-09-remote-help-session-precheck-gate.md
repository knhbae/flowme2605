# 2026-06-09 Remote Help Session Precheck Gate

Purpose: turn the `A-` generic remote-help precheck from the Phase 5 compression table into a sharper Stage 0 gate before any public route or integration work.

Status: source/platform comparison and product boundary. This is not user-behavior validation.

HTML view: [Remote Help Session Precheck Gate Korean HTML](./2026-06-09-remote-help-session-precheck-gate-ko.html)

Later route note: [Remote Help Session Public Route Note](./2026-06-10-remote-help-session-public-route-note.md)

## Decision

Keep `anydesk-remote-setup-check` in `/content-flows` review, but do not promote it into a public route.

The next promotable artifact is `remote-help-session-precheck`: a generic checklist that asks the user to choose the least-permission support method before opening a remote-support tool.

Decision: `A-` boundary candidate.

Why:

- The official sources converge on the same permission ladder, not on one vendor-specific setup path.
- A product-specific AnyDesk route can look like FlowMe endorses or manages remote access.
- The safer FlowMe artifact is a method-choice and closeout checklist that stores no remote IDs, passwords, access codes, session links, tokens, screenshots, chats, or device lists.

## Source Freshness

Checked again on 2026-06-09.

| Source | Current evidence | FlowMe reading |
|---|---|---|
| [AnyDesk: Connecting to a remote device](https://support.anydesk.com/docs/connect-to-a-remote-client) | Updated 2026-04-17. A session needs an AnyDesk ID or alias, then either an unattended-access password or manual acceptance. The doc also describes ending the session. | One-time help should default to manual acceptance, and closeout belongs in the primary checklist. |
| [AnyDesk: Set up Unattended Access](https://support.anydesk.com/docs/unattended-access) | Updated 2026-04-17. Unattended access is for managing a device when nobody is present; enabling it requires a password and may involve 2FA or saved-login tokens. | Repeated management is a different mode from one-time support. FlowMe must not store the password, 2FA code, token, or device address. |
| [TeamViewer: Start a screen sharing session via browser](https://www.teamviewer.com/apac/global/support/knowledge-base/teamviewer-remote/remote-control/start-a-screen-sharing-session-via-browser/) | Last modified 2026-03-10. Browser screen sharing can start without installation, and full control is a later upgrade through QuickSupport. | Screen share is the lowest-permission starting point. FlowMe should ask whether viewing is enough before remote control. |
| [Chrome Remote Desktop: Access another computer](https://support.google.com/chrome/answer/1649523?co=GENIE.Platform%3DDesktop&hl=en-en) | Support sharing generates a one-time code; after the helper uses it, the sharer must allow full access and can stop sharing. | One-time codes grant broad control after approval; FlowMe can remind the user to stop sharing, not store the code. |
| [Zoom: Requesting or giving remote control](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065790) | Remote control sits inside screen sharing, requires request/approval, can be stopped, and includes clipboard/auto-accept settings. | Meeting support should stay screen-share-first, with clipboard and auto-accept treated as explicit permission choices. |
| [Microsoft Learn: Use Quick Assist to help users](https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist) | Quick Assist uses a helper code, sharer permission, optional control request, and Microsoft warns users to allow helpers only when they initiated support. | This is the clearest trust gate: verify who initiated support before sharing the screen or allowing control. |

## User Behavior

- User moment: a user is about to receive help from a family member, vendor, coworker, school, or IT support operator.
- Current behavior: they search for one tool's setup guide, share a code or ID, approve control, then often skip closeout.
- What breaks:
  - users may install or enable remote control when screen sharing would be enough;
  - one-time help and repeated/unattended management get collapsed;
  - access values are easy to paste into notes or chats;
  - closeout is treated as optional cleanup instead of part of the support job.

## FlowMe Fit

- Input FlowMe can take: support type, support time, helper/vendor label, support scope.
- Input FlowMe must not take: remote ID, password, access code, session link, token, screenshot, chat transcript, device list, payment or identity details.
- Output FlowMe can produce: method-choice checklist, share-text memo, closeout checklist.
- Natural artifact: `internal_check` with a short memo.
- Minimum anchor: support time or `start now`.
- Stage 0 behavior: choose method, copy checklist, check closeout/revoke step, collect feedback on unclear permission.

## Conversion Decision

Conversion decision:

- User need: As a user about to get remote help, I need to choose the least-permission support method and close access afterward, so that I do not share more control than needed.
- Content shape: official remote-support, screen-sharing, and quick-assist help documents.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 4 primary actions.
- Playbook: source-specific setup checklist.
- Exceptions: do not detect fraud, score security, change vendor settings, or replace employer/school/vendor IT policy.
- Risk/source handling: keep official product facts, practical caution, and FlowMe product boundaries separate.

## Proposed Stage 0 Artifact

| Step | Action | Completion |
|---:|---|---|
| 1 | Confirm who requested support and why | The user initiated support or independently verified the helper/vendor and the support scope. |
| 2 | Choose the lowest sufficient method | Screen share only, one-time remote control, or repeated management is selected before opening a tool. |
| 3 | Prepare the tool without storing secrets | The user prepares a code, session link, ID, or approval dialog outside FlowMe; FlowMe stores none of those values. |
| 4 | Close and review access | The share/session is stopped, temporary access is reviewed, and repeated access is revoked or scheduled for review if no longer needed. |

## Permission Ladder

| Method | When it fits | FlowMe action | Boundary |
|---|---|---|---|
| Screen share only | The helper only needs to see an error, form, or setting | Share only the needed screen/window/tab, then stop sharing | Do not create remote-control tasks if viewing is enough. |
| One-time remote control | A trusted helper needs to click or configure something once | Verify helper, approve the specific request, close the session | Do not store access code, ID, password, link, or chat. |
| Repeated management | A known operator must maintain a device over time | Record owner, purpose, access window, revoke/review date | Do not make FlowMe a device manager, password vault, or audit log. |

## Product Gate

Promote to `/content-flows` review only when all are true:

1. the first visible action is trust/scope confirmation, not tool installation;
2. the artifact asks the method-choice question before any vendor-specific step;
3. closeout is in the primary checklist;
4. every sensitive value is excluded from inputs, detail memo, copy/export, and public route state;
5. source facts are linked to official docs, while practical cautions remain product-boundary copy;
6. the route makes no security guarantee and does not claim to identify scams.

Do not public-promote while any of these are true:

- the candidate is still titled around one vendor as the destination;
- installation appears before support-scope confirmation;
- unattended/repeated access is presented as the default;
- FlowMe asks for, persists, or exports codes, links, IDs, passwords, tokens, screenshots, or support chats;
- the copy implies FlowMe can verify the helper or make remote support safe.

## Implementation Stance

No route/data rewrite in this pass.

Recommended next implementation path:

1. Keep `anydesk-remote-setup-check` as a conditional `/content-flows` review candidate.
2. If the digital setup axis needs the next UI candidate, create `remote-help-session-precheck` as a separate review candidate rather than renaming the AnyDesk source.
3. Add regression coverage before implementation so the generic candidate cannot collect sensitive access values or skip closeout.
4. Only consider a public route after `/content-flows` review proves the method-choice artifact is understandable.

## Rubric Snapshot

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 5
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 5
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: execution clarity still depends on a concrete UI preview. The current artifact is a gate, not a built route.

## Next Candidate Queue

1. `remote-help-session-precheck`: create a generic review candidate only if the next batch needs another digital setup axis.
2. `site-search-console-setup-precheck`: remains `B+` docs-only and should be handled after remote-help unless the user wants webmaster/blog setup first.
3. `flow-export-destination-selector`: keep as a product rule, not a public route.

## 2026-06-09 Review Candidate Pass

The gate is now represented as a separate `/content-flows` review candidate: `remote-help-session-precheck`.

What changed:

- Added `remote-help-session-precheck` to the Korean Flow content candidate set instead of renaming or promoting `anydesk-remote-setup-check`.
- Kept source type as `official` because the artifact is based on cross-vendor official docs, not one creator setup article.
- Kept the candidate conditional, not representative or public-route ready.
- Added user-review and selection-audit metadata so the candidate is covered by the existing review gates.
- Added a regression test that forces the artifact to start with trust/scope confirmation, then permission-method selection, then no-sensitive-value preparation, then close/review access.

Current product stance:

- `/content-flows` review candidate: yes.
- Public `/f/[slug]` route: no.
- Integration or tool-specific setup route: no.
- Sensitive values in FlowMe state, copy, export, or detail memo: no.

Focused verification:

- `npx tsx --test lib\flow\korean-flow-content-candidates.test.ts`
- `npx tsx --test lib\flow\korean-flow-content-user-review.test.ts`
- `npx tsx --test lib\flow\flow-content-selection-audit.test.ts`
- `npx tsx --test lib\flow\flow-content-coverage-axes.test.ts`

## 2026-06-09 Studio Preview Pass

`remote-help-session-precheck` now has a candidate-specific `/content-flows` execution preview instead of falling back to the generic candidate card.

What changed:

- Added a dedicated high-fidelity preview spec in `components/flow/KoreanFlowContentStudio.tsx`.
- The preview title is `원격 도움 세션 권한 사전 체크`.
- The primary artifact keeps four visible checks: request/scope confirmation, screen-share-first method choice, no access-value storage, and session close/review access.
- The candidate rail now shows `실행 UI` for `remote-help-session-precheck`.

Current product stance is unchanged:

- `/content-flows` review candidate: yes.
- Public `/f/[slug]` route: no.
- Remote-support integration, account connection, device management, or tool-specific setup route: no.
- Sensitive values in FlowMe state, copy, export, or detail memo: no.

Verification note:

- The targeted Playwright preview test first failed while the candidate had no `실행 UI` badge.
- After adding the dedicated preview spec, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "content flows studio renders saved execution previews for every candidate" --timeout=120000` passed.
