# Flow finding commercial-card redesign

Date: 2026-07-03
Scope: `/flows` only. This is a planning note for Figma draft and implementation.

This is product/design planning and browser QA, not real user validation.

## Current Gap

The current Flow finding card is functionally honest but reads like a data/spec card. It exposes category, status, title, summary, Flow/Step/check counts, recommended Flow, preview steps, and three actions with similar weight. A commercial catalog card usually does a different job: it helps the user decide quickly whether this content fits their current situation and what they will get after saving.

## Screen Job

User: someone with a concrete task such as moving, studying, baby schedule, purchase check, or reading routine.
Need: pick one content item that can be saved into calendar/checklist/sheet/memo without understanding Flow internals.
Destination: `/flow-maps/[map]` for source-backed map review or `/f/[slug]` for direct execution.
Completion signal: the user opens a card or starts the recommended Flow with clear expectation of input and output.

## Functional Plan

- Keep all 9 curated source contents integrated with existing content in one catalog.
- Add a lightweight search field across title, summary, category, output, input, and preview tasks.
- Add quick intent chips for common jobs: `전체`, `이사/계약`, `공부`, `아이/건강`, `구매/생활`, `루틴`.
- Keep advanced filters collapsed.
- Keep one primary card action: `저장 전 보기`.
- Keep `바로 시작` as a secondary action and `원문` as a tertiary trust link.

## Card Information Hierarchy

1. Trust and fit row: category, readiness, source signal.
2. Title.
3. Outcome sentence: what the saved content becomes.
4. Decision facts: `필요한 입력`, `결과물`, `첫 할 일`.
5. Low-weight scale info: `분량 n단계 / n체크`.
6. Actions: primary view, secondary start, tertiary source.

## UI Rules

- Do not show `Flow`, `Step`, `Item`, `bundle`, `review`, or `audit` in normal catalog cards.
- Counts should not dominate. Use them as scale hints only.
- Source links should be visible but visually quieter than the primary action.
- Mobile 390px should show one complete card decision path without horizontal scrolling.
- The first viewport should answer: "What can I save here, and what happens next?"

## Figma Draft Scope

- Mobile 390px frame: header, search, quick chips, first three cards, bottom tab context.
- Desktop 1160px frame: header, search/filter row, 3-column card grid.
- Include a small annotation strip documenting the hierarchy change from spec-card to decision-card.

## Implementation Scope

- Update `FlowList` catalog header, search/chips, filtered list logic, and card layout.
- Reuse existing data contracts from `flowMapCatalogLinks` and `DirectoryFlowCard`.
- Avoid changing Flow Map detail, public Flow detail, My Flow, export, or seed conversion logic.

## Acceptance Checks

- `/flows` still shows 12 integrated content cards.
- 9 curated source cards still have `data-source-kind="curated-source"`.
- Search and quick chips reduce the visible catalog without route changes.
- Card first screen prioritizes outcome/input/output/first task over counts.
- Mobile 390px has no horizontal overflow.
- Existing E2E around `/flows` is updated, not removed.
