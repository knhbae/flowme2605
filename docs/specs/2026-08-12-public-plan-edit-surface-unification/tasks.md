# Tasks

**Status:** RELEASED THROUGH PR #178 AND DATE PARITY PR #182 / CI-PRODUCTION-SMOKE PASS

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
- [x] `PP-11` Reuse the shared Item date field for executable single-plan Maps,
  preserve source/fixed-date intent, and verify reset/save/reload parity without migration.
- [x] `PP-12` Reproject Item dates from the in-session Plan anchor and distinguish
  a semantic no-op from an explicit reset of a source-equal fixed-date pin.

## Required invariants

- [x] No persistent write before final public save.
- [x] No Map ID/version/child/Item identity change.
- [x] No storage key, schema, bridge, or transaction-owner migration.
- [x] No editor or adjustment CTA for `review_hold`.
- [x] No Map editor on `choose_child`; edit begins only after entering child `/f`.
- [x] One dirty-discard and focus-return contract across both editable origins.
- [x] Map exposes only the existing lossless fixed-date and reset-to-source contract;
  no synthetic unscheduled schema or cross-child reorder control is introduced.
- [x] Excluded Item private values and raw unknown fields survive final save/reload.

## Publication boundary

- [x] Commit, push, Draft PR, and Preview are complete.
- [x] Merge and Production are complete through PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18`; canonical smoke passed `38/38`.
- [x] Post-merge `main` run `31597763288` core and Playwright jobs passed.
- [ ] Observed-user validation remains `0` until real sessions are recorded.
- [x] The 2026-08-13 Item date parity follow-up shipped through PR #182 head
  `0aca76687ac582ff4cf11b19a0f46db5593c768e` and runtime-bearing merge
  `f6f796c035d5762eea07ec35abb7f1af1577a5a5`; deployment `5880059975` / status
  `16743295490` and canonical smoke `41/41` passed.
- [x] Post-merge `main` run `31656595092` core job `94312307779` and Playwright
  job `94312307849` passed.
