# Project Status

**Last Updated:** 2026-05-20  
**Status:** v0.1.0 IN DEVELOPMENT  
**Current Version:** v0.1.0  
**Primary Focus:** Stage 0 / First Flag validation for FLOW execution behavior.

## System Health

| Area | Command | Current Expectation |
|------|---------|---------------------|
| Unit tests | `npm test` | Flow date/parser/seed/export tests pass |
| Production build | `npm run build` | Next.js build succeeds |
| E2E tests | `npm run test:e2e` | Playwright runs against `/flows` on port 3104 |
| Local dev | `npm run dev` | Next.js serves on port 3000 |

## Active Product Constraints

- Focus on copy/export/check behavior before platform expansion.
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label any route as validated until real user behavior data exists.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before Stage 0 evidence.

## Recent Changes

- Flow MVP implementation exists in the Next.js app.
- Local unit tests and Playwright E2E tests are configured.
- AI-agnostic harness documents were added from the Claude Harness guide principles without copying Claude-specific runtime assumptions.

## Next Up

v0.1.0 should stabilize the first public FLOW loop: open, anchor input, copy/export, check, and feedback.

