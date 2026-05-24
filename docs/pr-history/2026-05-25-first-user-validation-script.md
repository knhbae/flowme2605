# First User Validation Script

Date: 2026-05-25
Branch: `docs/first-user-validation-script`
PR: #49

## Why

After the representative and public-MVP cleanup, the next useful step is to observe whether target users can complete the export-first loop. This should happen before any route is called validated.

## Changed

- Added a first-user validation script for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Defined common observations, route tasks, evidence needed, fail signals, and decision labels.
- Updated docs/status/audit records without changing product behavior or exposure.

## Verification

- `npm run docs:check` passed.
- `git diff --check` passed.
