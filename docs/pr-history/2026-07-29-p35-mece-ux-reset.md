# P35 MECE UX Reset and workspace consolidation

- Date: 2026-07-29
- PR: [#161](https://github.com/knhbae/flowme2605/pull/161)
- Head branch: `codex/workspace-consolidation-20260729`
- Merge: `4a51b08ce9c5410f4ddf492562a5e885b0fda09c`
- Status: `Merged`, `Deployed`
- Production: <https://flowme2605.vercel.app>

## Why

Consolidate the P35 runtime candidate and the selected planning/research evidence
onto `main`, then make the current release, validation, and remaining evidence
boundaries explicit.

## What changed

- Replaced persistent Home navigation with a state-based `/` entry router and
  three primary destinations: `Flow 찾기`, `캘린더`, and `내 Flow`.
- Made cross-Flow date-grouped `할 일` the normal `/my` entry while preserving
  the adjacent Flow library and focused Flow workspace.
- Kept the first post-save whole-plan expansion session-only and one-time.
- Preserved P34 identity, local persistence, recurrence, lifecycle, and export
  contracts without a storage/schema migration.
- Consolidated a broad set of product, UX, content, and research evidence. The
  PR contained 13 commits and 1,062 files, so release behavior and research
  artifacts must remain distinguishable when reviewing its history.

## Not done

- No observed-user validation; observed-user sessions remain `0`.
- No real Google, Outlook, or Apple Calendar/VTODO round-trip.
- No account-backed persistence, cross-device recovery, or creator/update pilot.
- The later PR #162 closeout records a bounded six-scenario production smoke at
  390px and 1024px without linking its raw artifact. The literal-route
  hardening follow-up did not independently rerun that production smoke.

## Decisions

- `/` routes by the presence of a valid saved Flow or saved Flow Map entry; it
  owns no independent Home surface.
- Literal `/my` opens cross-Flow `할 일`; `Flow` remains the saved library and
  focused workspace.
- Automated QA, Preview, Production deployment, and HTTP reachability are not
  observed-user validation.

## Important files

- `components/flow/EntryRouter.tsx`
- `components/flow/PlatformNav.tsx`
- `components/flow/AppClient.tsx`
- `lib/flow/my-flow-cross-flow-todo.ts`
- `lib/flow/my-flow-local-ia.ts`
- `docs/specs/2026-07-26-flowme-mece-ux-reset/`
- `docs/content-audit/2026-07-29-p35-r13-final-internal-gate/`

## Verification

- PR CI
  [30425149316](https://github.com/knhbae/flowme2605/actions/runs/30425149316):
  Docs/Unit/Build and Playwright E2E passed.
- Post-merge main CI
  [30425766217](https://github.com/knhbae/flowme2605/actions/runs/30425766217):
  Docs/Unit/Build and Playwright E2E passed.
- Recorded release counts: unit `694 / 694`, P35 Playwright `79 / 79`, full
  Playwright `405 / 405`.
- Vercel Preview succeeded for head `ebf480f`; Vercel Production succeeded for
  merge `4a51b08`. The immutable deployment URLs require Vercel SSO.
- Canonical production returned HTTP 200. PR #162 subsequently recorded the
  bounded production smoke as `6 / 6` without a linked raw artifact; this
  history keeps that prior closeout record separate from verification rerun by
  the literal-route hardening.

## Risks

- The PR's 1,062-file consolidation scope is much broader than the P35 runtime
  review unit.
- Fixture-heavy R13 evidence did not directly prove literal `/my` and
  `/my?experiment=off` with a real public-save record.
- Observed-user comprehension, larger-workspace normalization, and external
  destination round-trips remain unverified.

## Follow-ups

- Use the [P35 literal-route release-evidence follow-up](../content-audit/2026-07-29-p35-release-hardening/README.md)
  for the two non-fixture regression cases.
- Keep that follow-up's Git/PR publication record separate; it does not
  retroactively change PR #161's verification or observed-user count.
