# FlowMe 통합 MVP PoC — 개발 실행 계약

2026-09-12 · 상태: 진행 중. 구현·검증·두 차례 개선·결과 보고까지의 전체 목표다.

## 승인과 기준선

UX 작업에서 전달한 승인 정본 (로컬 전용 근거: `../../../../flow-text-integration-plan-20260908/docs/specs/2026-09-12-flowme-integrated-product-poc-program/spec.md`)을 전문 확인했다. 이 문서는 그 범위를 현재 개발 코드에 연결하는 실행 계약이며 범위를 축소하지 않는다. [실행 순서](plan.md)와 [진행 원장](progress.md)을 현재 상태로 사용한다.

- 개발 위치: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901`, branch `agent/personal-workspace-v4-1-poc-20260901`, HEAD `6e4b44fe`와 이 task에서 검증해 온 K1~K3 미커밋 구현을 보존한다.
- 2026-09-12 fetch로 확인한 `origin/main`: `b4a25a4fc85c99de32fb4282a00a9293ee532952`. 기존 공통 기준 `db74a36c` 이후 제품 차이는 출처 콘텐츠·관련 검사·lockfile 중심이다. 기존 dirty worktree를 merge/rebase/reset하지 않는다. 필요한 차이는 위험 검토와 재사용 근거를 남긴 뒤 별도 반영한다.
- v11 `20707fa0`의 model/editor는 소스 모듈과 기존 검사 계약을 재사용한다. 과거 HTML/app.js/iframe wrapper를 새 주소로 포장해 실행하지 않는다.
- 시작 modified 189 / untracked 471은 이번 작업의 소유 파일 수가 아니다. 새로운 `integrated-poc` 코드와 이번 spec/검사 디렉터리부터 소유한다. 기존 파일의 변경은 사전 해시·diff와 연결 근거를 먼저 기록한다.

## 완료해야 할 제품 범위

| ID | 묶음 | 직접 가능한 결과 |
| --- | --- | --- |
| P01 | 독립 개인 문서 | Flow 없이 문서 생성/목록/검색/정리, 자유 텍스트, 문법 표시, 문맥 +, 들여쓰기/접기/하위 묶음 이동, Undo, 자동 저장/오류 복구 |
| P02 | 같은 항목의 개인 실행 | 문서/일/주/월/전체/폴더에서 같은 target, 날짜별 누적 진행·과거 기록, 다음 날 이어하기, 작성 행·선택·스크롤 복귀 |
| P03 | 발견과 개인화 | 공개 탐색과 저장 사본 검색 분리, 상황/카테고리/출처/판본, 항목 포함·복원·기준일, 사본과 여러 문서 연결, 중복 방지 |
| P04 | URL와 외부 출력 | 실제 지원 출처 확인, 원문 보완·수정·확정, 개인 저장 없이 TXT/CSV/ICS 출력, 결과 바이트와 범위 확인 |
| P05 | 경험·질문·지식 | Flow 없는 질문, 경험 없는 Flow, 부분/반대 경험, 답글·반응·사진 선택, 글 수정/삭제, 근거 연결 지식 요약, 내 활동 왕복 |
| P06 | 제작과 선택 공개 | 기존 제작기·초안 보관함 재사용, 저장 판본 복구, 선택 공개 미리보기와 지속 저장, 비공개 필드 배제, 내 작성물 재편집 |
| P07 | 원본·파생·업데이트 | 고정 판본/항목 지정 제안, 로컬 작성자 검토, 새 불변 판본, 사본의 비교/유지/부분 반영/충돌/Undo와 개인 기록 보존 |
| P08 | 통합 품질 | 빈/긴/삭제 대상/중복/실패/손상, 키보드·반응형·맥락 복귀, 운영 저장소 불변, 전체 회귀, 최소 두 차례 평가→개선 |

각 묶음의 통과는 중간 체크포인트다. 모든 핵심 경로를 연결하기 전에 전체 목표를 완료하지 않는다. 구현/연결/검증 상태를 각각 기록하고 테스트 수를 요구 충족률이나 사용자 수로 바꾸지 않는다.

## 재사용과 데이터 계약

- 진입은 기존 `/my?personalWorkspacePoc=v1` exact-query 그대로다. 추가 query를 받아 gate를 넓히지 않는다. 앱 안의 목적·선택은 안전한 hash/navigation state로 다룬다. 기본 `/my`, 기존 운영 route/writer/key/schema는 바꾸지 않는다.
- 새 지속 상태는 `flow:poc:personal-workspace:v1:program:*` 아래 버전 계약으로 저장한다. 기존 PoC 상태는 owner별 adapter를 통해 읽고 필요한 쓰기를 전용 transaction으로 연결한다. v11의 UX 저장 key는 읽거나 쓰거나 자동 이전하지 않는다.
- 문서의 `documentId + lineId`와 실행 `targetRef`를 분리한다. saved target은 `savedCopyId + flowId + itemId`를 보존한다. 같은 target의 여러 문서 참조는 실행 상태를 복제하지 않는다.
- 자유 문서의 lines/sidecar는 v11 의미를 유지한다. 공개 원본은 개인 편집의 canonical target으로 사용하지 않는다. 개인 사본 안의 canonical 행에 연결하고 공개 판본은 별도 immutable repository에 둔다.
- 공개 payload는 허용 필드로 새로 만든다. 개인 날짜/진행/메모/미선택 행/비공개 경로를 개인 객체 전체 복제로 게시하지 않는다. 로컬 인물 전환은 인증이 아니며 PoC 안내에서만 명시한다.
- 원문 일정·개인 기준일·실행 날짜·기록 날짜·조회 날짜를 구별한다. `[20%]`, `[20]`, `[0.2]`=20%, `[1]`=1%, `[1.0]`=100%를 보존한다. 날짜별 값은 누적값이며 합산하지 않는다.
- 새 문서 모델은 순환을 막고 자원 상한을 둔다. 과거 2/3단계 폴더 제한을 제품 정책으로 복원하지 않는다. 폴더 삭제는 내용 보존 후 미분류 이동, 문서/공개 삭제는 연결과 지난 기록을 보존하는 tombstone/보관으로 다룬다.
- 성공 readback 뒤에만 화면의 committed 상태를 채택한다. exact raw/revision 확인, 같은 값/취소/실패/충돌의 성공 mutation 0, 다른 문서의 쓰기 보존, 실패 재시도·복구를 계약에 포함한다. `localStorage.clear()`는 금지한다.

저장 readback 성공 뒤 화면 알림이 실패하는 경우는 저장 실패와 구별한다. 성공한 mutation을 다시 시도하도록 안내하지 않고, 메모리의 확인된 snapshot과 미저장 입력을 보존한 채 `저장됨 · 화면 갱신 필요`를 표시한다. 화면 재확인은 저장 없이 기존 입력 보호 경계를 다시 거친다. 알림을 복구하기 전의 새 mutation/Undo/Redo는 거절한다. 재확인 중 저장 키 삭제·손상이 발견되면 오래된 메모리를 복구 완료로 표시하거나 자동 재저장하지 않는다. 이 일시적 화면 상태는 운영 schema나 새 저장 key를 만들지 않는다.

### 공개 출력의 같은 항목 복귀 — 교체 가능한 URL 표현 v1

[두 번째 전체 평가 C](whole-loop-two-plan.md)의 기존 복귀 요구를 연결한다. 공개 Flow 상세에서 받는 TXT·CSV·ICS는 공개 Flow/불변 판본/항목 ID와 출력 선택·기준일·반복 시작일·조회 범위를 URL fragment에 담는다. `ProgramPublicOutputReturn.version:1`은 화면 복귀용이며 개인 실행 target이나 저장 schema가 아니다. 개인 문서 원문·actor·진행·메모는 넣지 않는다. 기존 인자가 없는 순수 출력과 비공개·임시 출력의 bytes는 바꾸지 않는다.

같은 origin의 `/my?personalWorkspacePoc=v1`에서만 복원한다. 미래 형식·알 수 없는 필드·누락 판본/항목·다른 origin·잘못된 범위는 저장 없이 차단하며 다른 최신 판본이나 비슷한 제목으로 대체하지 않는다. 복귀는 지정된 공개 항목에 초점을 맞추고 출력 조건만 복원한다. 개인 사본 생성·원본 일정 변경·실행 기록 추가는 하지 않는다. 이 링크는 같은 주소와 브라우저 저장 자료가 있어야 열리는 로컬 PoC 링크이며 계정 동기화·다른 기기 공유·외부 도구 import를 구현한 것으로 보지 않는다.

### 개인 사본의 일반 필드 충돌 선택 — 교체 가능한 Program v1 계약

P07과 기존 공유 이후 UX의 SL11(내 내용 유지/새 내용 선택)을 연결한다. 제목·설명·완료 기준·출처 링크에서 원본과 개인 내용이 함께 바뀐 경우, 기본값은 개인 내용 유지다. 사용자가 해당 필드의 이전 원본·내 내용·새 원본을 비교하고 새 내용 적용을 확정할 때만 한 항목의 한 필드를 바꾼다. 비교 열기·선택·유지·취소·Escape는 저장하지 않는다. 일반 업데이트의 충돌 checkbox를 자동 활성화하거나 전체 덮어쓰기를 허용하지 않는다.

`ProgramCopyFieldResolutionPreview`의 version 1은 사본/항목/필드/이전·대상 판본, 원본 소유자와 판본 token, 개인 문서/행 ID와 원문을 묶는다. 적용 직전에 원본과 개인 snapshot을 다시 비교하고 기존 expectedSpace/CAS·receipt·Undo 거래를 사용한다. 선택 뒤 원본이나 개인 내용이 달라지면 거절하며, quota 등 저장 실패에는 선택을 보존한다. 일정·하위 체크·종류 전환과 동시에 확정하지 않는다. 개인 날짜·진행·메모·다른 행/문서 참조와 공개 불변 판본은 유지한다. 운영 schema나 영구 충돌 정책을 새로 확정하지 않는다.

### Map 하위 Flow 구성 수용 — 교체 가능한 Program v1 계약

`legacySnapshot.raw.mapMembership.version:1`은 원래 전체 그룹의 정체성과 제공된 Map 선언·snapshot·persistence·bundle을 함께 보관한다. 단일 bundle 누락을 하위 Flow의 의도적 삭제로 추측하지 않는다. 원래 원본 model·saved tuple·문서·개인 날짜·메모·진행 기록을 수정하지 않고, 명시적으로 제외한 child만 공통 계획과 일반/반복 실행에서 제외한다. 같은 child가 돌아와도 자동 연결하지 않는다.

화면의 비교·선택·취소·Escape와 모두 유지는 저장0이다. 적용 직전 개인 snapshot과 현재 원본의 전체 비교 자료를 다시 대조하고, 증거와 선택을 한 Program transaction으로 저장한다. 비교를 반복해서 저장 이력/용량을 소모하지 않는다. 실패 시 선택은 남으며 개인 계획·원문 편집과 동시에 적용하지 못한다. 기존 저장된 검토도 읽을 수 있지만, 새 비교를 열기만 해서는 저장하지 않는다. 구성 전용 Undo는 나중의 개인 기록을 보존한다.

현재 연결은 원래 child의 제외·동일 정체성 복원이다. 새 child 생성과 빈 Map 전체 수용은 별도 계약이 없으므로 안전하게 거절하며 완료 범위로 세지 않는다. 후속 원본은 로컬 factory 입력 시뮬레이션이며 실제 외부 발행이 아니다. 브라우저와 전체 검증의 현재 범위는 [현재 체크포인트](current-checkpoint.md)를 따른다.

### 실제 Map의 반복 실행 연결 — 교체 가능한 Program v1 계약

실제 structured Map은 authoring TXT나 가짜 sourceLine으로 변환하지 않는다. 선택된 원본의 정확한 savedCopy/Flow/Step, 원본 RRULE, 기준일과 출처를 별도 context로 읽고 D1의 기존 반복 계산기로 회차 날짜와 identity를 만든다. ALLBLANC의 저장 요일은 개인 캘린더 설정이며 영상의 고정 처방이 아니다. 기존 품질 보류와 주의문을 유지한다.

기존 payload를 읽기만 해서는 실행 형태를 바꾸지 않는다. 사용자가 기록 보존을 확인하면 source owner의 선택 필드 `mapExecution.version:1`에 항목별 실제 원본 revisionId/requestId/confirmedAt을 기록하고, 기존 `executionHandoffs`와 한 Program 거래로 연결한다. 일반 항목의 기록·날짜·메모·참조는 보존하고 새 회차의 완료로 복사하지 않는다. 별도 `structuredOwner`는 Map·원본 판본·series 판본·규칙 근거를 보존한다. 운영 key/schema/writer, 원본 factory와 작성 문법은 변경하지 않는다.

`PROGRAM_MAP_EXECUTION_WINDOW.version:1`의 366일 분할/기존 D1 100000일 탐색 한계는 계산 자원 경계이며 반복 종료가 아니다. 종료 횟수/종료일이 있는 일정은 회차 순번으로 조회하고, 종료 없는 일정의 주 단위 창 제한과 혼동하지 않는다. 잘못된 필드·모호한 종료·외부 tuple·손상 receipt는 거절한다. 지원 원본의 의미가 달라지거나 장기 기록의 보존·조회 비용에 문제가 생기면 이 임시 계약과 회귀를 함께 재검토한다. 구체적인 현재 연결·검증·미검증 범위는 [반복 연결 원장](structured-map-recurrence-gap.md)을 따른다.

### Undo 저장 표현 — 교체 가능한 Program 전용 wire v1

실제 제작→개인 수용 상황에서 전체 workspace 이력의 반복 저장으로 브라우저 용량 오류가 발생했다. `undo`의 저장 표현에 `flowme-program-undo-shared/1`을 허용한다. 동일한 JSON 하위 구조를 공유하는 노드 표이며 런타임에서는 기존의 독립된 snapshot 배열로 복원한다. 현재 `data`, 운영 key/schema, 실제 원문·native journal·판본·기록과 80개 이력 계약은 바꾸지 않는다. 이력을 줄이거나 제목/원문 요약으로 대체하지 않는다.

기존 actor별 이력 형식은 읽기만으로 이전하거나 다시 쓰지 않는다. 다음 실제 성공 변경에서 더 작을 때만 공유 표현을 쓰며, 동일 값은 기존 bytes 그대로 성공 쓰기0이다. CAS/readback/실패 rollback은 저장된 정확 bytes를 사용한다. 복원 후 기존 전체 domain validator를 그대로 통과해야 한다. 미래 codec·잘못된 참조·순환·중복 key·사용하지 않는 노드·과도한 깊이와 확장 크기는 객체 복원 전에 거절한다. 공유 객체를 런타임에서도 재사용해 다른 Undo 판본이 함께 변하는 일은 허용하지 않는다.

이 저장 표현은 서비스의 영구 저장 정책이 아니다. 큰 실제 문서·사진·장기 사용에서 현재 data 자체 또는 논리 payload 상한에 도달하거나 복원 비용이 커지면 원문과 기록의 보존을 전제로 저장 기술과 계약을 다시 검토한다. 용량을 늘리기 위해 브라우저 제한을 우회하거나 운영 저장소로 쓰지 않는다.

### 전체 제작 저장 상태 — 교체 가능한 Program v1 확장

제작 작업본과 명시 저장 context는 선택 필드 `nativeDocument`와 `nativeSelection`에 실제 D2 전체 문서와 실제 저장본 identity를 구분해 보관한다. 원래 source JSON·version/revision ID를 새 가상 판본으로 바꾸지 않는다. 같은 원문에서 역할·포함·순서·검토만 바뀌면 Program contextRevision만 올리며 원래 Creator recordRevision을 바꾼 것으로 주장하지 않는다. 지원하지 않는 전체 문서 형식은 raw-only 복구 성공으로 대신하지 않는다.

native canonical의 원문과 입력 중인 원문은 구별한다. `nativePendingRawText`는 미적용 입력을 보관하며 명시 비교·적용 전에 canonical을 자동 재해석하거나 개인실행에 넘기지 않는다. 실제 원래 operation과 검토 조건을 유지하는 단일 Program transaction으로 적용한다. 화면 결과와 순수 preview 모두 같은 native projector를 쓰며 구조 수정만으로 안전/권리 검토가 해제되지 않는다. 기존 원본 저장 key는 읽기만 하고 Program context가 없는 이전 payload는 자동 migration·쓰기 없이 읽는다.

### 전체 제작 설정의 개인 실행 연결 — 교체 가능한 Program v1 확장

`creatorWorkspace.nativeExecutionSources`는 실제 native document의 item/sourceRow/판본 ID를 가진 별도 원본 owner다. 기존 raw materializer의 Flow나 saved-copy tuple을 가짜로 만들지 않는다. 원문 전체와 제외/역할/검토 상태는 불변 판본으로 보관하고, 개인 문서 행 바인딩과 필드별 수용 선택은 별도로 기록한다. 같은 원문에서 설정만 바뀌어도 명시 비교하며, 이후 개인 날짜·메모·누적 기록을 새 제작 상태로 자동 덮지 않는다.

비교는 실제 이전 원본·현재 개인 내용·새 제작 결과를 보여 준다. 기존 개인 문서에서는 `source/date/time/children`을 각각 유지하며 사용자가 새 값 수용을 선택한다. 내용 유지를 선택해도 날짜·시간·하위 체크만 독립 수용할 수 있다. 최초 인계에서 원래 제외된 항목이나 원문 체크를 개인 완료로 복사하지 않는다. 빠지는 내용·종류가 바뀐 항목의 이전 기록은 보관하며 제목/줄번호 추정으로 기존 raw 실행 문서를 native로 승계하지 않는다. 정확한 연결 근거 또는 명시 연결을 확보해야 한다.

미리보기는 쓰지 않으며 expected owner/space·실제 선택값·요청 identity를 확인한 한 Program transaction으로 적용한다. 같은 값/모두 유지/취소/오류는 성공 변경0, 저장 실패는 입력·선택을 유지한다. 원문·구조가 바뀌면 새 비교가 필요하다. 코드/브라우저의 현재 충족 범위는 [진행 원장](progress.md)과 [현재 검증](current-validation.md)을 따르며 이 계약만으로 구현 완료를 주장하지 않는다.

### 제작 판본 사이의 실행 identity — 교체 가능한 Program v1 확장

원문 업데이트가 실제 제작 Item ID를 바꾸어도 사용자가 확인한 연결은 개인 실행에서 유지한다. `nativeExecutionSources.revisions.rows`의 선택 필드 `sourceItemId`는 해당 불변 제작 판본의 진짜 Item ID이며, `itemId`는 최초로 연결한 실행 identity다. 두 값이 같으면 기존 형식 그대로 읽고 자동 migration이나 쓰기를 하지 않는다. 원본 DTO·원문·source row·예전 실행 판본은 재명명하지 않는다.

서로 다른 ID의 연결은 replay 검증된 실제 `apply_source_update`의 명시 match에서만 얻는다. 제목·행번호·줄바꿈 정규화로 추측하지 않으며 미적용/거절된 후보는 연결 근거가 아니다. 모호하거나 겹치는 연결은 중단한다. 날짜·시간·하위 체크를 유지할 때 각 과거 판본의 진짜 source Item을 찾아 읽고 같은 실행 행·기록·참조·출력 UID를 보존한다. 원본 복구/Undo·연속 업데이트·동명 항목에서 연결의 의미가 달라지면 이 임시 계약과 회귀를 함께 재검토한다.

### 개인 반복 계획·실행·보존 기록 — 교체 가능한 Program v1 확장

private space의 선택 필드 `recurrencePlans.version:1`은 명시 확정한 개인 계획 owner만 저장한다. 원래 source tuple·규칙·revision token은 불변이며, Creator 원본은 실제 `executionSources`의 `creatorOwner`와 판본 정체성을 보존한다. 이를 legacy 원본이나 새 공개 판본으로 재명명하지 않는다. 필드가 없는 기존 상태는 자동 owner 생성·migration·쓰기 없이 읽는다.

전체/이후 계획 변경은 기존 `whole_series / future_series`와 실제 structural expander를 재사용한다. 선택 회차와 새 날짜를 명시하며 모든 회차를 임의로 평행이동하지 않는다. 과거 원본·개인 실행 기록이 있으면 기존 정책대로 이전 계획과 기록을 남긴다. 새 개인 회차는 별도 실제 `seriesId / revisionId / occurrenceId`를 갖고, 날짜·완료·보류/제외 이벤트를 실제 실행 순서대로 기록한다. 원래 source 회차의 날짜나 완료를 새 개인 key로 옮겨 쓰지 않는다. 같은 날짜/no-op는 operation·owner·성공 쓰기를 추가하지 않는다.

기간·문서·혼합 순서·출력은 같은 reader를 사용한다. 원문 회차를 숨기는 범위는 exact source coverage에 한정하고, 개인 고정·미정·완료와 이전 revision 기록은 별도로 보존한다. 원문이 바뀌거나 사라지거나 보관되면 새 실행 쓰기를 막고 보존 기록을 읽기 전용으로 제공한다. 복구의 문서 링크는 제목이 아닌 실제 canonical document/line 또는 Creator owner의 documentId로 찾는다. 활성 참조가 원본의 보관·휴지통·품질 보류를 우회하지 않으며, 다른 source로 자동 재연결하지 않는다. 전역 Undo/reload는 같은 Program envelope를 사용한다.

원문 날짜·개인 계획 날짜·개인 실행 날짜를 화면과 출력에서 구별한다. 첫 사용 때 원문 구간과 새 개인 구간을 중복 실행하지 않는다. 조회 창의 마지막 행을 반복 종료로 해석하지 않고 개인 revision의 남은 회차를 별도로 확인한다. 이 계약의 실행판·표적·브라우저 범위는 [현재 판정](current-validation.md)을 따른다.

### 혼합 기간 순서 — 교체 가능한 Program v1 확장

일반 할 일과 반복 회차를 같은 기간 목록에서 이동하기 위해 private space에 선택 필드 `executionTimelineOrders`를 둔다. 기존 payload에 필드가 없으면 그대로 읽고 자동 migration·저장은 하지 않는다. 날짜/미정별 목록은 문서·행 또는 기존 회차 tuple의 typed key를 사용하며 원문 구조 순서와는 별개다.

새 혼합 이동은 이 목록과 기존 일반 항목 `timelineOrders`의 부분 순서를 한 Program 거래로 갱신한다. 기존 계획 화면에서 일반 항목 순서를 바꾸면 읽기 단계에서 일반 슬롯만 새 상대 순서로 재배치하고 회차 슬롯은 보존한다. 날짜가 달라지거나 삭제된 대상은 현재 목록에 노출하지 않으며 조회 자체는 쓰지 않는다. 이 계약은 운영 schema나 영구 제품 정책이 아니다. 실제 왕복에서 위치 의미가 불명확하거나 순서가 어긋나면 계약과 회귀 검사를 함께 재검토한다.

### 개인 할 일 이동과 휴지통 — 교체 가능한 Program v1 확장

개인 할 일의 원문 블록을 다른 개인 문서로 옮길 때 기존 행/하위 체크 ID, 개인 메모, 실행 날짜, 날짜별 누적 기록, 다른 문서의 참조를 보존한다. 날짜 섹션 상속이 달라질 때만 같은 실행 날짜를 명시해 보존한다. Flow Item은 원래 Flow 소속을 유지하고 다른 문서에서는 참조로 연결한다. 문서 위치 이동을 task의 실제 폴더 소속 변경으로 재해석하지 않는다.

private space의 선택 필드 `documentTrash`는 삭제 시각과 직전 보관 여부만 기록한다. 원문·연결·공개 판본·지난 기록은 삭제하지 않으며, 휴지통 복원은 직전의 일반/보관 상태로 돌아간다. 보관 복원으로 휴지통 상태를 우회하지 않는다. 필드가 없는 기존 payload는 그대로 읽고 자동 migration·쓰기는 하지 않는다. 영구 삭제·전체 백업·새 실행 초기화 정책은 이 계약에 포함하지 않는다.

### 제작 원본·항목 연결과 실행 출력 — 교체 가능한 Program v1 확장

새 제작물은 `creatorWorkspace.executionSources`의 별도 불변 원본/판본과 안정적인 원문 행·개인 문서 행 연결을 사용한다. 실제 materializer가 만든 Flow와 원문 속성을 보존하며 이를 기존 saved-plan origin이나 `legacySnapshot`으로 재명명하지 않는다. 제작 판본이 바뀌어도 개인 날짜·완료·지난 회차 기록을 자동 덮어쓰지 않고, 같은 원본을 확인한 뒤 명시 비교·인계·재연결한다. 일반 항목과 반복 규칙의 전환은 실행 이력을 보존하고 개인 수정 충돌을 먼저 보여준다. 제목·줄번호만으로 다른 항목을 같은 항목으로 추측하지 않는다.

기존 raw-only 원본의 항목 연결은 실제 저장 원문을 materialize한 결과와 기존 itemRef를 사용자가 명시적으로 확인해야 한다. 같은 수의 일대일 연결 계약은 유지하고, 수가 다르면 아래의 명시 부분 연결을 사용한다. 시작 선택을 비워 두고 원본 token/CAS를 확인하며 기존 model/sourceCandidateStore는 바꾸지 않는다. 원문이 없거나 항목 정체성이 불명확한 경우 임의 자료를 만들거나 자동 연결하지 않는다. 검토를 필요로 하는 원본 품질 보류를 개인 확인으로 해제하지 않는다.

개인 실행 출력은 원문 TXT와 선택 항목 TXT/CSV/ICS를 구별한다. 반복 규칙을 하나의 완료 체크로 출력하지 않고 `PRIVATE_OUTPUT_OCCURRENCES_V1`의 한 번 최대366일 조회 범위를 명시 적용한 후 개별 회차를 선택한다. 조회 상한은 반복 종료가 아니며 개인 일정·저장소를 변경하지 않는다. 미정 회차 포함은 별도 선택이고 ICS에서는 미정 개수를 알리고 제외한다. 원문 날짜·시간·시간대·자료 링크는 개인 실행 날짜와 구별해 보존한다. 현재 ICS는 종일 일정이며 시간대 일정이나 외부 도구 동기화를 구현했다고 표현하지 않는다. 이 조회 상한·포맷 선택은 운영 schema와 영구 정책을 확정하지 않는다.

### 기존 원문과 항목의 부분 연결 — 교체 가능한 Program v1 확장

기존 source owner의 선택 필드 `partialMapping.version:1`에 원문 행별 `existing / new / source-only`와 남은 기존 항목별 `keep-personal / archive-execution`을 저장한다. 기존 일대일 `mapping`과 동시에 두지 않는다. 사용자가 각 선택을 명시 확인해야 하며 빈 선택·중복 대상·외부 항목·변경된 원문 token은 적용하지 않는다.

새 항목 ID는 원래 saved-copy/Flow tuple과 진짜 원문 항목 identity에서 만들고 충돌을 검사한다. `source-only`는 불변 원문에는 남지만 실행 항목으로 만들지 않는다. 연결되지 않은 기존 항목은 저장된 실제 구조를 유지하며 가짜 원문 행·제작 판본을 만들지 않는다. 실행 보관은 해당 항목의 같은 문서·행 ID·개인 날짜·기록·참조를 남기고 기간/기존 실행 목록 및 직접 쓰기에서 정확한 해당 항목만 보호한다. 다른 항목까지 보류하지 않는다. 한 Program 거래와 전역 Undo/reload로 처리하며 운영 저장소·자동 migration은 없다.

부분 연결과 원문 없는 Map의 구조화 출처 연결은 다른 계약이다. 실제 부분 연결 브라우저 결과에서 기본값과 보관의 의미를 다시 검토한다.

### TXT 없는 Map의 구조화 원본 — 교체 가능한 Program v1 확장

`structured.version:1`은 기존 저장 투영과 실제 source-backed factory의 snapshot·persistence·FlowBundle을 구별해 보존한다. 가짜 TXT·제작 판본·공개 판본으로 바꾸지 않는다. 전체 증거를 검증하고 saved-copy/Flow/Step tuple을 그대로 사용한다. 내용 해시는 색인일 뿐 항목 identity나 원본 검증을 대신하지 않는다.

현재 원본 연결과 새 구조 비교·항목별 수용은 명시 동작이며, 전용 Program 거래로 기록한다. 원문 Undo 시 새 항목에 개인 실행 기록이 있으면 자동 삭제하지 않는다. 사용자가 해당 기록의 보존을 선택한 뒤 되돌린다. 원본 품질 보류는 개인 확인으로 해제하지 않는다. 빈 Step 목록도 실제 같은 Flow의 factory Step을 명시 수용하고 Map 검토를 마쳐야 실행된다. 없는 Flow나 출처는 추정하지 않는다.

실행하던 Map의 원본 증거가 바뀌어 검토가 무효화되면 기존 canonical 행과 개인 제목·날짜·메모·진행·참조를 읽기 보존한다. 개인/기존 실행 writer는 모두 거절하며 정확한 원본을 다시 검토한 후 재개한다. 과거 승인 표시만으로 실행을 계속하지 않는다.

원본 Undo가 실제 일반 항목을 원래 개인 문서로 복원한 경우는 활성 반복 메타데이터와 구분한다. 검증된 구조화 원본의 handoff receipt, base 판본, workspace/saved-copy/Flow/Item tuple의 기존 ID, canonical 소유와 등록된 보관 문서 근거가 모두 맞아야 해당 개인 항목의 기록을 이어 쓸 수 있다. 원본·활성 반복·별도 지난 회차는 바꾸지 않으며 품질 보류/제외/보관 guard는 계속 적용한다. 이 읽기 판정은 새 저장 필드나 운영 migration이 아니며 실제 후속 검증은 [복원 뒤 실행 원장](map-restored-progress-review.md)에 구분한다.

구조 증거 검증은 `legacy-map-source.ts`에서 기존 `buildPersonalWorkspacePocReadModel`을 명시 메모리 읽기 포트로만 호출한다. S08은 이 단일 named-import 경로만 허용하고 Program data/projection/controller 순환과 다른 reader 접근을 계속 금지한다. 전역 저장소·네트워크 접근을 throw하는 회귀를 병행한다. 운영 저장소 쓰기나 운영 schema 변경은 없다. 모델 검사를 실제 브라우저 왕복 완료로 대신하지 않는다.

### 작성 틀 입력과 명시 저장 — 교체 가능한 Program v1 확장

`creatorWorkspace.working.structure`는 기존 StructureDraft reducer/compiler의 카탈로그 판본·변수·반복 그룹·접은 입력을 원문과 함께 보관한다. 빈 원문에서도 입력 복구가 가능하며, 틀 선택이나 변수 입력만으로 원문이나 가짜 Creator 저장본을 만들지 않는다. 명시 materialize는 한 native 편집 거래와 원문/sidecar/행 identity의 한 working 저장으로 처리한다. 준비 입력의 자동 복구 저장과 materialize 거래는 구분한다.

`structureDrafts[draftId]`는 명시 저장한 private context다. 같은 원문에 틀 설정만 달라지면 원래 Creator `recordRevision`은 유지하고 별도 `contextRevision`을 증가시킨다. 과거 저장본 복구·복제는 실제 context와 provenance를 보존하며 복제에 옛 브라우저 Undo 거래를 이식하지 않는다. 원문 편집기의 실제 Undo/Redo 이벤트가 맞는 원문과 틀 쌍일 때만 함께 복구한다. 다른 입력은 틀을 지우지 않고 연결 불일치로 남긴다. 연결 해제는 원문을 바꾸지 않는다.

실패 시 원문과 틀의 입력을 보존하고 같은 입력을 재시도한다. 변경된 원문·틀·다른 탭의 working·IME·변조된 미리보기는 native 반영 전에 거절한다. 이 계약의 부모 handler 표적과 실제 브라우저 검증은 별도 근거로 기록한다. 운영 저장 key/schema를 바꾸거나 원 P0 설계를 영구 제품 정책으로 확정하지 않는다.

## 기존 잔여 요구의 보존

### 기존 Map의 개인 계획 — 교체 가능한 Program v1 확장

`planSelections.groups[groupRef]`는 실제 Map owner·원문 token·현재 childFlowRefs·선택 공통 기준일·childModes를 보관한다. 각 하위 Flow는 `follow-group` 또는 명시 날짜를 가진 `fixed-child`다. 기존 `flows[flowRef]`의 포함 항목과 계획 날짜를 재사용하며 그룹/하위 기준일은 일치 검증한다. 공통 날짜를 바꿔도 개별 고정 기준일, 항목의 개인 고정/미정 실행 위치, 완료·메모·참조는 유지한다. source Item 포함과 개별 회차 선택은 다른 단위다.

원문이 바뀌면 실제 child/item catalog와 기존 선택을 다시 비교한다. 새 항목은 사용자가 포함/제외를 정해야 하며 없는 child를 만들어 실행에 넣지 않는다. 삭제된 하위 Flow의 직전 원문 token과 mode는 선택 필드 `retainedChildren`에 보관하고 원문·개인 문서·지난 기록을 자동 삭제하지 않는다. 현재 실행 대상은 현재 원문에 실제로 있는 child만이다. 품질 보류와 개인 출처 검토 token을 계획 변경으로 해제하지 않는다.

그룹 전체와 하위 Flow 후보를 하나의 Program transaction으로 적용하고 동일한 입력 보호·expectedSpace/CAS·실패0성공변경·전역Undo/reload를 사용한다. 필드가 없는 이전 상태는 자동 migration·쓰기 없이 읽는다. 상대 반복의 후속 연결은 transient `seriesChoices`에 exact source/private target·현재 owner·whole/future·새 날짜를 명시하고, 모든 선택을 같은 expectedSpace에서 검증한 뒤 한 reconcile과 개인 owner 병합으로 처리한다. 중복 owner·stale 원본/기록 하나라도 있으면 전체 적용을 거절한다. 고정 반복은 보존하고 제외된 반복에 새 owner를 자동 생성하지 않는다. 제외 항목의 재포함과 계획 변경을 함께 해결하려고 기존 보류 guard를 해제하지 않는다. 이 후속 모델의 표적 통과는 실제 Map UI 완료가 아니며 새 빌드 왕복 검증을 별도로 남긴다. 실제 Map UI에서 수정 범위나 상태 소유가 어긋나면 화면과 계약을 함께 재검토한다.

### 제작 판본의 선택 수용 — 교체 가능한 Program v1 확장

전체 native 원문 후보 세션은 `creatorWorkspace.sourceUpdateSessions[draftId]`의 version 1 항목에 후보/명시 결정/보류 위치/검증 receipt와 기존 원문 행 identity를 보관한다. 원래 D2 운영 저장소는 읽기만 한다. 후보 stage와 결정은 실제 작업 원문·명시 저장본·개인 실행·공개 판본을 바꾸지 않는다. 적용 시 세션과 현재 native 작업 원문을 같은 Program 거래로 바꾸고 명시 저장은 별도다. source 전용 Undo는 실제 적용 결과와 현재 native owner가 일치할 때만 원문과 기존 행 identity를 복구하며, 별도로 진행한 개인 실행과 공개 상태는 유지한다. 실제 현재 actor/초안 소유/보관/입력 head를 매번 검사하고 저장된 권한을 재사용하지 않는다. 기존 payload에는 새 필드를 자동 추가하지 않는다.

원래 D2 service의 `keep_working` marker는 강화된 원 domain의 diff 검증과 충돌한다. Program 전용 `source-decision`/`source-apply` version 1 journal은 원래 diff를 재계산하고 정확한 이전 값 marker만 허용한다. 검증용 복제본에서 기존 apply guard를 모두 거친 뒤 명시적으로 유지한 정확 field를 복구한다. 원 vendor와 일반 `apply_source_update`의 의미는 바꾸지 않는다. 지원하지 않는 하위 구조 변경은 명시 거절하며 임의 병합하지 않는다. 이 저장/모델 확장은 후보 비교 UI의 연결이나 실제 외부 수집 완료 증거가 아니다.

후속 `source-apply` version 2는 일정·완료 조건의 원본 사실과 사용자가 유지한 ‘없음’을 분리한다. `effectiveAbsences`는 exact journal에서 재계산한 개인 제작 값이며 실제 source snapshot의 날짜·완료 조건을 지우지 않는다. 과거 v1에서 없어진 비교 기준은 원래 저장된 candidate와 keep 결정·현재 정확 owner를 검사한 `source-absence-upgrade` version 1 명시 거래로만 복구한다. 읽기·새로고침에서 자동으로 이전 저장소를 고치지 않는다.

반복 규칙은 기존 제작기의 source update가 지원하지 않는 별도 의미이므로 Program 전용 `source-stage` version 1 journal과 `sourceRecurrences.version:1`로 처리한다. 실제 이전 snapshot의 rule·현재 working rule·incoming rule과 종료 횟수/날짜를 별도 diff로 비교하고 명시 유지/수용한다. guard 확인용 working 복제본에만 이 별도 검토 residue를 정렬하며 candidate·원래 source JSON·나머지 vendor guard는 보존한다. 반복 속성이 비교 후 편집되면 exact working fingerprint가 맞지 않는 적용을 거절한다. 기존 operation journal의 재생 의미는 바꾸지 않는다. 저장된 sidecar는 journal 재계산 결과와 일치해야 하며 임의 rule·receipt·판본 변조는 fail-closed한다.

하위 확인 목록은 `source-stage` version 2와 `sourceSubchecks.version:1`의 전용 비교로 처리한다. 실제 이전 source snapshot의 목록·현재 작업 목록·후보 목록을 구별하고 전체 목록을 명시 유지/수용한다. 내용이 같아도 실제 source row/child ID가 바뀌면 자동으로 같은 하위 항목이라고 추측하지 않는다. 새 후보의 하위 항목은 원 parser의 정확 원문 slice·row/child identity·체크/제목/순서와 대조한다. 개인 완료·실행 기록의 수용은 이 제작 원문 거래와 별개다.

검증용 복제본에서 이 field만 별도 비교 대상으로 정렬하고 나머지 원 vendor guard를 모두 거친다. 원본 DTO·candidate·기존 journal은 변경하지 않는다. 유지한 하위 목록과 실제로 참조되는 이전 속성은 원래 source row를 tombstone 근거로 보존한다. v2에서 일정을 명시 수용하면 pinned apply가 남기는 같은 owner의 옛 일정 속성만 제거하고, 별도로 선택한 반복 rule은 그 뒤 적용한다. 원본/작업/반복/없음 유지·저장 이력·Undo·receipt·현재 권한과 CAS를 함께 검증한다. 기존 저장소 읽기에서 자동 sidecar 추가나 migration은 없다. 하위 확인 편집을 더 세분화하거나 다른 source DTO를 지원할 때 실제 원본·개인 기록과 비교 UX를 다시 검토하며 영구 정책으로 확정하지 않는다.

후보 UI는 붙여넣은 실제 원문과 명시 항목 연결에서 시작하며 이전 원본/내 제작 작업/새 원본의 필드 값을 보여 준다. 일정·반복은 원문 표기와 typed 주기·종료를 함께 표시하고 알 수 없는 값은 숨기거나 추정하지 않는다. 추가/삭제 항목은 원본 필드와 현재 제작 필드를 구분하고 전체 속성을 펼쳐 확인할 수 있다. 후보/결정 저장, 제작 원문 반영, 명시 저장본 생성, 개인 실행 수용은 각각 다른 확정 경계다. source Undo는 제작 owner와 비교 session만 복구하며 이후 개인 진행·참조·공개 판본을 소급 변경하지 않는다.

기존 raw 개인 문서에서 native 제작 항목으로 연결할 때 `rawLineage.version:1`은 실제 source owner/row/revision과 개인 canonical 행을 명시 결합한다. byte-identical 원문과 불변 source row locator가 유일하게 일치할 때만 미리 제안하며 제목이나 현재 배열 위치를 identity로 쓰지 않는다. 같은 종류의 일반 항목은 기존 본문/행/날짜/진행/참조를 보존하고 이후 필드 비교에서 내용을 수용한다. 종류 변경·반복은 이전 실행 기록을 보관하고 새 실행을 구분한다. 남은 이전 행의 유지/보관과 새 항목/연결 안 함도 명시 선택이다. 이 새 연결의 실제 브라우저 검증 범위는 [현재 판정](current-validation.md)에 별도 기록한다.

제작 원본의 `executionSources`에 선택 필드 `adoption.version:1`을 두고, 안정적인 원문 행·항목 ID마다 실제 불변 판본 ID와 `active / retained / ignored`를 기록한다. 일부만 새 원문을 받았을 때 전체 원문이 최신 판본이라고 다시 만들지 않는다. 실행용 혼합 읽기와 검증용 진짜 materializer 원본은 별개이며 항목의 출처 표시는 실제 선택 판본을 따른다. 필드가 없는 기존 payload는 자동 저장·migration 없이 읽는다.

비교에서는 이전 원문·현재 개인 내용·새 원문을 나란히 보여주고 원문 내용, 날짜, 시간, 하위 확인의 선택을 구분한다. 새 하위 구조를 명시 수용하면 이전 하위 행·안정 ID·완료·기록·낯선 속성을 개인 보관 문서에 남긴다. 새 하위 항목에는 새 ID를 주며 제목이나 위치로 동일 항목이라고 추정하지 않는다. 추가·삭제와 일반/반복 전환에도 개인 기록을 남긴다.

실제 Program controller의 저장/readback, quota/CAS 거절, 재진입과 전역 Undo를 사용한다. 수용 후 추가 실행한 상황의 전역 Undo는 먼저 추가 실행, 다음으로 수용을 되돌리는 순서다. 개인 추가 실행을 남기는 별도의 원본 전용 Undo를 구현했다고 표시하지 않는다. 이 계약은 브라우저 왕복과 서로 다른 원문 구조 검증에서 다시 검토하며 운영 schema를 바꾸지 않는다.

[K4 gate](../2026-09-05-flowme-integrated-poc-gap-implementation-v1/k4-implementation-gates.md)의 개인 기준일, 포함/복원, 개별 회차, 원문 블록 날짜순 정렬과 native Undo를 P02/P03/P06에 포함한다. [초안 이력의 미구현 범위](../2026-09-03-flowme-integrated-poc-creator-draft-library-v1/spec.md)는 P06이다. 공개 판본 공급과 기존 local-fixture 비교는 다른 origin으로 검증하며 이름만 바꿔 연결하지 않는다. 기존 개발1 이사24·개발2 이사27·여행 예시는 서로의 v2로 재명명하지 않는다.

## 첫 자율 선택과 다시 볼 조건

일반 UX/기술 선택은 이번 PoC의 교체 가능한 계약이다. 본문 중심 흰색/회색/청록, `내 공간 / 둘러보기 / 내 활동`의 목적 탐색을 채택하고 제작·공개·기여는 문맥에서 연다. 둘러보기는 경험/질문 맥락을 읽을 수 있게 하되 Flow/상황 필터로 목적이 명확한 사람도 바로 찾는다. A/B/C를 한 화면에 중복 배치하지 않는다. 긴 본문/초기 행동 가림/찾기 실패는 두 개선 루프에서 다시 본다.

첫 URL 성공 범위는 검증된 source URL 조회와 사용자가 제공한 원문 확인이다. 실시간 fetch 여부를 분리 표시하며 지원하지 않는 주소에 다른 예시 결과를 반환하지 않는다. 새 서버 proxy·계정 연동은 만들지 않는다. 출력은 실제 TXT/CSV/ICS이고 캘린더 계정 등록으로 보고하지 않는다.

## 검증과 외부 경계

승인 정본의 10개 상황을 그대로 기본 시나리오로 삼는다. 목적 달성, 다음 행동, 맥락 유지, 입력 부담, 복구, 공개 경계, 모바일/키보드 접근을 첫 구현 전에 평가 기준으로 고정한다. 첫 전체판 평가→수정→구조가 다른 추가 상황 평가→재수정을 기록한다. 가상 완료 시간/선호/사용자 수는 만들지 않는다.

단위/transition/저장/identity/출력 검사, 관련 기존 회귀, 전체 npm test, production build, URL·의존성 위험 검사, 허용된 새 제품 표면의 브라우저와 375/390/1024/1194/1440 크기 검사를 수행한다. 과거 차단된 9/10 UX 원본·미러·파생 앱·v11 wrapper는 어떤 주소/도구로도 다시 실행하지 않는다. 제한은 해당 검증에만 표시하고 안전한 구현을 계속한다.

실제 Android/iOS, OS 키보드, 보조기술, 외부 계정 왕복, 관찰 사용자는 실제 수행한 경우만 보고한다. commit/push/PR/merge/Preview/Production은 이번 승인 밖이며 수행하지 않는다. 실제 게시·전송·계정/유료가입·운영 migration·파괴적 변경은 별도 권한이 필요하다.
