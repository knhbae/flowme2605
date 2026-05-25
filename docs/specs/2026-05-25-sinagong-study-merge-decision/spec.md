# Sinagong Study Merge Decision

Date: 2026-05-25

## Problem

`real-sinagong-computer-d30-study` now has an exact Gilbut/Sinagong book page source, but it overlaps the existing canonical `computer-skills-d30-study` route. The test results should not be read as permission to invent a source-authored 30-day curriculum.

## Scope

- Preserve `real-sinagong-computer-d30-study` as a reshape/direct-QA route.
- Record that it should merge into `computer-skills-d30-study` unless it gains distinct source-derived rows.
- Carry the `my_tests/` source-boundary conclusion into code-level audit and backlog data.
- Avoid user-facing feature changes.

## Out Of Scope

- Automatic curriculum generation.
- Full route deletion or redirect.
- New UI layout, Figma mockup, or mobile redesign.
- Native study dashboard or login-based records.

## Acceptance Criteria

- Natural artifact audit mentions the duplicate/canonical-route issue.
- UX cleanup backlog requires a canonical route decision.
- `real-sinagong-computer-d30-study` remains `reshape_content_or_ux`.
- Tests cover the merge/rewrite guard.
