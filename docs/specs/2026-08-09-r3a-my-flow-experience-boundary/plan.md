# R3A My Flow Experience Boundary Plan

## Files And Ownership

| File | Responsibility |
| --- | --- |
| `lib/flow/my-flow-workspace-snapshot.ts` | Pure versioned workspace facts derived from existing effective snapshots. |
| `lib/flow/my-flow-experience-variant.ts` | Exact query-only classic/lab selection. |
| `components/flow/my-flow/MyFlowExperienceHost.tsx` | One route-level classic/candidate switch with no classic wrapper. |
| `components/flow/my-flow/MyFlowClassicExperienceAdapter.tsx` | Compatibility adapter for the unchanged existing route surface. |
| `components/flow/my-flow/MyFlowExperienceContract.ts` | Candidate-neutral semantic navigation contract. |
| `components/flow/my-flow/experiences/MyFlowR3aLabSurface.tsx` | Internal snapshot-driven candidate. |
| `components/flow/AppClient.tsx` | Builds narrow inputs and delegates semantic intents to existing controllers. |
| `tests/e2e/r3a-my-flow-experience-boundary.spec.ts` | Selector, navigation, raw-storage, and responsive browser evidence. |

## Sequence

1. Characterize source/saved identities and current classic route assembly.
2. Add the pure workspace snapshot and unit contract.
3. Add the exact query-only experience selector.
4. Add a no-wrapper host and unchanged classic adapter.
5. Add one internal candidate using snapshot data and semantic navigation
   intents, with the current selected-Plan execution renderer as a compatibility
   bridge.
6. Connect only the existing route adapter assembly in `AppClient.tsx`.
7. Add unit/static-render/browser regressions.
8. Run targeted checks, full tests, production build, browser regressions, and
   scoped diff audit.

## Risk Controls

- Build from `EffectiveFlowSnapshot`; do not create a competing canonical model.
- Preserve saved-route and source identity as separate fields.
- Construct the snapshot only after existing ready/held/archive and
  query/filter selection has completed.
- Keep all current writers, locks, transactions, recovery, result effects, and
  receipts in their current modules and order.
- Keep the current route surface untouched and render it directly for classic.
- Use a single explicit lab selector instead of component-level flags.
- Fall back to classic when selection integrity or required classic-only
  interactions are present.
- Treat the lab candidate as internal QA evidence, not production-default or
  observed-user validation.

## Rollback

Remove the host connection and new snapshot/variant/candidate modules. Because
R3A creates no persistent key, schema, write, or migration, rollback requires no
data repair and returns directly to the existing `MyFlowRouteSurface` call.
