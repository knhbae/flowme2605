# QA Evidence

**Status:** LOCAL IMPLEMENTATION AND AUTOMATED QA COMPLETE / DRAFT PR-PREVIEW AUTHORIZED / MERGE-PRODUCTION NOT AUTHORIZED

**Base:** `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`

**Observed users:** `0`

스크린샷, 자동화, 내부 리뷰, 로컬 빌드는 observed-user validation으로 계산하지 않는다. 이 문서는 현재 worktree의 구현·회귀 근거이며 Production 배포 근거가 아니다.

## Product result

- 일반 `/f/[slug]`와 실행 가능한 단일 계획 `save_all` Map은 같은 `PublicFlowAdjustmentPanel`, `PublicFlowItemEditor`, editor controller, dirty-close, Back, focus, scroll 문법을 사용한다.
- Item `계획에 반영`은 부모 Plan draft만, Plan `변경 반영`은 현재 공개 session의 effective draft만 바꾼다. 기존 최종 저장 action 전에는 persistent storage를 쓰지 않는다.
- Map Item은 제목과 개인 메모를 편집한다. Map schema가 lossless하게 지원하지 않는 날짜 편집은 숨기며, 순서는 현재 단일-child plan 안에서만 저장한다.
- `save_all`은 사용자에게 일반 Flow처럼 보인다. OPIc 2주/1달, wedding 두 버전, Allblanc 두 영상은 `choose_child`로 하나를 고른 뒤 canonical `/f`에서 편집한다. `review_hold`는 editor와 저장 action을 노출하지 않는다.
- Map ID/version, child Flow/Item ID, source, snapshot, persistence/bridge, storage key, unknown fields, atomic save/rollback owner는 유지된다.

## Browser matrix

| Surface / mode | Evidence | State |
| --- | --- | --- |
| Ordinary `/f` vs Map shared Plan/Item contract | 1024px에서 동일 dialog/sheet test IDs, field order, Plan/Item CTA와 schema 비교 | PASS |
| Flow Map Plan/Item responsive | 390 / 1024 / 1440, sticky footer, right drawer/full-width geometry, horizontal overflow `0` | PASS |
| Flow Map no-op Item apply | 390px, parent Plan remains clean and closes without discard prompt | PASS |
| Flow Map provisional apply and final save | 390px, Item/Plan apply storage bytes unchanged; final save/reload restores order/title/memo | PASS |
| Dirty Cancel / Escape / browser Back | 390px, one discard confirmation, continue keeps draft/focus, discard restores opener and scroll | PASS |
| `choose_child` | OPIc/wedding/Allblanc selector only; no Map/shared editor before entering child `/f` | PASS |
| `review_hold` | editor, adjustment, save affordance absent | PASS |

Dedicated browser command:

```text
npm.cmd run test:e2e -- tests/e2e/public-plan-edit-surface-unification.spec.ts --workers=1
8 passed
```

## Transaction and identity matrix

| Transition / invariant | Result |
| --- | --- |
| Open editor | persistent local/session bytes unchanged |
| Item `계획에 반영` | parent draft only; persistent bytes unchanged |
| Plan `변경 반영` | session effective result only; persistent bytes unchanged |
| Clean/dirty discard | pre-open bytes restored exactly |
| Map final save | existing snapshot/persistence/bridge transaction only |
| Reload | requested inclusion/order and private title/memo restored |
| Map identity | Map ID/version, child Flow/Item IDs and bridge key unchanged |
| Excluded Item values | private title/memo preserved while Item remains excluded |
| Unknown fields | snapshot/persistence top-level and nested sentinels preserved |
| Invalid or unknown IDs | rejected or pruned without source mutation |
| OPIc boundary | Map ID/version/source and 2 child identities preserved; public mode changes from merged `save_all` to `choose_child` |

## Automated gates

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
- UX subtraction review removed the separate default Map editor, duplicated selector help, Map-specific product explanation, and unsupported date input. Source links, materially distinct choice copy, dirty recovery, and internal source identity remain.

## Publication boundary

- Commit/push/Draft PR/Preview: `AUTHORIZED 2026-08-12`.
- Merge/Production: `NOT AUTHORIZED`.
- Production smoke: `NOT RUN` for this candidate.
- Observed-user validation: `0`.
