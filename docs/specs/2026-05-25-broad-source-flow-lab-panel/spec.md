# Broad Source Flow Lab Panel Spec

Date: 2026-05-25

## Goal

Render the broad-source guard in Flow Lab so editors can see broad real-source routes and representative leaks without reading tests or summary data directly.

## User Story

As a FLOW editor, I need Flow Lab to show broad-source guard status, so I can prioritize exact source replacement before promotion work.

## In Scope

- Add a compact Flow Lab panel for active broad-source guard data.
- Show hidden broad-source decisions separately from active replacement work.
- Add E2E coverage for panel visibility, broad count, leak count, and representative route slugs.
- Capture a desktop screenshot.
- Update docs/status/PR history.

## Out Of Scope

- Public route exposure changes.
- New public user-facing copy.
- Automatic source replacement.
- Full Content Lab redesign.
- Validation claims.

## Acceptance Criteria

- `/flow-lab` shows `Broad Source Guard`.
- The panel shows `Broad real sources` as the current real+broad route count.
- After the FITVELY weekly body-check hide decision, the current active expected count is 0.
- The panel shows `Representative leaks` as 0.
- The replacement queue shows `none`.
- The hidden decision list includes `real-fitvely-weekly-body-check`.
- Targeted E2E passes after a RED failure.
