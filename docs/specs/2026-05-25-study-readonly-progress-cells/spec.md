# Study Read-Only Progress Cells Spec

## Goal

Make source-derived study scope rows visibly non-editable in `computer-skills-d30-study`, while keeping learner scheduling fields editable.

## Product Context

The previous guard protects exports from source-scope overrides. This batch closes the matching UI gap: the first-screen study table should not look like a blank table the learner is expected to design.

## Scope

In scope:

- Render `readOnlyColumnIds` cells in `LogTableCard` as static values instead of text inputs.
- Keep `targetDate`, `status`, and `note` inputs editable.
- Update E2E coverage for the representative study route.
- Capture desktop and mobile screenshots.
- Update docs, status, and PR history.

Out of scope:

- Full responsive table redesign.
- Automatic curriculum generation.
- More source-derived routes.
- Export format changes.
- Native FLOW study records.

## Acceptance Criteria

- `computer-skills-d30-study` no longer exposes a `범위` textbox for the first source-derived progress row.
- The source scope value remains visible in the progress table.
- The `목표일` and `상태` fields remain editable.
- Existing export behavior still passes.
