# FlowMe P25-01A Canonical Projection Evidence

**Date:** 2026-07-19
**Status:** implementation and automated verification complete
**Observed-user sessions:** 0
**Parent gate:** P25-01 correctness

## Result

Published/saved routine cadence now has one canonical projection across public preview, source-specific workbench, My Flow Calendar, and ICS. The representative washer Flow stays monthly from preview through saved execution and export; the existing Allblanc routine stays weekly on Monday/Wednesday/Friday.

## Open Evidence

- [Detailed audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Projection fixtures](./projection-fixtures.json)
- [Mobile/wide screenshots](./screenshots/)
- [Downloaded ICS](./downloads/washer-monthly-routine.ics)
- [Implementation spec](../../specs/2026-07-19-canonical-effective-routine-projection/spec.md)

## Current Verification

- Unit tests: `521 / 521` pass.
- Targeted export/projection tests: `20 / 20` pass.
- Monthly maintenance Playwright: `1 / 1` pass.
- Existing Allblanc weekly Playwright: `1 / 1` pass.
- Production build: pass, 18 route entries.
- Mobile 390x844 horizontal overflow: `0`.
- Wide 1024x768 horizontal overflow: `0`.
- Browser console errors: `0`.

## Important Boundary

This package closes cadence correctness, not P25 UX. The screenshots still show an existing long maintenance explanation and three undated checklist rows beside the monthly series. Whole-Flow hierarchy, understandable Anytime behavior, and public copy reduction remain P25-02/P25-04/P25-06 work.
