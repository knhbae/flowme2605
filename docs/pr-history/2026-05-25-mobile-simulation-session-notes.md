# Mobile Simulation Session Notes

Date: 2026-05-25
Branch: `docs/mobile-simulation-session-notes`
PR: Pending
Status: In progress

## Why

The protocol added in PR #81 gives a repeatable way to simulate mobile use, but the actual rehearsal findings need to be recorded separately from the protocol definition. This keeps internal simulation useful without overstating it as real user validation.

## Changed

- Added route-by-route internal mobile rehearsal notes for study, diet, and new-car candidates.
- Recorded pass/failure signals and the next observed-session script change for each route.
- Kept the validated route count at 0.

## Not Done

- Did not change route UI or copy.
- Did not promote any route.
- Did not claim validation.

## Verification

- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only.
