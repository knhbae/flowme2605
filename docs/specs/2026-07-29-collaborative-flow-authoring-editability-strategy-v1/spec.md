# FlowMe Collaborative Authoring & Editability Strategy v1.1

**Date:** 2026-07-29  
**Status:** Completed research — recommendation pending owner review  
**Owner:** Product owner  
**Related roadmap:** Design and Research Shelf; not an active implementation slice

## Goal

Define who may edit which part of a Flow, where that edit belongs, how it
propagates, and how it survives a published update. The strategy combines
wiki-like low-friction authoring and small contributions, GitHub-like separation
of canonical content, private copies, proposed changes, review, and history,
Figma/Notion-like one-step personal reuse, and Cookpad/Instructables-like
separation of source content from execution results.

The user-approved work is the research and contract package. The hybrid model is
a recommendation, not a settled runtime requirement.

## Stage Fit

FlowMe remains an export-first action compiler. This strategy clarifies the
boundary between source-backed public content, a user's personal execution
copy, run state, and Calendar/Todo/Sheet/Memo projections before direct creator
publishing, community editing, or external round-trip sync is considered.

This package does not reopen the current runtime release gate and does not
promote an implementation slice.

## User Needs

- As an executor, I need to adapt a useful Flow without losing its source or
  allowing a later publisher update to erase my dates, notes, and history.
- As a contributor, I need to suggest one small correction without learning
  developer collaboration terminology or rewriting a whole Flow.
- As a creator or maintainer, I need canonical content changes to be reviewed,
  attributable, reversible, and distinct from a user's private execution.

## Role-based Proto-persona And Journey Research Contract

The executor, contributor, and creator/maintainer are behavior-based
proto-personas derived from S01–S06, not validated customer segments or
demographic personas. Observed-user status remains `0 / 15`; report completion,
automated QA, and responsive inspection do not validate these journeys.

The shared five-stage comparison is:
`published baseline preparation or discovery -> ownership start ->
personalization or contribution -> execution or review -> update or external continuation`.

| Proto-persona | Scenario trace | UI trace | Owned artifact |
| --- | --- | --- | --- |
| Executor | S02, S04, S05 | A public version -> B private copy -> D update review -> detached projection | `UserFlowCopy`, `ExecutionRun`, occurrence |
| Contributor | S03, S06 | A/B bounded field selection -> C proposal -> E review state | selected `ChangeProposal` and evidence only |
| Creator or maintainer | S01 plus proposal review | draft/source review -> E proposal review -> new published version -> D user choice | reviewed immutable `PublishedVersion` |

Screen E is a required code-native research hypothesis, not a runtime component.
It must compare the current published field, selected patch, evidence, and
private-payload exclusion state, then separate `request evidence`, `reject with
reason`, and `accept into new immutable version`. Acceptance must not mutate the
existing version or expose personal schedules, memos, completion, or history.

Trace sources:
[persona, scenario, and journey map](../../content-audit/2026-07-29-flowme-persona-scenario-journey-map-v1.json),
[governance and scenario contract](../../content-audit/2026-07-29-flowme-version-governance-scenario-contract-v1.json),
[content editability policy](../../content-audit/2026-07-29-flowme-content-editability-policy-v1.json), and
[quantitative evidence ledger](../../content-audit/2026-07-29-flowme-collaborative-authoring-quantitative-evidence-v1.json).

## Scope

### In

- Seven-platform mechanism matrix drawn from the 22-platform dossier.
- A quantitative evidence ledger that records period, denominator, evidence
  grade, caveat, and source for every displayed number.
- Eight vertical execution-pattern editability policies covering all 24
  verified services.
- Eight representative real-service anatomy cards that separate public
  observation, benchmark synthesis, FlowMe inference, and unknown behavior.
- Content-type rules for in-Flow edits, run state, and external artifacts.
- Canonical ownership, precedence, version review, and conflict scenarios.
- Recommended hybrid operating model and rejected/deferred alternatives.
- Representative executor, contributor, creator, update, external-edit, and
  sensitive-content scenarios.
- A proposed observed-session protocol and explicit evidence boundary.
- Korean CEO report with code-native evidence charts, A–D product UI contract
  mockups, the required E maintainer-review hypothesis, and the team handoff.

### Out

- Runtime, route, component, database, API, seed, or export-code changes.
- Anonymous direct editing of canonical published content.
- GitHub branch/PR terminology in the user interface.
- Real creator publishing, moderation operations, marketplace, reputation, or
  monetization systems.
- Calendar, Todo, Sheet, or Memo OAuth and bidirectional synchronization.
- Reimplementation of vertical-service recommendation, diagnosis, calculation,
  media, reservation, payment, map, or device-control engines.
- Observed-user validation or claims of adoption and business outcome.

## Established Contracts And New Hypotheses

| Type | Contract |
| --- | --- |
| Established | `SourceRow → Item → Step → Flow → Bundle/Flow Map`; Item is the minimum independently stateful unit. |
| Established | Effective state merges immutable published version, reviewed version resolution, `UserFlowCopy` overlay, `ExecutionRun`, occurrence override, and unsaved UI buffer in that order. |
| Established | Source, caution, and creator/official boundaries are published-content owned; personal inclusion, title, schedule, and memo are overlay owned; completion/skip/hold/decision/record are run owned. |
| Established | A new published version never silently overwrites a saved personal copy; stable Item IDs and explicit three-way review are required. |
| New hypothesis | Authoring and contribution should feel wiki-like at the text, Item, SourceRow, and issue-report level. |
| New hypothesis | Canonical changes should use a GitHub-like private-copy/proposal/review/history lifecycle without exposing GitHub vocabulary. |
| New hypothesis | Personal reuse should be one-step and freely editable like a Figma/Notion copy while retaining creator/source attribution. |
| New hypothesis | External artifacts are detached, one-way projections until repeated demand justifies explicit reimport and diff review. |

## Recommended Operating Model

```text
source / creator
  -> immutable published Flow version
      -> private UserFlowCopy overlay
          -> ExecutionRun / occurrence state
              -> Calendar / Todo / Sheet / Memo projection

executor or contributor
  -> bounded correction or improvement proposal
      -> maintainer review
          -> new immutable published version
              -> explicit three-way review for existing personal copies
```

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Preview a complete Flow, then create a private execution copy or suggest one bounded correction. |
| Completion signal | Every editable field has an owner, edit location, propagation rule, conflict rule, and recovery rule. |
| Artifact destination | Calendar, Todo/Checklist, Sheet, or Memo is a projection; it is not canonical content. |
| Source/risk boundary | Source facts, creator experience, caution, personal overlay, and execution history remain separate. |
| Natural artifact | The content shape determines the primary destination and the minimum personal anchor. |
| Service structure impact | None in this research package; runtime ownership remains unchanged. |
| Tooling and verification | JSON parse, link/docs check, HTML structure and responsive browser inspection. |
| Observed-user status | `0 / 15`; proposed protocol only, not run. |

## Decision Gates For Owner Review

1. Adopt, revise, or block the hybrid operating model.
2. Confirm that canonical public changes are proposal-and-review only.
3. Confirm one-way external projection as the default until repeated export
   behavior creates a round-trip revisit trigger.
4. Choose whether a later implementation should start with private copy and
   personal overlay, micro-contribution, or version-update review. Only one may
   be promoted as the next product slice.

## Acceptance Criteria

- All 22-platform conclusions used by this package trace to the existing
  dossier; the normalized deep comparison covers the seven most relevant
  platforms.
- All 24 verified vertical services appear once in one of eight execution
  patterns.
- The 24-service decision distribution totals `24`, the eight pattern counts
  total `24`, and all displayed percentages retain their denominator.
- Platform metrics show their period, scope, source, evidence grade, and
  non-inference caveat; unlike units are not ranked on one axis.
- Publicly observed behavior, FlowMe inference, and unknown round-trip behavior
  remain separate.
- Every field group names its owner and whether it may affect canonical
  published content.
- Added, changed, removed, caution, occurrence, concurrent-edit, and external
  projection conflicts have explicit handling.
- Apply, validate, defer, and reject decisions include rationale and revisit
  triggers.
- The report labels runtime implementation, external round-trip, creator
  operations, and observed-user validation as not run.
- The report shows A public-copy, B personal-copy, C change-proposal, D
  version-update, and E maintainer-review contracts as code-native UI
  hypotheses without implying runtime completion.
- The E surface separates evidence request, reasoned rejection, and acceptance
  into a new immutable version while excluding private user payload.
- Repository documentation checks and current-worktree scoped closeout are
  recorded in `qa.md`.

## Deliverables

- [CEO strategy report](../../content-audit/2026-07-29-flowme-collaborative-authoring-editability-strategy-ceo-ko.html)
- [Quantitative and representative-service evidence](../../content-audit/2026-07-29-flowme-collaborative-authoring-quantitative-evidence-v1.json)
- [Platform mechanism matrix](../../content-audit/2026-07-29-flowme-collaborative-authoring-platform-matrix-v1.json)
- [Vertical and content-type editability policy](../../content-audit/2026-07-29-flowme-content-editability-policy-v1.json)
- [Governance and scenario contract](../../content-audit/2026-07-29-flowme-version-governance-scenario-contract-v1.json)
- [Team handoff](../../content-audit/2026-07-29-flowme-collaborative-authoring-strategy-team-handoff-ko.md)
