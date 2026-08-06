# P0-04 저장 lifecycle·원자 저장·선택 계획 직접 이동 closeout

**판정:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 조상으로 둔 local working tree
**실행일:** 2026-08-04 KST
**변경 경계:** 공개 수정 draft→원자 저장→선택한 개인 사본 상세 이동, 기존 사본 선택, 1회 저장 배너·되돌리기, 실패 복구, rollback flag
**Publish:** commit/push/PR/CI/merge/Preview/Production 모두 미실행
**실제 관찰 사용자:** `0명`

## 1. 사용자 결과

공개 Flow에서 수정한 뒤 저장하면 별도 저장 결과 화면을 거치지 않고 방금 만든 개인 사본의 `/my?view=flows&flow=<personalCopyKey>` 상세로 바로 이동한다. 같은 원본의 저장본이 있으면 쓰기 전에 `기존 저장본 덮어쓰기 / 새 사본 만들기 / 취소`를 사용자가 직접 선택한다.

저장 성공은 `저장됨 · N개 · 되돌리기` 배너로 한 번만 알린다. 새로고침이나 browser Back은 저장을 다시 실행하지 않는다. 저장 실패에서는 공개 수정 draft와 기존 저장본을 보존하며, 원상복구가 완전하지 않으면 다른 저장이나 닫기를 허용하기 전에 저장 전 상태부터 다시 복구한다.

## 2. 분리한 상태와 identity

다음 상태를 더 이상 하나의 `savedFlowAt` 의미로 합치지 않는다.

- 변경하지 않는 공개 source/base
- 현재 탭의 공개 session draft
- `personalCopyKey`가 소유하는 개인 authoring overlay
- 개인 사본에 남는 완료·skip·memo execution overlay
- 한 번 소비되는 save banner handoff
- 별도 export result receipt

저장 intent는 `sourceKey + personalCopyKey + idempotencyKey + draftToken`으로 고정했다. source bundle을 개인 사본으로 복제 저장하지 않고, v2 saved record가 불변 source identity/version과 개인 사본 identity를 함께 참조한다.

## 3. 기존 저장본 선택과 쓰기 경계

기존 저장본 검사는 read-only다. 선택창을 열고 ESC 또는 `취소`로 닫는 동안 localStorage raw snapshot과 공개 draft가 그대로임을 브라우저에서 비교했다.

| 선택 | 실행 결과 |
|---|---|
| 덮어쓰기 | 명시적으로 선택한 personal identity의 제목·일정·항목 편집만 갱신하고 그 사본의 skip·memo를 유지 |
| 새 사본 만들기 | caller가 미리 예약한 새 identity 하나만 만들고 기존 사본과 실행 기록은 복제하지 않음 |
| 취소 | write 0, 기존 저장본과 session draft 모두 보존 |

저장 실패 후에는 실패 전 방식과 대상 radio를 잠그고 `같은 방식으로 다시 저장`이라고 표시한다. 사용자가 화면에서는 B를 골랐지만 reducer가 A를 다시 쓰는 불일치가 생기지 않는다. 다른 방식을 원하면 취소 후 새 save intent에서 다시 선택한다.

## 4. 원자 저장·실패·복구

저장 transaction은 일곱 개의 key plan을 계산하되 이번 저장이 실제로 쓰는 여섯 key만 durable recovery 범위로 고정하고, saved record를 마지막 commit marker로 강제한다. 조건부 canonical key는 이번 write·recovery journal에 넣지 않는다.

- 저장 전 모든 raw 값을 읽고 exact backup을 만든다.
- shared item draft·date override와 선택한 item state는 최초 read와 transaction backup 사이 값이 달라지면 CAS conflict로 write 0에서 멈춘다. 나머지 write target은 첫 write 직전 backup으로 고정한다.
- `length/key/getItem` 예외는 throw 대신 `held` 또는 0-write failure로 반환한다.
- 빠른 saved-record write, 중복 commit marker는 첫 write 전에 거부한다. 선언되지 않은 key가 실행 중 발견되면 transaction failure로 처리하고 앞선 write를 exact backup으로 원상복구한다.
- JSON 문법만 맞아도 item state의 허용 필드·타입이 깨지면 거부한다. item draft는 non-empty key와 plain-record entry, date override는 non-empty key와 string value 경계를 첫 write 전에 확인한다.
- 각 write 위치 실패 시 역순으로 원래 raw byte를 복구한다.
- 복구 write까지 실패하면 `recovery_required`가 되어 취소·닫기·대상 변경·새 저장을 잠근다.
- history journal v3는 여섯 storage key의 pre/post raw와 제목·날짜·항목 상태·순서·개인 수정·요일·반복 정의 session draft를 함께 검증·보관한다.
- reload 복구는 모든 현재 값이 해당 저장의 pre 또는 post byte일 때만 실행한다. 후속/외부 값, stale journal, commit-marker read 실패에서는 write 0으로 멈춘다.
- matching marker와 여섯 key의 exact post byte가 모두 확인되면 저장을 되돌리지 않고 선택한 My Flow 상세로 이동한다.
- `저장 전 상태 다시 복구`가 성공한 뒤에만 같은 intent retry 또는 취소가 가능하다. 강제 reload에서도 session draft를 다시 적용한다.

단위 테스트는 7개 write 위치 모두의 실패, snapshot read 실패, set/remove rollback 실패, retry와 idempotency를 확인한다. 브라우저 테스트도 forward write와 첫 rollback을 함께 실패시킨 뒤 원래 snapshot 복구→동일 intent 저장 성공을 확인한다.

## 5. 직접 이동·1회 배너·원자 되돌리기

성공한 identity는 선택된 My Flow 상세 route로 직접 전달한다. save-only receipt 화면과 export receipt는 사용하지 않는다.

배너 handoff는 기본적으로 token별 sessionStorage에 저장하고 읽기 전에 제거한다. sessionStorage getter 또는 write가 차단되면 같은 payload를 현재 history entry로 전달한다. URL의 `saveReceipt`도 소비 즉시 제거하므로 reload에서 배너가 반복되지 않는다. 두 transport가 모두 실패하는 드문 경우에도 committed plan 상세 이동은 유지하되 transient 배너·되돌리기는 보장하지 않는다.

되돌리기는 저장 전 raw backup을 적용하기 전에 현재 저장 후 값을 다시 snapshot하고 expected post byte와 비교한다. 저장 후 다른 변경이 생기면 write 0으로 멈춘다. 되돌리기 중 한 write가 실패하면 되돌리기 시작 전 상태로 보상하여 부분 변경을 숨기지 않는다. 보상까지 실패하면 화면 state를 다시 읽고 복구 실패를 명시한다.

성공 직후 navigation이 끝나기 전에는 post-commit guard가 stale double-click handler를 차단한다. browser Back으로 BFCache 문서가 복원되면 저장을 재실행하지 않고 public action을 새 editing 상태로 다시 활성화한다.

## 6. 모바일·접근성 보정

- 첫 저장 실패는 390px fixed action 영역 안에 표시하고 alert로 focus를 옮긴다.
- 기존 사본 선택창의 중첩 label을 제거하고 input별 `htmlFor`를 연결했다.
- 내부 UUID 대신 개인 제목·초 단위 저장 시각·`사본 N`으로 같은 제목/시각도 구분한다.
- 덮어쓰기와 새 사본이 title/date/items와 completion/memo에 미치는 차이를 적었다.
- pending과 불완전 복구 중에는 header close, backdrop, ESC, 취소를 실제 disabled 처리한다.
- dialog 종료 시 숨겨진 desktop button이 아니라 실제 opener로 focus가 돌아간다.
- flag-on 첫 렌더부터 공개 화면의 이전 comparison/workbench execution overlay를 읽지 않는다.

## 7. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| 저장 사본 한 개, source/base 불변 | PASS | first-save v2 identity·source key 부재·source 재진입 E2E |
| 기존 사본 선택 전 write 0 | PASS | dialog open·ESC·cancel 전후 전체 raw snapshot 동일 |
| overwrite/copy/cancel 분기만 실행 | PASS | 선택 target peer byte 불변, double click +1, 취소 0-write |
| 실패에서 draft·기존 saved copy 보존 | PASS | 모든 write 위치 rollback unit + reload 뒤 제목·날짜 draft 재적용 E2E |
| 불완전 rollback을 성공처럼 처리하지 않음 | PASS | journal v3, `recovery_required` lock, pre/post CAS, 후속 값 write 0, 원본 byte 재복구 E2E |
| browser Back이 저장을 재실행하지 않음 | PASS | Back 후 identity 수 불변 + 편집/저장 action 재활성화 |
| 배너가 사라져도 저장 계획 재진입 | PASS | receipt query 제거·reload banner 0·selected detail 유지 |
| save banner와 export receipt 분리 | PASS | public receipt 0, My Flow post-save panel 0, save banner 1 |
| flag off가 기존 P35 path/storage bytes 사용 | PASS | legacy public receipt와 exact legacy saved-record raw assertion |
| 손상된 persisted state·stale recovery가 기존 값을 덮지 않음 | PASS | semantic validator, input/undo/recovery CAS, transient marker read·newer value E2E |
| 중복 제출·선택창 접근성 | PASS | synchronous double click 1 handoff, unique copy labels, ESC/취소 opener focus |

## 8. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| lifecycle·transaction·handoff·journal·flag targeted | PASS · 62/62 | 상태 전이, semantic read, CAS, 7-position rollback, journal v3, atomic undo |
| `npm.cmd run test:p35-p0` | PASS · 53/53 | P35 P0 snapshot/export/entry/memo/Map 계약 |
| `npm.cmd test` | PASS · pretest 106/106 + test 603/603 | 전체 unit/workflow 회귀 |
| `npm.cmd run build` | PASS · Next 15.5.21, 18/18 pages | production compile·type gate |
| P0-04 lifecycle Playwright | PASS · 20/20 | success, choice, semantic corruption, failure, recovery, draft reload, Back, double submit |
| R3/R8 continuity Playwright | PASS · 6/6 | mobile/wide direct detail, flag-off legacy bytes, semantic/execution continuity |
| 390×844·1024×768 capture | PASS · 2장 | direct selected detail, one banner, viewport overflow 0 |
| `npm.cmd run docs:check` | PASS | 단계 문서·로컬 링크·형식 |
| `git diff --check` | PASS | whitespace/error 없음 |

## 9. 화면 증거

- [390px 저장 후 선택 상세](./evidence/p0-04/screenshots/p35-r3-direct-focused-workspace-390.png)
- [1024px 저장 후 선택 상세](./evidence/p0-04/screenshots/p35-r3-focused-workspace-1024.png)

두 화면 모두 별도 저장 결과 화면 없이 선택한 개인 사본을 열고, `저장됨 · 24개 · 되돌리기`를 한 번만 보여 준다. 이 캡처와 Playwright는 내부 시뮬레이션이며 실제 사용자 관찰이 아니다.

## 10. 소유 파일과 기존 dirty 경계

이번 단계가 소유한 주요 코드·테스트:

- `components/flow/AppClient.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/PublicFlowExistingCopyDialog.tsx`
- `lib/flow/public-save-lifecycle.ts`와 test
- `lib/flow/public-flow-save-transaction.ts`와 test
- `lib/flow/public-flow-save-handoff.ts`와 test
- `lib/flow/public-flow-save-recovery-journal.ts`와 test
- `lib/flow/p35-round2-flags.ts`와 test
- `lib/flow/storage.ts`와 test의 v2 personal-copy 범위
- `tests/e2e/p35-p0-save-lifecycle.spec.ts`
- `tests/e2e/p35-r3-receipt-workspace-continuity.spec.ts`
- `tests/e2e/p35-r8-continuity.spec.ts`
- 이 closeout, active spec ledger, P0-04 evidence

P0-01·P0-02·P0-03 소유 변경과 시작 전 dirty였던 `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/specs/README.md`, `docs/content-audit/2026-08-03-*`는 삭제·정리·stage하지 않았다.

## 11. Rollback·제외·다음 gate

- rollback 단위: 위 P0-04 code/test/docs 파일(복구 journal 모듈·test 포함)과 `saveLifecycle=off` flag.
- 일반 `/my` 정보 구조는 P0-08, 공통 editor transaction/surface는 P0-05·P0-06 범위다.
- 저장 전/후 export ownership과 capability preview는 P0-07·P0-09에서 다룬다.
- existing-copy dialog의 browser Back 닫기 event parity는 P0-05 공통 event matrix에서 다룬다. P0-04에서는 ESC·취소·pending lock·focus return을 검증했다.
- Local edit: 있음
- Commit/Push/PR/CI/Merge/Preview/Production: 모두 없음
- 자동·브라우저 내부 검증: 완료
- 실제 사용자 관찰: `0명`
- 다음 strict-order gate: **P0-05 공통 editor transaction 기반**
