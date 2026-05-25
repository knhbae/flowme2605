# Broad Source Route Review Spec

Date: 2026-05-25

## Goal

Record how FLOW should handle real-source routes whose source is still a channel, site, portal, or broad reference. These routes should not be confused with exact-source routes that preserve a specific video, official page, curriculum row set, or program source.

## User Story

As a FLOW editor, I need broad-source routes called out before promotion, so I do not ask users to execute a Flow that hides source-selection work.

## In Scope

- Review all current `source_status=real` and `source_precision=broad` routes.
- Separate creator channel/site sources from broad official references.
- Record which routes need exact source replacement.
- Update status and PR history.

## Out Of Scope

- Replacing source URLs in this batch.
- Promoting or hiding routes in code.
- Adding automatic source extraction.
- Claiming validation.
- Adding native records, integrations, login, payment, community, or AI publishing.

## Acceptance Criteria

- The audit lists every current real+broad route.
- Creator channel/site routes are kept out of representative/public MVP framing until exact source replacement.
- Broad official portal routes are allowed only as reference entry points, not promotion evidence.
- Docs state that missing source specificity must not be filled with invented steps.
- Documentation checks pass.
