# FlowMe P34 Execution CRUD UX Final Review

## Verdict

`dependent_preview_ready_sso_protected`

P34 completes the bounded CRUD and execution-command revision on top of the
P33 Draft PR baseline. It changes interaction composition and labels, not the
source, personal overlay, execution run, recurrence occurrence, or export
identity contracts.

P34 is dependent Draft PR
[#157](https://github.com/knhbae/flowme2605/pull/157), based on P33 Draft PR
[#156](https://github.com/knhbae/flowme2605/pull/156). Its
[Vercel preview](https://flowme2605-hks37ahd0-flowme.vercel.app) is READY but
redirects anonymous access to Vercel SSO. Neither P34 nor its canonical
24-Item moving baseline is released to production.

## What Changed

1. Active and archived Flows use one `Flow 관리` command surface on mobile and
   wide layouts.
2. Archive, immediate undo, reload, direct restore, personal backup, and
   archived-only permanent deletion have one predictable hierarchy.
3. Source exclusion, personal Item deletion, completion, occurrence skip/hold,
   and schedule removal use distinct user verbs.
4. Public save-before keeps the actual artifact visible while `Flow 조정`
   reports effective title, included count, and dated count.
5. Memo drafts show title, inclusion, and date first; split, merge, and reorder
   stay behind `구조 편집`.
6. Item editing keeps title, date, and memo before time, place, recurrence, and
   other advanced fields.
7. Calendar uses one roving Tab stop with Arrow, Home/End, and PageUp/PageDown
   navigation.
8. Routine setup remains summary-first and occurrence actions explicitly say
   `이번 회차`.
9. Portable export names `전체`, `선택한`, or `현재 항목` and actual count before
   destination choice.

## Data Safety

- Published source content is never deleted.
- Archive and restore retain the same personal Flow ID.
- Permanent deletion is available only from an archived personal copy.
- Source Item exclusion remains a personal state and preserves personal memo.
- Personal draft deletion remains a reversible tombstone until Flow-level
  permanent deletion.
- Completion/reopen and occurrence skip/hold remain execution state.
- P33 24-Item and legacy 5-Item saved copies are not automatically merged.
- No localStorage migration or new lifecycle state was introduced.

## Evidence

- Route and marker evidence: [route-evidence.json](./route-evidence.json)
- Detailed audit: [audit.md](./audit.md)
- Automated 8-persona x 3-session scorecard:
  [journey-scorecard.json](./journey-scorecard.json)
- Screenshot inventory: [screenshot-manifest.json](./screenshot-manifest.json)
- Screenshots: [screenshots](./screenshots)

Current command evidence:

- P34 command/Calendar/My Flow unit contracts: `15 / 15`
- Full pretest contracts: `73 / 73`
- Full unit suite: `588 / 588`
- Dedicated P34 Playwright: `6 / 6`
- Targeted edit/date/recurrence/export regression: `8 / 8`
- P33/public/source-density regression: `50 / 50`
- Production build: `18 / 18` routes
- Documentation check: `14` required files and `3,150` local links
- Dependency audit: `0` vulnerabilities

The first full Playwright pass exposed five obsolete assertions and one
responsive test race. The assertions were reconciled to the approved command
grammar, the small-library filter experiment was reverted, and the memo test
was made route-stable. The final full-suite result is `326 / 326`.

## Browser Boundary

Automated browser evidence covers 390x844, 1024x768, and 1440x900:

- horizontal overflow: `0`
- unnamed visible interactive controls: `0`
- console/page errors: `0`
- lifecycle menu Escape and focus return: pass
- permanent-delete cancel initial focus: pass
- observed-user sessions: `0`

Screenshots and heuristic simulations are not actual user observation.

## Publish Boundary

- Implementation commit: `108d7d9e2c6e647e4c8352655472e5001d461794`
- Branch: `codex/p34-execution-crud`
- Draft PR: [#157](https://github.com/knhbae/flowme2605/pull/157)
- Base branch: `codex/p33-integrated-program-plan`
- Preview: <https://flowme2605-hks37ahd0-flowme.vercel.app>
- Preview state: READY, anonymous access redirects to Vercel SSO
- Merge to `main`: false
- Production deploy: false

The first GitHub CI run encountered newly published high-severity advisories
before app verification. P34 updates only the affected transitive tooling
boundary to `postcss 8.5.23` and `brace-expansion 5.0.8`; `npm audit` is now
zero, unit and build remain green, and no app data contract changes. Independent
Claude Design and Codex review should use the Draft PR, evidence package, and
protected preview. P33 and P34 require separate approval before any merge or
production deployment.
