# R3A My Flow Experience Boundary

- **PR:** [#169](https://github.com/knhbae/flowme2605/pull/169)
- **Date:** 2026-08-09 KST
- **Branch:** `codex/r3a-my-flow-experience-boundary-20260809`
- **Status:** Merged / Deployed
- **Implementation commit:** `eeac99213b58eeafb8f39b2cc71c723e6fa32712`
- **Publication commit:** `950fd55f4176bf74d4739647040874a601faffcc`
- **Merge commit:** `95a69257c73633077df2305232299f58cca03f73`
- **Deploy:** Vercel `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek`
- **Production:** <https://flowme2605.vercel.app>

## Why

Repeated MVP UX and information-architecture experiments still required edits
inside the shared `AppClient.tsx` compatibility runtime. R3A adds one removable
experience boundary so an internal My Flow candidate can consume a stable,
read-only snapshot without changing saved data, mutation ownership, artifacts,
receipts, or the default production experience.

## What Changed

- Added a deterministic, JSON-safe, non-persisted My Flow workspace snapshot.
- Kept personal saved-route identity separate from source Flow identity and
  preserved multiple Item occurrence route hints.
- Added an exact query-only selector whose missing, invalid, or unsafe states
  fail closed to the unchanged `classic` surface.
- Added an internal `r3a-lab` saved-library candidate that delegates semantic
  navigation to the existing controller.
- Kept selected-Plan execution behind an explicit `AppClient` compatibility
  renderer and kept all existing mutation/effect owners in place.

## Not Done

- No default UI or copy redesign, storage key/schema/migration, data-model
  rewrite, artifact/receipt change, Text-to-Flow integration, or R3B command
  boundary was introduced.
- No observed-user session or external Calendar/VTODO round-trip was run.

## Decisions

- `classic` remains the production default.
- Only exact `myFlowExperience=r3a-lab` requests the internal candidate; the
  selector is not persisted.
- A later candidate that requires new edit, completion, lifecycle, or result
  commands must be scoped separately instead of expanding R3A.
- Automated QA, deployment, production smoke, and observed-user validation are
  reported as separate evidence states.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/my-flow/MyFlowExperienceHost.tsx`
- `components/flow/my-flow/experiences/MyFlowR3aLabSurface.tsx`
- `lib/flow/my-flow-workspace-snapshot.ts`
- `tests/e2e/r3a-my-flow-experience-boundary.spec.ts`
- `docs/specs/2026-08-09-r3a-my-flow-experience-boundary/`

## Verification

- Focused boundary tests `72/72`, pretest `164/164`, P35 P0 contract
  `420/420`, AppClient lock `59/59`, and main unit/contract `615/615` passed.
- Production build compiled, typechecked, and generated `18/18` routes.
- Local R3A browser coverage passed `4/4`; the full pre-publication runtime
  regression passed `545/545`.
- GitHub run
  [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308)
  passed Docs, Unit, Build, and Playwright `546/546` for PR head
  `950fd55f4176bf74d4739647040874a601faffcc`; that tree is identical to merge
  commit `95a69257c73633077df2305232299f58cca03f73`. Separate Vercel Preview and
  Preview Comments PR status checks also succeeded.
- GitHub deployment source and Vercel inspection both matched merge commit
  `95a69257c73633077df2305232299f58cca03f73`; deployment
  `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek` reached `READY`.
- Production smoke confirmed default `/my?demo=ux20` renders `classic` with no
  lab surface, while exact `r3a-lab` renders 20 desktop rows, filters `이사` to
  one row, and expands 390px inventory from 8 to 20. Horizontal overflow,
  console error messages and failed recorded requests were both `0`.

## Risks And Follow-ups

- Repository protection did not require the Playwright job. The requested
  auto-merge therefore completed while Playwright was still running; final
  closeout waited for the PR-head run to pass `546/546` and verified that its
  tree matched the merge commit before accepting deployment and smoke.
- This documentation-only release closeout may create a successor Vercel
  deployment when merged. `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek` remains the
  exact R3A product-source deployment evidence even if the canonical alias later
  points to a docs-only successor with identical product runtime code.
- `r3a-lab` is internal evidence, not a promoted default and not observed-user
  validation. Observed-user sessions remain `0`.
- No new product slice is active. Promotion, revision, removal, or R3B work
  requires a separate goal.

## Links

- [PR #169](https://github.com/knhbae/flowme2605/pull/169)
- [GitHub CI run](https://github.com/knhbae/flowme2605/actions/runs/31285007308)
- [Direct Vercel deployment](https://flowme2605-a0aasd9ic-flowme.vercel.app)
- [Canonical production alias](https://flowme2605.vercel.app)
- [R3A spec](../specs/2026-08-09-r3a-my-flow-experience-boundary/spec.md)
- [R3A QA](../specs/2026-08-09-r3a-my-flow-experience-boundary/qa.md)
