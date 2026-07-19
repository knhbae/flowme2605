# FlowMe P25-01B Memo Split And Count Evidence

**Date:** 2026-07-19
**Status:** implementation and current automated/browser verification complete
**Observed-user sessions:** 0
**Parent gate:** P25-01 correctness

## Result

Memo and URL-miss drafts no longer receive generic tasks to reach a minimum count. The pre-save list now lets the user choose and rename tasks, and only that accepted list is persisted. In the representative journey, three user phrases were reviewed, one was excluded, one was renamed, and exactly two stable items survived save, reload, My Flow, Calendar eligibility, and whole/selected list exports.

## Open Evidence

- [Detailed audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Count fixtures](./projection-fixtures.json)
- [Mobile/wide screenshots](./screenshots/)
- [Selected Calendar download](./downloads/personal-draft-selected-calendar.ics)
- [Implementation spec](../../specs/2026-07-19-memo-draft-split-count-integrity/spec.md)

## Current Verification

- Unit tests: `524 / 524` pass.
- URL-first user-surface Playwright: `19 / 19` pass.
- P24 execution-trust Playwright: `14 / 14` pass.
- Plain memo save targeted Playwright: `1 / 1` pass.
- Production build: pass, 18 route entries.
- Documentation check: pass, 14 required files and 2,443 local links.

## Boundary

This closes intake truth and count parity. The saved whole-Flow screen still has the old dashboard/card hierarchy and long export surface. That visual and navigation problem remains P25-02 rather than being hidden inside this correctness slice.
