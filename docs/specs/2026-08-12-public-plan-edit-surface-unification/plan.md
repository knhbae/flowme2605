# Implementation Plan

**Status:** RELEASED THROUGH PR #178 AND DATE PARITY PR #182 / CI-PRODUCTION-SMOKE PASS

## Phase 0 — Contract and boundaries

- [x] Owner-approved public editor unification goal을 기록한다.
- [x] `save_all`, `choose_child`, `review_hold`의 사용자-facing 역할을 구분한다.
- [x] 기존 Map ID/version/storage/transaction과 no-migration 경계를 고정한다.
- [x] `/f`와 `/flow-maps` editor view-model, history, persistence owner의 차이를 구현 파일 단위로 확정한다.

## Phase 1 — Shared public editor

- [x] 일반 `/f`의 shared Public Plan/Item surface를 재사용 가능한 입력 계약으로 정리한다.
- [x] 실행 가능한 Map snapshot을 lossless Public Plan draft로 변환하는 adapter를 연결한다.
- [x] Map 전용 title/include editor를 shared Plan/Item surface로 대체한다.
- [x] Plan 이름, 포함·순서, nested Item 편집과 출처·주의 capability를 origin-safe하게 연결한다.
- [x] Item 적용은 부모 draft, Plan 적용은 session effective draft만 갱신하게 한다.

## Phase 2 — Map flattening and navigation

- [x] 단일 계획 `save_all`의 사용자-facing 표현을 일반 Flow shell로 평탄화한다.
- [x] 실제 대안인 OPIc/wedding/Allblanc는 `choose_child` 후 canonical `/f/[slug]`로 이동하게 한다.
- [x] `review_hold`에는 editor와 조정·저장 CTA가 없음을 보장한다.
- [x] Cancel/X/backdrop/Escape/browser Back을 shared dirty-discard controller에 연결한다.
- [x] Plan -> Item -> Plan과 editor -> opener의 focus·scroll 복귀를 연결한다.
- [x] Map의 기존 `fixed_date` owner가 lossless하게 지원하는 날짜 입력은 공통 Item
  editor에 연결하고, source-dated reset은 원래 날짜로, source-undated reset은
  `날짜 없음`으로 돌린다. 별도 unscheduled schema와 cross-child 순서 제어는 숨긴다.

## Phase 3 — Persistence and regression

- [x] 일반 Flow와 Flow Map의 final-save adapter가 기존 key와 transaction만 쓰는지 단위·통합 테스트로 고정한다.
- [x] cancel, discard, Item apply, Plan apply 전후 persistent bytes가 같은지 검증한다.
- [x] Map/version/child/Item identity와 snapshot/persistence/bridge 회귀를 검증한다.
- [x] excluded Item 개인 값과 raw unknown fields가 final save/reload 뒤 유지되는지 검증한다.
- [x] OPIc의 mode만 선택형으로 바꾸고 Map/version/source/child identity는 유지한다.

## Phase 4 — Responsive QA and closeout

- [x] shared Map Plan/Item을 390/1024/1440에서 검증하고 `/f`와 1024px 계약 parity를 비교한다.
- [x] dirty close, Escape, browser Back, nested Item focus와 keyboard 경로를 브라우저에서 검증한다.
- [x] `choose_child`와 `review_hold` mode 경계를 브라우저에서 검증한다.
- [x] fresh runtime capture 6장과 feedback evidence 2장을 한국어 HTML 보고서로 검증한다.
- [x] affected five-spec browser rerun과 최종 owned closeout을 통과시킨다.

## Phase 5 — 2026-08-13 narrow Item date parity follow-up

- [x] Map Item에 기존 공통 날짜 필드와 reset action을 연결한다.
- [x] preview 결과 탭과 무관하게 실제 anchor의 source date를 reset baseline으로 쓴다.
- [x] source date와 같은 기존 fixed-date pin은 무변경 Item apply에서 보존한다.
- [x] Plan에서 아직 반영하지 않은 새 anchor도 Item 행·편집·reset baseline에 즉시
  반영하고, source date와 같은 fixed-date pin은 명시 reset intent로 제거한다.
- [x] Item/Plan provisional apply 전 storage 불변, final save/reload fixed-date round trip,
  source-undated/source-dated reset, 390/1024/1440을 단위·브라우저로 검증한다.

## Publication boundary

- Commit/push/Draft PR/Preview: `COMPLETE`
- Merge/Production: `PASS` — merge `908ee849beb15cb10331b72d7894167a61458b18`, deployment `5869458520` / status `16715443863`
- Canonical Production smoke: `PASS 38/38`, workers `1`, retries `0`, unexpected/flaky/skipped `0`
- Post-merge `main` run: `31597763288 PASS` — core job `94117373437`, Playwright job `94117373461`
- Observed-user validation: `0`
- 2026-08-13 Item date parity follow-up: [PR #182](https://github.com/knhbae/flowme2605/pull/182)
  head `0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head CI and merged
  as runtime-bearing `f6f796c035d5762eea07ec35abb7f1af1577a5a5`. Production
  deployment `5880059975` / status `16743295490` and canonical smoke `41/41`
  passed. Post-merge `main` run `31656595092` core and Playwright jobs passed.
