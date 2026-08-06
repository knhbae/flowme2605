# P0-10 통합 회귀 증거 인덱스

**상태:** `PASS — LOCAL INTERNAL EVIDENCE`

**경계:** 이 폴더는 current local working tree의 P0 통합 QA를 기록한다. production 배포나 observed-user validation 증거가 아니다.

**실제 관찰 사용자:** `0명`

## 실행 묶음

| 묶음 | 현재 | 목적 |
|---|---|---|
| P0 unit/contract | PASS · `322/322` | P0-02~09 state·identity·loss·storage·rollback |
| full unit/workflow | PASS · `113/113 + 322/322 + 608/608 = 1,043/1,043` | 기존 P35·storage·content workflow 회귀 |
| production build | PASS · Next `15.5.21`, pages `18/18`, build ID `55R2pZ1uMR8ZGi9ToYp5K` | production compile·app typecheck |
| full Playwright | PASS · `504/504`, workers `4`, retries `0`, `18.8m` | 전체 current-ref browser manifest |
| P0-10 integration | PASS · `12/12`, workers `1`, retries `0`, `29.7s` | 두 lifecycle·HF·six-row Q1/Q2 rollback·public/my/Map × 3 viewports 결합 |
| docs/diff | PASS · required `14`, local links `4,156`, whitespace error `0` | 문서 링크·형식·patch hygiene; 기존 LF→CRLF warning만 있음 |

## 전체 브라우저 회귀 수렴

| 순서 | 결과 | 발견·조치 |
|---|---|---|
| 1 | `468 pass / 36 fail` · `28.8m` | 과거 UI 계약 drift와 실제 조건부 편집 focus-return 결함 분리 |
| 2 | `503 pass / 1 timeout` · `20.6m` | 9~10 route guardrail에 60초의 bounded budget 적용; assertion 유지 |
| 3 | `501 pass / 3 timeout` · `18.8m` | main multi-route budget 및 archive hydration TOCTOU 안정화 |
| 4 | `503 pass / 1 fail` · `20.0m` | URL-first personal draft selector를 hydration union wait로 안정화 |
| 5 | `504 pass / 0 fail` · `18.8m` | 최종 current-ref PASS |

겹친 오염 run과 shell 20분 제한으로 종료된 run은 verdict에서 제외했다. 회귀 과정에서 saved flow-scope Checklist/Sheet/Memo의 개인 시간·소요시간 손실도 발견해 manifest ID exact-set 검증과 함께 수정했다.

## 증거 라우팅

- [P0-02 closeout](../../p0-02-closeout.md) — Map parity·legacy
- [P0-04 evidence](../p0-04/) — save lifecycle·direct detail
- [P0-06 evidence](../p0-06/) — common editor·viewport·focus
- [P0-07 evidence](../p0-07/) — capability preview·action owner
- [P0-08 evidence](../p0-08/) — saved-plan library·0/1/5/20·rollback
- [P0-09 evidence](../p0-09/) — quick/saved transfer·actual artifacts·receipt lifetime
- [P0-10 closeout](../../p0-10-closeout.md) — current integrated verdict·S/HF ledger

## Final gate checklist

- [x] exact full E2E output and failure/retry counts · `504/504`, retries `0`
- [x] P0-10 integration spec output · `12/12`
- [x] route × viewport × fixture diagnostics · public/my/Map × 390/1024/1440
- [x] payload/storage/artifact/receipt diff · saved persistent vs public session-only
- [x] Q1/Q2 exact rollback matrix · six strict-off/uppercase rows, SHA-256, mutation 0; Q3는 P1-02 `TBD`
- [x] HF-01~03 current-ref PASS
- [x] final docs/diff after this update
- [ ] publish state와 observed-user `0` 분리
