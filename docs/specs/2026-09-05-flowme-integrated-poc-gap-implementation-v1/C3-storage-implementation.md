# K2B-C3 저장 호출 전환 구현 기록

2026-09-05. [전체 호출 전환 설계](./k2b-caller-switch-design.md)의 §2–4·§6 구현 기록이다. 제품 파일은 standalone `app.js`의 부팅·저장·복구·기능 보호 분기만 맡았다. 같은 파일의 §5 기간·순서·clock·result reader는 주 작업자가 병렬 구현했다.

**이 문서는 C3 전체 완료 판정이 아니다.** 아래 20개는 실제 모델과 app을 메모리 VM에서 실행한 검사이며, 가짜 DOM을 사용했다. 브라우저·실기기·관찰 사용자 검증과 합산하지 않는다. 생성 HTML, 전체 자동 시험, production build, 브라우저 결과는 주 작업자의 최종 QA를 따른다.

## 1. 소유 범위와 보존

| 항목 | 기록 |
| --- | --- |
| 제품 수정 | `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js`의 저장 호출·보호 분기 |
| 신규 문서 | 이 파일 |
| 수정 전 사본 | `output/poc-gap-implementation/k2b/before-c3/docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js` |
| 수정 전 SHA-256 | `870EC65294D792B1C62334DBF953CBCA5C6868D2160405E6047C6B09E49B9EAF` |
| 20개 fixture 실행 당시 app SHA-256 | `727015358E8428E819146D684C44E099870840499B41710706807EAB879F4C6F` |
| 이번 하위 작업에서 변경하지 않음 | model, checkpoint/storage/session 모듈, builder, 생성 HTML, styles, 운영 코드 |
| 기존 변경 보존 | 수정 직전 파일을 대상 경로에 사본으로 남기고 작은 patch로 수정. 같은 파일의 주 작업자 수정은 유지 |

사본은 기존 파일이 없는 경우에만 만들었고 원본·사본 해시가 같음을 확인했다. 이후 app 해시는 주 작업자의 §5 변경을 포함한다. 최초 baseline 대비 app 전체 diff를 이 하위 작업 단독 소유로 주장하지 않는다.

## 2. 구현 연결

| 호출·화면 | 현재 연결 | 보존한 경계 |
| --- | --- | --- |
| 부팅·`acquireStorage` | `S.loadWorkspace`가 발급한 packet을 읽고 ready일 때만 checkpoint 사용 | 특정 key 읽기 실패를 memory/seed로 바꾸지 않음. localStorage 객체 자체 접근 불가만 기존 volatile 모드 |
| `state`·`render` | core 실패에서는 checkpoint가 null이며 recovery gate를 먼저 렌더링 | 실패 시 sidebar·Flow·기간 수에 seed나 이전 데이터 표시 금지 |
| `workspaceWritable` | 메모리 잠금과 `S.sameAuthority` 검증 | drift는 0쓰기 잠금. 오래된 packet으로 새 상태 덮어쓰기 금지 |
| 일반 `transition` | `C.transitionCheckpoint(W.checkpoint, action, options)` → `S.prepareWrite` → durable commit·cleanup | source effective projection은 저장 후보가 아님. clock ticket options는 기간 소유자에서 전달 |
| `undo` | workspace Undo는 `C.undoCheckpoint` → 일반 action journal | 전체 checkpoint의 Undo. 기존 creator/source Undo는 각각의 저장소 유지 |
| Plan·Quick 최종 저장 | 새 세션은 고정 factory의 E2 → `writeDurableAttempt` → confirmed 정리 → 새 packet | E0/E2 session·attempt·recovery brand 혼용 없음 |
| 이전 편집 복구 | old journal은 E0로 명시 복구 후 S 재검증 → E2 새 세션으로 baseline·draft 복원 | E0 recovery를 E2 `resumeRecoveredSession`에 넘기지 않음. 다시 저장해야 쓰기 발생 |
| 새 편집 복구 | E2의 검증된 recovery와 실제 storage로 재개 | `canResume`과 packet ready를 모두 확인 |
| 일반 action 복구 | 계약을 읽어 S로만 라우팅. prepared는 이전 값, confirmed는 정리 | journal 소유 불명·혼합 authority는 보존 잠금. 열기·재확인은 읽기 전용 |
| 정상 handoff | 현재 초안의 exact raw·문서/원문/폴더/틀 소유 확인 → S의 workspace+draft action | verified cleanup 전 receipt 이동·초안 비우기 없음 |
| 중복 handoff | 같은 saved Flow가 존재하고 원문이 일치할 때 저장 영수증 열기 | workspace·draft 모두 0쓰기, 초안 보존. 삭제·휴지통·불일치이면 강제 열기 없음 |
| 초기화 | `S.prepareReset`의 고정 대상 → commit·cleanup 후 런타임 정리 | `M.resetPoc`, seed 쓰기, `localStorage.clear()` 사용 없음 |
| 영구 삭제 | `S.preparePermanentDelete` → commit·cleanup·`deletionComplete` 확인 | 정리 전 삭제 성공 건수·완료 처리 금지. confirmed cleanup 오류에 target rollback 없음 |
| draft/creator/source 오류 | 각각 loader status를 유지하고 해당 기능 잠금 | workspace 전체를 memory로 우회하지 않음. 일반 ancillary writer 계약 자체는 이번에 확대하지 않음 |
| 입력·재시도·배경 callback | 문서 id/source epoch/workspace epoch, active session·attempt, recovery 잠금 확인 | 다른 문서의 stale retry·저장 중/복구 중 추가 입력·다른 writer 진입 방지 |

현재 app에 남은 `M.loadEnvelope` 호출 하나는 `validLegacyEditorEnvelope` 내부의 **old journal 검증용 읽기**다. 활성 workspace의 `M.writeEnvelope`, `M.transitionEnvelope`, `M.undoEnvelope`, `M.resetPoc`, `M.initialEnvelope` 호출은 검색 결과 0건이다. 상수·schema를 전역 교체하지 않았다.

## 3. 저장 사실과 사용자 표시

일반 action은 confirmed journal을 검증했으면 durable 저장 사실을 1회 센다. 이후 journal 정리나 legacy authority 재확인에 실패하면 “저장 완료 · 정리 확인 필요” 상태로 잠그며, 정상 화면에 후보를 성급히 반영하지 않는다.

영구 삭제는 예외다. 삭제 전 내용이 journal에 남아 있을 수 있으므로 `cleanup + deletionComplete + ready`를 모두 확인한 뒤 성공 건수를 센다. 같은 실행에서 확인 대기 중이었다면 `deletionCountPending`을 1회 소비한다. 새로고침으로 과거 기록을 읽은 경우 이 메모리 표식이 없으므로 성공 건수는 0으로 시작한다. 이는 저장 건수의 소실을 뜻하지 않고 새 실행의 UI 카운터다.

prepared 복구는 현재 입력과 폼을 보존하며 자동 저장하지 않는다. 숨겨 둔 기존 dialog를 다시 열면 그 입력의 초점도 돌려준다. confirmed reset 복구는 동일 런타임 callback과 초기화 함수를 두 번 실행하지 않는다.

주요 확인 지점:

- `workspace-storage-gate`: `data-workspace-status`, `data-recovery-family`.
- `workspace-check-storage`: 재확인만 수행.
- `workspace-recover-storage`: 확인된 action의 명시 복구 또는 정리.
- `workspace-open-verified`: 검증된 저장본을 사용자가 명시적으로 열기.
- `authoring-storage-gate`: 초안 읽기 오류. 현재 입력을 보존.
- `feature-storage-status`: creator/source 기능 오류와 `feature-check-storage` 재확인.
- 중복 저장 안내: “이미 저장된 Flow예요. 작성 초안은 그대로 두었습니다.”

## 4. 직접 실행한 검사: 20/20 PASS

현재 app 본문에 검사 전용 접근자를 메모리에서만 덧붙이고, 실제 UMD runtime·C1·S·E0/E2를 같은 VM realm에서 실행했다. 제품 파일에 테스트 hook을 추가하지 않았다. 저장소는 get/set/remove 호출을 기록하는 Map이며 read 오류, 쓰기 전 오류, 정리 삭제 오류, 외부 raw 변경을 주입했다. 등록된 `node:test` 또는 Playwright 시험이 아니므로 그 개수에 더하지 않는다.

| 번호 | 실제 실행 | 결과 |
| --- | --- | --- |
| V01 | 새 저장소 부팅 → ready, 쓰기 0 | PASS |
| V02–05 | old workspace, v2 workspace, old editor journal, v2 journal 각각 읽기 오류 → core gate, checkpoint null, 쓰기 0 | 4 PASS |
| V06–07 | old/v2 workspace 각각 손상 → core gate, checkpoint null, 쓰기 0 | 2 PASS |
| V08–10 | draft/creator/source 각각 읽기 오류 → 해당 status read-error, 기존 workspace 유지, 쓰기 0 | 3 PASS |
| V11 | Quick 생성 → Undo → v2만 변경, old key 미생성, journal 정리, 성공 2건 | PASS |
| V12 | workspace target 쓰기 전 오류 → prepared·성공 0 → 명시 복구 → 이전 key 부재 복원·journal 제거 | PASS |
| V13 | confirmed journal 정리 오류 → durable 성공 1·추가 변경 차단 → 명시 정리 → 성공 건수 1 유지 | PASS |
| V14 | 외부 v2 raw 변경 → stale packet 저장 거절·쓰기 0·외부 값 보존 | PASS |
| V15 | 정상 handoff 후 같은 draft로 중복 저장 → workspace 추가 쓰기 0, draft exact 보존, 안내 확인 | PASS |
| V16 | handoff draft 제거 오류 → prepared·성공 0 → 명시 복구 → v2 부재와 이전 draft exact 복원 | PASS |
| V17 | 초기화 → fixed coordinator로 대상 제거, ready 유지, seed/old key 미생성 | PASS |
| V18 | 실제 E0 prepared journal로 reload → 명시 복구 → E2 새 세션 저장 → 새 target, journal 정리 | PASS |
| V19 | 실제 E2 prepared journal로 reload → 명시 복구 → E2 저장 → 새 target, journal 정리 | PASS |
| V20 | 영구 삭제 정리 오류 → 성공 건수 불변 → 같은 실행에서 명시 정리 후 1회 증가; reload 정리와 반복 클릭은 재집계 0 | PASS |

V18/V19의 journal은 수작업 JSON이 아니다. 실제 E API에서 confirmed 쓰기 직전 예외를 주입해 만든 prepared 기록을 재사용했다. V20은 실제 삭제 planner와 일반 action coordinator까지 실행했다.

초기 검사 작성 중 발생한 오류는 제품 결함과 구분한다. orchestration의 중첩 문자열/정규식 이스케이프 오류 2회는 제품 case가 시작되기 전 실패했다. 다음 확장 실행은 잘못된 action 이름 3개를 바로잡았고, editor fixture의 잘못된 task kind 조회 2개를 수정했다. 해당 하니스 수정 후 최종 20개를 모두 재실행해 통과했다. 이 중간 실패들을 제품의 저장 실패 판정으로 세지 않는다.

## 5. 정적 검사·남은 검증

| 검사 | 이 하위 작업 결과 |
| --- | --- |
| `node --check …/app.js` | PASS |
| old workspace writer·잘못된 `result.envelope` 검색 | 활성 호출 0. legacy validator 읽기 1개는 의도 |
| `localStorage.clear` / `storage.clear` 검색 | 0건 |
| `git diff --check -- …/app.js` | 공백 오류 0. 저장소의 기존 LF→CRLF 안내만 출력 |
| `npm run docs:check` | PASS — skill sync 정상, 필수 문서 16개·로컬 링크 4,926개 |
| production build / `npm test` | 이 하위 작업에서 미실행. 주 작업자 소유 |
| Playwright/실제 브라우저 | 이 하위 작업의 실행 0. 전용 담당자에게 첫 실행 요청 |
| Android Chrome / iOS Safari 실제 기기 | 미실행 |
| 관찰 사용자 | 0명 |

VM은 실제 포커스 이동·native dialog·history·pointer·레이아웃을 증명하지 않는다. 각 viewport에서 recovery action 접근성, dialog 재개 초점, E0/E2 편집 Back/Escape, 중복 receipt의 실제 화면, feature 오류 알림, 삭제 완료 표시를 브라우저로 따로 확인해야 한다. 생성된 두 HTML의 동일 runtime 연결과 운영 key byte-for-byte 증거도 최종 QA에 남겨야 한다.

localStorage는 원자적 CAS를 제공하지 않는다. 이번 packet/raw 비교와 journal은 관측 가능한 경계에서 외부 변경을 차단하고 복구 근거를 남기지만, 브라우저 탭 사이의 진정한 원자적 트랜잭션을 새로 제공한다고 주장하지 않는다. 기존 draft/creator/source writer 전체를 일반 journal로 바꾸는 범위 확대도 하지 않았다.

commit·push·PR·Preview·Production은 이 하위 작업에서 모두 미실행이다.
