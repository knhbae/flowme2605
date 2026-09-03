# 통합 PoC 단계 1 작업 계약 — Canonical·저장·복구 기반

- 작성일: 2026-09-02
- 상태: 순수 모델·PoC store·adapter 검증 완료; 사용자 화면 연결은 [단계 3](./stage-3-contract.md) Chromium 13/13으로 후속 완료
- 대상 패키지: `A1`, `A3`의 모델·store, `A4`의 상태·receipt
- 대상 요구: `D1-001~006,011,012,017,018,025`, `D2-002,004,011~013,016,018,021,035,036,039,040,058`, `BP-032,033,038,059,060,062,063,080`
- 상위 결정: [A0 결정 기록](./a0-decision-record.md)

이 문서는 단계 1에서 구현할 임시 PoC 계약이다. 운영 schema, 영구 제품 정책,
운영 writer 개방을 승인하지 않는다. 모든 변경 가능한 값과 transaction 보조 key는
`flow:poc:personal-workspace:v1:*` 안에서만 존재한다.

## 1. 단계 결과물과 판정 순서

단계 1은 아래 순서로 닫는다.

1. 기획: 필드 owner, 날짜 의미, fidelity 처리, 편집·Undo 단위를 고정한다.
2. UX/디자인: 원본과 개인 변경을 구분하고 여섯 저장 상태, 오류 복구, focus 복귀를
   화면 계약으로 만든다.
3. 개발 설계: 기존 공통 Plan→Item editor에 PoC adapter를 붙이고, 저장·rollback과
   receipt 경계를 고정한다.
4. 구현: provenance, fidelity manifest, staged Plan apply, date restore, receipt,
   multi-key transaction을 순수 모델부터 추가한다.
5. 검증: 집중 unit·simulation·storage fault injection을 실행한 뒤 관련 추적 행만
   fresh evidence로 다시 판정한다.

다섯 번째 단계까지 2026-09-02에 완료했다. 다만 이 단계의 종료는 순수 모델·PoC
store·adapter가 닫혔다는 뜻이며, 실제 공통 editor와 receipt 화면까지 연결됐다는 뜻은
아니다. 그래서 화면 연결을 포함한 상위 요구는 `부분` 판정을 유지한다.

## 2. 필드 ownership matrix

| 계층 | 대표 값 | 읽기 owner | 이번 PoC에서 쓰기 owner | 규칙 |
| --- | --- | --- | --- | --- |
| source | 원본 Flow/Item 제목·설명·section·순서·날짜·anchor·출처 식별자 | 네 saved-plan origin adapter | 없음 | byte와 의미를 바꾸지 않는다. |
| imported personal baseline | 기존 운영 personal title·memo·날짜 override·구조 overlay | 기존 D1 projection adapter | 없음 | 현재 유효값을 읽되 source와 별도 provenance로 표시한다. |
| authoring source | `rawText`, document/revision/fingerprint, source line | Text Authoring draft | PoC authoring draft | 원문 byte가 단일 owner다. preview와 ghost는 파생 표현이다. |
| PoC personal plan | 개인 Flow/Item title·memo·plan schedule | PoC Plan draft | 최종 Plan apply 1회 | Item 적용은 메모리의 부모 Plan draft만 바꾼다. |
| organization | Folder와 Flow/QuickItem membership | PoC state | PoC transition | Flow Item은 부모 Flow 폴더를 상속하며 Item membership을 만들지 않는다. |
| execution | 실행 placement·기간 표시·목록 순서·완료 | PoC state | PoC transition | 원본 계획과 Flow 소속을 바꾸지 않는다. |
| creator/public/export | 검토 후보·공개 버전·운영 export | 이번 PoC owner 없음 | 없음 | route·command·writer를 만들지 않는다. |

### 2.1 read model 표현

기존 UI 호환용 `title`, `description`, `sourceDate`, `sourceOrder`, `anchorDate`는 당장
제거하지 않는다. 대신 각 Flow와 Item에 additive provenance를 둔다.

- `source`: 원본에서 직접 읽은 값과 source identity
- `existingPersonal`: 기존 운영 personal projection에서 읽은 override
- `effective`: source와 imported personal을 합친 읽기 전용 기준값
- `provenance`: 각 effective field가 어느 계층에서 왔는지

새 PoC 편집값은 read model에 섞지 않고 state의 personal plan overlay에서 합성한다.
`sourceDate`라는 호환 필드가 기존 personal override를 포함할 수 있다는 사실을
metadata로 드러내며, 새 코드에서는 `fieldOwnership.date.effectiveDate`를
사용한다. 기존 personal 일정 구조는 `existingPersonalSchedule`에 따로 남긴다.

## 3. 날짜 의미

날짜는 다음 네 계층을 순서대로 계산한다.

```text
source schedule (read-only)
  → imported personal plan schedule (read-only baseline)
  → PoC personal plan schedule (staged shadow edit)
  → execution placement (shadow runtime position)
```

### 3.1 personal plan schedule

- `inherit`: PoC plan override를 제거하고 imported personal baseline, 없으면 source를 따른다.
- `fixed_date`: PoC 개인 계획 날짜를 지정한다.
- `unscheduled`: PoC 개인 계획을 날짜 미정으로 둔다.

### 3.2 execution placement

- `inherit`: 현재 effective personal plan schedule을 따른다. canonical 저장 표현은
  schedule override 부재다. `timelinePolicy=auto`이고 별도 시간이 없으면 placement
  record 자체를 제거한다. 기간 표시 정책이나 실행 시간이 독립적으로 남아야 할 때만
  `scheduleMode=inherit` carrier record를 허용하며, 이는 날짜 override로 세지 않는다.
- `fixed_date`: 원본·계획과 독립된 개인 실행 위치를 지정한다.
- `unscheduled`: 개인 실행 위치만 날짜 미정으로 둔다.

날짜 picker에서 현재 effective 실행 날짜를 다시 고르면 no-op이다. `원래 날짜 따르기`는
별도 명시 action이며, fixed/unscheduled placement를 제거한다. fixed 날짜가 우연히
기준 날짜와 같더라도 `원래 날짜 따르기`는 향후 기준일 변경을 다시 따르게 하므로 실제
변경이다. no-op 판정은 caller가 넘긴 `currentDate`가 아니라 저장된 mode와 date로 한다.

`TimelineOrder`는 source order나 personal plan order를 덮어쓰지 않는다. 한 기간 화면의
실행 표시 순서만 소유한다.

## 4. authoring fidelity 처리

각 source line은 `line`, `rawLine`, `kind`, `owner`, `support`, `severity`, `reason`을 가진
`FidelityManifest` 행으로 분류한다.

| 입력 | rawText | 구조화 결과 | 저장 |
| --- | --- | --- | --- |
| 지원 title·root Item·절대 날짜 | byte 보존 | exact adapter | 허용 |
| 알 수 없는 property | byte 보존 | 임의 추정 금지 | 차단 |
| nested checklist | byte 보존 | 부모 Item에 합치지 않음 | 차단 |
| recurrence·recurrence end | byte 보존 | 실행 반복으로 위장하지 않음 | 차단 |
| time·timezone | byte 보존 | 실행 시간 owner가 생기기 전 평탄화 금지 | 차단 |
| table/source update/public 명령 | byte 보존 | 이번 PoC owner 없음 | 차단·보류 |
| 잘못된 날짜·빈 필수값 | byte 보존 | 수정 위치 제공 | 차단·수정 |

material blocker는 `lossAccepted`로 우회할 수 없다. `lossAccepted`는 향후 화면 표현만
달라지고 원문과 canonical 의미가 모두 남는 non-material downgrade에만 사용할 수 있으며,
이번 단계에서는 그런 항목을 새로 허용하지 않는다. 차단된 입력은 Flow identity, state,
storage write를 모두 0건으로 유지한다.

persisted authoring lineage에는 exact `rawText`, source fingerprint, document/revision,
source discriminator, source-line→Item mapping, blocking manifest가 함께 남는다. 기존 v1
payload를 읽기 위해 새 필드는 additive optional로 시작하되 새 commit은 이를 모두 쓴다.

## 5. Plan·Item 편집 단위

개발 1의 dirty checkout을 병합하지 않는다. 최신 main에 이미 동일하게 있는 아래 공통
엔진을 그대로 쓴다.

- `FlowEditorSession<PlanDraft, ItemDraft>`
- `createFlowEditorSession`, `reduceFlowEditorSession`
- `executeFlowEditorCommit`, `FlowEditorCommitHandlers`
- UI 단계의 `useFlowEditorController`

PoC adapter의 단계는 다음과 같다.

```text
open Plan
  → base state revision/raw fingerprint/source fingerprint 캡처
  → open Item
  → Item draft 편집
  → Item 적용: 부모 Plan draft만 변경, persistent write 0
  → Plan 최종 적용 preflight
  → 하나의 next state + 하나의 Undo snapshot
  → PoC state target write 1회
  → receipt
```

Plan draft는 source field를 수정할 수 없다. 여러 Item을 적용해도 final state revision은
한 번만 증가하고 Undo는 Plan을 열기 직전 전체 snapshot으로 돌아간다. 최종 적용 직전에
다음을 다시 검사한다.

- exact Flow/Item identity와 origin
- opened state revision과 state raw fingerprint
- source fingerprint
- 중복 Item ref와 다른 Flow의 Item 혼입
- unsupported fidelity blocker
- dirty/no-op 차이

stale·collision·invalid는 persistent write 0인 recoverable failure다. clean close, 취소,
Escape, backdrop, browser Back의 `버리기`도 write 0이다. browser Back의 `계속 편집`은
draft와 focus/scroll을 그대로 유지한다.

## 6. UX/디자인 계약

Item 편집 화면은 한 제목 아래에서 다음 두 block을 명확히 나눈다.

```text
┌ 원본 정보 · 읽기 전용 ───────────────────────┐
│ 원본 제목 / 원본 설명 / 원본 계획 날짜 / 출처 │
└──────────────────────────────────────────────┘
┌ 내 계획 · 편집 가능 ─────────────────────────┐
│ 개인 제목 / 메모 / 계획 날짜 3상태            │
│ 실행 위치는 별도 이동 메뉴에서 바꿈            │
└──────────────────────────────────────────────┘
```

- 색만으로 owner를 구분하지 않고 `원본 정보`, `내 계획`, `실행 위치`를 텍스트로 쓴다.
- 저장 버튼 바로 앞에 바뀌는 값과 영향 Item 수를 보여 준다.
- 날짜 변경은 `계획 날짜`인지 `이번 실행 위치`인지 문구에서 구분한다.
- source block의 control은 disabled input처럼 보이게 하지 않고 읽기 전용 definition
  block으로 표시해 편집 가능성 오해를 줄인다.

### 6.1 사용자에게 보이는 여섯 상태

| 상태 | 화면 문구 원칙 | write |
| --- | --- | ---: |
| `saving` | `변경 내용을 저장하는 중…`과 중복 제출 방지 | 진행 중 |
| `success` | 무엇이 전→후로 바뀌었는지, 영향 수, `되돌리기` | 성공 transaction만 |
| `noop` | `이미 같은 위치/내용입니다.` | 0 |
| `failure` | 실패 지점, 기존 상태 유지 여부, 같은 intent `다시 시도` | 최종 0 또는 복구 필요 |
| `canceled` | `변경을 취소했습니다.`; draft 폐기 여부 명시 | 0 |
| `undone` | 어느 성공 변경 전으로 돌아갔는지 | 성공 Undo transaction만 |

`retry`는 새 임의 action이 아니라 실패 receipt가 보존한 동일 intent를 다시 실행한다.
실패 시 draft를 유지하고 오류 summary로 focus한다. 취소·Escape 뒤에는 opener로 focus와
scroll을 복구한다. Item 적용 뒤에는 부모 Plan의 해당 Item 행으로 돌아간다.

## 7. receipt contract

구조화 receipt는 다음 필드를 가진다.

- `receiptId`, `intentId`, `operation`, `status`, `createdAt`
- `scopeRef`, `affectedRefs`, `affectedCount`
- `stateRevisionBefore`, `stateRevisionAfter`
- `changes[]`: field owner, label, before, after
- `targetWriteCount`, `supportWriteCount`
- `rollback`: `not-needed | complete | recovery-required`
- 성공 시 `undoLabel`, 실패 시 serializable `retryIntent`와 `errorCode`

`saving`, `noop`, `failure`, `canceled`는 controller 상태이며 저장하지 않는다. 마지막
`success` 또는 `undone` receipt만 PoC state에 선택적으로 남겨 reload 뒤 설명할 수 있다.
receipt에는 operating payload나 민감한 원문 전체를 복제하지 않는다.

## 8. 저장·rollback 계약

공통 storage transaction을 쓰더라도 기본 journal/marker key와 전체 storage rollback은
금지한다. 아래 값을 호출부가 항상 명시한다.

```text
journal       flow:poc:personal-workspace:v1:editor-storage-recovery:v1
commit marker flow:poc:personal-workspace:v1:editor-storage-commit-marker:v1
target        flow:poc:personal-workspace:v1:state
optional      flow:poc:personal-workspace:v1:authoring-draft
```

- transaction 시작 시 target key의 존재 여부와 raw byte를 캡처한다.
- state write 뒤 검증 실패, draft remove 실패, marker/journal 정리 실패를 각각 주입해
  이전 bytes를 정확히 복구한다.
- rollback이 완전하지 않으면 성공을 표시하지 않고 `recovery-required`로 끝낸다.
- 복구도 위 target key만 만진다. storage 열거 후 다른 key를 정리하지 않는다.
- `clear()`는 어떤 경로에서도 호출하지 않는다.
- authoring handoff를 Undo할 때는 이전 state와 exact draft bytes가 함께 돌아와야 한다.
  이를 보장하기 전에는 commit 뒤 draft를 영구 삭제한 것으로 간주하지 않는다.

지원용 journal/marker write 수와 제품 target write 수는 테스트·receipt에서 따로 센다.
`Plan 최종 적용 1회`는 state target write가 한 번이라는 뜻이다.

## 9. 단계 1 acceptance

### 기획·UX

- ownership matrix의 모든 mutable field는 정확히 한 owner를 가진다.
- 원본/개인 계획/실행 위치가 화면 문구와 receipt에서 섞이지 않는다.
- 여섯 상태, retry, dirty guard, focus/scroll 복귀가 결정 표와 wireflow에 있다.

### 순수 모델

- 네 origin 모두 source/imported-personal/effective provenance를 보존한다.
- `savedCopyId + flowId + itemId` 충돌은 fail-closed한다.
- 원래 날짜 복구는 execution placement를 제거하고 source/plan 값은 바꾸지 않는다.
- source order, personal plan order, timeline order가 독립적이다.
- unknown·nested·recurrence·time/timezone은 정확한 line/raw text를 남기고 commit을 차단한다.

### staged editor

- Item 적용 전후 persistent state raw byte와 storage 호출은 0건이다.
- 여러 Item 변경 뒤 Plan 적용은 revision·Undo·state target write가 각각 1회다.
- clean/no-op/cancel/Escape/backdrop/Back/stale/collision/invalid는 target write 0건이다.
- 실패 retry는 동일 intent이며 draft와 return point를 보존한다.

### storage

- 두 번째 target operation과 검증·정리 실패에서 이전 raw bytes를 복구한다.
- 불완전 rollback은 `recovery-required`이며 성공 receipt를 만들지 않는다.
- 성공·실패·복구 전후 operating `flow:*` sentinel은 byte-for-byte 동일하다.
- 모든 `setItem`, `removeItem`은 허용 prefix 안이고 `clear`는 0건이다.

### 단계 Exit

- 관련 집중 테스트와 기존 개인공간 회귀가 모두 통과한다.
- silent material loss와 partial save가 0건이다.
- 관련 primary·bridge·subcheck 행을 실제 새 증거만으로 갱신한다.
- 자동 테스트, 브라우저, 실제 기기, 관찰 사용자, publish 상태를 서로 대체하지 않는다.

## 10. 구현 결과

- 네 saved-plan origin을 `source`, `existingPersonal`, `effective`, `provenance`로 나누고
  `savedCopyId + flowId + itemId` identity 충돌을 fail-closed했다.
- 개인 title·memo·plan schedule을 `PersonalPlanOverlay`로 분리하고 source order,
  personal plan order, execution `TimelineOrder`가 서로 덮어쓰지 않게 했다.
- unknown property, nested checklist, recurrence, time/timezone, table/source/public 명령을
  line·raw byte 단위 fidelity manifest로 보존했다. material blocker는 저장을 막으며
  `lossAccepted`나 손상된 manifest로 우회할 수 없다.
- 공통 `FlowEditorSession` 위에 PoC Plan→Item adapter를 붙였다. Item 적용은 부모 draft만
  바꾸고, 최종 Plan 적용만 revision·Undo snapshot·state target write를 각각 한 번 만든다.
- `saving`, `success`, `noop`, `failure`, `canceled`, `undone` receipt와 동일 intent
  `retryIntent`를 순수 모델로 구현했다.
- state와 authoring draft를 PoC 전용 journal·marker로 묶었다. late failure에서는 이전
  raw bytes를 복구하며, authoring handoff Undo는 draft의 exact bytes까지 함께 되돌린다.
- execution `fixed_date`·`unscheduled`에서 `원래 계획 날짜 따르기`로 돌아가는 transition을
  추가했다. source schedule과 Flow 소속은 바뀌지 않는다.

## 11. 검증 근거

| 범위 | 실제 결과 | 확인한 내용 |
| --- | ---: | --- |
| PoC 모델·component package | 168/168 PASS | provenance, fidelity, authoring, staged editor, composition, state, storage, receipt, route contract |
| 공통 editor transaction 결합 회귀 | 197/197 PASS | 기존 editor engine과 PoC adapter·fidelity·state·storage의 결합 |
| Stage 1 browser runtime | 4/4 PASS | exact gate, stale source write 0, atomic handoff, Undo·reload exact draft 복구, corrupt recovery fail-closed, 390×844·1440×900 overflow/error 0 |
| production build | PASS · 18 pages | compile, typecheck, static page generation |
| 저장 경계 | PASS | PoC prefix 밖 set/remove 0, `clear()` 0, operating sentinel byte 변화 0 |

위 자동화는 실제 Android Chrome, iOS Safari, screen reader, 200% 확대, 관찰 사용자 검증을
대신하지 않는다. 이 단계에서는 해당 검사를 실행하지 않았다.

추적 판정은 단계 1 대상 parent 32개를 `충족 2 · 부분 25 · 미충족 2 · 의도적 변경 2 ·
제외 1`, compound subcheck 77개를 `충족 31 · 부분 31 · 미충족 9 · 제외 6`으로 갱신했다.
순수 모델이 있어도 화면에 연결되지 않은 parent는 `부분`으로 남겼다.

## 12. 단계 3으로 넘긴 범위

- 네 origin의 실제 opener와 기존 공통 Plan·Item editor UI 연결
- source read-only block, personal edit block, 계획 날짜 3상태와 impact summary 렌더링
- dirty Escape·Back·backdrop, 정확한 opener focus와 scroll 복귀의 브라우저 검증
- receipt의 before→after 값, affected count, failure retry, Undo 복구값 표시
- Flow/Item memo와 authoring-owned section의 제한된 개인 편집
- Text·Todo·Calendar·TXT가 같은 effective ref를 읽는 결과 화면 회귀

source reverse edit, 운영 saved-plan writer, trash/archive, export는 이 목록에 몰래 포함하지
않는다. 각각 A0에서 정한 owner·승인 경계를 따른다.

## 13. 보류·재검토

- 운영 saved-plan writer, `/calendar`, trash/archive, export
- CreatorDraft library·search·duplicate·archive
- recurrence 실행 엔진, public S3, table/source update
- 영구 design token·global shell 변경

위 항목은 owner, migration, rollback, 별도 acceptance가 승인될 때 다시 연다.
