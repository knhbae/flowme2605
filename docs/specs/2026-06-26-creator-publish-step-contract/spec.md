# Creator Publish Gate and Step Contract

**Date:** 2026-06-26  
**Status:** implementation checkpoint  
**Scope:** source-backed Flow Map publish path, saved My Flow execution contract, route separation

> **Canonical compatibility notice (2026-07-12):** This checkpoint uses the June Step-first runtime vocabulary. New backend and export work follows [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md): canonical `Item` owns independent execution/projection state and canonical `Step` groups Items. Preserve this document as historical route behavior, not as the new storage minimum.

## Problem

Recent Flow Map and My Flow UX work improved the visible surfaces, but the product boundary still needed a stronger contract:

- A public Flow Map save page should not behave like a creator review page.
- A creator page should review source rows and publish readiness, not execute saved Steps.
- A saved Flow Map must persist enough Step-level data for My Flow to show and later regenerate calendar/todo/sheet exports.
- User-facing Step detail should stay close to calendar/todo app complexity and open inline under the selected Step.

## Settled Model

The working hierarchy remains:

```text
Flow Map > Flow > Step > Item
```

- **Flow Map:** a source-backed parent structure, such as a moving schedule map or a curriculum map.
- **Flow:** a child executable bundle under the map.
- **Step:** the minimum unit that can become a calendar event, todo, sheet row, memo row, or progress row.
- **Item:** nested checklist/detail/fallback text inside a Step. FlowMe may render Items as checkboxes, but external apps can receive them as plain text.

## Route Responsibilities

### Public route

Examples: `/flow-maps/moving-d30`, `/flow-maps/middle-school-math-1`

The public route should:

- show the source-backed map in user language;
- ask only for required setup input, if any;
- let the user save the whole map;
- keep source URL and source title visible;
- hide creator review controls and internal quality language.

It should not show:

- creator draft controls;
- source-fit scores;
- PoC/review wording;
- Step editing UI before save.

### My Flow route

Example: `/my?savedMap=middle-school-math-1`

The My Flow route should:

- confirm what was saved;
- show the user's saved Flow/Step execution surface;
- open Step detail inline under the selected Step;
- allow lightweight date/time/repeat/location/memo edits where relevant;
- regenerate portable text and calendar `.ics` output from the edited Step detail;
- keep source URL/detail reachable from Step detail.

It should not require the user to understand creator publishing, source rows, or review labels.

### Creator route

Example: `/flow-maps/middle-school-math-1/creator`

The creator route should:

- show source rows;
- show how each source row becomes a Step;
- allow editing Step title, destination, source URL, item fallback, and creator note;
- save creator draft separately from public/user surfaces;
- mark local publish readiness without mutating user progress.

It should not show user execution controls such as today's execution, completion checking, or My Flow Step detail.

## Step Contract

Saved source-backed Flow Maps now persist child Flow bindings with Step bindings.

Each Step binding includes:

- `stepId`
- `title`
- `destination`
- `calendar`
- `textFallback`
- optional `sourceUrl`
- optional `sourceType`
- optional `riskLevel`

This makes the saved record useful beyond the old bridge snapshot:

- My Flow can reconstruct the user's execution rows.
- Calendar/todo/sheet regeneration can use the same Step source of truth.
- Item fallback text remains available for apps that cannot render nested checklists.
- Official or sensitive maps can keep source/risk metadata attached to each Step.

## Step Export Regeneration

My Flow Step detail now has a small `내 도구로 옮기기` action area. It is not a new workspace surface; it sits inside the opened Step detail so the first screen stays close to calendar/todo app complexity.

The current implementation regenerates:

- memo/plain-text fallback from the edited Step title, date, time, repeat preset, location, memo, checked Items, completion criteria, caution, and source URL;
- calendar `.ics` output from the edited date/time/repeat/location/memo/source fields.

This pass proves the Step detail can be the source of portable output after user edits. Todo/sheet regeneration and account-backed persistence remain future work.

## Current Representative Coverage

### Moving D-30

- Map type: timeline map
- Child Flow count: 1
- Step destination: calendar/hybrid
- Required input: move date
- Contract expectation: each Step carries anchor-offset calendar data and item fallback text.

### Middle-school math 1

- Map type: curriculum/progress map
- Child Flow count: 1
- Step destination: progress
- Required input: none by default
- Contract expectation: each Step carries chapter title and source-derived sub-items without inventing daily study tasks.

### Baby health schedule

- Map type: official schedule map
- Child Flow count: 2
- Step destination: calendar/hybrid
- Required input: baby birth date
- Contract expectation: each Step carries official source URL, medical-sensitive risk metadata, date window, and fallback text. Homepage exposure remains blocked until content quality is revised.

## Non-Goals

This checkpoint does not claim:

- real user validation;
- account-backed publishing;
- automatic source updates;
- direct Google Calendar/Todo/Sheet integration;
- full creator marketplace readiness.

## Acceptance Criteria

- Public route hides creator controls.
- Creator route hides user execution controls.
- Saved My Flow Step detail opens inline, not in a bottom dialog.
- Saved persistence record includes Step-level contract rows.
- Representative maps preserve source URL and item fallback data per Step.
- Edited Step detail values regenerate portable text and `.ics` calendar output.
- `docs:check`, unit tests, build, and targeted E2E pass before treating this checkpoint as stable.
