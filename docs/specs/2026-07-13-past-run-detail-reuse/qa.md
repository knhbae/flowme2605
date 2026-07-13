# QA

## Data

- [x] completed run stores item snapshots without source mutation
- [x] malformed item snapshots do not invalidate the run
- [x] duplicate item IDs are deduplicated without changing current Flow
- [x] legacy run without item snapshots remains readable
- [x] old source version and personal values remain in old run

## User Journey

- [x] completed dated Flow starts a new run and opens old item detail
- [x] completed date-free Flow starts a new run and keeps old detail
- [x] reflection and unsent correction memo remain distinguishable
- [x] checklist, sheet, and memo outputs use the old snapshot
- [x] current run remains editable while past run stays read-only

## Layout And Regression

- [x] 390px horizontal overflow 0
- [x] 1024px horizontal overflow 0
- [x] source-backed version review remains explicit
- [x] Calendar and current-run export behavior unchanged
- [x] internal user-surface term hit 0
