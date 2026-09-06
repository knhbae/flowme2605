# Flow Entry And Preview Clarity Plan

## Files

| File | Responsibility |
| --- | --- |
| `components/flow/AppClient.tsx` | Own the unified discovery input intent, per-Flow destination reset, exact Text-model assembly for ordinary public Flows, and saved-copy display title integration. |
| `app/flows/page.tsx` | Keep the server-rendered `/flows` fallback aligned with the one-entry discovery copy. |
| `components/flow/FlowArtifactDataPreview.tsx` | Render complete Flow syntax, parser-unsupported Preview metadata, chronological full Calendar rows, and Calendar setup before rows while retaining legacy limits. |
| `components/flow/FlowCapabilityResultPreview.tsx` | Forward the approved destination, Text model, and Calendar setup contracts to the artifact preview. |
| `lib/flow/public-flow-text-syntax.ts` | Reconcile effective projection order and personal overlays with canonical source timing, details, resources, and warnings without inventing parser syntax. |
| `lib/flow/url-first-lookup.ts` | Keep URL intent limited to canonical HTTP(S) web sources so scheme-like memo text remains a memo. |
| `lib/flow/my-flow-local-ia.ts` | Derive display-only copy disambiguation from sibling cardinality. |
| `lib/flow/effective-flow-map-result.ts`, `components/flow/SourceBackedFlowMap*Experience.tsx` | Reconcile executable Map rows with canonical child source detail and pass the same Text/Calendar preflight contract without changing Map persistence ownership. |
| `components/flow/*.test.tsx`, `lib/flow/*.test.ts`, `tests/e2e/*.spec.ts` | Prove intent routing, complete previews, title cardinality, legacy behavior, and responsive interaction. |
| `docs/specs/2026-08-20-flow-entry-preview-clarity/` | Preserve scope, sequence, tasks, evidence, and publication boundary. |
| `docs/SERVICE_STRUCTURE.md` | Record the changed intake and artifact-presentation contracts without creating a new owner. |

## Sequence

1. Freeze the four approved outcomes and the release evidence boundary.
2. Replace the two `/flows` text entries with one intent-aware field while keeping
   existing URL and memo destinations intact.
3. Add cardinality-aware copy-title display logic without changing stored data.
4. Reset each newly opened Flow to Text and render its complete parser-aligned
   read-only structure.
5. Remove the arbitrary approved Todo/Calendar row cap, preserve meaningful
   grouping, and place Calendar setup before its long list.
6. Update focused unit/component and E2E contracts, including explicit legacy
   regression coverage.
7. Run docs, focused tests, build, and 390/1024/1440 real-browser checks; resolve
   independent UX/accessibility and React review findings.
8. Publish the scoped stacked PR and Vercel Preview, then obtain the Owner's
   separate release decision. Complete.
9. Reconcile PR #195 onto the released PR #194 baseline, pass exact-head CI,
   merge only that head, and record the resulting Production deployment.
   Complete; canonical Production smoke remains `NOT_RUN`.

## Risk Controls

- Use input intent outcomes rather than creating a second route or persistence
  owner; search-like filtering must not write storage.
- Preserve URL lookup canonicalization and the current memo parser/draft owner.
- Keep Text read-only and parser-aligned; do not present personal notes as source
  instructions or invent unsupported authoring tokens.
- Apply full-row rendering only to the approved public result mode. Keep legacy
  compact behavior behind its existing boundary.
- Compute copy ordinals for display only and only within sibling copies of the
  same source.
- Verify long mobile results for horizontal overflow, sticky-action collisions,
  focus visibility, console errors, and page errors.
- Treat automation and Preview as implementation evidence, never observed-user
  validation.
