# Observed Session Note Filename Pass

Date: 2026-05-26

## Scope

Flow Lab observed-session note intake now includes a session number field and downloads session notes with the same naming pattern used by `docs/validation-sessions/`:

```text
YYYY-MM-DD-<route-slug>-session-<number>.md
```

Example:

```text
2026-05-26-diet-habit-2week-session-01.md
```

## Product Boundary

- This is an operator workflow fix for saving session notes with less manual renaming.
- The note still records only factual observed-session evidence and non-validated decisions.
- The decision selector still excludes `validated`.
- This change does not create user evidence and does not change any route status.

## Verification Notes

- Unit coverage expects numbered note filenames and a `Session: 01` line in generated markdown.
- E2E coverage fills the session number field and verifies the downloaded note filename ends in `session-01.md`.
