# Mobile Flow Save To My Flow Design

## Status

Approved direction from user: **B first, then C**.

This spec covers the next mobile UX redesign for:

- `/f/moving-d30-basic`
- `/my`

It does not implement the full C-stage integrated workspace yet.

## Product Intent

The current public Flow page still reads too much like an export/download surface. The user clarified a stronger mental model:

1. A user sees the original outside content.
2. They hear or infer: "try saving this as a Flow."
3. They open the Flow page.
4. They inspect what the content becomes.
5. They save it somewhere.
6. Their public-page session can end.
7. If they return, they should manage it from `내 Flow`.

The product should therefore move from:

```text
content -> anchor -> preview -> external export
```

to:

```text
content -> anchor -> preview -> save to My Flow -> manage or export
```

External calendar/xlsx/copy actions still matter, but they should become secondary after the user understands and saves the Flow.

## B First

### Public Moving Flow

On mobile, `이사 D-30 준비 Flow` should become a save-first conversion screen.

The first screen should answer:

- What will this original content become for me?
- What date or anchor do I need to enter?
- What will be saved into My Flow?
- Can I still send it to calendar, checklist, or sheet?

The primary CTA should be:

```text
내 Flow에 저장
```

Secondary actions:

- `캘린더로 보내기`
- `엑셀 실행표 받기`
- `체크리스트 복사`

These secondary actions should not visually compete with the save CTA above the fold.

### Save Completion

After saving, the page should show a clear completion state:

- `내 Flow에 담았어요`
- Primary: `내 Flow에서 관리하기`
- Secondary: `캘린더로 보내기`, `엑셀 실행표 받기`, `체크리스트 복사`

This lets the user end the session or continue into internal management.

### Preview Template

The calendar/checklist preview should look like a real template, not a generic dense card stack.

Mobile preview requirements:

- Calendar preview uses a compact month-like template with dated chips.
- Checklist preview uses stable row sizing, visible completion boxes, and less outer padding.
- Preview cards use the full mobile width more efficiently.
- Cards should not be nested heavily.
- The page should not feel narrower than the viewport.

## My Flow B Scope

`/my` should stop feeling like a creator/draft admin area first. It should read as the user's saved Flow management surface.

For this batch:

- Put saved/active Flows first.
- Show `이사 D-30 준비 Flow` after saving from the public page.
- Show anchor, progress, and next action.
- Primary action: `이어서 관리하기`.
- Keep copied/drafted Flow management available, but below active saved Flow management.
- Do not build full account/auth persistence.

Minimum saved Flow card:

```text
이사 D-30 준비 Flow
이사일 2026-06-26 · 0/24 완료
[이어서 관리하기]
```

The card may also show small preview affordances:

- `캘린더`
- `체크리스트`
- `엑셀`

These are not full tabs yet.

## C Later

The next stage should turn `/my` into an execution home:

- `Flow별`
- `캘린더`
- `체크리스트`
- `루틴`

In C:

- Calendar view combines dated items from multiple saved Flows.
- Checklist view combines open checklist items.
- Routine view combines repeated sessions.
- Users can filter by a specific Flow.
- Completion state is reflected across all views.

This batch should not implement full C, but it should avoid choices that block it.

## Data Model Direction

Do not add a backend or account system in this batch.

Use existing local storage patterns:

- stored anchor
- item check state
- workbench state
- active progress detection

Add a local saved marker if needed so a Flow can be explicitly saved even before the user checks an item.

Potential local key shape:

```text
flow:saved:<slug>
```

Stored value can include:

- slug
- savedAt
- selectedArtifactMode: `calendar` | `checklist` | `sheet`
- anchor at save time

This keeps C possible because `/my` can distinguish:

- visited but not saved
- saved but no progress
- saved and in progress
- copied/drafted

## UX Rules

- Save is the primary action on mobile public Flow.
- External export remains available but is secondary.
- Preview before save must be concrete enough to trust.
- My Flow must show saved Flows even if no item is checked yet.
- No route should be called validated.
- Source/risk panels remain separate from user execution.
- Do not add a marketing hero.
- Do not add login, payment, community, integrations, or full sync.

## Visual Direction

Use a cleaner mobile product surface than the current page:

- Less outer page padding on mobile.
- Wider cards with controlled internal padding.
- Stronger template-like calendar/checklist preview.
- One primary blue CTA per screen.
- Secondary actions are outline or quiet list rows.
- No decorative blobs, gradient backgrounds, or marketing sections.
- Keep 8px or smaller radius unless a mobile sheet needs a top radius.

## Proposed Public Flow Mobile Order

1. Compact FLOW top bar.
2. Source/context line.
3. Title and one-sentence outcome.
4. Anchor input.
5. Preview mode switch or preview summary:
   - calendar
   - checklist
   - sheet
6. Primary save CTA.
7. Secondary export row or bottom sheet.
8. Source/risk/reference panels.

## Proposed My Flow Mobile Order

1. Compact header: `내 Flow`.
2. Saved/in-progress Flow cards.
3. Lightweight filters:
   - `Flow별`
   - `캘린더`
   - `체크리스트`
4. Copied/drafted Flow management.
5. Creator/profile links lower on the page.

## Acceptance Criteria

For `moving-d30-basic` mobile:

- User can enter an 이사일.
- User can save the Flow to My Flow without checking an item.
- Save completion state appears.
- `내 Flow에서 관리하기` opens `/my`.
- Calendar/xlsx/copy actions still work.
- No horizontal overflow at 390px.
- Calendar/checklist preview feels like the product output, not explanatory filler.

For `/my` mobile:

- Saved moving Flow appears even with 0 completed items.
- In-progress state still appears when checks exist.
- Existing copied/drafted Flow tests keep passing.
- Creator/admin language is visually secondary.

Verification:

- `npm run build`
- `npm test`
- `npm run docs:check`
- Targeted Playwright for save-to-My-Flow flow.
- Full `npm run test:e2e` if user-facing flow behavior changes broadly.
- Browser/Playwright screenshots for mobile public moving page and `/my`.

## Out Of Scope

- Full C integrated calendar/checklist/routine views.
- Backend persistence.
- User accounts.
- External calendar API integration.
- Real sync with Google/Apple calendar.
- Analytics/event pipeline.
- Production design system extraction into a separate component library.

## Open Design Notes

- C is the intended next stage, but B must remain useful by itself.
- The save marker should be explicit, not inferred only from checking items.
- Export-first principles still apply: the saved Flow should remain portable to external tools.
- The first implementation should focus on `moving-d30-basic` as the low-risk control route before applying the pattern globally.
