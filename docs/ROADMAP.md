# Roadmap

**Last Updated:** 2026-05-20  
**Current Version:** v0.1.0 (In Development)  
**Next Version:** v0.2.0 (Post-validation polish)

## Completed Releases

> Release history lives in [HISTORY.md](./HISTORY.md).

No tagged releases yet.

## Upcoming Releases

### v0.1.0 - Stage 0 First Flag MVP

**Goal:** Prove that users can open a FLOW route, enter an anchor, copy/export the plan, check items, and provide feedback.

| Item | Description | Status |
|------|-------------|--------|
| First flag flow | Parenting/infant vaccination and checkup preparation route | In progress |
| Alternate route | Moving D-30 timeline route for lower-risk comparison | In progress |
| Execution actions | Copy, CSV export, share text, local check state | In progress |
| Verification | Unit tests, production build, Playwright E2E | In progress |

### v0.2.0 - Evidence Capture

**Goal:** Improve event capture and validation notes after first real use.

| Item | Description | Status |
|------|-------------|--------|
| Footprint logging | Track view, anchor, copy, export, check, feedback events | Planned |
| Feedback loop | Lightweight correction/feedback intake | Planned |
| Content safety pass | Re-check source/risk labels for sensitive categories | Planned |

## Backlog

### Product
- Expand only after Stage 0 behavior evidence exists.
- Keep ROADMAP entries short; detailed specs belong in issues or `docs/superpowers/specs/`.
- Use [IDEAS.md](./IDEAS.md) for promising but uncommitted ideas.

### Technical
- Add persistent storage only when local-only validation is insufficient.
- Add integrations after copy/export/check behavior is proven.

## Long-term Direction

FLOW should become an execution-oriented experience wiki where trusted routes, versioning, and user footprints compound into product value.
