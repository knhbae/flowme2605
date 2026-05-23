# Real-Source Manual Source-Fit Plan

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/source-fit.ts` | Build source-fit records from existing real-source natural-artifact audits. |
| `lib/flow/source-fit.test.ts` | Assert every real-source route is covered by source-fit audit. |
| `lib/flow/content-inventory.ts` | Count real-source routes reviewed after manual source-fit promotion. |
| `lib/flow/content-inventory.test.ts` | Update inventory contract from derived to manual source-fit. |
| `lib/flow/content-lab.test.ts` | Update Content Lab summary counts. |
| `lib/flow/content-lifecycle.test.ts` | Update lifecycle expectations for promoted real-source decisions. |
| `lib/flow/execution-model.test.ts` | Keep exact-video flows out of representative landing while allowing source-review exposure. |
| `tests/e2e/flow-mvp.spec.ts` | Update Flow Lab visible manual source-fit count. |
| `docs/content-audit/*` and `docs/pr-history/*` | Record batch evidence and follow-ups. |

## Sequence

1. Add failing tests for 40 real-source source-fit coverage and summary counts.
2. Map natural-artifact audit decisions into source-fit decisions and score profiles.
3. Update inventory/lifecycle/test expectations for the new manual source-fit state.
4. Record docs and run verification.

## Risk Controls

- Use existing natural-artifact audit records as the evidence source instead of inventing a second audit corpus.
- Keep representative landing unchanged; `keep_representative` means source-fit eligible, not necessarily homepage featured.
- Treat broad channel/site sources as catalog preview until exact source replacement happens.
