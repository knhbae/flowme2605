# P35 Round 2 B/B/B 구현 계획

> 전체 단계의 목표·산출물·인수·검증·중지 조건·증거 ledger는 [전체 프로그램 단계별 개발 목표](./full-program.md)를 canonical 운영 문서로 사용한다.

## Baseline

- 최초 승인 기준: `91fb66af063f7041f9442a9dfeb66f9a3e78d723`
- 현재 구현 baseline/upstream: `d5f693776f7cebbce72a247ddb33ca6c5d550900`
- 승인값: Q1-B / Q2-B / Q3-B
- publish 권한: `none`
- 현재 checkout의 기존 미추적 산출물은 보존한다.
- 상세 티켓 정의는 [개발 순서와 티켓](../../content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/04-development-sequence-and-tickets-ko.md)을 따른다.

## Strict Sequence

| 순서 | 티켓 | 결과 | 시작 조건 | 현재 상태 |
|---:|---|---|---|---|
| 0 | G0 | B/B/B Owner 결정 | 없음 | 완료 |
| 1 | G1 | decision·spec·status·roadmap·prompt 연결 | G0 | PASS · 로컬 미게시 |
| 2 | P0-01 | action owner·loss schema·fixture·contract tests | G1 | **PASS** |
| 3 | P0-02 | Flow Map selected/applied/preview/save parity | P0-01 green | **PASS** |
| 4 | P0-03 | Item 완료 기준 UI/payload parity | P0-02 green | **PASS** |
| 5 | P0-04 | lifecycle reducer·atomic save·direct detail | P0-03 green | **PASS** |
| 6 | P0-05 | 공통 editor transaction | P0-04 green | **PASS** |
| 7 | P0-06 | 공개/저장 Plan·Item editor surface | P0-05 green | **PASS** |
| 8 | P0-07 | capability preview·행동 소유권 UI | P0-06 green | **PASS** |
| 9 | P0-08 | Q2-B 저장 계획 중심 `/my` | P0-07 green | **PASS** |
| 10 | P0-09 | Q1-B local quick result·saved transfer·receipt | P0-08 green | **PASS** |
| 11 | P0-10 | hard fail 0·통합 회귀 gate | P0-09 green + P0-02~09 evidence green | **PASS** |
| 12 | P1-01 | Item·Map·시작일 시각 감산 | P0-10 green | **PASS** |
| 13 | P1-02 | Q3-B copy·CTA·도움/주의 | P1-01 green | **PASS** |
| 14 | P1-03 | 형식별 field parity | P1-02 green | **PASS** |
| 15 | P1-04 | 극단값·접근성·legacy 회귀 | P1-03 green | **PASS** |
| 16 | V1 | 제한 사용자 관찰 | 미래 별도 프로그램에서만 재개 | **OUT_OF_SCOPE_CURRENT_PROGRAM · observed 0** |

모든 구현 단계는 [전체 프로그램](./full-program.md)의 순서대로 직렬 실행해 P1-04까지 local internal PASS로 닫았다. P1-03 근거는 [closeout](./p1-03-closeout.md)과 [format/field parity](./p1-03-format-field-parity.md), P1-04 근거는 [final gate closeout](./p1-04-closeout.md)이다. Candidate preflight는 공개 초기 render의 persistent write `0` 계약을 추가로 고정했다. 실제 zoom·performance는 `NOT_ASSESSED`이고 `720×500`은 reflow proxy다. 다음 단계는 candidate freeze와 blind internal review이며 V1은 현재 완료 조건에서 제외됐다.

## Historical First Development Pass — P0-01 Only

아래 내용은 프로그램 시작 시점의 P0-01 범위 기록이다. 현재 gate는 P1-03 PASS / P1-04 PASS / internal implementation gate complete이며 [전체 프로그램](./full-program.md)과 최신 closeout을 따른다. V1은 `OUT_OF_SCOPE_CURRENT_PROGRAM`이다.

### User result

아직 화면은 바뀌지 않는다. 이후 모든 화면과 export가 같은 Item ID·count·field contract를 사용하도록 검증 가능한 기반을 만든다.

### Deliverables

1. 현재 `source/base → public session draft 또는 personal overlay → effective authoring snapshot → execution overlay → effective execution snapshot → projection → artifact/receipt`의 실제 코드·storage owner inventory
2. lifecycle × capability × scope action ownership matrix
3. format별 `preserved / transformed / omitted / held / unavailable` loss schema
4. stable-ID fixture와 기존 7↔8·완료 기준 불일치 재현
5. consumer별 입력 snapshot과 Item ID/count 비교 test
6. nested Item commit, receipt storage, legacy schema, rollback mechanism 확인 결과

### Candidate files

| Path | Responsibility |
|---|---|
| `lib/flow/effective-flow-snapshot.ts` | committed/public effective result owner 후보 |
| `lib/flow/effective-flow-export.test.ts` | snapshot→export builders 경계를 검증하는 기존 test; import를 따라 `effective-flow-snapshot.ts`와 `export.ts`의 실제 owner 확인 |
| `lib/flow/export.ts` | Calendar/text/workbook artifact builder 후보 |
| `lib/flow/flow-experience-projection.ts` | surface projection owner 후보; 실제 존재·소비자를 먼저 확인 |
| `lib/flow/export-scope.ts` | export scope/count owner 후보 |
| `lib/flow/artifact-recommendation.ts` | primary/available/conditional 결과 후보 |
| `lib/flow/flow-map-action-contract.ts` | Map action/compatibility owner 후보 |
| 대응 `*.test.ts` | fixture·contract·golden evidence |

후보는 수정 목록이 아니다. `rg`와 기존 tests로 실제 owner를 확인한 뒤 가장 낮은 공통 계층만 수정한다.

### Explicit no-change boundary

- UI, route, save behavior, `/my` IA, user copy 변경 금지
- Q1-B/Q2-B/Q3-B 화면 선행 구현 금지
- storage key/version rewrite와 migration 금지
- 다음 티켓 코드 선행 금지

## PR Boundaries

- 한 PR은 한 티켓의 acceptance만 소유한다.
- P0-01은 계약·fixture·tests만 소유한다.
- 실제 route/component/data ownership이 바뀌는 PR에서만 `SERVICE_STRUCTURE.md`를 갱신한다.
- 완료 증거는 `docs/pr-history/`와 해당 spec에 기록하되 구현 전에는 완료 파일을 만들지 않는다.
- commit·push·PR·merge·deploy는 각 개발 세션의 명시적 publish 권한이 있을 때만 수행한다.

## Risk Controls

- 시작 시 branch, HEAD, upstream, dirty path를 기록하고 기존 변경을 unowned로 취급한다.
- source/base, personal overlay, execution overlay, receipt를 섞지 않는다.
- strict order를 깨야 한다면 구현을 멈추고 충돌 파일·사용자 영향·가장 작은 대안을 보고한다.
- rollback은 세 선택축마다 독립적이며 data migration을 요구하지 않아야 한다.
- proposal, implementation, internal QA, observed-user evidence 라벨을 분리한다.
