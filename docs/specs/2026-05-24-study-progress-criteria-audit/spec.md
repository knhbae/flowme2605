# Study Progress Criteria And UX Audit Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [Study Progress Table Rules](../../flow-rules/study-progress-tables.md)

## Goal

Make the study-progress-table rule explicit and record a real-user export-first audit for the current representative/public MVP candidate routes.

## Stage Fit

This is Stage 0 documentation and audit work. It strengthens conversion quality without adding native record keeping, automatic progress-table generation, external integrations, login, payment, community, or AI publishing.

## User Need

As a learner or creator converting study content into FLOW, I need progress rows to come from the source structure, so users only adjust execution fields and export the result instead of designing a blank tracker.

## Scope

In:

- Define when study content is eligible for a progress table.
- Record `computer-skills-d30-study` as the current example.
- Add a creator checklist for choosing progress table versus checklist, memo, routine, comparison table, or score log.
- Audit six target routes for first action, natural artifact, UX gap, export-first fit, mobile density, and source/risk separation.
- Recheck representative/public MVP candidate language without claiming validation.

Out:

- No automatic curriculum generation.
- No URL ingestion.
- No AI auto-publishing.
- No native FLOW study dashboard.
- No code behavior change in this batch.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Study user enters an exam date and reviews source-derived rows; non-study users start with the route's primary artifact. |
| Completion signal | Creator can point to the source row basis; user can export the calendar, sheet, memo, checklist, reaction log, or comparison table. |
| Artifact destination | Calendar, sheet, memo, checklist, reaction log, or comparison table outside FLOW. |
| Source/risk boundary | Source facts, creator conversion, user notes, and risk cautions remain separate. |
| Natural artifact | Six-route audit records realistic values and expected external artifacts. |
| Verification | `npm run docs:check`; broader commands recorded in QA if run. |

## Acceptance Criteria

- `docs/flow-rules/study-progress-tables.md` defines eligible and ineligible study sources.
- Content conversion playbooks reference the study-progress rule.
- The audit documents `computer-skills-d30-study` as the current criteria example.
- The six target routes have real-user artifact simulations and UX gap notes.
- `docs/STATUS.md` and PR history record the batch.
