# Mobile Route Density Collapse QA

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| RED E2E | Pass | `npm run test:e2e -- --grep "mobile sensitive routes collapse"` failed before implementation because `mobile-collapsed-section` did not exist. |
| Build before GREEN | Pass | `npm run build` compiled successfully. |
| Targeted E2E GREEN | Pass | `npm run test:e2e -- --grep "mobile sensitive routes collapse"` passed: 1 test. |
| Screenshot capture | Pass | Captured updated mobile route-density screenshots for diet and new-car. |
| Docs check | Pass | `npm run docs:check` passed with 14 required files and 220 local links. |
| Unit tests | Pass | `npm test` passed: 129 tests. |
| Final build | Pass | `npm run build` compiled successfully. |
| Full E2E | Pass | `npm run test:e2e` passed: 48 tests. |

## Screenshot Review

- `diet-habit-2week`: 2 secondary execution sections are closed on mobile.
- `new-car-delivery-check`: 3 secondary execution sections are closed on mobile.

## Residual Risk

This reduces initial mobile scan cost, but it does not validate the route. Real behavior data is still required before any `validated` claim.
