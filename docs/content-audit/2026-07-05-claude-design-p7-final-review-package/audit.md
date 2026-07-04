# Claude Design P7 Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. It does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

## Baselines Covered

- P7-01: `/restart/moving-d30` uses user-facing date text and a quieter export hierarchy.
- P7-02: My Flow today/overdue/next queues are deduped.
- P7-03: My Flow 5+ saved list bottom clearance is verified.
- P7-04: Home shows a small curated recommendation set, not a single fixed experiment.
- P7-05: Public `/f` browse links remain secondary to `내 Flow에 저장`.
- P7-06: Normal route scan buckets stay at zero for internal labels, source slugs, structural title suffixes, raw ISO dates, and mobile overflow.

## Summary

```json
{
  "totalScreenshots": 23,
  "normalRouteInternalHitCount": 0,
  "normalRouteSourceSlugHitCount": 0,
  "normalRouteStructuralDisplayHitCount": 0,
  "normalRouteRawIsoHitCount": 0,
  "normalRouteHorizontalOverflowCount": 0,
  "restartPrototypeRawIsoHitCount": 0,
  "restartPrototypeHorizontalOverflowCount": 0,
  "restartPrototypeExportButtonCounts": [
    1,
    1,
    1
  ]
}
```

## Scenario Matrix

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 01-home-mobile | `/` | Home entry and lightweight recommendations | OK | 0 | 0 | 0 |
| 02-flows-mobile | `/flows` | Flow catalog scan with lightweight CTAs | OK | 0 | 0 | 0 |
| 03-flow-map-moving-top-mobile | `/flow-maps/moving-d30` | Moving map save screen top | OK | 0 | 0 | 0 |
| 04-flow-map-moving-bottom-mobile | `/flow-maps/moving-d30` | Moving map bottom sticky clearance | OK | 0 | 0 | 0 |
| 05-flow-map-math-mobile | `/flow-maps/middle-school-math-1` | Math source-backed map screen | OK | 0 | 0 | 0 |
| 06-public-vehicle-mobile | `/f/vehicle-inspection-prep` | Public share save screen | OK | 0 | 0 | 0 |
| 07-public-moving-mobile | `/f/moving-d30-basic` | Public moving share screen | OK | 0 | 0 | 0 |
| 08-public-moving-bottom-mobile | `/f/moving-d30-basic` | Public moving bottom sticky clearance | OK | 0 | 0 | 0 |
| 09-workbench-fridge-mobile | `/f/fridge-cleanout-weekly-plan` | Fridge workbench active rows | OK | 0 | 0 | 0 |
| 10-workbench-washer-mobile | `/f/washer-tub-clean-monthly` | Washer workbench | OK | 0 | 0 | 0 |
| 11-workbench-new-car-mobile | `/f/new-car-delivery-check` | New car checklist workbench | OK | 0 | 0 | 0 |
| 12-workbench-used-car-mobile | `/f/used-car-buying-check` | Used car checklist workbench | OK | 0 | 0 | 0 |
| 13-post-save-my-moving-mobile | `/my?savedMap=moving-d30` | Post-save My Flow for moving map | OK | 0 | 0 | 0 |
| 14-calendar-after-moving-save-mobile | `/calendar` | Calendar agenda-first after moving save | OK | 0 | 0 | 0 |
| 15-post-save-my-math-mobile | `/my?savedMap=middle-school-math-1` | Post-save My Flow for undated math content | OK | 0 | 0 | 0 |
| 16-my-multi-queue-mobile | `/my` | My Flow with today overdue next queues | OK | 0 | 0 | 0 |
| 17-my-multi-queue-overdue-sheet-mobile | `/my` | My Flow overdue sheet dedupe evidence | OK | 0 | 0 | 0 |
| 18-my-long-list-top-mobile | `/my` | My Flow 5+ saved list top | OK | 0 | 0 | 0 |
| 19-my-long-list-bottom-mobile | `/my` | My Flow 5+ list bottom before sheet | OK | 0 | 0 | 0 |
| 20-my-long-list-inventory-bottom-mobile | `/my` | My Flow 5+ inventory sheet bottom clearance | OK | 0 | 0 | 0 |
| 21-restart-moving-top-mobile | `/restart/moving-d30` | Restart prototype top with user date format | OK | 0 | 0 | 0 |
| 22-restart-moving-source-export-mobile | `/restart/moving-d30` | Restart prototype source and export hierarchy | OK | 0 | 0 | 0 |
| 23-restart-moving-bottom-mobile | `/restart/moving-d30` | Restart prototype bottom clearance | OK | 0 | 0 | 0 |

## Restart Prototype Bucket

`/restart/moving-d30` remains outside the primary 4-tab IA. It is tracked as a prototype route, but it must still pass the display gate before any future promotion:

- no user-facing raw ISO dates
- no duplicated primary export button sets
- no source brand slug as title/subtitle copy
- no horizontal overflow at 390px

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
