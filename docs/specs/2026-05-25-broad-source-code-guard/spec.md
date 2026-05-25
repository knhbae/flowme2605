# Broad Source Code Guard Spec

Date: 2026-05-25

## Goal

Expose a regression guard in Content Lab summary data for real-source routes whose source precision is still `broad`.

## User Story

As a FLOW editor, I need Content Lab data to show broad-source routes and representative leaks, so future seed/source changes do not accidentally promote broad channel or site sources.

## In Scope

- Add Content Lab summary fields for broad real-source route count and slugs.
- Add a leak list for broad real-source routes that appear in lifecycle `keep`.
- Add unit coverage.
- Record audit/spec/status/PR history.

## Out Of Scope

- Public UI redesign.
- Route hiding or exposure changes.
- Source URL replacement.
- Automatic source extraction.
- Validation claims.

## Acceptance Criteria

- `getContentLabSummary(seedBundles).broadRealSourceCount` matches the current real+broad route queue.
- After the MOFA travel source replacement batch, the current expected count is 1.
- `broadRealSourceSlugs` lists all current real+broad routes.
- `broadRealSourceRepresentativeLeakSlugs` is empty.
- Focused Content Lab test passes after a RED failure.
