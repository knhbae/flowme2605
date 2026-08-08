# R2 My Flow Library Controller QA

## Baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Existing local IA + Calendar controller units | PASS | `25/25` before R2 edits. |
| Confirmed browser regression | FAIL | At 1024px, Plan -> Item -> query -> list -> same Plan restored the old Item while the URL had no `item`. |
| Console during reproduction | PASS | Error and warning count `0`; the issue is state coherence, not a runtime exception. |

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Pure R2 controller unit tests | PASS | `15/15`; includes structural purity, direct entry, list/Plan/Item history, route sync, focus, and scroll contracts. |
| `npm.cmd run docs:check` | PASS | Final documentation check passed after this evidence update. |
| `npm.cmd run test:p35-appclient-lock` | PASS | `59/59`. |
| `npm.cmd test` | PASS | Pretest `153/153`; full unit/contract `615/615`. |
| `npm.cmd run build` | PASS | Next.js production build compiled, type-checked, and generated `18/18` static pages. |
| `npm.cmd run security:audit` | PASS | `0` vulnerabilities at the repository's `high` audit threshold. |
| Saved-plan selected E2E | PASS | `18/18`, including stale Item, dirty query/filter, browser Back, completion notice, direct entry, and cross-Flow history. |
| Calendar selected E2E | PASS | `2/2`; also covered by the final full browser run. |
| Full Playwright | PASS | Final run `542/542` with four workers. An earlier run exposed two `/favicon.ico` 404s; the fallback now redirects to the existing `/icon.svg`, the two exact reruns passed, and the final full run passed. |
| 390/1024/1440 browser inspection | PASS | Saved-plan regression tests executed all three representative widths with zero horizontal overflow, zero unnamed visible controls, and zero browser errors. |
| Independent scoped audit | PASS | Two read-only audits; final P0 `0`, P1 `0`. |

## Residual P2 Follow-ups

- If archive is requested while an Item edit is dirty, discard safely closes the edit before any
  storage mutation, but the user must invoke archive again. Automatically resuming archive is a
  separate lifecycle-command decision outside R2.
- `계속 수정` preserves the Item and draft, but does not yet guarantee restoration to the exact
  previously focused edit field.
- Direct Plan return behavior is covered by controller tests and broad browser regression; a
  dedicated direct-entry E2E does not yet assert both document and rail scroll coordinates.

## Evidence Boundary

- Local implementation and automated QA are not commit, push, PR, deployment, production smoke,
  or observed-user validation.
- Only checks executed against the final scoped worktree may be marked PASS.
- Commit, push, PR, deployment, and production smoke are `NOT_RUN`; observed-user sessions remain `0`.
- Standalone `npx tsc --noEmit` still reports pre-existing test typing diagnostics and is not the
  repository's production-build gate; the configured Next.js production type check passes.
