# Flow Entry And Preview Clarity

- **Date:** 2026-08-23 KST
- **Branch:** `agent/flow-entry-preview-clarity`
- **PR:** [#195](https://github.com/knhbae/flowme2605/pull/195)
- **Status:** Merged / Deployed
- **Final head:** `bf11ce250be8df0b438087febe4068713c2783be`
- **Merge:** `db74a36cbf2325573b2d696589daa659619e50f2`
- **Production:** <https://flowme2605-2exs7soph-flowme.vercel.app>

## Why

Flow discovery accepted several kinds of input but did not present one predictable entry or a complete, source-faithful result before save. Text could be abbreviated, Todo and Calendar previews could hide approved rows, and single-copy titles could expose meaningless numbering.

## What Changed

- Unified query, HTTP(S) URL, and memo intake under the existing `/flows` route.
- Added complete read-only Text syntax for ordinary and executable Map Flows.
- Exposed all approved Todo and chronological Calendar rows with meaningful grouping.
- Kept copy numbering only when sibling copies need disambiguation.
- Aligned `save_all` and `choose_child` Map previews with ordinary Flow result behavior.
- Preserved existing source, personal copy, storage, edit, completion, export, receipt, and lifecycle ownership.

## Not Done

- No account, remote persistence, AI provider, direct Calendar/Todo integration, marketplace, creator analytics, or new top-level navigation was added.
- No canonical Production smoke suite or observed-user session was run as part of the post-merge closeout.
- No semantic version tag was created.

## Decisions

- Review the complete source-faithful result before save instead of restoring an arbitrary three-row cap.
- Keep Flow Map identity and selection rules internal while using the same user-facing result grammar as ordinary Flows.
- Treat Preview, CI, deployment, HTTP checks, Production smoke, and observed-user evidence as separate states.

## Important Files

- `app/flows/page.tsx`
- `components/flow/AppClient.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/SourceBackedFlowMapChooseChildExperience.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `lib/flow/effective-flow-map-result.ts`
- `lib/flow/public-flow-text-syntax.ts`
- `lib/flow/url-first-lookup.ts`
- `tests/e2e/flow-map-preview-parity.spec.ts`
- `tests/e2e/flow-mvp.spec.ts`

## Verification

- Exact-head CI run [`32588338583`](https://github.com/knhbae/flowme2605/actions/runs/32588338583): `Docs, Unit, Build` PASS; `Playwright E2E` PASS; Vercel PASS.
- Post-merge `main` run [`32589202555`](https://github.com/knhbae/flowme2605/actions/runs/32589202555): both required jobs PASS.
- GitHub Production deployment record `6039611238`, status `17168906607`: SUCCESS for merge `db74a36cbf2325573b2d696589daa659619e50f2`.
- Direct deployment URL and canonical alias: HTTP `200` on 2026-08-29.
- Canonical Production smoke: `NOT_RUN`.
- Observed users: `0`.

## Risks

- HTTP `200` and CI do not replace a canonical Production journey smoke.
- Complete result rendering may need measured optimization if future approved Flows become substantially larger.
- Real understanding, return behavior, and longitudinal use remain unobserved.

## Follow-ups

- Keep no product gate active until the Owner selects one next program.
- Retain longitudinal-use preparation, Flow-derived Today, and isolated Text Authoring as separate candidates.
- Run a canonical Production smoke only when a release or pilot decision requires that evidence.

## Links

- [Specification](../specs/2026-08-20-flow-entry-preview-clarity/spec.md)
- [QA record](../specs/2026-08-20-flow-entry-preview-clarity/qa.md)
- [Source freshness release](./2026-08-22-source-freshness-refresh.md)
