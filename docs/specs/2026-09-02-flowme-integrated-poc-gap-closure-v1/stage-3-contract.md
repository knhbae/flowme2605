# 단계 3 계약 — 공통 편집·저장·결과 projection

- 상태: `IMPLEMENTED_AND_CHROMIUM_VERIFIED` — 실제 기기·screen reader·실제 200% text zoom·관찰 사용자는 미실행
- 작성일: 2026-09-02
- 대상: `A3`, `A4`, `A5`; `A11`은 A0 결정에 따라 보류
- 제품 권위: React `/my?personalWorkspacePoc=v1`, `/flows/new?personalWorkspacePoc=v1`
- 저장 권위: `flow:poc:personal-workspace:v1:*` 안의 shadow state만 허용

## 1. 단계 목표와 완료 기준

기존 네 saved-plan origin과 단계 2에서 새로 작성한 개인 Flow를 같은 Plan→Item 편집
문법으로 연다. Plan의 개인 제목·Item 순서와 Item의 개인 제목·메모·계획 날짜를 부모
Plan 초안에서 조정하고,
Plan 단위로 한 번 저장한다. 저장 결과는 Text·Todo·PoC Calendar·TXT에서 같은 effective
Item ref와 완료 상태로 보여야 한다.

단계 완료는 다음을 모두 만족할 때만 선언한다.

1. 모든 구현된 Plan/Item opener가 같은 edit intent와 staged transition을 쓴다.
2. Item의 `계획에 반영` 전 persistent write는 0건이고 Plan의 `변경 저장`은 state target
   write 1건이다.
3. source/imported bytes와 source schedule은 개인 편집이나 실행 날짜 이동으로 바뀌지
   않는다.
4. 네 결과 보기는 별도 canonical store를 만들지 않고 같은 effective refs를 읽는다.
5. 성공·같은 내용·취소·실패·재시도·Undo를 값과 대상이 드러나는 receipt로 표시한다.
6. 운영 writer, 실제 `/calendar`, export/download, source 역편집은 호출하지 않는다.

## 2. 요구사항 범위

| 묶음 | 이 단계가 구현·검증하는 요구 | 의도적으로 남기는 부분 |
| --- | --- | --- |
| A3 공통 편집 | `D1-001~004,018`, `D2-035,036,039,040`, `BP-038,080` | 안정적인 section identity가 없어 `D1-012` section title 편집은 숨김 |
| A4 상태·오류·Undo | `D1-011`, `BP-059,060,062,063`; `D2-058` 중 personal shadow 범위 | source 역편집은 A0 경계로 제외하므로 `D2-058` 전체는 부분 |
| A5 결과 projection | PoC 내부 `D1-021,022,023`; `D2-003,017,020`; `BP-007,035,049,069,079`의 같은-ref 부분 | 실제 `/calendar`, Sheet, export/download 하위 조건은 부분 또는 보류 |
| A11 creator 관리 | 없음 | CreatorDraft 목록·검색·복제·보관·재진입은 A0에서 보류 |

`D2-021`은 개인 title·memo·schedule 편집까지만 지원한다. 원문 또는 외부 source로
역전파하지 않는다.

## 3. 정보 소유권

| 정보 | 소유자 | Stage 3 화면 | 쓰기 |
| --- | --- | --- | --- |
| 원본 제목·설명·출처·원래 일정·완료 기준 | source/imported baseline | `원본 정보 · 읽기 전용` | 금지 |
| 개인 Flow 제목·Item 순서, 개인 Item 제목·메모·계획 일정 | personal plan overlay | `내 계획 · 편집 가능` | PoC shadow Plan commit |
| 폴더·Flow 멤버십 | organization | 현재 값 표시, 이동은 기존 move intent | PoC shadow transition |
| 실행일·기간·실행 순서·완료 | execution | 현재 값 표시, 별도 이동/완료 intent | PoC shadow transition |
| `rawText`·revision·fingerprint·source line | authoring | 출처 요약/읽기 전용 | 단계 2 handoff만 |
| creator/public/export/운영 Calendar | 해당 운영 owner | 제공하지 않음 | 금지 |

개인 계획일과 실행일이 다르면 둘을 합치지 않고 각각 `계획 날짜`, `실행 위치`로
표시한다. effective date 우선순위는 `execution placement → PoC personal plan → imported
personal → source`다.

## 4. 공통 진입과 중첩 편집 흐름

| opener | 여는 세션 | 닫힌 뒤 돌아갈 곳 |
| --- | --- | --- |
| 폴더/Plan 목록의 Flow | Plan | 원래 Flow opener와 scroll |
| Flow 상세의 Item | 부모 Plan → 같은 `itemRef`의 Item | 부모 Plan의 해당 Item 행 |
| Today/week/month/날짜 미정의 Item | 부모 Plan → 같은 Item | 원래 기간 목록 opener |
| Todo·PoC Calendar의 Item | 부모 Plan → 같은 Item | 원래 결과 view·날짜·scroll |
| QuickItem | 별도 root-Item adapter | 원래 QuickItem opener |

QuickItem을 가짜 Flow로 만들지 않는다. 화면 shell, dirty guard, receipt 문법은 같지만
개인 작성·실행 owner의 독립 adapter로 저장한다.

Item 편집의 `계획에 반영`은 부모 Plan draft만 갱신한다. 이 시점의 storage write는
0건이다. 한 개 이상의 Item 변경과 Plan 자체 변경은 Plan 화면의 영향 요약에 모이고,
`변경 저장` 한 번이 하나의 shadow transaction과 Undo snapshot을 만든다.

완료·다시 열기는 계획 편집과 분리된 execution intent다. 같은 `itemRef`의 상태가 상세,
기간 목록, Todo, PoC Calendar에 즉시 반영되어야 하며 source 또는 personal-plan 날짜를
바꾸지 않는다.

## 5. 필드 순서와 화면 문법

### Plan

1. 편집 대상과 origin
2. `원본 정보 · 읽기 전용`: 제목, 설명, 출처, 원래 일정
3. `내 계획 · 편집 가능`: 개인 Flow 제목
4. Item 전체 목록과 개인 순서
5. fidelity·unsupported·collision 경고
6. 저장 대상, 포함·제외, before→after, 변경 건수의 영향 요약
7. sticky `취소` / `변경 저장`

현재 read model에는 Flow-level 설명·메모 owner와 Plan-level 일정 override가 없다. 이를
Item memo나 anchor date로 추정하면 기존 세 결과물의 소유권을 바꾸므로 이번 단계에서
새 schema를 만들지 않는다. 원본 출처는 discovery URL 또는 source slug가 있을 때만
표시한다. Flow-level 설명·메모·일정은 현재 model에 값이 없으면 추정하거나 빈 편집
필드를 만들지 않으며, 해당 세부 요구를 부분 충족으로 남긴다.

### Item

1. 대상 Item과 부모 Plan
2. `원본 정보 · 읽기 전용`: 제목, 설명, source 계획일, 출처, 완료 기준
3. `내 계획 · 편집 가능`: 개인 제목 `원본 따르기 / 덮어쓰기`, 개인 메모,
   계획 일정 `원본 따르기 / 날짜 지정 / 미정`
4. `실행 위치 · 읽기 전용`: 현재 기간, 실행일, 순서, 완료 상태; 변경은 기존 Move 및
   완료·다시 열기 intent 사용
5. 부모 Plan에 반영될 before→after 요약
6. `돌아가기` / `계획에 반영`

Item editor 안에서는 완료·다시 열기 action을 제공하지 않는다. 부모 Plan에만 반영하는
staged draft와 즉시 저장되는 execution mutation을 같은 편집 transaction에서 섞지 않기
위해서다. 완료·다시 열기는 기간 목록과 Flow 상세의 기존 execution action으로 수행하고,
Item editor 내부 action 세부 요구는 이번 단계에서 의도적으로 분리해 부분 충족으로 남긴다.

section에는 안정적인 identity와 overlay가 없다. 제목으로 owner를 추정하지 않고 section
title 편집 필드를 제공하지 않는다.

## 6. dirty, 이탈, 복귀

- 모든 opener는 실제 요소, window scroll, 관련 scroll container, route/query/hash를
  캡처한다.
- clean close는 확인 없이 닫고 write 0이다.
- dirty 상태의 취소, 닫기, backdrop, Escape, 브라우저 Back은 같은 확인창을 쓴다.
- `계속 편집`은 draft, 입력 focus, scroll을 보존한다.
- Item discard는 해당 Item 변경만 버리고 기존 부모 Plan draft를 보존한다.
- Plan discard는 전체 staged draft를 버리고 외부 opener로 돌아간다.
- submitting/recovery 중에는 닫기와 배경 mutation을 차단한다.
- 실패하면 draft를 유지하고 오류 요약으로 focus한다.
- 성공하면 원래 opener와 result view/date/scroll을 복원한다.

브라우저 Back은 앱의 synthetic history boundary 문법을 재사용하고 route 자체를 운영
화면으로 변경하지 않는다.

## 7. receipt, 실패, 재시도, Undo

문자열 toast만으로 저장 성공을 표현하지 않는다. Stage 1의 구조화 receipt를 UI에
연결한다.

| 상태 | 사용자에게 보이는 값 | state target write |
| --- | --- | --- |
| saving | 대상, 예상 변경 건수 | 아직 0 |
| success | owner별 before→after, affected refs/count, Undo | 1 |
| noop | `같은 내용이라 저장하지 않았습니다` | 0 |
| canceled | 버린 draft 범위와 원래 위치 | 0 |
| failure | 실패 위치, 상태 보존, 같은 intent의 `다시 시도` | 0 또는 exact rollback |
| undone | 되돌린 성공 변경과 복원 값 | 1 |

`retry`는 새 action이 아니라 동일 `intentId`, guard, payload를 가진 직렬화된
`retryIntent`를 재실행한다. optimistic React state만으로 success를 만들지 않고 target
write 및 검증이 끝난 뒤 editor 밖 coordinator가 receipt를 확정한다. 편집 세션 또는
저장이 진행 중이면 전역 Undo를 비활성화한다.

## 8. 결과 보기 계약

공통 view state는 `selectedFlowRef`, `resultView`, `baseDate`, `selectedDate`,
`openItemRef`, focus return이다. view와 날짜 선택은 탐색 상태이며 저장하지 않는다. Flow가
바뀌면 `Text`와 새 Flow의 base date로 초기화한다.

| 보기 | 역할 | 같은-ref 보증 |
| --- | --- | --- |
| Text | effective 제목·Item 순서·계획일을 Flow 문법으로 표현 | 각 줄에 원래 Item ref 연결 |
| Todo | 축약 없는 전체 Item을 날짜/section별로 표시 | 같은 ref, 완료, 편집 opener |
| Calendar | PoC 내부 month grid와 selected-day 전체 목록 | 같은 ref, effective date, 완료 |
| TXT | 정규화한 배포용 읽기 전용 미리보기 | 같은 effective items; export/download 없음 |

기준일은 유효한 Flow anchor가 있으면 anchor, 없으면 브라우저의 로컬 오늘을 쓴다.
Calendar는 이 PoC 내부 projection이며 실제 `/calendar`와 운영 calendar writer를 호출하지
않는다. recurrence를 생성하거나 추론하지 않는다. Sheet는 이번 단계에 노출하지 않으며
`D2-019`의 고정 4-slot 전체 충족으로 판정하지 않는다.

## 9. 구현 경계

재사용한다.

- `FlowEditorSurface`: 공통 shell, 오류 요약, discard dialog, sticky action
- `useFlowEditorController`, `captureFlowEditorReturnPoint`: dirty·focus·scroll·Back
- `FlowEditorSession`: Item→Plan staged transaction
- `personal-workspace-poc-plan-editor`: open/apply/preflight/commit handlers
- `personal-workspace-poc-composition`: effective overlay 계산
- `personal-workspace-poc-receipt`: receipt/retry/Undo 값
- 기존 개인공간의 실행 목록·move/complete transition

`SavedFlowPlanEditorSurface`와 `SavedFlowItemEditorSurface`를 직접 연결하지 않는다. 운영
schema의 anchor/include/routine 필드와 PoC의 inherit/fixed/unscheduled 소유권이 다르므로,
공통 shell 위에 얇은 PoC field presenter를 둔다.

## 10. 검증 시나리오

### 모델·component

- 네 origin에서 같은 필드 순서, 같은 staged transition, source byte 불변
- Item apply 전 raw state와 storage mutation 0, Plan commit target write 1
- 개인 title·memo·schedule·order의 exact before→after와 reload 복구
- no-op/cancel/Escape/Back/stale/collision/unsupported write 0
- 실패 exact rollback, draft 유지, 같은 intent retry
- Text/Todo/Calendar/TXT의 refs, effective dates, order, completion parity
- QuickItem root adapter가 source Flow identity를 만들지 않음

### 실제 Chromium

1. 네 origin 각각 Plan을 열고 동일한 필드 순서와 읽기/쓰기 구획을 확인한다.
2. Item을 기간 목록과 결과 보기에서 열어 같은 Item editor를 확인한다.
3. Item 변경을 Plan draft에 반영할 때 storage 0, Plan 저장에서 target write 1을 확인한다.
4. Text→Todo→Calendar→TXT에서 같은 ref/date/completion을 확인한다.
5. Today에서 완료 후 상세·Todo·Calendar에서 확인하고 다시 연다.
6. dirty 취소/Escape/Back과 focus/scroll 복귀, 실패/retry/Undo를 확인한다.
7. reload와 corrupt payload fail-closed, 운영 key byte parity를 확인한다.
8. 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900에서 overflow,
   console/page error, 핵심 CTA 가림을 검사한다.

실제 Android Chrome, iOS Safari, 가상 키보드, screen reader, 실제 200% text zoom,
관찰 사용자는 자동화와 분리해 `미실행`으로 기록한다.

## 11. 단계 3 종료 증거

| 구분 | fresh 결과 | 증거 범위 |
| --- | --- | --- |
| Stage 3 Chromium runtime | 13/13 PASS | 네 saved-plan origin·작성 handoff, Plan/Item staged 편집, QuickItem root 편집, receipt·retry·Undo, cross-view 완료, reload·corrupt fail-closed |
| 화면 artifact | PNG 24개 | workspace·result·Plan·Item 4개 상태 × 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900 6개 viewport |
| 저장 호출 경계 | PASS | 허용 prefix 밖 `setItem` 0, `removeItem` 0, `clear` 0 |
| 운영 snapshot | byte-identical | 격리 browser context의 시나리오 전후 운영 key/value exact bytes 동일 |

브라우저 실행의 최종 결과는 `test-results-stage3-final-5/.last-run.json`, 화면은
`docs/content-audit/2026-09-02-flowme-integrated-poc-stage-3-runtime-assets/`에 남겼다.
이 증거는 격리 Chromium과 fixture 범위다. 실제 browser profile/backend, Android Chrome,
iOS Safari, screen reader, 실제 200% text zoom, 관찰 사용자를 검사했다는 뜻이 아니다.
전체 회귀, 단계 4 최종 실행, 최종 보고서 수치는 단계 6에서 별도로 확정한다.

## 12. 단계 Exit gate

- [x] 기존 네 origin과 단계 2 작성 Flow가 같은 Plan/Item 편집 문법을 쓴다.
- [x] Item staged apply 0 write, Plan commit 1 target write가 자동·브라우저에서 통과한다.
- [x] Text/Todo/Calendar/TXT가 같은 refs·date·order·completion을 보인다.
- [x] source schedule/bytes와 운영 `flow:*` key/value가 byte-for-byte 동일하다.
- [x] 실패·취소·같은 내용·retry·Undo와 reload/corrupt 경계가 통과한다.
- [x] 실제 `/calendar`, Sheet, export, creator, source reverse edit의 보류를 완료로 과장하지 않는다.
