# P34 QA

## Automated Evidence Boundary

Unit tests, E2E, screenshots, and heuristic persona simulations are automated
QA. Observed-user count remains 0.

## Unit

- active and archived management command order
- source exclusion vs personal deletion vocabulary
- occurrence scope vocabulary
- whole/selected/current export labels
- Calendar date keyboard movement and month-end clamping
- archive/restore/permanent-delete storage contract
- occurrence and export identity stability

## E2E

1. Active Flow -> `Flow 관리` -> archive -> undo.
2. Archive -> reload -> archive location -> direct restore.
3. Archived Flow -> backup -> delete dialog cancel -> focus return.
4. Archived Flow -> permanent delete -> reload -> personal residue 0 -> public
   source remains discoverable.
5. Source Item exclude -> reload -> `다시 포함`; personal memo preserved.
6. Personal Item delete -> reload -> `항목 복구`; stable ID preserved.
7. Recurrence occurrence skip/hold/reopen; series identity unchanged.
8. Personal draft preview -> structure mode -> split/merge/reorder -> save.
9. Calendar one Tab stop and arrow/Home/End/Page keys.
10. Undated placement -> undo -> date removal.
11. Whole/selected/current export count equals output and receipt.
12. P33 canonical 24-Item identity and legacy-copy reconciliation remain.

## Viewports

- 390 x 844
- 1024 x 768
- 1440 x 900

For each:

- horizontal overflow 0
- fixed/sticky overlap 0
- unnamed interactive controls 0
- console/page errors 0
- menu/sheet Escape and focus return
- title/date/count identity parity

## Commands

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/p34-execution-crud.spec.ts --workers=1
npx.cmd playwright test --workers=1
git diff --check
```

Dependency audit findings are reported separately from P34 UX. A breaking
dependency downgrade is not part of this work.
