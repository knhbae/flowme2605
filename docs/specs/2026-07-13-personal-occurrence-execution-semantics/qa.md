# QA

## Required Journeys

1. pending -> done -> reopened
2. pending -> skipped -> reopened
3. reopened -> held -> reopened
4. held -> skipped -> reopened
5. reload while skipped and held
6. keyboard activation of state actions

## Required Assertions

- skipped and held are visible and distinct.
- skipped/held completion checkbox is disabled until reopened.
- occurrence ID is stable through every transition.
- transition history is preserved after reload.
- Calendar row count and recurring ICS event membership do not change.
- exclude/delete storage is unchanged.
- source-backed occurrence state control count is zero.
- mobile/wide horizontal overflow and console error count are zero.
- automated QA is not described as observed-user validation.
