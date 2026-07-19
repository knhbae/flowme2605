# P25-01A QA

## Unit Fixtures

- Washer monthly recurrence: four months, monthly RRULE, stable UID.
- Allblanc weekly recurrence: twelve four-week occurrences and stable IDs.
- Ambiguous plant cadence: warning, no invented recurring rows, source rows retained.
- Open-ended routines: daily/weekly cadence remains source-faithful and has no false UNTIL.
- Portable recurrence UID: stable after anchor edit and free of raw source item IDs.

## Browser Journey

1. Open `/f/washer-tub-clean-monthly` at 390x844.
2. Set start to `2026-07-20`.
3. Confirm `2026-07-20`, `2026-08-20`, `2026-09-20`, and `2026-10-20` preview rows.
4. Save and open `/calendar`.
5. Confirm one recurring row on July 20.
6. Complete and reopen the same occurrence; identity must stay equal.
7. Download ICS and confirm one VEVENT, monthly RRULE, stable portable UID, and no internal terms.
8. Move to August and confirm one row on August 20.
9. Switch to 1024x768 and confirm no horizontal overflow.
10. Re-run the existing weekly source-backed Allblanc recurrence journey.

## Commands

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/flow-mvp.spec.ts --grep "monthly maintenance routine" --workers=1
npx.cmd playwright test tests/e2e/flow-mvp.spec.ts --grep "saved Allblanc routine" --workers=1
npm.cmd run docs:check
git diff --check
```

## Evidence Boundary

These checks are unit and automated browser evidence. They are not observed-user validation. Existing copy density, the undated-task tray, and whole-Flow hierarchy remain design backlog, even when cadence correctness passes.
