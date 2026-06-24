# Source-backed Flow Map My Flow execution

- Date: 2026-06-25
- Branch: `design-ref-full-gap-alignment`
- PR URL: https://github.com/knhbae/flowme2605/pull/114
- Status: Merged, Deployed
- Deploy URL: https://flowme2605-cgtsi5nl0-flowme.vercel.app

## Why

The current product question is whether real Korean source-backed Flow Maps can move from public content discovery into My Flow and remain usable as a lightweight execution surface. The user specifically asked to verify the five new Flow examples by acting like a real user: save them, open them in My Flow, inspect Step detail, check items, write memos, and revisit later.

## What Changed

- Added and wired five real-source Flow Map examples:
  - postal address transfer
  - smishing response
  - year-end tax submit
  - aircon filter cleaning
  - picnic food safety
- Extended source-backed My Flow conversion so saved maps keep parent map metadata, child Flow rows, source links, item fallback text, and portable execution fields.
- Improved My Flow execution detail UX:
  - primary source link is visible near the Step detail instead of hidden behind advanced metadata
  - item checklist state and memo state persist through revisit
  - routine next action opens the matching detail row directly
- Added creator/public/My Flow separation surfaces for source-backed maps.
- Added source-backed expansion tests and E2E coverage for save, execute, memo, checkbox, and revisit behavior.
- Added planning and UX/content audit documents for the productization slice.

## Not Done

- This does not claim real user validation. It is internal product/QA evidence only.
- Calendar recurrence editing, user-level source update review policy, and creator publish workflow polish are still follow-up work.
- The preview deployment is not production.

## Decisions

- Public Flow Map pages should stay save-before focused.
- My Flow should show actionable Step detail rather than developer review metadata.
- The primary source link belongs in the Step detail body; extra links or attachments can stay in advanced detail.
- A Step can persist portable calendar/task fields, item checks, and memo without exposing the full creator model to the user.

## Files Touched

- `components/flow/AppClient.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `components/flow/SourceBackedFlowMapCreatorEditor.tsx`
- `lib/flow/source-backed-my-flow.ts`
- `lib/flow/source-backed-expansion-260625.ts`
- `lib/flow/source-backed-my-flow.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/specs/2026-06-24-source-backed-flow-map-productization/`
- `docs/specs/2026-06-24-flowme-platform-feature-planning/`
- `docs/content-audit/2026-06-24-*`
- `docs/content-audit/2026-06-25-*`

## Verification

- `npm run docs:check`
- `npm test`
- `npx playwright test --reporter=line --workers=1`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "source-backed expansion flows execute source link checklist and memo in my flow" --reporter=line --workers=1`
- Vercel preview build: https://flowme2605-cgtsi5nl0-flowme.vercel.app

## Risks

- The branch has a broad productization diff; review should focus on whether the saved My Flow execution path remains simple enough.
- The five Flow examples are source-backed but still need human product review for content desirability.
- The current UI is validated by tests and internal rehearsal, not by observed external users.

## Follow-ups

- Review the preview manually using the five source-backed maps and `/my`.
- Decide whether the creator editor should be promoted from internal PoC to a tighter publish workflow.
- Continue separating old/generated content candidates from user-facing product-ready Flow examples.

## Links

- Preview: https://flowme2605-cgtsi5nl0-flowme.vercel.app
- PR: https://github.com/knhbae/flowme2605/pull/114
