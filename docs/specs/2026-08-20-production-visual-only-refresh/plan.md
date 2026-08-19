# Plan

1. Freeze the Production baseline and visual-only boundary.
2. Define semantic tokens and update shared UI primitives.
3. Apply the system to discovery and public-plan surfaces.
4. Apply the system to saved-plan, export, management, and Calendar surfaces.
5. Run independent UX, accessibility, and React reviews.
6. Run focused tests, full unit/contract tests, build, and real-browser checks.
7. Close the local implementation with publication and observed-user boundaries.

Changes should move from shared tokens to shared components and only then to
targeted route-local overrides. Broad palette replacement inside `AppClient` is
forbidden because action and semantic-state colors currently share raw values.
