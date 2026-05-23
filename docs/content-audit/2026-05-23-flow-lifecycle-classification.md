# 2026-05-23 Flow Lifecycle Classification

This document converts the existing source-fit, content inventory, and natural artifact audits into an operational lifecycle view.

## Current Counts

| Lifecycle Bucket | Count | Meaning |
| --- | ---: | --- |
| 대표 유지 (`keep`) | 14 | Strong representative or source-fit-eligible candidates backed by manual source-fit audit. |
| 보강 필요 (`fix`) | 57 | Source-backed or audited Flows that should stay accessible but need content/UX/source-status work before broader promotion. |
| 미리보기 전용 (`preview_only`) | 440 | Generated channel preview candidates. Useful for channel exploration, not validated representative content. |
| 공개 숨김 (`hide`) | 0 | No current audit says a source-backed Flow must be hidden from the public catalog. |
| 삭제 후보 (`remove_candidate`) | 0 | No current Flow lacks both source URL and review basis. Source-backed legacy items are fix candidates, not deletion candidates. |

Total classified: 511 Flow bundles.

## Inventory Normalization

The 21 source-backed legacy routes were normalized to `source_status=needs_review` on 2026-05-23. The first 9 `audit_now` routes were manually source-fit audited in PR #19, and the later source replacement/risk review batch cleared the remaining 12 priority routes.

All 21 still keep their source metadata:

- `source_status=needs_review`
- `source_precision`
- `source_checked_at`
- `conversion_note`
- `primary_destination`

This keeps them out of deletion candidates without overstating them as fully reviewed `real` sources.

## Needs-review Priority

The remaining `source_status=needs_review` priority queue is now empty:

| Priority | Count | Meaning |
| --- | ---: | --- |
| 바로 audit (`audit_now`) | 0 | No current route remains in immediate audit queue. |
| 원본 교체 (`source_replacement`) | 0 | Cleared by exact source replacement and manual source-fit audit. |
| 리스크 검토 (`risk_review`) | 0 | Cleared by official/risk boundary review and manual source-fit audit. |
| 콘텐츠 보강 (`content_backlog`) | 0 | No generic backlog-only route remains. |

The source replacement and risk review batch is recorded in `docs/content-audit/2026-05-23-source-replacement-risk-review-batch.md`.

The 40 real-source natural-artifact audits were projected into source-fit decisions later on 2026-05-23. That promotion is recorded in `docs/content-audit/2026-05-23-real-source-manual-source-fit.md`.

## Keep

These 14 can remain the representative baseline or source-fit-eligible pool while each product surface continues to improve:

- `moving-d30-basic`
- `baby-food-menu-recipe`
- `passport-renewal-docs`
- `pet-registration-basic`
- `english-study-30day-routine`
- `used-car-buying-check`
- `wedding-d180-basic`
- `samsung-aircon-seasonal-check`
- `samsung-washer-filter-cleaning`
- `vehicle-inspection-prep`
- `real-samsung-aircon-seasonal-care`
- `real-samsung-washer-filter-care`
- `real-pet-registration-check`
- `real-ts-vehicle-inspection-prep`

## Fix

The 57 fix candidates include:

- manual source-fit entries that were marked `reshape_before_featured` or `catalog_preview_only`
- real-source entries marked `reshape_before_featured` or `catalog_preview_only`
- audited `needs_review` entries whose source-fit result is `reshape_before_featured`

High-value fix samples:

- `home-workout-20min`: routine calendar and condition memo still need stronger first-screen proof.
- `overseas-travel-d14`: country-specific official confirmation and emergency card are the natural outputs.
- `study-exam-d30-plan`: source/title mismatch must be fixed before representative use.
- `real-sinagong-computer-d30-study`: score/wrong-answer workbench exists, but source-fit still requires route-level UX shaping before broader exposure.
- `driver-license-renewal-check`: manual source-fit audit says the source is useful, but the Flow needs license-type branching before broader promotion.

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

Content Lab now exposes the lifecycle summary and needs-review priority summary next to the inventory and natural artifact audit sections. Public routes are not deleted by this change.

## Next Work

1. Apply content/UX reshaping for audited `reshape_before_featured` routes.
2. Reshape real-source Flows according to their source-fit content/UX actions before broader exposure.
3. Keep generated preview Flows separated from representative search/catalog surfaces.
