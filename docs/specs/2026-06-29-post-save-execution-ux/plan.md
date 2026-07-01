# Post-save Execution UX Plan

## Files

| File | Responsibility |
| --- | --- |
| `docs/content-audit/2026-06-29-post-save-execution-ux-plan-ko.html` | Korean review artifact for problem definition, user journey, information structure, and screen-frame proposal. |
| `docs/content-audit/2026-06-29-post-save-execution-ux-wireframe-ko.html` | Clickable Korean wireframe artifact for reviewing the proposed 4-tab post-save execution surfaces before implementation. |
| `docs/specs/2026-06-29-post-save-execution-ux/spec.md` | Durable spec for the accepted scope and gates before implementation. |
| `docs/specs/2026-06-29-post-save-execution-ux/plan.md` | Implementation planning outline and file boundaries. |
| `docs/specs/2026-06-29-post-save-execution-ux/tasks.md` | Task checklist to use after user review approves implementation. |
| `docs/specs/2026-06-29-post-save-execution-ux/qa.md` | QA checklist and current planning-stage verification evidence. |
| `docs/superpowers/plans/2026-06-29-post-save-execution-ux.md` | Skill-generated implementation plan skeleton for later execution. |
| `components/flow/AppClient.tsx` | Future implementation owner for Home, FlowList, MyFlows, calendar surface, PublicFlow, and Step detail rendering. |
| `components/flow/SourceBackedFlowMapPage.tsx` | Future implementation owner for public source-backed Flow Map detail preview structure. |
| `components/flow/SourceBackedFlowMapSaveButton.tsx` | Future implementation owner for source-backed save CTA placement and mobile sticky save behavior. |
| `tests/e2e/flow-mvp.spec.ts` | Future route-level verification for saved execution journey. |

## Sequence

1. Create the planning HTML, clickable wireframe, and spec files.
2. Run `npm run docs:check`.
3. Ask for user review of the planning HTML and clickable wireframe.
4. If approved, update `components/flow/AppClient.tsx` in this order:
   - `내 Flow` today/next structure.
   - Step base/detail information split.
   - Calendar selected-date panel placement.
   - Flow finding label/card copy.
5. Update `SourceBackedFlowMapPage.tsx` and `SourceBackedFlowMapSaveButton.tsx` for public detail save CTA only after the saved-execution surface is clear.
6. Run targeted E2E, mobile screenshot checks, `npm test`, `npm run build`, and preview deploy.

## Risk Controls

- Do not implement before the planning HTML and wireframe are reviewed.
- Keep user-facing labels simple; keep `Flow Map`, `Step`, and `Item` language in specs, creator screens, and reports.
- Do not add usage stats, reviews, or image-heavy Home work in this scope.
- Do not claim validation without real user behavior data.
- Keep the first implementation pass limited to P0/P1 UX issues.
