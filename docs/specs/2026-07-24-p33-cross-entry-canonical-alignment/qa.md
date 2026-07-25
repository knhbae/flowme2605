# P33 Cross-entry Canonical Alignment QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Canonical registry unit | Pass | `lib/flow/canonical-flow-registry.test.ts` |
| Cross-entry invariant | Pass | Home/Find/URL/direct alias fixture and `P33-CROSS-ENTRY-INVARIANT` |
| Storage shadow-read and reconciliation | Pass | `lib/flow/canonical-flow-storage.test.ts` |
| Related targeted E2E | Pass `6 / 6` | `tests/e2e/p33-cross-entry-canonical.spec.ts` |
| `npm.cmd run docs:check` | Pass | Final local gate |
| `npm.cmd test` | Pass `55 + 587` | pretest contract and unit suites |
| `npm.cmd run build` | Pass `18 / 18` | Next production build |
| Full Playwright | Pass `320 / 320` | Three serial shards; parallel attempt was discarded after host OOM |
| 390x844 browser review | Pass | `p33-02`, `p33-03`, and `p33-05` screenshots |
| 1024x768 browser review | Pass | readable recurrence screenshot |
| 1440x900 browser review | Pass | canonical My Flow/export and Calendar screenshots |

## Invariants

- A source URL alone never determines canonical identity.
- Source, user job, and intentional editorial variant all participate in identity.
- Existing 24-item and 5-item records are never merged by title or array position.
- Existing localStorage keys are not deleted during migration.
- Personal overlay, execution run, recurrence occurrence, and export identity are preserved.
- New entry routes may canonicalize; legacy records remain readable and recoverable.
- Automated QA and screenshots do not count as observed-user validation.

## Browser Matrix

| Entry | Expected detail | Expected saved slug |
| --- | --- | --- |
| Home moving card | `/f/moving-d30-basic`, 24 items | `moving-d30-basic` |
| Find moving card | `/f/moving-d30-basic`, 24 items | `moving-d30-basic` |
| AJD URL lookup | `/f/moving-d30-basic`, 24 items | `moving-d30-basic` |
| `/flow-maps/moving-d30` | canonical redirect | `moving-d30-basic` |
| `/f/source-backed-moving-d30` | canonical redirect | `moving-d30-basic` |

## Review Notes

- Product constraint review: P32 focused workspace and 4-tab IA stay closed.
- Source/risk review: 24 items are the selected FlowMe editorial snapshot, not a claim that the AJD article contains exactly 24 rows.
- Migration review: additive metadata and explicit user choice only.
- Residual risk: existing 5-item personal values cannot be deterministically mapped to 24-item IDs and must remain on the legacy copy.
