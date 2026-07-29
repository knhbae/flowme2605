# QA

**Current state:** completed as a documentation and evidence lab. No app/runtime, DB, crawler, production LLM API, or seed was changed.

## Required Contract Checks

- corpus counts: 9 bundles / 22 Flow / 57 Step / 148 Item / 198 SourceRow
- all Item sourceRowIds resolve
- sourceTrace IDs and URLs match SourceRows
- no invented Item or source schedule
- no scheduleless VEVENT
- no nested VEVENT/VTODO
- stable Item ID across projections
- Map ordering semantics preserved
- creator/provider/source owner/curator separated
- boundary cases do not become ready Flow Maps
- all loss paths use the controlled vocabulary
- runtime, benchmark and creator input files remain unmodified

## Evidence Lanes

| lane | meaning |
| --- | --- |
| schema/validator | deterministic contract evidence |
| round-trip | serialization and parser evidence |
| render/browser | visual reviewability evidence |
| internal walkthrough | expert heuristic evidence |
| observed user | not run |
| external calendar import | not run unless separately authorized |

## Executed Results

| check | result |
| --- | --- |
| deterministic build | 9 bundles / 22 Flow / 57 Step / 148 Item / 198 SourceRow |
| lab validator | 752 / 752 checks passed |
| Node tests | 3 / 3 passed |
| strict JSON Schema compile | 3 / 3 passed with Ajv 8.17.1, Draft 2020-12 strict mode |
| architecture run schema validation | 27 / 27 records passed |
| negative schema controls | 6 / 6 invalid mutations rejected |
| canonical semantic round-trip | 9 / 9 passed |
| literal ICS syntax parser | 9 / 9 passed |
| scheduleless canonical VEVENT | 0 |
| boundary stop controls | 8 / 8 preserved |
| HTML | 1440×900 and 390×844 rendered without horizontal overflow; filter changed visible cards 9 → 4 |
| PPT | 11 slides; template fidelity passed; overflow 0; slide-by-slide visual QA completed |
| docs check | passed |
| observed-user validation | not run |
| external Google/Outlook/Apple import | not run |

## Commands

```powershell
node docs\specs\2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1\build-lab-v1.mjs
node docs\specs\2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1\validate-lab-v1.mjs
node --test docs\specs\2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1\validate-lab-v1.test.mjs

npm.cmd install --prefix $env:TEMP\flowme-ajv-schema-check --no-save --no-audit --no-fund ajv@8.17.1
node docs\specs\2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1\validate-run-schemas-v1.cjs

npm.cmd run docs:check
```

The bundled presentation renderer produced all 11 PNGs on Windows but returned a false non-zero exit code. The checked-in PPT itself was not patched. A temporary wrapper accepted the render only after all reported PNGs existed, then ran the bundled overflow algorithm unchanged. Template fidelity independently passed with zero issues.
