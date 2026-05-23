# 2026-05-23 Needs-Review Source-Fit Batch

This document records the first manual source-fit audit pass for the `needs_review` routes that were previously marked `audit_now`.

> Follow-up: the remaining 12-route source replacement and risk review queue was cleared later on 2026-05-23 in [2026-05-23-source-replacement-risk-review-batch.md](./2026-05-23-source-replacement-risk-review-batch.md).

## Batch Scope

The batch covers 9 exact-source routes:

| Flow | Score | Decision | Source Precision | Next Content Action |
| --- | ---: | --- | --- | --- |
| `driver-license-renewal-check` | 82 | `reshape_before_featured` | exact | Separate requirements by license/renewal path and add a condition choice. |
| `family-certificate-issue` | 74 | `reshape_before_featured` | exact | Structure submitter, certificate type, disclosure scope, and file location. |
| `passport-renewal-docs` | 81 | `keep_representative` | exact | Add photo spec, receipt number, pickup date, and storage location fields. |
| `pet-registration-basic` | 82 | `keep_representative` | exact | Add registration number, agency, and change-reporting conditions. |
| `resident-register-copy-issue` | 74 | `reshape_before_featured` | exact | Add display fields, disclosure scope, and submitter requirements. |
| `qnet-exam-application-prep` | 85 | `reshape_before_featured` | exact | Split application deadline, payment, admission ticket, and exam-day preparation. |
| `samsung-aircon-seasonal-check` | 86 | `keep_representative` | exact | Add model, symptom, counseling number, reservation window, and post-check result fields. |
| `samsung-washer-filter-cleaning` | 92 | `keep_representative` | exact | Clarify drain, reassembly, lock, and leak-check completion criteria. |
| `vehicle-inspection-prep` | 89 | `keep_representative` | exact | Split pre-inspection prep, inspection visit, and repair follow-up sections. |

## Current Outcome

Manual source-fit audits now cover 19 routes.

Decision counts:

| Decision | Count |
| --- | ---: |
| `keep_representative` | 10 |
| `reshape_before_featured` | 8 |
| `catalog_preview_only` | 1 |
| `hide_from_public_catalog` | 0 |

Lifecycle counts after this batch:

| Bucket | Count |
| --- | ---: |
| `keep` | 10 |
| `fix` | 61 |
| `preview_only` | 440 |
| `hide` | 0 |
| `remove_candidate` | 0 |

## Remaining Queue

The needs-review priority queue now has 12 routes:

| Priority | Count | Next Action |
| --- | ---: | --- |
| `audit_now` | 0 | None in the current queue. |
| `source_replacement` | 6 | Replace broad channel/site URLs with exact source URLs before source-fit audit. |
| `risk_review` | 6 | Confirm official basis, risk wording, and user input/output boundaries. |
| `content_backlog` | 0 | No generic backlog-only route remains. |

## What This Does Not Do

- It does not delete any public route.
- It does not automatically promote every audited route to representative exposure.
- It does not replace the 40 `source_status=real` natural-artifact audits; those remain derived review until manual source-fit promotion.
- It does not fix item-level content gaps; it records the next content and UX actions for each route.

## Next Work

1. Replace broad source URLs for the 6 `source_replacement` routes.
2. Run official/warning review for the 6 `risk_review` routes.
3. Implement item/content reshaping for the 4 audited `reshape_before_featured` routes.
4. Re-run Content Lab and e2e checks after each batch so counts stay visible.
