# Implementation Plan

## Phase 0 — Baseline and contract

- [x] Dirty `flow-mvp`, Text Authoring, Structured Checklist shelves를 보존한다.
- [x] `origin/main@2f93f00d`에서 전용 clean worktree를 만든다.
- [x] 네 출처, lifecycle, history/focus, storage/export 불변식을 inventory한다.
- [x] Owner 승인 scope와 publication boundary를 spec에 기록한다.

## Phase 1 — Shared editor capability

- [x] 네 출처를 pure classification/capability model로 구분한다.
- [x] current effective Plan을 lossless common draft로 만드는 adapter를 추가한다.
- [x] canonical-only writer를 유지하고 나머지 출처는 각 기존 persistence owner로 분기한다.
- [x] item apply와 final plan save의 두 단계 의미를 copy와 테스트로 고정한다.

## Phase 2 — Navigation and lifecycle

- [x] 모든 출처가 기존 common editor history/focus controller를 사용하게 한다.
- [x] clean/dirty close, Escape, backdrop, browser Back을 한 계약으로 검증한다.
- [x] 선택한 plan header에 중복 없는 lifecycle menu를 주입한다.
- [x] archive/restore/delete 뒤 안정 route와 focus target을 검증한다.

## Phase 3 — Verification and review

- [x] pure adapter/component/unit regression을 통과한다.
- [x] 네 출처 390px 편집 lifecycle 및 390/1024/1440 responsive matrix를 통과한다.
- [x] export/storage/Map/draft/legacy/lifecycle 회귀를 통과한다.
- [x] UX subtraction, keyboard/accessibility, build, docs, full relevant gate를 통과한다.
- [x] owned diff와 로컬 미게시 상태를 closeout한다.

최종 로컬 증거는 origin/persistence/source/storage `172/172`, saved-library
controller `19/19`, approved execution `187/187`, lock contract `59/59`, build
`18` routes, dedicated E2E `23/23`, affected browser regression `80/80`, full
`npm test` PASS, docs `16` required files / `4525` local links다. 독립 재검토의
남은 Blocking/High는 `0`이다.

## Release outcome

- [x] [PR #178](https://github.com/knhbae/flowme2605/pull/178) exact-head CI and merge `908ee849beb15cb10331b72d7894167a61458b18`
- [x] Production deployment `5869458520` / status `16715443863`
- [x] Canonical Production smoke `38/38`, workers `1`, retries `0`, unexpected/flaky/skipped `0`
- [x] Post-merge `main` run `31597763288` core and Playwright jobs PASS
- [ ] Observed-user validation remains `0`
