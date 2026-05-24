# Validation Session Template

Date: 2026-05-25
Branch: `docs/user-validation-session-template`
PR: #50

## Why

The repo now has first-user validation scripts, but needs a consistent place to record observed behavior and keep internal simulations separate from validation evidence.

## Changed

- Added `docs/validation-sessions/README.md`.
- Added `docs/validation-sessions/TEMPLATE.md`.
- Added a `computer-skills-d30-study` internal simulated baseline marked `no signal`.
- Updated audit/spec/status docs.

## Verification

- `npm run docs:check` passed.
- `git diff --check` passed.
