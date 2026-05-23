# Source Risk Item Copy Polish Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/seed-flows.ts` | Add route-scoped item copy polish layer for the twelve routes. |
| `lib/flow/seed-flows.test.ts` | Assert item detail coverage and non-generic, artifact-specific copy. |
| `docs/content-audit/2026-05-23-source-risk-item-copy-polish.md` | Record route-level UX review and representative exposure decision. |
| `docs/pr-history/2026-05-23-source-risk-item-copy-polish.md` | Track PR evidence and verification. |
| `docs/specs/2026-05-23-source-risk-item-copy-polish/` | Spec, plan, tasks, and QA notes. |

## Sequence

1. Add RED test for the twelve route item details.
2. Add a route-scoped polish layer that preserves links and source/risk metadata.
3. Run targeted GREEN test.
4. Record UX/copy review and representative decision.
5. Run full verification before PR.

## Risk Controls

- Apply the polish layer only to the twelve audited route slugs.
- Keep source/risk boundaries in caution text rather than implying eligibility or outcome.
- Preserve existing official/reference links.
- Leave representative promotion untouched.
