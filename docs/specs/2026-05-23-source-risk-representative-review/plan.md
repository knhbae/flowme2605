# Source Risk Representative Review Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/representative-readiness-review.ts` | Store first-pass readiness decisions. |
| `lib/flow/content-lab.ts` | Include readiness summary in Flow Lab data. |
| `components/flow/ContentLab.tsx` | Render readiness cards. |
| `lib/flow/content-lab.test.ts` | Assert decisions and lifecycle hold. |
| `tests/e2e/flow-mvp.spec.ts` | Assert the Flow Lab readiness section renders. |
| `docs/content-audit/2026-05-23-source-risk-representative-review.md` | Record UX review and promotion decision. |
| `docs/pr-history/2026-05-23-source-risk-representative-review.md` | Track PR evidence. |

## Sequence

1. Add RED test for first three readiness decisions.
2. Implement readiness review records and Content Lab summary.
3. Render Content Lab readiness section.
4. Add docs with route-level findings.
5. Run full verification and open PR.

## Risk Controls

- Do not change actual representative allowlist.
- Do not mark health/financial routes as representative.
- Keep all three in lifecycle `fix` until a separate final promotion PR.
- Keep review labels operator-facing, not user-facing marketing claims.
