# QA Evidence

**Status:** RELEASED / PR #182 CI-PRODUCTION-SMOKE PASS 41/41 / OBSERVED USERS 0

**Base:** `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`

**Observed users:** `0`

스크린샷, 자동화, 내부 리뷰, 로컬 빌드는 observed-user validation으로 계산하지 않는다. 아래 로컬 표와 캡처는 구현·회귀 근거로 유지하고, 별도 Publication boundary만 실제 병합·Production·smoke 상태를 기록한다.

## Product result

- 일반 `/f/[slug]`와 실행 가능한 단일 계획 `save_all` Map은 같은 `PublicFlowAdjustmentPanel`, `PublicFlowItemEditor`, editor controller, dirty-close, Back, focus, scroll 문법을 사용한다.
- Item `계획에 반영`은 부모 Plan draft만, Plan `변경 반영`은 현재 공개 session의 effective draft만 바꾼다. 기존 최종 저장 action 전에는 persistent storage를 쓰지 않는다.
- Map Item은 일반 Flow와 같은 제목·개인 메모·날짜 필드를 편집한다. 기존
  `fixed_date` override만 저장하며, reset은 실제 anchor의 source date 또는 원래
  `날짜 없음`으로 돌아간다. 순서는 현재 단일-child plan 안에서만 저장한다.
- `save_all`은 사용자에게 일반 Flow처럼 보인다. OPIc 2주/1달, wedding 두 버전, Allblanc 두 영상은 `choose_child`로 하나를 고른 뒤 canonical `/f`에서 편집한다. `review_hold`는 editor와 저장 action을 노출하지 않는다.
- Map ID/version, child Flow/Item ID, source, snapshot, persistence/bridge, storage key, unknown fields, atomic save/rollback owner는 유지된다.

## Browser matrix

| Surface / mode | Evidence | State |
| --- | --- | --- |
| Ordinary `/f` vs Map shared Plan/Item contract | 1024px에서 동일 dialog/sheet test IDs, field order, Plan/Item CTA와 schema 비교 | PASS |
| Flow Map Plan/Item responsive | 390 / 1024 / 1440, sticky footer, right drawer/full-width geometry, horizontal overflow `0` | PASS |
| Flow Map no-op Item apply | 390px, parent Plan remains clean and closes without discard prompt | PASS |
| Flow Map provisional apply and final save | 390px, Item/Plan apply storage bytes unchanged; final save/reload restores order/title/memo/fixed date | PASS |
| Flow Map date reset | source-undated는 `날짜 없음`, source-dated는 미반영 Plan anchor의 실제 원래 날짜로 즉시 복귀; source-equal fixed pin의 명시 reset과 최종 owner 제거 | PASS |
| Dirty Cancel / Escape / browser Back | 390px, one discard confirmation, continue keeps draft/focus, discard restores opener and scroll | PASS |
| `choose_child` | OPIc/wedding/Allblanc selector only; no Map/shared editor before entering child `/f` | PASS |
| `review_hold` | editor, adjustment, save affordance absent | PASS |

Dedicated browser command:

```text
npm.cmd run test:e2e -- tests/e2e/public-plan-edit-surface-unification.spec.ts --workers=1
11 passed (2026-08-13 local follow-up)
```

## Transaction and identity matrix

| Transition / invariant | Result |
| --- | --- |
| Open editor | persistent local/session bytes unchanged |
| Item `계획에 반영` | parent draft only; persistent bytes unchanged |
| Plan `변경 반영` | session effective result only; persistent bytes unchanged |
| Clean/dirty discard | pre-open bytes restored exactly |
| Map final save | existing snapshot/persistence/bridge transaction only |
| Reload | requested inclusion/order and private title/memo/fixed date restored |
| Map identity | Map ID/version, child Flow/Item IDs and bridge key unchanged |
| Excluded Item values | private title/memo/fixed date preserved while Item remains excluded |
| Unknown fields | snapshot/persistence top-level and nested sentinels preserved |
| Invalid or unknown IDs | rejected or pruned without source mutation |
| OPIc boundary | Map ID/version/source and 2 child identities preserved; public mode changes from merged `save_all` to `choose_child` |

The focused helper contract separately verifies that a source-equal fixed-date
pin survives a semantic no-op and is removed only when reset intent is explicit.

## Automated gates

PR #178 release evidence below remains historical. Before PR #182 publication,
the 2026-08-13 follow-up had added these local checks: focused contracts `33/33`, `npm.cmd test` PASS,
Production build PASS with `18` routes, dedicated browser `11/11`, 390px Playwright
CLI visual inspection PASS, and console errors/warnings `0`.

| Gate | Result |
| --- | --- |
| Shared editor, Map model/result/persistence focused tests | PASS `105/105` |
| Full unit/contract suite | `npm.cmd test` PASS |
| P35 P0 regression | PASS `446/446` |
| Production build | PASS, `18` routes |
| Dedicated public edit E2E | PASS `8/8` |
| Flow Map action/rollback E2E | PASS `7/7` |
| Affected five-spec browser regression | PASS `154/154`, workers `1`, `8.8m` |
| Documentation check | PASS, `16` required files / `4539` local links |
| Diff whitespace | `git diff --check` PASS; line-ending notices only |

## UI capture and artifact QA

- Korean report: [Public Plan/Item edit UI capture review](../../content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html)
- Runtime captures: ordinary mobile Plan, Map mobile Plan, Map mobile Item, dirty Back confirmation, OPIc chooser, Map desktop Plan.
- Feedback evidence: two user-provided mobile screenshots are kept separately from the six fresh local runtime captures.
- Capture manifest: six routes HTTP `200`; horizontal overflow, replacement characters, page errors, console errors, and failed requests are all `0`.
- Report verifier: 390 / 1024 / 1440 PASS; 8 images, broken images `0`, missing alt `0`, duplicate IDs `0`, replacement characters `0`, horizontal overflow `0`, browser/network errors `0`; 9 unique local links returned HTTP `200`.
- UX subtraction review removed the separate default Map editor, duplicated selector help, and Map-specific product explanation. The dated report is retained as immutable PR #178 evidence and predates the 2026-08-13 local date-parity follow-up. Source links, materially distinct choice copy, dirty recovery, and internal source identity remain.

## Publication boundary

- Commit/push/Draft PR/Preview: `COMPLETE`.
- Merge/Production: `PASS` — [PR #178](https://github.com/knhbae/flowme2605/pull/178) merge `908ee849beb15cb10331b72d7894167a61458b18`; deployment `5869458520` / status `16715443863`.
- Production smoke: `PASS 38/38` — workers `1`, retries `0`, `99.6s`, unexpected/flaky/skipped `0`.
- Post-merge `main` CI: `PASS` — run `31597763288`, core job `94117373437`, Playwright job `94117373461`.
- Observed-user validation: `0`.
- 2026-08-13 Item date parity follow-up: [PR #182](https://github.com/knhbae/flowme2605/pull/182)
  final head `0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head CI run
  [`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163)
  and merged as runtime-bearing `f6f796c035d5762eea07ec35abb7f1af1577a5a5`
  at `2026-08-13T01:05:33Z`.
- Item date parity Production: `PASS` — deployment `5880059975` / status
  `16743295490`; canonical smoke `41/41`, workers `1`, retries `0`,
  `264804.24ms`, unexpected/flaky/skipped `0`.
- Item date parity post-merge `main`: run `31656595092` core job `94312307779`
  and Playwright job `94312307849` passed.
