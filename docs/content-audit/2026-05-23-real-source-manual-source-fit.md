# 2026-05-23 Real-Source Manual Source-Fit Promotion

This batch promotes the 40 `source_status=real` natural-artifact audits into source-fit decisions. It reuses the route-level evidence already recorded in [2026-05-22-real-source-natural-artifact-audit.md](./2026-05-22-real-source-natural-artifact-audit.md): simulated natural artifacts, current Flow/content gap, current UX gap, and next content/UX actions.

## Decision Mapping

| Natural-Artifact Decision | Source-Fit Decision | Count | Handling |
| --- | --- | ---: | --- |
| `promote_to_manual_source_fit` | `keep_representative` | 4 | Source-fit eligible, but not automatically added to representative landing. |
| `reshape_content_or_ux` | `reshape_before_featured` | 30 | Direct access can remain, but route needs content/UX work before stronger exposure. |
| `keep_catalog_review` | `catalog_preview_only` | 6 | Keep catalog/preview access until exact source or route-specific UX gap is fixed. |
| `replace_or_hide_source` | `catalog_preview_only` | 0 | No real-source route in the natural-artifact audit required hiding. |

## Current Counts

| Metric | Before | After |
| --- | ---: | ---: |
| Manual source-fit audits | 31 | 71 |
| Derived real-source reviews | 40 | 0 |
| Lifecycle `keep` | 10 | 14 |
| Lifecycle `fix` | 61 | 57 |
| Lifecycle `preview_only` | 440 | 440 |
| Lifecycle `hide` | 0 | 0 |

## Source/Risk Notes

- Exact official/service sources that already had strong natural artifacts become `keep_representative`: Samsung aircon, Samsung washer filter, pet registration, and TS vehicle inspection.
- Exact video and diet/nutrition routes mostly remain `reshape_before_featured`; their natural artifact gaps point to routine settings, safety wording, spreadsheet fields, or memo cards still to build.
- Broad channel/site sources become `catalog_preview_only` until exact source replacement is done.

## Follow-Up

- Do item/content/UX reshaping batches for the 30 `reshape_before_featured` real-source routes.
- Replace broad channel/site URLs for the 6 `catalog_preview_only` real-source routes where exact original content exists.
- Decide separately whether any of the 4 `keep_representative` real-source routes should be added to the landing representative set after first-screen UX review.
