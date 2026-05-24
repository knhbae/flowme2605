# Diet Exact Video Execution Specificity

Date: 2026-05-25
Branch: `content/diet-execution-specificity`
PR: #53
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/9bdwcSGdxpdSCdrP4QDjxzGAX2jW

## Why

After the workout exact-video pass, diet/body-composition exact videos needed the same execution-specificity treatment. A source-reviewed diet principle can still be too broad unless FLOW narrows it to one safe action and one observation record.

## Changed

- Added seed-flow coverage for FITVELY diet exact-video detail requirements.
- Updated diet exact-video generated details to include summary, selected application rule, original video instruction, observation record, and stop condition.
- Added a diet execution-specificity audit.
- Updated execution-specificity rules with current diet exact-video examples.
- Added a durable spec under `docs/specs/2026-05-25-diet-execution-specificity/`.

## Not Done

- Did not generate a diet plan.
- Did not claim weight-loss results or validation.
- Did not add native records or external integrations.
- Did not review workout-plan exact videos; they need a separate hybrid weekly-plan pass.

## Verification

Targeted TDD evidence:

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on missing narrow application summary.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed.

Full verification:

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.
- Vercel PR check passed before merge.

## Risks

- The generator now improves all diet exact videos, but route-level source judgment is still needed before promotion.
- Caution copy is intentionally conservative because diet and body-composition content is sensitive.

## Follow-Ups

- Review FITVELY workout-plan exact videos separately.
- Review measurement-implied diet/body routes for sheet-log suitability without outcome promises.
- Keep validation decisions tied to observed user sessions only.
