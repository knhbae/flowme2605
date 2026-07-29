# Runtime Migration Impact

**Decision:** no runtime or database change in this lab.

## Current bridge

- Runtime `FlowSection` can map automatically to canonical Step grouping.
- Runtime `FlowItem` IDs, titles and order map directly, but intent, completion semantics and SourceRow provenance need enrichment.
- Existing explicit day offsets, date windows and recurrence values can map conditionally to Item.schedule.
- `primary_destination=hybrid` requires a primary Artifact decision and secondary Artifacts.
- Existing VEVENT export remains an adapter; it is not promoted to storage.

## Contract-path audit

- automatic: 1/7
- conditional: 4/7
- human review required: 2/7

These are mapping-rule counts, not a record-level migration estimate.

The creator portfolio is richer than the legacy runtime: all 148 representative Items already carry source-backed IDs and the 198 SourceRows are available for dry-run normalization. This does not prove the rest of the runtime inventory has equivalent provenance.
