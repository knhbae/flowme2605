# Execution Specificity For Video Routes

Date: 2026-05-25
Branch: `content/execution-specificity-video-routes`
PR: #51
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/Gj2fjZQ3oLYmBepDiJmYHLKms6Hs

## Why

The user identified a real usability gap: `ThankyouBUBU 전신 다이어트 실천 Flow` was source-reviewed, but the action detail still did not tell a user enough about how to use the source video, what FLOW is summarizing, what to record after the workout, or when to stop.

## Changed

- Added `docs/flow-rules/execution-specificity.md`.
- Updated the single fitness video playbook to require summary, detailed guide, original source instruction, post-session record, and stop condition.
- Added a seed-flow test for exact workout video detail requirements.
- Updated exact workout video generated details while preserving the one-action structure.
- Added a content audit for execution specificity across categories.
- Added a durable spec under `docs/specs/2026-05-25-execution-specificity-video-routes/`.

## Not Done

- Did not extract or invent movement-by-movement exercise sequences from YouTube.
- Did not add automatic progress generation, direct integrations, native record storage, login, payments, community, or AI publishing.
- Did not mark any route validated.
- Did not fully rewrite FITVELY diet/nutrition exact videos; that should be a separate small batch.

## Verification

Targeted TDD evidence:

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on `real-thankyou-bubu-video-full-body-no-jump needs an execution summary`.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed.

Full verification:

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.
- Vercel PR check passed before merge.

## Risks

- The detail copy is more specific, but still intentionally points to the original video for exact movement instruction.
- The same generator improvement applies to exact workout videos, but route-by-route source quality still needs human review before stronger exposure.

## Follow-Ups

- Run the same audit pattern on diet/body-composition exact videos.
- Review broad channel routes for source replacement before representative promotion.
- Use observed user sessions, not internal simulation, to decide validation.
