# Tasks

**Status:** LOCAL IMPLEMENTATION AND AUTOMATED QA COMPLETE

## Active

- [x] `PP-01` Record the owner-approved public Plan/Item editor, Map flattening, mode, persistence, publication, and observed-user contract.
- [x] `PP-02` Inventory ordinary Flow and Flow Map editor data, history, focus, save, reload, and identity owners.
- [x] `PP-03` Add a lossless Flow Map -> Public Plan/Item draft adapter without schema or storage-key migration.
- [x] `PP-04` Route `/f` and executable single-plan `save_all` Maps through one shared Public Plan/Item editor surface and controller.
- [x] `PP-05` Make Item apply provisional to the parent draft and Plan apply provisional to the session effective draft.
- [x] `PP-06` Flatten single-plan `save_all`, use `choose_child` for real alternatives, and keep `review_hold` editor-free.
- [x] `PP-07` Unify clean/dirty Cancel, close, backdrop, Escape, browser Back, focus, and scroll restoration.
- [x] `PP-08` Add unit/component coverage for shared surface, mode gates, no-op apply, and origin-safe persistence.
- [x] `PP-09` Add save/reload, excluded-value, unknown-field, byte, and identity regression coverage.
- [x] `PP-10` Pass final affected browser, docs, and owned closeout gates.

## Required invariants

- [x] No persistent write before final public save.
- [x] No Map ID/version/child/Item identity change.
- [x] No storage key, schema, bridge, or transaction-owner migration.
- [x] No editor or adjustment CTA for `review_hold`.
- [x] No Map editor on `choose_child`; edit begins only after entering child `/f`.
- [x] One dirty-discard and focus-return contract across both editable origins.
- [x] No unsupported Map date or cross-child reorder control.
- [x] Excluded Item private values and raw unknown fields survive final save/reload.

## Publication boundary

- [x] Commit, push, Draft PR, and Preview are Owner-authorized on 2026-08-12.
- [ ] Merge and Production remain `NOT AUTHORIZED`.
- [x] Observed-user validation remains `0` until real sessions are recorded.
