# Broad Source Flow Lab Panel Spec

Date: 2026-05-25

## Goal

Render the broad-source guard in Flow Lab so editors can see broad real-source routes and representative leaks without reading tests or summary data directly.

## User Story

As a FLOW editor, I need Flow Lab to show broad-source guard status, so I can prioritize exact source replacement before promotion work.

## In Scope

- Add a compact Flow Lab panel for broad-source guard data.
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
- After the ThankyouBUBU source replacement batch, the current expected count is 5.
- The panel shows `Representative leaks` as 0.
- The panel includes current broad-source queue routes such as `real-fitvely-diet-record-routine` and `real-mofa-overseas-travel-prep`.
- Targeted E2E passes after a RED failure.
