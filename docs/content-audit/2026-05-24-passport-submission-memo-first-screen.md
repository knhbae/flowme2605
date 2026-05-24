# Passport Submission Memo First-Screen Pass

**Date:** 2026-05-24
**Branch:** `codex/passport-submission-memo-first-screen`
**Input audit:** [Representative UX Content Simplification](./2026-05-23-representative-ux-content-simplification.md)

## Decision

Keep `passport-renewal-docs` as a simple official-route Flow, but make the first screen a memo artifact instead of a checklist. The route should help users carry checked official information into their existing memo/file habit.

| Flow | Decision | First-screen artifact |
| --- | --- | --- |
| `passport-renewal-docs` | Keep simple; do not promote yet. | Passport renewal submission memo + secondary checklist. |

## Natural Artifact Simulation

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap before this batch | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `passport-renewal-docs` | `travelDate=2026-08-15`, `applicant=adult self renewal`, `route=Gov24 online`, `photo=2026-05 official spec checked`, `oldPassport=expires 2026-07-10, no damage`, `receipt=2026-000000`, `proofFile=passport-receipt.png`, `pickup=2026-06-20 district office`, `storage=passport wallet + scanned PDF folder` | One memo card copied into a notes app or printed and kept with the passport application proof. | The route opened as a checklist, so users saw task density before the thing they would actually keep: travel context, photo readiness, receipt proof, pickup date, and storage location. | Promote the memo card first and add route-specific fields for applicant context, photo spec, existing passport status, receipt/status capture, and pickup/storage. |

## Source And Risk Boundary

- FLOW records what the user checked and where they will store proof; it does not guarantee online eligibility or photo acceptance.
- Official information remains linked separately at the source section and in item detail links.
- The route remains in a simple/fix posture until real user execution data shows the memo actually reduces missed pickup or document mistakes.

## Screenshot Evidence

- `passport-renewal-docs`: [desktop](../screenshots/2026-05-24-passport-submission-memo-first-screen-desktop.png), [mobile](../screenshots/2026-05-24-passport-submission-memo-first-screen-mobile.png)

## Follow-Up

- Consider applying the same "submission memo before checklist" pattern to other official document routes that users mainly copy into notes.
- Do not add upload/storage features until export-first usage proves repeated demand.
