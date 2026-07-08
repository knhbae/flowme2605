# Flow finding card v2 density plan

Date: 2026-07-03
Scope: `/flows` catalog cards only.

This is a planning note for the second Flow finding card pass. Figma editing was attempted first, but the Figma MCP Starter plan call limit blocked additional writes. The implementation should still follow this plan and can be mirrored into Figma later.

## Problem

The first redesign moved the card from an internal spec card toward a user decision card, but it still exposes too many equivalent facts at the same visual weight:

- category, readiness, source signal
- title and summary
- `필요한 입력`, `결과물`, `첫 할 일`
- flow/step/check scale
- `저장 전 보기`, `바로 시작`, source link

This is honest, but it still reads more like a detailed catalog record than a commercial service card.

## V2 Principle

The card should answer one question first:

> What do I put in, and what will FlowMe create for me?

Everything else becomes supporting context.

## Card Hierarchy

1. Trust row: category + readiness + source signal.
2. Title.
3. Promise sentence: `[input]만 넣으면 [artifact]로 저장`.
4. Short summary, max two lines.
5. One action preview box: `먼저 할 일`.
6. Secondary metadata: scale + source availability.
7. Actions: one strong primary action, quiet secondary links.

## Copy Rules

- Avoid internal readiness copy such as `자료 보강 후 시작`.
- Use user-facing readiness copy:
  - `바로 저장 가능` -> `바로 시작 가능`
  - any `보강` state -> `확인하며 사용`
  - unknown state -> `확인 가능`
- Keep `Flow`, `Step`, `Item`, `bundle`, `review`, and `audit` out of normal catalog cards.
- Keep source links visible but visually quieter than the primary action.

## Implementation

- Add a small Korean particle helper for `로/으로` in the promise sentence.
- Add display helpers for catalog promise and readiness label.
- Reduce the three equal fact boxes to one `먼저 할 일` box.
- Keep the existing route contracts and test IDs:
  - `flow-map-detail-link`
  - `flow-map-recommended-flow-link`
  - `flow-map-source-link`
  - `single-flow-catalog-card`
- Update E2E around card copy and search behavior.

## Acceptance Checks

- `/flows` still shows 12 integrated content cards.
- Search and intent chips still reduce visible cards.
- Curated 9 source-backed cards remain integrated.
- Mobile 390px has no horizontal overflow.
- The first visible card shows one promise sentence and one primary action, not three equivalent fact blocks.
- Internal readiness copy such as `자료 보강 후 시작` is not visible in the normal catalog.
