# R2 My Flow Library Controller Plan

## Target Direction

```text
AppClient compatibility adapter
  -> my-flow-library-controller (pure route/history/state/effect plan)
       -> existing my-flow-local-ia URL codec
  -> existing MyFlowRouteSurface presentation

My Flow storage/edit/export/receipt ownership -> unchanged
```

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/my-flow-library-controller.ts` | Pure list/Plan/Item transition and history plans. |
| `lib/flow/my-flow-library-controller.test.ts` | Exact transition, reset, history, focus, and scroll contracts. |
| `components/flow/AppClient.tsx` | Thin browser/React adapter applying planner effects in the existing order. |
| `tests/e2e/p35-p0-saved-plan-library.spec.ts` | Stale Item and dirty editor browser regressions. |
| `package.json` | Include the pure controller test in the deterministic pretest lane. |
| `next.config.ts` | Redirect the browser fallback `/favicon.ico` request to the existing `/icon.svg`; no new visual asset or app state. |
| `docs/SERVICE_STRUCTURE.md` | Record the implemented My Flow navigation ownership boundary. |
| `docs/STATUS.md` | Record the bounded R0-R2 candidate and keep publication, deployment, and observed-user states separate. |
| `docs/specs/README.md` | Track R2 as the active bounded local gate. |

## Sequence

1. Characterize the current history levels, state transitions, and the failing Item-resurrection path.
2. Add the pure planner and unit tests without connecting React.
3. Run the pure tests before touching AppClient.
4. Connect existing callbacks one at a time, keeping popstate registration in AppClient.
5. Guard dirty edits before any query/filter/URL/selection mutation and resume one pending
   control intent only after confirmed discard.
6. Add Item-level query/filter and dirty-editor E2E coverage.
7. Cover dirty completion-notice cross-Flow navigation and collapse its history to list -> owning Plan -> Item.
8. Run scoped, broad, build, browser, and ownership checks.

## Risk Controls

- Keep `my-flow-local-ia.ts` as the only URL codec; do not duplicate query parsing.
- Keep current React state as compatibility state; R2 does not move data ownership.
- Keep popstate effect registration order and existing saved-editor transaction interception.
- Do not call transient-detail cleanup until the dirty guard has allowed the transition.
- From an internal Item history level, consume Item -> Plan Back before replacing the Plan entry
  with list state; direct Item entries replace locally and never leave My Flow.
- Preserve unrelated `history.state` keys and normalize scroll exactly as before.
- Defer completion-notice selection and disclosure effects until the route transition has passed
  the dirty guard, and preserve that callback across confirmed discard.
- Apply one callback family at a time and retain the old behavior as a simple rollback path.

## Stop Conditions

- Stop if the fix requires a storage migration, edit/save semantic change, UI/copy change,
  export/receipt change, or Calendar change.
- Stop if dirty-editor Back behavior cannot be preserved without a new product decision.
- Do not publish or deploy from this plan without separate user authorization.
