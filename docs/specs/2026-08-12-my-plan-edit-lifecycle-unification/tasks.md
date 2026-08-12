# Tasks

## Active

- [x] `MP-01` Add origin classification and capability contract.
- [x] `MP-02` Build common plan drafts for canonical, Map, personal draft, and legacy origins.
- [x] `MP-03` Add origin-safe commit adapters without migration or identity changes.
- [x] `MP-04` Make nested Item apply explicitly provisional until Plan save.
- [x] `MP-05` Route all close and browser-history paths through one discard/focus contract.
- [x] `MP-06` Add one non-duplicated lifecycle entry to selected Plan.
- [x] `MP-07` Verify archive, undo, reload, restore, and permanent-delete boundaries.
- [x] `MP-08` Add focused unit/component coverage.
- [x] `MP-09` Add default-surface four-origin E2E at 390/1024/1440.
- [x] `MP-10` Run UX, storage/export, build, docs, and relevant full regression gates.

`MP-10`은 focus 수정 뒤 기존 회귀 `80/80`, 전체 `npm test`, build, docs,
전용 E2E `23/23`, 독립 Blocking/High 재검토까지 통과해 닫혔다.

## Publication boundary

- [x] Commit, push, Draft PR, and Preview publication — `COMPLETE`
- [x] Merge and Production — [PR #178](https://github.com/knhbae/flowme2605/pull/178) merge `908ee849beb15cb10331b72d7894167a61458b18`; deployment `5869458520` / status `16715443863`; canonical smoke `38/38`
- [x] Post-merge `main` CI — run `31597763288`, core job `94117373437`, Playwright job `94117373461` PASS
- [ ] Observed-user validation — `0`
