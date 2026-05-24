# Plan

## Implementation

1. Add RED unit and E2E coverage for passport memo-first behavior.
2. Add `passport-renewal-docs` to memo-card primary surface routing.
3. Add passport-specific memo fields tied to the user's real submission artifact.
4. Rebuild and rerun the targeted E2E first-screen test.
5. Capture desktop and mobile screenshots.
6. Document the natural artifact simulation, current Flow/UX gap, and content/UX reinforcement.
7. Run full verification and open a PR.

## Review Checkpoints

- The route must not imply FLOW validates official eligibility.
- The first card should be a memo users can paste into an existing note tool, not a new native document vault.
- The checklist remains available, but it should no longer be the first cognitive load.
