# Roadmap

**Last Updated:** 2026-07-22<br>
**Current Version:** v0.1.0 (released product PoC)<br>
**Current Validation Stage:** internal alpha / P29 production closeout complete, independent review pending<br>
**Next Version:** v0.2.0 (coherent personal execution workspace)<br>
**Next Milestone:** Independent P29 design/code review and owner decision before any P30 definition

Human-facing control surface: [FlowMe backlog control board](./content-audit/2026-07-15-flowme-backlog-control-board-ko.html).

## Released Baseline

> Release history lives in [HISTORY.md](./HISTORY.md).

v0.1.0 supports the browser-local product loop below:

```text
URL or memo -> prepared Flow or draft -> save -> personal edit
-> My Flow and Calendar execution -> completion -> export -> reuse/version review
```

This is a functioning product PoC with automated and browser QA. It is not evidence that repeated users understand, trust, or retain the product.

## P29 Coordinated Surface Reset

Owner, Codex, and Claude Design review agreed that P28's data and identity contracts should stay, but save-before, saved receipt, routine setup, My Flow, Calendar, and result/export composition need a coordinated reset rather than token polish or a planner rewrite.

Detailed execution plan: [P29 coordinated surface reset](./specs/2026-07-22-p29-coordinated-surface-reset/plan.md).

| Slice | Purpose | State |
| --- | --- | --- |
| P29-01A | Extract shared save-before anatomy from the large AppClient composition without visual or contract change | Complete |
| P29-01B | Prove artifact-first save-before and a distinct receipt on moving only | Complete |
| P29-02 | Roll the approved composition across public/source-backed five-shape routes | Complete |
| P29-03 | Make routine setup summary-first with progressive disclosure and occurrence continuity | Complete |
| P29-04 | Rebuild My Flow as an action-first library/detail workspace | Complete |
| P29-05 | Unify Calendar scope, selected-day agenda, and undated placement | Complete |
| P29-06 | Connect artifact recommendation, export scope, loss preview, and receipt vocabulary | Complete |
| P29-07 | Close shared visual, responsive, keyboard, and accessibility gates | Complete by current command/browser evidence |
| P29-08 | Run independent production integration and closeout | Complete and released through PR #146 and merge `10e6e515` |

The moving vertical proof passed before the shared rollout. P29 evidence is P29 Playwright `13 / 13`, full Playwright `292 / 292`, unit `584 / 584`, production build `18 / 18`, `23` implementation screenshots, and `9` canonical production screenshots. P29 preserves P28 projection and stable identity contracts. [PR #146](https://github.com/knhbae/flowme2605/pull/146) merged as `10e6e515`; post-merge CI passed and canonical production smoke is `9 / 9` with overflow/unnamed-focusable/console-page-error counts `0`. External user observation remains deferred and is not implied by these results. P30 is not defined until independent review and owner judgment identify a concrete evidence gap.

## P28 Cross-Surface Experience Reconstruction

P28 responds to current owner feedback after the P27 production closeout. The product already has most lifecycle capabilities, but save-before adjustment, workout routines, My Flow, and Calendar use inconsistent or over-dense interaction patterns. P28 therefore starts with a comparison simulation rather than another immediate UI patch.

Detailed scope: [P28 experience reconstruction spec](./specs/2026-07-21-p28-experience-reconstruction/spec.md).

Feedback reconciliation: [owner/Codex/Claude synthesis](./specs/2026-07-21-p28-experience-reconstruction/feedback-reconciliation.md).

Detailed backlog: [P28-01~P28-08](./specs/2026-07-21-p28-experience-reconstruction/tasks.md).

| Slice | Purpose | State |
| --- | --- | --- |
| P28-01 | Compare whole-Flow, artifact-first, and Hybrid composition across save-before, routine, My Flow, and Calendar | Complete; Hybrid selected |
| P28-02 | One projection contract for outline, item role, completion eligibility, and five artifact shapes | Complete |
| P28-03 | Whole-Flow save-before workspace with natural title/date/memo adjustment | Complete as current source/browser evidence |
| P28-04 | Remove workout-only execution grammar and unify routine definition, occurrence, resource, and note | Complete as current source/browser evidence |
| P28-05 | Reconstruct My Flow browse/search/detail hierarchy for 1/5/20/50 Flows | Complete through 27-Flow fixture; 50+ observation remains |
| P28-06 | Replace unbounded Calendar Flow chips with a scalable scope picker and shared occurrence row | Complete through 12-Flow fixture |
| P28-07 | Connect five actual-data shapes, representative content, source/safety gate, and export parity | Complete for five representative production Flows |
| P28-08 | Integrated regression, independent handoff, and owner readiness decision | Released through PR #144 and merge `9a839d02`; owner/independent verdict pending |

The five artifact shapes are `Flow execution`, `Calendar`, `Checklist/Todo`, `Sheet`, and `Memo`. They are representative projections, not a permanent five-card gallery or fifth navigation tab. Each Flow shows one content-native primary result and only meaningful secondary results.

P28 changed component composition and visual hierarchy without rewriting source, personal overlay, execution run, recurrence occurrence, or export identity. [PR #144](https://github.com/knhbae/flowme2605/pull/144) merged as `9a839d02`, and Vercel deployment `dpl_6wyYqhweXvJPDiFqCQLsNp18gHXQ` is READY at <https://flowme2605.vercel.app>. It did not add AI, crawler, account persistence, OAuth, or a heavy planner. External user observation remains deferred until an explicit owner decision after the [P28 final review](./content-audit/2026-07-22-p28-final-review-package/README.md).

## P27 Flow Lifecycle Workspace Reconciliation

P27 preserves P26's canonical Flow, source/personal/run/occurrence ownership, and projection identity. It reconciles the journey from save-before adjustment through My Flow execution, Calendar, export, archive, and restore.

Detailed scope: [P27 lifecycle workspace spec](./specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md).
Internal closeout: [P27 final package](./content-audit/2026-07-21-p27-lifecycle-workspace-final/README.md).
Production closeout: [P27 canonical production evidence](./content-audit/2026-07-21-p27-production-closeout/README.md).

| Track | Result | State |
| --- | --- | --- |
| Foundation | meaningful `/flows` and `/my` server document, Calendar named wrappers | Internally complete |
| Reversible lifecycle | Flow archive/undo/restore and source-safe Item exclusion | Internally complete |
| Routine/resource | preview horizon vs series end, resource vs subcheck | Internally complete |
| Save-before | whole preview and one active adjustment operation | Internally complete |
| My Flow | adaptive compact/searchable library and whole-workspace result | Internally complete |
| Calendar/export | scope parity, compact receipt and export preflight | Internally complete |
| Integration | pretest `24`, unit `571`, E2E `339`, production screenshots `8` | Released through PR #141 and merge `2829b37`; production browser green |

P27 does not claim observed usability. Search threshold, first adjustment mode, archive wording, and resource discovery remain human-study questions. Permanent delete, account persistence, direct integrations, and real AI/crawler remain gated.

## P26 Structural Correction Program

P26 preserves P25's source/personal/run ownership, whole-Flow artifact, reversible completion, Calendar placement, and scoped export. It corrects the product object, discovery hierarchy, save/adjust journey, content-shape reading model, Calendar density/filtering, and editing discoverability after first closing date, recurrence, receipt, memo, and projection correctness.

Detailed scope: [P26 program spec](./specs/2026-07-20-p26-program/spec.md).
Decision package: [P26-00C product-object and journey decision](./content-audit/2026-07-20-p26-00c-product-object-journey-decision/README.md).

| Stage | Slices | Purpose | State |
| --- | --- | --- | --- |
| Decision | P26-00C | One Flow object, integrated discovery card, dual save/adjust path, adaptive whole Flow, Calendar tray/editor decision | Complete as internal implementation contract |
| Correctness | P26-01~05 | Date intent, canonical receipt, recurrence, memo segmentation, projection identity | Complete as current command/browser evidence |
| Discovery/save | P26-06~07 | Unified cards, save-before, wedding entries, post-save hub | Complete as current browser evidence |
| My Flow/edit | P26-08~13 | Local IA, adaptive whole Flow, progressive/structural/batch edit, completion, reuse | Complete as current command/browser evidence |
| Calendar/export | P26-14~16 | Undated placement, Flow filter/date move, explicit export result | Complete as current command/browser evidence |
| Integration | P26-17~20 | Visual/copy system, responsive workspace, six-journey gate, release | Complete and released; production smoke `12 / 12` |

P26 is an internal product and implementation program. It does not reopen participant recruitment until the owner explicitly chooses to do so.

## P25 Execution Workspace Correction

Owner, Codex, and Claude Design feedback reopened the product frame after P24 implementation closeout. P25 is not another broad polish loop. It must make the complete personal Flow, optional scheduling, bounded personal adjustment, execution state, Calendar, and export read as one model.

Detailed scope: [P25 Execution Workspace Foundation](./specs/2026-07-19-execution-workspace-foundation/spec.md).
Review board: [P25 UX feedback reconciliation](./content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/README.md).
Prototype gate: [P25-00B core workspace decision](./content-audit/2026-07-19-p25-00b-core-workspace-prototype-decision/README.md).

| Slice | Purpose | Gate |
| --- | --- | --- |
| P25-00A | Reconcile owner/Codex/Claude feedback and official references | Done; structural correction and staged scope recorded |
| P25-00B | Compare core mobile/wide workspace prototypes and capture owner decisions | Closed as the internal implementation baseline; all nine Option B surfaces kept, with three Medium refinements deferred to P26 |
| P25-01A | Canonical routine series/occurrence projection | Done by current unit/browser evidence; public preview, My Flow Calendar, and ICS now share source cadence and stable occurrence identity |
| P25-01B | Memo draft split and count integrity | Done by current unit/browser evidence; no generic filler, explicit acceptance, stable IDs, and accepted/saved/reloaded/list-export parity |
| P25-02A | Whole-Flow hierarchy and post-save handoff | Done by current browser evidence; exact full artifact, saved-Flow selection, local `지금 / 내 Flow / 완료`, and persistent completion cancel |
| P25-02B | Responsive whole-Flow workspace composition | Done by current browser evidence; selected Flow fills the canvas, mobile drills in, and 1024px supports outline/detail or rail/outline/detail without duplicate completion controls |
| P25-03A | Progressive single-item adjustment | Done by current browser evidence; common values remain visible and advanced schedule stays collapsed with a concise saved-value summary |
| P25-03B | Selected-item batch adjustment | Done by current unit/browser evidence; temporary selection replaces completion, previews date impact, preserves overlays, preselects export scope, and permits removal only with recovery |
| P25-04 | Anytime task model and Calendar placement queue | Done by current browser evidence; My Flow executes Anytime tasks and Calendar places selected tasks on today or a chosen date without duplicate completion controls |
| P25-05 | Completion/reopen and export scope parity | Done by current unit/browser evidence: one occurrence/control, persistent reopen, scope before format, and canonical destination counts. |
| P25-06/07 | Public artifact simplification and shared responsive visual language | Done by current browser evidence; one read-only public artifact, title-first execution rows, shared actions/sheets, explicit date-free language, and held-occurrence recovery |
| P25-08 | Internal six-journey integration gate | Done by current command/browser evidence: six shapes, representative `9 / 9`, related regression `81 / 81`, screenshots `36`, automated Blocking/High `0`; observed users remain `0 / 15` |

P25 is released as the internal production baseline. Foundation PR #136 merged as `bd5f201c`; production smoke then exposed a timezone-boundary hydration issue, which hotfix PR #137 fixed and merged as `b0fb899c`. The canonical Vercel service is anonymous and READY. Current verification is unit `526 / 526`, Playwright `286 / 286`, production build green, high/critical audit findings `0`, and live smoke `12 / 12` with HTTP/redirect/overflow/console-page error counts all `0`. Option B remains implementation authorization and automated evidence, not observed-user validation.

### Stage 0 First Flag MVP

| Item | Description | Status |
| --- | --- | --- |
| First flag flow | Parenting/infant vaccination and checkup preparation route | Released, observation pending |
| Alternate route | Moving D-30 timeline route for lower-risk comparison | Released, observation pending |
| Execution actions | Save, edit, schedule, complete/reopen, export, note, and reuse | Implemented, observation pending |
| Source-backed conversion readiness | Exact source replacement, natural artifact simulation, and source/risk separation before representative framing | Implemented baseline |
| Verification | Unit tests, production build, Playwright E2E, public production | Automated green; human evidence pending |

## Current P24 Completion Gate

Detailed status lives in the [P24 completion audit](./content-audit/2026-07-14-p24-completion-audit/README.md) and [P24 execution-trust spec](./specs/2026-07-14-p24-execution-trust-ux-simplification/spec.md).

| Item | Description | Status |
| --- | --- | --- |
| P24 implementation | Date/effective projection, recurrence, draft integrity, completion undo, editor, Calendar tray, export scope, execution notes | Done by automated evidence |
| P24-00OPS1 | Public anonymous production URL | Done |
| P24-00OPS2 | Controlled dependency upgrade with high `0`, build/E2E, and rollback | Done |
| P24-J0 | Save, personalize, execute journey decision package | Done; artifact-first, optional adjustment, first-save whole-Flow frame selected |
| P24-J1 | Save decision surface | Done and deployed |
| P24-J2 | Post-save full artifact | Done and deployed |
| P24-J3 | My Flow/Calendar/held role cleanup | Done and deployed |
| P24-J4 | Integration and regression | Done; automated Blocking/High 0 and browser evidence captured |
| P24-J5 | Internal production readiness | Done; PR #128, merge `616025bf`, production READY |
| P24-00B | Five real participants x three sessions | Deferred until explicit owner reopen after P24-J5, `0 / 15` |
| P24-00C | Keep/change/defer and observed fixes | Pending P24-00B |
| P24 final | Internal regression, production deploy, and observation-readiness package | Done as `implementation_complete_observation_not_started`; observed users `0 / 15` |

## P24 Journey-Frame Correction Gate

Owner feedback identified a first-use framing gap after the execution model became feature-complete: users must read too much explanation before saving, cannot immediately confirm the whole saved artifact, and can confuse My Flow scope with Calendar filtering. The current recommendation is a bounded reset, not a 4-tab or schema rewrite.

Detailed scope: [Save, Personalize, Execute Journey Reset](./specs/2026-07-18-save-personalize-execute-journey-reset/spec.md).

| Slice | Purpose | Gate |
| --- | --- | --- |
| P24-J0 | Current replay, alternative wireframes, owner review, and independent heuristic review | Select one implementation direction without recruiting users |
| P24-J1 | Artifact-first save preview and optional lightweight adjustment | User predicts what save/adjust will do |
| P24-J2 | Post-save whole-Flow confirmation, returning Today preserved | Whole Flow visible with action depth 0 |
| P24-J3 | My Flow/Calendar role cleanup, undated tray, held-content visibility | Held ordinary count 0; dated/undated roles clear |
| P24-J4 | Integrated implementation, regression, production deploy | Automated Blocking/High 0 |
| P24-J5 | Independent production-readiness audit | Deployed journey has Blocking/High 0; owner decides whether observation may be reopened |

## Operating Queue

There is no active external-user gate. P27 remains canonical production while P28 begins with a docs/prototype-only architecture gate. External user observation stays outside the queue until the owner explicitly reopens it after P28-08.

| Lane | Owner | Work | Next checkpoint | Done when |
| --- | --- | --- | --- | --- |
| Active | AI + owner decision | P28-01 cross-surface comparison simulation | Compare current and three proposed compositions with real fixtures at 390/1024/1440 | Selected anatomy scores at least 4.0 with hard fail 0; otherwise replan |
| Planned | AI | P28-02~07 staged implementation | Begin only after P28-01 decision | Each slice closes its contract, browser, and regression gate before the next |
| Planned | AI + Claude Design + owner | P28-08 final independent review | Reconcile correctness and design findings | Automated/browser Blocking/High 0 and owner readiness decision recorded |
| Completed | AI | P25-06/P25-07 public artifact and visual integration | Preserve one public artifact and shared responsive action vocabulary | Current browser evidence stays green; observed users remain 0 |
| Completed | AI | P25-01~P25-05 correctness, whole-Flow workspace, personal adjustment, Anytime placement, completion, and export | Preserve canonical projection, source/personal/run ownership, and browser evidence | Current unit/browser evidence stays green; observed users remain 0 |
| Completed | AI | P25-08 internal six-journey gate | Preserve current mobile/wide integration evidence | Automated Blocking/High 0 and owner decision package exist; observed users remain 0 |
| Completed | AI | P25 release closeout | Preserve PR #136/#137 and final live-smoke evidence | Production serves `b0fb899c`; observed users remain 0 |
| Completed | AI | P26-10 quick/advanced item editor | Keep title/date/memo immediately editable and disclose uncommon schedule controls only when needed | Mobile full-screen and wide detail-pane edit paths pass current browser evidence |
| Completed | AI | P26-11 structural and batch editing | Separate add/delete/restore/reorder and multi-item changes from single-item quick adjustment | Personal draft structure is recoverable, projection-safe, and source-backed controls remain absent |
| Completed | AI | P26-12 completion undo and reopen | Preserve one occurrence/control while making completion immediately and persistently reversible | Undo and reopen preserve run/occurrence identity without structural mutation |
| Completed | AI | P26-13 reuse and anchor policy | Preserve separate anchor-linked and personally fixed dates without rewriting past runs | Reuse preview and saved result preserve date intent, identity, and history |
| Completed | AI | P26-14 undated inbox and batch scheduling | Preserve one explicit undated object and atomic placement/undo | Mobile drawer, wide rail, persistence, removal undo, and ICS count parity remain green |
| Completed | AI, then owner/Claude Design | P26-15 Calendar Flow filter and date move | Keep Flow scope, grid, agenda, count, and single/batch movement on one projection | Filter mismatch is 0 and date movement has preview plus rollback |
| Completed | AI, then owner/Claude Design | P26-16 unified export scope and result | Keep selected scope, destination count, generated payload, and result receipt on one projection | Export count mismatch and duplicate rows are 0 |
| Completed | AI, then owner/Claude Design | P26-17 execution component and copy system | Preserve shared execution primitives, tokens, and action labels without changing product ownership contracts | Shared summary/outline/row/receipt/editor/export primitives pass current command/browser evidence |
| Completed | AI, then owner/Claude Design | P26-18 responsive execution workspace | Preserve mobile drill-in/sheets, wide task-focused panes, and explicit pending/error states | Overflow/overlap and keyboard blockers are 0 at 390x844 and 1024x768 |
| Completed | AI, then owner/Claude Design | P26-19 six content-shape journey gate | Preserve six representative Flow shapes as one reproducible current command/browser harness | `7 / 7` representative and `15 / 15` migrated P24 regressions stay green; observed users remain 0 |
| Completed | AI, then owner/Claude Design | P26-20 final release gate | Preserve PR #139, canonical deployment, and final production evidence | CI E2E `327 / 327`, production smoke `12 / 12`, and release state is explicit |
| Completed | AI + owner direction | P24-J0~J5 bounded implementation | Selected, implemented, merged, deployed, and production-checked the artifact-first frame | P24 remains a baseline, not the final UX |
| Deferred | User, by explicit future decision | Observed sessions | Reopen only when the owner judges the P25 frame ready to show users | Recruitment begins; current count stays `0 / 15` until then |
| Blocked | AI, after future human evidence | P24-00C synthesis and narrow correction | Classify keep/change/defer only after real session evidence exists | Findings are prioritized and any Blocking/High fix is re-observed |
| Parallel human check | User | Real Calendar import and duplicate import | Import the same ICS twice in one configured app | Result and duplicate behavior are recorded |
| Parallel human check | User | Real backup and restore | Restore one backup in another browser or device | Transfer result and friction are recorded |
| Review shelf | User, non-blocking | Prompt Lab and recent strategy artifacts | Read when choosing the post-observation investment | Feedback is recorded without delaying P24 sessions |

## Human Validation Gates

These gates cannot be closed by automated tests or simulated personas.

| Gate | Current state | Pass condition |
| --- | --- | --- |
| Repeated use | `0 / 15`; not scheduled | Owner explicitly reopens a 5 participants x 3 sessions study after P24-J5 |
| Calendar import | Parser/Office evidence only | One configured Calendar app plus duplicate-import result |
| Cross-device recovery | Automated/local evidence only | One real browser or device transfer |
| Persistence decision | Undecided | Decide from observed continuity expectations |

## Next Decision

Complete P28-01 before production implementation. Choose or revise one cross-surface composition that lets users see the whole Flow, preview actual destination data, adjust only the current need, and encounter the same item/occurrence/resource grammar in My Flow and Calendar. Reject any alternative that retains workout-only completion states, a 1024px fixed three-pane layout, or an unbounded horizontal Flow selector. Do not recruit participants yet. Account persistence, creator/update pilot, production URL/AI backend, direct integrations, permanent delete, and observed-user recruitment remain gated.

## Gated Backlog

### Product And Value Chain

- Feedback/correction transport, moderation, and response states.
- Creator pilot, canonical publishing, and update workflow.
- Honest review, use, and maintenance signals from real data.
- Content freshness, rights, localization, and portfolio focus.

### Platform

- Canonical runtime database migration, Auth, RLS, and rollback.
- Account-backed persistence and cross-device synchronization.
- Production URL fetch/extraction and a real LLM provider.
- Direct Calendar, Notion, Todo, and Sheets integrations.

### Long Horizon

- Flow Pack / Flow-of-Flows.
- Marketplace, payments, community, and creator revenue systems.
- Experience graph and aggregate value or growth views.

The gates and revisit conditions for uncommitted directions remain in [IDEAS.md](./IDEAS.md). Approved multi-step work remains in [docs/specs/](./specs/README.md).
