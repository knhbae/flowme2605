# P0-02 Flow Map 선택·적용·미리보기·저장 parity closeout

**판정:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 조상으로 둔 local working tree
**실행일:** 2026-08-04 KST
**변경 경계:** Flow Map `save_all`의 effective snapshot·저장 transaction·계약/E2E·단계 장부
**Publish:** commit/push/PR/CI/merge/Preview/Production 모두 미실행
**실제 관찰 사용자:** `0명`

## 1. 사용자 결과

Flow Map에서 제목을 `시험 전 핵심 단원`으로 바꾸고 8개 중 7개를 적용하면, 이제 다음 모든 소비자가 같은 제목과 같은 7개 canonical Item ID를 사용한다.

- 상단 제목과 결과 개수
- 결과 미리보기
- 실행 순서
- 하단 시작 CTA
- saved Map snapshot
- persistence selection
- reload 뒤 저장 결과

적용한 7개가 저장 과정에서 조용히 원본 8개로 돌아가던 fallback도 제거했다. 저장 중 일부 key write가 실패하면 관련 raw storage를 원복하고, 화면에는 적용한 7개를 그대로 남겨 같은 결과로 재시도할 수 있다.

## 2. 재현한 원인과 before/after

기존에는 서버가 원본 publish package 8개를 렌더하고, 저장 버튼 내부 client state만 수정 제목·7개를 들고 있었다. 따라서 한 화면 안에서도 consumer마다 서로 다른 상태를 읽었다.

| 소비 지점 | Before | After |
|---|---|---|
| 편집 draft | 수정 제목·7개 | 수정 제목·7개 |
| 적용 뒤 hero | 원래 제목·원본 8개 | 수정 제목·적용 7개 |
| 결과 label | `8개 단원 진도표` | `7개 단원 진도표` |
| 미리보기 | 원본 8개 | 적용 7개 |
| 실행 순서 | 원본 8개 | 적용 7개 |
| CTA | 수정 제목·7개 | 수정 제목·7개 |
| saved snapshot | 정상 경로는 수정 제목·7개, projection 실패 시 원본 8개 fallback 가능 | 수정 제목·7개 또는 명시적 실패 |
| persistence | flow별 bare ID 7개 | 같은 canonical 7개에서 결정적으로 파생한 flow별 selection |

실제 before 화면은 원래 제목·8개 미리보기와 `선택한 7개로 시작`이 동시에 보였고, after 화면은 제목·결과 label·미리보기·outline·CTA가 모두 7개로 일치한다.

## 3. 공통 effective snapshot과 ID 규칙

[effective-flow-map-snapshot.ts](../../../lib/flow/effective-flow-map-snapshot.ts)가 Map의 적용 결과를 한 번 계산한다.

- canonical key: `<flowSlug>::<stepId>`
- count: canonical selected ID 배열 길이에서만 계산
- title, selected rows, preview rows, action contract, included/excluded IDs를 같은 snapshot에서 파생
- child Flow 사이에 같은 raw `stepId`가 있어도 canonical key로 구분
- unknown·duplicate ID와 count/ID 불일치는 명시적 오류

[SourceBackedFlowMapSaveExperience.tsx](../../../components/flow/SourceBackedFlowMapSaveExperience.tsx)는 `save_all` 화면의 applied snapshot을 소유한다. hero·미리보기·실행 순서·CTA·save payload는 이 state만 읽는다. `choose_child`와 `review_hold`는 기존 분기와 source/risk/recovery 계약을 유지한다.

## 4. 편집·취소·Back·저장 실패 복구

[SourceBackedFlowMapSaveButton.tsx](../../../components/flow/SourceBackedFlowMapSaveButton.tsx)는 편집 중 draft와 적용된 snapshot을 분리한다.

- `변경 반영`: draft를 applied snapshot으로 승격한다.
- 취소·Escape·browser Back: draft만 버리고 기존 applied title/7개를 복구한다.
- 닫은 뒤 focus: 편집 trigger로 돌아간다.
- 저장 전: Map storage write는 0이다.
- personalized projection 실패: 원본 8개 fallback 없이 오류로 종료한다.
- 저장 partial write: [flow-map-save-transaction.ts](../../../lib/flow/flow-map-save-transaction.ts)가 관련 key의 기존 raw 값을 복구한다.
- 재시도: 같은 applied snapshot 7개로 한 번 저장하고 이동한다.

## 5. 보존한 분기와 불변식

- `save_all`, `choose_child`, `review_hold` 동작을 분리한 채 유지했다.
- risk·conflict·source relation·recovery 정보를 effective snapshot/action contract에 보존했다.
- source/base와 legacy record를 수정하지 않았다.
- unsupported legacy Map은 `/my`에서 읽고 reload해도 해당 raw bytes가 바뀌지 않는다.
- Flow Map 3칸 요약 감산, `/flow-maps` 제거, schema migration은 수행하지 않았다. 이는 P1-01 또는 별도 migration gate 범위다.

## 6. 실제 화면·storage 증거

| Viewport | Before | After |
|---|---|---|
| 390×844 | [p0-02-map-before-390x844.png](./evidence/p0-02/p0-02-map-before-390x844.png) | [p0-02-map-after-390x844.png](./evidence/p0-02/p0-02-map-after-390x844.png) |
| 1440×1000 | [p0-02-map-before-1440x1000.png](./evidence/p0-02/p0-02-map-before-1440x1000.png) | [p0-02-map-after-1440x1000.png](./evidence/p0-02/p0-02-map-after-1440x1000.png) |

After SHA-256:

- 390×844: `4324CAE6E74BC3F243BCB36DCF2D6435A2B88EF90DAFD18326506EFB4D6C1300`
- 1440×1000: `3604406EF1A484F14D2720BB89C4A88B05F46558C2E4E763A090B828769712EF`

E2E는 7개 적용 뒤 DOM의 hero·preview·outline·CTA canonical IDs와 저장된 snapshot/persistence IDs를 직접 비교했다. 실패 주입에서는 관련 key의 실패 전 raw 문자열과 rollback 뒤 raw 문자열이 정확히 같음을 확인했고, 재시도·redirect·reload 결과까지 확인했다.

## 7. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| selected IDs = applied IDs = preview IDs = saved IDs | PASS | canonical `<flowSlug>::<stepId>` fixture·mobile/desktop E2E |
| title/count가 CTA·preview·saved snapshot·persistence에서 동일 | PASS | 7↔8 contract tests와 실제 경로 DOM/storage assertion |
| legacy fixture read-only에서 storage rewrite 0 | PASS | unsupported legacy raw bytes before/reload 비교 |
| partial write를 성공으로 표시하지 않음 | PASS | `QuotaExceededError` 1회 주입, no redirect·alert·rollback·retry |
| Cancel·Escape·Back에서 적용 selection 복구 | PASS | applied 7개 뒤 dirty 6개 draft를 각각 닫는 E2E |
| `save_all` 외 Map mode와 source/risk/recovery 보존 | PASS | contract tests와 choose-child/review-hold E2E |

## 8. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| targeted Map/snapshot tests | PASS · 38/38 | 7↔8, canonical ID, duplicate raw ID, mode·risk·source·rollback/retry |
| `npm.cmd run test:p35-p0` | PASS · 53/53 | P35 P0 snapshot/export/entry/memo/Map 계약 |
| `npm.cmd test` | PASS · pretest 105/105 + test 597/597 | 전체 unit/workflow 회귀 |
| `npm.cmd run build` | PASS · Next 15.5.21, 18/18 pages | production compile·type gate |
| P0-02 Playwright | PASS · 5/5 | mobile·desktop parity, modes, failure recovery, legacy read-only |
| 390×844·1440×1000 실제 캡처 | PASS | before/after 시각 근거 |
| `npm.cmd run docs:check` | PASS | 단계 문서·로컬 링크·형식 |
| `git diff --check` | PASS | whitespace/error 없음 |

독립 `npx tsc --noEmit`는 기존 test 파일의 strict type 오류가 다수 있어 프로젝트 통과 gate로 사용하지 않았다. P0-02 변경 경로와 일치하는 오류는 없었고, 실제 production type gate인 `npm.cmd run build`는 통과했다.

## 9. 소유 파일과 기존 dirty 경계

이번 단계가 소유한 코드·테스트:

- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `components/flow/SourceBackedFlowMapExecutionOutline.tsx`
- `components/flow/SourceBackedFlowMapSaveExperience.tsx`
- `lib/flow/effective-flow-map-snapshot.ts`
- `lib/flow/flow-map-save-transaction.ts`
- `lib/flow/flow-map-action-contract.ts`
- `lib/flow/effective-flow-snapshot.test.ts`
- `lib/flow/flow-map-action-contract.test.ts`
- `tests/e2e/p35-p0-map-action-contract.spec.ts`
- 이 closeout과 active spec의 P0-02 ledger

시작 전부터 dirty였던 `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/specs/README.md`, `docs/content-audit/2026-08-03-*`는 삭제·정리·stage하지 않았다.

## 10. Rollback·게시·다음 gate

- rollback 단위: 위 P0-02 code/test 파일과 P0-02 ledger만 되돌리면 된다. storage migration은 없다.
- Local edit: 있음
- Commit/Push/PR/CI/Merge/Preview/Production: 모두 없음
- 자동·브라우저 내부 검증: 완료
- 실제 사용자 관찰: `0명`
- 다음 strict-order gate: **P0-03 Item 완료 기준 UI/checklist payload parity**
