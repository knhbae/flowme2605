# QA

- Parse all three generated JSON files.
- Assert P0 record count is 24 and tier counts sum to 24.
- Assert fresh candidate count is 16 and every candidate has a URL, score comments, tier, readiness, and next action.
- Assert the next production queue contains 8 unique references.
- Assert no TODO, TBD, placeholder, generic memoHint, or generated app seed is present.
- Run `npm.cmd run docs:check`.
- Render the HTML at 390x844 and 1280x900.
- Check horizontal overflow, tier filters, details expansion, source links, and long Korean text wrapping.

## Result (2026-07-20)

- PASS: all three JSON files parsed; P0 24 records equal Link 4 + Quick 10 + Full 7 + Hold 3.
- PASS: fresh candidate count is 16; the next production queue contains 8 unique references.
- PASS: all required score comments, URLs, tiers, readiness values, and next actions are present.
- PASS: no TODO, TBD, placeholder, generic memoHint, or app seed output was found.
- PASS: `npm.cmd run docs:check` reported 14 required files and 2,442 valid local links.
- PASS: 390x844 and 1280x900 both reported zero horizontal overflow and rendered all 14 sections.
- PASS: P0 Quick filter showed 10 records; fresh Quick filter showed 4 records; details expansion worked.
- PASS: browser console reported 0 errors and 0 warnings.
- Evidence: `output/playwright/2026-07-20-flow-content-discovery-admission-mobile.png`.
- Evidence: `output/playwright/2026-07-20-flow-content-discovery-admission-desktop.png`.
