# FlowMe P18 -> P19 Persona Review Package

- Prepared: 2026-07-09
- Source package: `docs/content-audit/2026-07-09-claude-design-p18-final-review-package/`
- Purpose: Claude Design review handoff for a P19 product/UX backlog.
- Scope: no app changes. This package reorganizes the latest P18 screenshots and evidence by persona and situation.

## Files

- [review.html](./review.html): persona-based visual review board.
- [audit.md](./audit.md): scenario checklist, user feedback focus, and evidence summary.
- [prompt-ko.md](./prompt-ko.md): copy-paste prompt for Claude Design.
- [screenshot-index.md](./screenshot-index.md): grouped screenshot list.
- [screenshots/](./screenshots/): copied latest P18 final screenshots, mobile 390px and wide 1024px.

## How Claude Design Should Review

Claude Design should not treat this as only a polish pass. The important question is whether FlowMe's product flow is now coherent:

1. A user brings a URL or memo.
2. FlowMe finds an executable Flow or captures a draft request.
3. The user saves a personal copy.
4. My Flow becomes the task-first execution hub.
5. Calendar becomes the date-first execution surface.
6. Public `/f` remains a shared save/export entry.
7. Studio/creator remains a secondary surface unless there is enough product reason to promote it.

## Persona/Situation Groups

1. First-time user: `/` -> `/flows` -> `/my` -> `/calendar`
2. URL-first hit/custom-start user
3. URL-first miss/candidate/draft-gate user
4. Public share recipient
5. My Flow repeat user
6. Calendar-heavy user
7. Creator/studio direction reviewer

## Current Evidence Highlights

- Normal user route internal/technical guardrail hits: 0
- URL-first visible Markdown hits: 0
- Candidate user-copy internal hits: 0
- Miss draft gate visible: true
- Miss draft gate implies live AI: false
- Calendar same-date distinct Flow groups: 2
- Calendar agenda grouped by Flow: true
- My Flow today frame count: 1
- My Flow today remaining-count sources: 1
- My Flow inline complete controls: 5
- Public sticky save/setup first actions: 9
- My Flow anchor edit entry visible: true
- Wide horizontal overflow: 0

## Suggested Review Output

Ask Claude Design to produce:

- Blocking / High / Medium / Low P19 backlog.
- Persona-by-persona findings.
- Product direction recommendations, not only UI polish.
- Explicit notes on Calendar progress clarity, public `/f` unit hierarchy, My Flow action consistency, URL-first edit/draft model, and Studio priority.
