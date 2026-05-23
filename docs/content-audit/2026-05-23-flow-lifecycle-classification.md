# 2026-05-23 Flow Lifecycle Classification

This document converts the existing source-fit, content inventory, and natural artifact audits into an operational lifecycle view.

## Current Counts

| Lifecycle Bucket | Count | Meaning |
| --- | ---: | --- |
| 대표 유지 (`keep`) | 5 | Strong representative candidates backed by manual source-fit audit. |
| 보강 필요 (`fix`) | 66 | Source-backed or audited Flows that should stay accessible but need content/UX/source-status work before broader promotion. |
| 미리보기 전용 (`preview_only`) | 440 | Generated channel preview candidates. Useful for channel exploration, not validated representative content. |
| 공개 숨김 (`hide`) | 0 | No current audit says a source-backed Flow must be hidden from the public catalog. |
| 삭제 후보 (`remove_candidate`) | 0 | No current Flow lacks both source URL and review basis. Source-backed legacy items are fix candidates, not deletion candidates. |

Total classified: 511 Flow bundles.

## Keep

These 5 can remain the representative baseline while each product surface continues to improve:

- `moving-d30-basic`
- `baby-food-menu-recipe`
- `english-study-30day-routine`
- `used-car-buying-check`
- `wedding-d180-basic`

## Fix

The 66 fix candidates include:

- manual source-fit entries that were marked `reshape_before_featured` or `catalog_preview_only`
- all 40 `source_status=real` entries until manual promotion
- source-backed legacy entries whose source URL exists but source status/audit metadata is not normalized

High-value fix samples:

- `home-workout-20min`: routine calendar and condition memo still need stronger first-screen proof.
- `overseas-travel-d14`: country-specific official confirmation and emergency card are the natural outputs.
- `study-exam-d30-plan`: source/title mismatch must be fixed before representative use.
- `real-sinagong-computer-d30-study`: score/wrong-answer workbench exists, but source-fit promotion still needs a manual audit update.
- `passport-renewal-docs`: source-backed legacy route; should be normalized into real-source inventory or replaced.

## Preview Only

The 440 generated preview Flows should continue to support channel browsing and concept validation. They must not be framed as verified content.

Allowed:

- channel preview lists
- Content Lab validation
- catalog context where "샘플 후보" is visible

Not allowed:

- representative hero/demo exposure
- "검증됨" or popularity-like trust language
- implicit source-fit claims

## Hide / Remove Policy

Current result: no immediate hide or delete action.

Reasons:

1. The 40 real-source natural artifact audit has `replace_or_hide_source = 0`.
2. Manual source-fit audit has no `hide_from_public_catalog` entry.
3. Legacy accessible entries still have source URLs, so they are fix candidates rather than deletion candidates.

Deletion should require one of:

- missing source URL and no source-backed review
- explicit `hide_from_public_catalog`
- natural artifact audit `replace_or_hide_source`
- product decision that a category should be discontinued

## App Reflection

Content Lab now exposes the lifecycle summary next to the inventory and natural artifact audit sections. Public routes are not deleted by this change.

## Next Work

1. Normalize the 21 source-backed legacy routes into `source_status=real` or add manual source-fit audit where needed.
2. Promote real-source Flows only after their artifact workbench gap is closed and source-fit audit is updated.
3. Keep generated preview Flows separated from representative search/catalog surfaces.

