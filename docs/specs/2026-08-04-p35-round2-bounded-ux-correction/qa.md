# P35 Round 2 B/B/B QA 계약

## Evidence Boundary

| Evidence | 증명하는 것 | 증명하지 못하는 것 |
|---|---|---|
| unit/contract/golden | deterministic state·payload·count·loss contract | 처음 보는 사용자의 이해 |
| browser/E2E | 실제 DOM·route·Back·focus·storage·download | 선호·장기 사용성 |
| Codex runtime review | 현재 구현의 재현·console·network·payload | 관찰 사용자 행동 |
| Claude static review | hierarchy·density·copy·시각 접근성 반례 | runtime/storage correctness |
| Owner acceptance | 제품 우선순위와 승인 범위 | 외부 사용자 일반화 |
| observed-user session | 실제 과업 예측·이해·오류 | 전체 코드 회귀 |

현재 관찰 사용자는 `0명`이다. B/B/B 승인, 구현 완료, 자동 QA 통과를 UXR 통과로 표현하지 않는다. V1은 Owner 결정으로 현재 프로그램 완료 조건에서 제외됐다.

## Hard Fail Gates

| ID | Required result | State |
|---|---|---|
| HF-01 | Flow Map selected IDs = applied IDs = preview IDs = saved IDs; title과 count도 동일 | PASS · [P0-02 closeout](./p0-02-closeout.md) |
| HF-02 | 완료 기준 UI 약속 = portable checklist preview/payload; memo·warning·completion state와 분리 | PASS · [P0-03 closeout](./p0-03-closeout.md) |
| HF-03 | capability × lifecycle × scope별 primary owner 1개; secondary shortcut은 다른 scope/effect를 명시 | PASS · [P0-10 통합 closeout](./p0-10-closeout.md)에서 public save/quick·saved transfer lifecycle과 full E2E 재검사 |

## P0-01 Required Fixtures

- all-dated
- all-undated
- dated/undated mixed
- memo-first
- repeated routine
- Flow Map `save_all`, `choose_child`, `review_hold`
- Flow Map 7↔8 reproduction
- completion criterion + memo + warning/resource + source
- legacy saved copy
- missing base

각 fixture는 stable canonical Item IDs, source/base, personal overlay, execution overlay, expected projection을 명시한다.

## P0-01 Required Checks

```powershell
npx.cmd tsx --test `
  lib/flow/effective-flow-snapshot.test.ts `
  lib/flow/effective-flow-export.test.ts `
  lib/flow/flow-experience-projection.test.ts `
  lib/flow/export-scope.test.ts `
  lib/flow/artifact-recommendation.test.ts `
  lib/flow/flow-map-action-contract.test.ts

npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
git diff --check
```

테스트 파일이 실제로 존재하지 않거나 runner가 다르면 현재 source를 먼저 확인하고 동등한 targeted command로 바꾼 이유를 기록한다. 없는 파일을 통과한 것처럼 보고하지 않는다.

P0-01은 UI no-change 티켓이므로 browser QA는 기본 필수가 아니다. 공용 consumer 또는 runtime UI에 영향이 생기면 영향 P35 E2E를 추가한다.

## UI Ticket Browser Matrix

| Dimension | Required evidence |
|---|---|
| viewport | 390×844, 1024, 1440×1000 |
| navigation | direct entry, save deep-link, reload, Back, query/selection/scroll restore |
| edit | clean, dirty-valid, dirty-invalid, submitting, recoverable error, rollback-incomplete recovery-required lock |
| close | Cancel, X, backdrop, Escape, browser Back, focus return |
| save/transfer | double click, retry, refresh, duplicate, clipboard denial, blob failure |
| content | dated, undated, mixed, memo, routine, Map, long Korean, 50 Items |
| diagnostics | horizontal overflow, clipping, sticky collision, console/page error, failed request, replacement character |
| data | storage before/after, Item IDs/count, generated artifact, receipt |

## Full Internal Gate

```powershell
npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --workers=4
npm.cmd run docs:check
git diff --check
```

- HF-01~03 PASS
- P35 existing regression green
- 390/1024/1440 overflow·overlap 0
- console/page errors와 failed requests 0 또는 승인된 예외
- legacy fixture identity·personal·execution 값 손실 0
- Saved transfer의 preview = confirm = artifact = persistent export receipt Item IDs/count/version/hash
- Public quick의 preview = artifact = session-only 결과 확인 Item IDs/count, persistent receipt/history write 0
- 구현·내부 QA·publish·observed-user 상태를 별도 기록

### Final internal gate result

- P1-03: `PASS` — [closeout](./p1-03-closeout.md), [format/field parity](./p1-03-format-field-parity.md)
- P1-04: `PASS` — [final gate closeout](./p1-04-closeout.md)
- full E2E: `529/529 PASS`, workers `4`, retries `0`, elapsed `26.0m`; direct `6/6 PASS`
- unit: `1,086/1,086 PASS`
- build: Next `15.5.21`, pages `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU`
- actual browser zoom: `NOT_ASSESSED`
- performance: `NOT_ASSESSED`
- `720×500`: reflow proxy only; 실제 200% zoom 증거로 사용하지 않음
- candidate commit·push와 blind-only A/B: Owner 승인됨; exact SHA는 외부 freeze record에 기록
- PR·merge·Preview·Production: 승인되지 않음
- V1: `OUT_OF_SCOPE_CURRENT_PROGRAM`; observed users `0`

## Required Checks Ledger

| Check | Result | Evidence |
|---|---|---|
| Owner B/B/B decision | Pass | 2026-08-04 승인 기록 |
| initial local planning docs check | Pass | 2026-08-04 `npm.cmd run docs:check`: 14 required files·3,841 local links; `git diff --check`: pass |
| P0-01 implementation | PASS | [contract·fixture·foundation closeout](./p0-01-closeout.md) |
| P0-02 implementation | PASS | [Map snapshot·storage recovery·E2E closeout](./p0-02-closeout.md) |
| P0-03 implementation | PASS | [criterion contract·UI/clipboard/file·privacy closeout](./p0-03-closeout.md) |
| P0-04 implementation | PASS | [원자 저장·선택 상세·실패 복구·1회 배너 closeout](./p0-04-closeout.md) |
| P0-05 implementation | PASS | [네 context transaction·원자 commit·rollback 불완전 잠금 closeout](./p0-05-closeout.md) |
| P0-06 implementation | PASS | [공개·저장 Plan/Item 공통 surface·writer·Back/focus·flag-off closeout](./p0-06-closeout.md) |
| P0-07 implementation | PASS | [capability VM·실제 preview·행동 소유권·no-write·flag-off closeout](./p0-07-closeout.md) |
| P0-08 implementation | PASS | [저장 계획 library·파생 Today·0/1/5/20·Back/focus·archive·save handoff·exact rollback closeout](./p0-08-closeout.md) |
| P0-09 implementation | PASS | [quick-local guard·saved transfer·immutable receipt·failure/cleanup recovery closeout](./p0-09-closeout.md) |
| P0-10 integration gate | PASS | [P0 통합 회귀·내부 gate closeout](./p0-10-closeout.md): full E2E 504/504, integration 12/12, P35 P0 322/322, unit/workflow 1,043/1,043, build 18/18 |
| P1-01 visual subtraction | PASS · strict re-audit | [P1-01 closeout](./p1-01-closeout.md): 모바일 Map 미입력 날짜 count 유지, 3 surface × 3 viewport accessibility tree 축약본과 DOM card count 보완, after/before 각 5/5 |
| P1-02 copy·disclosure | PASS | [P1-02 closeout](./p1-02-closeout.md) |
| P1-03 format/field parity | PASS | [P1-03 closeout](./p1-03-closeout.md) · [format/field parity](./p1-03-format-field-parity.md) |
| P1-04 final internal gate | PASS | [P1-04 closeout](./p1-04-closeout.md): full E2E 529/529, workers 4, retries 0, 26.0m; direct 6/6; unit 1,086/1,086; build 18/18, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |
| actual zoom / performance | `NOT_ASSESSED` | `720×500`은 reflow proxy이며 zoom 측정이 아님 |
| candidate publish state | AUTHORIZED / EXTERNAL_FREEZE_RECORD_AFTER_COMMIT | product SHA·clean proof·blind A/B를 source commit 밖에서 고정 |
| prohibited publish state | NOT_AUTHORIZED | PR·merge·Vercel Preview·Production |
| observed-user sessions | `0` | V1 `OUT_OF_SCOPE_CURRENT_PROGRAM` |
