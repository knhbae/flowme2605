# FlowMe 통합 PoC 격차 해소 기술 설계 v1

**상태:** 로컬 격리 PoC 설계 / 4차 A9 safe slice·A0 작업 결정 완료 / 미게시

**대상 결과물:** 개인공간 v4.1, 개발 1의 네 saved-plan origin 편집·lifecycle 결과, 개발 2의 Text Authoring·CreatorDraft 결과

**기준일:** 2026-09-02

## 1. 목적

세 결과물을 한 화면에 나열하는 데 그치지 않고, 사용자가 `작성 → 명시적 Flow 생성 → 개인공간 배치·실행 → 다시 보기`를 한 제품 흐름으로 조작할 수 있는 통합 PoC를 만든다. 통합 과정에서도 기존 `/my`, 네 saved-plan origin의 원본, 운영 저장소와 writer는 변경하지 않는다.

이 문서는 다음 두 종류의 작업을 분리한다.

- 제품 결정 없이 진행해도 되는 안전성·접근성·상호작용 수렴 작업
- 저장 책임, lifecycle, shell, authoring 단계처럼 A0 작업 결정에 따라 구현할 작업

A0는 `a0-decision-record.md`에서 종료했다. 이후 설계는 Personal Flow handoff,
read-only operating projection, PoC shadow staged command, production global shell과
scoped teal workspace, 한 text editor, advanced fidelity fail-closed, React product
authority/standalone offline fixture라는 계약을 따른다. 이 계약은 운영 writer나 영구
schema를 승인하지 않는다.

## 2. 변경할 수 없는 기술 불변식

| 경계 | 고정 규칙 | 위반 시 동작 |
| --- | --- | --- |
| 진입 | `/my?personalWorkspacePoc=v1`만 허용한다. query key가 추가·반복되거나 값이 다르면 허용하지 않는다. | 기존 `/my`로 fail-closed하며 PoC 쓰기는 0건이다. |
| 운영 원본 | `source-backed-map`, `personal-draft`, `canonical-personal-copy`, `legacy-saved-plan`은 읽기·투영만 한다. | 지원하지 않는 origin 또는 해석 불가능한 record는 해당 PoC를 열지 않는다. |
| 저장 | 쓰기·삭제는 `flow:poc:personal-workspace:v1:*`에만 허용한다. | prefix 밖 요청은 저장 gateway에서 거부한다. |
| 초기화 | `localStorage.clear()`를 호출하지 않는다. 정확한 PoC prefix key만 열거하고 제거한다. | 제거·검증 실패 시 이전 byte를 복원하고 실패 receipt를 낸다. |
| 정체성 | Flow는 `savedCopyId + flowId`, Item은 `savedCopyId + flowId + itemId`로 식별한다. | 중복 Flow·Item identity는 합치거나 덮어쓰지 않고 fail-closed한다. |
| 개인 변경 | 폴더, 실행 날짜, 기간 노출, 순서, 완료, 빠른 할 일, Undo는 shadow state에만 둔다. | 원본 일정·Flow 소속·source byte는 바뀌지 않는다. |
| 폴더 | Flow Item은 부모 Flow의 폴더를 상속한다. 직접 Item-folder membership을 만들지 않는다. | 잘못된 membership payload는 유효 상태로 받아들이지 않는다. |
| 날짜 | Item 날짜 이동은 `ExecutionPlacement`만 바꾼다. 원본 일정과 Flow 소속은 유지한다. | source model을 다시 쓰는 transition은 제공하지 않는다. |
| 게시 | commit, push, PR, Preview, Production, 운영 migration은 이 설계 범위가 아니다. | 별도 승인 전 실행하지 않는다. |

## 3. 계층과 데이터 흐름

```text
[운영 saved-plan records 4종]
              │ read only
              ▼
[origin 분류 + source adapter] ──> [immutable base read model]
                                             │
[PoC authoring handoff] ── shadow only ──────┤ collision 검사
                                             ▼
                                  [composed read model]
                                             │
                               +-------------+-------------+
                               │                           │
                       [view projection]            [pure transition]
                               │                           │
                         React / HTML UI      validate → PoC save → receipt
                                                           │
                                                           ▼
                                              [versioned shadow state]
```

계층별 책임은 다음처럼 고정한다.

1. **Source plane**은 운영 record를 읽고 origin과 capability를 판별한다. write method를 노출하지 않는다.
2. **Read-model plane**은 네 origin을 공통 Flow·Item 모양으로 lossless 투영한다. source record 자체를 공통 schema로 migration하지 않는다.
3. **Shadow-state plane**은 PoC에서 바뀌는 개인 실행 값만 versioned snapshot으로 보관한다.
4. **Transition plane**은 UI 종류와 무관한 단일 command 집합으로 다음 상태를 계산한다.
5. **Persistence plane**은 허용 prefix, payload validation, write verification, rollback을 소유한다.
6. **Presentation plane**은 v4.1 개인공간, Text Authoring, 상세 no-write projection을 연결하되 source·storage를 직접 호출하지 않는다.

## 4. Source, read model, shadow state 경계

### 4.1 네 saved-plan origin

각 origin adapter는 `classify(record)`와 `project(record)`만 제공한다. 결과는 다음 공통 identity를 가져야 한다.

```ts
type ProjectedFlow = {
  ref: `saved-flow:${string}:${string}`;
  savedCopyId: string;
  flowId: string;
  origin:
    | 'source-backed-map'
    | 'personal-draft'
    | 'canonical-personal-copy'
    | 'legacy-saved-plan';
  items: Array<{
    ref: `flow-item:${string}:${string}:${string}`;
    savedCopyId: string;
    flowId: string;
    itemId: string;
  }>;
};
```

- adapter는 origin 고유 필드를 삭제하거나 다른 origin으로 승격하지 않는다.
- Map을 한 Flow로 합치지 않고, personal draft를 canonical copy로 암묵 변환하지 않는다.
- 같은 제목·slug·Item 이름은 중복 판정 기준이 아니다. 오직 stable identity tuple을 쓴다.
- 원본에 identity를 안전하게 만들 정보가 없으면 임의 ID를 발급하지 않고 unsupported로 닫는다.

### 4.2 immutable read model

base read model은 `version: 1`과 Flow 배열로 구성하며 렌더링 과정에서 수정하지 않는다. `authoring-handoff` origin은 네 운영 origin과 별개인 PoC 소유 결과다. composition은 다음 충돌을 먼저 검사한다.

- base Flow와 authored Flow의 `flow.ref` 중복
- base Item과 authored Item의 `item.ref` 중복
- authored Flow끼리 `handoffId` 중복

하나라도 중복되면 shadow 값으로 source를 덮지 않고 composition 전체를 실패시킨다.

### 4.3 shadow state

versioned shadow state에는 아래 값만 둔다.

- `Folder`, `FolderMembership(saved_flow | quick_item)`
- `QuickItem(status/completedAt)`
- `ExecutionPlacement(scheduleMode/date/time/timelinePolicy)`
- `TimelineOrder(context/contextKey/orderedRefKeys/revision)`
- `Completion`
- PoC 소유 `authoredFlows`, `authoringReceipts`
- 성공한 직전 변경 1건의 `UndoSnapshot`

`Flow Item`은 membership 대상이 아니다. Flow 이동 결과는 부모 Flow membership 한 건으로 표현하고 Item의 실행 위치는 placement에서만 다룬다. 이 구분 덕분에 개인공간에서 날짜를 옮겨도 원본 일정과 Flow 소속이 그대로 남는다.

## 5. Exact gate, 저장 gateway, fail-closed

### 5.1 route gate

route는 search params의 key 수가 정확히 1이고, 그 key/value가 `personalWorkspacePoc=v1`일 때만 PoC를 mount한다. 다음은 모두 기존 `/my`를 렌더링한다.

- query가 없거나 값이 다른 경우
- query key가 하나 더 있는 경우
- 같은 key가 반복된 경우
- unsupported origin이 포함된 경우
- read-model identity가 충돌하는 경우
- state 또는 authoring draft payload가 손상된 경우

fail-closed 과정에서 자동 repair, schema upgrade, key 삭제, source write를 하지 않는다.

### 5.2 저장 transaction

저장 gateway는 `getItem`, `setItem`, `removeItem`만 주입받고 모든 target key를 prefix allow-list로 검사한다. 한 번의 성공 저장은 다음 순서를 따른다.

1. transition 결과 state를 schema로 검증한다.
2. target key와 직전 byte를 읽는다.
3. 새 JSON byte를 쓴다.
4. 다시 읽어 요청 byte와 동일한지 검증한다.
5. 검증 성공 뒤에만 UI의 committed state와 성공 receipt를 갱신한다.

쓰기 또는 검증이 실패하면 직전 byte를 복구한다. 복구 실패까지 별도 상태로 기록하되 다른 key로 우회 저장하지 않는다. reset은 현재 storage의 key를 열거해 정확한 prefix key만 snapshot·삭제·검증하고, 실패 시 같은 방식으로 rollback한다.

## 6. 한 transition으로 수렴하는 상호작용

UI는 storage를 직접 바꾸지 않고 먼저 의미 intent를 만든다.

| 사용자 경로 | 공통 intent | 순수 transition |
| --- | --- | --- |
| drag, handle 길게 누르기, `…` 메뉴, 키보드 이동 | `MoveIntent(targetKind, targetRef, destination)` | `move-folder`, `move-date`, `reorder` 중 하나 |
| 완료 checkbox, 상세 완료 action | `CompletionIntent(itemRef, completed)` | `complete` |
| 빠른 할 일 작성 | `CreateQuickItemIntent` | `create-quick-item` |
| 날짜 자동 노출 숨김·다시 표시 | `TimelinePolicyIntent` | `set-timeline-policy` |
| 되돌리기 | `UndoIntent` | `undo` |

intent adapter는 destination과 현재 위치를 먼저 비교한다. 같은 위치, 취소, Escape, pointer cancel, 저장 실패는 `changed: false` 또는 commit 실패로 끝나며 state revision·Undo·storage mutation을 증가시키지 않는다.

### 6.1 pointer state machine

standalone과 React surface는 같은 상호작용 계약을 구현한다.

```text
idle ─pointerdown(handle)─> armed
armed ─350ms, 이동 < 8px─> move-open
armed ─짧은 pointerup─> click-open
armed ─이동 >= 8px─> cancelled
armed/move-open ─pointercancel|pointerleave|blur|resize─> cancelled
cancelled ─synthetic click 1회─> suppressed ─> idle
```

- 타이머와 pointer capture는 종료 경로마다 정리한다.
- 8px 판정은 x/y 각각이 아니라 시작점부터의 거리로 계산한다.
- 취소 직후 브라우저가 합성한 click 한 번만 막고, 이후 실제 click은 다시 동작해야 한다.
- pointer gesture는 이동 UI를 여는 장치일 뿐이며 실제 변경은 사용자가 destination을 확정한 뒤 공통 transition이 수행한다.

## 7. Undo와 저장 receipt

### 7.1 Undo

- `changed: true`인 transition만 변경 직전 snapshot을 Undo 한 칸에 저장한다.
- no-op, 취소, 같은 위치, validation 실패는 기존 Undo를 덮지 않는다.
- Undo도 다른 command와 같은 저장 transaction을 거친다.
- Undo 저장이 실패하면 화면과 persisted state 모두 Undo 실행 전 상태를 유지한다.
- PoC의 임시 기본값은 Undo depth 1이며 운영 정책으로 승격하지 않는다.

### 7.2 receipt 상태

화면 receipt는 persistence schema가 아니라 application controller의 명시적 상태다.

```ts
type MutationReceipt =
  | { status: 'saving'; transition: string }
  | { status: 'saved'; transition: string; revision: number }
  | { status: 'same'; transition: string }
  | { status: 'cancelled'; transition?: string }
  | { status: 'failed'; transition: string; error: string };
```

`saved`만 성공 변경 건수를 늘린다. `same`, `cancelled`, `failed`는 0건이다. authoring materialization은 추적 가능한 `handoffId`, `flowRef`, `committedAt`을 shadow state의 authoring receipt로 별도 남긴다. 일반 UI 알림과 authoring lineage 증거를 같은 것으로 취급하지 않는다.

## 8. Text Authoring: staged draft와 명시적 materialization

Text Authoring은 빈 문서와 자연스러운 메모 작성을 기본으로 유지한다. Flow 해석은 사용자가 확인한 뒤에만 일어난다.

1. **Draft:** `rawText`와 선택한 template ID만 PoC authoring-draft key에 저장한다. 선택만으로 source text를 만들지 않는다.
2. **Template help:** 예시 source는 미리보기/ghost로 보여 준다. `틀 넣기` 같은 명시 action만 scaffold byte를 `rawText`에 넣을 수 있고, 이 변경도 Undo·취소 가능해야 한다.
3. **Parse preview:** parser는 `rawText`를 읽어 title, anchor, Item, date·repeat·resource를 제안한다. preview는 source를 수정하지 않는다.
4. **Optional structure review:** 구조 확인 화면은 도움 경로이며 현재 단계에서 강제 3-step 제품 정책으로 굳히지 않는다.
5. **Explicit materialization:** 사용자가 source를 확인하고 `commit-authoring-handoff`를 실행할 때만 authored Flow를 shadow state에 추가한다.

materialization은 `sourceConfirmed`, blocking issue 0건, loss field 0건 또는 명시적 loss acceptance, identity collision 0건을 모두 만족해야 한다. 결과에는 exact `rawText`, source fingerprint, document/revision/parse/snapshot identity를 lineage로 남긴다. 원문은 구조화 결과로 대체하거나 삭제하지 않는다.

## 9. Adapter 경계

| adapter/port | 허용 책임 | 금지 책임 |
| --- | --- | --- |
| `SavedPlanReadAdapter` | origin 판별, stable identity와 source field 투영 | 운영 writer 호출, migration, origin 승격 |
| `AuthoringParser` | raw text의 deterministic parse와 issue 반환 | source 자동 수정, implicit Flow 생성 |
| `ReadModelComposer` | base + PoC-authored Flow 결합, 충돌 검사 | shadow 우선 덮어쓰기 |
| `ViewProjector` | 폴더·오늘·주간·월간·미정 view 계산 | state 또는 source 직접 변경 |
| `TransitionReducer` | state + command → result 계산 | storage, DOM, 시간 조회 직접 수행 |
| `PocStorageGateway` | prefix 검사, validation, write verification, rollback | `clear`, prefix 밖 쓰기·삭제 |
| `NoWriteDetailAdapter` | 가능한 경우 기존 상세 화면에 source-backed projection 전달 | 기존 완료·메모·날짜·보관 writer 연결 |
| 향후 Text/Todo/Calendar adapter | 승인된 projection contract로 출력값 계산 | A0 결정 전 실제 운영 export/calendar 저장 |

`now`, ID, storage는 모두 경계에서 주입한다. reducer와 projector는 같은 입력에 같은 결과를 내야 하며 React와 standalone 구현은 이 모델을 공유하거나 동일 fixture로 계약을 검증한다.

## 10. 단계별 implementation seam

각 단계는 `기획 판정 → UX/디자인 계약 → 기술 설계 → 구현 → 자동 테스트 → 브라우저 평가 → 증거 반영` 순으로 닫는다. 앞 단계의 exit condition을 충족하지 못하면 다음 단계에서 그 경계를 우회하지 않는다.

| 단계 | package | 구현 seam | exit condition |
| --- | --- | --- | --- |
| 0 | A0 | 저장 owner, authoring 단계, lifecycle, shell·IA, 실제 adapter 범위를 결정 기록으로 고정 | 미결정 항목과 금지 구현 목록이 분리됨 |
| 1 | A1 + 현재 안전성 batch | source byte·identity 불변식, gate/prefix 계측, pointer cancellation, safe area, 접근성, state simulation | 운영 key byte 동일, 취소 mutation 0, batch focused gate 통과 |
| 2 | A2 + A3 | 네 origin 공통 entry/read model, 공통 Plan·Item staged draft seam | lossless fixture와 origin별 capability test 통과 |
| 3 | A4 + A5 + A6 + A7 | saving/error/Undo receipt, Text/Todo/Calendar projection, one-editor 흐름, template/ghost/materialization transaction | source 보존 및 명시 commit E2E 통과 |
| 4 | A8 + A9 | drag/menu/keyboard convergence, 폴더·오늘·기간 화면, shell responsive/accessibility | 5개 viewport, keyboard/non-drag, overflow·console gate 통과 |
| 5 | A10 + A11 | 승인된 고급 fidelity와 origin/CreatorDraft lifecycle adapter | A0 승인 capability만 구현되고 운영 writer 회귀 통과 |
| 6 | A12 | 세 결과물 requirement trace, 시나리오 판정, 남은 의사결정과 게시 상태 closeout | 자동화·기기·사용자 증거가 분리된 최종 보고서 |

## 11. 1차 안전성 batch의 정확한 범위

이번 batch는 제품 정책과 운영 adapter를 정하지 않고도 닫을 수 있는 상호작용·접근성·모델 안전성만 다룬다.

| 변경 seam | 해결 대상으로 삼는 문제 | 건드리지 않는 영역 |
| --- | --- | --- |
| standalone handle 350ms long press, 짧은 click, 8px 취소, 합성 click 1회 억제, 모든 종료 cleanup | 길게 누르기 미동작, 스크롤 gesture 뒤 panel 오픈, 취소 뒤 유령 click | 실제 drag reorder 디자인, edge auto-scroll, 운영 데이터 |
| React surface의 같은 cancellation·cleanup 계약 | React와 standalone의 이동 결과·취소 의미 불일치 | 새 transition 종류, source writer, common Plan editor |
| 네 방향 safe-area와 16px 입력 seam | notch·gesture 영역 침범, iOS input zoom 위험, 짧은 가로 화면의 핵심 action 가림 | production shell token/IA 재설계 |
| skip link와 이동 설명 연결 | 키보드 사용자가 반복 navigation을 건너뛰지 못하거나 handle 의미를 알기 어려운 문제 | 전체 focus-order 재설계, 관찰 사용자 검증 |
| 고정 seed 5,000회 state transition simulation | 장시간 이동·완료·Undo 조합에서 깨진 참조, source 변경, revision 불일치 | 브라우저 렌더링, 실제 기기 gesture, concurrency |

### 11.1 2차 safe slice 설계 보완

- React move panel과 item/reset bottom sheet는 shell이 소유한 네 방향
  `--personal-workspace-safe-*` 변수를 그대로 소비한다. bottom sheet는 내부 padding뿐
  아니라 외곽 `bottom`도 inset 위에 두고 최대 높이에서 top과 bottom을 모두 뺀다.
- standalone은 `--standalone-safe-*` test seam을 둬 단일 파일에서도 dialog와 toast의
  외곽 경계를 강제로 측정한다. 이 변수는 PoC 검증 seam이며 운영 design token이 아니다.
- 행 본문 scroll과 손잡이 drag는 분리한다. Chromium trusted touch scroll 뒤 touch
  emulation을 해제하고 같은 fixture에서 mouse drag를 실행해 입력 상태 누수를 검사한다.
- 2차 slice 시점에는 actual scroll이 active handle session을 취소하는 결합 증거가
  없었다. 이 증거는 11.3의 3차 A8에서 닫았으며, 자동 touch emulation과 Chromium
  pointer·wheel을 실제 기기 검사로 표현하지 않는다.

이 batch만으로 다음 격차가 해결되었다고 판정하지 않는다.

- 세 결과물의 최종 shell·IA와 v4.1 visual fidelity
- 네 origin의 실제 공통 편집 commit adapter
- 개발 1의 전체 Plan/Item lifecycle, 보관·복구·삭제
- 개발 2의 CreatorDraft 관리 lane, 공개 후보, version management
- 실제 Text/Todo/Calendar export 또는 외부 동기화
- edge auto-scroll, 정교한 insertion indicator, 전체 drag fidelity
  (2차 slice 당시 제외였으며 corridor·삽입선·React offscreen date는 11.3에서 보완)
- Android Chrome·iOS Safari 실제 기기 검사와 관찰 사용자 검증

### 11.2 3차 A8 safe fidelity 설계

이 slice는 `V41-008`, `V41-019`, `V41-020`, `V41-043`, `V41-058`,
`V41-067`의 시각·상호작용 증거를 보완한다. D1·D2의 편집 lifecycle이나 source
순서를 대신 구현하지 않는다.

- **오른쪽 reorder corridor:** 이동 패널이 열린 동안 원래 목록 행을 실제 drop
  target으로 유지한다. 왼쪽 패널은 날짜·폴더, 오른쪽 원 목록은 순서라는 v4.1 공간
  의미를 보존한다.
- **하나의 resolver:** pointer 좌표, 현재 group identity, 대상 행 midpoint를 입력으로
  받아 `before`, `after`, `same`, `invalid` 중 하나를 계산한다. resolver는 DOM 상태와
  저장소를 직접 바꾸지 않는다.
- **글과 선의 동시 피드백:** 유효 target에는 layout을 밀지 않는 3px 삽입선을 놓고
  `○○ 앞/뒤에 놓기`를 기존 polite live region으로 알린다. same·invalid도 색만으로
  표현하지 않고 문구를 낸다.
- **edge auto-scroll controller:** viewport 또는 이동 패널의 상·하단 36~72px을 edge
  zone으로 보고 `requestAnimationFrame` 동안 scroll 위치만 바꾼다. 각 frame 뒤 target을
  다시 resolve하며, `prefers-reduced-motion`에서는 속도를 낮추되 사용자 제어 이동 자체는
  제거하지 않는다.
- **한 번의 commit:** 유효 drop에서만 기존 `reorder` 또는 `move-date` transition을 한
  번 실행한다. auto-scroll, preview, corridor class는 shadow state revision·Undo·storage
  call을 만들지 않는다.
- **종료 불변식:** drop 성공, 같은 위치, 밖 놓기, Escape, pointer cancel, blur, resize,
  빠른 scroll, unmount에서 RAF·pointer capture·preview class·overlay를 모두 정리한다.
  취소·same·invalid는 mutation 0건이다.
- **modality 대안:** drag 외에도 짧은 손잡이 누르기, `…` 메뉴, 위·아래 화살표가 같은
  transition으로 남는다. corridor를 추가해도 이 단일 포인터·키보드 대안을 제거하지
  않는다.
- **standalone 경계:** 독립 HTML에는 같은 midpoint·삽입선·window edge-scroll 계약을
  적용할 수 있다. 다만 centered dialog를 왼쪽 목적지 panel과 같다고 보지 않으며,
  fixture-only/product surface 역할은 A0 결정 전까지 부분 판정으로 남긴다.

검증은 before/after 양쪽 drop, edge hold의 실제 scroll 변화, offscreen target drop과
Undo, invalid/outside mutation 0, drag/menu/keyboard의 최종 order 일치, cleanup 뒤 class·RAF
0을 한 흐름으로 확인한다. 자동화된 pointer/touch 입력은 실제 Android/iOS 증거가 아니다.

### 11.3 3차 A8 구현·검증 결과

- **React corridor:** 내부 순서 target은 click·키보드 대안으로만 유지하고, drag는
  오른쪽 원 목록 행을 target으로 사용한다. midpoint before/after, 3px 삽입선,
  current·outside 무저장, reorder 1회·Undo 1회 저장을 확인했다.
- **날짜와 live owner:** 350ms Chromium synthetic pointer가 보이는 날짜 target에서
  기존 `move-date` transition으로 끝나며, PoC shell의 활성 live owner는 정확히 하나다.
- **offscreen date:** 844×300 reduced-motion에서 처음 panel 아래에 완전히 가려진 날짜를
  edge hold로 노출했다. panel `scrollTop`은 실제 증가했고 frame delta는 1~8px였으며,
  날짜 drop과 Undo가 각각 한 번의 저장으로 끝났다.
- **active-scroll 취소:** active synthetic pointer 중 Playwright mouse wheel의
  `isTrusted=true`와 실제 `scrollY` 증가를 확인했다. session 취소, 첫 synthetic click
  억제, 다음 정상 click 복원, 저장 0건이 한 연속 시나리오에서 통과했다.
- **standalone 범위:** actual mouse corridor·midpoint·3px 선·outside cleanup과 window
  edge-scroll 뒤 처음 화면 밖이던 task reorder·Undo를 확인했다. 중앙 dialog의 좌측
  destination parity와 정확한 화면 밖 날짜 이동은 닫지 않았다.
- **반복성:** A8 핵심 4건은 2회씩 8/8, 관련 6건은 별도 반복에서 12/12를 통과했다.
  당시 A8 기준선은 통합 PoC 74/74, standalone 28/28, npm 1,559/1,559, build
  18개 route, 관련 7-suite browser 31/31이었다. A9 최종 수치는 11.4에 기록한다.

이 결과로 `V41-019,020,043,067`만 새로 충족으로 올리고 `V41-008,058,066`은
부분으로 유지한다. D1·D2의 편집 lifecycle, source order와 bridge 판정은 A8로
올리지 않는다. 실제 Android/iOS, 200% 확대, screen reader, 관찰 사용자는 미실행이다.

### 11.4 4차 A9 이동 제어·월간·짧은 가로 slice

이 slice는 운영 owner나 영구 shell을 정하지 않고 `V41-028`, `V41-065`,
`V41-066.3`, `V41-070`의 safe contract를 닫는다.

- **네 방향 순서 이동:** `top`, `previous`, `next`, `bottom` control은 모두 현재
  peer 목록과 기존 midpoint position resolver로 목적 위치를 계산한 뒤 하나의
  `reorder` transition을 호출한다. 이미 경계인 방향은 disabled/no-write다.
- **월간 날짜 section:** 점유 날짜와 사용자가 펼친 빈 날짜를 하나의 세로 section
  배열로 투영한다. 2026-09 fixture에서는 빈 날짜가 정확히 28개이며, 각 section의
  48px Quick action은 선택 날짜를 기존 Quick form의 초기값으로 전달한다. Item source
  일정과 Flow 소속은 바꾸지 않는다.
- **월간 순서 범위:** 날짜 section 안의 reorder는 같은 날짜 peer 사이에서만 계산하고,
  저장할 때는 전체 월간 `TimelineOrder`에 합성한다. 다른 날짜 항목의 상대 순서는
  보존한다.
- **pointer cancel cleanup:** pointer capture·timer·RAF·ghost·drop highlight·status를
  같은 종료 함수에서 정리한다. preview와 cleanup은 state revision·Undo·storage call을
  만들지 않는다.
- **844×390 scroll owner:** move dialog/panel body가 viewport 안에서 독립 scroll owner가
  된다. page와 panel의 scroll을 겹쳐 잡지 않으며 모든 이동 control과 날짜 target에
  도달할 수 있어야 한다.
- **reload 뒤 compact Undo:** 성공한 snapshot과 한 칸 Undo를 PoC state에 보존한다.
  portrait와 short landscape에서 reload해도 마지막 성공 상태와 Undo action을 다시
  렌더링한다. 손상 payload는 기존 fail-closed 계약을 따른다.

A9 targeted 검증은 통합 PoC 76/76, standalone 30/30, React+standalone 기능 브라우저
27/27이다. standalone 844×390 월간·날짜별 Quick·dialog 내부 scroll 시나리오는 3회
반복해 3/3을 통과했다. 이에 따라 `V41-028,065,070`은 충족으로 올리고
`V41-066.3` 하위 조건도 충족으로 올린다. 부모 `V41-066`은 실제 Android/iOS touch
증거가 없어 부분을 유지한다. A9 변경 뒤 전체 회귀는 1,561/1,561, production build는
18개 route, 관련 7-suite browser는 37/37이다. 실제 기기, 200% 확대, screen reader,
관찰 사용자는 여전히 미실행이다.

## 12. 테스트와 증거 matrix

| 계층 | 필수 검증 | 합격 기준 | 증거 분류 |
| --- | --- | --- | --- |
| gate | exact query, 추가·반복·잘못된 query | 잘못된 경우 기존 `/my`, PoC write 0 | unit + E2E |
| identity/read model | 네 origin, 같은 제목, duplicate tuple, unsupported origin | stable ref, 중복 0, 충돌 fail-closed | unit fixture |
| composition | base + authored Flow, handoff/Flow/Item 충돌 | source 우선 덮어쓰기 0 | unit |
| reducer | 폴더, quick item, placement, order, complete, undo, no-op | invalid reference 0, no-op mutation 0 | unit |
| 장기 simulation | fixed seed 5,000 transitions | state schema·참조·Undo revision 유효, source byte 동일 | deterministic model test |
| storage | 허용 prefix, write verify, rollback, reset | prefix 밖 `setItem/removeItem` 0, `clear` 0 | instrumented unit + E2E snapshot |
| interaction | drag/long press/menu/keyboard, Escape/pointer cancel/blur/resize | 확정 결과 동일, 취소 mutation 0, 유령 click 0 | component + standalone + E2E |
| order controls | 맨 위·위·아래·맨 아래, 목록 경계 | 같은 `reorder` 결과, 경계 disabled/no-write | unit + React/standalone E2E |
| month date sections | 점유 날짜, 펼친 빈 날짜 28개, 날짜별 Quick add | 선택 날짜 저장, 취소·오류 write 0 | component + React/standalone E2E |
| authoring | 빈 원문, 예시, 틀 넣기, parse issue, explicit materialization | 선택만으로 원문 변경 0, lineage 보존 | unit + E2E |
| responsive | 390×844, 375×812, 844×390, 1024×768, 1440×900 | 가로 넘침·가림·console error·page error 0, 844×390 panel/dialog 내부 scroll | browser automation + screenshot review |
| regression | 관련 focused tests, `npm test`, production build | 실제 실행 결과와 개수를 별도 기록 | automated QA |
| real device | Android Chrome, iOS Safari | 실행한 경우에만 기기·버전·결과 기록 | real-device evidence |
| observed user | 사용자가 실제로 과업 수행 | 관찰 인원과 프로토콜 기록 | observed-user evidence |

브라우저 자동화, screenshot, simulation은 실제 기기 검사나 관찰 사용자 검증으로 표현하지 않는다. 테스트 개수와 PASS/FAIL은 문서 작성 시점의 추정값이 아니라 최종 실행 로그에서만 가져온다.

## 13. A0 결정 전 금지 구현

아래 작업은 기술적으로 가능해 보여도 제품·소유권 결정을 우회하므로 먼저 구현하지 않는다.

1. 네 origin을 하나의 운영 schema로 migration하거나 canonical personal copy로 암묵 승격하는 작업
2. 공통 editor 저장을 기존 origin writer 중 하나에 임의 연결하는 작업
3. 기존 완료·메모·날짜·보관·export writer를 PoC action에 재사용하는 작업
4. 실제 Calendar event, Todo/checklist, Text export, 외부 동기화를 운영 저장소에 생성하는 작업
5. Text Authoring의 구조 확인을 강제 3-step 정책으로 굳히거나 template 선택만으로 원문을 자동 생성하는 작업
6. CreatorDraft, 공개 후보, version merge, account/cloud lane을 동작하는 제품 기능처럼 연결하는 작업
7. production `/my` shell, navigation token, operating key/schema를 PoC fidelity 목적으로 변경하는 작업
8. source identity가 부족한 record에 추정 ID를 발급해 지원된 것처럼 보이게 하는 작업
9. A0 미결정 기능을 화면만 동작하는 mock으로 만든 뒤 충족으로 판정하는 작업

## 14. 단계 완료 판정

한 단계는 코드가 보이는 것만으로 끝나지 않는다. 다음 조건을 모두 충족해야 닫는다.

- 해당 package의 requirement ID와 source 근거가 연결되어 있다.
- 구현된 기능, 부분 구현, 미구현, 결정 필요를 서로 다른 상태로 기록한다.
- 순수 모델·저장 경계·component 또는 standalone test가 위험에 비례해 추가되었다.
- 관련 viewport에서 실제 브라우저 조작과 console/page error를 확인했다.
- 작업 전후 운영 `flow:*` key/value가 byte-for-byte 동일하다는 증거가 있다.
- 실제 기기, 관찰 사용자, commit, push, PR, Preview, Production 상태를 자동 테스트와 분리해 보고한다.

이 설계의 성공 기준은 PoC 기능 수를 늘리는 것이 아니라, 세 결과물의 합의된 계약을 잃지 않으면서 다음 단계가 source·운영 경계를 건드리지 않고 이어질 수 있게 만드는 것이다.
