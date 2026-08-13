# Text Authoring P1-E Guarded Source Candidate Updates

- **PR:** [#186](https://github.com/knhbae/flowme2605/pull/186)
- **Date:** 2026-08-13 KST
- **Branch:** `agent/text-authoring-p1-e-source-update-20260813`
- **Status:** Draft / local QA PASS / GitHub and Preview checks pending / unpublished
- **Base branch:** `agent/text-authoring-p1-c-longform-20260813`
- **Base commit:** `936f33780f56a0b304ece36d5a228b81b9b99e2a`
- **Parent PR:** [#185](https://github.com/knhbae/flowme2605/pull/185)
- **Approval:** `TA-P1-E-SOURCE-UPDATE-20260813-01`

## Why

A creator needs an explicit, reversible way to compare a complete versioned
source candidate with the saved base and current work. Staging must never write
the working source, and unresolved, stale, unauthorized, or corrupted candidates
must fail closed.

## What Changed

- Added a local synthetic host envelope with exact source identity, byte/hash,
  collection/receipt time, owner, base snapshot, and idempotency fields.
- Added Base / 내 작업 / 새 원문 comparison with explicit keep/use/later
  decisions, creator authorization, stale detection, defer/reject, and re-entry.
- Applied a complete decision set as one local transaction across working source,
  canonical draft, projection, active snapshot, and a zero-side-effect receipt.
- Added exact aggregate undo, receipt replay/idempotency, integrity checks, and
  injected failure rollback.
- Registered service/dialog tests in `test:text-authoring` and enabled P1-C plus
  P1-E gates for CI's production E2E build.
- Made the browser helper wait for the saved route and one-shot receipt handoff
  to settle before closing the receipt; product persistence code is unchanged.

## Not Done

- No URL fetch, auth, provider, polling, background refresh, automatic merge,
  service CreatorRevision history, publication, or personal/export mutation.
- P1-G is a separate spec-only PR. P1-A/B/D/F, P2, P35, merge, production
  deploy, external writes, and observed-user validation remain excluded.

## Decisions

- `LOCAL_SYNTHETIC_HOST_ADAPTER` is a deterministic local ingress seam, not a
  production host or network integration.
- Authority is re-evaluated after reload; permission is not trusted from stored
  session bytes.
- Candidate apply remains dirty local work. Only the existing P0 explicit save
  creates the coherent durable pair and save receipt.
- Local 32-bit hashes are deterministic mismatch guards, not cryptographic
  signatures or a security boundary.

## Verification

| Check                                          | State                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Documentation                                  | `npm.cmd run docs:check` PASS — 16 required files, 4,628 local links |
| Focused P1-E contracts                         | PASS 44/44                                                           |
| Cumulative Text Authoring contracts            | `npm.cmd run test:text-authoring` PASS — 311/311                     |
| TypeScript                                     | `npx.cmd tsc --noEmit -p tsconfig.next.json` PASS                    |
| Dependency audit                               | `npm.cmd run security:audit` PASS — 0 vulnerabilities                |
| Full unit/contract suite                       | `npm.cmd test` PASS, exit 0                                          |
| Dual-gate production build                     | `npm.cmd run build` PASS — Next 15.5.21, 19 routes                   |
| Dedicated P1-E browser acceptance              | PASS 9/9                                                             |
| Saved handoff repetition                       | H02 PASS 3/3                                                         |
| Cumulative P0 + P1-C + P1-E browser regression | PASS 75/75, workers 4, 365.6 seconds                                 |
| Initial cumulative diagnosis                   | 74/75; one receipt-handoff timing race; final rerun PASS 75/75       |
| Network/provider/external side effects         | 0                                                                    |
| Observed-user validation                       | 0                                                                    |

## Risks And Rollback

- The synthetic adapter validates the service transaction boundary but does not
  prove a future real host's availability, authentication, or retention policy.
- Turn off `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE` or revert this
  PR to return to P1-C/manual source entry. Saved source and deferred candidate
  bytes remain local and no external rollback is required.

## Follow-Up

- Stack the P1-G spec/fixture contract on this PR.
- Keep real provider ingress and P1-B revision authority behind separate owner
  decisions.

## Links

- [P1-E development goal](../specs/2026-08-13-flowme-text-authoring-p1-e-source-update/00-development-goal-ko.md)
- [P1-E local result evidence](../content-audit/2026-08-13-flowme-text-authoring-p1-e-source-update-results/README.md)
- [Parent P1-C PR history](./2026-08-13-text-authoring-p1-c-longform.md)
