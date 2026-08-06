# P0-03 Item 완료 기준 UI/checklist payload parity closeout

**판정:** `PASS`
**기준 ref:** `91fb66af063f7041f9442a9dfeb66f9a3e78d723`를 조상으로 둔 local working tree
**실행일:** 2026-08-04 KST
**변경 경계:** Item 완료 기준 정규화·저장 Item 상세·portable checklist/list payload·영향 E2E·단계 장부
**Publish:** commit/push/PR/CI/merge/Preview/Production 모두 미실행
**실제 관찰 사용자:** `0명`

## 1. 사용자 결과

저장한 계획의 Item 상세에서 보이는 완료 기준이 이제 같은 Item의 메모 복사, 체크리스트, 시트 행, Calendar 파일에 손상 없이 남는다. `전체 계획`과 `직접 선택` 체크리스트도 같은 기준과 순서를 사용한다.

완료 기준은 실행 완료 여부와 합치지 않았다. 체크리스트의 `[ ]`/`[x]`와 `실행 상태`는 실행 상태를 나타내고, `완료 기준`은 독립 라벨로 유지한다. 개인 메모, 내보낼 수 있는 실행 메모, 항목 주의, 계획 주의, 자료, 원문도 서로 다른 라벨로 직렬화한다.

## 2. 재현한 원인과 before/after

기존 `AppClient`는 완료 기준을 체크리스트에 포함한다고 설명했지만, `buildMyFlowStepChecklistText`는 해당 field를 직렬화하지 않았다. 전체/선택 체크리스트 행 type에도 완료 기준이 없었다.

| 지점 | Before | After |
|---|---|---|
| 저장 Item 상세 | 완료 기준 본문이 보이지 않음 | 실제 완료 기준을 한 번 표시 |
| Item 체크리스트 | 설명은 포함을 약속하지만 payload에서 누락 | 독립 `완료 기준` 라벨로 포함 |
| 전체/선택 체크리스트 | 완료 상태·메모만 포함 | 완료 상태·기준·메모·주의·자료·원문을 분리 |
| empty/generic 기준 | consumer별 처리 차이 가능 | 공통 정규화로 라벨과 값 모두 생략 |
| 긴/여러 줄 기준 | 명시적 golden 없음 | LF·빈 줄·한국어·특수문자 보존 fixture |
| Today/Todo | 별도 증거 없음 | 기준 유무가 membership·완료 상태를 바꾸지 않음 |
| private/source-correction note | 정적 음성 assertion만 존재 | 실제 local note를 넣고 모든 영향 결과에서 미포함 확인 |

최초 RED는 targeted 33개 중 1개가 실패했고, 실패 이유는 `완료 기준:`이 Item checklist에 없기 때문이었다.

## 3. 완료 기준 field 계약

[completion-criterion.ts](../../../lib/flow/completion-criterion.ts)가 다음 규칙을 한 곳에서 소유한다.

- CRLF와 CR은 LF로 정규화한다.
- 앞뒤 공백은 제거하되 내부 줄바꿈·빈 줄·특수문자는 보존한다.
- 빈 값과 legacy generic 문장 `이 항목을 완료했어요.`는 실제 기준으로 표시하거나 내보내지 않는다.
- 값이 있으면 `완료 기준`이라는 독립 field로 직렬화한다.

저장 Item 상세와 Item/전체/선택 checklist가 이 계약을 공유한다. Item Sheet도 같은 generic 생략 규칙을 사용한다.

## 4. field 분리와 privacy 경계

Item checklist는 다음을 독립적으로 기록한다.

- 설명
- 실행 상태와 확인 항목 checkbox
- 완료 기준
- 개인 메모
- export 가능한 legacy 실행 메모
- 항목 주의와 계획 주의
- 자료 label/URL
- canonical Flow 원문

`flow:my-flow:execution-notes:*`의 private note와 source-correction note, 완료된 run의 history-only 기록은 일반 결과에 넣지 않는다. E2E는 실제 private/source-correction sentinel을 저장한 뒤 메모·체크리스트·시트·ICS 모두에서 누락됨을 확인했다. history-only 경계는 `item-memo-facade.test.ts`가 검증한다.

## 5. 화면·clipboard·file 비교

같은 `이사할 집 하자 점검하기` fixture의 완료 기준을 다음 consumer에서 exact text로 비교했다.

| Consumer | 결과 |
|---|---|
| 저장 Item 상세 | exact criterion 표시 |
| Item memo clipboard | exact criterion 포함 |
| Item checklist clipboard | exact criterion·`실행 상태: 미완료` 분리 |
| Item sheet clipboard | exact criterion 전용 열 포함 |
| Item ICS file | unfolded DESCRIPTION에 exact criterion 포함 |
| 전체 checklist clipboard | 첫 Item과 마지막 Item criterion 포함 |
| 선택 checklist clipboard | 선택한 2개만 포함, 선택하지 않은 세 번째 criterion 제외 |
| 전체 ICS file | 실제 VEVENT 수와 criterion 본문 확인 |

## 6. Acceptance 판정

| Criterion | 판정 | 근거 |
|---|---|---|
| 기준이 있는 Item은 UI와 payload에 동일하게 존재 | PASS | 저장 상세·memo/checklist/sheet/ICS exact text E2E |
| 기준이 없는 Item에는 빈 라벨이 없음 | PASS | undefined·empty·whitespace·generic golden |
| 긴 한국어·줄바꿈·특수문자가 손상되지 않음 | PASS | long/multiline/special-character contract test |
| 실행 완료 상태를 기준 텍스트로 합치지 않음 | PASS | `[ ]`/`[x]`, `실행 상태`, `완료 기준` 별도 assertion |
| Today/Todo와 portable checklist가 분리됨 | PASS | criterion fixture가 grouping·completed 값을 바꾸지 않음 |
| memo·warning/resource·source가 기준과 분리됨 | PASS | Item·list checklist field별 golden |
| private/correction/history note가 일반 export에 섞이지 않음 | PASS | runtime sentinel E2E + memo facade unit |

## 7. 검증

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| P0-03 targeted tests | PASS · 38/38 | criterion contract, Item/전체/선택 payload, Today/Todo, scope |
| 영향 export tests | PASS · 36/36 | 기존 text/workbook/ICS 회귀 |
| `npm.cmd run test:p35-p0` | PASS · 53/53 | P35 P0 snapshot/export/entry/memo/Map 계약 |
| `npm.cmd test` | PASS · pretest 106/106 + test 601/601 | 전체 unit/workflow 회귀 |
| `npm.cmd run build` | PASS · Next 15.5.21, 18/18 pages | production compile·type gate |
| P0-03 Playwright | PASS · 2/2 | Item·전체·선택 UI/clipboard/file와 privacy |
| `npm.cmd run docs:check` | PASS | 단계 문서·로컬 링크·형식 |
| `git diff --check` | PASS | whitespace/error 없음 |

## 8. 소유 파일과 기존 dirty 경계

이번 단계가 소유한 코드·테스트:

- `components/flow/AppClient.tsx`
- `lib/flow/completion-criterion.ts`
- `lib/flow/export.ts`
- `lib/flow/my-flow-step-export.ts`
- `lib/flow/personal-structural-list-export.ts`
- `lib/flow/my-flow-step-export.test.ts`
- `lib/flow/my-flow-cross-flow-todo.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `tests/e2e/p35-export-scope-first.spec.ts`
- 이 closeout과 active spec의 P0-03 ledger

P0-01·P0-02 소유 변경과 시작 전 dirty였던 `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/specs/README.md`, `docs/content-audit/2026-08-03-*`는 삭제·정리·stage하지 않았다.

## 9. Rollback·제외·다음 gate

- rollback 단위: 위 P0-03 code/test 파일과 P0-03 ledger. storage migration은 없다.
- 전체 export preview/confirmation/persistent receipt와 모든 형식의 parser round-trip은 P1-03 범위다.
- remote Todo provider와 전체 export UI 재설계는 수행하지 않았다.
- Local edit: 있음
- Commit/Push/PR/CI/Merge/Preview/Production: 모두 없음
- 자동·브라우저 내부 검증: 완료
- 실제 사용자 관찰: `0명`
- 다음 strict-order gate: **P0-04 lifecycle reducer·atomic save·selected plan direct handoff**
