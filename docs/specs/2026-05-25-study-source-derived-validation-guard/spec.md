# Study Source-Derived Validation Guard Spec

## Goal

Keep `computer-skills-d30-study` framed as source-derived curriculum conversion and clarify that representative readiness is not validation.

## Product Context

Stage 0 is export-first. Study progress rows should come from source structure such as curriculum, exam scope, past-exam rounds, weekly plans, lessons, or assignments. Users should edit only action fields like target date, status, note, wrong answer, or retry date.

## Scope

In scope:

- Add metadata to the study progress table that identifies source-derived rows.
- Prevent export output from accepting user overrides for read-only source columns.
- Expose guard metadata to the rendered artifact card for E2E coverage.
- Document validation evidence rules.
- Update content audit, PR history, and status.

Out of scope:

- Automatic study progress generation.
- Disabling inputs or redesigning the full table UI.
- Native long-term records.
- External app integrations.
- Exposure or validation status changes.

## Acceptance Criteria

- The study progress table declares `source_derived` metadata.
- The source scope column is read-only for export merging.
- Target date, status, and note remain user-editable export fields.
- Tests prove source override values are ignored while user-editable values are preserved.
- Docs state that no route is validated without real user behavior data.
