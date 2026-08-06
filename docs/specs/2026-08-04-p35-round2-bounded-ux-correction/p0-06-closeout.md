# P0-06 공개·저장 Plan/Item 공통 editor surface closeout

**판정:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 기준으로 한 local working tree
**branch / upstream:** `codex/p35-production-mobile-p0` / `origin/codex/p35-production-mobile-p0`
**실행일:** 2026-08-04 KST
**변경 경계:** 공개·저장 Plan/Item 공통 editor schema·surface·controller, saved writer·recovery, 실제 entry wiring, close/Back/focus/layer 계약, flag-off rollback, tests·browser evidence
**Publish:** commit·push·PR·CI·merge·Preview·Production 모두 미실행
**실제 관찰 사용자:** `0명`
**다음 단계:** `P0-07 NOT_STARTED` — 이번 closeout에서 자동으로 시작하지 않음

## 1. 사용자 결과

공개 계획, 공개 Item, 저장 계획, 저장 Item이 본문 아래에 서로 다른 방식으로 붙는 편집 UI 대신 하나의 editor family를 사용한다.

- 모바일은 full-height sheet, wide는 right inspector/dialog로 열리지만 field 순서와 transaction 규칙은 같다.
- Plan과 Item 편집은 제목, 기준일/구성, 상세·메모, 날짜, 완료 기준, 출처·안전 순서를 공유한다.
- Public Apply는 현재 공개 session draft만 바꾸고 저장소에 기록하지 않는다.
- Saved Item Apply는 부모 Plan draft만 바꾸며, 최종 Saved Plan Save에서만 personal overlay를 한 번 기록한다.
- Cancel, 상단 닫기, backdrop, Escape, browser Back은 가장 안쪽 editor부터 같은 dirty guard를 거친다.
- validation/runtime/storage 오류 뒤에도 draft를 유지하고 첫 오류로 이동하거나 재시도할 수 있다.
- editor 저장·적용 동사에 `완료`를 쓰지 않는다. `완료`는 실행 상태에만 남긴다.
- 출처와 안전 정보는 물음표나 느낌표 icon-only 안으로 숨기지 않고 읽을 수 있는 텍스트 링크/영역으로 남긴다.

이번 단계는 현행 사용자 문구를 유지하는 단계다. `Flow`를 `계획`으로 바꾸는 전체 copy sweep과 도움·주의 감산은 `P1-02` 범위다.

## 2. 네 context의 상태·commit 소유권

| Context | 편집 대상 | 사용자 상태 | Commit role | 실제 효과 | Primary label |
|---|---|---|---|---|---|
| Public Plan | 공개 session Plan draft | `unsaved-public-draft` | `apply-public-draft` | 현재 session draft만 갱신 | `이 내용으로 적용` |
| Public Item | 공개 Plan draft 안의 Item | `pending-parent-apply` | `apply-item-to-parent-public-draft` | 부모 공개 Plan draft만 갱신 | `이 항목 저장` |
| Saved Plan | personal overlay draft | `saved-personal-copy` | `save-personal-overlay` | 최종 personal overlay를 원자 저장 | `저장` |
| Saved Item | 저장 Plan draft 안의 Item | `pending-saved-plan-save` | `apply-item-to-parent-personal-draft` | 부모 저장 Plan draft만 갱신 | `변경 저장` |

네 context는 [flow-editor-schema.ts](../../../lib/flow/flow-editor-schema.ts)의 한 schema와 [flow-editor-transaction.ts](../../../lib/flow/flow-editor-transaction.ts)의 한 event model을 사용한다. capability가 없는 field는 빈 입력을 꾸며내지 않고 제외하며, 완료 기준과 출처·안전은 이 단계에서 read-only로 보존한다.

## 3. 실제 변경

### 공통 surface와 controller

- [FlowEditorSurface.tsx](../../../components/flow/FlowEditorSurface.tsx)는 mobile/wide frame, sticky actions, error summary, discard confirmation, focus trap, scroll lock을 한 surface로 제공한다.
- [useFlowEditorController.ts](../../../components/flow/useFlowEditorController.ts)는 reducer effect, dirty close, retry, browser Back, exact focus/scroll return을 DOM lifecycle에 연결한다.
- [SavedFlowEditorSurface.tsx](../../../components/flow/SavedFlowEditorSurface.tsx)는 Saved Plan과 Saved Item이 같은 schema와 transaction을 사용하도록 연결한다.
- `AppClient.tsx`의 공개·저장 entry는 `editorTransaction=off`가 아닐 때 공통 surface를 사용한다.
- `FlowBottomSheet`의 close cause, active layer, zero-focusable trap을 보강해 겹쳐 열린 legacy detail과 공통 editor 사이의 focus·Escape 소유권을 고정했다.

### Saved writer와 복구

- [flow-editor-storage-transaction.ts](../../../lib/flow/flow-editor-storage-transaction.ts)는 target key의 exact pre-state, CAS, commit marker, rollback verification을 사용한다.
- 최종 Saved Plan commit만 target storage key를 쓰며 execution overlay는 건드리지 않는다.
- concurrent authoring 변경이 감지되면 덮어쓰지 않고 recoverable error로 남긴다.
- malformed recovery journal은 mutation 전에 거부하고 원문을 보존한다.
- commit marker가 완성된 journal은 이미 commit된 target bytes를 유지하고, 불완전 write만 target key 단위로 rollback한다.
- rollback exact verification을 보장할 수 없으면 `recovery-required`로 잠그고 추가 edit·retry·close를 막는다.

### Public·Saved 세부 parity

- Public Item의 invalid submit은 transaction validation을 통과해 실제 첫 오류 title로 focus한다.
- 다른 adjustment kind의 invalid target은 해당 kind로 먼저 전환한 뒤 focus한다.
- Saved routine Plan은 요일과 종료 조건을 표시하고 같은 최종 Save transaction으로 저장한다.
- 실행 진행 기록이 있는 Saved Plan의 anchor는 read-only로 잠근다.
- direct Saved quick-edit가 공통 editor 계약을 충족하지 못하면 parent editor를 잘못 연 뒤 실패시키지 않고 legacy 경로로 선회한다.
- source/safety와 completion criterion은 Public/Saved 양쪽에서 사라지지 않는다.

## 4. 닫기·Back·focus·오류 불변식

| 상황 | 보장 결과 |
|---|---|
| clean Cancel/X/backdrop/Escape/Back | 가장 안쪽 frame만 닫고 정확한 opener와 scroll로 복귀 |
| dirty-valid / dirty-invalid | `계속 수정 / 변경 버리기` 확인 전 draft 보존 |
| submitting | 중복 commit·편집·닫기 차단 |
| validation error | write 0회, draft 유지, 첫 오류 field focus |
| runtime/storage error | draft와 exact pre-state 유지, retry 가능 |
| concurrent Saved change | 기존 저장 bytes를 덮어쓰지 않고 recoverable error |
| rollback 검증 불가 | `recovery-required` hard stop |
| nested Item Apply | parent draft만 갱신하고 Item return point로 복귀 |
| nested Item discard | parent draft·route/query·scroll·focus를 변경 전과 같게 복구 |
| focusable control 0개인 recovery modal | dialog/error 영역 자체가 Tab trap 소유 |

각 opener에는 중복되지 않는 exact return token을 부여했다. body나 focus 불가능한 대상을 return target으로 채택하지 않으며, immediate `popstate` 뒤에도 fallback selector를 사용해 공개 Plan의 실제 edit button으로 돌아간다.

## 5. 저장·원본 불변식

- source/base mutation: `0`
- Public Plan/Item Apply 전 persistent storage write: `0`
- Saved Item Apply 시 persistent storage write: `0`
- Saved Plan 최종 commit의 target-key write: key별 `1회`
- execution overlay write: `0`
- stale/malformed journal을 flag-off 첫 render에서 자동 복구: `0`
- runtime/storage fault 뒤 성공으로 오인하는 partial commit: `0`
- retry 시 새 draft로 교체하거나 사용자 입력을 잃는 동작: `0`

`editorTransaction=off`는 공통 adapter와 recovery를 실행하지 않고 기존 P35 UI·handler·storage bytes를 사용한다. 이 비교는 legacy 전체 화면 pixel diff가 아니라 field-set/static assertion, legacy adapter E2E, stale-journal/storage no-touch 검증으로 고정했다.

## 6. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| Public/Saved Plan/Item이 한 editor family를 사용 | PASS | 네 context schema·surface component·runtime E2E |
| mobile full-height / wide inspector가 같은 payload·events 사용 | PASS | 390·1024·1440 증거와 공통 controller |
| main content와 하단 inline editor가 경쟁하지 않음 | PASS | 공통 overlay layer와 entry wiring |
| context별 primary commit action 1개 | PASS | schema role/label test와 DOM assertion |
| Public Apply는 session draft만 갱신 | PASS | storage byte no-change E2E |
| Saved Item은 parent draft만 갱신 | PASS | Item Apply 후 storage no-write, 최종 Plan Save 후 1회 commit |
| source/base·execution overlay 불변 | PASS | unit fault tests와 실제 localStorage injection |
| dirty close·Back·nested return 복구 | PASS | controller tests와 mobile/wide E2E |
| invalid/runtime/storage 오류에서 draft·retry 보존 | PASS | error injection과 exact-byte rollback/retry |
| 출처·안전·영구 손실 정보가 icon-only로 사라지지 않음 | PASS | Public/Saved DOM 및 screenshot |
| editor commit에 `완료` 미사용 | PASS | schema·surface copy assertion |
| 390px overflow·CTA 가림·focus trap 이탈 없음 | PASS | browser geometry/focus assertions와 증거 화면 |
| flag off가 legacy handler·storage를 보존 | PASS | off-path E2E와 stale-journal no-touch |

## 7. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| `npm.cmd exec -- tsc -p tsconfig.next.json --noEmit --pretty false` | PASS | TypeScript contract |
| `npm.cmd run test:p35-p0` | PASS · `226/226` | P0 contract, schema, transaction, writer, controller, surface |
| `npm.cmd test` | PASS · pretest `106/106` + P35 P0 `226/226` + remaining `603/603` = `935/935` | 전체 unit/workflow regression |
| `npm.cmd run build` | PASS · Next `15.5.21`, `18` routes | production compile·route generation |
| `p35-p0-editor-surface.spec.ts` | PASS · `10/10` | 네 context, 오류·retry, flag off, viewport evidence |
| `p35-adjust-one-kind.spec.ts` | PASS · `6/6` | 공개 adjustment kind·session Apply 회귀 |
| `p26-quick-advanced-editor.spec.ts` | PASS · `3/3` | 기존 quick editor·focus·Back 회귀 |
| focused Playwright 합계 | PASS · `19/19` | P0-06 영향 browser gate |
| console/page/request 검사 | PASS · 오류 `0` | focused evidence 경로; 의도된 request abort 제외 |
| `npm.cmd run docs:check` | PASS · `14` required files, `3,920` local links | 문서·로컬 링크 |
| `git diff --check` | PASS | whitespace/error 없음; Windows LF→CRLF 경고만 존재 |

전체 Playwright suite를 P0-06 closeout에서 새로 실행했다고 주장하지 않는다. 영향 범위 browser gate는 위의 순차 `19/19`이고, 전체 프로그램 E2E gate는 `P0-10`과 `P1-04`에 남아 있다.

## 8. 화면 증거와 시각 검토

증거 폴더: [evidence/p0-06/screenshots](./evidence/p0-06/screenshots/)

| Context | 390×844 | 1024 | 1440×1000 |
|---|---|---|---|
| Public Plan | [public-plan-390.png](./evidence/p0-06/screenshots/public-plan-390.png) | [public-plan-1024.png](./evidence/p0-06/screenshots/public-plan-1024.png) | [public-plan-1440.png](./evidence/p0-06/screenshots/public-plan-1440.png) |
| Public Item | [public-item-390.png](./evidence/p0-06/screenshots/public-item-390.png) | [public-item-1024.png](./evidence/p0-06/screenshots/public-item-1024.png) | [public-item-1440.png](./evidence/p0-06/screenshots/public-item-1440.png) |
| Saved Plan | [saved-plan-390.png](./evidence/p0-06/screenshots/saved-plan-390.png) | [saved-plan-1024.png](./evidence/p0-06/screenshots/saved-plan-1024.png) | [saved-plan-1440.png](./evidence/p0-06/screenshots/saved-plan-1440.png) |
| Saved Item | [saved-item-390.png](./evidence/p0-06/screenshots/saved-item-390.png) | [saved-item-1024.png](./evidence/p0-06/screenshots/saved-item-1024.png) | [saved-item-1440.png](./evidence/p0-06/screenshots/saved-item-1440.png) |

추가 긴 목록 증거: [public-plan-50-items-390.png](./evidence/p0-06/screenshots/public-plan-50-items-390.png)

직접 시각 검토한 `public-plan-390`, `saved-item-390`, `saved-plan-1440`, `public-plan-50-items-390`에서는 다음을 확인했다.

- mobile sheet와 wide inspector가 viewport 안에 머물고 수평 잘림이 없다.
- 하단 primary action이 스크롤 내용과 분리되어 보이며 underlying sheet가 pointer를 가로채지 않는다.
- 긴 한글 제목은 행 안에서 줄바꿈되고 include/reorder control과 겹치지 않는다.
- 출처 링크가 footer 위에서 사라지지 않는다.
- wide에서 배경 detail은 dim 처리되고 editor가 최상위 active layer가 된다.

첫 visual pass에서 `saved-item-390.png`가 최신 DOM과 맞지 않는 이전 capture로 남아 있음을 발견했다. 현재 코드에 닫기·취소·저장 control이 viewport 안에 있는지 좌표 assertion을 추가한 뒤 10/10 E2E로 재현 확인하고 전체 증거를 다시 생성했다. 현재 PNG에는 세 control과 상·하단 경계가 모두 보인다.

P0-06 blocker는 아니지만 다음 시각 감산·copy 단계에서 볼 항목도 남겼다. Public Plan의 선택 카드와 `이름` heading이 같은 정보를 반복하고 단일 field 상태의 빈 여백이 크며, wide inspector에도 mobile drag handle이 보인다. 이는 transaction·surface 일관성 문제가 아니라 `P1-01` 감산과 `P1-02` copy/composition 검토 대상으로 분리한다.

## 9. 24·50 Item 증거의 정확한 범위

- 실제 representative runtime 콘텐츠는 canonical moving personal copy의 `24` Items다.
- `50` Items는 실제 50-Item 공개 콘텐츠 route가 아니다.
- 50-Item 증거는 Saved Plan static React render와 public Plan browser DOM 합성 레이아웃 stress다.
- 따라서 이 증거는 긴 목록의 줄바꿈·스크롤·sticky action·overflow 안정성을 증명하지만, 실제 50-Item 콘텐츠의 저장·projection 의미를 증명하지 않는다.

## 10. 소유 파일과 기존 dirty 경계

이번 단계가 새로 만들거나 주로 소유한 경계:

- `components/flow/FlowEditorSurface.tsx`와 test
- `components/flow/SavedFlowEditorSurface.tsx`
- `components/flow/useFlowEditorController.ts`와 test
- `lib/flow/flow-editor-schema.ts`와 test
- `lib/flow/flow-editor-storage-transaction.ts`와 test
- `tests/e2e/p35-p0-editor-surface.spec.ts`
- `evidence/p0-06/screenshots/*`
- 이 closeout과 active ledger 갱신

공동 파일에서 P0-06이 소유하는 것은 해당 연결부만이다.

- `components/flow/AppClient.tsx`: Public/Saved editor entry, parent draft, final saved writer 연결부
- `components/flow/FlowExecutionPrimitives.tsx`: active layer·close cause·focus trap 보강부
- `components/flow/PublicFlowAdjustmentPanel.tsx`, `RoutineScheduleEditor.tsx`: 공통 editor parity에 필요한 entry/field 보강부
- `lib/flow/flow-editor-transaction.ts`, `lib/flow/p35-round2-flags.ts`: P0-05 계약의 P0-06 runtime 보강부
- `tests/e2e/p35-adjust-one-kind.spec.ts`, `tests/e2e/p26-quick-advanced-editor.spec.ts`: 변경된 공통 editor contract에 맞춘 회귀 assertion

worktree에는 P0-01~P0-05 변경과 별도 content-audit 산출물이 함께 있다. 이 closeout은 그 전체를 P0-06 소유라고 주장하지 않으며, 어떤 기존 dirty path도 삭제·정리·stage하지 않았다.

## 11. 제외·한계·rollback

이번 단계에서 하지 않은 것:

- capability별 Calendar/checklist/sheet/memo 실제 content preview와 action owner: `P0-07`
- 저장 계획 중심 일반 `/my` IA 재구성: `P0-08`
- 실제 artifact 생성·transfer·receipt와 Q1 quick-local guard: `P0-09`
- Item/Map/시작일 시각 감산: `P1-01`
- `Flow → 계획`, CTA, 도움·주의 전체 copy sweep: `P1-02`
- Flow Map editor migration, URL draft/noncanonical structural/occurrence editor 통합
- AI replan, text-to-flow, 실제 외부 Calendar/VTODO round-trip
- Claude/Codex 내부 검토를 실제 사용자 관찰로 집계하는 일

Map, URL draft, noncanonical structural/occurrence variants는 아직 legacy 경로이며 명시적인 rollback 대상이다. `editorTransaction=off`가 공통 editor 또는 recovery를 거치지 않고 기존 UI와 bytes를 보존하므로 P0-06을 독립적으로 끌 수 있다.

## 12. Publish·다음 gate

| 상태 | 결과 |
|---|---|
| Local edit | 있음 · P0-06 PASS |
| Commit | 없음 |
| Push | 안 함 |
| PR / CI | 안 함 / 미실행 |
| Merge | 안 함 |
| Preview / Production | 안 함 |
| 실제 관찰 사용자 | `0명` |

P0-06은 로컬에서 닫혔다. `P0-07`의 선행 조건은 충족했지만 strict-order 운영 규칙에 따라 이번 작업에서 자동으로 시작하거나 `IN_PROGRESS`로 표시하지 않는다.
