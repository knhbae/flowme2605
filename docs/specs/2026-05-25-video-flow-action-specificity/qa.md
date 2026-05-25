# QA

Date: 2026-05-25

## TDD Evidence

Red check:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts`
- Expected failure before implementation: repeated workout video actions did not include calendar-notification-ready guidance.

Green check:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts`
- Result after implementation: 167 tests passed.

## Manual Review Checklist

- Repeated workout video item remains one action.
- Exported calendar description includes `캘린더 알림`, `준비`, `실행`, `원본 영상`, `운동 후 기록`, and a stop/consult condition.
- The copy does not invent source-specific movement sequences.
- The Flow remains below representative/public-MVP/validated framing.

## Verification

- `npm run build`
  - Passed on 2026-05-25.
- `npm test`
  - Passed on 2026-05-25: 167 tests passed.
- `npm run docs:check`
  - Passed on 2026-05-25: 14 required files and 256 local links.
- Related Playwright E2E
  - Passed on 2026-05-25: `former broad ThankyouBUBU routes now render as one exact-video action`.
- `npm run test:e2e`
  - Passed on 2026-05-25: 53 tests passed.
- Vercel
  - Passed on PR #100 before merge.
- Merge
  - PR #100 was squash-merged as `5dad8fed11339be223610caf46a72717cf794979`.
