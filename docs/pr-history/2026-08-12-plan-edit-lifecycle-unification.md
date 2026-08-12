# Plan Edit And Lifecycle Unification

- **PR:** [#178](https://github.com/knhbae/flowme2605/pull/178)
- **Date:** 2026-08-12 KST
- **Branch:** `codex/my-plan-edit-lifecycle-unification-20260812`
- **Status:** Merged / deployed / canonical smoke PASS
- **Base:** `origin/main` at `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`
- **Final PR head:** `3cac3cde5bbcf6297b93b8299bfe28693700aebf`
- **Merge:** `908ee849beb15cb10331b72d7894167a61458b18` at `2026-08-12T12:42:45Z`
- **Deployment:** GitHub Production record `5869458520`, status `16715443863`

## Why

Saved plans and public plans exposed different edit, close, Back, focus, and
lifecycle behavior depending on their origin. Executable Flow Maps also looked
like a separate product type even when they contained one plan. The release
gives users one Plan/Item editing grammar while preserving each origin's
existing identity and persistence owner.

## What Changed

- Unified `/my` editing and lifecycle entry across canonical personal copies,
  source-backed Maps, personal memo/URL drafts, and legacy saved plans.
- Reused one public Plan/Item editor for ordinary `/f/[slug]` routes and
  executable single-plan `save_all` Maps.
- Presented OPIc, wedding, and Allblanc alternatives through `choose_child`,
  then continued editing in the selected canonical `/f` route; kept
  `review_hold` editor-free.
- Unified provisional Item apply, Plan apply, dirty close, browser Back,
  focus/scroll restoration, final save, and lifecycle behavior without a
  storage-key or schema migration.
- Preserved Map/version/child/Item identity, source records, personal overlays,
  execution records, export ownership, unknown fields, and atomic transactions.

## Not Done

- No account/cloud persistence, source mutation, creator publishing, version
  merge UI, new export destination, or storage/schema migration was added.
- Local capture reports remain local implementation and visual-review evidence;
  they are not relabeled as Production or observed-user evidence.
- No observed-user session was run. The count remains `0`.

## Verification

| Check | State |
| --- | --- |
| Local implementation gates | `PASS` — shared public editor/model `105/105`, My Plan origin/persistence/source/storage `172/172`, dedicated public edit E2E `8/8`, My Plan E2E `23/23`, affected browser regression `154/154` and `80/80`, full `npm test` and build PASS |
| Exact-head PR CI | `PASS` — final head `3cac3cde5bbcf6297b93b8299bfe28693700aebf`, run [`31596540934`](https://github.com/knhbae/flowme2605/actions/runs/31596540934), all required jobs successful |
| Merge | `PASS` — `908ee849beb15cb10331b72d7894167a61458b18` at `2026-08-12T12:42:45Z` |
| Post-merge `main` CI | `PASS` — run [`31597763288`](https://github.com/knhbae/flowme2605/actions/runs/31597763288), [core `94117373437`](https://github.com/knhbae/flowme2605/actions/runs/31597763288/job/94117373437), [Playwright `94117373461`](https://github.com/knhbae/flowme2605/actions/runs/31597763288/job/94117373461) |
| Production | `PASS` — GitHub record `5869458520`, status `16715443863`; [protected direct deployment-record URL](https://flowme2605-ej020et9m-flowme.vercel.app), [canonical app](https://flowme2605.vercel.app), and [Vercel record](https://vercel.com/flowme/flowme2605/AF53jatbYV9EuNyjbUeMY3Z6gUWZ) |
| Canonical Production smoke | `PASS` — `38/38`, workers `1`, retries `0`, `99.6s`; unexpected, flaky, and skipped results `0` |
| Observed-user validation | `0` |

## Risks And Rollback

- Automated CI, deployment success, and canonical smoke prove implementation
  and runtime checks, not whether target users understand or repeatedly use the
  product.
- The protected direct URL is deployment-record evidence, not anonymous app
  proof; the canonical alias is the smoke target.
- Revert merge `908ee849beb15cb10331b72d7894167a61458b18` to restore the prior
  runtime. No data migration or recovery step is required.

## Follow-Up

- Keep observed-user validation, real Calendar/VTODO round-trip, and the next
  product initiative separate until the Owner explicitly opens one.

## Links

- [My Plan specification](../specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md)
- [Public Plan/Item specification](../specs/2026-08-12-public-plan-edit-surface-unification/spec.md)
- [Current status](../STATUS.md)
- [Current roadmap](../ROADMAP.md)
- [Release history](../HISTORY.md)
