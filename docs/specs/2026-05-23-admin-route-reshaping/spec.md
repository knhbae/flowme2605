# Admin Route Reshaping Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** `docs/ROADMAP.md` Stage 0 content/UX hardening

## Goal

Turn the audited `reshape_before_featured` admin and official routes into flows that produce the artifact a user would naturally keep: a condition table for driver renewal, requirement memo cards for certificate issue routes, and a multi-deadline record for Q-Net exam application.

## Stage Fit

This belongs in Stage 0 because the routes already have exact official sources, but the current user experience is still a generic checklist. The work must improve source-backed execution and export value without adding accounts, backend persistence, or broad branching engines.

## User Need

As a user handling an official task, I need FLOW to capture the specific requirement, deadline, disclosure scope, or proof value that determines whether the task is complete, so that exported text or sheets remain useful after I leave the page.

## Scope

In:
- `driver-license-renewal-check` gets a condition comparison table for renewal and 적성검사 choices.
- `family-certificate-issue` and `resident-register-copy-issue` get structured requirement memo fields.
- `qnet-exam-application-prep` gets deadline and exam-day log fields in the workbench and exports.
- Docs and PR history record natural artifact simulation, current Flow/UX gap, and content/UX reinforcement.

Out:
- Full conditional hiding of checklist items.
- Multiple anchor date inputs beyond workbench/export fields.
- New remote data fetches or official API integrations.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Enter the relevant requirement or deadline field before checking generic tasks. |
| Completion signal | Memo/log/export contains the submitted requirement, disclosure scope, deadline, or exam-day decision. |
| Artifact destination | Driver renewal: sheet comparison. Certificates: memo and sheet. Q-Net: calendar plus sheet log. |
| Source/risk boundary | Official facts remain in source/title/details; user-entered requirements and proof stay in workbench state. |
| Natural artifact | Condition table, 제출처 요구사항 메모, 개인정보 공개 범위 메모, 접수/수험표 deadline log. |
| Verification | Unit tests for plan/fields/export, docs check, build, and targeted E2E for visible workbench fields. |

## Acceptance Criteria

- Driver renewal exposes a condition comparison table before the execution checklist.
- Family and resident certificate routes render memo-card fields for submitter requirement and disclosure scope, and export those labels with user values.
- Q-Net renders log tables for application deadline, payment/status, admission ticket, exam site, and result date, and exports those labels with user values.
- Content audit docs describe simulated natural artifacts, current gap, and follow-up UX reinforcement for each reshaped route.
