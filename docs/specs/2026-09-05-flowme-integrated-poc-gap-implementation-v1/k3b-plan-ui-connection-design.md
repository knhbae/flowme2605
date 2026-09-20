# K3-B B1-UI — 기존 Plan/Item 화면에 새 편집 계약 연결

2026-09-05. root의 구현 전 연결 메모다. 새 제품 UI 수정은 아직 없다. [K3-B 필드·상태 설계](./k3b-design.md), [P 계약](./k3b-plan-context-contract.md), [source reader](./k3b-plan-source-reader-design.md), [E2 연결](./k3b-plan-session-connection-design.md)을 따른다. 현재 app의 열기/입력/저장/복구/렌더링과 React `TextDraftControl`·`ScheduleDraftControl`·실행 읽기 영역을 직접 대조했다.

## 원본 UX와 적용 방식

React는 제목·메모를 상속/직접 입력 select로, 계획 날짜를 상속/날짜 지정/미정 select로 다룬다. standalone에도 같은 문법을 쓰고 현재 전체 페이지 편집과 K1-B 닫기 확인은 유지한다. 새 wizard·전역 theme·작성 도구는 만들지 않는다.

| 화면 | 기존 요구에 맞출 정보·행동 | 혼동 방지 |
|---|---|---|
| Plan | 기존 기준과 내 Flow 제목 mode, 정확 Item 목록, Item 수정, 마지막 전체 저장 | Item 제목/메모/날짜는 자식 초안에서 반영. 개인 구간·전체 순서는 B2 gate 뒤 추가 |
| Item | 원문 읽기 정보 → 내 제목 → 개인 메모 → 계획 날짜3mode → 실행 위치 읽기 → Plan에 반영 | 완료·폴더·실행일은 편집 밖 이동/완료 행동. child에는 persistent 저장 없음 |
| Quick | 기존 제목·메모·날짜·폴더·저장 | P mode나 부모 Plan을 붙이지 않음. 기존 recovery version1 유지 |
| 빈/긴/invalid | 빈 제목·빈 fixed date 입력 유지, 해당 field 오류와 첫 오류 초점 | 날짜를 비우는 입력을 null/상속으로 자동 변환하지 않음 |
| 실패/재시도/복구 | 기존 지역 피드백과 저장 중 잠금, prepared/confirmed 구분 | source 미검증이면 저장 개방하지 않음. confirmed는 rollback하지 않음 |

상속 문구는 값의 소유 근거에 맞춘다. raw `sourceTitle`이 없거나 개인 baseline인 제목은 ‘기존 제목 유지’, 개인 메모가 있으면 ‘기존 개인 메모 유지’, 메모 부재면 ‘개인 메모 없음’이다. 확인된 source owner만 ‘원본 따르기’를 쓸 수 있다. `''`·공백·CRLF는 truthiness로 ‘없음’으로 바꾸지 않는다. 빈 값은 `(빈 메모)`로 구분하고 긴 메모는 pre-wrap/anywhere로 표시한다. textarea DOM의 CRLF→LF와 raw exact 보존은 이전 메모 QA처럼 구분한다.

React와 같이 inherit→override 진입은 현재 검증된 inherited 값을 입력값으로 쓴다. fixed_date 진입은 기존 fixed 상태가 아니면 빈 날짜로 시작하며, 사용자 입력 전 invalid 상태다. 같은 표시 날짜의 명시 fixed pin은 보존한다. 원본 날짜 없는 항목이나 과거 실행 intent를 이 과정에서 자동 상속으로 재해석하지 않는다. source 갱신 후 raw-normalize와 다른 기준은 Sb를 통과하기 전 capability 안내로 차단한다.

## 실제 app 연결 지점

| 현재 함수/처리 | 수정 시 지킬 경계 |
|---|---|
| `state()` / `taskById` / `flowById` | 검증된 raw checkpoint + 실제 source-read packet으로 bound view를 얻는다. 실패를 raw 정상 view로 몰래 바꾸지 않는다. 기간/상세/결과가 같은 view를 소비하며 C 기간 grouping의 실행 date/time/order는 유지 |
| `openPlanEditor`, `beginEditorRoot` | 새 E2 Plan wrapper로 context 발급. 기존 root lifecycle/history/returnPoint는 재사용. raw/effective 또는 두 Flow id를 혼용하지 않음 |
| `newPlanDraft` / `renderPlanEditor` | 새 contract는 P exact draft를 사용한다. 렌더링 중 새 draft를 만들거나 baseline을 바꾸지 않음. legacy journal에서 복구한 string/null draft는 별도 기존 branch |
| `openItemEditor` / `createChildSession` | Flow Item의 full ref를 전달하고 최근 부모 staged 값을 child baseline으로 사용. 직접 Item 진입도 검증된 부모 root를 먼저 열어 기존 grammar 유지 |
| `renderItemEditor` / input·change handler | contract별로 old string/null과 새 mode 객체를 분리. `items.find`·`.title.trim`을 새 dictionary/mode에 그대로 호출하지 않음. getter/foreign shape는 E2 앞에서 차단 |
| `save-item-editor` | 새 child는 mode validation 뒤 exact title/memo/schedule만 부모로 반영. invalid 입력과 source stale 사유 유지. persistent 호출0 |
| `saveEditor` / 32ms callback | 새 Plan은 E2 전용 C후보 wrapper 사용. old Quick/복구 action은 기존 path. source guard를 prepare/target/confirm과 callback에 연결하고 pending/recovery/attempt object 확인 유지 |
| `resumeEditorRecovery` | journal discriminator로 branch 선택. 새 scopeId는 full ref이므로 screen의 local id로 직접 넣지 않음. 검증된 checkpoint에서 exact ref→local id를 재조회. source 재확인·새 context/session 이후만 재개 |
| `finishEditorClose` / history / contextual result | 부모/자식 폐기 범위·정확 opener·스크롤·본문 Undo owner 유지. 성공 source receipt를 workspace Plan 성공으로 세지 않음 |

새 P draft의 `flowId`는 **source Flow id**이고 기존 app.screen의 `selectedFlowId`는 **local id**다. 새 session.scopeId는 **full Flow ref**다. 이 셋을 `===` 한 번으로 비교하던 옛 render guard에 넣으면 매번 초안이 재생성되거나 엉뚱한 화면으로 복귀할 수 있다. 검증된 binding으로 local id/ref를 한 번 연결하고, 같은 제목·배열 위치로 fallback하지 않는다. Item의 local task id와 full Item ref도 같은 방식으로 구분한다.

읽기 projection을 행마다 새로 만드는 비용을 피한다. 캐시를 쓴다면 검증된 checkpoint 객체·정확 source raw·관찰 epoch·읽기 성공 상태를 함께 키로 삼고 adopt/source 교체 때 폐기한다. revision만으로 다른 payload를 같은 authority로 받아들이지 않는다. 캐시는 실제 저장 직전 source/key 재확인을 대신하지 않는다.

## 화면 검증과 개방 gate

1. 순수 presenter/handler tests에서 mode 전달·빈값·invalid·exact ref·기존 branch 보존을 먼저 확인한다. 구현되지 않은 E2/Sb API를 이름만 넣어 통과시키지 않는다.
2. C/P/E2/reader/D의 stable candidate로 builder module 순서를 고정한다. 기존 사용자 HTML은 전체 연결 시험이 끝날 때까지 B14A를 유지한다.
3. 실제 Chromium에서 네 origin+authored의 Plan→Item→반영→전체 저장→상세/기간/네 결과→Undo→reload를 조작한다. 성공 target와 journal 호출을 따로 기록하고 운영 fixture bytes를 대조한다.
4. source-only drift·관찰 ABA·read-error·invalid/corrupt·prepared/confirmed·write/readback/cleanup fault·same/no-op·취소/Escape·키보드·실제 browser Back을 별도 검사한다. legacy 복구와 새 journal 복구를 둘 다 유지한다.
5. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 입력·owner·오류·저장/취소/재시도 전체 rect/hit·가로 넘침·page/console error를 검사한다. mode 전환 시 정확 제어 초점, child 반영 뒤 정확 Item opener 복귀를 확인한다. 긴 메모/긴 제목·마지막 Item을 포함하며 모든 내용이 첫 화면에 다 보인다고 요구하지 않는다.
6. 기준 통과 뒤 사용자 HTML 두 파일과 bytes/SHA pin을 함께 갱신하고 실제 file URL smoke를 실행한다. C/P source가 달라진 상태의 옛 browser PASS를 새 후보의 PASS로 옮기지 않는다.

이 문서의 제품 수정·신규 test 실행·브라우저 실행0이다. 실제 Android/iOS·OS IME·보조기술 NOT_RUN, 관찰 사용자0. commit/push/PR/Preview/Production 없음. 기존 개인 구간·순서의 capability는 B2, 최종 변경 영수증은 B3에서 판정한다.
