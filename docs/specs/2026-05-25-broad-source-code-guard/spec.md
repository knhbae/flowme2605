# Broad Source Code Guard Spec

Date: 2026-05-25

## Goal

Expose a regression guard in Content Lab summary data for real-source routes whose source precision is still `broad`.

## User Story

As a FLOW editor, I need Content Lab data to show broad-source routes and representative leaks, so future seed/source changes do not accidentally promote broad channel or site sources.

## In Scope

- Add Content Lab summary fields for active broad real-source route count and slugs.
- Add a separate hidden broad-source decision slug list.
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

- `getContentLabSummary(seedBundles).broadRealSourceCount` matches the current active real+broad route queue.
- After the FITVELY weekly body-check hide decision, the current active expected count is 0.
- `broadRealSourceSlugs` lists all current active real+broad routes.
- `broadRealSourceHiddenSlugs` lists broad routes moved to `replace_or_hide_source`, currently `real-fitvely-weekly-body-check`.
- `broadRealSourceRepresentativeLeakSlugs` is empty.
- Focused Content Lab test passes after a RED failure.
