# Hold and Export Completion Pass

Date: 2026-05-26

## Scope

This pass completes the five follow-up items from the validation-fix design review:

1. Extend the hold model beyond the new-car handover route.
2. Attach hold inputs to the decision workbench instead of keeping hold guidance read-only.
3. Include hold criteria and hold memo values in text and workbook exports.
4. Reflect filled hold signals in the mobile sticky export CTA.
5. Bring the uploaded `flowme.zip` review materials into branch docs as extracted, reviewable files.

## Product Boundary

- Hold fields are user records, not FLOW decisions.
- FLOW can say why the user should pause, what evidence is missing, and what to check next.
- FLOW still must not label a route as validated without observed user behavior.
- Export remains the primary Stage 0 artifact: text and `.xlsx` carry hold context out to the user's existing workflow.

## Implementation Notes

- `used-car-buying-check` now has a flow-level `hold_section` with purchase-hold criteria.
- New-car and used-car hold sections share editable hold memo fields:
  - `보류 사유`
  - `사진/증빙 파일명`
  - `상대방 확인`
  - `다음 확인 시점`
- Export labels use user-facing Korean labels instead of raw memo ids such as `used-car-buying-check-hold-reason`.
- Workbook summary sheets include hold criteria, hold reasons, and the hold memo template.
- Mobile sticky CTA changes to `보류 N건 포함 .xlsx` when a vehicle hold memo has filled values.

## Zip Review Materials

The uploaded `docs/flowme.zip` from `origin/main` was extracted into the current branch as docs rather than recommitting the binary archive.

- `docs/content-audit/2026-05-26-validation-routes-ux-review.md`
- `docs/content-audit/2026-05-26-validation-fix-implementation.md`
- `docs/design-ref/2026-05-26-validation-fix/`

These files remain review references. The implemented app code is still the source of truth for current behavior.

## Verification Targets

- Unit coverage checks seed hold metadata and export labels.
- E2E coverage checks hold memo inputs update the mobile vehicle export CTA.
- Full verification should include `npm run docs:check`, `npm test`, `npm run build`, and `npm run test:e2e`.
