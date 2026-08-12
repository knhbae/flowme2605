# Public Plan Surface Unification

**Status:** RELEASED / PR #176 MERGED / PRODUCTION PASS / CANONICAL SMOKE 11/11 / OBSERVED USERS 0

**Owner decision:** 2026-08-12

**Publication authorization:** 2026-08-12

**Base:** `origin/main` at `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`

**Initial implementation commit:** `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a`

**PR:** [#176](https://github.com/knhbae/flowme2605/pull/176)

**Final PR head:** `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`

**Merge / deployed source:** `47c54803c6bb7544aad757ce62c4ce58decbfe53`

**Final verified BUILD_ID:** `bzdhR-nY_afpTfx_xDZ7e`

The implementation is released through PR #176. Exact-head PR CI, merge,
post-merge `main` CI, exact-source Production deployment, canonical HTTP `200`,
and production smoke `11/11` are verified. Automated release evidence remains
separate from observed-user validation; observed users remain `0`.

## Goal

`/f/[slug]`와 `/flow-maps/[map]`의 모든 실행 가능한 계획을 하나의 공통 공개 결과 UX로 렌더링한다. Flow Map과 단일 Flow의 데이터 구조·저장 정체성은 유지하되, `saveMode`는 선택·저장 방식만 결정하고 화면 세대나 앱 셸을 갈라놓지 않는다.

## User problem

현재 계획 찾기에서 단일 Flow는 `Text / Todo / Calendar` 결과 형식과 간결한 공유 셸을 사용하지만, `save_all` Flow Map은 `저장될 전체 계획` 목록, Platform 내비게이션, 별도 실행 outline을 사용한다. 같은 계획 찾기 안에서 콘텐츠에 따라 기능과 제품 세대가 달라 보인다.

## Product contract

### One public result grammar

- 실행 가능한 공개 계획은 모두 같은 공유 셸과 artifact-first 결과 프레임을 쓴다.
- 결과 형식은 `Text / Todo / Calendar` 순서로 보여 준다.
- 날짜가 없는 Item으로 Calendar 결과를 발명하지 않는다.
- Todo는 실행 가능한 Item만 보여 주고, 원문 설명·메모·완료 기준·리소스는 보존한다.
- 실행 가능한 Map 화면에는 구형 Platform 하단 탭, `저장될 전체 계획`, 별도 `flow-map-execution-outline`을 중복 노출하지 않는다.

### Data and controller ownership

- 단일 Flow는 기존 `EffectiveFlowSnapshot`과 공개 저장 controller를 유지한다.
- Flow Map은 기존 `EffectiveFlowMapSnapshot`, Map ID/version, child Flow 경계, canonical `${flowSlug}::${itemId}` ID, 저장 transaction과 bridge record를 유지한다.
- 공통 결과 adapter는 canonical child Flow projection을 읽어 표시 모델만 만든다. Map을 하나의 저장 Flow로 합치지 않는다.
- `save_all`은 현재 Map transaction으로 전체 또는 조정된 선택을 저장한다.
- `choose_child`는 공통 결과 화면 안에서 child 하나를 선택해 미리 보고 해당 `/f/[slug]`로 이동한다. Map 전체 저장 controller를 노출하지 않는다.
- 사용자가 선택한 Text/Todo/Calendar 결과 형식과 저장되는 child `selectedArtifactMode`가 일치해야 한다.
- Map의 날짜 입력은 미리보기와 저장 transaction이 같은 controlled anchor를 사용한다.

### Non-executable boundary

- `publicExecutionEnabled === false`인 review-hold Map은 실행 결과나 저장 action을 만들지 않는다.
- review-hold의 원문, 위험, no-save, noindex 계약은 그대로 유지한다.
- 기존 moving alias는 `/f/moving-d30-basic`으로 계속 수렴한다.

### Rollback boundary

- Default executable Flow Maps use the unified public presentation.
- Exact `visualSubtraction=off` restores the exact legacy Map shell, presentation, action, and anchor behavior for both `save_all` and `choose_child`.
- Exact `savedPlanLibrary=off` restores the prior/default result mode.
- These query-only rollback paths do not rename storage keys, migrate schema, or collapse Map and child Flow identities.

## Scope

- 실행 가능한 direct Flow Map 10개 중 canonical redirect 2개와 실제 Map renderer 8개
- `save_all` renderer 6개와 `choose_child` renderer 2개
- `/f/[slug]` 기본 공개 결과와 공통 셸/결과 컴포넌트
- Map 결과 projection adapter, selected format, controlled anchor
- 관련 unit/component/E2E와 현재 legacy-UI 고정 assertion 교정
- route/component ownership 문서 갱신

## Out of scope

- Flow Map/Flow 저장 schema 또는 storage key migration
- creator 화면, review-hold 판단 정책, 카탈로그 콘텐츠 선별 변경
- AppClient 전체 분해
- 계정/클라우드 동기화 또는 외부 Calendar round-trip
- publication mechanics are not product behavior or product acceptance criteria; they are handled by the separately authorized publication phase below
- observed-user validation. 자동 QA와 별개이며 현재 관찰 사용자 수는 `0`이다.

## Publication phase

The Owner authorized scoped commit, push, PR, merge, deployment, and production
smoke on 2026-08-12. PR #176 final head
`3555cd1db9f426dcbc30c81652be01dd38b1ce5e` passed exact-head CI run
[`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714)
and merged at `2026-08-11T20:59:16Z` as
`47c54803c6bb7544aad757ce62c4ce58decbfe53`. Post-merge `main` CI run
[`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210),
Production deployment record `5858571759` / status `16686799631`, canonical HTTP
`200`, and production smoke `11/11` passed. No publication step changes the
observed-user count of `0`.

## Acceptance criteria

1. `/f`와 실행 가능한 `/flow-maps`가 `flow-public-shell` 1개와 approved `Text / Todo / Calendar` 결과를 사용한다.
2. 중1 수학 Map은 canonical 8개 Item을 Todo로 보이고, Map ID와 저장 key/bridge record를 유지한다.
3. OPIc Map은 두 child Flow와 19개 canonical Item 순서/그룹을 유지하며 하나의 Map transaction으로 저장한다.
4. Map에서 8개 중 7개를 적용하면 preview, snapshot, persistence record가 같은 7개 canonical ID를 사용한다.
5. Map 날짜 입력 변경이 Calendar preview와 실제 저장 anchor에 동시에 반영된다.
6. 선택한 Text/Todo/Calendar와 저장한 child Flow의 `selectedArtifactMode`가 일치한다.
7. Allblanc/결혼 `choose_child`는 child 선택과 `/f` 이동만 소유하며 Map 저장 key를 만들지 않는다.
8. review-hold 5개는 실행 결과·편집·저장 action 없이 원문 확인 경계를 유지한다.
9. 실행 가능한 Map에서 Platform nav/mobile tabs, legacy outline, `저장될 전체 계획`이 사라진다.
10. 390/768/1024/1440에서 overflow, clipped control, 이름 없는 control, fixed action 겹침, console/page/request 오류가 없다.
11. focused tests, docs check, production build, canonical public/map E2E, full Playwright가 현재 소스에서 통과한다.

## Local completion result

All eleven acceptance criteria are covered by the current implementation and
local automated evidence. `npm test` passed pretest `173/173`, main `622/622`,
approved `182/182`, and public-surface `8/8`; build passed `18/18`; the final new
public-surface E2E passed `9/9` across `9` executable routes and four widths;
Map rollback/copy contracts passed `24/24`; and current-source full Playwright
passed `578/578` across `74` files with workers `2`, retries `0`, and `0`
unexpected/skipped/flaky. The exact run paths, duration, and evidence boundary are recorded in
[qa.md](./qa.md).

## Release result

Final PR head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e` and exact merge/deployed
source `47c54803c6bb7544aad757ce62c4ce58decbfe53` passed required PR and
post-merge CI. The canonical Production app returned HTTP `200`, and the final
authoritative production smoke passed `11/11` in sequential isolated contexts
in `19.023s`. Runtime, network, same-origin 4xx/5xx, overflow, clipped, unnamed,
pass-gated fixed-overlap, and pass-gated short-target violations were `0`. The
harness separately observed `4` sticky/control intersections and `10` short
targets on rollback, review-hold, and current save transitions. Those values are
not closed usability evidence, and observed-user validation remains `0`.
